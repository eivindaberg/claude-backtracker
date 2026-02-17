import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

interface PriceRequest {
	ticker: string;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
}

interface PriceResult {
	ticker: string;
	prices: { date: string; close: number }[];
}

const BATCH_SIZE = 5;
const DELAY_MS = 300;

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOne(
	ticker: string,
	startDate: string,
	endDate: string
): Promise<PriceResult> {
	try {
		const data = await yf.historical(ticker, {
			period1: startDate,
			period2: endDate,
			interval: '1d'
		});

		const rows = data as Array<Record<string, unknown>>;
		const prices = rows.map((d) => ({
			date:
				d.date instanceof Date
					? d.date.toISOString().split('T')[0]
					: new Date(d.date as string).toISOString().split('T')[0],
			close: (d.close as number) ?? (d.adjClose as number) ?? 0
		}));

		return { ticker, prices };
	} catch {
		console.warn(`Skipping ${ticker}: no data available`);
		return { ticker, prices: [] };
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const { requests } = (await request.json()) as { requests: PriceRequest[] };

	if (!requests || !Array.isArray(requests)) {
		return json({ error: 'Missing requests array' }, { status: 400 });
	}

	// Process in batches to avoid Yahoo Finance rate limits
	const results: PriceResult[] = [];

	for (let i = 0; i < requests.length; i += BATCH_SIZE) {
		const batch = requests.slice(i, i + BATCH_SIZE);
		const batchResults = await Promise.all(
			batch.map(({ ticker, startDate, endDate }) => fetchOne(ticker, startDate, endDate))
		);
		results.push(...batchResults);

		// Delay between batches (skip after last batch)
		if (i + BATCH_SIZE < requests.length) {
			await delay(DELAY_MS);
		}
	}

	return json({ results });
};
