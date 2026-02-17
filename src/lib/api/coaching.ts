import type {
	AnalysisReport,
	EntryTimingReport,
	PostSellReport,
	CoachingResponse
} from '$lib/types';
import { anonymize } from './anonymizer';

export async function fetchCoaching(
	report: AnalysisReport,
	entryTiming?: EntryTimingReport,
	postSell?: PostSellReport
): Promise<CoachingResponse> {
	const stats = anonymize(report, entryTiming, postSell);

	const response = await fetch('/api/analyze', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(stats)
	});

	if (!response.ok) {
		throw new Error('Failed to fetch coaching analysis');
	}

	return response.json();
}
