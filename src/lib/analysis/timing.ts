import type { ParsedTrade, RoundTrip, TimingAnalysis, RevengeTrade, Streak } from '$lib/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function daysBetween(a: Date, b: Date): number {
	return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMonth(date: Date): string {
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

export function analyzeTiming(trades: ParsedTrade[], roundTrips: RoundTrip[]): TimingAnalysis {
	// Trades per week
	const dates = trades.map((t) => t.tradeDate.getTime());
	const firstDate = Math.min(...dates);
	const lastDate = Math.max(...dates);
	const totalWeeks = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 7));
	const tradesPerWeek = trades.length / totalWeeks;

	// Monthly distribution
	const monthCounts = new Map<string, number>();
	for (const trade of trades) {
		const month = formatMonth(trade.tradeDate);
		monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
	}
	const tradesPerMonth = Array.from(monthCounts.entries())
		.map(([month, count]) => ({ month, count }))
		.sort((a, b) => {
			// Sort chronologically
			const dateA = new Date(a.month);
			const dateB = new Date(b.month);
			return dateA.getTime() - dateB.getTime();
		});

	const busiestEntry = tradesPerMonth.reduce(
		(max, entry) => (entry.count > max.count ? entry : max),
		tradesPerMonth[0] || { month: '', count: 0 }
	);

	// Day of week distribution
	const dayCounts = new Map<number, number>();
	for (const trade of trades) {
		const day = trade.tradeDate.getDay();
		dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
	}
	const dayOfWeekDistribution = [1, 2, 3, 4, 5].map((day) => ({
		day: DAY_NAMES[day],
		count: dayCounts.get(day) || 0
	}));

	// Revenge trades: re-buying the SAME stock within 7 days of a losing sell
	const losingSells = roundTrips
		.filter((rt) => rt.profitNOK < 0)
		.sort((a, b) => a.sellDate.getTime() - b.sellDate.getTime());

	const buys = trades
		.filter((t) => t.type === 'buy')
		.sort((a, b) => a.tradeDate.getTime() - b.tradeDate.getTime());

	const revengeTrades: RevengeTrade[] = [];
	for (const loss of losingSells) {
		for (const buy of buys) {
			const gap = daysBetween(loss.sellDate, buy.tradeDate);
			if (gap >= 0 && gap <= 7 && buy.isin === loss.isin) {
				revengeTrades.push({
					lossTrade: loss,
					followUpBuy: buy,
					daysBetween: gap
				});
				break; // Only count first revenge buy per loss
			}
		}
	}

	// Win/loss streaks (by sell date order)
	const sortedByClose = [...roundTrips].sort(
		(a, b) => a.sellDate.getTime() - b.sellDate.getTime()
	);

	const winStreaks: Streak[] = [];
	const lossStreaks: Streak[] = [];
	let currentStreak: RoundTrip[] = [];
	let currentType: 'win' | 'loss' | null = null;

	function closeStreak() {
		if (currentStreak.length >= 2 && currentType) {
			const streak: Streak = {
				length: currentStreak.length,
				startDate: currentStreak[0].sellDate,
				endDate: currentStreak[currentStreak.length - 1].sellDate,
				totalProfitNOK: currentStreak.reduce((sum, rt) => sum + rt.profitNOK, 0)
			};
			if (currentType === 'win') winStreaks.push(streak);
			else lossStreaks.push(streak);
		}
		currentStreak = [];
		currentType = null;
	}

	for (const rt of sortedByClose) {
		const isWin = rt.profitNOK > 0;
		const type = isWin ? 'win' : 'loss';

		if (type === currentType) {
			currentStreak.push(rt);
		} else {
			closeStreak();
			currentType = type;
			currentStreak = [rt];
		}
	}
	closeStreak();

	return {
		tradesPerWeek,
		tradesPerMonth,
		busiestMonth: busiestEntry.month,
		busiestMonthCount: busiestEntry.count,
		revengeTrades,
		revengeTradeCount: revengeTrades.length,
		dayOfWeekDistribution,
		winStreaks: winStreaks.sort((a, b) => b.length - a.length),
		lossStreaks: lossStreaks.sort((a, b) => b.length - a.length),
		longestWinStreak: winStreaks.length > 0 ? Math.max(...winStreaks.map((s) => s.length)) : 0,
		longestLossStreak: lossStreaks.length > 0 ? Math.max(...lossStreaks.map((s) => s.length)) : 0
	};
}
