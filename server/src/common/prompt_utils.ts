import path from "path";
import { existsSync, readFileSync } from "fs";
import type { ReferenceImage } from "../image_generator";

// Cache for photography frameworks
let photographyFrameworks: { [key: string]: any } = {};

/**
 * Load photography framework for a project
 */
export function loadPhotographyFramework(projectKey: 'syp' | 'dbt', dataDir: string): any {
    const cacheKey = projectKey;
    if (photographyFrameworks[cacheKey]) {
        return photographyFrameworks[cacheKey];
    }

    const projectFolder = projectKey === 'syp' ? 'SaveYourPet' : 'DBT-Mind';
    const frameworkPath = path.join(dataDir, "frameworks", projectFolder, "photography.json");

    if (existsSync(frameworkPath)) {
        try {
            const content = readFileSync(frameworkPath, 'utf-8');
            photographyFrameworks[cacheKey] = JSON.parse(content);
            console.log(`📸 Loaded photography framework for ${projectFolder}`);
            return photographyFrameworks[cacheKey];
        } catch (e) {
            console.error(`[Photography] Error loading framework for ${projectFolder}:`, e);
        }
    }
    return null;
}

/**
 * Get character anchor image data if it exists
 */
export function getAnchorImage(personaId: string, anchorsDir: string): ReferenceImage | null {
    const anchorPath = path.join(anchorsDir, `${personaId}.png`);
    if (existsSync(anchorPath)) {
        try {
            const data = readFileSync(anchorPath, "base64");
            return { data, mimeType: "image/png" } as ReferenceImage;
        } catch (e) {
            console.error(`[Anchor] Error reading anchor for ${personaId}:`, e);
        }
    }
    return null;
}

/**
 * Build a hyper-realistic UGC Slide 1 image prompt as a detailed string.
 * Now uses the dedicated photography framework files for each project.
 */
export function buildUGCSlide1Prompt(
    persona: any,
    scrollStoppers: any,
    slideText: string,
    ugcBasePrompts: any,
    settingOverride?: string,
    isSyp: boolean = false,
    dataDir?: string,
    outfit?: any,  // Optional outfit from syp_outfits.json
    settingData?: any  // Optional setting from syp_settings.json
): string {
    const projectKey = isSyp ? 'syp' : 'dbt';

    // Load project-specific photography framework
    const photoFramework = dataDir ? loadPhotographyFramework(projectKey, dataDir) : null;

    // Fallback to ugcBasePrompts if no photography framework
    const projectBase = ugcBasePrompts?.[projectKey] || ugcBasePrompts?.['dbt'];
    const slide1Base = projectBase?.slide_1_base;

    // 1. Analyze Context from Slide Text (Time, Vibe)
    const lowerText = slideText.toLowerCase();
    let timeContext: 'night' | 'morning' | 'neutral' = 'neutral';

    if (lowerText.match(/3\s*uhr|3\s*am|nacht|night|schlafen|sleep|wach|awake|dunkel|dark/i)) {
        timeContext = 'night';
    } else if (lowerText.match(/morgen|morning|aufstehen|wake up|kaffee|coffee|früh|early/i)) {
        timeContext = 'morning';
    }

    // 2. Select scroll-stopping elements
    const gesture = scrollStoppers.gestures[Math.floor(Math.random() * scrollStoppers.gestures.length)];

    let expressions = scrollStoppers.expressions;
    if (isSyp && photoFramework?.expressions?.preferred_expressions) {
        const preferredIds = photoFramework.expressions.preferred_expressions.map((e: string) => e.toLowerCase().replace(/\s+/g, '_'));
        const filtered = scrollStoppers.expressions.filter((e: any) =>
            preferredIds.some((pref: string) => e.id?.toLowerCase().includes(pref) || e.description?.toLowerCase().includes(pref.replace(/_/g, ' ')))
        );
        if (filtered.length > 0) expressions = filtered;
    }
    const expression = expressions[Math.floor(Math.random() * expressions.length)];

    let positions = scrollStoppers.positions;
    if (photoFramework?.restrictions?.avoid) {
        const avoidTerms = photoFramework.restrictions.avoid.map((a: string) => a.toLowerCase());
        const filteredPositions = scrollStoppers.positions.filter((p: any) =>
            !avoidTerms.some((term: string) => p.id?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term))
        );
        if (filteredPositions.length > 0) positions = filteredPositions;
    }
    const position = positions[Math.floor(Math.random() * positions.length)];

    // 3. Determine Setting
    const settings = ugcBasePrompts?.settings || {};
    let settingKey = settingOverride;

    if (!settingKey) {
        const primarySettings = photoFramework?.environment?.primary_settings || [];
        if (primarySettings.length > 0) {
            settingKey = primarySettings[Math.floor(Math.random() * primarySettings.length)];
        } else {
            settingKey = 'cozy_bedroom';
        }
    }

    const finalSettingKey = settingKey || 'cozy_bedroom';
    let setting = settings[finalSettingKey] || settings['cozy_bedroom'] || { description: 'cozy bedroom', elements: [] };

    // 4. Build Lighting Description from Photography Framework
    let lightingDesc = '';
    if (photoFramework?.lighting) {
        const lighting = photoFramework.lighting;
        const timeHint = lighting.time_of_day_hints?.[timeContext] || '';
        lightingDesc = `${lighting.primary_light}. ${lighting.secondary_light}. ${lighting.shadows}. ${timeHint}`;
    } else {
        lightingDesc = setting.lighting || 'soft natural lighting';
    }

    // 5. Build Camera/Photography Description
    let cameraDesc = '';
    if (photoFramework?.photography) {
        const photo = photoFramework.photography;
        cameraDesc = `${photo.camera_type}, ${photo.camera_angle}. ${photo.framing}. ${photo.focus}. Color: ${photo.color_profile}. ${(photo.characteristics || []).join(', ')}`;
    } else {
        cameraDesc = slide1Base?.camera?.type || 'iPhone front-camera selfie';
    }

    // 6. Build Makeup Description
    let makeupDesc = '';
    if (photoFramework?.skin_and_makeup) {
        const makeup = photoFramework.skin_and_makeup;
        makeupDesc = `${makeup.makeup_style}. ${(makeup.details || []).join(', ')}. Skin: ${makeup.skin_texture}`;
    } else {
        makeupDesc = slide1Base?.makeup?.style || 'natural minimal makeup';
    }

    // 7. Clothing and Accessories - Use outfit from syp_outfits.json if provided
    let clothingItem: string;
    if (outfit?.description) {
        clothingItem = outfit.description;
        console.log(`[Prompt Utils] Using outfit: ${outfit.name} - ${outfit.description}`);
    } else {
        const clothingItems = projectBase?.clothing_options || ['cozy oversized hoodie', 'neutral sweater'];
        clothingItem = clothingItems[Math.floor(Math.random() * clothingItems.length)];
    }
    const jewelry = (ugcBasePrompts?.jewelry?.[projectKey] || []).join(', ');

    // 8. Environment Description - Use settingData from syp_settings.json if provided
    let environmentDesc = '';
    let settingLighting = '';
    let settingVibe = '';

    if (settingData?.description) {
        // Use the random setting from syp_settings.json
        environmentDesc = settingData.description;
        settingLighting = settingData.lighting || '';
        settingVibe = settingData.vibe || '';
        const elements = settingData.elements || [];
        if (elements.length > 0) {
            environmentDesc += `. ${elements.join(', ')}`;
        }
        console.log(`[Prompt Utils] Using setting: ${settingData.name} - ${settingData.description}`);
    } else if (photoFramework?.environment) {
        const env = photoFramework.environment;
        environmentDesc = `${env.vibe}. ${(env.elements || []).join(', ')}`;
    } else {
        environmentDesc = setting.description || 'modern minimalist room';
    }

    // 9. Vibe/Aesthetic Description
    let vibeDesc = '';
    if (photoFramework?.aesthetic) {
        const aesthetic = photoFramework.aesthetic;
        vibeDesc = `Style: ${aesthetic.style}. Vibes: ${(aesthetic.vibes || []).join(', ')}`;
    } else {
        vibeDesc = slide1Base?.aesthetic?.vibes?.join(', ') || 'authentic UGC';
    }

    // 10. Expression Mood
    const expressionMood = photoFramework?.expressions?.primary_mood || (isSyp ? 'theatrical comedy' : 'relatable and soft');

    // BUILD STRUCTURED PROMPT
    const hairDetails = `${persona.subject.hair.color} hair, ${persona.subject.hair.style}, natural face-framing strands`;

    // Get subject appearance from photography framework if available
    const subjectFramework = photoFramework?.subject;

    // Get body description from persona if available (e.g., Lisa's curvy figure)
    const bodyDetails = persona.subject?.body
        ? `Body: ${persona.subject.body.figure}. ${persona.subject.body.details}.`
        : '';

    const promptParts = [];

    // SUBJECT SECTION - Use framework beauty settings if available
    if (subjectFramework) {
        const face = subjectFramework.face || {};
        const skin = subjectFramework.skin || {};
        const beautyLevel = subjectFramework.beauty_level || 'naturally attractive';

        promptParts.push(`## SUBJECT
Young woman, ${beautyLevel}. Looks like a real person in a candid photo.
Face: ${face.structure || 'symmetrical features'}, ${face.eyes || 'expressive eyes'}, ${face.lips || 'natural lips'}.
${hairDetails}. ${persona.subject.age}.${bodyDetails ? `\n${bodyDetails}` : ''}
Skin: ${skin.quality || 'flawless skin'}, ${skin.texture || 'smooth with minimal pores'}, ${skin.tone || 'even tone'}.`);
    } else {
        promptParts.push(`## SUBJECT
Young woman, ${persona.subject.age}. ${hairDetails}.${bodyDetails ? ` ${bodyDetails}` : ''}
Looks like a real person taking a selfie, not a professional model or stock photo.`);
    }

    promptParts.push(`\n## CAMERA & COMPOSITION
${cameraDesc}
9:16 vertical format.
Natural imperfection: subtle noise, soft highlights, realistic reflections.`);

    // LIGHTING - Include face lighting if specified
    let fullLightingDesc = lightingDesc;
    if (photoFramework?.lighting?.face_lighting) {
        fullLightingDesc += ` ${photoFramework.lighting.face_lighting}`;
    }

    // Skin texture from framework or default
    const skinTextureNote = subjectFramework?.skin?.texture
        ? subjectFramework.skin.texture
        : 'Skin texture clearly visible with micro-pores and natural oils';

    promptParts.push(`\n## LIGHTING
${fullLightingDesc}
${skinTextureNote}.
Medium quality. authentic TikTok aesthetic.`);

    // EXPRESSION - Use framework expression settings if available
    const expressionFramework = subjectFramework?.expression;
    let expressionDesc = expression.description;
    if (expressionFramework) {
        expressionDesc = `${expression.description}. Eyes: ${expressionFramework.eyes || 'soft and engaging'}`;
    }

    promptParts.push(`\n## FACIAL EXPRESSION
${expressionDesc}
Mood: ${expressionMood}.`);

    // MAKEUP - Use framework subject makeup if available
    let finalMakeupDesc = makeupDesc;
    if (subjectFramework?.makeup) {
        const frameworkMakeup = subjectFramework.makeup;
        const makeupDetails = Array.isArray(frameworkMakeup.details) ? frameworkMakeup.details.join(', ') : '';
        finalMakeupDesc = `${frameworkMakeup.style || 'enhanced natural beauty'}. ${makeupDetails}`;
    }

    promptParts.push(`\n## MAKEUP & SKIN
${finalMakeupDesc}`);

    promptParts.push(`\n## CLOTHING & ACCESSORIES
Wearing ${clothingItem}.
Accessories: ${jewelry || 'minimal jewelry'}.
Fabric looks soft with realistic folds.`);

    promptParts.push(`\n## POSE & BODY LANGUAGE
${gesture.description}
${position.description}
Natural, unposed posture.`);

    promptParts.push(`\n## ENVIRONMENT
${environmentDesc}${settingLighting ? `\nLighting: ${settingLighting}` : ''}${settingVibe ? `\nVibe: ${settingVibe}` : ''}`);

    if (persona.pet) {
        promptParts.push(`\n## PET
${persona.pet.description} prominently visible in a natural, realistic position.`);
    }

    // VIBE - Include beauty aesthetic if specified
    let finalVibeDesc = vibeDesc;
    if (photoFramework?.vibe?.beauty_aesthetic) {
        finalVibeDesc += `. Beauty: ${photoFramework.vibe.beauty_aesthetic}`;
    }

    promptParts.push(`\n## FINAL STYLE
${finalVibeDesc}
Medium quality, authentic TikTok aesthetic.`);

    // Add restrictions if present
    if (photoFramework?.restrictions) {
        const restrictions = photoFramework.restrictions;
        const avoidList = Array.isArray(restrictions.avoid) ? restrictions.avoid.join(', ') : '';
        promptParts.push(`\n## RESTRICTIONS
Content: ${restrictions.content}
Accuracy: ${restrictions.accuracy}
${avoidList ? `Avoid: ${avoidList}` : ''}`);
    }

    return promptParts.join('\n');
}
