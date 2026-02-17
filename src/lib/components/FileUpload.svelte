<script lang="ts">
	import { parseNordnetCSV } from '$lib/parser/nordnet';
	import type { ParsedTrade } from '$lib/types';
	import { toast } from 'svelte-sonner';

	interface Props {
		onParsed: (trades: ParsedTrade[]) => void;
	}

	let { onParsed }: Props = $props();
	let dragging = $state(false);
	let parsing = $state(false);

	async function handleFile(file: File) {
		if (!file.name.endsWith('.csv')) {
			toast.error('Please upload a CSV file');
			return;
		}

		parsing = true;
		try {
			const trades = await parseNordnetCSV(file);
			if (trades.length === 0) {
				toast.error('No trades found in file');
				return;
			}

			const buys = trades.filter((t) => t.type === 'buy').length;
			const sells = trades.filter((t) => t.type === 'sell').length;
			toast.success(`Parsed ${trades.length} trades (${buys} buys, ${sells} sells)`);
			onParsed(trades);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to parse CSV');
		} finally {
			parsing = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) handleFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function handleDragLeave() {
		dragging = false;
	}

	function handleInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
	}
</script>

<div
	role="button"
	tabindex="0"
	class="relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors
		{dragging ? 'border-brand bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'}"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	onclick={() => document.getElementById('file-input')?.click()}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-input')?.click();
	}}
>
	<input
		id="file-input"
		type="file"
		accept=".csv"
		class="hidden"
		onchange={handleInputChange}
	/>

	{#if parsing}
		<div class="flex flex-col items-center gap-3">
			<div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand"></div>
			<p class="text-sm text-slate-500">Parsing trades...</p>
		</div>
	{:else}
		<svg
			class="mb-4 h-12 w-12 text-slate-400"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
			/>
		</svg>
		<p class="text-lg font-medium text-slate-700">Drop your Nordnet CSV here</p>
		<p class="mt-1 text-sm text-slate-500">
			or click to browse. Export from Nordnet → Transaksjoner og notater.
		</p>
	{/if}
</div>
