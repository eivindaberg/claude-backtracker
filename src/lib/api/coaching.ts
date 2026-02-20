import type {
	AnalysisReport,
	EntryTimingReport,
	PostSellReport,
	AveragingDownReport,
	AnchoringReport,
	ConvictionVerdict,
	CoachingResponse
} from '$lib/types';
import { anonymize } from './anonymizer';

export async function fetchCoaching(
	report: AnalysisReport,
	entryTiming?: EntryTimingReport,
	postSell?: PostSellReport,
	averagingDown?: AveragingDownReport,
	anchoring?: AnchoringReport,
	conviction?: ConvictionVerdict
): Promise<CoachingResponse> {
	const stats = anonymize(report, entryTiming, postSell, averagingDown, anchoring, conviction);

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
