import type { ParsedTrade, AnalysisReport } from '$lib/types';
import { matchTrades } from '$lib/matching/fifo';
import { computeSummary } from './summary';
import { analyzeDisposition } from './disposition';
import { analyzeTiming } from './timing';
import { analyzeSizing } from './sizing';
import { analyzePerStock } from './per-stock';

export function analyzeAll(trades: ParsedTrade[]): AnalysisReport {
	const { roundTrips, openPositions } = matchTrades(trades);
	const summary = computeSummary(trades, roundTrips, openPositions);
	const disposition = analyzeDisposition(roundTrips);
	const timing = analyzeTiming(trades, roundTrips);
	const sizing = analyzeSizing(roundTrips);
	const perStock = analyzePerStock(roundTrips);

	return {
		summary,
		disposition,
		timing,
		sizing,
		perStock,
		roundTrips,
		openPositions
	};
}
