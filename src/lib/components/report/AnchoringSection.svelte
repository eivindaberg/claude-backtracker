<script lang="ts">
	import type { AnchoringReport } from '$lib/types';
	import { Card, Badge } from '$lib/components/ui';

	interface Props {
		anchoring: AnchoringReport;
	}

	let { anchoring }: Props = $props();

	const severityVariant = {
		none: 'profit' as const,
		mild: 'warning' as const,
		strong: 'loss' as const
	};

	const severityLabel = {
		none: 'No anchoring detected',
		mild: 'Mild anchoring bias',
		strong: 'Strong anchoring bias'
	};
</script>

<Card>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-slate-900">Break-Even Anchoring</h2>
		<Badge variant={severityVariant[anchoring.severity]}>
			{severityLabel[anchoring.severity]}
		</Badge>
	</div>
	<p class="mb-4 text-sm text-slate-500">
		Do you sell near your purchase price just to "get your money back"?
	</p>

	<div class="mb-6 grid grid-cols-3 gap-4">
		<div class="rounded-lg bg-slate-50 p-4 text-center">
			<div class="text-2xl font-bold text-slate-900">{anchoring.sellsNearBreakEven}</div>
			<div class="mt-1 text-xs text-slate-500">Sells near break-even</div>
		</div>
		<div class="rounded-lg bg-slate-50 p-4 text-center">
			<div class="text-2xl font-bold {anchoring.pctNearBreakEven > 15 ? 'text-loss' : 'text-slate-900'}">{anchoring.pctNearBreakEven.toFixed(0)}%</div>
			<div class="mt-1 text-xs text-slate-500">of all sells within ±3%</div>
		</div>
		<div class="rounded-lg bg-slate-50 p-4 text-center">
			<div class="text-2xl font-bold text-slate-400">~8%</div>
			<div class="mt-1 text-xs text-slate-500">Expected by chance</div>
		</div>
	</div>

	{#if anchoring.examples.length > 0}
		<h3 class="mb-2 text-sm font-semibold text-slate-700">Examples</h3>
		<p class="mb-3 text-xs text-slate-400">Sells closest to break-even, sorted by how long you held waiting</p>
		<div class="space-y-2">
			{#each anchoring.examples as ex}
				<div class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
					<span class="font-medium text-slate-900">{ex.instrument}</span>
					<div class="flex items-center gap-3 text-xs">
						<span class="text-slate-400">held {ex.holdDays} days</span>
						<span class="font-mono {ex.pctFromBreakEven >= 0 ? 'text-profit' : 'text-loss'}">
							{ex.pctFromBreakEven >= 0 ? '+' : ''}{ex.pctFromBreakEven.toFixed(1)}%
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
