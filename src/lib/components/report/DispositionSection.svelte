<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import { formatDays, formatPercent } from '$lib/utils';
	import type { DispositionAnalysis } from '$lib/types';

	let { disposition }: { disposition: DispositionAnalysis } = $props();

	let maxDays = $derived(Math.max(disposition.avgHoldDaysWinners, disposition.avgHoldDaysLosers, 1));
	let winnerWidth = $derived((disposition.avgHoldDaysWinners / maxDays) * 100);
	let loserWidth = $derived((disposition.avgHoldDaysLosers / maxDays) * 100);

	const severityVariant = {
		none: 'profit' as const,
		mild: 'warning' as const,
		moderate: 'warning' as const,
		severe: 'loss' as const
	};

	const severityLabel = {
		none: 'No disposition effect',
		mild: 'Mild disposition effect',
		moderate: 'Moderate disposition effect',
		severe: 'Severe disposition effect'
	};
</script>

<Card>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-slate-900">Disposition Effect</h2>
		<Badge variant={severityVariant[disposition.severity]}>
			{severityLabel[disposition.severity]}
		</Badge>
	</div>

	<p class="mb-6 text-sm text-slate-500">
		The disposition effect is the tendency to sell winners too early and hold losers too long.
		{#if disposition.dispositionRatio > 1.2}
			You hold losing positions <strong>{disposition.dispositionRatio.toFixed(1)}x</strong> longer than
			winning ones.
		{:else}
			Your hold times for winners and losers are relatively balanced.
		{/if}
	</p>

	<div class="space-y-4">
		<!-- Winners bar -->
		<div>
			<div class="mb-1 flex items-center justify-between text-sm">
				<span class="font-medium text-slate-700">
					Winners ({disposition.winnersCount})
				</span>
				<span class="text-slate-500">
					Avg {formatDays(disposition.avgHoldDaysWinners)} · Median {formatDays(disposition.medianHoldDaysWinners)}
				</span>
			</div>
			<div class="h-8 w-full rounded-lg bg-slate-100">
				<div
					class="flex h-full items-center rounded-lg bg-profit/20 px-3 text-xs font-medium text-profit"
					style="width: {Math.max(winnerWidth, 8)}%"
				>
					{formatDays(disposition.avgHoldDaysWinners)}
				</div>
			</div>
		</div>

		<!-- Losers bar -->
		<div>
			<div class="mb-1 flex items-center justify-between text-sm">
				<span class="font-medium text-slate-700">
					Losers ({disposition.losersCount})
				</span>
				<span class="text-slate-500">
					Avg {formatDays(disposition.avgHoldDaysLosers)} · Median {formatDays(disposition.medianHoldDaysLosers)}
				</span>
			</div>
			<div class="h-8 w-full rounded-lg bg-slate-100">
				<div
					class="flex h-full items-center rounded-lg bg-loss/20 px-3 text-xs font-medium text-loss"
					style="width: {Math.max(loserWidth, 8)}%"
				>
					{formatDays(disposition.avgHoldDaysLosers)}
				</div>
			</div>
		</div>
	</div>

	{#if disposition.prematureSells.length > 0}
		<div class="mt-6 border-t border-slate-100 pt-4">
			<h3 class="mb-2 text-sm font-medium text-slate-700">
				Premature Sells ({disposition.prematureSells.length})
			</h3>
			<p class="mb-3 text-xs text-slate-500">
				Winners sold within 7 days with &gt;5% gain — potential missed upside.
			</p>
			<div class="space-y-1.5">
				{#each disposition.prematureSells.slice(0, 5) as sell}
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-600">{sell.instrument}</span>
						<span class="text-slate-400">
							{formatPercent(sell.profitPercent)} in {formatDays(sell.holdDays)}
						</span>
					</div>
				{/each}
				{#if disposition.prematureSells.length > 5}
					<p class="text-xs text-slate-400">
						+{disposition.prematureSells.length - 5} more
					</p>
				{/if}
			</div>
		</div>
	{/if}
</Card>
