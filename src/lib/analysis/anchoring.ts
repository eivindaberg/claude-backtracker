import type { RoundTrip, AnchoringReport } from '$lib/types';

/**
 * Detect break-even anchoring: selling near the purchase price
 * because the trader is anchored to "getting their money back"
 * rather than making rational exit decisions.
 */
export function analyzeAnchoring(roundTrips: RoundTrip[]): AnchoringReport {
	if (roundTrips.length === 0) {
		return { sellsNearBreakEven: 0, totalSells: 0, pctNearBreakEven: 0, severity: 'none', examples: [] };
	}

	// For each round trip, check how close the sell was to break-even
	const items = roundTrips.map((rt) => ({
		instrument: rt.instrument,
		pctFromBreakEven: rt.profitPercent, // already calculated as % from buy price
		holdDays: rt.holdDays
	}));

	// Count sells within ±3% of break-even
	const nearBreakEven = items.filter((item) => Math.abs(item.pctFromBreakEven) <= 3);
	const pctNearBreakEven = (nearBreakEven.length / items.length) * 100;

	// In a random distribution of returns, you'd expect ~6-10% to fall within ±3%.
	// If significantly more, the trader is anchored to break-even.
	let severity: AnchoringReport['severity'] = 'none';
	if (pctNearBreakEven > 25) severity = 'strong';
	else if (pctNearBreakEven > 15) severity = 'mild';

	// Examples: sells closest to break-even with longest hold times (most "painful" anchoring)
	const examples = [...nearBreakEven]
		.sort((a, b) => b.holdDays - a.holdDays)
		.slice(0, 5)
		.map(({ instrument, pctFromBreakEven, holdDays }) => ({ instrument, pctFromBreakEven, holdDays }));

	return {
		sellsNearBreakEven: nearBreakEven.length,
		totalSells: items.length,
		pctNearBreakEven,
		severity,
		examples
	};
}
