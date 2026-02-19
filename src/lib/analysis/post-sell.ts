import type {
	RoundTrip,
	TickerPriceHistory,
	PostSellItem,
	PostSellWindow,
	PostSellWindowSummary,
	PostSellReport
} from '$lib/types';

const WINDOWS = [
	{ days: 30, label: '30 days' },
	{ days: 90, label: '3 months' },
	{ days: 365, label: '1 year' }
];

/** Find the closest price on or after a given date */
function findPriceOnOrAfter(
	prices: { date: string; close: number }[],
	targetDate: Date
): number | null {
	const target = targetDate.toISOString().slice(0, 10);
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

		// Get Yahoo price at sell date as baseline (same currency as Yahoo data)
		const sellDatePrice = findPriceOnOrAfter(history.prices, rt.sellDate);
		if (!sellDatePrice || sellDatePrice <= 0) continue;

		const windows: PostSellWindow[] = WINDOWS.map(({ days }) => {
			const futureDate = new Date(rt.sellDate);
			futureDate.setDate(futureDate.getDate() + days);

			const futurePrice = findPriceOnOrAfter(history.prices, futureDate);
			if (futurePrice === null) return { days, pctChange: null, estimatedNOK: 0 };

			const pctChange = ((futurePrice - sellDatePrice) / sellDatePrice) * 100;
			const estimatedNOK = rt.sellAmountNOK * (pctChange / 100);

			return { days, pctChange, estimatedNOK };
		});

		items.push({
			instrument: rt.instrument,
			isin: rt.isin,
			sellDate: rt.sellDate,
			sellPrice: rt.sellPrice,
			sellAmountNOK: rt.sellAmountNOK,
			windows
		});
	}

	// Build summaries for each window
	const windowSummaries: PostSellWindowSummary[] = WINDOWS.map(({ days, label }) => {
		const withData = items
			.map((item) => item.windows.find((w) => w.days === days))
			.filter((w): w is PostSellWindow => w !== undefined && w.pctChange !== null);

		if (withData.length === 0) {
			return { days, label, avgPctChange: 0, pctWouldHaveGained: 0, totalMissedNOK: 0, totalDodgedNOK: 0, itemCount: 0 };
		}

		const avgPctChange = withData.reduce((sum, w) => sum + w.pctChange!, 0) / withData.length;
		const gained = withData.filter((w) => w.pctChange! > 0);
		const pctWouldHaveGained = (gained.length / withData.length) * 100;
		const totalMissedNOK = withData
			.filter((w) => w.estimatedNOK > 0)
			.reduce((sum, w) => sum + w.estimatedNOK, 0);
		const totalDodgedNOK = Math.abs(
			withData.filter((w) => w.estimatedNOK < 0).reduce((sum, w) => sum + w.estimatedNOK, 0)
		);

		return { days, label, avgPctChange, pctWouldHaveGained, totalMissedNOK, totalDodgedNOK, itemCount: withData.length };
	});

	// Biggest missed opportunities: sells where holding 90 more days would have gained the most
	const with90d = items
		.map((item) => {
			const w = item.windows.find((w) => w.days === 90);
			if (!w || w.pctChange === null || w.pctChange <= 0) return null;
			return { ...item, windowPct: w.pctChange, windowDays: 90 };
		})
		.filter((x): x is NonNullable<typeof x> => x !== null)
		.sort((a, b) => b.windowPct - a.windowPct)
		.slice(0, 5);

	return {
		items,
		windowSummaries,
		biggestMissedOpportunities: with90d
	};
}
