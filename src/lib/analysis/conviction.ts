import type { RoundTrip, ConvictionVerdict } from '$lib/types';

/**
 * Compare performance of biggest bets vs smallest bets.
 * Do you size up on the right trades or the wrong ones?
 */
export function analyzeConviction(roundTrips: RoundTrip[]): ConvictionVerdict | undefined {
	if (roundTrips.length < 8) return undefined; // Need enough data for meaningful quartiles

	const sorted = [...roundTrips].sort((a, b) => a.buyAmountNOK - b.buyAmountNOK);
	const q = Math.ceil(sorted.length / 4);

	const smallBets = sorted.slice(0, q);
	const bigBets = sorted.slice(-q);

	const avg = (rts: RoundTrip[], fn: (rt: RoundTrip) => number) =>
		rts.reduce((sum, rt) => sum + fn(rt), 0) / rts.length;

	const bigBetsAvgReturn = avg(bigBets, (rt) => rt.profitPercent);
	const smallBetsAvgReturn = avg(smallBets, (rt) => rt.profitPercent);
	const bigBetsWinRate = (bigBets.filter((rt) => rt.profitNOK > 0).length / bigBets.length) * 100;
	const smallBetsWinRate = (smallBets.filter((rt) => rt.profitNOK > 0).length / smallBets.length) * 100;

	const diff = bigBetsAvgReturn - smallBetsAvgReturn;
	let verdict: ConvictionVerdict['verdict'] = 'similar';
	if (diff > 5) verdict = 'big-bets-outperform';
	else if (diff < -5) verdict = 'big-bets-underperform';

	return { bigBetsAvgReturn, smallBetsAvgReturn, bigBetsWinRate, smallBetsWinRate, verdict };
}
