import type { AnalysisReport, EntryTimingReport, PostSellReport } from '$lib/types';

export interface AnonymizedStats {
	// Summary
	totalRoundTrips: number;
	winRate: number;
	avgHoldDays: number;
	medianHoldDays: number;
	tradingPeriodDays: number;

	// Disposition
	avgHoldDaysWinners: number;
	avgHoldDaysLosers: number;
	dispositionRatio: number;
	dispositionSeverity: string;
	prematureSellCount: number;

	// Timing
	tradesPerWeek: number;
	revengeTradeCount: number;
	longestWinStreak: number;
	longestLossStreak: number;

	// Sizing
	positionSizeConsistency: string;
	concentrationTop3Percent: number;

	// Per-stock patterns (counts only, no names)
	consistentLoserCount: number;
	reliableWinnerCount: number;
	quickFlipperCount: number;
	overtradedLoserCount: number;

	// Entry timing (if available)
	pctBoughtAfterRunup?: number;
	pctBoughtDuringDip?: number;

	// Post-sell (if available)
	pctSoldTooEarly?: number;
	totalMissedGainsVsDodgedLosses?: string;
}

export function anonymize(
	report: AnalysisReport,
	entryTiming?: EntryTimingReport,
	postSell?: PostSellReport
): AnonymizedStats {
	const patternCounts = (pattern: string) =>
		report.perStock.filter((s) => s.pattern === pattern).length;

	const stats: AnonymizedStats = {
		totalRoundTrips: report.summary.totalRoundTrips,
		winRate: report.summary.winRate,
		avgHoldDays: report.summary.avgHoldDays,
		medianHoldDays: report.summary.medianHoldDays,
		tradingPeriodDays: report.summary.tradingPeriodDays,

		avgHoldDaysWinners: report.disposition.avgHoldDaysWinners,
		avgHoldDaysLosers: report.disposition.avgHoldDaysLosers,
		dispositionRatio: report.disposition.dispositionRatio,
		dispositionSeverity: report.disposition.severity,
		prematureSellCount: report.disposition.prematureSells.length,

		tradesPerWeek: report.timing.tradesPerWeek,
		revengeTradeCount: report.timing.revengeTradeCount,
		longestWinStreak: report.timing.longestWinStreak,
		longestLossStreak: report.timing.longestLossStreak,

		positionSizeConsistency: report.sizing.positionSizeConsistency,
		concentrationTop3Percent: report.sizing.concentrationTop3Percent,

		consistentLoserCount: patternCounts('Consistent loser'),
		reliableWinnerCount: patternCounts('Reliable winner'),
		quickFlipperCount: patternCounts('Quick flipper'),
		overtradedLoserCount: patternCounts('Overtraded loser')
	};

	if (entryTiming) {
		stats.pctBoughtAfterRunup = entryTiming.pctAfterRunup;
		stats.pctBoughtDuringDip = entryTiming.pctDuringDip;
	}

	if (postSell) {
		stats.pctSoldTooEarly = postSell.pctSoldTooEarly;
		if (postSell.totalMissedGainsNOK > 0 || postSell.totalDodgedLossesNOK > 0) {
			const ratio =
				postSell.totalDodgedLossesNOK > 0
					? postSell.totalMissedGainsNOK / postSell.totalDodgedLossesNOK
					: Infinity;
			stats.totalMissedGainsVsDodgedLosses = `Missed gains are ${ratio === Infinity ? 'much' : ratio.toFixed(1) + 'x'} larger than dodged losses`;
		}
	}

	return stats;
}
