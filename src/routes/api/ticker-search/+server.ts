import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

interface SearchRequest {
	instrument: string;
	isin: string;
}

const BATCH_SIZE = 3;
const DELAY_MS = 400;

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchOne(instrument: string, isin: string): Promise<{ isin: string; ticker: string }> {
	// Try ISIN first (most reliable)
	try {
		const result = await yf.search(isin, { quotesCount: 1, newsCount: 0 });
		if (result.quotes && result.quotes.length > 0) {
			const quote = result.quotes[0] as Record<string, unknown>;
			const symbol = quote.symbol as string;
			if (symbol) return { isin, ticker: symbol };
		}
	} catch {
		// ISIN search failed, try name
	}

	// Try instrument name
	try {
		const result = await yf.search(instrument, { quotesCount: 3, newsCount: 0 });
		if (result.quotes && result.quotes.length > 0) {
			const quote = result.quotes[0] as Record<string, unknown>;
			const symbol = quote.symbol as string;
			if (symbol) return { isin, ticker: symbol };
		}
	} catch {
		// Name search also failed
	}

	return { isin, ticker: '' };
}

export const POST: RequestHandler = async ({ request }) => {
	const { requests } = (await request.json()) as { requests: SearchRequest[] };

	if (!requests || !Array.isArray(requests)) {
		return json({ error: 'Missing requests array' }, { status: 400 });
	}

	const results: { isin: string; ticker: string }[] = [];

	for (let i = 0; i < requests.length; i += BATCH_SIZE) {
		const batch = requests.slice(i, i + BATCH_SIZE);
		const batchResults = await Promise.all(
			batch.map(({ instrument, isin }) => searchOne(instrument, isin))
		);
		results.push(...batchResults);

		if (i + BATCH_SIZE < requests.length) {
			await delay(DELAY_MS);
		}
	}

	return json({ results });
};
