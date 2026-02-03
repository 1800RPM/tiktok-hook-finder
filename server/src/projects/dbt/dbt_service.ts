export interface DbtGenerateParams {
    format?: 'relatable' | 'pov' | 'tips';
    topic?: string;
    ANTHROPIC_API_KEY: string;
    includeBranding?: boolean;
}

// Content Formats (3 types from new framework)
const contentFormats = {
    relatable: {
        id: "relatable",
        name: "Relatable/Emotional",
        percentage: 50,
        purpose: "Community building, high engagement - makes viewers feel seen",
        structure: [
            { slide: 1, function: "HOOK", textStyle: "Curiosity gap, max 12 words" },
            { slide: "2-4", function: "Relatable content", textStyle: "First-person, hyper-specific experiences" },
            { slide: 5, function: "Emotional landing", textStyle: "The 'and that's why...' or deeper realization" },
            { slide: 6, function: "Soft app hook (optional)", textStyle: "Only on 1 in 5 posts" }
        ],
        slideCount: "5-6",
        appMentionRule: "1 in 5 posts maximum, last slide only, personal discovery tone"
    },
    pov: {
        id: "pov",
        name: "POV",
        percentage: 20,
        purpose: "Watch time, shares - puts viewer INTO the BPD moment",
        structure: [
            { slide: 1, function: "POV Hook", textStyle: "Establish the scenario" },
            { slide: "2-3", function: "The experience", textStyle: "Show what happens internally" },
            { slide: 4, function: "The contrast/twist", textStyle: "External vs internal, or escalation" },
            { slide: 5, function: "Resolution or continuation (optional)", textStyle: "Leave them in the feeling" }
        ],
        slideCount: "4-5",
        appMentionRule: "Rarely (profile link does the work) - if mentioned, put in description not slides"
    },
    tips: {
        id: "tips",
        name: "Tips/Hacks",
        percentage: 30,
        purpose: "Saves, follows, educational value - actionable content",
        structure: [
            { slide: 1, function: "Hook", textStyle: "Promise of practical value" },
            { slide: "2-4", function: "The tips", textStyle: "DBT skills explained simply, one per slide" },
            { slide: 5, function: "App integration", textStyle: "Natural 'and here's how to practice'" },
            { slide: 6, function: "Soft CTA (optional)", textStyle: "Save for later, follow for more" }
        ],
        slideCount: "5-6",
        appMentionRule: "Every tips post (natural here), slide 5 after delivering value"
    }
};

// Topics (5 main BPD topics from new framework)
const topics = [
    {
        id: "favorite_person",
        name: "Favorite Person (FP)",
        description: "Intense attachment to one person who becomes emotional anchor - needing constant contact, mood depending entirely on their responses",
        artStyle: "Renaissance/Baroque portraits",
        whyItWorks: "Dramatic emotional expressions, intimate focus on single figures"
    },
    {
        id: "splitting",
        name: "Splitting",
        description: "Black-and-white thinking, idealization/devaluation - soulmate to enemy in minutes over small triggers",
        artStyle: "Baroque",
        whyItWorks: "Intense chiaroscuro (light/dark contrast) = perfect visual metaphor for black/white thinking"
    },
    {
        id: "quiet_bpd",
        name: "Quiet BPD",
        description: "Internalizing all symptoms, appearing 'fine' externally - hidden spirals, smiling while dying inside, not fitting stereotypes",
        artStyle: "Pre-Raphaelite",
        whyItWorks: "Women in contemplation, hidden emotion beneath beautiful surface, melancholic beauty"
    },
    {
        id: "fear_of_abandonment",
        name: "Fear of Abandonment",
        description: "Pervasive fear that everyone will leave - reading into small changes, pushing people away first, testing if they'll stay",
        artStyle: "Romantic Era",
        whyItWorks: "Emotional intensity, nature as emotional mirror, dramatic longing"
    },
    {
        id: "identity_disturbance",
        name: "Identity Disturbance",
        description: "Unstable sense of self, mirroring others - not knowing who you are alone, changing personality per person",
        artStyle: "Surrealist",
        whyItWorks: "Fragmented reality, multiple selves, dreamlike confusion"
    }
];

// Hook Formulas by Format
const hookFormulas = {
    relatable: {
        nobody_talks_about: {
            name: "Nobody Talks About",
            formula: "nobody talks about [hyper-specific BPD experience]",
            performance: "Highest performing - creates insider knowledge + curiosity gap",
            examplesByTopic: {
                favorite_person: "nobody talks about how having an FP is basically emotional hostage syndrome",
                splitting: "nobody talks about how fast you can go from 'soulmate' to 'enemy' in your head",
                quiet_bpd: "nobody talks about the version of BPD where you implode instead of explode",
                fear_of_abandonment: "nobody talks about how fear of abandonment makes you abandon people first",
                identity_disturbance: "nobody talks about not knowing which version of yourself is the real one"
            }
        },
        hyper_specific_symptom: {
            name: "Hyper-Specific Symptom",
            formula: "[tiny specific behavior that feels too personal to be universal]",
            performance: "High recognition - instant 'that's ME' reaction",
            examplesByTopic: {
                favorite_person: "checking if they've been online but haven't texted you back yet",
                splitting: "when they use a period instead of an exclamation mark and suddenly they hate you",
                quiet_bpd: "smiling and nodding while your brain is screaming that everyone secretly hates you",
                fear_of_abandonment: "testing whether they'll stay by showing them your worst",
                identity_disturbance: "changing your entire personality based on who you're with"
            }
        },
        call_out: {
            name: "Call-Out",
            formula: "if you [specific behavior], this is for you",
            performance: "Direct address - stops scroll by speaking directly to viewer",
            examplesByTopic: {
                favorite_person: "if your entire mood depends on one person's texting patterns, this is for you",
                splitting: "if you've ever mentally ended a relationship over a tone of voice, stay",
                quiet_bpd: "if you've ever had a complete breakdown and no one around you noticed, this one",
                fear_of_abandonment: "if you've ever sabotaged something good because you were waiting for it to end anyway",
                identity_disturbance: "if you've ever copied someone's mannerisms without realizing it, this is for you"
            }
        },
        confession: {
            name: "Confession",
            formula: "I [vulnerable admission about BPD behavior]",
            performance: "Vulnerability - creates instant emotional connection",
            examplesByTopic: {
                favorite_person: "I know exactly how many hours it's been since they last messaged",
                splitting: "I rewrote our entire history in my head because they didn't text back fast enough",
                quiet_bpd: "I've never told anyone how close I am to falling apart at any given moment",
                fear_of_abandonment: "I push people away and then cry when they actually leave",
                identity_disturbance: "I don't know if I actually like this or if I just absorbed it from someone else"
            }
        }
    },
    pov: {
        formula: "POV: [specific BPD moment in second person]",
        examplesByTopic: {
            favorite_person: [
                "POV: your FP left you on read 3 hours ago",
                "POV: they finally texted back and your whole day is saved",
                "POV: you're watching your FP talk to someone else",
                "POV: you're trying to act normal while analyzing their every word"
            ],
            splitting: [
                "POV: they used the wrong tone and now you're rewriting your entire relationship",
                "POV: you went from 'I love them' to 'I never want to see them again' in 10 minutes",
                "POV: you know you're splitting but you can't stop",
                "POV: the rational part of your brain watching the emotional part take over"
            ],
            quiet_bpd: [
                "POV: you're having a complete breakdown and no one around you notices",
                "POV: someone asks 'are you okay?' and you have to decide how honest to be",
                "POV: you're masking so hard you don't even know what's real anymore",
                "POV: your therapist is the only one who knows how bad it really is"
            ],
            fear_of_abandonment: [
                "POV: you're pushing them away to see if they'll stay",
                "POV: they said 'we need to talk' and you've already planned the funeral of the relationship",
                "POV: you're testing them again even though you know you shouldn't",
                "POV: you finally let someone in and now you're terrified"
            ],
            identity_disturbance: [
                "POV: someone asks what your hobbies are and you genuinely don't know",
                "POV: you're trying to figure out which version of yourself is real",
                "POV: you realized you've been mirroring everyone you've ever been close to",
                "POV: you meet someone new and start becoming them without meaning to"
            ]
        }
    },
    tips: {
        things_that_help: {
            name: "Things That Actually Help",
            formula: "X things that actually help when [specific BPD moment]",
            performance: "Highest value signal - implies you've tried everything else",
            examples: [
                "3 things that actually help when your FP hasn't texted back",
                "3 things that actually help when you're splitting",
                "3 things that actually help when you're imploding instead of exploding",
                "3 things that actually help when abandonment fear takes over",
                "3 things that actually help when you don't know who you are"
            ]
        },
        skill_wish_knew: {
            name: "The Skill I Wish I Learned Sooner",
            formula: "the skill I wish I learned sooner for [symptom]",
            performance: "Regret framing = emotional hook, implies transformation",
            examples: [
                "the skill I wish I learned sooner for FP obsession",
                "the skill I wish I learned sooner for black and white thinking",
                "the skill no one talks about for quiet BPD",
                "the skill that stopped me from pushing people away",
                "the skill I wish I learned sooner for identity confusion"
            ]
        },
        what_to_do: {
            name: "What To Do When",
            formula: "what to do when [crisis moment] — from someone who's been there",
            performance: "Personal authority + practical value",
            examples: [
                "what to do when your whole mood depends on one person",
                "what to do before you say something you'll regret",
                "what to do when you're falling apart and can't tell anyone",
                "what to do when you need reassurance but can't ask",
                "what to do when you catch yourself mirroring someone"
            ]
        },
        how_i_stop: {
            name: "How I Actually Stop",
            formula: "how I actually stop [symptom] mid-spiral",
            performance: "Actually + crisis intervention = high save rate",
            examples: [
                "how I stop spiraling when my FP is distant",
                "how I actually stop mid-split before I ruin everything",
                "how I finally learned to validate my own emotions",
                "how I stop testing people to see if they'll leave",
                "how I'm slowly figuring out who I actually am"
            ]
        }
    }
};

// DBT Skills by Topic
const dbtSkillsByTopic: Record<string, string[]> = {
    favorite_person: [
        "TIPP (Temperature, Intense exercise, Paced breathing, Progressive relaxation)",
        "Opposite Action",
        "Check the Facts",
        "STOP skill",
        "Self-soothing"
    ],
    splitting: [
        "Wise Mind",
        "Check the Facts",
        "Dialectical thinking (holding two truths)",
        "Mindfulness of Current Emotion",
        "Urge Surfing"
    ],
    quiet_bpd: [
        "Self-validation",
        "Emotion naming",
        "TIPP",
        "Building Mastery",
        "Radical Acceptance"
    ],
    fear_of_abandonment: [
        "Check the Facts",
        "DEAR MAN",
        "Opposite Action",
        "Distress Tolerance",
        "Building evidence"
    ],
    identity_disturbance: [
        "Values clarification",
        "Building Mastery",
        "Mindful awareness",
        "Self-validation",
        "Accumulating Positives"
    ]
};

// App Mention Templates by Format & Topic
const appMentionTemplates = {
    relatable: {
        splitting: "my DBT app calls this 'wise mind' and it's the first thing that actually helped",
        favorite_person: "the DBT app I use has a whole module on this and it finally made sense",
        emotional_spiral: "my DBT app has a skill for stopping this mid-spiral, wish I knew it sooner",
        quiet_bpd: "the app I use for DBT actually explains what to do instead of just 'feel your feelings'",
        fear_of_abandonment: "my DBT app breaks this down step by step and it's the only thing that's worked"
    },
    tips: {
        generic: "my DBT app walks you through each of these step by step",
        skill_specific: "the app I use has guided exercises for [skill name] — it's the only thing that made it stick",
        crisis: "my DBT app has this as a crisis skill you can pull up in the moment",
        learning: "the app actually explains WHY these work, not just what to do"
    }
};

// Visual prompts by topic and slide position
const visualPromptsByTopic: Record<string, Record<string, string[]>> = {
    favorite_person: {
        slide1: ["Baroque oil painting of a young woman in a dark room, illuminated only by candlelight, staring intensely at a letter in her hands, expression of desperate hope mixed with anxiety, dramatic chiaroscuro lighting, rich dark background"],
        slide2: ["Pre-Raphaelite painting of a woman at a window, twilight, watching the road outside, body language of restless anticipation, muted colors with emphasis on her pale face, melancholic atmosphere"],
        slide3: ["Romantic era painting of a woman's face transforming with joy, soft golden light flooding in from one side, the darkness receding, eyes bright with tears of relief, intimate portrait composition"],
        slide4: ["Surrealist painting of a woman surrounded by floating clock fragments and swirling letters, her expression of obsessive focus, time distortion visual, dreamlike anxiety atmosphere"]
    },
    splitting: {
        slide1: ["Baroque painting of two versions of the same woman facing each other, one bathed in warm golden light looking loving, one in cold blue shadow looking hateful, dramatic split lighting down the center, museum quality oil painting"],
        slide2: ["Classical painting of a woman's face half in shadow half in light, expression transitioning from love to contempt, Caravaggio-style dramatic lighting, intense emotional contrast"],
        slide3: ["Dark romantic painting of a woman alone in a shadowy room, surrounded by torn letters and broken objects, expression of hollow regret, dramatic single light source from above"],
        slide4: ["Painting of a woman looking at her reflection in a cracked mirror, each fragment showing a different emotion, soft Pre-Raphaelite style, melancholic self-awareness"]
    },
    quiet_bpd: {
        slide1: ["Pre-Raphaelite painting of a woman at a social gathering, perfectly composed smile, but eyes revealing deep sadness, surrounded by blurred figures who don't notice, shallow depth of field effect"],
        slide2: ["Dual-layer painting effect: serene woman's portrait with translucent overlay showing chaotic storm imagery, the contrast between surface and interior, ethereal technique"],
        slide3: ["Surrealist painting of a woman's silhouette filled with turbulent ocean waves and storm clouds, while her outline remains perfectly still, contained chaos visual metaphor"],
        slide4: ["Intimate Pre-Raphaelite painting of a woman sitting alone in a beautiful room, head bowed, weight of invisible burden visible in her posture, late afternoon light, profound solitude"]
    },
    fear_of_abandonment: {
        slide1: ["Romantic era painting of a woman at a doorway, half-turned away, looking back with conflicted expression, one hand reaching back while body moves forward, dramatic threshold composition"],
        slide2: ["Baroque painting of two figures, woman pushing away a reaching hand while her eyes desperately want them to stay, complex emotional body language, dramatic lighting"],
        slide3: ["Painting of a woman watching a figure walk away into fog, her arm outstretched too late, muted colors, romantic era lonely landscape, profound loss atmosphere"],
        slide4: ["Surrealist painting of a woman surrounded by fading ghostly figures, each representing people she pushed away, melancholic acceptance, soft ethereal lighting"]
    },
    identity_disturbance: {
        slide1: ["Surrealist painting of a woman looking into a mirror that shows multiple different reflections, each a different personality, fragmented identity visual, dreamlike museum quality"],
        slide2: ["Painting of two women facing each other, one clearly copying the other's posture and expression, chameleon-like transformation, subtle uncanny valley effect"],
        slide3: ["Abstract-influenced painting of a woman's figure dissolving at the edges, uncertain boundaries, sense of formlessness, who am I visual metaphor"],
        slide4: ["Pre-Raphaelite woman holding up different theatrical masks, each beautiful but none quite right, soft melancholic lighting, identity quest composition"]
    }
};

// Tips format visual prompts
const tipsVisualPrompts = {
    opening: "Warm-toned classical painting of a woman in peaceful contemplation, soft morning light, sense of hard-won wisdom, gentle strength in her expression, hopeful atmosphere",
    skill: "Painting of hands in gentle self-soothing gesture, soft lighting, comfort and self-care visual, intimate close-up composition, warm tones",
    closing: "Romantic era painting of a woman looking toward a brightening horizon, storm clouds parting behind her, expression of quiet determination, transformative journey visual"
};

function getRandomHookFormula(format: string, topicId: string): { type: string; hook: string } {
    if (format === 'relatable') {
        const formulas = Object.keys(hookFormulas.relatable);
        const randomFormula = formulas[Math.floor(Math.random() * formulas.length)];
        const formulaData = hookFormulas.relatable[randomFormula as keyof typeof hookFormulas.relatable] as any;
        const example = formulaData.examplesByTopic[topicId as keyof typeof formulaData.examplesByTopic] || "";
        return { type: formulaData.name, hook: example };
    } else if (format === 'pov') {
        const examples = (hookFormulas.pov.examplesByTopic as any)[topicId] || [];
        const randomExample = examples[Math.floor(Math.random() * examples.length)] || "";
        return { type: "POV", hook: randomExample };
    } else if (format === 'tips') {
        const formulas = Object.keys(hookFormulas.tips);
        const randomFormula = formulas[Math.floor(Math.random() * formulas.length)];
        const formulaData = hookFormulas.tips[randomFormula as keyof typeof hookFormulas.tips] as any;
        // For tips, we need to customize the example with the topic
        let example = formulaData.examples[Math.floor(Math.random() * formulaData.examples.length)] || "";
        return { type: formulaData.name, hook: example };
    }
    return { type: "Generic", hook: "" };
}

export async function generateDbtSlides(params: DbtGenerateParams) {
    const { format = 'relatable', topic = 'favorite_person', ANTHROPIC_API_KEY, includeBranding = true } = params;

    console.log(`[Native Slides - DBT] Generating for format: ${format}, topic: ${topic}, branding: ${includeBranding ? 'ON' : 'OFF'}`);

    const selectedFormat = contentFormats[format];
    const selectedTopic = topics.find(t => t.id === topic) || topics[0]!;
    const skills = dbtSkillsByTopic[topic] || [];
    const hookData = getRandomHookFormula(format, topic);

    // Build branding instruction based on format and toggle
    let brandingContext = "";
    if (includeBranding) {
        brandingContext = `
## CRITICAL: SLIDE 6 APP MENTION IS MANDATORY
Slide 6 MUST contain a soft, personal app mention. 
- Tone: "the dbt app i use...". 
- Example: "the dbt app i use walks me through this step by step so i don't implode".
- ❌ FAILURE: If Slide 6 does not mention the app, you have failed.
- ❌ NO CTAs: Do not say "download now" or "link in bio".
`;
    } else {
        brandingContext = `
## NO APP MENTION
Slide 6 should be a dry emotional landing or a final self-aware thought.
`;
    }

    const systemPrompt = `You are a viral TikTok slideshow content creator specializing in BPD content for the account "amy_bpd" (personal account, not brand). You share what helps as a person with BPD, not as a company promoting an app.

## TARGET VOICE:
An early-20s person with BPD who's been in therapy, talking to a friend. Not a therapist. Not an influencer. Not trying to go viral.

## CORE VOICE PRINCIPLES:
1. **Lowercase everything.** No caps except for emphasis on ONE word max per slide.
2. **Short sentences.** Line breaks are punctuation. Each line should be one thought. Let white space do the work.
3. **No filler words.** Cut "literally," "actually," "just," "really" unless they're doing real work. Max ONE per slideshow.
4. **No parenthetical asides.** No "(affectionately)" or "(in a good way)" — it reads as trying too hard.
5. **No exclamation points.** Ever. They break the understated tone.
6. **State, don't explain.**
   - ❌ "it sounds stupid but it actually works because..."
   - ✅ "sounds dumb but it works"
7. **Cut the simile if the point already landed.**
   - ❌ "like building muscle before you need to lift something heavy"
   - ✅ "you have to build the muscle before you need to lift"
8. **Therapy concepts in plain language.**
   - ❌ "activates your parasympathetic nervous system"
   - ✅ "forces your heart rate down"
9. **Dark humor is dry, not wacky.** Self-awareness without performance.
   - ❌ "my brain is literally so unhinged lol"
   - ✅ "the spiral looks unhinged when you write it down"

## TOPIC: ${selectedTopic.name}
**Description:** ${selectedTopic.description}

${format === 'tips' ? `
## FORMAT: TIPS/HACKS (Actionable Value Content)
**Purpose:** Drives saves and follows. Position as experienced AND helpful.

**SLIDE STRUCTURE (6 SLIDES TOTAL):**
- Slide 1: Hook (promise of practical value, max 12 words)
- Slides 2-4: THREE DBT skills (one per slide):
  - Do NOT use numbered headers or bold skill names if the skill is already woven into the text.
  - Show the skill in action through first-person experience.
  - Explain briefly in 3-5 short lines.
  - Use plain language, no clinical jargon.
  - **CRITICAL:** Remove numbered headers (1., 2., 3.) when the skill name is woven into the text. Headers create distance. Let the content speak.
- Slide 6: ${includeBranding ? 'MANDATORY APP MENTION (e.g., "the dbt app i use has guided exercises for all of these...")' : 'Final insight or call to save'}

**EXAMPLE TIPS POST (WOVEN SKILLS - NO HEADERS):**
Slide 1: 3 things that actually help when your FP hasn't texted back
Slide 2:
whenever my brain says "they hate you now"
i have to check the facts
the evidence: they took 20 mins to reply
writing it down makes the spiral look unhinged
which is usually the wake up call i need
Slide 3:
if i can't stop the thoughts
i use a temperature reset
ice cubes or cold water on my face
sounds dumb but it forces your heart rate down
so i can actually think again
Slide 4:
i practice opposite action
instead of sending the 47th "are we okay?" text
i do literally anything else
walk. clean. call someone else.
the urge to seek reassurance gets hungrier when you feed it
Slide 5:
practicing these when i'm NOT spiraling is what made them actually work in crisis
you have to build the muscle before you need to lift
Slide 6:
the dbt app i use has guided exercises for all of these — it's the only thing that made them stick

**AVAILABLE DBT SKILLS FOR THIS TOPIC:** ${skills.join(', ')}
` : `
## FORMAT: RELATABLE/EMOTIONAL (Validation Content)
**Purpose:** Community building, high engagement. Makes viewers feel SEEN.

**SLIDE STRUCTURE (6 SLIDES TOTAL):**
- Slide 1: Hook (curiosity gap, max 12 words)
- Slides 2-4: Hyper-specific relatable BPD moments (first-person internal monologue, 3-5 lines each)
- Slide 5: Emotional landing - the "and that's why..." moment (2-3 lines)
- Slide 6: ${includeBranding ? 'MANDATORY soft app mention (e.g., "the dbt app i use calls this wise mind and it actually helps")' : 'Final dry self-aware thought'}

**EXAMPLE RELATABLE POST:**
Slide 1: nobody talks about how having an FP is basically emotional hostage syndrome
Slide 2:
my whole mood for the day
depends on whether they texted back
within a timeframe that feels safe to my brain
Slide 3:
and i know it's irrational
i know they're probably just busy
but my nervous system sees "2 hours" and screams "ABANDONMENT"
Slide 4:
the worst part is pretending i'm fine
smiling, saying "no worries!"
while my brain is already writing the eulogy for the relationship
Slide 5:
i'm not "too much"
i'm just running a dysregulated system
and no one taught me the manual
Slide 6:
the dbt app i use calls this "wise mind" and it actually helps
`}

${brandingContext}

Output ONLY valid JSON. No markdown, no explanation.`;

    const userPrompt = `Generate a 6-slide TikTok slideshow about ${selectedTopic.name}.

**SLIDE 1 HOOK:** "${hookData.hook}"

**FORMAT:** ${format === 'tips' ? 'TIPS/HACKS (numbered DBT skills)' : 'RELATABLE/EMOTIONAL (validation content)'}

**CRITICAL REQUIREMENTS:**
1. **Lowercase/No Exclamation Points:** Use the target voice exactly.
2. ${format === 'tips' ? '**Slides 2-4:** Weave ONE DBT skill naturally into a first-person experience per slide (3-5 lines each). DO NOT use numbered headers like "1. check the facts" — let the content speak.' : '**Slides 2-4:** Hyper-specific relatable moments (3-5 lines each).'}
3. **Slide 6:** ${includeBranding ? 'MUST mention the dbt app using a personal tone ("the dbt app i use..."). THIS IS MANDATORY.' : 'Final dry emotional landing.'}
4. **Independently Quotable:** Each slide should stand on its own.
Return a JSON object with a "slides" key containing an array of 6 strings. Output ONLY the JSON object.

{
    "slides": [
        "slide 1 (hook)",
        "slide 2 (${format === 'tips' ? 'skill woven into experience' : 'moment'})",
        "slide 3 (${format === 'tips' ? 'skill woven into experience' : 'moment'})",
        "slide 4 (${format === 'tips' ? 'skill woven into experience' : 'moment'})",
        "slide 5 (insight)",
        "slide 6 (${includeBranding ? 'app mention' : 'landing'})"
    ]
}
`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        console.error("[Native Slides - DBT] Anthropic API Error:", errorText);
        let errorMessage = "Anthropic API Error";
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }

    const rawData = await claudeResponse.json() as any;
    const resultText = rawData.content?.[0]?.text || '';
    console.log("[Native Slides - DBT] AI Response received");

    // Robust JSON extraction
    const jsonMatch = resultText.match(/[\{\[][\s\S]*[\}\]]/);
    if (!jsonMatch) {
        console.error("[Native Slides - DBT] No JSON found in response:", resultText);
        throw new Error("No JSON found in AI response");
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("[Native Slides - DBT] JSON Parse Error:", e);
        console.error("[Native Slides - DBT] Regex Match attempted on:", resultText);
        console.error("[Native Slides - DBT] Match found:", jsonMatch[0]);
        throw new Error("Failed to parse AI response as JSON");
    }

    // Handle both { slides: [...] } and just [...] formats
    let rawSlides = parsed.slides || (Array.isArray(parsed) ? parsed : []);
    const slides = rawSlides.map((s: any) => {
        const text = typeof s === 'string' ? s : (s.text || JSON.stringify(s));
        return text.replace(/^Slide \d+:\s*/i, '').trim();
    });

    // Generate visual prompts based on topic and format
    const imagePrompts: Record<string, string> = {};
    const topicPrompts = visualPromptsByTopic[topic];

    if (format === 'tips') {
        imagePrompts.slide1 = tipsVisualPrompts.opening;
        for (let i = 2; i <= 4; i++) {
            imagePrompts[`slide${i}`] = tipsVisualPrompts.skill;
        }
        imagePrompts.slide5 = tipsVisualPrompts.closing;
        if (slides.length >= 6) {
            imagePrompts.slide6 = tipsVisualPrompts.closing;
        }
    } else if (topicPrompts) {
        for (let i = 1; i <= Math.min(slides.length, 4); i++) {
            const slideKey = `slide${i}`;
            if (topicPrompts[slideKey] && topicPrompts[slideKey].length > 0) {
                imagePrompts[slideKey] = topicPrompts[slideKey][0] || "";
            }
        }
        // For slides beyond 4, use variation of earlier prompts or tips prompts
        for (let i = 5; i <= slides.length; i++) {
            if (i === 5) {
                imagePrompts[`slide${i}`] = tipsVisualPrompts.closing;
            } else if (i === 6) {
                imagePrompts[`slide${i}`] = "Peaceful classical painting of woman in balanced, centered pose, soft golden light, sense of integration and calm";
            }
        }
    }

    return {
        slides: slides,
        image_prompts: imagePrompts,
        format: selectedFormat,
        topic: selectedTopic,
        hook_type: hookData.type,
        available_skills: skills,
        includeBranding: includeBranding,
        visual_style: selectedTopic.artStyle
    };
}

// Export functions for API
export function getFormats() {
    return Object.values(contentFormats).map(f => ({
        id: f.id,
        name: f.name,
        percentage: f.percentage,
        purpose: f.purpose,
        slideCount: f.slideCount,
        appMentionRule: f.appMentionRule
    }));
}

export function getTopics() {
    return topics.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        artStyle: t.artStyle,
        dbtSkills: dbtSkillsByTopic[t.id] || []
    }));
}

export function getHookFormulas(format: string) {
    if (format === 'relatable') {
        return Object.values(hookFormulas.relatable).map((f: any) => ({
            name: f.name,
            formula: f.formula,
            performance: f.performance
        }));
    } else if (format === 'pov') {
        return [{
            name: "POV",
            formula: hookFormulas.pov.formula,
            performance: "Immersive experience - puts viewer INTO the BPD moment"
        }];
    } else if (format === 'tips') {
        return Object.values(hookFormulas.tips).map((f: any) => ({
            name: f.name,
            formula: f.formula,
            performance: f.performance
        }));
    }
    return [];
}

export function getDbtSkills(topicId?: string) {
    if (topicId && dbtSkillsByTopic[topicId]) {
        return {
            topic: topicId,
            skills: dbtSkillsByTopic[topicId]
        };
    }
    return dbtSkillsByTopic;
}

export function getVisualPrompts(topicId: string, format: string) {
    if (format === 'tips') {
        return {
            format: 'tips',
            prompts: tipsVisualPrompts
        };
    }
    return {
        topic: topicId,
        format: format,
        prompts: visualPromptsByTopic[topicId] || {}
    };
}

// Legacy exports for backward compatibility
export function getFramings() {
    // Map old framing structure to new format structure
    return getFormats();
}

export function getThemes() {
    // Map old theme structure to new topic structure
    return getTopics();
}

export function getCompatibility(framingId: string, themeId: string) {
    // All format/topic combinations are compatible in new framework
    return { compatible: true };
}
