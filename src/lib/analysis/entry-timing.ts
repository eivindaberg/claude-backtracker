import type {
	ParsedTrade,
	TickerPriceHistory,
	EntryTimingItem,
	EntryTimingReport
} from '$lib/types';

function findClosestPrice(
	prices: { date: string; close: number }[],
	targetDate: Date
): number | null {
	const target = targetDate.toISOString().split('T')[0];
	// Look for exact date first, then closest before
	for (let i = prices.length - 1; i >= 0; i--) {
		if (prices[i].date <= target) {
			return prices[i].close;
		}
	}
	return null;
}

function getPriceNDaysBack(
	prices: { date: string; close: number }[],
	referenceDate: Date,
	daysBack: number
): number | null {
	const target = new Date(referenceDate);
	target.setDate(target.getDate() - daysBack);
	return findClosestPrice(prices, target);
}

export function analyzeEntryTiming(
	trades: ParsedTrade[],
	priceMap: Map<string, TickerPriceHistory>
): EntryTimingReport {
	const buys = trades.filter((t) => t.type === 'buy');
	const items: EntryTimingItem[] = [];

	for (const buy of buys) {
		const history = priceMap.get(buy.isin);
		if (!history || history.prices.length === 0) continue;

		const buyDayPrice = findClosestPrice(history.prices, buy.tradeDate);
		const price7dAgo = getPriceNDaysBack(history.prices, buy.tradeDate, 7);
		const price30dAgo = getPriceNDaysBack(history.prices, buy.tradeDate, 30);

		if (buyDayPrice === null) continue;

		const priceChange7d = price7dAgo !== null ? ((buyDayPrice - price7dAgo) / price7dAgo) * 100 : 0;
		const priceChange30d =
			price30dAgo !== null ? ((buyDayPrice - price30dAgo) / price30dAgo) * 100 : 0;

		// Classify: after-runup if 7d>10% or 30d>20%, during-dip if 7d<-10% or 30d<-15%
		let pattern: EntryTimingItem['pattern'] = 'neutral';
		if (priceChange7d > 10 || priceChange30d > 20) {
			pattern = 'after-runup';
		} else if (priceChange7d < -10 || priceChange30d < -15) {
			pattern = 'during-dip';
		}

		items.push({
			instrument: buy.instrument,
			isin: buy.isin,
			buyDate: buy.tradeDate,
			buyPrice: buy.price,
			priceChange7d,
			priceChange30d,
			pattern
		});
	}

	const total = items.length || 1;
	const afterRunup = items.filter((i) => i.pattern === 'after-runup');
	const duringDip = items.filter((i) => i.pattern === 'during-dip');
	const neutral = items.filter((i) => i.pattern === 'neutral');

	// Top FOMO buys: biggest 7d run-ups before purchase
	const topFomoBuys = [...afterRunup]
		.sort((a, b) => b.priceChange7d - a.priceChange7d)
		.slice(0, 5);

	return {
		items,
		pctAfterRunup: (afterRunup.length / total) * 100,
		pctDuringDip: (duringDip.length / total) * 100,
		pctNeutral: (neutral.length / total) * 100,
		topFomoBuys
	};
}
