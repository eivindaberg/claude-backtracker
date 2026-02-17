import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

const SYSTEM_PROMPT = `You are an elite trading coach who analyzes behavioral patterns in stock trading. You receive anonymized aggregate statistics about a trader's behavior — never individual trade details, stock names, or dates.

Your job:
1. Identify the most significant behavioral weaknesses from the stats
2. Write a coaching narrative (2-3 paragraphs) explaining the patterns you see and why they matter
3. Generate 5-8 concrete, numbered trading rules with specific thresholds

Be direct, specific, and data-driven. Reference the actual numbers provided. Write like a coach who cares but doesn't sugarcoat.

Respond with valid JSON only (no markdown fencing):
{
  "narrative": "Your coaching narrative here...",
  "rules": [
    {
      "number": 1,
      "title": "Short rule name",
      "description": "Detailed rule explanation",
      "evidence": "The specific stat that supports this rule"
    }
  ]
}`;

export const POST: RequestHandler = async ({ request }) => {
	if (!env.ANTHROPIC_API_KEY) {
		return json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
	}

	const stats = await request.json();

	const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

	try {
		const message = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 2000,
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Here are the anonymized trading statistics for analysis:\n\n${JSON.stringify(stats, null, 2)}`
				}
			]
		});

		let text =
			message.content[0].type === 'text' ? message.content[0].text : '';

		// Strip markdown code fencing if present
		text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

		const coaching = JSON.parse(text);

		return json(coaching);
	} catch (err) {
		console.error('Claude API error:', err);
		return json({ error: 'Failed to generate coaching analysis' }, { status: 500 });
	}
};
