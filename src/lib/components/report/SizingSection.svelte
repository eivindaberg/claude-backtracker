<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import { formatCurrency, formatPercent, formatNumber } from '$lib/utils';
	import type { SizingAnalysis, ConvictionVerdict } from '$lib/types';

	let { sizing, conviction }: { sizing: SizingAnalysis; conviction?: ConvictionVerdict } = $props();

	const consistencyVariant = {
		consistent: 'profit' as const,
		moderate: 'warning' as const,
		inconsistent: 'loss' as const
	};

	const consistencyLabel = {
		consistent: 'Consistent sizing',
		moderate: 'Moderate variation',
		inconsistent: 'Inconsistent sizing'
	};
</script>

<Card>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-slate-900">Position Sizing</h2>
		<Badge variant={consistencyVariant[sizing.positionSizeConsistency]}>
			{consistencyLabel[sizing.positionSizeConsistency]}
		</Badge>
	</div>

	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div>
			<p class="text-xs font-medium text-slate-500">Avg Position</p>
			<p class="mt-0.5 text-lg font-bold text-slate-900">
				{formatCurrency(sizing.avgPositionSizeNOK)}
			</p>
		</div>
		<div>
			<p class="text-xs font-medium text-slate-500">Median Position</p>
			<p class="mt-0.5 text-lg font-bold text-slate-900">
				{formatCurrency(sizing.medianPositionSizeNOK)}
			</p>
		</div>
		<div>
			<p class="text-xs font-medium text-slate-500">Range</p>
			<p class="mt-0.5 text-lg font-bold text-slate-900">
				{formatCurrency(sizing.minPositionSizeNOK)}
			</p>
			<p class="text-xs text-slate-400">to {formatCurrency(sizing.maxPositionSizeNOK)}</p>
		</div>
		<div>
			<p class="text-xs font-medium text-slate-500">Top 3 Concentration</p>
			<p class="mt-0.5 text-lg font-bold text-slate-900">
				{formatNumber(sizing.concentrationTop3Percent, 1)}%
			</p>
		</div>
	</div>

	<!-- Size vs Outcome table -->
	{#if sizing.sizeVsOutcome.length > 0}
		<h3 class="mb-3 text-sm font-medium text-slate-700">Size vs Outcome</h3>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-slate-100 text-left">
						<th class="pb-2 pr-4 font-medium text-slate-500">Size Quartile</th>
						<th class="pb-2 pr-4 text-right font-medium text-slate-500">Trades</th>
						<th class="pb-2 pr-4 text-right font-medium text-slate-500">Win Rate</th>
						<th class="pb-2 text-right font-medium text-slate-500">Avg Return</th>
					</tr>
				</thead>
				<tbody>
					{#each sizing.sizeVsOutcome as quartile}
						<tr class="border-b border-slate-50">
							<td class="py-2 pr-4 text-slate-700">{quartile.sizeQuartile}</td>
							<td class="py-2 pr-4 text-right text-slate-500">{quartile.count}</td>
							<td class="py-2 pr-4 text-right text-slate-500">
								{formatNumber(quartile.winRate, 0)}%
							</td>
							<td
								class="py-2 text-right font-medium {quartile.avgReturnPercent >= 0
									? 'text-profit'
									: 'text-loss'}"
							>
								{formatPercent(quartile.avgReturnPercent)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if conviction}
		<div class="mt-6 rounded-lg border border-slate-100 p-4">
			<h3 class="mb-2 text-sm font-semibold text-slate-700">Conviction vs Outcome</h3>
			<p class="mb-3 text-xs text-slate-400">Do your biggest bets outperform your smallest?</p>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-xs font-medium text-slate-500">Biggest bets (top 25%)</p>
					<p class="text-lg font-bold {conviction.bigBetsAvgReturn >= 0 ? 'text-profit' : 'text-loss'}">
						{formatPercent(conviction.bigBetsAvgReturn)} avg
					</p>
					<p class="text-xs text-slate-400">{formatNumber(conviction.bigBetsWinRate, 0)}% win rate</p>
				</div>
				<div>
					<p class="text-xs font-medium text-slate-500">Smallest bets (bottom 25%)</p>
					<p class="text-lg font-bold {conviction.smallBetsAvgReturn >= 0 ? 'text-profit' : 'text-loss'}">
						{formatPercent(conviction.smallBetsAvgReturn)} avg
					</p>
					<p class="text-xs text-slate-400">{formatNumber(conviction.smallBetsWinRate, 0)}% win rate</p>
				</div>
			</div>
			<div class="mt-3">
				{#if conviction.verdict === 'big-bets-underperform'}
					<Badge variant="loss">You size up on the wrong trades</Badge>
				{:else if conviction.verdict === 'big-bets-outperform'}
					<Badge variant="profit">Good conviction — big bets pay off</Badge>
				{:else}
					<Badge>No clear pattern</Badge>
				{/if}
			</div>
		</div>
	{/if}
</Card>
