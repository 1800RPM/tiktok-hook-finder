import { readFileSync } from 'fs';
import path from 'path';

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

    const { slides_text } = req.body;

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!slides_text || slides_text.trim().length === 0) {
        return res.status(400).json({ error: 'slides_text is required' });
    }
    if (!ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    }

    try {
        const slidesArray = slides_text.split(/Slide \d+:/i).map(s => s.trim()).filter(Boolean);

        // Extract Draft Hook and remaining context
        const draftHook = slidesArray.length > 0 ? slidesArray[0] : "";
        const slides_context = slidesArray.length > 1
            ? slidesArray.slice(1).map((s, i) => `Slide ${i + 2}: ${s}`).join("\n")
            : slides_text;

        const systemPrompt = `You are a viral TikTok hook writer for the BPD/DBT mental health niche. Your job is to write scroll-stopping slide 1 hooks.

## THE GOLDEN RULE (Mystery Gap)
Slide 1 is the HOOK (The "Wait, what?").
Slide 2 is the ESCALATION (The "Because" / The Trigger).

CRITICAL: Slide 1 MUST NOT reveal the trigger from Slide 2. It must show a visceral action or strange situation that forces a swipe to find out "Why?".

## THE NO-SPOILER RULE
If Slide 2 mentions "punctuation", Slide 1 MUST NOT mention "punctuation".
If Slide 2 mentions "a delayed text", Slide 1 MUST NOT mention "a delayed text".
If Slide 1 explains the reason, you have FAILED.

## HOOK FORMULAS:
1. **The Action Hook**: "[Person] is [specific dramatic action] rn"
2. **The Flip Hook**: "[Person] just went from [extreme A] to [extreme B]"
3. **The Real-Time Hook**: "watching [person] [dramatic verb] in real time"
4. **The Contradiction Hook**: "[Normal thing] + [BPD twist]" 

## YOUR TASK
I will give you the USER'S DRAFT for Slide 1 and the CONTEXT for Slides 2-6.
Write 3 BANGER hook options for Slide 1 that:
- Fix the mystery gap (make it more intriguing)
- Set up Slide 2 as the payoff/reveal
- Fit the BPD/DBT niche tone (self-aware, comedic, not clinical)

OUTPUT: Return ONLY a JSON array with exactly 3 different hook options. No markdown, no explanation.`;

        const userPrompt = `### USER'S DRAFT HOOK (Slide 1):
"${draftHook}"

### CONTEXT FOR SLIDES 2-6:
${slides_context}`;

        console.log("--- [Banger Hooks] AI REQUEST ---");
        console.log(`SYSTEM PROMPT:\n${systemPrompt}`);
        console.log(`USER PROMPT:\n${userPrompt}`);
        console.log("---------------------------------");

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-opus-4-6',
                max_tokens: 500,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: userPrompt
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
        const resultText = data.content[0].text;

        console.log("--- [Banger Hooks] AI RESPONSE ---");
        console.log(resultText);
        console.log("----------------------------------");

        // Try to parse the JSON from the response
        let hooks;
        try {
            // Handle cases where AI might wrap in markdown code blocks
            const cleanText = resultText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
            hooks = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('Failed to parse hooks JSON:', resultText);
            throw new Error('Failed to parse AI response as JSON');
        }

        res.status(200).json({
            hooks,
            debug: {
                system_prompt: systemPrompt,
                user_prompt: userPrompt
            }
        });
    } catch (error) {
        console.error('Quick Hook Improver error:', error);
        res.status(500).json({ error: 'Generation failed', details: error.message });
    }
}
