<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import { formatCurrency, formatPercent, formatDays, formatNumber } from '$lib/utils';
	import type { PerStockAnalysis } from '$lib/types';

	let { perStock, excludeIsins = [] }: { perStock: PerStockAnalysis[]; excludeIsins?: string[] } = $props();

	let excludeSet = $derived(new Set(excludeIsins));
	let filtered = $derived(perStock.filter((s) => !excludeSet.has(s.isin)));

	// Blacklist: stocks with 2+ losing round trips AND net negative P&L
	let blacklist = $derived(
		filtered
			.filter((s) => s.losses >= 2 && s.totalProfitNOK < 0)
			.sort((a, b) => a.totalProfitNOK - b.totalProfitNOK)
	);

	type SortKey = 'roundTrips' | 'totalProfitNOK' | 'winRate' | 'avgHoldDays';
	let sortKey: SortKey = $state('roundTrips');
	let sortAsc = $state(false);

	let sorted = $derived(() => {
		const data = [...filtered];
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

{#if blacklist.length > 0}
	<Card class="border-red-200 bg-red-50/30">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900">Blacklist</h2>
			<Badge variant="loss">{blacklist.length} stocks</Badge>
		</div>
		<p class="mb-4 text-sm text-slate-500">
			Stocks where you've lost money on 2 or more separate round trips. You've proven you can't read these correctly.
		</p>
		<div class="space-y-2">
			{#each blacklist as stock}
				<div class="flex items-center justify-between rounded-lg border border-red-100 bg-white px-3 py-2">
					<div>
						<span class="font-medium text-slate-900">{stock.instrument}</span>
						<span class="ml-2 text-xs text-slate-400">
							{stock.losses} losses out of {stock.roundTrips} trades
						</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-sm font-medium text-loss">{formatCurrency(stock.totalProfitNOK)}</span>
						<span class="text-xs text-slate-400">{formatNumber(stock.winRate, 0)}% win rate</span>
					</div>
				</div>
			{/each}
		</div>
	</Card>
{/if}

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
