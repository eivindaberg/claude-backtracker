import type { RoundTrip, PerStockAnalysis } from '$lib/types';

export function analyzePerStock(roundTrips: RoundTrip[]): PerStockAnalysis[] {
	const byIsin = new Map<string, RoundTrip[]>();
	for (const rt of roundTrips) {
		const existing = byIsin.get(rt.isin) || [];
		existing.push(rt);
		byIsin.set(rt.isin, existing);
	}

	const results: PerStockAnalysis[] = [];

	for (const [isin, trips] of byIsin) {
		const wins = trips.filter((rt) => rt.profitNOK > 0);
		const losses = trips.filter((rt) => rt.profitNOK <= 0);
		const totalProfitNOK = trips.reduce((sum, rt) => sum + rt.profitNOK, 0);
		const avgProfitPercent = trips.reduce((sum, rt) => sum + rt.profitPercent, 0) / trips.length;
		const avgHoldDays = trips.reduce((sum, rt) => sum + rt.holdDays, 0) / trips.length;
		const winRate = (wins.length / trips.length) * 100;

		const pattern = detectPattern(trips, winRate, avgHoldDays, totalProfitNOK);

		results.push({
			instrument: trips[0].instrument,
			isin,
			roundTrips: trips.length,
			wins: wins.length,
			losses: losses.length,
			winRate,
			totalProfitNOK,
			avgProfitPercent,
			avgHoldDays,
			pattern
		});
	}

	// Sort by number of round trips descending
	return results.sort((a, b) => b.roundTrips - a.roundTrips);
}

function detectPattern(
	trips: RoundTrip[],
	winRate: number,
	avgHoldDays: number,
	totalProfitNOK: number
): string {
	if (trips.length >= 3 && winRate <= 33) return 'Consistent loser';
	if (trips.length >= 3 && winRate >= 80) return 'Reliable winner';
	if (avgHoldDays <= 5 && trips.length >= 2) return 'Quick flipper';
	if (avgHoldDays >= 180) return 'Long-term hold';
	if (trips.length >= 4 && totalProfitNOK < 0) return 'Overtraded loser';
	if (trips.length === 1 && totalProfitNOK > 0) return 'One-shot winner';
	if (trips.length === 1 && totalProfitNOK <= 0) return 'One-shot loser';
	if (winRate >= 50 && totalProfitNOK < 0) return 'Small wins, big losses';
	if (winRate < 50 && totalProfitNOK > 0) return 'Small losses, big wins';
	return 'Mixed results';
}
