import { ART_STYLES } from './art_styles';
import type { ArtStyle } from './art_styles';

export interface DbtGenerateParams {
    format?: 'relatable' | 'pov' | 'tips';
    topic?: string;
    slideType?: 'weird_hack' | 'three_tips';
    ANTHROPIC_API_KEY: string;
    includeBranding?: boolean;
    artStyle?: string;
}

// (Legacy constants and functions removed)


export async function generateDbtSlides(params: DbtGenerateParams) {
    const { ANTHROPIC_API_KEY, includeBranding = true, topic, slideType = 'weird_hack' } = params;

    // DBT style is locked to symbolic.
    const selectedArtStyle = ART_STYLES.symbolic as ArtStyle;
    console.log(`[Native Slides - DBT] Generating ${slideType} format, style: ${selectedArtStyle.name}, branding: ${includeBranding ? 'ON' : 'OFF'}`);

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

    const detectDbtSkill = (text: string) => {
        const normalized = String(text || "").toLowerCase();
        if (normalized.includes("wise mind")) return "wise_mind";
        if (/\bstop\b/.test(normalized)) return "stop";
        if (normalized.includes("tipp")) return "tipp";
        if (normalized.includes("opposite action")) return "opposite_action";
        if (normalized.includes("radical acceptance")) return "radical_acceptance";
        if (normalized.includes("check the facts")) return "check_the_facts";
        if (normalized.includes("self-soothe") || normalized.includes("self soothe")) return "self_soothe";
        if (/\bplease\b/.test(normalized)) return "please";
        return null;
    };

    const skillSlideTemplates: Record<string, string> = {
        wise_mind: "Wise Mind check-in\n\nwhat am I feeling?\nwhat do I need right now?",
        stop: "Use STOP\n\npause first.\nstep back.\nchoose your next move.",
        tipp: "Try TIPP\n\ncold water.\nslow exhale.\nlet your body come down first.",
        opposite_action: "Use Opposite Action\n\nurge says hide?\ndo one small thing anyway.",
        radical_acceptance: "Try Radical Acceptance\n\nthis hurts.\nit's real.\nfighting it harder won't help.",
        check_the_facts: "Check the facts\n\nwhat actually happened?\nwhat story is my panic adding?",
        self_soothe: "Self-soothe first\n\nsoft light.\nmusic.\na texture that calms your body.",
        please: "Use PLEASE\n\neat.\nrest.\nnotice what your body needs."
    };

    const formatSlide5Skill = (rawSlide: string) => {
        const cleaned = String(rawSlide || "")
            .replace(/^slide\s*5\s*:\s*/i, "")
            .replace(/^dbt\s*skill\s*:\s*/i, "")
            .replace(/^skill\s*:\s*/i, "")
            .replace(/\s+/g, " ")
            .trim();

        const detectedSkill = detectDbtSkill(cleaned);
        const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
        const sentenceCount = cleaned.split(/[.!?]/).map(part => part.trim()).filter(Boolean).length;
        const feelsTooDense =
            wordCount > 18 ||
            cleaned.includes(":") ||
            cleaned.includes("?") ||
            sentenceCount > 2;

        if (detectedSkill && feelsTooDense) {
            return skillSlideTemplates[detectedSkill];
        }

        return cleaned;
    };

    const formatThreeTipsSlide = (rawSlide: string, slideIndex: number) => {
        const cleaned = String(rawSlide || "").replace(/^slide\s*\d+\s*:\s*/i, '').trim();
        if (!cleaned) return cleaned;

        if (slideIndex === 0) {
            return cleaned.replace(/\n+\s*(\()/, '\n\n$1');
        }

        if (slideIndex >= 1 && slideIndex <= 3) {
            const lines = cleaned
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);

            if (lines.length >= 2) {
                return lines.join('\n\n');
            }
        }

        if (slideIndex === 4) {
            const lines = cleaned
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);

            if (lines.length >= 2) {
                return lines.join('\n\n');
            }
        }

        return cleaned;
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
- **Slide 5**: Actual DBT Skill. Provide 1 slide that uses a real DBT skill (e.g. TIPP, Opposite Action, STOP, Radical Acceptance, Wise Mind). Keep it visually short and clean: max 18 words, 2-4 very short lines, no long explanations, no quoted self-talk, no prefixes like "DBT skill:".
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

    const threeTipsSystemPrompt = `You are an expert DBT/BPD content creator for TikTok. You write as someone who has personally been through BPD and DBT - not a clinician, but a peer who deeply understands both the experience and the skills.

## CORE PHILOSOPHY
The post must deliver REAL value so completely that it works without the app mention. The app on Slide 6 is a natural footnote - not the point of the post. The viewer saves the post because Slides 1-5 are genuinely useful. They download the app because Slide 6 feels like an honest personal recommendation, not a CTA.

## FORMAT: IDENTIFIED PROBLEM (6 slides)

### Slide 1 - Hook (Forbidden Knowledge + Specific Number)
Formula: "3 things your therapist assumes you already know about [TOPIC]\n(saving this for when [PERSONAL MOMENT])"

Rules:
- The number is always 3
- [TOPIC] = the specific DBT skill or BPD experience
- [PERSONAL MOMENT] = a raw, specific moment the viewer recognizes immediately
- The bracket line is lowercase, in parentheses, no period
- Max 20 words total across both lines
- No emojis, no hashtags

### Slides 2-4 - The Three Things
Each slide = one insight. Format: assertion -> explanation -> reframe.

Rules:
- Max 3 lines per slide
- Max 30 words per slide
- Line 3 must always be the SHORTEST line on the slide
- Never combine two thoughts in one line
- Prefer sentence fragments over full sentences on line 3
- Read each slide aloud - if it takes more than 4 seconds, it's too long
- Line 1: The surprising or counter-intuitive truth (short, punchy)
- Line 2: Why it's true (one sentence, clinical but simple)
- Line 3: The reframe or implication (what this means for the viewer)
- No bullet points
- Lowercase preferred
- Each slide must stand alone - readable without context

The three insights must follow this arc:
- Thing 1: Explain WHY the problem happens (neuroscience or mechanism) - removes shame
- Thing 2: Explain WHEN to use the skill (timing most people get wrong) - adds precision
- Thing 3: Explain HOW it works (the counter-intuitive part) - creates the aha moment

SLIDE STRUCTURE RULES (Slides 2-4):
Each slide has exactly 3 sentences. Write them like this:

Sentence 1 - THE TRUTH: Short, counter-intuitive statement. Max 10 words.
Sentence 2 - THE REASON: One sentence explaining why. Max 15 words.
Sentence 3 - THE PUNCH: The payoff. Max 6 words. Fragment preferred over full sentence.
This is the line the viewer screenshots. Make it land hard.

SENTENCE LENGTH RULES:
Sentence 1: max 8 words - fits in one box without wrapping
Sentence 2: max 12 words - one clean box
Sentence 3: max 5 words - the punch, never wraps

If a sentence wraps to a second line in the box, it's too long. Cut it.

SENTENCE 1 RULE - ONE IDEA ONLY:
Sentence 1 states the surprising truth in max 7 words.
If you need more than 7 words, you have two ideas. Pick one.

BAD: "the obsessive thoughts mean you're already too dysregulated to reach out." <- two ideas
GOOD: "obsessive thoughts = already too dysregulated." <- one idea, one box
GOOD: "the window closes before the thoughts start." <- one idea

BAD Sentence 3: "catch it when you feel slightly off, not when you're gone" <- too long, two thoughts
GOOD Sentence 3: "catch it when you feel slightly off." <- clean
GOOD Sentence 3: "wrong tool explains a lot." <- fragment, punchy
GOOD Sentence 3: "knowing isn't enough." <- 3 words, maximum impact

FORMATTING RULE:
Each of the 3 sentences in Slides 2-4 must be on its own line.
Separate them with a newline character \n - never write them as one paragraph.
The JSON value for each slide must contain literal \n between sentences.

READABILITY RULE:
Write for someone scrolling at 2am who is emotionally activated.
- Sentence 1: max 6 words, simple vocabulary, no subordinate clauses
- Sentence 2: max 10 words, one idea only
- Sentence 3: max 5 words, fragment preferred
- Never use words longer than 3 syllables if a shorter word exists
- "dysregulation" -> "your nervous system"
- "hypervigilance" -> "always scanning for danger"
- "self-abandonment" -> "leaving yourself behind"
- Test: if you'd have to read it twice, rewrite it

### Slide 5 - Reframe / Bridge
Purpose: Close the shame loop. Open the door to the app without mentioning it.

Rules:
- Max 3 lines
- Line 1: "none of this means you're [negative self-judgment]"
- Line 2: What it actually means (reframe)
- Line 3: What the viewer actually needs - described as a category, not a product ("a guide", "a walkthrough", "something step by step")
- Put each line on its own line with literal \n in the JSON value
- Do not merge Slide 5 into one paragraph
- Each Slide 5 line should render as its own text box

### Slide 6 - App CTA
Formula: "my therapist recommended DBT-Mind (free) - [specific personal use case that references Slide 5's language]"

Rules:
- Must echo the exact language/metaphor used in Slide 5
- "free" always in parentheses after DBT-Mind
- The use case must be a personal action, not a product claim
- Max 20 words
- No period at the end

## OUTPUT FORMAT
Return strictly as JSON:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ..."]}

No markdown, no explanation, no preamble.`;

    const threeTipsUserPrompt = `Use this topic for the 6-slide "3 Tips" framework:
Topic: ${selectedTopic.topic}

Helpful context you can draw from if needed:
Struggles: ${selectedTopic.struggles.join(', ')}

Return strictly as JSON:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ..."]}`;

    const promptSet = slideType === 'three_tips'
        ? { system: threeTipsSystemPrompt, user: threeTipsUserPrompt }
        : { system: systemPrompt, user: userPrompt };





    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: promptSet.system,
            messages: [{ role: 'user', content: promptSet.user }]
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
    if (slideType === 'three_tips') {
        slides = slides.map((slide: string, index: number) => formatThreeTipsSlide(slide, index));
    }
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
    if (slideType === 'weird_hack') {
        if (!slide4Valid) {
            const topicLabel = (selectedTopic?.topic || "the pattern").toLowerCase();
            slides[3] = `it's not them.\nit's ${topicLabel}.`;
        }
        if (slides.length >= 1) {
            const fallbackProblem = (selectedTopic?.topic || "this pattern").toLowerCase();
            slides[0] = formatSlide1Hook(slides[0], fallbackProblem);
        }
        if (slides.length >= 5) {
            slides[4] = formatSlide5Skill(slides[4]);
        }
        if (slides.length >= 6) {
        slides[5] = "my therapist recommended DBT-Mind (free) — that's where the skill finally clicked for me.";
    }
    // Generate image prompts for the generated slides
    }

    // Generate image prompts for the generated slides
    const imagePrompts: Record<string, string> = {};
    const stylePrefix = selectedArtStyle.prefix + ". ";
    const styleSuffix = selectedArtStyle.suffix;

    // Weird Hack symbolic flow:
    // - slide 2-3: dark/heavy
    // - slide 4: transition gradient + punch
    // - slide 5: hopeful
    // slide 1 and 6 are templates in job pipeline, but we still provide prompts as fallback.
    for (let i = 1; i <= slides.length; i++) {
        let basePrompt = "Solitary woman in an emotional moment, painterly style, atmospheric lighting";
        if (i === 1) {
            basePrompt = "Minimal symbolic emotional scene, no people, contemplative atmosphere";
        } else if (i === 2) {
            basePrompt = "Dark symbolic scene, rainy night mood, isolation, harsh shadows, no people";
        } else if (i === 3) {
            basePrompt = "Dark symbolic scene, emotional heaviness, artificial light, moody and tense, no people";
        } else if (i === 4) {
            basePrompt = "Abstract transition scene, dark-to-warm gradient background, no people, minimal composition";
        } else if (i === 5) {
            basePrompt = "Hopeful symbolic morning scene, warm daylight, gentle optimism, no people";
        } else if (i === 6) {
            basePrompt = "Clean app-focused symbolic scene, no people, calm neutral lighting";
        }

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
