<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { formatCurrency, formatPercent, formatDays, formatNumber } from '$lib/utils';
	import type { SummaryStats } from '$lib/types';

	let { summary }: { summary: SummaryStats } = $props();
</script>

<div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
	<Card>
		<p class="text-sm font-medium text-slate-500">Total P&L</p>
		<p
			class="mt-1 text-2xl font-bold {summary.totalProfitNOK >= 0 ? 'text-profit' : 'text-loss'}"
		>
			{formatCurrency(summary.totalProfitNOK)}
		</p>
		<p class="mt-1 text-xs text-slate-400">{summary.totalRoundTrips} completed trades</p>
	</Card>

	<Card>
		<p class="text-sm font-medium text-slate-500">Win Rate</p>
		<p class="mt-1 text-2xl font-bold text-slate-900">{formatNumber(summary.winRate, 1)}%</p>
		<p class="mt-1 text-xs text-slate-400">
			{Math.round((summary.winRate / 100) * summary.totalRoundTrips)} winners out of {summary.totalRoundTrips}
		</p>
	</Card>

	<Card>
		<p class="text-sm font-medium text-slate-500">Avg Hold Time</p>
		<p class="mt-1 text-2xl font-bold text-slate-900">{formatDays(summary.avgHoldDays)}</p>
		<p class="mt-1 text-xs text-slate-400">Median: {formatDays(summary.medianHoldDays)}</p>
	</Card>

	<Card>
		<p class="text-sm font-medium text-slate-500">Best Trade</p>
		<p class="mt-1 text-2xl font-bold text-profit">{formatCurrency(summary.bestTradeNOK)}</p>
		<p class="mt-1 text-xs text-slate-400">{summary.bestTradeInstrument}</p>
	</Card>

	<Card>
		<p class="text-sm font-medium text-slate-500">Worst Trade</p>
		<p class="mt-1 text-2xl font-bold text-loss">{formatCurrency(summary.worstTradeNOK)}</p>
		<p class="mt-1 text-xs text-slate-400">{summary.worstTradeInstrument}</p>
	</Card>

	<Card>
		<p class="text-sm font-medium text-slate-500">Instruments</p>
		<p class="mt-1 text-2xl font-bold text-slate-900">{summary.uniqueInstruments}</p>
		<p class="mt-1 text-xs text-slate-400">
			{summary.openPositions} open position{summary.openPositions !== 1 ? 's' : ''}
		</p>
	</Card>
</div>
