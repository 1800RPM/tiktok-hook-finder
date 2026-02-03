import path from "path";
import { readFileSync, existsSync } from "fs";
import { buildUGCSlide1Prompt } from "../../common/prompt_utils";

export interface SypGenerateParams {
    profile: string;
    topic: string;
    ANTHROPIC_API_KEY: string;
    DATA_DIR: string;
    SYP_DIR: string;
    ugcBasePrompts: any;
    brandingMode?: 'full' | 'soft' | 'none'; // 'full' = mention in slides, 'soft' = description only, 'none' = no mention
}

export async function generateSypSlides(params: SypGenerateParams) {
    const { profile, topic, ANTHROPIC_API_KEY, DATA_DIR, SYP_DIR, ugcBasePrompts, brandingMode = 'full' } = params;

    console.log(`[Native Slides - SYP] Generating for profile: ${profile}, topic: ${topic}, brandingMode: ${brandingMode}`);

    const isLifestyle = topic && topic.startsWith("lifestyle_");
    let forcedStructure = "";

    if (isLifestyle) {
        const categories = ["A", "B", "C", "D", "E", "F", "G"];
        let letter = "";
        if (topic && topic.includes("_")) {
            const parts = topic.split("_");
            if (parts[1]) letter = parts[1].toUpperCase();
        }
        forcedStructure = categories.includes(letter) ? letter : (categories[Math.floor(Math.random() * categories.length)] || "A");
    } else {
        const validStructures = ["A", "B", "C", "D", "E", "F"];
        if (topic && topic.startsWith("structure_")) {
            const parts = topic.split("_");
            if (parts[1]) forcedStructure = parts[1].toUpperCase();
        }
        forcedStructure = validStructures.includes(forcedStructure) ? forcedStructure : (validStructures[Math.floor(Math.random() * validStructures.length)] || "A");
    }

    let frameworkContent = "";
    let imageGuidelines = "";
    try {
        let frameworkPath = isLifestyle
            ? path.join(SYP_DIR, `${forcedStructure}.md`)
            : path.join(SYP_DIR, "syp_slide_framework.md");

        if (existsSync(frameworkPath)) {
            frameworkContent = readFileSync(frameworkPath, "utf-8");
            const guidelinesMatch = frameworkContent.match(/## IMAGE GUIDELINES\s*([\s\S]*?)(?=\n##|$)/i);
            if (guidelinesMatch && guidelinesMatch[1]) {
                imageGuidelines = guidelinesMatch[1].trim();
            }
        } else {
            throw new Error(`Framework not found at ${frameworkPath}`);
        }
    } catch (e) {
        console.error("Error reading framework:", e);
        throw e;
    }

    const profiles: { [key: string]: any } = {
        "lisa_milo": { name: "Lisa", pet: "Hund (Milo)", type: "dog", vars: { TIER: "Hund", NAME: "Milo" } },
        "anna_simba": { name: "Anna", pet: "Katze (Simba)", type: "cat", vars: { TIER: "Katze", NAME: "Simba" } }
    };
    const selectedProfile = profiles[profile] || profiles["lisa_milo"];

    // Build branding instruction based on brandingMode AND topic type
    let brandingInstruction = '';

    if (brandingMode === 'none') {
        // MODE: NONE - No mention of saveyourpet.de anywhere
        if (isLifestyle) {
            // For LIFESTYLE formats, the replacement depends on the category
            const lifestyleReplacements: { [key: string]: string } = {
                'A': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Browser-Tabs)
- ❌ ERWÄHNE saveyourpet.de NICHT! Kein "saveyourpet.de" in irgendeiner Slide!
- ✅ Ersetze die saveyourpet.de-Slide durch EINE WEITERE LUSTIGE GOOGLE-SUCHE!
  - Beispiel: "Tierarzt Kosten nachts teuer?" oder "Hund OP Kosten Deutschland" oder "Wie viel kostet Tierarzt Notdienst"
  - Die Suche sollte subtil auf Kosten/Vorsorge hinweisen aber authentisch klingen
- ✅ ALLE Slides müssen als Browser-Tabs/Google-Suchen formatiert sein (außer Hook und Closer)`,

                'B': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Checkliste)
- ❌ ERWÄHNE saveyourpet.de NICHT!
- ✅ Ersetze die saveyourpet.de-Slide durch einen weiteren Checklisten-Punkt der zum Thema passt`,

                'C': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Zwei Typen)
- ❌ ERWÄHNE saveyourpet.de NICHT!
- ✅ Lass die saveyourpet.de-Slide komplett weg oder ersetze sie durch einen weiteren Vergleichspunkt`,

                'D': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Nacht/Overthinking)
- ❌ ERWÄHNE saveyourpet.de NICHT!
- ✅ Ersetze die saveyourpet.de-Slide durch einen weiteren nächtlichen Gedanken`,

                'E': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Starter Pack)
- ❌ ERWÄHNE saveyourpet.de NICHT!
- ✅ Ersetze die saveyourpet.de-Slide durch ein weiteres Starter-Pack-Item`,

                'F': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Apps/Handy)
- ❌ ERWÄHNE saveyourpet.de NICHT!
- ✅ Ersetze die saveyourpet.de-Slide durch eine weitere App oder Handy-Benachrichtigung`,

                'G': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (Lessons Learned)
- ❌ ERWÄHNE saveyourpet.de NICHT!
- ✅ Ersetze die saveyourpet.de-Slide durch eine weitere gelernte Lektion`,

                'H': `## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE (POV Main Character)
- ❌ ERWÄHNE saveyourpet.de NICHT!
- ✅ Ersetze die saveyourpet.de-Slide durch einen weiteren POV-Moment`
            };

            brandingInstruction = lifestyleReplacements[forcedStructure] ?? lifestyleReplacements['A'] ?? '';
        } else {
            // For STANDARD SYP formats (Kosten-based), use reflective statements
            brandingInstruction = `
## ⚠️ WICHTIG: KEINE WERBUNG / NO BRANDING MODE
Da der Benutzer "SaveYourPet erwähnen" DEAKTIVIERT hat:
- ❌ ERWÄHNE saveyourpet.de NICHT! Kein "saveyourpet.de" in irgendeiner Slide!
- ❌ Keine Webseiten, keine Links, keine Produktempfehlungen
- ✅ Ersetze die SaveYourPet-Slide durch etwas Relatables zum Thema KOSTEN:
  - "Ich hätte das früher wissen müssen"
  - "Lesson learned. Teuer gelernt."
  - "Tja. Jetzt weiß ich's."
  - "Die teuerste Lektion bisher"
  - "Nächstes Mal besser vorbereitet"
- ✅ Der Ton bleibt trocken, resigniert, authentisch - aber KEINE Werbung!`;
        }
    } else if (brandingMode === 'soft') {
        // MODE: SOFT - No saveyourpet.de in slides, but include insurance-related content
        // This enables the description to naturally mention saveyourpet.de
        if (isLifestyle) {
            const lifestyleSoftBranding: { [key: string]: string } = {
                'A': `## ⚠️ WICHTIG: SOFT BRANDING MODE (Browser-Tabs)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt in den Slides!
- ✅ ABER: Eine der Google-Suchen MUSS mit Tierkrankenversicherung/Absicherung zu tun haben!
  - Beispiele: "Tierkrankenversicherung sinnvoll?", "Hund absichern wie?", "Katze versichern Kosten", "Tierarztkosten absichern"
  - Das macht die Description mit saveyourpet.de-Erwähnung authentisch!`,

                'B': `## ⚠️ WICHTIG: SOFT BRANDING MODE (Checkliste)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt!
- ✅ Ein Checklisten-Punkt MUSS mit Absicherung/Versicherung zu tun haben!
  - Beispiele: "Hat den Liebling abgesichert ✓", "Tierkrankenversicherung ✓", "Für Notfälle vorgesorgt ✓"`,

                'C': `## ⚠️ WICHTIG: SOFT BRANDING MODE (Zwei Typen)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt!
- ✅ Ein Vergleichspunkt bei Typ 2 MUSS mit Absicherung zu tun haben!
  - Beispiele: Typ 1 "Hofft einfach, dass nichts passiert" vs Typ 2 "Hat seinen Liebling abgesichert"`,

                'D': `## ⚠️ WICHTIG: SOFT BRANDING MODE (Nacht/Overthinking)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt!
- ✅ Ein nächtlicher Gedanke MUSS mit Absicherung/Vorsorge zu tun haben!
  - Beispiele: "Was wenn ${selectedProfile.vars.NAME} mal krank wird?", "Bin ich auf einen Notfall vorbereitet?"`,

                'E': `## ⚠️ WICHTIG: SOFT BRANDING MODE (Starter Pack)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt!
- ✅ Ein Starter-Pack-Item MUSS mit Absicherung zu tun haben!
  - Beispiele: "Die Tierkrankenversicherung", "Für alle Fälle vorgesorgt"`,

                'F': `## ⚠️ WICHTIG: SOFT BRANDING MODE (Apps/Handy)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt!
- ✅ Eine App/Notification MUSS mit Versicherung/Absicherung zu tun haben!
  - Beispiele: "Reminder: Tierkrankenversicherung abschließen", "Absicherung-Check erledigt"`,

                'G': `## ⚠️ WICHTIG: SOFT BRANDING MODE (Lessons Learned)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt!
- ✅ Eine Lektion MUSS mit Vorsorge/Absicherung zu tun haben!
  - Beispiele: "Früher vorsorgen als ich", "Tierkrankenversicherung ist kein Luxus"`,

                'H': `## ⚠️ WICHTIG: SOFT BRANDING MODE (POV Main Character)
- ❌ ERWÄHNE saveyourpet.de NICHT direkt!
- ✅ Ein POV-Moment MUSS mit Absicherung zu tun haben!
  - Beispiele: "POV: Du hast deinen Liebling endlich abgesichert"`
            };

            brandingInstruction = lifestyleSoftBranding[forcedStructure] ?? lifestyleSoftBranding['A'] ?? '';
        } else {
            // For STANDARD SYP formats (Kosten-based)
            brandingInstruction = `
## ⚠️ WICHTIG: SOFT BRANDING MODE
- ❌ ERWÄHNE saveyourpet.de NICHT direkt in den Slides!
- ✅ ABER: Eine Slide MUSS subtil auf Tierkrankenversicherung/Absicherung hinweisen!
  - Beispiele für diese Slide:
    - "Hat seinen Liebling abgesichert"
    - "Für sowas bin ich jetzt vorbereitet"
    - "Tierkrankenversicherung: beste Entscheidung"
    - "Wenigstens ist ${selectedProfile.vars.NAME} jetzt abgesichert"
  - Das ermöglicht, dass saveyourpet.de in der Description erwähnt werden kann
  - Der Hinweis soll sich natürlich anfühlen, nicht wie Werbung`;
        }
    }
    // MODE: FULL - brandingInstruction stays empty, framework uses saveyourpet.de naturally

    const systemPrompt = `You are the AI engine for 'SaveYourPet'. Your goal is to generate viral TikTok slide content in GERMAN.
You MUST strictly follow the provided framework content below.

${frameworkContent}
${brandingInstruction}
IMPORTANT: The user has chosen the profile: ${selectedProfile.name} & ${selectedProfile.pet}.
Use the variables: [TIER]="${selectedProfile.vars.TIER}", [NAME]="${selectedProfile.vars.NAME}".
`;

    // Build branding reminder for user prompt
    const brandingReminder = brandingMode === 'full'
        ? ''
        : brandingMode === 'soft'
            ? `\n⚠️ REMEMBER: Include insurance/Absicherung themes but DO NOT mention "saveyourpet.de" directly in slides!`
            : `\n⚠️ CRITICAL REMINDER: DO NOT mention "saveyourpet.de" or any website! Replace the brand slide with a non-promotional relatable statement.`;

    // Generate random seed for variation
    const variationSeed = Math.floor(Math.random() * 1000);

    let userPrompt = "";
    if (isLifestyle) {
        userPrompt = `Generate a viral TikTok slide deck for ${selectedProfile.vars.TIER} ${selectedProfile.vars.NAME} using the LIFESTYLE Framework.
OUTPUT LANGUAGE: GERMAN.
VARIATION SEED: ${variationSeed} (use this to inspire unique content!)

MANDATORY INSTRUCTION:
1. You MUST use **KATEGORIE ${forcedStructure}** (from the "HOOK-KATEGORIEN" section).
2. **CRITICAL - VARIATION REQUIRED:** 
   - ❌ DO NOT just copy the example searches from the framework!
   - ✅ INVENT NEW, CREATIVE Google searches that fit the theme
   - ✅ Mix absurd, funny, and relatable searches
   - ✅ Each generation must feel FRESH and UNIQUE
   
   **BEISPIELE FÜR KREATIVE SUCHEN (Hund):**
   - "Hund hat Socke gefressen was tun"
   - "Mein Hund guckt mich komisch an"
   - "Hund schläft nur auf meinem Kopfkissen normal?"
   - "Warum folgt mir mein Hund aufs Klo"
   - "Hund hat Angst vor seinem Schatten"
   - "Mein Hund hasst den Staubsauger Hilfe"
   - "Hund bellt den Fernseher an warum"
   - "Kann mein Hund meine Gedanken lesen"
   - "Hund dreht sich 10x im Kreis bevor er liegt"
   - "Warum leckt mein Hund die Wand"
   - "Hund hat meinen AirPod gefressen"
   - "Tierarzt Notdienst Kosten nachts"
   
   **BEISPIELE FÜR KREATIVE SUCHEN (Katze):**
   - "Katze starrt in leere Ecke Geister?"
   - "Meine Katze klopft Sachen vom Tisch absichtlich"
   - "Katze sitzt auf meinem Laptop warm?"
   - "Warum miaut meine Katze um 4 Uhr morgens"
   - "Katze versteckt sich unter der Decke"
   - "Meine Katze trinkt nur aus dem Wasserhahn"
   - "Katze knetet mich mit Krallen aua"
   - "Warum bringt mir meine Katze tote Mäuse"
   
3. **TONE UPDATE:** Use subtle German Gen-Z slang. Be mysterious.${brandingMode === 'full' ? ' Do NOT explain saveyourpet.de.' : ''}
4. **CLOSER VARIATION:** The last slide should be creative too - not always "Er schläft. Ich google."
   Try: "Nächste Woche neue Suchanfragen. Garantiert. 🐕" oder "Mein Suchverlauf sagt alles. 🙃" oder "[NAME] ist das alles egal. Mir nicht. 🐶"
5. Strictly follow the "OUTPUT-FORMAT".${brandingReminder}
`;
    } else {
        userPrompt = `Generate a viral TikTok slide deck for ${selectedProfile.vars.TIER} ${selectedProfile.vars.NAME}.
OUTPUT LANGUAGE: GERMAN.
MANDATORY INSTRUCTION:
1. You MUST use **Struktur ${forcedStructure}** (from the "SLIDE-STRUKTUREN" section).
2. DO NOT use the example values if possible. Mix and match variables.
3. AVOID repeating "Socke" or "Biene" if you used them recently.
4. **TONE UPDATE:** Use subtle German Gen-Z slang. Mix normal casing with lowercase.
5. Strictly follow the "OUTPUT-FORMAT".${brandingReminder}
`;
    }

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
        const errorData = await claudeResponse.json() as any;
        throw new Error(errorData.error?.message || "Claude API Error");
    }

    const rawData = await claudeResponse.json() as any;
    const resultText = rawData.content?.[0]?.text || '';

    const lines = resultText.split('\n');
    const rawSlides = lines
        .filter((line: string) => /^\**Slide\s*\d+/i.test(line.trim()))
        .map((line: string) => line.replace(/\*\*/g, '').trim());

    const cleanedSlides = rawSlides.map((s: string) => {
        // Correctly extract just the content after "Slide X:" to avoid double prefixing
        // Regex handles "Slide 1: content", "Slide 1 (context): content", "**Slide 1**: content", etc.
        const contentMatch = s.match(/^Slide\s*\d+\s*(?:\([^)]+\))?[:\-]?\s*(.*)/i);
        if (contentMatch && contentMatch[1]) {
            return contentMatch[1].trim();
        }
        return s.replace(/^Slide\s*\d+[:\-]?\s*/i, '').trim();
    });

    if (cleanedSlides.length === 0) return { slides: [resultText], profile: selectedProfile };

    // Persona selection: lisa_milo uses 'lisa' persona, cats use 'luna', other dogs use 'mia'
    let personaId: string;
    if (profile === 'lisa_milo') {
        personaId = 'lisa'; // Use the new curvy Lisa persona
    } else if (selectedProfile.type === 'cat') {
        personaId = 'luna';
    } else {
        personaId = 'mia';
    }

    const personasData = JSON.parse(readFileSync(path.join(DATA_DIR, "personas.json"), 'utf-8'));
    const persona = personasData.personas.find((p: any) => p.id === personaId) || personasData.personas[0];
    const scrollStoppers = JSON.parse(readFileSync(path.join(DATA_DIR, "scroll_stoppers.json"), 'utf-8'));

    // Load outfit options and select a random one
    let selectedOutfit = null;
    try {
        const outfitsPath = path.join(DATA_DIR, "syp_outfits.json");
        if (existsSync(outfitsPath)) {
            const outfitsData = JSON.parse(readFileSync(outfitsPath, 'utf-8'));
            const outfits = outfitsData.outfits;
            selectedOutfit = outfits[Math.floor(Math.random() * outfits.length)];
            console.log(`[SYP Service] Selected outfit: ${selectedOutfit.id} - ${selectedOutfit.name}`);
        }
    } catch (e) {
        console.log('[SYP Service] Could not load outfits, using default');
    }

    // Load setting options and select a random one
    let selectedSetting = null;
    try {
        const settingsPath = path.join(DATA_DIR, "syp_settings.json");
        if (existsSync(settingsPath)) {
            const settingsData = JSON.parse(readFileSync(settingsPath, 'utf-8'));
            const settings = settingsData.settings;
            selectedSetting = settings[Math.floor(Math.random() * settings.length)];
            console.log(`[SYP Service] Selected setting: ${selectedSetting.id} - ${selectedSetting.name}`);
        }
    } catch (e) {
        console.log('[SYP Service] Could not load settings, using default');
    }

    const slide1Text = cleanedSlides[0].replace(/^Slide \d+:\s*/i, '');
    const ugcSlide1Prompt = buildUGCSlide1Prompt(persona, scrollStoppers, slide1Text, ugcBasePrompts, undefined, true, DATA_DIR, selectedOutfit, selectedSetting);

    // Detect which slides contain saveyourpet.de or related content (Absicherung, Vorsorge, etc.)
    const saveyourpetKeywords = [
        'saveyourpet.de', 'saveyourpet',
        'absicherung', 'vorsorge', 'schutz für',
        'was wenn er mal krank wird', 'was wenn sie mal krank wird',
        'bin ich auf einen notfall vorbereitet', 'sollte ich mich besser absichern',
        'hat vorgesorgt', 'hat sich um absicherung gekümmert'
    ];

    const saveyourpetSlideIndices: number[] = [];
    cleanedSlides.forEach((slide: string, index: number) => {
        const lowerSlide = slide.toLowerCase();
        if (saveyourpetKeywords.some(keyword => lowerSlide.includes(keyword))) {
            saveyourpetSlideIndices.push(index + 1); // 1-indexed for slide numbers
            console.log(`[SYP Service] Detected saveyourpet.de related content in Slide ${index + 1}: "${slide}"`);
        }
    });

    if (saveyourpetSlideIndices.length > 0) {
        console.log(`[SYP Service] Will apply LAPTOP/OVER-THE-SHOULDER prompt for slide(s): ${saveyourpetSlideIndices.join(', ')}`);
    }

    // Build special instruction for saveyourpet.de slides
    let saveyourpetImageInstruction = '';
    if (saveyourpetSlideIndices.length > 0 && brandingMode === 'full') {
        saveyourpetImageInstruction = `

## CRITICAL: SAVEYOURPET.DE SLIDE SPECIAL TREATMENT
For slide(s) ${saveyourpetSlideIndices.join(', ')} (the saveyourpet.de / Absicherung slide):
- Use OVER-THE-SHOULDER perspective
- Show person looking at LAPTOP screen (NOT phone!)
- Laptop displays saveyourpet.de website (use reference image)
- Pet (${selectedProfile.vars.NAME}) should be visible - sleeping behind laptop or lying nearby
- Setting: On bed with laptop, cozy apartment vibe
- Laptop screen should take 25-40% of image, clearly visible

EXACT PROMPT FORMAT for saveyourpet.de slide:
"Over-the-shoulder shot, same ${persona.subject.hair.color} girl on bed looking at laptop screen showing saveyourpet.de [reference image], ${selectedProfile.vars.NAME} sleeping behind laptop, soft lamp lighting, raw UGC aesthetic, laptop screen clearly visible"

This is the ONLY slide where looking at a device is shown. All other slides should be iPhone selfie style.`;
    }

    const sypImageSystemPrompt = `You create ULTRA-REALISTIC image prompts for 'SaveYourPet'. Same identity as persona. Funny/Sarcastic tone.

## ⚠️ CRITICAL CONSTRAINT - SELFIE HAND LOGIC:
The image is a SELFIE taken with an iPhone front-camera. ONE HAND MUST HOLD THE PHONE to take the photo.

### ❌ NEVER SHOW A PHONE SCREEN OR HOLD A SECOND PHONE:
- **NO PHONE VISIBLE:** The person should NEVER hold a phone in their hand or show a phone screen to the camera.
- **THE PHONE IS TAKING THE PHOTO:** The phone being used is the camera itself (front-camera selfie). It is impossible to show its screen.
- **NO SECOND PHONE:** Do not include a second phone in the scene.
- "holding up phone showing..." -> ❌ PHYSICALLY IMPOSSIBLE & FORBIDDEN
- "phone screen displaying..." -> ❌ PHYSICALLY IMPOSSIBLE & FORBIDDEN
- "person looking at phone" -> ❌ FORBIDDEN (she is looking at the camera/herself)

### ❌ NEVER USE THESE (physically impossible for selfies):
- "both hands covering mouth" - no hand to hold the phone
- "both hands on face" - no hand to hold the phone  
- "hands together in prayer" - no hand to hold the phone
- "both hands gesturing" - no hand to hold the phone
- Any pose requiring BOTH hands to do something

### ✅ VALID HAND POSITIONS (one hand only):
- One hand touching face, resting, gesturing, petting pet, covering mouth, etc.
- The other hand is IMPLIED to be holding the phone (never mention it)
- OR: Mirror selfie where phone is visible but held naturally in one hand.

### ONLY EXCEPTION: 
The saveyourpet.de / Absicherung slide uses a **LAPTOP** with an **OVER-THE-SHOULDER** shot (not a selfie). This is the ONLY time a device screen is shown.
` + `
Slide 1: ${ugcSlide1Prompt}
Persona: ${persona.name} (${persona.subject.hair.color}, ${persona.subject.hair.style})
Pet: ${selectedProfile.vars.NAME} (${persona.pet.description})${saveyourpetImageInstruction}`;

    const imagePromptResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 2000,
            system: sypImageSystemPrompt,
            messages: [{ role: 'user', content: `Generate JSON prompts image2 to image${cleanedSlides.length}:\n${cleanedSlides.join('\n')}` }]
        })
    });

    let imagePrompts: any = { image1: ugcSlide1Prompt };
    if (imagePromptResponse.ok) {
        const imgData = await imagePromptResponse.json() as any;
        const imgText = imgData.content?.[0]?.text || '';
        const jsonMatch = imgText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsedPrompts = JSON.parse(jsonMatch[0]);
                imagePrompts = { image1: ugcSlide1Prompt, ...parsedPrompts };
            } catch (parseError) {
                console.warn("[SYP Service] Failed to parse image prompts JSON, using default:", parseError);
                // Keep the default imagePrompts with just image1
            }
        }
    }

    return {
        slides: cleanedSlides,
        image_prompts: imagePrompts,
        image1_text: ugcSlide1Prompt,
        character_name: persona.name,
        profile: selectedProfile
    };
}
