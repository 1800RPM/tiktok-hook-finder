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

    // Content Archetypes
    const archetypes = {
        loved_despite_chaos: {
            name: "Loved Despite the Chaos",
            emotionalCore: "External validation, being seen and chosen anyway",
            tone: "Warm, tender, gently humorous"
        },
        secret_inner_world: {
            name: "Secret Inner World",
            emotionalCore: "Feeling seen in your private struggle, validation that you're not alone",
            tone: "Vulnerable, quietly dark, cathartic"
        },
        bestie_witness: {
            name: "Bestie Witness",
            emotionalCore: "Solidarity, being loved by your people, gentle external perspective",
            tone: "Supportive humor, ride-or-die energy"
        },
        crisis_coping: {
            name: "Crisis Coping",
            emotionalCore: "The absurdity of trying to function while falling apart, dark humor",
            tone: "Darkly funny, real, survival mode"
        },
        therapy_realness: {
            name: "Therapy Realness",
            emotionalCore: "The gap between knowing skills and using them, therapy humor",
            tone: "Self-deprecating, knowing, relatable frustration"
        }
    };

    // Available framings with archetype mapping
    const framings = [
        { id: "dating_someone_with_bpd", name: "Dating someone with BPD", archetype: "loved_despite_chaos", description: "Partner's loving/amused perspective on BPD moments" },
        { id: "pov_youre_my_fp", name: "POV: you're my favorite person", archetype: "loved_despite_chaos", description: "What it's like to be someone's FP" },
        { id: "he_doesnt_know", name: "He doesn't know", archetype: "secret_inner_world", description: "Hidden anxiety/behavior partner can't see" },
        { id: "things_i_thought_were_normal", name: "Things I thought were normal", archetype: "secret_inner_world", description: "Discovery that your experience isn't universal" },
        { id: "watching_my_bestie", name: "Watching my bestie", archetype: "bestie_witness", description: "Friend observing with love and gentle humor" },
        { id: "bathroom_dbt_clinic", name: "The bathroom is my DBT clinic", archetype: "crisis_coping", description: "Public face vs private reality, frantic skill usage" },
        { id: "therapist_tired_of_hearing", name: "Things my therapist is tired of hearing", archetype: "therapy_realness", description: "Self-aware therapy humor" },
        { id: "skills_vs_reality", name: "Skills I know vs skills I use", archetype: "therapy_realness", description: "The intention-action gap" }
    ];

    // Available themes with descriptions
    const themes = [
        { id: "favorite_person", name: "Favorite Person", description: "Intense attachment to one person who becomes emotional anchor", moments: "Needing constant contact, mood depending on their responses" },
        { id: "fear_of_abandonment", name: "Fear of Abandonment", description: "Pervasive fear that everyone will leave", moments: "Reading into small changes, preemptive emotional preparation for loss" },
        { id: "splitting", name: "Splitting", description: "Black-and-white thinking, idealization/devaluation", moments: "Soulmate to enemy in minutes over small triggers" },
        { id: "reassurance_seeking", name: "Reassurance Seeking", description: "Constant need for verbal confirmation of love/commitment", moments: "'Do you still love me' repeatedly, analyzing text tone" },
        { id: "the_test", name: "The Test", description: "Subconsciously testing if people will abandon you", moments: "Creating situations to prove they'll leave, pushing people away to see if they stay" },
        { id: "quiet_bpd", name: "Quiet BPD", description: "Internalizing all symptoms, appearing 'fine' externally", moments: "Hidden spirals, smiling while dying inside" },
        { id: "emotional_dysregulation", name: "Emotional Dysregulation", description: "Intense emotions that feel uncontrollable", moments: "0-100 reactions, physical sensation of emotions" },
        { id: "object_permanence", name: "Object Permanence", description: "Difficulty feeling connection when person isn't present", moments: "Out of sight = don't love me, needing proof of existence" },
        { id: "identity_disturbance", name: "Identity Disturbance", description: "Unstable sense of self, mirroring others", moments: "Not knowing who you are alone, changing personality per person" }
    ];

    // Compatibility checking
    const highCompatibility = {
        "dating_someone_with_bpd": ["favorite_person", "splitting", "reassurance_seeking", "fear_of_abandonment", "the_test"],
        "pov_youre_my_fp": ["favorite_person", "reassurance_seeking", "object_permanence"],
        "he_doesnt_know": ["quiet_bpd", "fear_of_abandonment", "object_permanence", "identity_disturbance"],
        "things_i_thought_were_normal": ["quiet_bpd", "identity_disturbance", "object_permanence", "splitting"],
        "watching_my_bestie": ["splitting", "emotional_dysregulation", "favorite_person", "reassurance_seeking"],
        "bathroom_dbt_clinic": ["emotional_dysregulation"],
        "therapist_tired_of_hearing": ["favorite_person", "splitting", "reassurance_seeking", "fear_of_abandonment", "the_test", "quiet_bpd", "emotional_dysregulation", "object_permanence", "identity_disturbance"],
        "skills_vs_reality": ["emotional_dysregulation", "splitting", "reassurance_seeking"]
    };

    // Select framing and theme
    const selectedFraming = (framing
        ? framings.find(f => f.id === framing) || framings[Math.floor(Math.random() * framings.length)]
        : framings[Math.floor(Math.random() * framings.length)]) ?? framings[0];

    const selectedTheme = (theme
        ? themes.find(t => t.id === theme) || themes[Math.floor(Math.random() * themes.length)]
        : themes[Math.floor(Math.random() * themes.length)]) ?? themes[0];

    const archetype = archetypes[selectedFraming.archetype];
    const isHighlyCompatible = highCompatibility[selectedFraming.id]?.includes(selectedTheme.id);

    try {
        const response = await anthropic.messages.create({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 1200,
            system: `You are a viral TikTok slideshow content creator specializing in BPD (Borderline Personality Disorder) and DBT (Dialectical Behavior Therapy) content. Your goal is to create relatable, emotionally resonant slideshow scripts that feel like authentic community content while naturally integrating mentions of the DBT-Mind app.

## CORE PHILOSOPHY

**What makes BPD content go viral:**
- Radical relatability — viewers feel SEEN, not analyzed
- Warmth over clinical distance — show the human, not the diagnosis
- Humor as coping — dark but loving self-awareness
- External validation — "you're not broken, you're loved despite the chaos"
- Insider language — speak AS the community, not TO them

**What kills engagement:**
- Clinical framing that positions the viewer as a patient
- Content that feels like therapy homework
- Obvious advertising or forced app mentions
- Stereotypes that reinforce stigma
- Isolation without emotional payoff

## LANGUAGE & TONE

**Use:**
- Lowercase (tiktok native style)
- Minimal punctuation except for effect
- "tho" not "though", "bc" acceptable
- Emojis sparingly (🥹 😭 🙃 💀 are BPD TikTok staples)
- Specific numbers for humor ("the 47th time" not "constantly")
- Present tense for immediacy
- Inside jokes > explanations

**Avoid:**
- Clinical language (say "spiral" not "episode")
- Making partners seem like victims
- Hopeless endings without solidarity

You MUST output only valid JSON. No markdown, no explanation.`,
            messages: [{
                role: 'user',
                content: `Generate a 6-slide TikTok carousel using the "${selectedFraming.name}" framing about "${selectedTheme.name}".

## CONTENT ARCHETYPE FOR THIS POST
**Archetype:** ${archetype.name}
**Emotional Core:** ${archetype.emotionalCore}
**Tone:** ${archetype.tone}

## FRAMING CONTEXT
${selectedFraming.description}

## THEME CONTEXT
${selectedTheme.description}
Relatable moments: ${selectedTheme.moments}

${!isHighlyCompatible ? `⚠️ This framing/theme combination requires extra care - be creative with the approach.` : ''}

## SLIDE STRUCTURE

**Slide 1 — The Hook:** Immediate recognition moment, sets up the framing clearly
**Slides 2-4 — The Build:** Escalating relatable moments, each slide quotable on its own
**Slide 5 — The Turn:** Often where DBT-Mind fits naturally (e.g., "her checking DBT-Mind before responding to my text" or "me opening DBT-Mind in the bathroom")
**Slide 6 — The Landing:** Emotional payoff - warmth, solidarity, or ironic twist. Leave viewer feeling GOOD.

## DBT-MIND INTEGRATION
- Mention naturally in slide 5 (NEVER slide 1 or final slide)
- Should feel like insider tip, not advertisement
- Natural patterns: "her checking DBT-Mind app...", "me opening DBT-Mind in the bathroom at 2am", "nobody knows I use DBT-Mind to..."

## OUTPUT FORMAT
Return JSON only:
{
  "slides": [
    "slide 1 hook text",
    "slide 2 build text",
    "slide 3 build text",
    "slide 4 build text",
    "slide 5 turn text with DBT-Mind",
    "slide 6 landing text with emoji"
  ]
}

Only return the JSON. No other text.`
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
        const slides = parsed.slides || (Array.isArray(parsed) ? parsed : null);

        if (!slides) throw new Error("Could not find slides array in JSON");

        res.status(200).json({
            slides,
            framing: selectedFraming,
            theme: selectedTheme,
            archetype: archetype
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
