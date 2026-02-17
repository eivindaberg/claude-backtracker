import type { TickerMapping, ParsedTrade, TickerPriceHistory } from '$lib/types';

export async function fetchPriceData(
	mappings: TickerMapping[],
	trades: ParsedTrade[]
): Promise<Map<string, TickerPriceHistory>> {
	// Only fetch for confirmed (non-skipped) tickers
	const activeMappings = mappings.filter((m) => m.status === 'confirmed' && m.ticker);

	if (activeMappings.length === 0) {
		return new Map();
	}

	// Find date range: earliest trade - 90 days to today
	const tradeDates = trades.map((t) => t.tradeDate.getTime());
	const earliestTrade = new Date(Math.min(...tradeDates));
	const startDate = new Date(earliestTrade);
	startDate.setDate(startDate.getDate() - 90); // 90 day lookback for entry timing

	const endDate = new Date(); // today

	const fmt = (d: Date) => d.toISOString().split('T')[0];

	const requests = activeMappings.map((m) => ({
		ticker: m.ticker,
		startDate: fmt(startDate),
		endDate: fmt(endDate)
	}));

	const response = await fetch('/api/prices', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ requests })
	});

	if (!response.ok) {
		throw new Error('Failed to fetch price data');
	}

	const { results } = await response.json();

	// Map ISIN → price history
	const priceMap = new Map<string, TickerPriceHistory>();
	for (const mapping of activeMappings) {
		const result = results.find((r: { ticker: string }) => r.ticker === mapping.ticker);
		if (result && result.prices.length > 0) {
			priceMap.set(mapping.isin, {
				ticker: mapping.ticker,
				isin: mapping.isin,
				prices: result.prices
			});
		}
	}

	return priceMap;
}
