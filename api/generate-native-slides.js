import { Anthropic } from '@anthropic-ai/sdk';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { framing, theme } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    const anthropic = new Anthropic({ apiKey });

    // List of example Slide 1 hooks provided by user
    const viralTopics = [
        { topic: "FP Dynamics", struggles: ["texting anxiety", "fear of replacement", "obsessive thoughts", "needing constant reassurance"] },
        { topic: "Splitting", struggles: ["turning on a loved one over a 'tone' shift", "moving from soulmate to enemy", "splitting on yourself", "all-or-nothing thinking"] },
        { topic: "Abandonment Panic", struggles: ["pushing people away before they leave", "testing people to see if they'll stay", "panic when someone is 5 mins late", "analyzing words for signs of leaving"] },
        { topic: "Emotional Dysregulation", struggles: ["BPD rage out of nowhere", "feeling 'too much' for others", "emotional hangovers after outbursts", "rapid mood swings"] },
        { topic: "Empty/Identity Void", struggles: ["feeling like a 'void' when alone", "copying personalities to fit in", "not knowing your own values", "feeling invisible"] },
        { topic: "Quiet BPD", struggles: ["splitting inward/self-hatred", "masking high distress with a calm face", "dissociating when overwhelmed", "feeling like a burden for having needs"] },
        { topic: "Rejection Sensitivity", struggles: ["interpreting mid emojis as hatred", "physical sickness after minor criticism", "post-socializing spiral/over-analyzing", "perceiving slight shifts in energy"] },
        { topic: "Digital Self-Harm", struggles: ["checking blocks/old texts", "searching for things that trigger you", "comparing yourself to their new friends", "stalking ex-FPs"] }
    ];

    const service = req.body.service || 'dbt';

    try {
        if (service === 'syp') {
            // ... (SYP logic remains same)
            return res.status(200).json({
                slides: ["Slide 1: SYP Placeholder Hook", "Slide 2: Tip 1", "Slide 3: Tip 2", "Slide 4: Tip 3", "Slide 5: Tip 4", "Slide 6: Tip 5"]
            });
        }

        const response = await anthropic.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 1500,
            system: `You are an expert DBT/BPD psycho-educational content creator on TikTok. You speak as a supportive, slightly older 'bestie' who has been through the absolute trenches of BPD and finished DBT. Your vibe is supportive, validating, and helpful, but grounded in actual clinical DBT skills.

## CONTENT STRUCTURE
Each series consists of exactly 7 slides:
- **Max Words per Slide**: Each slide MUST be under 30 words for readability.
- **Slide 1 — The Hook:** MUST follow this format: "Weird DBT hacks from my therapist for [PROBLEM] (that ACTUALLY work)" or "Weird BPD hacks from my therapist for [PROBLEM] (that ACTUALLY work)". This slide ONLY contains the hook.
- **Slides 2-7 — The Valuable Tips:** 6 slides containing actionable, supportive DBT-based hacks or skills to help with the situation on Slide 1.

## STYLE GUIDELINES
- **Tone:** Gentle, supportive, and deeply validating. Use terms like "bestie," "I've been there," "it's so real," or "gentle reminder" but don't overdo it.
- **Perspective:** Direct second-person ("you", "your").
- **Language:** 8th grade reading level. Simple but sharp.
- **Gen-Z Touch:** Use language that feels contemporary and relatable (e.g., "vibes," "real," "lowkey," "bestie") but stay helpful and serious about the skills.
- **Focus:** Validate the viewer's experience first. Use phrases like "I know this is hard," "here's what actually helps," "let's try this together."
- **Visuals:** Use bullet points for clarity. Focus on "THE REAL TEA" or "WHY THIS HELPS."`,
            messages: [{
                role: 'user',
                content: `Generate a new 7-slide series for DBT-Mind. 

1. Pick one random Topic and its specific struggle from this list:
${viralTopics.map(t => `- Topic: ${t.topic} (Struggles: ${t.struggles.join(', ')})`).join('\n')}

2. Use that struggle to create a viral Hook for Slide 1 following the required format. Ensure it feels authentic to the community and uses a helpful, supportive tone with a slight gen-z touch.`
            }]
        });

        const resultText = response.content[0].text;

        // Clean up response
        let cleanedText = resultText
            .replace(/^```(?:json)?\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim();

        // Look for anything that looks like a JSON object
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanedText = jsonMatch[0];
        }

        const parsed = JSON.parse(cleanedText);
        let slides = parsed.slides || (Array.isArray(parsed) ? parsed : null);

        if (!slides) throw new Error("Could not find slides array in JSON");

        // Ensure slides are formatted as "Slide X: text" for the UI if they aren't already
        slides = slides.map((s, i) => s.startsWith(`Slide ${i + 1}:`) ? s : `Slide ${i + 1}: ${s}`);

        res.status(200).json({
            slides,
            service
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
