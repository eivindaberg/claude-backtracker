import type { RoundTrip, DispositionAnalysis, PrematureSell } from '$lib/types';

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function analyzeDisposition(roundTrips: RoundTrip[]): DispositionAnalysis {
	const winners = roundTrips.filter((rt) => rt.profitNOK > 0);
	const losers = roundTrips.filter((rt) => rt.profitNOK <= 0);

	const winnerHoldDays = winners.map((rt) => rt.holdDays);
	const loserHoldDays = losers.map((rt) => rt.holdDays);

	const avgHoldDaysWinners =
		winnerHoldDays.length > 0
			? winnerHoldDays.reduce((a, b) => a + b, 0) / winnerHoldDays.length
			: 0;

	const avgHoldDaysLosers =
		loserHoldDays.length > 0
			? loserHoldDays.reduce((a, b) => a + b, 0) / loserHoldDays.length
			: 0;

	const medianHoldDaysWinners = median(winnerHoldDays);
	const medianHoldDaysLosers = median(loserHoldDays);

	// Disposition ratio: how much longer losers are held vs winners
	// > 1 means holding losers longer (classic disposition effect)
	const dispositionRatio =
		avgHoldDaysWinners > 0 ? avgHoldDaysLosers / avgHoldDaysWinners : 0;

	let severity: DispositionAnalysis['severity'];
	if (dispositionRatio <= 1.2) severity = 'none';
	else if (dispositionRatio <= 2.0) severity = 'mild';
	else if (dispositionRatio <= 3.5) severity = 'moderate';
	else severity = 'severe';

	// Identify premature sells: winners sold within 7 days with >5% gain
	const prematureSells: PrematureSell[] = winners
		.filter((rt) => rt.holdDays <= 7 && rt.profitPercent > 5)
		.map((rt) => ({
			instrument: rt.instrument,
			sellDate: rt.sellDate,
			holdDays: rt.holdDays,
			profitPercent: rt.profitPercent
		}))
		.sort((a, b) => b.profitPercent - a.profitPercent);

	return {
		avgHoldDaysWinners,
		avgHoldDaysLosers,
		medianHoldDaysWinners,
		medianHoldDaysLosers,
		dispositionRatio,
		severity,
		winnersCount: winners.length,
		losersCount: losers.length,
		prematureSells
	};
}
