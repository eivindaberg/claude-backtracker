import type { ParsedTrade, RoundTrip, OpenPosition, SummaryStats } from '$lib/types';

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeSummary(
	trades: ParsedTrade[],
	roundTrips: RoundTrip[],
	openPositions: OpenPosition[]
): SummaryStats {
	const buys = trades.filter((t) => t.type === 'buy');
	const sells = trades.filter((t) => t.type === 'sell');

	const winners = roundTrips.filter((rt) => rt.profitNOK > 0);
	const holdDays = roundTrips.map((rt) => rt.holdDays);

	const totalProfitNOK = roundTrips.reduce((sum, rt) => sum + rt.profitNOK, 0);

	const best = roundTrips.reduce(
		(max, rt) => (rt.profitNOK > max.profitNOK ? rt : max),
		roundTrips[0]
	);
	const worst = roundTrips.reduce(
		(min, rt) => (rt.profitNOK < min.profitNOK ? rt : min),
		roundTrips[0]
	);

	const instruments = new Set(trades.map((t) => t.isin));

	const dates = trades.map((t) => t.tradeDate.getTime());
	const firstTradeDate = new Date(Math.min(...dates));
	const lastTradeDate = new Date(Math.max(...dates));
	const tradingPeriodDays = Math.round(
		(lastTradeDate.getTime() - firstTradeDate.getTime()) / (1000 * 60 * 60 * 24)
	);

	return {
		totalTrades: trades.length,
		totalBuys: buys.length,
		totalSells: sells.length,
		totalRoundTrips: roundTrips.length,
		totalProfitNOK,
		winRate: roundTrips.length > 0 ? (winners.length / roundTrips.length) * 100 : 0,
		avgHoldDays: holdDays.length > 0 ? holdDays.reduce((a, b) => a + b, 0) / holdDays.length : 0,
		medianHoldDays: median(holdDays),
		bestTradeNOK: best?.profitNOK ?? 0,
		bestTradeInstrument: best?.instrument ?? '',
		worstTradeNOK: worst?.profitNOK ?? 0,
		worstTradeInstrument: worst?.instrument ?? '',
		uniqueInstruments: instruments.size,
		tradingPeriodDays,
		firstTradeDate,
		lastTradeDate,
		openPositions: openPositions.length
	};
}
