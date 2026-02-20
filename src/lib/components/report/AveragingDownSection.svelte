<script lang="ts">
	import type { AveragingDownReport } from '$lib/types';
	import { formatNumber } from '$lib/utils';
	import { Card, Badge } from '$lib/components/ui';

	interface Props {
		averagingDown: AveragingDownReport;
	}

	let { averagingDown }: Props = $props();
</script>

<Card>
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Averaging Down</h2>
	<p class="mb-4 text-sm text-slate-500">
		Did you keep buying as a stock fell, hoping to lower your average cost?
	</p>

	{#if averagingDown.totalInstances === 0}
		<p class="text-sm text-slate-400 italic">No averaging-down patterns detected.</p>
	{:else}
		<div class="mb-6 grid grid-cols-3 gap-4">
			<div class="rounded-lg bg-slate-50 p-4 text-center">
				<div class="text-2xl font-bold text-slate-900">{averagingDown.totalInstances}</div>
				<div class="mt-1 text-xs text-slate-500">Stocks averaged down</div>
			</div>
			<div class="rounded-lg bg-loss-bg p-4 text-center">
				<div class="text-2xl font-bold text-loss">{averagingDown.pctEndedInLoss.toFixed(0)}%</div>
				<div class="mt-1 text-xs text-slate-500">Ended in loss</div>
			</div>
			<div class="rounded-lg bg-slate-50 p-4 text-center">
				<div class="text-2xl font-bold text-slate-900">{formatNumber(averagingDown.avgPriceDropPct, 0)}%</div>
				<div class="mt-1 text-xs text-slate-500">Avg price drop</div>
			</div>
		</div>

		{#if averagingDown.sequences.length > 0}
			<h3 class="mb-2 text-sm font-semibold text-slate-700">Instances</h3>
			<div class="space-y-2">
				{#each averagingDown.sequences.slice(0, 8) as seq}
					<div class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
						<div>
							<span class="font-medium text-slate-900">{seq.instrument}</span>
							<span class="ml-2 text-xs text-slate-400">
								{seq.buys.length} buys, {seq.priceDrop.toFixed(0)}% price drop
							</span>
						</div>
						<Badge variant={seq.outcome === 'sold-at-loss' ? 'loss' : seq.outcome === 'sold-at-profit' ? 'profit' : 'default'}>
							{seq.outcome === 'sold-at-loss' ? 'Loss' : seq.outcome === 'sold-at-profit' ? 'Profit' : 'Open'}
						</Badge>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</Card>
