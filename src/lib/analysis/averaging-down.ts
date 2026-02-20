import type { ParsedTrade, RoundTrip, AveragingDownSequence, AveragingDownReport } from '$lib/types';

/**
 * Detect averaging-down patterns: multiple buys of the same stock
 * at progressively lower prices (sunk cost fallacy).
 */
export function analyzeAveragingDown(
	trades: ParsedTrade[],
	roundTrips: RoundTrip[]
): AveragingDownReport {
	// Group trades by ISIN, sorted by date
	const byIsin = new Map<string, ParsedTrade[]>();
	for (const trade of trades) {
		const existing = byIsin.get(trade.isin) || [];
		existing.push(trade);
		byIsin.set(trade.isin, existing);
	}

	// Build profit map from round trips
	const profitByIsin = new Map<string, number>();
	for (const rt of roundTrips) {
		profitByIsin.set(rt.isin, (profitByIsin.get(rt.isin) || 0) + rt.profitNOK);
	}

	// Track which ISINs still have open positions
	const openIsins = new Set<string>();
	for (const [isin, isinTrades] of byIsin) {
		const totalBought = isinTrades.filter((t) => t.type === 'buy').reduce((s, t) => s + t.quantity, 0);
		const totalSold = isinTrades.filter((t) => t.type === 'sell').reduce((s, t) => s + t.quantity, 0);
		if (totalBought > totalSold) openIsins.add(isin);
	}

	const sequences: AveragingDownSequence[] = [];

	for (const [isin, isinTrades] of byIsin) {
		const sorted = [...isinTrades].sort((a, b) => a.tradeDate.getTime() - b.tradeDate.getTime());

		// Walk through buys, tracking sequences of declining prices
		let currentSeq: { date: Date; price: number; quantity: number }[] = [];

		for (const trade of sorted) {
			if (trade.type === 'buy') {
				if (currentSeq.length === 0) {
					currentSeq.push({ date: trade.tradeDate, price: trade.price, quantity: trade.quantity });
				} else {
					const lastPrice = currentSeq[currentSeq.length - 1].price;
					if (trade.price < lastPrice * 0.97) {
						// Price dropped >3% — this is averaging down
						currentSeq.push({ date: trade.tradeDate, price: trade.price, quantity: trade.quantity });
					} else {
						// Price didn't drop — flush current sequence if valid
						if (currentSeq.length >= 2) {
							flushSequence(currentSeq, isin, sorted[0].instrument);
						}
						currentSeq = [{ date: trade.tradeDate, price: trade.price, quantity: trade.quantity }];
					}
				}
			} else if (trade.type === 'sell') {
				// Sell interrupts the sequence — flush if valid
				if (currentSeq.length >= 2) {
					flushSequence(currentSeq, isin, sorted[0].instrument);
				}
				currentSeq = [];
			}
		}

		// Flush any remaining sequence
		if (currentSeq.length >= 2) {
			flushSequence(currentSeq, isin, sorted[0].instrument);
		}

		function flushSequence(
			seq: { date: Date; price: number; quantity: number }[],
			seqIsin: string,
			instrument: string
		) {
			const priceDrop = ((seq[seq.length - 1].price - seq[0].price) / seq[0].price) * 100;
			const profit = profitByIsin.get(seqIsin);
			const isOpen = openIsins.has(seqIsin);

			sequences.push({
				instrument,
				isin: seqIsin,
				buys: [...seq],
				priceDrop,
				outcome: isOpen ? 'open' : profit !== undefined && profit < 0 ? 'sold-at-loss' : 'sold-at-profit',
				profitNOK: profit
			});
		}
	}

	// Sort by price drop (most dramatic first)
	sequences.sort((a, b) => a.priceDrop - b.priceDrop);

	const closed = sequences.filter((s) => s.outcome !== 'open');
	const losses = closed.filter((s) => s.outcome === 'sold-at-loss');

	return {
		sequences,
		totalInstances: sequences.length,
		pctEndedInLoss: closed.length > 0 ? (losses.length / closed.length) * 100 : 0,
		avgPriceDropPct:
			sequences.length > 0
				? sequences.reduce((sum, s) => sum + Math.abs(s.priceDrop), 0) / sequences.length
				: 0
	};
}
