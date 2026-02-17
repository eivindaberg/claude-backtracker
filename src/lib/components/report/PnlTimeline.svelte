<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { formatCurrency } from '$lib/utils';
	import type { RoundTrip } from '$lib/types';

	let { roundTrips }: { roundTrips: RoundTrip[] } = $props();

	// SVG dimensions
	const W = 800;
	const H = 250;
	const PAD = { top: 20, right: 20, bottom: 30, left: 70 };
	const chartW = W - PAD.left - PAD.right;
	const chartH = H - PAD.top - PAD.bottom;
	const yTicks = 5;

	let chartData = $derived.by(() => {
		const sorted = [...roundTrips].sort(
			(a, b) => a.sellDate.getTime() - b.sellDate.getTime()
		);

		const cumulative: { date: Date; value: number }[] = [];
		let running = 0;
		for (const rt of sorted) {
			running += rt.profitNOK;
			cumulative.push({ date: rt.sellDate, value: running });
		}

		if (cumulative.length === 0) return null;

		const minDate = cumulative[0].date.getTime();
		const maxDate = cumulative[cumulative.length - 1].date.getTime();
		const dateRange = maxDate - minDate || 1;

		const values = cumulative.map((p) => p.value);
		const minVal = Math.min(0, ...values);
		const maxVal = Math.max(0, ...values);
		const valRange = maxVal - minVal || 1;

		function xPos(date: Date): number {
			return PAD.left + ((date.getTime() - minDate) / dateRange) * chartW;
		}
		function yPos(value: number): number {
			return PAD.top + chartH - ((value - minVal) / valRange) * chartH;
		}

		const pathD = cumulative
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.date).toFixed(1)} ${yPos(p.value).toFixed(1)}`)
			.join(' ');

		const areaD = `${pathD} L ${xPos(cumulative[cumulative.length - 1].date).toFixed(1)} ${yPos(0).toFixed(1)} L ${xPos(cumulative[0].date).toFixed(1)} ${yPos(0).toFixed(1)} Z`;

		const zeroY = yPos(0);

		const yLabels: { value: number; y: number }[] = [];
		for (let i = 0; i <= yTicks; i++) {
			const val = minVal + (valRange * i) / yTicks;
			yLabels.push({ value: val, y: yPos(val) });
		}

		const xLabelCount = Math.min(6, cumulative.length);
		const xLabels: { label: string; x: number }[] = [];
		for (let i = 0; i < xLabelCount; i++) {
			const idx = Math.round((i / (xLabelCount - 1)) * (cumulative.length - 1));
			const pt = cumulative[idx];
			xLabels.push({
				label: pt.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
				x: xPos(pt.date)
			});
		}

		const finalValue = cumulative[cumulative.length - 1].value;
		const lineColor = finalValue >= 0 ? 'var(--color-profit)' : 'var(--color-loss)';
		const fillColor = finalValue >= 0 ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)';

		return { pathD, areaD, zeroY, yLabels, xLabels, lineColor, fillColor };
	});
</script>

<Card>
	<h2 class="mb-4 text-lg font-semibold text-slate-900">Cumulative P&L</h2>

	{#if !chartData}
		<p class="py-8 text-center text-sm text-slate-400">No completed trades to chart.</p>
	{:else}
		<svg viewBox="0 0 {W} {H}" class="w-full" preserveAspectRatio="xMidYMid meet">
			{#each chartData.yLabels as tick}
				<line
					x1={PAD.left}
					y1={tick.y}
					x2={W - PAD.right}
					y2={tick.y}
					stroke="#e2e8f0"
					stroke-width="1"
				/>
				<text x={PAD.left - 8} y={tick.y + 4} text-anchor="end" fill="#94a3b8" font-size="11">
					{formatCurrency(tick.value)}
				</text>
			{/each}

			<line
				x1={PAD.left}
				y1={chartData.zeroY}
				x2={W - PAD.right}
				y2={chartData.zeroY}
				stroke="#94a3b8"
				stroke-width="1"
				stroke-dasharray="4,4"
			/>

			<path d={chartData.areaD} fill={chartData.fillColor} />
			<path d={chartData.pathD} fill="none" stroke={chartData.lineColor} stroke-width="2" />

			{#each chartData.xLabels as label}
				<text x={label.x} y={H - 5} text-anchor="middle" fill="#94a3b8" font-size="11">
					{label.label}
				</text>
			{/each}
		</svg>
	{/if}
</Card>
