<script lang="ts">
	import type { EntryTimingReport } from '$lib/types';
	import { formatPercent } from '$lib/utils';
	import { Card, Badge } from '$lib/components/ui';

	interface Props {
		entryTiming: EntryTimingReport;
	}

	let { entryTiming }: Props = $props();
</script>

<Card>
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Entry Timing Analysis</h2>
	<p class="mb-4 text-sm text-slate-500">
		How stock prices moved before you bought — were you chasing momentum or buying dips?
	</p>

	<div class="mb-6 grid grid-cols-3 gap-4">
		<div class="rounded-lg bg-loss-bg p-4 text-center">
			<div class="text-2xl font-bold text-loss">{entryTiming.pctAfterRunup.toFixed(0)}%</div>
			<div class="mt-1 text-xs text-slate-500">Bought after run-up</div>
		</div>
		<div class="rounded-lg bg-profit-bg p-4 text-center">
			<div class="text-2xl font-bold text-profit">{entryTiming.pctDuringDip.toFixed(0)}%</div>
			<div class="mt-1 text-xs text-slate-500">Bought during dip</div>
		</div>
		<div class="rounded-lg bg-slate-50 p-4 text-center">
			<div class="text-2xl font-bold text-slate-600">{entryTiming.pctNeutral.toFixed(0)}%</div>
			<div class="mt-1 text-xs text-slate-500">Neutral timing</div>
		</div>
	</div>

	{#if entryTiming.topFomoBuys.length > 0}
		<h3 class="mb-2 text-sm font-semibold text-slate-700">Top FOMO Buys</h3>
		<p class="mb-3 text-xs text-slate-400">Biggest price run-ups in the 7 days before you bought</p>
		<div class="space-y-2">
			{#each entryTiming.topFomoBuys as buy}
				<div class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
					<div>
						<span class="font-medium text-slate-900">{buy.instrument}</span>
						<span class="ml-2 text-xs text-slate-400">
							{buy.buyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
						</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="text-right">
							<div class="text-sm font-medium text-loss">{formatPercent(buy.priceChange7d)} in 7d</div>
							<div class="text-xs text-slate-400">{formatPercent(buy.priceChange30d)} in 30d</div>
						</div>
						<Badge variant="loss">FOMO</Badge>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
