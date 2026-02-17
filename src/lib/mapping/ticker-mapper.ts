import type { ParsedTrade, TickerMapping } from '$lib/types';

// Hardcoded default ticker mappings for known Nordnet instruments → Yahoo Finance tickers
const DEFAULT_TICKERS: Record<string, string> = {
	// US Stocks
	'US02079K3059': 'GOOGL', // Alphabet A
	'US02079K1079': 'GOOG', // Alphabet C
	'US0231351067': 'AMZN', // Amazon.com
	'US03213A1043': 'AMPL', // Amplitude A
	'US0494681010': 'TEAM', // Atlassian A
	'US09352U1088': 'BLND', // Blend Labs A
	'US18915M1071': 'NET', // Cloudflare
	'US1259193084': 'CVU', // CPI Aerostructures
	'US2267181046': 'CRTO', // Criteo ADR
	'US22788C1053': 'CRWD', // CrowdStrike A
	'US23804L1035': 'DDOG', // Datadog A
	'US25402D1028': 'DOCN', // DigitalOcean
	'US3383071012': 'FIVN', // Five9
	'US37637K1088': 'GTLB', // GitLab A
	'US4642851053': 'IAU', // iShares Gold Trust
	'US5322578056': 'LPTH', // LightPath Technologies A
	'US5398301094': 'LMT', // Lockheed Martin
	'US55380K1097': 'MPTI', // M-tron Industries
	'US30303M1027': 'META', // Meta Platforms A
	'US5951121038': 'MU', // Micron Technology
	'US5949181045': 'MSFT', // Microsoft
	'US60937P1066': 'MDB', // MongoDB A
	'US67066G1040': 'NVDA', // NVIDIA
	'US67623L3078': 'OPAD', // Offerpad Solutions A
	'US7731221062': 'RKLB', // Rocket Lab USA
	'US80007P8692': 'SD', // SandRidge Energy
	'US81730H1095': 'S', // SentinelOne A
	'US8334451098': 'SNOW', // Snowflake Inc.
	'US8608971078': 'SFIX', // Stitch Fix A
	'US98980G1022': 'ZS', // Zscaler

	// Israeli stocks (US-listed)
	'IL0011762130': 'MNDY', // Monday.com
	'IL0011796880': 'VLN', // Valens Semiconductor

	// Canadian stocks
	'CA48113W1023': 'JOY.TO', // Journey Energy
	'CA82509L1076': 'SHOP', // Shopify

	// ETFs
	'US00214Q7088': 'ARKF', // ARK Blockchain & Fintech Innovation ETF
	'US00214Q1040': 'ARKK', // ARK Innovation ETF
	'US67110P7042': 'OGIG', // OSI ETF Trust OSHARES Global Internet Giants
	'US74347B3758': 'CLIX', // ProShares Long Online/Short Stores ETF
	'US74347G7051': 'DIG', // ProShares Ultra Energy
	'CA74642C1023': 'BTCC-B.TO', // Purpose Bitcoin ETF
	'US88166A5083': 'WEAT', // Teucrium Wheat ETF
	'US19423L5654': 'SARK', // Tuttle Capital Short Innovation ETF
	'IE00BYMLZY74': 'WCOA.L', // WisdomTree Enhanced Commodity UCITS ETF

	// US small-cap / specialty
	'US83089J1088': 'SKYT', // SkyWater Technology

	// Norwegian listed
	'NO0013683821': 'APPEAR.OL' // Appear
};

// Norwegian fund patterns - auto-skip these since Yahoo Finance doesn't have them
const NORWEGIAN_FUND_PATTERNS = [
	/^KLP\b/i,
	/^Landkreditt\b/i,
	/^DNB\b/i,
	/^Alfred Berg\b/i
];

function isNorwegianFund(instrument: string, isin: string): boolean {
	if (isin.startsWith('NO') && NORWEGIAN_FUND_PATTERNS.some((p) => p.test(instrument))) {
		return true;
	}
	return false;
}

export function generateTickerMappings(trades: ParsedTrade[]): TickerMapping[] {
	// Deduplicate by ISIN
	const seen = new Map<string, { instrument: string; isin: string }>();
	for (const trade of trades) {
		if (!seen.has(trade.isin)) {
			seen.set(trade.isin, { instrument: trade.instrument, isin: trade.isin });
		}
	}

	const mappings: TickerMapping[] = [];

	for (const { instrument, isin } of seen.values()) {
		const isFund = isNorwegianFund(instrument, isin);
		const defaultTicker = DEFAULT_TICKERS[isin] || '';

		mappings.push({
			instrument,
			isin,
			ticker: isFund ? '' : defaultTicker,
			status: isFund ? 'skipped' : defaultTicker ? 'confirmed' : 'pending',
			isNorwegianFund: isFund
		});
	}

	// Sort: stocks with tickers first, then pending, then skipped funds
	mappings.sort((a, b) => {
		if (a.isNorwegianFund !== b.isNorwegianFund) return a.isNorwegianFund ? 1 : -1;
		if (a.status !== b.status) {
			const order = { confirmed: 0, pending: 1, skipped: 2 };
			return order[a.status] - order[b.status];
		}
		return a.instrument.localeCompare(b.instrument);
	});

	return mappings;
}

/** Auto-search Yahoo Finance for instruments that don't have hardcoded mappings */
export async function autoSearchTickers(
	mappings: TickerMapping[]
): Promise<TickerMapping[]> {
	const pending = mappings.filter((m) => m.status === 'pending' && !m.isNorwegianFund);
	if (pending.length === 0) return mappings;

	try {
		const response = await fetch('/api/ticker-search', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				requests: pending.map((m) => ({ instrument: m.instrument, isin: m.isin }))
			})
		});

		if (!response.ok) return mappings;

		const { results } = await response.json();

		// Apply found tickers back to mappings
		const updated = mappings.map((m) => {
			const found = results.find((r: { isin: string; ticker: string }) => r.isin === m.isin);
			if (found && found.ticker) {
				return { ...m, ticker: found.ticker, status: 'confirmed' as const };
			}
			return m;
		});

		return updated;
	} catch {
		// Search failed, return original mappings — user can still fill in manually
		return mappings;
	}
}
