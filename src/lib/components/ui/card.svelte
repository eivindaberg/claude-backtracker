<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<div class={cn('rounded-xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
	{@render children()}
</div>
