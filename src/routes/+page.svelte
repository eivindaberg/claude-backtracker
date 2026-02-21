<script lang="ts">
	import { toast } from 'svelte-sonner';
	import type {
		ParsedTrade,
		TickerMapping,
		ExtendedAnalysisReport,
		EntryTimingReport,
		PostSellReport,
		AveragingDownReport,
		AnchoringReport,
		ConvictionVerdict,
		CoachingResponse
	} from '$lib/types';
	import { analyzeAll } from '$lib/analysis/engine';
	import { generateTickerMappings, autoSearchTickers } from '$lib/mapping/ticker-mapper';
	import { fetchPriceData } from '$lib/api/prices';
	import { analyzeEntryTiming } from '$lib/analysis/entry-timing';
	import { analyzePostSell } from '$lib/analysis/post-sell';
	import { analyzeAveragingDown } from '$lib/analysis/averaging-down';
	import { analyzeAnchoring } from '$lib/analysis/anchoring';
	import { analyzeConviction } from '$lib/analysis/conviction';
	import { fetchCoaching } from '$lib/api/coaching';
	import { Button } from '$lib/components/ui';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import TickerMappingComponent from '$lib/components/TickerMapping.svelte';
	import SummaryCards from '$lib/components/report/SummaryCards.svelte';
	import DispositionSection from '$lib/components/report/DispositionSection.svelte';
	import TimingSection from '$lib/components/report/TimingSection.svelte';
	import SizingSection from '$lib/components/report/SizingSection.svelte';
	import PerStockSection from '$lib/components/report/PerStockSection.svelte';
	import PnlTimeline from '$lib/components/report/PnlTimeline.svelte';
	import TradeListTable from '$lib/components/report/TradeListTable.svelte';
	import CoachingPlaceholder from '$lib/components/report/CoachingPlaceholder.svelte';
	import EntryTimingSection from '$lib/components/report/EntryTimingSection.svelte';
	import PostSellSection from '$lib/components/report/PostSellSection.svelte';
	import AveragingDownSection from '$lib/components/report/AveragingDownSection.svelte';
	import AnchoringSection from '$lib/components/report/AnchoringSection.svelte';
	import CoachingSection from '$lib/components/report/CoachingSection.svelte';

	type PageView = 'upload' | 'mapping' | 'processing' | 'report';

	let view: PageView = $state('upload');
	let trades: ParsedTrade[] = $state([]);
	let tickerMappings: TickerMapping[] = $state([]);
	let report: ExtendedAnalysisReport | null = $state(null);
	let processingStep = $state('');
	let mappingLoading = $state(false);

	async function handleParsed(parsedTrades: ParsedTrade[]) {
		trades = parsedTrades;
		tickerMappings = generateTickerMappings(parsedTrades);
		view = 'mapping';

		// Auto-search for any unmapped tickers in background
		const pendingCount = tickerMappings.filter(
			(m) => m.status === 'pending' && !m.isNorwegianFund
		).length;
		if (pendingCount > 0) {
			mappingLoading = true;
			try {
				tickerMappings = await autoSearchTickers(tickerMappings);
			} catch {
				// Silent fail — user can still fill manually
			}
			mappingLoading = false;
		}
	}

	async function handleMappingConfirm(confirmed: TickerMapping[]) {
		tickerMappings = confirmed;
		view = 'processing';

		try {
			// Step 1: Run base analysis (synchronous, client-side)
			processingStep = 'Analyzing trades...';
			await tick();
			const baseReport = analyzeAll(trades);

			// Behavioral analyses (client-side, no price data needed)
			const averagingDown = analyzeAveragingDown(trades, baseReport.roundTrips);
			const anchoring = analyzeAnchoring(baseReport.roundTrips);
			const conviction = analyzeConviction(baseReport.roundTrips);

			// Step 2: Fetch price data from Yahoo Finance
			processingStep = 'Fetching market data...';
			await tick();
			let entryTiming: EntryTimingReport | undefined;
			let postSell: PostSellReport | undefined;

			try {
				const priceMap = await fetchPriceData(tickerMappings, trades);

				if (priceMap.size > 0) {
					// Step 3: Entry timing analysis
					processingStep = 'Analyzing entry timing...';
					await tick();
					entryTiming = analyzeEntryTiming(trades, priceMap);

					// Step 4: Post-sell analysis
					processingStep = 'Analyzing post-sell performance...';
					await tick();
					postSell = analyzePostSell(baseReport.roundTrips, priceMap);
				}
			} catch (err) {
				console.error('Price data fetch failed, continuing without:', err);
				toast.error('Could not fetch market data — showing analysis without price context');
			}

			// Step 5: Generate coaching via Claude API
			processingStep = 'Generating AI coaching...';
			await tick();
			let coaching: CoachingResponse | undefined;

			try {
				coaching = await fetchCoaching(baseReport, entryTiming, postSell, averagingDown, anchoring, conviction);
			} catch (err) {
				console.error('Coaching generation failed:', err);
				toast.error('AI coaching unavailable — showing analysis without coaching');
			}

			report = {
				...baseReport,
				entryTiming,
				postSell,
				averagingDown,
				anchoring,
				conviction,
				coaching
			};

			view = 'report';
			toast.success(
				`Analysis complete: ${report.roundTrips.length} round-trips, ${report.openPositions.length} open positions`
			);
		} catch (err) {
			console.error('Analysis failed:', err);
			toast.error(err instanceof Error ? err.message : 'Analysis failed');
			view = 'upload';
		}
	}

	function reset() {
		view = 'upload';
		trades = [];
		tickerMappings = [];
		report = null;
		processingStep = '';
	}

	// Helper to yield to the event loop for UI updates
	function tick(): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, 50));
	}
</script>

<svelte:head>
	<title>Backtracker — Trade Analysis</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-12">
	{#if view === 'upload'}
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-slate-900">Backtracker</h1>
			<p class="mt-2 text-slate-500">
				Upload your Nordnet CSV to analyze your trading behavior and identify patterns.
			</p>
		</div>
		<FileUpload onParsed={handleParsed} />
	{:else if view === 'mapping'}
		<TickerMappingComponent mappings={tickerMappings} loading={mappingLoading} onConfirm={handleMappingConfirm} />
	{:else if view === 'processing'}
		<div class="flex flex-col items-center justify-center py-24">
			<div
				class="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand"
			></div>
			<p class="mt-4 text-sm font-medium text-slate-700">{processingStep}</p>
			<div class="mt-6 w-64 space-y-2">
				{#each ['Analyzing trades...', 'Fetching market data...', 'Analyzing entry timing...', 'Analyzing post-sell performance...', 'Generating AI coaching...'] as step}
					{@const isDone = ['Analyzing trades...', 'Fetching market data...', 'Analyzing entry timing...', 'Analyzing post-sell performance...', 'Generating AI coaching...'].indexOf(step) < ['Analyzing trades...', 'Fetching market data...', 'Analyzing entry timing...', 'Analyzing post-sell performance...', 'Generating AI coaching...'].indexOf(processingStep)}
					{@const isCurrent = step === processingStep}
					<div class="flex items-center gap-2 text-xs {isCurrent ? 'text-brand font-medium' : isDone ? 'text-profit' : 'text-slate-300'}">
						{#if isDone}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{:else if isCurrent}
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand"></div>
						{:else}
							<div class="h-4 w-4 rounded-full border-2 border-slate-200"></div>
						{/if}
						{step.replace('...', '')}
					</div>
				{/each}
			</div>
		</div>
	{:else if view === 'report' && report}
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-slate-900">Backtracker</h1>
				<p class="mt-1 text-sm text-slate-500">
					{report.summary.totalTrades} trades · {report.summary.uniqueInstruments} instruments
					· {report.summary.firstTradeDate.toLocaleDateString('en-US', {
						month: 'short',
						year: 'numeric'
					})} to {report.summary.lastTradeDate.toLocaleDateString('en-US', {
						month: 'short',
						year: 'numeric'
					})}
				</p>
			</div>
			<Button variant="outline" onclick={reset}>Upload different file</Button>
		</div>

		<div class="space-y-6">
			<SummaryCards summary={report.summary} />
			<PnlTimeline roundTrips={report.roundTrips} />

			<div class="grid gap-6 lg:grid-cols-2">
				<DispositionSection disposition={report.disposition} />
				<TimingSection timing={report.timing} />
			</div>

			<SizingSection sizing={report.sizing} conviction={report.conviction} />

			{#if report.entryTiming}
				<div class="grid gap-6 lg:grid-cols-2">
					<EntryTimingSection entryTiming={report.entryTiming} />
					{#if report.postSell}
						<PostSellSection postSell={report.postSell} />
					{/if}
				</div>
			{:else if report.postSell}
				<PostSellSection postSell={report.postSell} />
			{/if}

			{#if report.averagingDown && report.averagingDown.totalInstances > 0}
				<div class="grid gap-6 lg:grid-cols-2">
					<AveragingDownSection averagingDown={report.averagingDown} />
					{#if report.anchoring}
						<AnchoringSection anchoring={report.anchoring} />
					{/if}
				</div>
			{:else if report.anchoring}
				<AnchoringSection anchoring={report.anchoring} />
			{/if}

			<PerStockSection perStock={report.perStock} excludeIsins={tickerMappings.filter(m => m.isNorwegianFund).map(m => m.isin)} />
			<TradeListTable roundTrips={report.roundTrips} />

			{#if report.coaching}
				<CoachingSection coaching={report.coaching} />
			{:else}
				<CoachingPlaceholder />
			{/if}
		</div>
	{/if}
</main>
