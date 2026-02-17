<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import { formatCurrency, formatPercent, formatDays, formatNumber } from '$lib/utils';
	import type { PerStockAnalysis } from '$lib/types';

	let { perStock }: { perStock: PerStockAnalysis[] } = $props();

	type SortKey = 'roundTrips' | 'totalProfitNOK' | 'winRate' | 'avgHoldDays';
	let sortKey: SortKey = $state('roundTrips');
	let sortAsc = $state(false);

	let sorted = $derived(() => {
		const data = [...perStock];
		data.sort((a, b) => {
			const diff = a[sortKey] - b[sortKey];
			return sortAsc ? diff : -diff;
		});
		return data;
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = false;
		}
	}

	function patternVariant(pattern: string): 'profit' | 'loss' | 'warning' | 'neutral' | 'default' {
		if (pattern.includes('winner') || pattern === 'Reliable winner') return 'profit';
		if (pattern.includes('loser') || pattern === 'Consistent loser') return 'loss';
		if (pattern.includes('Overtraded') || pattern.includes('Quick flipper')) return 'warning';
		return 'default';
	}

	function sortIndicator(key: SortKey): string {
		if (sortKey !== key) return '';
		return sortAsc ? ' \u2191' : ' \u2193';
	}
</script>

<Card>
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Per-Stock Analysis</h2>

	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-slate-200 text-left">
					<th class="pb-2 pr-4 font-medium text-slate-500">Instrument</th>
					<th class="cursor-pointer pb-2 pr-4 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('roundTrips')}>
						Trades{sortIndicator('roundTrips')}
					</th>
					<th class="pb-2 pr-4 text-right font-medium text-slate-500">W/L</th>
					<th class="cursor-pointer pb-2 pr-4 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('winRate')}>
						Win%{sortIndicator('winRate')}
					</th>
					<th class="cursor-pointer pb-2 pr-4 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('totalProfitNOK')}>
						P&L{sortIndicator('totalProfitNOK')}
					</th>
					<th class="cursor-pointer pb-2 pr-4 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('avgHoldDays')}>
						Avg Hold{sortIndicator('avgHoldDays')}
					</th>
					<th class="pb-2 font-medium text-slate-500">Pattern</th>
				</tr>
			</thead>
			<tbody>
				{#each sorted() as stock}
					<tr class="border-b border-slate-50 hover:bg-slate-25">
						<td class="py-2 pr-4 font-medium text-slate-700">{stock.instrument}</td>
						<td class="py-2 pr-4 text-right text-slate-500">{stock.roundTrips}</td>
						<td class="py-2 pr-4 text-right text-slate-500">{stock.wins}/{stock.losses}</td>
						<td class="py-2 pr-4 text-right text-slate-500">
							{formatNumber(stock.winRate, 0)}%
						</td>
						<td
							class="py-2 pr-4 text-right font-medium {stock.totalProfitNOK >= 0
								? 'text-profit'
								: 'text-loss'}"
						>
							{formatCurrency(stock.totalProfitNOK)}
						</td>
						<td class="py-2 pr-4 text-right text-slate-500">
							{formatDays(stock.avgHoldDays)}
						</td>
						<td class="py-2">
							<Badge variant={patternVariant(stock.pattern)}>{stock.pattern}</Badge>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
