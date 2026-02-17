<script lang="ts">
	import { Card } from '$lib/components/ui';
</script>

<Card class="border-dashed border-slate-300 bg-slate-50/50">
	<div class="flex flex-col items-center py-6 text-center">
		<svg class="mb-3 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
			/>
		</svg>
		<h2 class="text-lg font-semibold text-slate-600">AI Coaching & Rulebook</h2>
		<p class="mt-2 max-w-md text-sm text-slate-400">
			AI coaching is unavailable. Set the ANTHROPIC_API_KEY environment variable to enable
			Claude-generated coaching narratives and personalized trading rules.
		</p>
	</div>
</Card>
