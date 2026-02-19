<script lang="ts">
	import type { PostSellReport } from '$lib/types';
	import { formatCurrency, formatPercent } from '$lib/utils';
	import { Card, Badge } from '$lib/components/ui';

	interface Props {
		postSell: PostSellReport;
	}

	let { postSell }: Props = $props();
</script>

<Card>
	<h2 class="mb-4 text-lg font-semibold text-slate-900">What If You Held Longer?</h2>
	<p class="mb-4 text-sm text-slate-500">
		How much would your positions have moved if you waited before selling?
	</p>

	{#if postSell.windowSummaries.some((w) => w.itemCount > 0)}
		<div class="mb-6 grid grid-cols-3 gap-4">
			{#each postSell.windowSummaries as summary}
				{@const positive = summary.avgPctChange >= 0}
				<div class="rounded-lg border border-slate-100 p-4">
					<div class="mb-2 text-xs font-medium text-slate-400 uppercase">+{summary.label}</div>
					{#if summary.itemCount === 0}
						<div class="text-sm text-slate-300 italic">No data</div>
					{:else}
						<div class="text-2xl font-bold {positive ? 'text-loss' : 'text-profit'}">
							{summary.avgPctChange >= 0 ? '+' : ''}{summary.avgPctChange.toFixed(1)}%
						</div>
						<div class="mt-1 text-xs text-slate-500">
							avg. price change
						</div>
						<div class="mt-3 flex items-baseline justify-between text-xs">
							<span class="text-slate-400">{summary.pctWouldHaveGained.toFixed(0)}% rose</span>
							<span class="text-slate-400">{summary.itemCount} sells</span>
						</div>
						<div class="mt-2 flex gap-2 text-xs">
							{#if summary.totalMissedNOK > 0}
								<span class="text-loss">{formatCurrency(summary.totalMissedNOK)} left</span>
							{/if}
							{#if summary.totalDodgedNOK > 0}
								<span class="text-profit">{formatCurrency(summary.totalDodgedNOK)} saved</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if postSell.biggestMissedOpportunities.length > 0}
		<h3 class="mb-2 text-sm font-semibold text-slate-700">Biggest Missed Opportunities</h3>
		<p class="mb-3 text-xs text-slate-400">Sells where holding 3 more months would have paid off most</p>
		<div class="space-y-2">
			{#each postSell.biggestMissedOpportunities as item}
				{@const w90 = item.windows.find((w) => w.days === 90)}
				<div class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
					<div>
						<span class="font-medium text-slate-900">{item.instrument}</span>
						<span class="ml-2 text-xs text-slate-400">
							sold {item.sellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
						</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="text-right">
							<div class="text-sm font-medium text-loss">+{item.windowPct.toFixed(1)}% in 3 months</div>
							{#if w90}
								<div class="text-xs text-slate-400">{formatCurrency(w90.estimatedNOK)} left on table</div>
							{/if}
						</div>
						<Badge variant="loss">Missed</Badge>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
