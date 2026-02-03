// src/projects/dbt/dbt_service.ts
var contentFormats = {
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
var topics = [
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
var hookFormulas = {
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
var dbtSkillsByTopic = {
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
var visualPromptsByTopic = {
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
var tipsVisualPrompts = {
  opening: "Warm-toned classical painting of a woman in peaceful contemplation, soft morning light, sense of hard-won wisdom, gentle strength in her expression, hopeful atmosphere",
  skill: "Painting of hands in gentle self-soothing gesture, soft lighting, comfort and self-care visual, intimate close-up composition, warm tones",
  closing: "Romantic era painting of a woman looking toward a brightening horizon, storm clouds parting behind her, expression of quiet determination, transformative journey visual"
};
function getRandomHookFormula(format, topicId) {
  if (format === "relatable") {
    const formulas = Object.keys(hookFormulas.relatable);
    const randomFormula = formulas[Math.floor(Math.random() * formulas.length)];
    const formulaData = hookFormulas.relatable[randomFormula];
    const example = formulaData.examplesByTopic[topicId] || "";
    return { type: formulaData.name, hook: example };
  } else if (format === "pov") {
    const examples = hookFormulas.pov.examplesByTopic[topicId] || [];
    const randomExample = examples[Math.floor(Math.random() * examples.length)] || "";
    return { type: "POV", hook: randomExample };
  } else if (format === "tips") {
    const formulas = Object.keys(hookFormulas.tips);
    const randomFormula = formulas[Math.floor(Math.random() * formulas.length)];
    const formulaData = hookFormulas.tips[randomFormula];
    let example = formulaData.examples[Math.floor(Math.random() * formulaData.examples.length)] || "";
    return { type: formulaData.name, hook: example };
  }
  return { type: "Generic", hook: "" };
}
async function generateDbtSlides(params) {
  const { format = "relatable", topic = "favorite_person", ANTHROPIC_API_KEY, includeBranding = true } = params;
  console.log(`[Native Slides - DBT] Generating for format: ${format}, topic: ${topic}, branding: ${includeBranding ? "ON" : "OFF"}`);
  const selectedFormat = contentFormats[format];
  const selectedTopic = topics.find((t) => t.id === topic) || topics[0];
  const skills = dbtSkillsByTopic[topic] || [];
  const hookData = getRandomHookFormula(format, topic);
  let brandingContext = "";
  if (format === "relatable") {
    brandingContext = includeBranding ? `Include a soft app mention on the LAST slide only (1 in 5 style). Use personal discovery tone like "my DBT app calls this 'wise mind' and it's the first thing that actually helped" or "the DBT app I use has a whole module on this and it finally made sense". NEVER say "This app is great" or "Check out this amazing app".` : `DO NOT mention any app. Focus purely on relatable content and emotional validation.`;
  } else if (format === "pov") {
    brandingContext = includeBranding ? `Do NOT mention the app in the slides (POV is about the EXPERIENCE, not solutions). If you must mention it, note it goes in the description only, not the slides.` : `DO NOT mention any app. Focus purely on the immersive experience.`;
  } else if (format === "tips") {
    brandingContext = includeBranding ? `Include natural app integration on slide 5 (after delivering value). Use tone like "my DBT app walks you through each of these step by step" or "the app I use has guided exercises for [skill] — it's the only thing that made it stick". The app mention answers: "okay but how do I actually DO this?"` : `DO NOT mention any app. Focus purely on the DBT skills and practical value.`;
  }
  const systemPrompt = `You are a viral TikTok slideshow content creator specializing in BPD content for the account "amy_bpd" (personal account, not brand). You share what helps as a person with BPD, not as a company promoting an app.

## CONTENT FORMAT: ${selectedFormat.name}

**Purpose:** ${selectedFormat.purpose}
**Slide Structure:**
${selectedFormat.structure.map((s) => `- Slide ${s.slide}: ${s.function} (${s.textStyle})`).join(`
`)}

**App Mention Rules:** ${selectedFormat.appMentionRule}

## TOPIC: ${selectedTopic.name}

**Description:** ${selectedTopic.description}
**Art Style:** ${selectedTopic.artStyle}

## HOOK TO USE

**Type:** ${hookData.type}
**Hook:** "${hookData.hook}"
${format === "tips" ? `
**Available DBT Skills for this topic:** ${skills.join(", ")}` : ""}

## WRITING GUIDELINES

### DO:
- First person ("I", "my brain") not second person
- Hyper-specific situations, not general statements
- Internal monologue revealing hidden experience
- Slight dark humor / self-aware tone
- Use therapy speak naturally (splitting, FP, dissociating, masking)
- Contrast structure (external appearance vs internal chaos)
- Lowercase TikTok native style ("tho" not "though", minimal punctuation)
- Present tense for immediacy
- Specific numbers for humor ("the 47th time" not "constantly")

### DON'T:
- Generic statements ("People with BPD experience...")
- Educational tone or clinical framing
- Advice-giving (except in tips format)
- Second person ("You feel...")
- Excessive self-deprecation without warmth
- Hopeless endings without solidarity

### TEXT EXAMPLES:

❌ Generic: "People with BPD experience fear of abandonment"
✅ Viral: "rereading our entire text thread 6 times looking for signs he's losing interest"

❌ Generic: "BPD causes emotional dysregulation"  
✅ Viral: "going from 'best day ever' to 'I want to disappear' because someone's reply felt off"

## FORMAT-SPECIFIC RULES

${format === "relatable" ? `
**Relatable/Emotional Format:**
- Slide 1: Use the provided hook (curiosity gap, max 12 words)
- Slides 2-4: Escalating relatable moments, first-person internal monologue
- Slide 5: Emotional landing - the "and that's why..." moment
- Slide 6: Soft app hook ONLY if branding enabled (use appMentionTemplates.relatable examples)
- Goal: Make viewers feel SEEN, drive "this is me" comments
` : ""}

${format === "pov" ? `
**POV Format:**
- Slide 1: "POV: [specific BPD moment]" - establish the scenario
- Slides 2-3: Show what happens internally (immersion)
- Slide 4: The contrast/twist - external vs internal
- Slide 5 (optional): Resolution or continuation
- Goal: Drive watch time and shares (people send to partners/friends to explain their experience)
` : ""}

${format === "tips" ? `
**Tips/Hacks Format:**
- Slide 1: Use the hook formula (promise of practical value)
- Slides 2-4: The tips - DBT skills explained simply, one per slide
  * Available skills: ${skills.join(", ")}
  * Pick 2-3 most relevant skills for this topic
  * Explain each in simple, actionable terms
- Slide 5: App integration (if branding enabled) - natural "here's how to practice"
- Slide 6 (optional): Soft CTA - "save for later, follow for more"
- Goal: Drive saves and follows, position as helpful AND experienced
` : ""}

## CONTENT SAFETY

**Always:**
- Frame BPD experiences with compassion
- Show coping and growth alongside struggle
- Include moments of connection and love
- End on notes of hope, solidarity, or gentle humor

**Never:**
- Glorify or romanticize self-harm or crisis
- Present BPD as inherently abusive or toxic
- Create content that could be used to mock people with BPD

${brandingContext}

Output ONLY valid JSON. No markdown, no explanation.`;
  const userPrompt = `Generate a TikTok slideshow using the ${selectedFormat.name} format about ${selectedTopic.name}.

**HOOK TO START WITH:** "${hookData.hook}"

**REQUIREMENTS:**
1. Match the format structure exactly (${selectedFormat.slideCount} slides)
2. Use the provided hook for slide 1
3. ${format === "relatable" ? "Slides 2-4: Hyper-specific relatable moments, slide 5: Emotional landing, slide 6: Optional app mention (if branding enabled)" : ""}
4. ${format === "pov" ? "Slide 1: POV hook, slides 2-3: Internal experience, slide 4: Contrast/twist, slide 5 (optional): Resolution" : ""}
5. ${format === "tips" ? `Slides 2-4: Tips using these DBT skills: ${skills.slice(0, 3).join(", ")}, slide 5: App integration (if branding enabled), slide 6: Soft CTA` : ""}
6. Use lowercase TikTok native style throughout
7. Each slide should be quotable independently
8. Make the viewer feel SEEN and understood

Return JSON:
{
    "slides": [
        "slide 1 text",
        "slide 2 text",
        "slide 3 text",
        "slide 4 text",
        "slide 5 text"${format !== "pov" ? `,
        "slide 6 text"` : ""}
    ]
}`;
  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!claudeResponse.ok) {
    const errorData = await claudeResponse.json();
    throw new Error(errorData.error?.message || "Anthropic API Error");
  }
  const rawData = await claudeResponse.json();
  const resultText = rawData.content?.[0]?.text || "";
  const jsonMatch = resultText.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error("No JSON found in AI response");
  const parsed = JSON.parse(jsonMatch[0]);
  const slides = (parsed.slides || []).map((s) => s.replace(/^Slide \d+:\s*/i, ""));
  const imagePrompts = {};
  const topicPrompts = visualPromptsByTopic[topic];
  if (format === "tips") {
    imagePrompts.slide1 = tipsVisualPrompts.opening;
    for (let i = 2;i <= 4; i++) {
      imagePrompts[`slide${i}`] = tipsVisualPrompts.skill;
    }
    imagePrompts.slide5 = tipsVisualPrompts.closing;
    if (slides.length >= 6) {
      imagePrompts.slide6 = tipsVisualPrompts.closing;
    }
  } else if (topicPrompts) {
    for (let i = 1;i <= Math.min(slides.length, 4); i++) {
      const slideKey = `slide${i}`;
      if (topicPrompts[slideKey] && topicPrompts[slideKey].length > 0) {
        imagePrompts[slideKey] = topicPrompts[slideKey][0] || "";
      }
    }
    for (let i = 5;i <= slides.length; i++) {
      if (i === 5) {
        imagePrompts[`slide${i}`] = tipsVisualPrompts.closing;
      } else if (i === 6) {
        imagePrompts[`slide${i}`] = "Peaceful classical painting of woman in balanced, centered pose, soft golden light, sense of integration and calm";
      }
    }
  }
  return {
    slides,
    image_prompts: imagePrompts,
    format: selectedFormat,
    topic: selectedTopic,
    hook_type: hookData.type,
    available_skills: skills,
    includeBranding,
    visual_style: selectedTopic.artStyle
  };
}
function getFormats() {
  return Object.values(contentFormats).map((f) => ({
    id: f.id,
    name: f.name,
    percentage: f.percentage,
    purpose: f.purpose,
    slideCount: f.slideCount,
    appMentionRule: f.appMentionRule
  }));
}
function getTopics() {
  return topics.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    artStyle: t.artStyle,
    dbtSkills: dbtSkillsByTopic[t.id] || []
  }));
}
function getHookFormulas(format) {
  if (format === "relatable") {
    return Object.values(hookFormulas.relatable).map((f) => ({
      name: f.name,
      formula: f.formula,
      performance: f.performance
    }));
  } else if (format === "pov") {
    return [{
      name: "POV",
      formula: hookFormulas.pov.formula,
      performance: "Immersive experience - puts viewer INTO the BPD moment"
    }];
  } else if (format === "tips") {
    return Object.values(hookFormulas.tips).map((f) => ({
      name: f.name,
      formula: f.formula,
      performance: f.performance
    }));
  }
  return [];
}
function getDbtSkills(topicId) {
  if (topicId && dbtSkillsByTopic[topicId]) {
    return {
      topic: topicId,
      skills: dbtSkillsByTopic[topicId]
    };
  }
  return dbtSkillsByTopic;
}
function getVisualPrompts(topicId, format) {
  if (format === "tips") {
    return {
      format: "tips",
      prompts: tipsVisualPrompts
    };
  }
  return {
    topic: topicId,
    format,
    prompts: visualPromptsByTopic[topicId] || {}
  };
}
function getFramings() {
  return getFormats();
}
function getThemes() {
  return getTopics();
}
function getCompatibility(framingId, themeId) {
  return { compatible: true };
}
export {
  getVisualPrompts,
  getTopics,
  getThemes,
  getHookFormulas,
  getFramings,
  getFormats,
  getDbtSkills,
  getCompatibility,
  generateDbtSlides
};
