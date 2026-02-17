import type { RoundTrip, TickerPriceHistory, PostSellItem, PostSellReport } from '$lib/types';

/** Find the closest price on or after a given date */
function findPriceOnOrAfter(prices: { date: string; close: number }[], targetDate: Date): number | null {
	const target = targetDate.toISOString().slice(0, 10);
	// Prices are sorted chronologically; find the first price >= target date
	for (const p of prices) {
		if (p.date >= target) return p.close;
	}
	return null;
}

export function analyzePostSell(
	roundTrips: RoundTrip[],
	priceMap: Map<string, TickerPriceHistory>
): PostSellReport {
	const items: PostSellItem[] = [];

	for (const rt of roundTrips) {
		const history = priceMap.get(rt.isin);
		if (!history || history.prices.length === 0) continue;

		// Get the latest available price (current price)
		const latestPrice = history.prices[history.prices.length - 1];
		if (!latestPrice) continue;

		const currentPrice = latestPrice.close;

		// Find Yahoo price at sell date — this ensures both prices are in the
		// same currency (Yahoo's listing currency), avoiding currency mismatch
		// when Nordnet trades in a different currency than Yahoo lists.
		const sellDatePrice = findPriceOnOrAfter(history.prices, rt.sellDate);
		if (!sellDatePrice || sellDatePrice <= 0) continue;

		const pctChangeSinceSell = ((currentPrice - sellDatePrice) / sellDatePrice) * 100;

		// Estimate missed gain/dodged loss in NOK based on the sell amount
		const missedGainOrDodgedLossNOK = rt.sellAmountNOK * (pctChangeSinceSell / 100);

		// Classify: >10% up = missed-gain, >10% down = dodged-loss
		let classification: PostSellItem['classification'] = 'neutral';
		if (pctChangeSinceSell > 10) {
			classification = 'missed-gain';
		} else if (pctChangeSinceSell < -10) {
			classification = 'dodged-loss';
		}

		items.push({
			instrument: rt.instrument,
			isin: rt.isin,
			sellDate: rt.sellDate,
			sellPrice: rt.sellPrice,
			currentPrice,
			pctChangeSinceSell,
			missedGainOrDodgedLossNOK,
			classification,
			sellAmountNOK: rt.sellAmountNOK
		});
	}

	const total = items.length || 1;
	const missedGains = items.filter((i) => i.classification === 'missed-gain');
	const dodgedLosses = items.filter((i) => i.classification === 'dodged-loss');

	const totalMissedGainsNOK = missedGains.reduce(
		(sum, i) => sum + i.missedGainOrDodgedLossNOK,
		0
	);
	const totalDodgedLossesNOK = Math.abs(
		dodgedLosses.reduce((sum, i) => sum + i.missedGainOrDodgedLossNOK, 0)
	);

	// Biggest missed opportunities: sorted by missed gain NOK descending
	const biggestMissedOpportunities = [...missedGains]
		.sort((a, b) => b.missedGainOrDodgedLossNOK - a.missedGainOrDodgedLossNOK)
		.slice(0, 5);

	return {
		items,
		pctSoldTooEarly: (missedGains.length / total) * 100,
		totalMissedGainsNOK,
		totalDodgedLossesNOK,
		biggestMissedOpportunities
	};
}
