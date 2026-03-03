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
    const { ANTHROPIC_API_KEY, includeBranding = true, artStyle = 'varo', topic } = params;

    const selectedArtStyle = (ART_STYLES[artStyle] || ART_STYLES.varo) as ArtStyle;
    console.log(`[Native Slides - DBT] Generating with new Weird Hacks format, style: ${selectedArtStyle.name}, branding: ${includeBranding ? 'ON' : 'OFF'}`);

    const viralTopics = [
        // Tier 1: Relationship/Attachment
        { topic: "FP Dynamics", struggles: ["texting anxiety", "fear of replacement", "obsessive thoughts", "needing constant reassurance", "losing your FP", "FP dependency/addiction"] },
        { topic: "Splitting", struggles: ["turning on a loved one over a 'tone' shift", "moving from soulmate to enemy", "splitting on yourself", "all-or-nothing thinking", "black-and-white thinking in relationships"] },
        { topic: "Abandonment Panic", struggles: ["pushing people away before they leave", "testing people to see if they'll stay", "panic when someone is 5 mins late", "analyzing words for signs of leaving", "relationship sabotage", "why calm feels like rejection"] },
        { topic: "Relationship Cycles", struggles: ["idealization vs devaluation", "the breakup cycle", "choosing the same toxic people", "trauma bonding vs love", "when love feels like chaos"] },

        // Tier 2: Identity/Self
        { topic: "Quiet BPD", struggles: ["splitting inward/self-hatred", "masking high distress with a calm face", "dissociating when overwhelmed", "feeling like a burden for having needs", "invisible struggle", "no one believes you are struggling"] },
        { topic: "Identity/Sense of Self", struggles: ["feeling like a 'void' when alone", "copying personalities to fit in", "not knowing your own values", "feeling invisible", "copying behaviors to fit in", "who am I without my emotions"] },
        { topic: "Emotional Dysregulation", struggles: ["BPD rage out of nowhere", "feeling 'too much' for others", "emotional hangovers after outbursts", "rapid mood swings", "nervous system explanation", "0 to 100 instantly"] },
        { topic: "Reframes/Truths", struggles: ["hypervigilance vs empathy", "withdrawal vs love", "romanticizing survival mechanisms", "uncomfortable truths about BPD behaviors"] },

        // Tier 3: Recovery/Skills
        { topic: "DBT Skills", struggles: ["TIPP for crisis", "Opposite Action breakthroughs", "Radical Acceptance", "the skill that finally clicked", "what actually works vs sounds good"] },
        { topic: "Recovery Milestones", struggles: ["6 months ago vs now", "first time catching a split", "sitting with emotions", "small wins that matter"] },
        { topic: "Therapy Truths", struggles: ["what therapists won't say directly", "DBT vs talk therapy", "why it feels worse before it gets better", "the reality of treatment"] },
        { topic: "Rejection Sensitivity", struggles: ["interpreting mid emojis as hatred", "physical sickness after minor criticism", "post-socializing spiral/over-analyzing", "perceiving slight shifts in energy"] },
        { topic: "Digital Self-Harm", struggles: ["checking blocks/old texts", "searching for things that trigger you", "comparing yourself to their new friends", "stalking ex-FPs"] }
    ];

    // Find requested topic or pick random
    let selectedTopic = viralTopics.find(t => t.topic.toLowerCase() === topic?.toLowerCase()) ||
        viralTopics[Math.floor(Math.random() * viralTopics.length)];

    // Safety fallback (should never be undefined with the above logic, but for TS)
    if (!selectedTopic) selectedTopic = viralTopics[0]!;

    console.log(`[Native Slides - DBT] Selected topic: ${selectedTopic.topic}`);

    const formatSlide1Hook = (rawHook: string, fallbackProblem: string) => {
        const source = String(rawHook || "").trim();
        const useDbtPrefix = /^weird\s+dbt\s+hacks/i.test(source);
        const prefix = useDbtPrefix
            ? "Weird DBT hacks from my therapist for"
            : "Weird BPD hacks from my therapist for";

        let problem = source
            .replace(/^slide\s*1\s*:\s*/i, "")
            .replace(/^["']|["']$/g, "")
            .replace(/^weird\s+(dbt|bpd)\s+hacks\s+from\s+my\s+therapist\s+for\s*/i, "")
            .replace(/\(\s*that\s+actually\s+work\s*\)\s*$/i, "")
            .trim();

        if (!problem) problem = fallbackProblem;
        return `${prefix} ${problem}\n\n(that ACTUALLY work)`;
    };

    const systemPrompt = `You are an expert DBT/BPD content creator on TikTok, that knows exactly what goes viral. You speak as a supportive, slightly older mentor figure who has been through the absolute trenches of BPD and finished DBT. Your vibe is supportive, validating, and helpful, but grounded in actual clinical DBT skills.

CORE STYLE GUIDELINES:
- **Perspective**: Direct second-person ("you", "your").
- **Tone**: Gentle, supportive, and deeply validating. Use terms like "I've been there," "it's so real," or "gentle reminder" but don't overdo it.
- **Reading Level**: 8th-grade. Simple, punchy, no academic jargon.
- **Gen-Z Touch**: Use a language that feels contemporary and relatable (e.g., "vibes," "real," "lowkey") but stay helpful and serious about the skills. **STRICTLY AVOID** using words like "bestie", "sis", or "queen".
- **Visuals**: Use bullet points for clarity. Focus on "THE REAL TEA" or "WHY THIS HELPS" instead of "SHOCKING TRUTHS."
- **NO MIRRORS**: Strictly avoid any mention of mirrors or looking at one's reflection.
- **Emojis**: Use emojis EXTREMELY sparingly. Maximum 1-2 across the entire 6-slide series. **NEVER** use emojis on Slide 1 (the hook).
- **Phrases**: Use "I know this is hard," "here's what actually helps," "let's try this together," "it's okay to feel this way."

NEVER use the word "bestie" or overly juvenile slang. Authenticity comes from emotional truth, not forced slang.

CONTENT STRUCTURE:
- You will generate a 6-slide series.
- **Max Words per Slide**: Strictly limit each slide to a maximum of 30 words.
- **Slide 1**: ONLY contain the hook. It MUST follow one of these two formats:
  "Weird DBT hacks from my therapist for [PROBLEM]\n\n(that ACTUALLY work)"
  OR
  "Weird BPD hacks from my therapist for [PROBLEM]\n\n(that ACTUALLY work)".
  - **The [PROBLEM]** must be a generic, immediately identifiable label (e.g., "splitting in public", "FP dynamics", "abandonment panic"). Avoid long, specific scenarios in the hook. People must identify themselves in 3 seconds.
- **Slides 2-3**: Empathy & Naming. Deeply validate the struggle. Describe how it feels physically and emotionally. Use "I've been there" energy. Name the experience so the viewer feels understood.
- **Slide 4 (Punch Slide)**: EXACTLY two sentences. Each sentence max 5 words. It must nail the core pattern behind the topic (e.g., "it's not them.\nit's the pattern."). Must be directly related to the topic and feel like the emotional turning point.
- **Slide 5**: Actual DBT Skill. Provide 1 slide that uses a real DBT skill (e.g. TIPP, Opposite Action, STOP, Radical Acceptance, Wise Mind). Explain the skill simply and how to apply it to the struggle.
- **Slide 6 (App Slide)**: Must be EXACTLY this text, unchanged:
  "my therapist recommended DBT-Mind (free) — that's where the skill finally clicked for me."
MANDATORY BRANDING:
Slide 6 is always included as described above.`;




    const userPrompt = `Generate a new 6-slide series for DBT-Mind focusing on this specific struggle:
Topic: ${selectedTopic.topic}
Struggles: ${selectedTopic.struggles.join(', ')}

1. Slide 1 MUST start with "Weird DBT hacks from my therapist for" or "Weird BPD hacks from my therapist for".
   The "(that ACTUALLY work)" part must be on a new paragraph after one blank line.
2. Use the Topic (${selectedTopic.topic}) or a very punchy summary as the [PROBLEM] in the hook so it's immediately relatable.
3. Use the specific Struggles (${selectedTopic.struggles.join(', ')}) to build the validation in Slides 2-3.
4. Slide 4 must be EXACTLY two sentences and each sentence max 5 words.
   It must be a punchy statement that nails the core pattern behind the topic (e.g., "it's not them.\nit's the pattern.").
5. Ensure the tone is helpful and supportive mentor-like. Focus on maximum value.
6. Dedicate exactly 1 slide (5) to a clinical DBT skill.
7. Slide 6 must be exactly: "my therapist recommended DBT-Mind (free) — that's where the skill finally clicked for me."
8. Use emojis EXTREMELY sparingly (max 1-2 per series, none on Slide 1).

Return a JSON object with a "slides" key containing an array of 6 strings.`;





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
    let slides = (parsed.slides || parsed).map((s: any) => {
        const text = typeof s === 'string' ? s : (s.text || JSON.stringify(s));
        return text.replace(/^Slide \d+:\s*/i, '').trim();
    });
    slides = slides.slice(0, 6);
    const normalizeWords = (line: string) =>
        line
            .replace(/[^\p{L}\p{N}'’\- ]/gu, ' ')
            .split(/\s+/)
            .filter(Boolean);
    const slide4 = slides[3] || "";
    const slide4Sentences = slide4
        .split(/[.!?]\s*|\n+/)
        .map(s => s.trim())
        .filter(Boolean);
    const slide4Valid = slide4Sentences.length === 2 &&
        slide4Sentences.every(s => normalizeWords(s).length <= 5);
    if (!slide4Valid) {
        const topicLabel = (selectedTopic?.topic || "the pattern").toLowerCase();
        slides[3] = `it's not them.\nit's ${topicLabel}.`;
    }
    if (slides.length >= 1) {
        const fallbackProblem = (selectedTopic?.topic || "this pattern").toLowerCase();
        slides[0] = formatSlide1Hook(slides[0], fallbackProblem);
    }
    if (slides.length >= 6) {
        slides[5] = "my therapist recommended DBT-Mind (free) — that's where the skill finally clicked for me.";
    }

    // Generate image prompts for the generated slides
    const imagePrompts: Record<string, string> = {};
    const stylePrefix = selectedArtStyle.prefix + ". ";
    const styleSuffix = selectedArtStyle.suffix;

    // Use fallback generic prompts
    for (let i = 1; i <= slides.length; i++) {
        // Fallback generic prompts if no specific ArtStyle logic is applied
        const basePrompt = i === 1 ? "Dramatic painting of woman in a crisis moment, intense shadows, solitary figure" :
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
