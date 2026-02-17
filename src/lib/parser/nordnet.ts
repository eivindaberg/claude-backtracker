import type { ParsedTrade } from '$lib/types';

// Column indices (0-based) for Nordnet CSV
// Using positional indices because "Valuta" appears 5 times
const COL = {
	ID: 0,
	TRADE_DATE: 2, // Handelsdag
	TYPE: 5, // Transaksjonstype
	INSTRUMENT: 6, // Verdipapir
	ISIN: 7,
	QUANTITY: 8, // Antall
	PRICE: 9, // Kurs
	TOTAL_FEES: 11, // Totale Avgifter
	FEE_CURRENCY: 12, // Valuta (fees)
	AMOUNT: 13, // Beløp
	AMOUNT_CURRENCY: 14, // Valuta (amount)
	PURCHASE_VALUE: 15, // Kjøpsverdi
	PURCHASE_CURRENCY: 16, // Valuta (purchase)
	RESULT: 17, // Resultat
	RESULT_CURRENCY: 18, // Valuta (result)
	TOTAL_QUANTITY: 19, // Totalt antall
	EXCHANGE_RATE: 21, // Vekslingskurs (NOK portfolios)
	CURRENCY_RATE: 28 // Valutakurs (foreign currency portfolios)
} as const;

function parseNorwegianNumber(value: string): number {
	if (!value || value.trim() === '') return 0;
	// Norwegian format: comma as decimal separator
	return parseFloat(value.trim().replace(',', '.'));
}

function parseDate(value: string): Date {
	// Format: YYYY-MM-DD
	const [year, month, day] = value.trim().split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function parseNordnetCSV(file: File): Promise<ParsedTrade[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			try {
				const buffer = reader.result as ArrayBuffer;
				let text: string;

				// Try UTF-16LE first (Nordnet default), fall back to UTF-8
				const bytes = new Uint8Array(buffer);
				if (bytes[0] === 0xff && bytes[1] === 0xfe) {
					// UTF-16LE BOM detected
					text = new TextDecoder('utf-16le').decode(buffer);
				} else {
					text = new TextDecoder('utf-8').decode(buffer);
				}

				// Strip BOM if present
				if (text.charCodeAt(0) === 0xfeff) {
					text = text.slice(1);
				}

				// Split into lines, handle CRLF
				const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

				if (lines.length < 2) {
					throw new Error('CSV file appears to be empty');
				}

				// Skip header row
				const header = lines[0].split('\t');
				if (!header.includes('Transaksjonstype')) {
					throw new Error(
						'Invalid file format. Expected Nordnet transaction export with Norwegian headers.'
					);
				}

				const trades: ParsedTrade[] = [];

				for (let i = 1; i < lines.length; i++) {
					const cols = lines[i].split('\t');
					if (cols.length < 22) continue;

					const typeRaw = cols[COL.TYPE].trim();
					if (typeRaw !== 'KJØPT' && typeRaw !== 'SALG') continue;

					const type = typeRaw === 'KJØPT' ? 'buy' : 'sell';
					const isBuy = type === 'buy';

					// Determine trade currency from purchase value (buys) or result (sells)
					const currency = isBuy
						? cols[COL.PURCHASE_CURRENCY]?.trim() || 'NOK'
						: cols[COL.RESULT_CURRENCY]?.trim() || 'NOK';

					const feeCurrency = cols[COL.FEE_CURRENCY]?.trim() || 'NOK';
					const amountCurrency = cols[COL.AMOUNT_CURRENCY]?.trim() || 'NOK';
					const rawAmount = parseNorwegianNumber(cols[COL.AMOUNT]);

					// Exchange rate: prefer Vekslingskurs (NOK portfolio), fall back to Valutakurs (foreign portfolio)
					const vekslingskurs = parseNorwegianNumber(cols[COL.EXCHANGE_RATE]);
					const valutakurs = cols.length > COL.CURRENCY_RATE
						? parseNorwegianNumber(cols[COL.CURRENCY_RATE])
						: 0;
					const exchangeRate = vekslingskurs > 0 ? vekslingskurs : valutakurs;

					// Compute amountNOK: if Beløp is already in NOK, use directly.
					// If Beløp is in foreign currency, convert using the exchange rate.
					let amountNOK: number;
					if (amountCurrency === 'NOK') {
						amountNOK = rawAmount;
					} else if (exchangeRate > 0) {
						amountNOK = rawAmount * exchangeRate;
					} else {
						// No rate available — use raw amount as best guess
						amountNOK = rawAmount;
					}

					trades.push({
						id: cols[COL.ID].trim(),
						tradeDate: parseDate(cols[COL.TRADE_DATE]),
						type,
						instrument: cols[COL.INSTRUMENT].trim(),
						isin: cols[COL.ISIN].trim(),
						quantity: parseNorwegianNumber(cols[COL.QUANTITY]),
						price: parseNorwegianNumber(cols[COL.PRICE]),
						totalFees: parseNorwegianNumber(cols[COL.TOTAL_FEES]),
						feeCurrency,
						amount: rawAmount,
						amountCurrency,
						amountNOK,
						purchaseValue: parseNorwegianNumber(cols[COL.PURCHASE_VALUE]),
						result: parseNorwegianNumber(cols[COL.RESULT]),
						totalQuantity: parseNorwegianNumber(cols[COL.TOTAL_QUANTITY]),
						exchangeRate,
						currency
					});
				}

				// Sort by trade date ascending
				trades.sort((a, b) => a.tradeDate.getTime() - b.tradeDate.getTime());

				resolve(trades);
			} catch (err) {
				reject(err instanceof Error ? err : new Error('Failed to parse CSV file'));
			}
		};

		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsArrayBuffer(file);
	});
}
