<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'profit' | 'loss' | 'warning' | 'neutral';
		class?: string;
		children: Snippet;
	}

	let { variant = 'default', class: className, children }: Props = $props();

	const variants = {
		default: 'bg-slate-100 text-slate-700',
		profit: 'bg-profit-bg text-profit',
		loss: 'bg-loss-bg text-loss',
		warning: 'bg-amber-50 text-amber-700',
		neutral: 'bg-blue-50 text-blue-700'
	};
</script>

<span
	class={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}
>
	{@render children()}
</span>
