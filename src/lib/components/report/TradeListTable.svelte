<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { formatCurrency, formatPercent, formatDays } from '$lib/utils';
	import type { RoundTrip } from '$lib/types';

	let { roundTrips }: { roundTrips: RoundTrip[] } = $props();

	type SortKey = 'sellDate' | 'profitNOK' | 'profitPercent' | 'holdDays' | 'buyAmountNOK';
	let sortKey: SortKey = $state('sellDate');
	let sortAsc = $state(false);

	let sorted = $derived(() => {
		const data = [...roundTrips];
		data.sort((a, b) => {
			let diff: number;
			if (sortKey === 'sellDate') {
				diff = a.sellDate.getTime() - b.sellDate.getTime();
			} else {
				diff = a[sortKey] - b[sortKey];
			}
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

	function sortIndicator(key: SortKey): string {
		if (sortKey !== key) return '';
		return sortAsc ? ' \u2191' : ' \u2193';
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	let showAll = $state(false);
	const INITIAL_COUNT = 20;
	let visibleTrades = $derived(() => {
		const data = sorted();
		return showAll ? data : data.slice(0, INITIAL_COUNT);
	});
</script>

<Card>
	<h2 class="mb-4 text-lg font-semibold text-slate-900">
		All Trades ({roundTrips.length})
	</h2>

	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-slate-200 text-left">
					<th class="pb-2 pr-3 font-medium text-slate-500">Instrument</th>
					<th class="pb-2 pr-3 font-medium text-slate-500">Buy Date</th>
					<th class="cursor-pointer pb-2 pr-3 font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('sellDate')}>
						Sell Date{sortIndicator('sellDate')}
					</th>
					<th class="cursor-pointer pb-2 pr-3 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('buyAmountNOK')}>
						Size{sortIndicator('buyAmountNOK')}
					</th>
					<th class="cursor-pointer pb-2 pr-3 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('profitNOK')}>
						P&L{sortIndicator('profitNOK')}
					</th>
					<th class="cursor-pointer pb-2 pr-3 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('profitPercent')}>
						Return{sortIndicator('profitPercent')}
					</th>
					<th class="cursor-pointer pb-2 text-right font-medium text-slate-500 hover:text-slate-700"
						onclick={() => toggleSort('holdDays')}>
						Hold{sortIndicator('holdDays')}
					</th>
				</tr>
			</thead>
			<tbody>
				{#each visibleTrades() as trade}
					<tr class="border-b border-slate-50 hover:bg-slate-50/50">
						<td class="py-2 pr-3 font-medium text-slate-700">{trade.instrument}</td>
						<td class="py-2 pr-3 text-slate-500">{formatDate(trade.buyDate)}</td>
						<td class="py-2 pr-3 text-slate-500">{formatDate(trade.sellDate)}</td>
						<td class="py-2 pr-3 text-right text-slate-500">
							{formatCurrency(trade.buyAmountNOK)}
						</td>
						<td
							class="py-2 pr-3 text-right font-medium {trade.profitNOK >= 0
								? 'text-profit'
								: 'text-loss'}"
						>
							{formatCurrency(trade.profitNOK)}
						</td>
						<td
							class="py-2 pr-3 text-right {trade.profitPercent >= 0
								? 'text-profit'
								: 'text-loss'}"
						>
							{formatPercent(trade.profitPercent)}
						</td>
						<td class="py-2 text-right text-slate-500">{formatDays(trade.holdDays)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if !showAll && roundTrips.length > INITIAL_COUNT}
		<button
			class="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
			onclick={() => (showAll = true)}
		>
			Show all {roundTrips.length} trades
		</button>
	{/if}
</Card>
