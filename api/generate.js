import { readFileSync } from 'fs';
import path from 'path';

// Fix for Vercel serverless functions with ESM
const hooksPath = path.join(process.cwd(), 'api', 'viral_hooks.json');
const hooks = JSON.parse(readFileSync(hooksPath, 'utf8'));

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topic, archetype = 'The Warning / Signs', slides, framework_type, topic_hint } = req.body;

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!topic && (!slides || slides.length === 0)) {
        return res.status(400).json({ error: 'Topic or Slides required' });
    }
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });

    // Load trends if available
    let trends = null;
    try {
        const trendsPath = path.join(process.cwd(), 'server', 'data', 'trends_snapshot.json');
        trends = JSON.parse(readFileSync(trendsPath, 'utf8'));
    } catch (e) {
        console.warn('Trends snapshot not found, using generic style.');
    }


    // Fetch TOP 5 examples for the prompt (Note: in serverless we use the static JSON)
    const archetypeExamples = hooks
        .filter(h => h.archetype === (archetype || "The Warning / Signs"))
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5);

    try {
        console.log(`Generating high-stakes hooks for topic: ${topic}`);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: `You are a viral TikTok Content Architect specializing in "Curiosity Gaps."

${slides && slides.length > 0 ? `
## TOPIC/CONTEXT:
${topic_hint ? `The current hook/topic is: "${topic_hint}"` : topic ? `Topic: "${topic}"` : 'Infer the topic from the slides below.'}

## SLIDE BODY CONTENT (Slides 2-6):
${slides.map((s, i) => `Slide ${i + 2}: ${typeof s === 'string' ? s : s.text}`).join('\n')}

## YOUR TASK:
Generate 3 VIRAL HOOKS (for Slide 1) that "open the loop" for the story above.
The hook MUST directly reference or tease the core themes in these slides.
DO NOT generate generic hooks. The hook should feel like it was written FOR these slides.
` : `
## YOUR TASK:
Generate 3 VIRAL HOOKS for the topic: "${topic}"
`}


## HOOK STYLE: ${framework_type || 'Choose the best fit'}
- Forbidden Knowledge: Authority-challenging, "secrets" (e.g. "The truth your therapist won't say").
- Specific Number: List-based IF the slides have a list structure (e.g. "3 BPD truths I learned").
- Pattern Interrupt: Reframes, confrontational (e.g. "You're not sensitive. You're under-regulated.").
- Transformation: Before/After (e.g. "6 months ago vs now").

## CRITICAL RULES:
- ONE SENTENCE ONLY. MAX 12 WORDS.
- DO NOT describe (AVOID: "an unfiltered look...").
- MUST reference the content/themes from the slides if provided.
- NO EMOJIS / NO HASHTAGS.

Output format: JSON array of 3 strings only. No other text.`

                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Anthropic API Error:', errorData);
            return res.status(response.status).json({
                error: 'AI Generation failed',
                details: errorData.error?.message || response.statusText
            });
        }

        const data = await response.json();

        if (!data.content || !data.content[0] || !data.content[0].text) {
            console.error('Unexpected response format from Anthropic:', data);
            throw new Error('Unexpected response format from AI');
        }

        const resultText = data.content[0].text;
        res.status(200).json({ hooks: JSON.parse(resultText) });
    } catch (error) {
        console.error('Generation handler error:', error);
        res.status(500).json({ error: 'Generation failed', details: error.message });
    }
}

