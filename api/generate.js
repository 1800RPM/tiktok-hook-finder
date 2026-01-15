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

    const { topic, archetype = 'The Warning / Signs' } = req.body;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });

    // Load trends if available
    let trends = null;
    try {
        const trendsPath = path.join(process.cwd(), 'data', 'trends_snapshot.json');
        trends = JSON.parse(readFileSync(trendsPath, 'utf8'));
    } catch (e) {
        console.warn('Trends snapshot not found, using generic style.');
    }


    // Get some examples for few-shot learning
    const examples = hooks
        .filter(h => h.archetype === archetype)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    try {
        // Fetch TOP 5 examples for the prompt (Note: in serverless we use the static JSON)
        const archetypeExamples = hooks
            .filter(h => h.archetype === (archetype || "The Warning / Signs"))
            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 5);

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
                    content: `You are a viral TikTok Content Architect. Your content is visceral, high-stakes, and specialized in creating "Curiosity Gaps" that stop the scroll instantly.
                                    
          TASK: Generate 3 VIRAL SLIDESHOW HOOKS for the topic: "${topic}"
          ARCHETYPE: ${archetype || "The Warning / Signs"}
          
          CRITICAL RULES (STRICT):
          - ONE SENTENCE ONLY.
          - MAX 12 WORDS.
          - DO NOT summarize or describe (AVOID: "an unfiltered look...", "why i...").
          - CREATE A CURIOSITY GAP (e.g. "The truth your therapist won't say", "i finally realized the real reason i split").
          - USE FIRST PERSON (I, my, me) or direct callouts.
          - NO EMOJIS / NO HASHTAGS.
          
          DNA TRENDS: ${trends?.slang?.slice(0, 5).join(', ') || 'hard truth, realization'}
          AESTHETIC: ${trends?.formatting_rules?.slice(0, 2).join(', ') || 'single sentence, intrigue'}
          
          INSPIRATION (Top Viral DNA):
          ${archetypeExamples.map(e => `- ${e.hook_text}`).join('\n')}
          
          Output format: JSON array of strings only. No other text.`
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

