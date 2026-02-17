<script lang="ts">
	import type { TickerMapping } from '$lib/types';
	import { Card, Button, Badge } from '$lib/components/ui';

	interface Props {
		mappings: TickerMapping[];
		loading?: boolean;
		onConfirm: (mappings: TickerMapping[]) => void;
	}

	let { mappings, loading = false, onConfirm }: Props = $props();

	// Track user edits separately so auto-search results merge in without overwriting
	let userEdits = $state(new Map<string, { ticker: string; status: TickerMapping['status'] }>());

	let mergedMappings = $derived(
		mappings.map((m) => {
			const edit = userEdits.get(m.isin);
			return edit ? { ...m, ...edit } : m;
		})
	);

	// Lookup for the parent prop's ticker value (only changes on auto-search, not user edits)
	let propTickers = $derived(new Map(mappings.map((m) => [m.isin, m.ticker])));

	let stocks = $derived(mergedMappings.filter((m) => !m.isNorwegianFund));
	let funds = $derived(mergedMappings.filter((m) => m.isNorwegianFund));
	let pendingCount = $derived(stocks.filter((m) => m.status === 'pending').length);
	let canContinue = $derived(
		!loading && stocks.every((m) => m.status === 'confirmed' || m.status === 'skipped')
	);

	function updateTicker(isin: string, ticker: string) {
		const upper = ticker.toUpperCase();
		userEdits.set(isin, {
			ticker: upper,
			status: upper.trim() ? 'confirmed' : 'pending'
		});
		userEdits = new Map(userEdits);
	}

	function toggleSkip(isin: string) {
		const current = mergedMappings.find((m) => m.isin === isin);
		if (!current || current.isNorwegianFund) return;

		if (current.status === 'skipped') {
			userEdits.set(isin, {
				ticker: current.ticker,
				status: current.ticker ? 'confirmed' : 'pending'
			});
		} else {
			userEdits.set(isin, { ticker: current.ticker, status: 'skipped' });
		}
		userEdits = new Map(userEdits);
	}

	function skipAllPending() {
		for (const m of stocks) {
			if (m.status === 'pending') {
				userEdits.set(m.isin, { ticker: m.ticker, status: 'skipped' });
			}
		}
		userEdits = new Map(userEdits);
	}

	function handleContinue() {
		onConfirm(mergedMappings);
	}
</script>

<div class="mb-8 text-center">
	<h1 class="text-3xl font-bold text-slate-900">Confirm Ticker Mappings</h1>
	<p class="mt-2 text-slate-500">
		Verify Yahoo Finance tickers for your instruments. Skip any you don't want to include in price
		analysis.
	</p>
	{#if loading}
		<div class="mt-3 flex items-center justify-center gap-2 text-sm text-brand">
			<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand"></div>
			Looking up {pendingCount} unmapped ticker{pendingCount !== 1 ? 's' : ''} on Yahoo Finance...
		</div>
	{/if}
</div>

<Card>
	<div class="overflow-x-auto">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="border-b border-slate-200 text-xs font-medium tracking-wide text-slate-500 uppercase">
					<th class="pb-3 pr-4">Instrument</th>
					<th class="pb-3 pr-4">ISIN</th>
					<th class="pb-3 pr-4">Yahoo Finance Ticker</th>
					<th class="pb-3 text-right">Action</th>
				</tr>
			</thead>
			<tbody>
				{#each stocks as mapping (mapping.isin)}
					<tr class="border-b border-slate-100 last:border-0">
						<td class="py-2.5 pr-4 font-medium text-slate-900">{mapping.instrument}</td>
						<td class="py-2.5 pr-4 font-mono text-xs text-slate-400">{mapping.isin}</td>
						<td class="py-2.5 pr-4">
							{#if mapping.status === 'skipped'}
								<span class="text-slate-400 italic">Skipped</span>
							{:else}
								{#key propTickers.get(mapping.isin)}
									<input
										type="text"
										value={mapping.ticker}
										oninput={(e) => updateTicker(mapping.isin, e.currentTarget.value)}
										class="w-32 rounded-md border px-2.5 py-1 text-sm focus:border-brand focus:ring-1 focus:ring-brand/30 focus:outline-none {mapping.status === 'pending' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-300'}"
										placeholder="e.g. AAPL"
									/>
								{/key}
							{/if}
						</td>
						<td class="py-2.5 text-right">
							<button
								onclick={() => toggleSkip(mapping.isin)}
								class="text-xs font-medium {mapping.status === 'skipped'
									? 'text-brand hover:text-brand-light'
									: 'text-slate-400 hover:text-slate-600'} transition-colors"
							>
								{mapping.status === 'skipped' ? 'Include' : 'Skip'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>

{#if funds.length > 0}
	<Card class="mt-4 border-dashed border-slate-300 bg-slate-50/50">
		<div class="mb-3 flex items-center gap-2">
			<h3 class="text-sm font-semibold text-slate-600">Norwegian Funds</h3>
			<Badge>Auto-skipped</Badge>
		</div>
		<p class="mb-3 text-xs text-slate-400">
			These funds are not available on Yahoo Finance and are excluded from price-based analysis.
		</p>
		<div class="space-y-1">
			{#each funds as fund (fund.isin)}
				<div class="flex items-center justify-between text-sm text-slate-500">
					<span>{fund.instrument}</span>
					<span class="font-mono text-xs text-slate-300">{fund.isin}</span>
				</div>
			{/each}
		</div>
	</Card>
{/if}

<div class="mt-6 flex items-center justify-end gap-3">
	{#if pendingCount > 0 && !loading}
		<span class="text-xs text-amber-600">{pendingCount} ticker{pendingCount !== 1 ? 's' : ''} still need mapping or skipping</span>
		<button
			onclick={skipAllPending}
			class="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
		>
			Skip all unfound
		</button>
	{/if}
	<Button size="lg" disabled={!canContinue} onclick={handleContinue}>
		Continue to Analysis
	</Button>
</div>
