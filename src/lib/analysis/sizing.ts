import type { RoundTrip, SizingAnalysis, SizeVsOutcome } from '$lib/types';

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
	if (values.length < 2) return 0;
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const squaredDiffs = values.map((v) => (v - mean) ** 2);
	return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export function analyzeSizing(roundTrips: RoundTrip[]): SizingAnalysis {
	const sizes = roundTrips.map((rt) => rt.buyAmountNOK);

	const avgPositionSizeNOK = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
	const medianPositionSizeNOK = median(sizes);
	const minPositionSizeNOK = sizes.length > 0 ? Math.min(...sizes) : 0;
	const maxPositionSizeNOK = sizes.length > 0 ? Math.max(...sizes) : 0;
	const sizeStdDev = stdDev(sizes);

	// Concentration: top 3 positions as % of total invested
	const totalInvested = sizes.reduce((a, b) => a + b, 0);
	const sortedSizes = [...sizes].sort((a, b) => b - a);
	const top3 = sortedSizes.slice(0, 3).reduce((a, b) => a + b, 0);
	const concentrationTop3Percent = totalInvested > 0 ? (top3 / totalInvested) * 100 : 0;

	// Size vs outcome by quartile
	const sortedBySizeWithRT = roundTrips
		.map((rt) => ({ rt, size: rt.buyAmountNOK }))
		.sort((a, b) => a.size - b.size);

	const quartileSize = Math.ceil(sortedBySizeWithRT.length / 4);
	const quartileLabels = ['Small', 'Medium', 'Large', 'Very Large'];
	const sizeVsOutcome: SizeVsOutcome[] = [];

	for (let i = 0; i < 4; i++) {
		const start = i * quartileSize;
		const end = Math.min(start + quartileSize, sortedBySizeWithRT.length);
		const quartile = sortedBySizeWithRT.slice(start, end);

		if (quartile.length === 0) continue;

		const returns = quartile.map((q) => q.rt.profitPercent);
		const wins = quartile.filter((q) => q.rt.profitNOK > 0).length;

		sizeVsOutcome.push({
			sizeQuartile: quartileLabels[i],
			avgReturnPercent: returns.reduce((a, b) => a + b, 0) / returns.length,
			count: quartile.length,
			winRate: (wins / quartile.length) * 100
		});
	}

	// Consistency rating
	const cv = avgPositionSizeNOK > 0 ? sizeStdDev / avgPositionSizeNOK : 0;
	let positionSizeConsistency: SizingAnalysis['positionSizeConsistency'];
	if (cv <= 0.3) positionSizeConsistency = 'consistent';
	else if (cv <= 0.7) positionSizeConsistency = 'moderate';
	else positionSizeConsistency = 'inconsistent';

	return {
		avgPositionSizeNOK,
		medianPositionSizeNOK,
		minPositionSizeNOK,
		maxPositionSizeNOK,
		sizeStdDev,
		concentrationTop3Percent,
		sizeVsOutcome,
		positionSizeConsistency
	};
}
