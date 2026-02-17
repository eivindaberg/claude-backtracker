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
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Post-Sell Analysis</h2>
	<p class="mb-4 text-sm text-slate-500">
		What happened to stocks after you sold — did you leave money on the table?
	</p>

	<div class="mb-6 grid grid-cols-3 gap-4">
		<div class="rounded-lg bg-loss-bg p-4 text-center">
			<div class="text-2xl font-bold text-loss">{postSell.pctSoldTooEarly.toFixed(0)}%</div>
			<div class="mt-1 text-xs text-slate-500">Sold too early</div>
		</div>
		<div class="rounded-lg bg-loss-bg p-4 text-center">
			<div class="text-2xl font-bold text-loss">{formatCurrency(postSell.totalMissedGainsNOK)}</div>
			<div class="mt-1 text-xs text-slate-500">Missed gains</div>
		</div>
		<div class="rounded-lg bg-profit-bg p-4 text-center">
			<div class="text-2xl font-bold text-profit">{formatCurrency(postSell.totalDodgedLossesNOK)}</div>
			<div class="mt-1 text-xs text-slate-500">Dodged losses</div>
		</div>
	</div>

	{#if postSell.biggestMissedOpportunities.length > 0}
		<h3 class="mb-2 text-sm font-semibold text-slate-700">Biggest Missed Opportunities</h3>
		<p class="mb-3 text-xs text-slate-400">Stocks that gained the most after you sold</p>
		<div class="space-y-2">
			{#each postSell.biggestMissedOpportunities as item}
				<div class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
					<div>
						<span class="font-medium text-slate-900">{item.instrument}</span>
						<span class="ml-2 text-xs text-slate-400">
							sold {item.sellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
						</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="text-right">
							<div class="text-sm font-medium text-loss">{formatPercent(item.pctChangeSinceSell)} since sell</div>
							<div class="text-xs text-slate-400">{formatCurrency(item.missedGainOrDodgedLossNOK)} missed</div>
						</div>
						<Badge variant="loss">Missed</Badge>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
