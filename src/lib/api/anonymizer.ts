import type {
	AnalysisReport,
	EntryTimingReport,
	PostSellReport,
	AveragingDownReport,
	AnchoringReport,
	ConvictionVerdict
} from '$lib/types';

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

	// Post-sell (if available) — what happened if they had held longer
	postSell30d?: { avgPctChange: number; pctRose: number };
	postSell90d?: { avgPctChange: number; pctRose: number };
	postSell1y?: { avgPctChange: number; pctRose: number };

	// Averaging down
	averagingDownInstances?: number;
	averagingDownPctEndedInLoss?: number;

	// Break-even anchoring
	anchoringPctNearBreakEven?: number;
	anchoringSeverity?: string;

	// Conviction
	convictionVerdict?: string;
	bigBetsAvgReturn?: number;
	smallBetsAvgReturn?: number;
}

export function anonymize(
	report: AnalysisReport,
	entryTiming?: EntryTimingReport,
	postSell?: PostSellReport,
	averagingDown?: AveragingDownReport,
	anchoring?: AnchoringReport,
	conviction?: ConvictionVerdict
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
		for (const summary of postSell.windowSummaries) {
			if (summary.itemCount === 0) continue;
			const data = { avgPctChange: Math.round(summary.avgPctChange * 10) / 10, pctRose: Math.round(summary.pctWouldHaveGained) };
			if (summary.days === 30) stats.postSell30d = data;
			else if (summary.days === 90) stats.postSell90d = data;
			else if (summary.days === 365) stats.postSell1y = data;
		}
	}

	if (averagingDown && averagingDown.totalInstances > 0) {
		stats.averagingDownInstances = averagingDown.totalInstances;
		stats.averagingDownPctEndedInLoss = Math.round(averagingDown.pctEndedInLoss);
	}

	if (anchoring) {
		stats.anchoringPctNearBreakEven = Math.round(anchoring.pctNearBreakEven);
		stats.anchoringSeverity = anchoring.severity;
	}

	if (conviction) {
		stats.convictionVerdict = conviction.verdict;
		stats.bigBetsAvgReturn = Math.round(conviction.bigBetsAvgReturn * 10) / 10;
		stats.smallBetsAvgReturn = Math.round(conviction.smallBetsAvgReturn * 10) / 10;
	}

	return stats;
}
