import { ART_STYLES } from './art_styles';
import type { ArtStyle } from './art_styles';

export interface DbtGenerateParams {
    format?: 'relatable' | 'pov' | 'tips';
    topic?: string;
    ANTHROPIC_API_KEY: string;
    includeBranding?: boolean;
    artStyle?: string;
}

// (Legacy constants and functions removed)


export async function generateDbtSlides(params: DbtGenerateParams) {
    const { ANTHROPIC_API_KEY, includeBranding = true, artStyle = 'hopper' } = params;

    const selectedArtStyle = (ART_STYLES[artStyle] || ART_STYLES.hopper) as ArtStyle;
    console.log(`[Native Slides - DBT] Generating with new Weird Hacks format, style: ${selectedArtStyle.name}, branding: ${includeBranding ? 'ON' : 'OFF'}`);

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

    const systemPrompt = `You are an expert DBT/BPD content creator on TikTok, that knows exactly what goes viral. You speak as a supportive, slightly older 'bestie' who has been through the absolute trenches of BPD and finished DBT. Your vibe is supportive, validating, and helpful, but grounded in actual clinical DBT skills.

CORE STYLE GUIDELINES:
- **Perspective**: Direct second-person ("you", "your").
- **Tone**: Gentle, supportive, and deeply validating. Use terms like "bestie," "I've been there," "it's so real," or "gentle reminder" but don't overdo it.
- **Reading Level**: 8th-grade. Simple, punchy, no academic jargon.
- **Gen-Z Touch**: Use a language that feels contemporary and relatable (e.g., "vibes," "real," "lowkey," "bestie") but stay helpful and serious about the skills.
- **Visuals**: Use bullet points for clarity. Focus on "THE REAL TEA" or "WHY THIS HELPS" instead of "SHOCKING TRUTHS."
- **Phrases**: Use "I know this is hard," "here's what actually helps," "let's try this together," "it's okay to feel this way."

CONTENT STRUCTURE:
- You will generate a 7-slide series.
- **Max Words per Slide**: Strictly limit each slide to a maximum of 30 words.
- **Slide 1**: ONLY contain the hook. It MUST follow this format: "Weird DBT hacks from my therapist for [BPD ISSUE/PROBLEM] (that ACTUALLY work)" or "Weird BPD hacks from my therapist for [BPD ISSUE/PROBLEM] (that ACTUALLY work)". Do not add tips or extra text here.
- **Slides 2-7**: Provide 6 actionable, supportive DBT-based tips or skills related to the struggle. Be gentle but clear about why they work. Validate the viewer's experience first.

MANDATORY BRANDING (IF ENABLED):
If includeBranding is true, the final slide (Slide 7) MUST naturally integrate a mention of "my dbt app" as a tool for tracking and practicing these skills.

${includeBranding ? 'Slide 7 MUST mention "my dbt app" as the place to practice these skills.' : 'Slide 7 is a final supportive insight.'}`;

    const userPrompt = `Generate a new 7-slide series for DBT-Mind. 

1. Pick one random Topic and its specific struggle from this list:
${viralTopics.map(t => `- Topic: ${t.topic} (Struggles: ${t.struggles.join(', ')})`).join('\n')}

2. Use that struggle to create a viral Hook for Slide 1 following the required format.
3. Ensure the tone is helpful and supportive with a slight gen-z touch. Focus on delivering maximum value and making the viewer feel seen and empowered.

Return a JSON object with a "slides" key containing an array of 7 strings.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-opus-4-6',
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        console.error("[Native Slides - DBT] Anthropic API Error:", errorText);
        throw new Error("Anthropic API Error");
    }

    const rawData = await claudeResponse.json() as any;
    const resultText = rawData.content?.[0]?.text || '';

    // Robust JSON extraction
    const jsonMatch = resultText.match(/[\{\[][\s\S]*[\}\]]/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    const parsed = JSON.parse(jsonMatch[0]);
    const slides = (parsed.slides || parsed).map((s: any) => {
        const text = typeof s === 'string' ? s : (s.text || JSON.stringify(s));
        return text.replace(/^Slide \d+:\s*/i, '').trim();
    });

    // Generate image prompts for the 7 slides
    const imagePrompts: Record<string, string> = {};
    const stylePrefix = selectedArtStyle.prefix + ". ";
    const styleSuffix = selectedArtStyle.suffix;

    // Use a secondary AI call or logic for image prompts (simplified for now to match 7 slides)
    for (let i = 1; i <= slides.length; i++) {
        // Fallback generic prompts if no specific ArtStyle logic is applied
        const basePrompt = i === 1 ? "Dramatic painting of woman in a crisis moment, intense shadows, solitary figure" :
            i === 7 ? "Quietly hopeful painting of woman looking toward a window, soft light" :
                "Solitary woman in an emotional moment, painterly style, atmospheric lighting";

        imagePrompts[`slide${i}`] = stylePrefix + basePrompt + styleSuffix;
    }

    return {
        slides: slides,
        image_prompts: imagePrompts,
        includeBranding: includeBranding,
        visual_style: selectedArtStyle.name
    };
}

// Export functions for API

// (Legacy exports removed)

