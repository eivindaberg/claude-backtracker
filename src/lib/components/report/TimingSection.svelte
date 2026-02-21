<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import { formatCurrency, formatNumber } from '$lib/utils';
	import type { TimingAnalysis } from '$lib/types';

	let { timing }: { timing: TimingAnalysis } = $props();

	let maxMonthCount = $derived(Math.max(...timing.tradesPerMonth.map((m) => m.count), 1));
	let maxDayCount = $derived(Math.max(...timing.dayOfWeekDistribution.map((d) => d.count), 1));
</script>

<Card>
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Trading Timing</h2>

	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div>
			<p class="text-xs font-medium text-slate-500">Trades/Week</p>
			<p class="mt-0.5 text-lg font-bold text-slate-900">{formatNumber(timing.tradesPerWeek, 1)}</p>
		</div>
		<div>
			<p class="text-xs font-medium text-slate-500">Busiest Month</p>
			<p class="mt-0.5 text-lg font-bold text-slate-900">{timing.busiestMonth}</p>
			<p class="text-xs text-slate-400">{timing.busiestMonthCount} trades</p>
		</div>
		<div>
			<p class="text-xs font-medium text-slate-500">Longest Win Streak</p>
			<p class="mt-0.5 text-lg font-bold text-profit">{timing.longestWinStreak}</p>
		</div>
		<div>
			<p class="text-xs font-medium text-slate-500">Longest Loss Streak</p>
			<p class="mt-0.5 text-lg font-bold text-loss">{timing.longestLossStreak}</p>
		</div>
	</div>

	<!-- Monthly activity chart -->
	<div class="mb-6">
		<h3 class="mb-3 text-sm font-medium text-slate-700">Monthly Activity</h3>
		<div class="flex items-end gap-1" style="height: 100px">
			{#each timing.tradesPerMonth as month}
				{@const height = (month.count / maxMonthCount) * 100}
				<div class="group relative flex min-w-[8px] flex-1 flex-col justify-end">
					<div
						class="w-full rounded-t bg-brand/70 transition-colors hover:bg-brand"
						style="height: {Math.max(height, 3)}%"
					></div>
					<div
						class="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block"
					>
						{month.month}: {month.count}
					</div>
				</div>
			{/each}
		</div>
		{#if timing.tradesPerMonth.length > 0}
			<div class="mt-1 flex justify-between text-[10px] text-slate-400">
				<span>{timing.tradesPerMonth[0].month}</span>
				<span>{timing.tradesPerMonth[timing.tradesPerMonth.length - 1].month}</span>
			</div>
		{/if}
	</div>

	<!-- Day of week distribution -->
	<div class="mb-6">
		<h3 class="mb-3 text-sm font-medium text-slate-700">Day of Week</h3>
		<div class="space-y-2">
			{#each timing.dayOfWeekDistribution as day}
				{@const width = (day.count / maxDayCount) * 100}
				<div class="flex items-center gap-3">
					<span class="w-12 text-xs text-slate-500">{day.day.slice(0, 3)}</span>
					<div class="h-5 flex-1 rounded bg-slate-100">
						<div
							class="flex h-full items-center rounded bg-brand/20 px-2 text-xs text-brand"
							style="width: {Math.max(width, 3)}%"
						>
							{#if width > 15}{day.count}{/if}
						</div>
					</div>
					<span class="w-6 text-right text-xs text-slate-400">{day.count}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Revenge trades -->
	{#if timing.revengeTradeCount > 0}
		{@const totalRevengeLoss = timing.revengeTrades.reduce((sum, r) => sum + r.lossTrade.profitNOK, 0)}
		<div class="border-t border-slate-100 pt-4">
			<div class="mb-2 flex items-center gap-2">
				<h3 class="text-sm font-medium text-slate-700">Revenge Trades</h3>
				<Badge variant="warning">{timing.revengeTradeCount} detected</Badge>
			</div>
			<p class="mb-3 text-xs text-slate-500">
				Re-buying the same stock within 7 days of closing it at a loss.
			</p>
			<div class="mb-3 rounded-lg bg-loss-bg p-3 text-center">
				<div class="text-lg font-bold text-loss">{formatCurrency(totalRevengeLoss)}</div>
				<div class="text-xs text-slate-500">lost on the trades that triggered revenge buys</div>
			</div>
			<div class="space-y-2">
				{#each timing.revengeTrades.slice(0, 5) as revenge}
					<div class="flex items-center justify-between text-sm">
						<div>
							<span class="text-loss">Lost on {revenge.lossTrade.instrument}</span>
							<span class="text-slate-400">
								→ rebought {revenge.daysBetween === 0 ? 'same day' : `${revenge.daysBetween}d later`}
							</span>
						</div>
						<span class="font-medium text-loss">{formatCurrency(revenge.lossTrade.profitNOK)}</span>
					</div>
				{/each}
				{#if timing.revengeTradeCount > 5}
					<p class="text-xs text-slate-400">+{timing.revengeTradeCount - 5} more</p>
				{/if}
			</div>
		</div>
	{/if}
</Card>
