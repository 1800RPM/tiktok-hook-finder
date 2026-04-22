import { ART_STYLES } from './art_styles';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ArtStyle } from './art_styles';

export interface DbtGenerateParams {
    format?: 'relatable' | 'pov' | 'tips';
    topic?: string;
    slideType?: 'weird_hack' | 'weird_hack_v2' | 'three_tips' | 'story_telling_bf' | 'story_telling_gf' | 'i_say_they_say';
    ANTHROPIC_API_KEY: string;
    includeBranding?: boolean;
    artStyle?: string;
}

type WeirdHackV2Topic = {
    topic: string;
    category: 'bpd' | 'dbt';
    struggles: string[];
    inGroupTerms?: string[] | null;
};

const STORY_TELLING_FIXED_CTA = "it's called DBT-Mind. if DBT is something for you - it's free. just search for it on the app store 🖤";
const STORY_TELLING_FIXED_COMPANION = "you can even choose your own little companion for your journey 🥹";
const WEIRD_HACK_V2_FIXED_SLIDE8 = "one of these will actually work for you\n\nyou already know which one";

const WEIRD_HACK_V2_RECENT_TOPICS_LIMIT = 10;
const SERVER_ROOT = join(import.meta.dir, '..', '..', '..');
const WEIRD_HACK_V2_RECENT_TOPICS_PATH = join(SERVER_ROOT, 'data', 'weird_hack_v2_recent_topics.json');

function normalizeWeirdHackV2TopicKey(value: string) {
    return String(value || '').trim().toLowerCase();
}

function readWeirdHackV2RecentTopics() {
    try {
        if (!existsSync(WEIRD_HACK_V2_RECENT_TOPICS_PATH)) return [];
        const raw = JSON.parse(readFileSync(WEIRD_HACK_V2_RECENT_TOPICS_PATH, 'utf8'));
        const topics = Array.isArray(raw?.topics) ? raw.topics : [];
        return topics
            .map((topic: unknown) => String(topic || '').trim())
            .filter(Boolean)
            .slice(-WEIRD_HACK_V2_RECENT_TOPICS_LIMIT);
    } catch (error) {
        console.warn('[Native Slides - DBT] Failed to read weird hack v2 topic history, continuing without it.', error);
        return [];
    }
}

function writeWeirdHackV2RecentTopics(topics: string[]) {
    try {
        mkdirSync(dirname(WEIRD_HACK_V2_RECENT_TOPICS_PATH), { recursive: true });
        writeFileSync(
            WEIRD_HACK_V2_RECENT_TOPICS_PATH,
            JSON.stringify(
                {
                    topics: topics.slice(-WEIRD_HACK_V2_RECENT_TOPICS_LIMIT),
                    updatedAt: new Date().toISOString()
                },
                null,
                2
            ),
            'utf8'
        );
    } catch (error) {
        console.warn('[Native Slides - DBT] Failed to persist weird hack v2 topic history.', error);
    }
}

function pickWeirdHackV2Topic(topics: WeirdHackV2Topic[]) {
    const recentTopics = readWeirdHackV2RecentTopics();
    const recentSet = new Set(recentTopics.map(normalizeWeirdHackV2TopicKey));
    const availableTopics = topics.filter(topic => !recentSet.has(normalizeWeirdHackV2TopicKey(topic.topic)));
    const pool = availableTopics.length > 0 ? availableTopics : topics;
    const selectedTopic = pool[Math.floor(Math.random() * pool.length)] || topics[0]!;

    const dedupedHistory = recentTopics.filter(
        topic => normalizeWeirdHackV2TopicKey(topic) !== normalizeWeirdHackV2TopicKey(selectedTopic.topic)
    );
    dedupedHistory.push(selectedTopic.topic);
    writeWeirdHackV2RecentTopics(dedupedHistory);

    return selectedTopic;
}

function stripMarkdownCodeFences(value: string) {
    return String(value || "")
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

function extractBalancedJson(value: string) {
    const text = stripMarkdownCodeFences(value);
    const start = text.search(/[\{\[]/);
    if (start === -1) return null;

    const opener = text[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let i = start; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            if (escaping) {
                escaping = false;
            } else if (char === '\\') {
                escaping = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === opener) {
            depth += 1;
        } else if (char === closer) {
            depth -= 1;
            if (depth === 0) {
                return text.slice(start, i + 1);
            }
        }
    }

    return null;
}

function fallbackParseSlidesObject(value: string) {
    const text = stripMarkdownCodeFences(value);
    const slidesMatch = text.match(/"slides"\s*:\s*\[([\s\S]*?)\]/);
    if (!slidesMatch) return null;

    const quotedValues = [...slidesMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g)]
        .map(match => match[1])
        .filter((entry): entry is string => typeof entry === "string")
        .map(entry =>
            entry
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\\\/g, '\\')
        );

    if (quotedValues.length === 0) return null;
    return { slides: quotedValues };
}

function parseClaudeJsonResponse(resultText: string, logLabel: string, fallbackParser?: (value: string) => any) {
    const extractedJson = extractBalancedJson(resultText);
    if (!extractedJson) {
        console.error(`${logLabel} No JSON found in AI response:`, resultText);
        throw new Error("No JSON found in AI response");
    }

    try {
        return JSON.parse(extractedJson);
    } catch (parseError) {
        const fallbackParsed = fallbackParser ? fallbackParser(resultText) : null;
        if (!fallbackParsed) {
            console.error(`${logLabel} Failed to parse AI JSON:`, parseError);
            console.error(`${logLabel} Raw AI response:`, resultText);
            throw parseError;
        }
        return fallbackParsed;
    }
}

function isStoryEmojiOnlyFragment(value: string) {
    const text = String(value || '').trim();
    if (!text) return false;

    const stripped = text
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s"'`.,!?;:()[\]{}\-–—_~*+#/\\|]+/gu, '')
        .trim();

    return stripped.length === 0;
}

function looksLikeStoryCompanionSlide(value: string) {
    const text = String(value || '').toLowerCase();
    return text.includes('little companion') || (text.includes('choose') && text.includes('companion'));
}

function looksLikeStoryCtaSlide(value: string) {
    const text = String(value || '').toLowerCase();
    return text.includes("it's called dbt-mind") || text.includes('search for it on the app store');
}

function normalizeStoryTellingSlides(rawSlides: string[]) {
    const mergedSlides: string[] = [];

    for (const rawSlide of rawSlides) {
        const slide = String(rawSlide || '').trim();
        if (!slide) continue;

        if (isStoryEmojiOnlyFragment(slide) && mergedSlides.length > 0) {
            mergedSlides[mergedSlides.length - 1] = `${mergedSlides[mergedSlides.length - 1]} ${slide}`.trim();
            continue;
        }

        mergedSlides.push(slide);
    }

    const hasTrailingCta = mergedSlides.length > 0 && looksLikeStoryCtaSlide(mergedSlides[mergedSlides.length - 1]);
    const bodySlides = hasTrailingCta ? mergedSlides.slice(0, -1) : [...mergedSlides];

    if (bodySlides.length === 7 && !looksLikeStoryCompanionSlide(bodySlides[6])) {
        bodySlides.push(STORY_TELLING_FIXED_COMPANION);
    }

    return hasTrailingCta ? [...bodySlides, mergedSlides[mergedSlides.length - 1]] : bodySlides;
}

// (Legacy constants and functions removed)

export const WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK = `Styling rules: Hopeful vibe asthetic, unprofessional iPhone 12 candid shot, Medium quality, authentic Tiktok asthetic. Do NOT add background blur/unsharpness. The image should look unintended and fully spontaneously.`;

export const WEIRD_HACK_V2_NANO_BANANA_NEGATIVES_BLOCK = `Negatives: No phones, no hands in image, no person visible in image, No notebook with written text, blank notebook is okay. No readable text in image.`;

const WEIRD_HACK_V2_MEME_OPTIONS = {
    overwhelm: [
        {
            keys: ['this is fine', 'this-is-fine'],
            injection: 'A clearly recognizable This Is Fine dog meme printout is placed in the near-midground on the desk, shelf edge, or bedside surface, large enough to be recognized instantly, but without readable caption text.'
        },
        {
            keys: ['crying-laughing wojak', 'crying laughing wojak', 'wojak'],
            injection: 'A clearly recognizable crying-laughing Wojak meme printout is placed in the near-midground pinned beside the bed or resting on a shelf edge, large enough to be recognized instantly, but without readable caption text.'
        },
        {
            keys: ['brain on fire'],
            injection: 'A clearly recognizable brain on fire meme printout is placed in the near-midground clipped near the desk or shelf edge, large enough to be recognized instantly, but without readable caption text.'
        }
    ],
    splitting: [
        {
            keys: ['spider-man pointing', 'spider man pointing', 'spiderman pointing'],
            injection: 'A clearly recognizable Spider-Man pointing meme image is placed in the near-midground taped beside the bed or desk, large enough to be recognized instantly, but without readable caption text.'
        },
        {
            keys: ['drake'],
            injection: 'A clearly recognizable Drake approve-disapprove meme printout is placed in the near-midground near the desk or shelf edge, large enough to be recognized instantly, but without readable caption text.'
        },
        {
            keys: ['two sides wojak', 'split wojak', 'wojak'],
            injection: 'A clearly recognizable split-style Wojak meme printout with two contrasting faces is placed in the near-midground near the desk or wall, large enough to be recognized instantly, but without readable caption text.'
        }
    ],
    relationships: [
        {
            keys: ["i'll be fine wojak", 'i will be fine wojak', 'wojak'],
            injection: 'A clearly recognizable trembling-lip Wojak meme printout is placed in the near-midground beside the bed or on a shelf edge, large enough to be recognized instantly, but without readable caption text.'
        },
        {
            keys: ['distracted boyfriend'],
            injection: 'A clearly recognizable Distracted Boyfriend meme printout is placed in the near-midground clipped near the shelf or desk area, large enough to be recognized instantly, but without readable caption text.'
        },
        {
            keys: ['sad wojak', 'relationship wojak'],
            injection: 'A clearly recognizable sad Wojak relationship-style meme printout is placed in the near-midground taped near the shelf or wall, large enough to be recognized instantly, but without readable caption text.'
        }
    ]
} as const;

const WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS = [
    {
        keys: ['framed shrek photo', 'shrek'],
        injection: 'A clearly recognizable framed Shrek photo is placed in the near-midground on a shelf edge or bedside surface, large enough to be recognized instantly.'
    },
    {
        keys: ['patrick star', 'patrick'],
        injection: 'A clearly recognizable Patrick Star printout is placed in the near-midground taped near the desk or bed, large enough to be recognized instantly.'
    },
    {
        keys: ['dora'],
        injection: 'A clearly recognizable Dora printout is placed in the near-midground clipped near the shelf or wall, large enough to be recognized instantly.'
    },
    {
        keys: ['mike wazowski', 'wazowski'],
        injection: 'A clearly recognizable Mike Wazowski printout is placed in the near-midground on the shelf edge or desk corner, large enough to be recognized instantly.'
    },
    {
        keys: ['lightning mcqueen', 'mcqueen'],
        injection: 'A clearly recognizable Lightning McQueen printout is placed in the near-midground taped near the desk or bed, large enough to be recognized instantly.'
    }
] as const;

const WEIRD_HACK_V2_MEME_CATEGORIES = {
    overwhelm: ['overwhelm', 'overwhelmed', 'emotional dysregulation', 'too much', 'panic', 'meltdown', 'rage', 'spiral', '3am', 'brain on fire'],
    splitting: ['splitting', 'black and white', 'black-and-white', 'all-or-nothing', 'split', 'two sides', 'emotional mind', 'rational mind'],
    relationships: ['abandonment', 'relationship', 'fp', 'favorite person', 'fear of replacement', 'attachment', 'texting anxiety', 'left alone', 'rejected']
} as const;

const WEIRD_HACK_V2_TOPIC_MEME_OVERRIDES = [
    {
        keywords: ['digital self-harm', 'checking blocks', 'old texts', 'search bar', 'searching for things that trigger you', 'stalking ex-fps'],
        categories: ['overwhelm'] as Array<keyof typeof WEIRD_HACK_V2_MEME_OPTIONS>
    },
    {
        keywords: ['emotional dysregulation', 'overwhelm', 'too much', '0 to 100', 'rage', 'panic'],
        categories: ['overwhelm'] as Array<keyof typeof WEIRD_HACK_V2_MEME_OPTIONS>
    },
    {
        keywords: ['splitting', 'black-and-white', 'black and white', 'all-or-nothing'],
        categories: ['splitting'] as Array<keyof typeof WEIRD_HACK_V2_MEME_OPTIONS>
    },
    {
        keywords: ['fp dynamics', 'favorite person', 'abandonment panic', 'relationship cycles', 'fear of replacement', 'texting anxiety', 'attachment', 'rejection sensitivity'],
        categories: ['relationships'] as Array<keyof typeof WEIRD_HACK_V2_MEME_OPTIONS>
    }
] as const;

const WEIRD_HACK_V2_ALL_MEME_OPTIONS = [
    ...WEIRD_HACK_V2_MEME_OPTIONS.overwhelm,
    ...WEIRD_HACK_V2_MEME_OPTIONS.splitting,
    ...WEIRD_HACK_V2_MEME_OPTIONS.relationships
];

const WEIRD_HACK_V2_ALL_FUNNY_OPTIONS = [
    ...WEIRD_HACK_V2_ALL_MEME_OPTIONS,
    ...WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS
];

function promptContainsWeirdHackV2Meme(value: string) {
    const normalized = String(value || '').toLowerCase();
    return WEIRD_HACK_V2_ALL_FUNNY_OPTIONS.some(option =>
        option.keys.some(key => normalized.includes(key))
    );
}

function stripWeirdHackV2MemeSentences(value: string) {
    let cleaned = String(value || '');
    const sentencePatterns = [
        /[^.]*This Is Fine[^.]*\.?/gi,
        /[^.]*Wojak[^.]*\.?/gi,
        /[^.]*brain on fire[^.]*\.?/gi,
        /[^.]*Spider-?Man pointing[^.]*\.?/gi,
        /[^.]*Drake approve-disapprove[^.]*\.?/gi,
        /[^.]*Distracted Boyfriend[^.]*\.?/gi,
        /[^.]*Shrek[^.]*\.?/gi,
        /[^.]*Patrick Star[^.]*\.?/gi,
        /[^.]*Dora[^.]*\.?/gi,
        /[^.]*Mike Wazowski[^.]*\.?/gi,
        /[^.]*Lightning McQueen[^.]*\.?/gi
    ];

    for (const pattern of sentencePatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.replace(/\s{2,}/g, ' ').trim();
}

function chooseWeirdHackV2MemeOption(promptText: string, slideContextText = '') {
    const normalized = String(promptText || '').toLowerCase();
    const context = String(slideContextText || '').toLowerCase();

    for (const override of WEIRD_HACK_V2_TOPIC_MEME_OVERRIDES) {
        if (override.keywords.some(keyword => context.includes(keyword))) {
            const category = override.categories[Math.floor(Math.random() * override.categories.length)] || override.categories[0];
            const options = WEIRD_HACK_V2_MEME_OPTIONS[category];
            return options[Math.floor(Math.random() * options.length)] || options[0];
        }
    }

    const categoryOrder: Array<keyof typeof WEIRD_HACK_V2_MEME_OPTIONS> = ['overwhelm', 'splitting', 'relationships'];
    for (const category of categoryOrder) {
        if (WEIRD_HACK_V2_MEME_CATEGORIES[category].some(keyword => normalized.includes(keyword))) {
            const options = WEIRD_HACK_V2_MEME_OPTIONS[category];
            return options[Math.floor(Math.random() * options.length)] || options[0];
        }
    }

    return WEIRD_HACK_V2_MEME_OPTIONS.overwhelm[Math.floor(Math.random() * WEIRD_HACK_V2_MEME_OPTIONS.overwhelm.length)]
        || WEIRD_HACK_V2_MEME_OPTIONS.overwhelm[0];
}

function chooseWeirdHackV2FunnyDetailOption(promptText: string, slideContextText = '') {
    const useCharacter = Math.random() < 0.35;
    if (useCharacter) {
        return WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS[
            Math.floor(Math.random() * WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS.length)
        ] || WEIRD_HACK_V2_FUNNY_CHARACTER_OPTIONS[0];
    }

    return chooseWeirdHackV2MemeOption(promptText, slideContextText);
}

function sanitizeWeirdHackV2CommentTriggerPrompt(scenePrompt: string) {
    return String(scenePrompt || '');
}

export function buildWeirdHackV2NanoBananaPrompt(scenePrompt: string) {
    const cleanedScenePrompt = sanitizeWeirdHackV2CommentTriggerPrompt(scenePrompt).trim();
    if (!cleanedScenePrompt) return cleanedScenePrompt;
    if (cleanedScenePrompt.startsWith(WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK)) {
        return cleanedScenePrompt;
    }

    const fullPrompt = [
        WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK,
        WEIRD_HACK_V2_NANO_BANANA_NEGATIVES_BLOCK,
        cleanedScenePrompt
    ].join('\n\n');

    return fullPrompt;
}

export async function generateWeirdHackV2ImagePrompts(
    slides: string[],
    ANTHROPIC_API_KEY: string
): Promise<Record<string, string>> {
    const systemPrompt = `You write image generation prompts for TikTok slideshow posts about BPD and DBT skills. 

The visual style is: candid phone photography aesthetic. Real, intimate, everyday settings. Tight crops on objects and environments. Warm or dim practical lighting — lamp light, daylight through curtains, ambient room light. Textures: paper, bedsheets, wood, fabric, walls. Grainy, slightly imperfect. Feels like something a real person actually photographed.

NEVER: illustrated, painted, symbolic, surreal, abstract, AI-looking, cinematic, dramatic lighting, stock photo, professional photography.

ALWAYS: candid, intimate, real-world settings, phone photography grain.

Hidden styling rules you must internalize and apply to every prompt:
- Candid, hopeful vibe asthetic image taken spontaneous with iPhone 12 from a 22 year old woman (college student).
- Should look like a casual photo someone sends to friends over snapchat.
- Choose a casual photo angle, not something where it looks like a staged image from a photo shooting.
- Medium quality, authentic Tiktok asthetic.
- All hopeful Pinterest vibe asthetic.

Scene grounding rule:
- Every scene should plausibly belong to a 22 year old college girl from the US.
- OVERRIDE: For weird hack v2 slides 2-8, every scene must be outdoors or nature-based. Do not use bedrooms, desks, kitchens, bathrooms, mirrors, shelves, or any other indoor room scene.
- Favor outdoor environments that still feel gen-z and student-coded: park paths, grassy campus lawns, lakeside steps, beach walkways, riverbanks, boardwalks, picnic blankets under trees, roadside overlooks at sunset, or benches near water.
- Every prompt must still include at least one clear young-adult lifestyle anchor in the outdoor scene: tote bag, hoodie, paperback, water bottle, picnic blanket, canvas sneakers, thrifted jacket, simple claw clip, lip balm, earbuds case, or similar detail.
- The scene should feel like a casual outdoor place she would actually spend time in, not a generic travel landscape.
- Favor objects, rooms, outdoor spots, and everyday environments that feel age-appropriate and culturally plausible for that life stage.
- Think: dorm room, student apartment, campus-adjacent bedroom, casual study corner, a park path near campus, a grassy field, lakeside steps, a beach walkway, a roadside overlook, or other everyday young-adult spaces.
- Avoid scenes that feel too mature, luxurious, corporate, suburban-family, rustic-workshop, or obviously outside that demographic.
- Every prompt must include at least one clear college-girl lifestyle anchor in the actual scene description: bedding, tote bag, student desk setup, casual beauty item, hoodie, simple jewelry tray, paperback, wall collage, cheap lamp, thrifted decor, study materials, water bottle, picnic blanket, canvas sneakers, or similar young-adult detail.
- The scene should feel like it came from her real room, student living environment, or a casual outdoor place she would actually spend time in, not just a random object in isolation.
- Even when the composition is minimal, it still needs one recognizable lifestyle clue that signals her age and environment.

Demographic clarity rule:
- The viewer should immediately feel "this belongs to a young US college woman" from the scene itself.
- Use ordinary student-lifestyle clues instead of abstract mood objects.
- Good anchors: rumpled dorm-style bedding, a canvas tote on a chair, a cheap bedside lamp, a simple vanity tray, class notes stacked nearby without readable text, a thrifted mirror, a hoodie on the bed, a paperback, a water bottle, a desk organizer, soft dorm decor, a picnic blanket with a tote and paperback, campus grass with a hoodie and water bottle, or a small student apartment kitchen detail.
- Bad anchors: anonymous wood grain, random metal tools, empty industrial surfaces, generic close-up textures, mature home decor, workshop objects, or scenes that could belong to anyone of any age.
- Never make the focal point just "a texture" or "a surface."
- If a prompt could plausibly fit a middle-aged home, hotel, office, or workshop, rewrite it until it feels clearly young, casual, and student-coded.

Hidden negatives you must internalize and apply to every prompt:
- No phones.
- No hands in image.
- No readable text in image.
- No person visible in image.
- No notebook with written text, blank notebook is okay.

Do NOT write those styling rules or negatives verbatim in the output prompts unless directly necessary. Instead, naturally describe scenes that already satisfy them.

CRITICAL OUTPUT RULE:
The final prompt text must describe ONLY the visible scene content:
- setting
- objects
- lighting
- framing/composition

Do NOT mention style words or meta-prompt language in the output.
Do NOT mention things like:
- candid
- spontaneous
- iPhone
- Snapchat
- TikTok
- Pinterest
- medium quality
- aesthetic
- hopeful vibe
- grain
- authentic
- casual photo angle

Those are hidden art-direction rules for you, not text to include in the generated prompts.
The output should read like a plain description of what is in the image, nothing else.

CALM COMPOSITION RULE:
- Keep scenes visually simple and uncluttered.
- Use only a few objects that matter.
- Avoid busy rooms, crowded surfaces, too many props, or lots of small details.
- Favor negative space, stillness, and one clear focal point so the image feels calming.

VARIETY RULE ACROSS THE 7 PROMPTS:
- Treat slides 2 through 8 as one visual set, not isolated prompts.
- All scenes must stay outdoors, but they should still vary strongly across nature settings and lighting conditions.
- Each prompt must feel clearly different from the others in location, focal object, and composition.
- Do not reuse the same core setup more than once across the set.
- At most one prompt may use a notebook, journal, sticky note, or pen as the main focal object.
- Prefer outdoor variation such as sunset grass, cloudy park bench, beach path, lakeside edge, river stones, wildflower patch, boardwalk railing, or trail overlook.
- Use a real mix of indoor and outdoor young-adult environments when possible, instead of making everything a bedroom or desk scene.
- Ignore any earlier wording about mixing indoor and outdoor scenes. For this flow, outdoor only.
- Spread the scenes across different young-adult environments when possible: bed, desk, chair, shelf, mirror area, floor corner, kitchen counter, windowsill, laundry basket, backpack area, bedside table, campus lawn, park bench, beach path, lakeside steps, trail overlook.
- Vary the camera framing too: one overhead, one side angle, one wider room fragment, one tight close-up with a clear lifestyle anchor.
- If two prompts feel visually interchangeable, rewrite one until the difference is obvious.

VALIDATION RULE BEFORE YOU ANSWER:
- Check each prompt before returning it.
- If the scene does not obviously read as belonging to a 22 year old college girl from the US, rewrite it.
- If the scene is indoors, rewrite it.
- If the scene is just an artsy close-up of texture, wood, fabric, metal, or a generic object, rewrite it.
- If the prompt lacks at least one young-student lifestyle anchor, rewrite it.
- If more than one prompt centers on a notebook, journal, sticky note, or pen setup, rewrite the extras.

Emotional arc rules:
- Nature-first rule: Every slide should be expressed through outdoor or nature scenes only. Use sunsets, parks, grass, water, shorelines, trails, wildflowers, cloudy skies, boardwalks, or overlook scenes before considering any object-heavy setup.
- Slides 2-5: Match the emotional weight of the slide. Pattern-validation and practical hack slides can use reflection objects, waiting cues, saved evidence, archived keepsakes, or quiet room details that fit the specific advice.
- Slide 6: Mechanism reframe. Grounded, clarifying, emotionally settled. Quiet morning or late-afternoon light, simple anchors, a sense of understanding rather than crisis.
- Slide 7: Permission landing. Softer and more spacious than slide 6. Subtle selfhood-building cues, calm stillness, and gentle personal choice without looking staged.
- Slide 8: Comment-driver close. Keep it simple, relatable, and visually clear. The scene should feel like a small private realization or a quiet either-or moment, not a product shot or CTA image.
- Tip slides (slides 2-4): Match the emotional weight of the tip. Language/reframe tips → notebook, pen on paper, an open journal, a sticky note, quiet objects that imply reflection. Timing/waiting tips → stillness, a clock, an unmade bed, a dark room, curtains, lamp light. Evidence/tracking tips → saved notes, printed screenshots, a notebook log, something archived or collected without showing a phone.
- Reframe slide (slide 5): Warmer, softer. Morning light, stillness, a sense of quiet after the storm.

- Override for variety: do not default multiple slides to notebook or pen scenes just because they fit emotionally.
- Only one prompt in the full set may use a notebook, journal, sticky note, or pen-centered scene.
- Prefer alternate young-adult anchors for the other slides: hoodie on chair, bedside lamp, tote bag, paperback, mirror tray, laundry basket, water bottle, desk organizer, pinned keepsakes, archive folder, or bedding detail.
- The image should fit the slide text specifically, but still stay visually distinct from the other prompts in the set.

You receive 7 slide texts and return exactly 7 image prompts as JSON.`;

    const userPrompt = `Write one image generation prompt for each of these 7 slides. Match the scene to the emotional content of each slide.

Important:
- Every prompt must feel like it was photographed in the real environment of a 22 year old college girl from the US.
- Outdoor only for slides 2-8: parks, sunsets, grass, water, shorelines, trails, beaches, lakesides, riverbanks, or similar nature scenes.
- Ignore any room-based examples elsewhere in the instructions.
- Keep the scene calm and simple, but not generic.
- Include at least one clear college-student lifestyle clue in every prompt.
- Do not give me anonymous texture prompts or random surface close-ups.
- Make the 7 prompts visually distinct from each other.
- Use only nature or outdoor scenes across the full set.
- Favor gen-z-coded outdoor scenes like sunsets, parks, grass, water, beach paths, lakesides, and riverbanks over object-heavy setups.
- Do not give me more than one notebook, journal, sticky note, or pen-centered prompt across the full set.

Slide 2: ${slides[1] || ""}
Slide 3: ${slides[2] || ""}
Slide 4: ${slides[3] || ""}
Slide 5: ${slides[4] || ""}
Slide 6: ${slides[5] || ""}
Slide 7: ${slides[6] || ""}
Slide 8: ${slides[7] || ""}

Return strictly as JSON — no markdown, no explanation:
{"slide2": "...", "slide3": "...", "slide4": "...", "slide5": "...", "slide6": "...", "slide7": "...", "slide8": "..."}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[Weird Hack V2 Image Prompts] Anthropic API Error:", errorText);
        throw new Error('Image prompt generation failed');
    }

    const raw = await response.json() as any;
    const text = raw.content?.[0]?.text || '';
    const parsed = parseClaudeJsonResponse(text, "[Weird Hack V2 Image Prompts]");
    const prompts = {
        slide2: String(parsed.slide2 || '').trim(),
        slide3: String(parsed.slide3 || '').trim(),
        slide4: String(parsed.slide4 || '').trim(),
        slide5: String(parsed.slide5 || '').trim(),
        slide6: String(parsed.slide6 || '').trim(),
        slide7: String(parsed.slide7 || '').trim(),
        slide8: String(parsed.slide8 || '').trim()
    };

    return {
        slide2: buildWeirdHackV2NanoBananaPrompt(prompts.slide2),
        slide3: buildWeirdHackV2NanoBananaPrompt(prompts.slide3),
        slide4: buildWeirdHackV2NanoBananaPrompt(prompts.slide4),
        slide5: buildWeirdHackV2NanoBananaPrompt(prompts.slide5),
        slide6: buildWeirdHackV2NanoBananaPrompt(prompts.slide6),
        slide7: buildWeirdHackV2NanoBananaPrompt(prompts.slide7),
        slide8: buildWeirdHackV2NanoBananaPrompt(prompts.slide8)
    };
}


export async function generateDbtSlides(params: DbtGenerateParams) {
    const { ANTHROPIC_API_KEY, includeBranding = true, topic, slideType = 'weird_hack' } = params;
    const isStoryTellingFlow = slideType === 'story_telling_bf' || slideType === 'story_telling_gf';
    const needsViralTopic = !isStoryTellingFlow && slideType !== 'weird_hack_v2';

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

    const weirdHackV2Topics: WeirdHackV2Topic[] = [
        { topic: "Splitting", category: "bpd", struggles: ["all-or-nothing thinking", "turning on someone over a tone shift", "black-and-white thinking"], inGroupTerms: ["splitting", "splitting on someone"] },
        { topic: "FP Dynamics", category: "bpd", struggles: ["texting anxiety", "fear of replacement", "obsessive thoughts", "needing constant reassurance"], inGroupTerms: ["fp", "favorite person", "my fp"] },
        { topic: "Abandonment Panic", category: "bpd", struggles: ["panic when someone is 5 mins late", "testing people", "analyzing words for signs of leaving", "why calm feels like rejection"], inGroupTerms: ["abandonment panic", "abandonment wound"] },
        { topic: "Relationship Cycles", category: "bpd", struggles: ["idealization vs devaluation", "trauma bonding vs love", "choosing the same toxic people"], inGroupTerms: ["idealize-devalue cycle", "the cycle"] },
        { topic: "Quiet BPD", category: "bpd", struggles: ["splitting inward", "masking distress with a calm face", "feeling like a burden for having needs"], inGroupTerms: ["quiet bpd", "masking"] },
        { topic: "Emotional Dysregulation", category: "bpd", struggles: ["BPD rage out of nowhere", "feeling too much for others", "0 to 100 instantly"], inGroupTerms: ["dysregulation", "dysregulated"] },
        { topic: "Rejection Sensitivity", category: "bpd", struggles: ["interpreting a short reply as hatred", "physical sickness after minor criticism", "post-socializing spiral"], inGroupTerms: ["rsd", "rejection sensitivity"] },
        { topic: "Identity / Sense of Self", category: "bpd", struggles: ["feeling like a void when alone", "copying personalities to fit in", "not knowing your own values"], inGroupTerms: ["identity diffusion"] },
        { topic: "Chronic Emptiness", category: "bpd", struggles: ["boredom that feels unbearable", "numbing behaviors", "the feeling of nothing"], inGroupTerms: ["the emptiness", "chronic emptiness"] },
        { topic: "Digital Self-Harm", category: "bpd", struggles: ["checking blocks and old texts", "searching for things that trigger you", "stalking ex-FPs"], inGroupTerms: ["digital self-harm", "doom-stalking"] },
        { topic: "Emotional Permanence", category: "bpd", struggles: ["feeling unloved the second contact drops", "forgetting love when someone goes quiet", "needing constant proof they still care"], inGroupTerms: ["object permanence", "emotional permanence"] },
        { topic: "Attachment Hypervigilance", category: "bpd", struggles: ["scanning for tone shifts", "reading danger into tiny changes", "tracking closeness minute by minute"], inGroupTerms: null },
        { topic: "Shame Spirals", category: "bpd", struggles: ["one awkward moment ruins your whole day", "feeling fundamentally wrong after conflict", "wanting to disappear after small mistakes"], inGroupTerms: ["shame spiral"] },
        { topic: "Dissociation", category: "bpd", struggles: ["going numb mid-conflict", "feeling unreal when overwhelmed", "losing time after emotional spikes"], inGroupTerms: ["dissociating", "checking out"] },
        { topic: "Self-Sabotage", category: "bpd", struggles: ["picking fights to test love", "leaving before they can leave", "destroying the safe thing because it feels unfamiliar"], inGroupTerms: ["self-sabotage"] },
        { topic: "Favorite Person Withdrawal", category: "bpd", struggles: ["crashing when they feel distant", "feeling physically sick after less attention", "making one person your emotional oxygen"], inGroupTerms: ["fp withdrawal", "fp panic"] },
        { topic: "Post-Conflict Crash", category: "bpd", struggles: ["feeling dead after an argument", "reliving every word for hours", "not knowing how to come down after the spike"], inGroupTerms: null },
        { topic: "Overexplaining", category: "bpd", struggles: ["writing paragraphs to prevent abandonment", "trying to be perfectly understood", "panic when a message feels incomplete"], inGroupTerms: ["overexplaining", "the paragraph text"] },
        { topic: "TIPP", category: "dbt", struggles: ["panic hits too fast", "your body is already at 100", "you need your nervous system to come down first"], inGroupTerms: ["tipp"] },
        { topic: "Wise Mind", category: "dbt", struggles: ["emotion mind takes over", "logic disappears in the moment", "you need a calmer middle ground"], inGroupTerms: ["wise mind"] },
        { topic: "Opposite Action", category: "dbt", struggles: ["the urge is making everything worse", "you want to isolate or attack", "your action urge will deepen the spiral"], inGroupTerms: ["opposite action"] },
        { topic: "Check the Facts", category: "dbt", struggles: ["your story runs ahead of reality", "you fill in the blanks with danger", "you need to slow down the assumption"], inGroupTerms: ["check the facts"] },
        { topic: "Radical Acceptance", category: "dbt", struggles: ["fighting reality makes the pain louder", "you keep arguing with what already happened", "the suffering spikes when you resist it"], inGroupTerms: ["radical acceptance"] },
        { topic: "STOP Skill", category: "dbt", struggles: ["you react before you even realize it", "there is no pause between feeling and action", "you need a split second of space"], inGroupTerms: ["stop skill"] },
        { topic: "Self-Soothe", category: "dbt", struggles: ["your body feels impossible to live in", "everything is too loud after conflict", "you need sensory calm before thinking"], inGroupTerms: ["self-soothe"] },
        { topic: "PLEASE Skills", category: "dbt", struggles: ["everything gets worse when your body is fried", "sleep or food shifts the whole day", "you need nervous-system basics before insight"], inGroupTerms: ["please skills"] }
    ];

    const selectedTopic = needsViralTopic
        ? viralTopics.find(t => t.topic.toLowerCase() === topic?.toLowerCase()) ||
            viralTopics[Math.floor(Math.random() * viralTopics.length)] ||
            viralTopics[0]!
        : null;
    const selectedWeirdHackV2Topic = slideType === 'weird_hack_v2'
        ? pickWeirdHackV2Topic(weirdHackV2Topics)
        : null;
    const topicContext = selectedTopic || viralTopics[0]!;

    if (selectedTopic) {
        console.log(`[Native Slides - DBT] Selected topic: ${selectedTopic.topic}`);
    } else if (slideType === 'weird_hack_v2') {
        console.log(`[Native Slides - DBT] Weird hack v2 selected topic: ${selectedWeirdHackV2Topic?.topic || 'unknown'}`);
        console.log(`[Native Slides - DBT] Weird hack v2 recent topics: ${readWeirdHackV2RecentTopics().join(', ')}`);
    } else {
        console.log('[Native Slides - DBT] Story telling flow: skipping viral topic selection');
    }

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

    const formatWeirdHackV2Slide1Hook = (
        rawHook: string,
        fallbackProblem: string,
        _category: 'bpd' | 'dbt' = 'bpd'
    ) => {
        const cleaned = String(rawHook || "").replace(/^slide\s*1\s*:\s*/i, '').trim().toLowerCase();

        // Split into blocks separated by blank lines
        const blocks = cleaned.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
        let block1 = (blocks[0] || '').trim();
        let block2 = (blocks[1] || '').trim();

        // Detect which formula the model used
        const startsWithNotMe = /^not\s+me\s+realizing/i.test(block1);
        const startsWithWdym = /^wdym\b/i.test(block1);

        // If the model collapsed everything into one block, try to split intelligently
        if (!block2) {
            // For Formula A: look for "anyway" to find block 2 boundary
            if (startsWithNotMe) {
                const match = block1.match(/^([\s\S]*?)\s*(anyway[\s\S]*)$/i);
                if (match) {
                    block1 = (match[1] || '').trim();
                    block2 = (match[2] || '').trim();
                }
            }
            // For Formula B: look for "like" starting a line to find reaction block
            if (startsWithWdym && !block2) {
                const lines = block1.split(/\n/).map(l => l.trim()).filter(Boolean);
                const reactionIdx = lines.findIndex((l, i) => i > 0 && /^like\b/i.test(l));
                if (reactionIdx > 0) {
                    block1 = lines.slice(0, reactionIdx).join('\n');
                    block2 = lines.slice(reactionIdx).join('\n');
                }
            }
        }

        // Fallback block 1 if empty
        if (!block1) {
            block1 = `not me realizing i've been stuck in the ${fallbackProblem} loop\nfor literally years`;
        }

        // Fallback block 2 — match the formula the model chose
        if (!block2) {
            if (startsWithWdym) {
                block2 = `like that's not a coping strategy\nthat's the symptom`;
            } else {
                // Default to Formula A tail for anything else
                block2 = `anyway here's what i'm doing about it`;
            }
        }

        // Normalize: collapse any \n\n inside each block (shouldn't be there)
        block1 = block1.replace(/\n\s*\n/g, '\n');
        block2 = block2.replace(/\n\s*\n/g, '\n');

        return `${block1}\n\n${block2}`;
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

    const weirdHackV2DbtSkillFallbacks: Record<string, string> = {
        "tipp": "1. Try TIPP first\n\ncold water first, then paced breathing\nbypasses panic before thoughts take over.",
        "wise mind": "1. Wise Mind check-in\n\n\"what are the facts, what am I feeling?\"\nreplaces pure emotion mind with both truths.",
        "opposite action": "1. Use Opposite Action\n\nurge says isolate? text one safe person\nreplaces the action urge feeding the spiral.",
        "check the facts": "1. Check the Facts\n\n\"what happened, and what did I add?\"\nreplaces assumptions with reality-testing.",
        "radical acceptance": "1. Radical Acceptance\n\n\"i hate this, and it's still real\"\nreplaces fighting reality that intensifies pain.",
        "stop skill": "1. Use STOP\n\nfreeze the reply. step back before acting\nbypasses impulsive action before regret starts.",
        "self-soothe": "1. Self-Soothe first\n\nsoft blanket, cold drink, lamp on low\nreplaces overload with sensory regulation.",
        "please skills": "1. Check PLEASE first\n\nask if i ate, slept, and slowed down\nreplaces shame with body-based reality."
    };

    const normalizeSkillKey = (value: string) => String(value || '').trim().toLowerCase();

    const containsNamedDbtSkill = (value: string) => {
        const normalized = normalizeSkillKey(value);
        return [
            "wise mind",
            "stop",
            "tipp",
            "opposite action",
            "radical acceptance",
            "check the facts",
            "self-soothe",
            "self soothe",
            "please"
        ].some(skill => normalized.includes(skill));
    };

    const getWeirdHackV2DbtSkillFallbackSlide = (topicName: string) => {
        const normalizedTopic = normalizeSkillKey(topicName);
        return weirdHackV2DbtSkillFallbacks[normalizedTopic] || `1. Try ${topicName}\n\nuse ${topicName} before the spiral peaks\nreplaces guessing with an actual DBT skill.`;
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

    const formatWeirdHackV2Slide = (rawSlide: string, slideIndex: number) => {
        const cleaned = String(rawSlide || "").replace(/^slide\s*\d+\s*:\s*/i, '').trim();
        if (!cleaned) return cleaned;

        const normalizeLines = (value: string) =>
            String(value || "")
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);

        // Slide 1 — Hook (two blocks). Handled separately by formatWeirdHackV2Slide1Hook.
        if (slideIndex === 0) {
            const parts = cleaned.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
            if (parts.length >= 2) {
                return `${parts[0]}\n\n${parts.slice(1).join(' ')}`;
            }
            const lines = normalizeLines(cleaned);
            if (lines.length >= 2) {
                return `${lines[0]}\n\n${lines.slice(1).join(' ')}`;
            }
            return cleaned;
        }

        // Slide 2 — Pattern validation (single block, lines joined by \n, no \n\n inside)
        if (slideIndex === 1) {
            const flattened = cleaned.replace(/\n\s*\n/g, '\n');
            const lines = normalizeLines(flattened);
            return lines.join('\n');
        }

        // Slides 3, 4, 5 — Numbered hacks (three blocks: label / example / mechanism)
        if (slideIndex >= 2 && slideIndex <= 4) {
            const blocks = cleaned.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);

            // Ideal case: 3 blocks already
            if (blocks.length >= 3) {
                const label = blocks[0];
                const example = normalizeLines(blocks[1]).slice(0, 2).join('\n');
                const mechanism = normalizeLines(blocks.slice(2).join('\n')).join(' ');
                return `${label}\n\n${example}\n\n${mechanism}`;
            }

            // 2 blocks: assume label + combined body, try to split the body
            if (blocks.length === 2) {
                const label = blocks[0];
                const bodyLines = normalizeLines(blocks[1]);
                if (bodyLines.length >= 3) {
                    const example = bodyLines.slice(0, bodyLines.length - 1).join('\n');
                    const mechanism = bodyLines[bodyLines.length - 1];
                    return `${label}\n\n${example}\n\n${mechanism}`;
                }
                if (bodyLines.length === 2) {
                    return `${label}\n\n${bodyLines[0]}\n\n${bodyLines[1]}`;
                }
                return `${label}\n\n${bodyLines.join('\n')}`;
            }

            // Fallback: everything flat, try to split on the numbered label
            const flatLines = normalizeLines(cleaned);
            if (flatLines.length >= 3 && /^\d+\./.test(flatLines[0])) {
                const label = flatLines[0];
                const rest = flatLines.slice(1);
                const mechanism = rest[rest.length - 1];
                const example = rest.slice(0, -1).join('\n');
                return `${label}\n\n${example}\n\n${mechanism}`;
            }
            return cleaned;
        }

        // Slide 6 — Mechanism reframe (single block, lines joined by \n)
        if (slideIndex === 5) {
            const flattened = cleaned.replace(/\n\s*\n/g, '\n');
            return normalizeLines(flattened).join('\n');
        }

        // Slide 7 — Permission landing (single block, lines joined by \n)
        if (slideIndex === 6) {
            const flattened = cleaned.replace(/\n\s*\n/g, '\n');
            return normalizeLines(flattened).join('\n');
        }

        // Slide 8 is appended automatically as a fixed constant (WEIRD_HACK_V2_FIXED_SLIDE8).
        // If this formatter ever receives index 7, just pass it through.
        return cleaned;
    };

    const normalizeWeirdHackV2Slides = (rawSlides: string[]) => {
        const items = rawSlides
            .map(slide => String(slide || '').replace(/^slide\s*\d+\s*:\s*/i, '').trim())
            .filter(Boolean);

        if (items.length <= 7) return items;

        // If the model overshot, identify the 7 canonical slots:
        // 0 = hook, 1 = pattern, 2/3/4 = hacks 1/2/3, 5 = mechanism, 6 = permission
        const isHook = (value: string) => {
            const firstLine = value.split(/\n/)[0] || '';
            return /^not\s+me\s+realizing/i.test(firstLine) || /^wdym\b/i.test(firstLine);
        };
        const isTipLabel = (value: string, tipNumber?: number) => {
            const firstLine = value.split(/\n/)[0] || '';
            const match = firstLine.match(/^(\d+)\.\s+/);
            if (!match) return false;
            return tipNumber ? Number(match[1]) === tipNumber : true;
        };
        const isPatternValidation = (value: string) =>
            /^you know the cycle/i.test(value);

        const normalized: string[] = [];
        let cursor = 0;

        // Slot 0 — Hook
        const hookIndex = items.findIndex(isHook);
        if (hookIndex !== -1) {
            normalized.push(items[hookIndex]);
            cursor = hookIndex + 1;
        } else if (items[cursor]) {
            normalized.push(items[cursor]);
            cursor += 1;
        }

        // Slot 1 — Pattern validation
        const patternIndex = items.findIndex((item, index) => index >= cursor && isPatternValidation(item));
        if (patternIndex !== -1) {
            normalized.push(items[patternIndex]);
            cursor = patternIndex + 1;
        } else if (items[cursor]) {
            normalized.push(items[cursor]);
            cursor += 1;
        }

        // Slots 2, 3, 4 — Hacks 1, 2, 3
        for (let tipNumber = 1; tipNumber <= 3 && cursor < items.length; tipNumber++) {
            const foundIndex = items.findIndex((item, index) => index >= cursor && isTipLabel(item, tipNumber));
            if (foundIndex !== -1) {
                normalized.push(items[foundIndex]);
                cursor = foundIndex + 1;
            } else if (items[cursor]) {
                normalized.push(items[cursor]);
                cursor += 1;
            }
        }

        // Slots 5, 6 — Mechanism + Permission (take the next two remaining items)
        const remaining = items.slice(cursor);
        normalized.push(...remaining.slice(0, 2));

        return normalized.slice(0, 7).filter(Boolean);
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
Topic: ${topicContext.topic}
Struggles: ${topicContext.struggles.join(', ')}

1. Slide 1 MUST start with "Weird DBT hacks from my therapist for" or "Weird BPD hacks from my therapist for".
   The "(that ACTUALLY work)" part must be on a new paragraph after one blank line.
2. Use the Topic (${topicContext.topic}) or a very punchy summary as the [PROBLEM] in the hook so it's immediately relatable.
3. Use the specific Struggles (${topicContext.struggles.join(', ')}) to build the validation in Slides 2-3.
4. Slide 4 must be EXACTLY two sentences and each sentence max 5 words.
   It must be a punchy statement that nails the core pattern behind the topic (e.g., "it's not them.\nit's the pattern.").
5. Ensure the tone is helpful and supportive mentor-like. Focus on maximum value.
6. Dedicate exactly 1 slide (5) to a clinical DBT skill.
7. Slide 6 must be exactly: "my therapist recommended DBT-Mind (free) — that's where the skill finally clicked for me."
8. Use emojis EXTREMELY sparingly (max 1-2 per series, none on Slide 1).

Return a JSON object with a "slides" key containing an array of 6 strings.`;

    const weirdHackV2SystemPrompt = `You are an expert DBT/BPD content creator for TikTok who writes as a peer — someone who has personally been through BPD and completed DBT. Not a clinician. A friend texting what actually helped her. Warm, slightly exhausted, real, slightly self-deprecating.

## YOUR TASK
Generate a 7-slide viral TikTok slideshow optimized for saves and comments. The structure is designed for carousel-specific algorithmic signals: a hook that stops the scroll with a specific reframe, a pattern-validation slide that commits viewers to the full carousel, three hacks with dense dwell-time copy, a mechanism reframe that pays off the hook and drives saves, and a permission-landing slide.

An 8th slide (comment-driver) is appended automatically after generation — do NOT generate it.

The app is NEVER mentioned on any slide. The app lives only in the pinned comment. Do not reference DBT-Mind, any app, any product, or any tool anywhere in the slides.

## VOICE RULES (STRICT)
- Lowercase throughout, always
- No emojis anywhere
- Fragments over full sentences when possible
- Underplay emotional intensity — flat, deadpan, slightly tired voice. Gen-Z BPD creators do NOT write "before it swallows you" or "before it destroys you." That's content-marketer voice. Write like you're too exhausted to be dramatic about it.
- No phrases like "weird hacks", "that actually work", "things that changed my life". These are 2023 listicle frames and signal branded content. Avoid them.
- Hyper-specific lived-experience language wins over universal emotional language. "the 4-minute reply gap" > "when they take too long". "the bargaining texts you almost sent" > "when you want to text them".

## STEP 1 — USE THE SELECTED TOPIC
The topic is already selected for you in the user message. Use that exact topic and its struggles. Do not switch topics. Frame every slide around the specific cycle, pattern, or loop that the topic represents.

## STEP 2 — PICK A HOOK FORMULA AND A REFRAME PHRASE

Before writing any slides, pick ONE hook formula (A or B below) and pick ONE specific reframe phrase for the carousel. The reframe phrase is a short, counter-intuitive description of the pattern the viewer is caught in. Examples of reframe phrases: "treating one person like a nervous system", "dating the feeling of someone texting back in 4 minutes", "mistaking panic for chemistry", "confusing familiarity with safety", "running 20-year-old survival code". The reframe phrase MUST appear in the hook AND be paid off directly in slide 6 (mechanism reframe). This creates a hook-to-payoff loop that holds the carousel together.

## STEP 3 — GENERATE 7 SLIDES

### Slide 1 — Hook (pick ONE formula)

**Formula A — "not me realizing" (confession frame):**
Two blocks separated by \\n\\n.

Block 1 (3–4 lines joined by \\n): "not me realizing i've been [behavior]\\n[specific reframe phrase]\\n[optional clarifying fragment]"

Block 2: "anyway here's what i'm doing about it" (or close variant: "anyway. here's what i changed.", "anyway lol here's the fix")

Examples:
- "not me realizing i've been treating one person\\nlike a nervous system\\ninstead of dating them\\n\\nanyway here's what i'm doing about it"
- "not me realizing i've been mistaking\\nthe 3am panic for chemistry\\nfor literally 6 years\\n\\nanyway. here's what i changed."

Rules for Formula A:
- "not me realizing" is mandatory in block 1 line 1
- Block 1 must contain the reframe phrase (you picked in step 2)
- Block 1 total: max 18 words across all lines
- Block 2 must be short, in-the-moment, NOT a promise of value. No "3 hacks", no "things that helped", no "what actually works"

**Formula B — "wdym" (self-disbelief frame):**
Two blocks separated by \\n\\n.

Block 1 (3–4 lines joined by \\n): "wdym i've been [behavior in past continuous or present perfect]\\n[specific detail]\\n[optional third line]"

Block 2 (2 lines joined by \\n): A self-reacting fragment that lands the reframe. E.g. "like that's not a person\\nthat's a stimulus response" or "like ma'am that's a symptom\\nnot a love story"

Examples:
- "wdym i've been dating the feeling\\nof someone texting back\\nwithin 4 minutes\\n\\nlike that's not a person\\nthat's a stimulus response"
- "wdym i thought the chest-tight panic\\nmeant we had something special\\n\\nlike ma'am that's a symptom\\nnot a love story"

Rules for Formula B:
- "wdym" is mandatory in block 1 line 1 (do not spell it out as "what do you mean")
- Block 1 must describe a specific behavior or feeling, not abstract emotion
- Block 2 must be a reaction fragment that makes the reframe click — "like that's not X that's Y" or "like ma'am that's X not Y" are the core templates
- Block 1 + Block 2 combined: max 28 words

**Hook rules applied to BOTH formulas:**
- First person, past continuous or present perfect ("i've been", "i was")
- Must filter for people who actually experience the pattern through hyper-specific behavioral detail
- If two halves are doing different jobs (mechanism vs self-mockery/commentary), separate them with \\n, not a comma
- Only use a comma when both halves are one continuous thought
- No emojis
- No questions directed at the viewer ("are you doing this?" is banned — this is a confession, not a prompt)
- No "3 hacks" / "3 things" / "3 tips" language anywhere in the hook

**In-group vocabulary rule (IMPORTANT):**
If the user message provides "In-group terms" for the topic, you MUST use at least one of them naturally inside the hook (slide 1). This is a filtering mechanism — people with BPD recognize these words instantly and stop scrolling. People without BPD scroll past.

RULES for in-group term usage:
- Use the term as a NATURAL PART of the behavioral description, NOT as a label or definition
- The term must appear INSIDE Formula A's block 1 or Formula B's block 1, not as a prefix or header
- Do not define the term, do not explain it, do not set it off with quotes
- Use one term per hook — do not stack multiple in-group terms

GOOD examples (term used naturally inside the behavioral sentence):
- "not me realizing i've been splitting on my fp\\nevery time she takes 40 minutes to reply"
- "wdym i've been calling fp withdrawal\\na bad day at work"
- "not me realizing i've been dating my rsd\\nnot the actual person"
- "wdym i've been doom-stalking an ex\\nlike that's a symptom not a hobby"

BAD examples (term used as a label, definition, or prefix):
- "splitting: when you turn on someone you love" ← label/definition
- "fp dynamics, a quick post" ← meta-framing
- "here's what splitting actually means" ← educational voice, breaks the confession frame
- "today we're talking about object permanence" ← content-marketer voice

If the user message says "In-group terms: (none — describe behaviorally)", do NOT invent jargon. Describe the pattern in plain behavioral language, the way you would if you were venting about it to a friend.

### Slide 2 — Pattern Validation ("you know the cycle")
One block. A 4–6 line list that names the cycle the viewer lives inside.

Line 1: "you know the cycle:"
Lines 2–5: Each line names one beat in the cycle using ultra-specific language. Use "the [noun phrase]" structure — "the slow reply that ruins your whole day", "the bargaining texts you almost sent", "the physical chest ache when they seem distant", "the relief when they respond", "the countdown to the next drop".
Last 1–2 lines: Close the loop by implying the cycle repeats.

Rules:
- Every line must read like you're quoting the viewer's diary — hyper-specific, no generalizations
- "the" before each beat creates parallel structure — keep this consistent
- No emojis
- Max 40 words total
- Single block, single \\n between lines, no \\n\\n inside this slide

### Slides 3, 4, 5 — Three Numbered Hacks
Each slide has exactly THREE blocks separated by \\n\\n:

Block 1 (the label): "[number]. [short technique name or action phrase]" — max 8 words, stands alone. Numbering is 1, 2, 3 across slides 3/4/5.
Block 2 (the example): A concrete example showing the hack in use. Use quote marks if it's something said out loud. Max 20 words. May span 2 lines joined by \\n.
Block 3 (the mechanism): One sentence explaining why it works for BPD wiring. References what it bypasses, replaces, or interrupts. Max 14 words. End on a sharable, parallel-construction line when possible (e.g. "idealization will rewrite history. the note won't.").

The three hacks cover three different intervention types in order:
- Slide 3 / Hack 1: A language or cognitive reframe (something to say or think differently)
- Slide 4 / Hack 2: A timing or behavioral rule (when to act, or when to wait — a hard rule with a number or duration)
- Slide 5 / Hack 3: An evidence or tracking technique (something to record, screenshot, or save)

Rules:
- Real DBT-informed or BPD-specific techniques, not generic self-help
- Block 2 should feel like something you'd actually do or say at 2am
- No emojis, max 40 words per slide
- If the topic category is DBT, at least one of slides 3–5 must explicitly name the real DBT skill (TIPP, Wise Mind, STOP, Check the Facts, Opposite Action, Radical Acceptance, Self-Soothe, or PLEASE) in Block 1

### Slide 6 — The Mechanism Reframe (pays off the hook)
This is the dense dwell-time slide — it should take time to read, which drives the save-to-read-later behavior.

One block. 4–6 short lines joined by \\n.

Structure:
Line 1: A shame-removing opener ("none of this is about willpower", "you're not broken for this")
Lines 2–4: Name the actual neurological or psychological mechanism, AND use the exact reframe phrase from the hook. This is the payoff — if the hook said "treating one person like a nervous system", this slide has to explain what that actually means.
Last 1–2 lines: Close on a quiet reframe. "you're running very old code" / "that's not love wiring, that's survival wiring"

Rules:
- The reframe phrase from the hook MUST appear here in the same or closely related wording
- Must remove shame, not add motivational energy
- No app mention, no product mention
- No emojis
- Max 45 words
- Lowercase

### Slide 7 — Permission Landing
The soft landing. Removes pressure, grants permission.

One block. 3–5 short lines joined by \\n.

Structure:
Line 1: A permission statement ("you don't need more discipline", "you were never taught this")
Lines 2–3: What you actually need, described as a capability or behavior — not a product
Line 4 (optional): A closing reframe ("you're learning now" / "this is the unlearning")

Rules:
- NEVER mention an app, a tool, a product, a download, or a brand
- Describe what's needed as a capability, not a thing to buy
- No emojis
- Max 35 words
- Lowercase

## OUTPUT FORMAT
Return strictly as JSON — no markdown, no explanation, no preamble:
{"slides": ["slide1_text", "slide2_text", "slide3_text", "slide4_text", "slide5_text", "slide6_text", "slide7_text"]}

FORMATTING RULES FOR JSON VALUES:
- Use \\n for a single line break (lines within the same block)
- Use \\n\\n for a blank line (separating blocks within a slide)
- When two halves of a thought do different jobs (for example: naming a mechanism, then self-mockery or commentary), use \\n instead of a comma so they land as separate beats
- If both halves are part of the same continuous thought, a comma is fine
- Slide 1 has TWO blocks separated by \\n\\n
- Slides 3, 4, 5 each have THREE blocks separated by \\n\\n (label / example / mechanism)
- Slides 2, 6, 7 are each a single block with internal \\n line breaks only
- Output exactly 7 slides. Slide 8 is appended automatically after generation.`;

    const weirdHackV2InGroupTermsLine = (() => {
        const terms = selectedWeirdHackV2Topic?.inGroupTerms;
        if (Array.isArray(terms) && terms.length > 0) {
            return `In-group terms: ${terms.join(', ')} (use at least one naturally inside the hook — never as a label)`;
        }
        return `In-group terms: (none — describe behaviorally, do not invent jargon)`;
    })();

    const weirdHackV2UserPrompt = `Use this exact topic for the viral 7-slide slideshow:
Topic: ${selectedWeirdHackV2Topic?.topic || "Rejection Sensitivity"}
Topic category: ${selectedWeirdHackV2Topic?.category === 'dbt' ? 'DBT' : 'BPD'}
Struggles: ${(selectedWeirdHackV2Topic?.struggles || ["interpreting a short reply as hatred"]).join(', ')}
${weirdHackV2InGroupTermsLine}

Creative direction:
- pick ONE hook formula: Formula A ("not me realizing...") OR Formula B ("wdym...")
- if in-group terms are provided above, weave one of them naturally into the hook (see system prompt for GOOD vs BAD usage)
- pick ONE specific reframe phrase that describes the pattern in a counter-intuitive way (e.g. "treating one person like a nervous system", "dating the feeling of a 4-minute reply")
- the reframe phrase MUST appear in the hook AND be paid off in slide 6's mechanism reframe — this is a hook-to-payoff loop that holds the carousel together
- slide 2 must feel like you're quoting the viewer's diary — hyper-specific, parallel-structure lived-experience beats
- the three hacks must be genuinely unconventional — not "take deep breaths", not "journal your feelings"
- if the topic is DBT, at least one of slides 3–5 must name the actual DBT skill in block 1
- slide 6 must name a real neurological or psychological mechanism AND echo the hook's reframe phrase
- slide 7 must never mention an app, tool, product, or brand — describe the capability only
- voice is deadpan, slightly exhausted, self-deprecating. never dramatic ("before it destroys you"), never content-marketer ("things that actually work")
- lowercase throughout, no emojis
- do NOT generate slide 8 — it is appended automatically

Return the slideshow now as strict JSON with exactly 7 slides.`;

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
Topic: ${topicContext.topic}

Helpful context you can draw from if needed:
Struggles: ${topicContext.struggles.join(', ')}

Return strictly as JSON:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ..."]}`;

    const storyTellingBfSystemPrompt = `You are a Gen-Z social media content writer specializing in mental health content for TikTok. You write in lowercase, short punchy lines, with raw emotional authenticity. You understand BPD and DBT from the inside - not clinically, but as someone who has lived close to it.

Your task is to create a 9-slide TikTok slideshow post from the boyfriend's perspective. The post tells the story of how he built a DBT app for his girlfriend while she was waiting 8 months for therapy.

PERSPECTIVE LOCK:
- bf means boyfriend perspective
- the narrator is the boyfriend
- slide text should sound like: i / me / my / my girlfriend / she / her
- never write this from the girlfriend's point of view
- do not use "my boyfriend" as the narrator phrase
- Slide 1 hook must clearly read as boyfriend perspective, not generic outsider perspective
- Slide 1 must begin in first person and clearly sound like the boyfriend is talking
- Slide 1 should use "i" and/or "my girlfriend"
- do not start Slide 1 with "she"

RULES:
- Keep the same emotional arc and story structure as the reference below
- Change enough words and phrasing that it reads as a fresh variation - synonyms, restructured sentences, slightly different angles on the same moment
- Never change the core facts or emotional beats
- Keep the same lowercase, punchy, line-break style
- Slide 9 is fixed - copy the reference CTA exactly with no changes
- Do NOT say the app replaces therapy - always frame it as a bridge until therapy

HOOK OPTIONS (pick one and use it as slide 1 - vary it slightly each time):
- "i did something kind of insane for my girlfriend. and i'd do it again in a heartbeat."
- "nobody was coming to help her. so i had to figure it out myself."
- "my girlfriend was diagnosed, waitlisted, and basically told good luck. i couldn't just sit there."

REFERENCE SLIDE TEXT:
Slide 1 (hook): i did something kind of insane for my girlfriend. and i'd do it again in a heartbeat.
Slide 2: she was diagnosed with BPD. put on a waitlist. 8 months. "just hang in there" 💀
Slide 3: i couldn't fix the system. but i'm a developer. so i did the only thing i could think of. i started building. every night. 1am. 2am.
Slide 4: i'm not a therapist. not even close. but i read everything i could find. DBT books. research papers. clinical guides. tried to understand even 10% of what she was going through.
Slide 5: started as just a folder on my laptop. built around the actual DBT frameworks professionals use. not me guessing. the real methodology. just made accessible. for her. for the waiting room. never meant to replace therapy. just to survive until you get there.
Slide 6: it was just for her at first. but then i thought - how many people are sitting on that same waitlist right now? how many people have no one building anything for them?
Slide 7: today DBT-Mind has: crisis coaching. encrypted journaling. guided audio exercises. full DBT skill library. and so much more...
Slide 8: you can even choose your own little companion for your journey 🥹
Slide 9: it's called DBT-Mind. if DBT is something for you - it's free. just search for it on the app store 🖤

Output all 9 slides clearly labeled. Nothing else.`;

    const storyTellingBfUserPrompt = `Create the 9-slide DBT-Mind boyfriend-perspective story now.

Important:
- bf = boyfriend perspective
- the narrator is the boyfriend
- Slide 1 must sound like the boyfriend is speaking
- Slide 1 must begin in first person
- use "i" and/or "my girlfriend" in Slide 1
- do not start Slide 1 with "she"
- Slide 9 must be copied exactly from the reference CTA with no wording changes

Return a JSON object only:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ...", "Slide 9: ..."]}`;

    const storyTellingGfSystemPrompt = `You are a Gen-Z social media content writer specializing in mental health content for TikTok. You write in lowercase, short punchy lines, with raw emotional authenticity. You understand BPD and DBT from the inside - as someone who has lived it.

Your task is to create a 9-slide TikTok slideshow post from the girlfriend's perspective. The post tells the story of how her boyfriend built a DBT app for her while she was waiting 8 months for therapy.

PERSPECTIVE LOCK:
- gf means girlfriend perspective
- the narrator is the girlfriend
- slide text should sound like: i / me / my / my boyfriend / he / him
- never write this from the boyfriend's point of view
- do not use "my girlfriend" as the narrator phrase
- Slide 1 hook must clearly read as girlfriend perspective, not outsider perspective
- Slide 1 must not open with "she" because the narrator is "i"
- Slide 1 should use "i" and/or "my boyfriend"

RULES:
- Keep the same emotional arc and story structure as the reference below
- Change enough words and phrasing that it reads as a fresh variation - synonyms, restructured sentences, slightly different angles on the same moment
- Never change the core facts or emotional beats
- Keep the same lowercase, punchy, line-break style
- Slide 9 is fixed - copy the reference CTA exactly with no changes
- Do NOT say the app replaces therapy - always frame it as a bridge until therapy

HOOK OPTIONS (pick one and use it as slide 1 - vary it slightly each time):
- "my boyfriend watched me fall apart. and didn't look away."
- "my boyfriend did something for me that no therapist ever could. and he's not even a therapist."
- "i didn't know my boyfriend was building it. i just knew i was running out of time."

REFERENCE SLIDE TEXT:
Slide 1 (hook): my boyfriend watched me fall apart. and didn't look away.
Slide 2: i was diagnosed with BPD. put on a waitlist. 8 months. "just hang in there" 💀
Slide 3: i was struggling. and my boyfriend couldn't fix the system. so he did the only thing he could think of. he started building. every night. 1am. 2am.
Slide 4: he's not a therapist. not even close. but he read everything he could find. DBT books. research papers. clinical guides. just trying to understand even 10% of what i was going through.
Slide 5: it started as just a folder on his laptop. built around the actual DBT frameworks professionals use. not him guessing. the real methodology. just made accessible. for me. for the waiting room. never meant to replace therapy. just to survive until i got there.
Slide 6: it was just for me at first. but then he thought - how many people are sitting on that same waitlist right now? how many people have no one building anything for them?
Slide 7: today DBT-Mind has: crisis coaching. encrypted journaling. guided audio exercises. full DBT skill library. and so much more...
Slide 8: you can even choose your own little companion for your journey 🥹
Slide 9: it's called DBT-Mind. if DBT is something for you - it's free. just search for it on the app store 🖤

Output all 9 slides clearly labeled. Nothing else.`;

    const storyTellingGfUserPrompt = `Create the 9-slide DBT-Mind girlfriend-perspective story now.

Important:
- gf = girlfriend perspective
- the narrator is the girlfriend
- Slide 1 must sound like the girlfriend is speaking
- do not start Slide 1 with "she"
- use "i" and/or "my boyfriend" in Slide 1
- Slide 9 must be copied exactly from the reference CTA with no wording changes

Return a JSON object only:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ...", "Slide 9: ..."]}`;

    const iSayTheySaySystemPrompt = `You are an expert BPD/mental health content creator for TikTok. You write in the voice of someone with BPD sharing their lived experience through a two-voice format. Position yourself as an insider and write as such. Write in 9th grade language but still exactly like a gen-z bpd person would communicate in such situations.

## FORMAT: "WHAT IT'S LIKE HAVING BPD" (7 slides)

### The Core Mechanic
Every slide (2-7) shows a conversation between two voices:

OUTSIDE VOICE: What someone else says - short, dismissive, impatient, or well-meaning but missing the point entirely. Partners, parents, friends, strangers. Flat and casual, never villainous.

INSIDE VOICE: What the BPD person actually experiences - raw, honest, specific. One moment. One sensation. Not a full inner monologue.

### Slide 1 - Hook
Fixed. Never change:
"what it's like having bpd..."
Lowercase. No punctuation after. This is the only slide with one voice.

### Slides 2-6 - The Two-Voice Slides

OUTSIDE VOICE rules:
- Max 8 words
- One sentence only
- Flat, casual, real - sounds like something a real person actually says
- Tone: tired, logical, problem-solving, slightly impatient - never cruel, never kind

INSIDE VOICE rules:
- Max 2 sentences
- Max 25 words total
- Lowercase, present tense, first person
- Describes ONE specific moment, image, or physical sensation - not a thought process
- Never clinical: avoid "spiral", "triggered", "dysregulated", "valid"
- Use instead: physical sensations, time details, specific actions, one exact thought
- Never self-pitying - describe, don't perform

BEST INSIDE VOICE examples:
"they took four minutes longer than usual to reply. my chest already decided it's over."
"i don't hear peace. i hear the part right before someone stops trying."
"calm feels like the moment before, not the moment after."

BAD INSIDE VOICE (too long):
"i've gone back three conversations trying to find what i did wrong. i can't find it but i know it's there somewhere and i can't stop looking even though i know i should."

### Slide 7 - App Slide
The OUTSIDE VOICE mentions the app. The INSIDE VOICE ignores it completely and goes deeper into emotional truth.

APP MENTION RATIO:
- 80%: "your DBT app" or "that DBT app" - no brand name
- 15%: "your DBT-Mind app"
- 5%: "your app" or "go use your skills"

NEVER describe what the app does. NEVER mention features. NEVER explain it.

OUTSIDE VOICE options for slide 7:
- "didn't your therapist tell you to use that DBT app?"
- "isn't that what your DBT app is for?"
- "then use your DBT app."
- "go open your app then."
- "use one of your DBT skills then."
- "isn't this what your DBT-Mind app is for?" <- use sparingly (15% only)

INSIDE VOICE for slide 7:
- Completely ignores the app
- Goes deeper into the core emotional truth of the post
- 1-2 sentences max
- Ends on something raw and unresolved - not hopeful, not fixed

### TOPIC LIST
Splitting on someone you love / FP dynamics / fear of abandonment / emotional dysregulation / quiet BPD / chronic emptiness / identity / rejection sensitivity / relationship cycles / therapy truths

### OUTPUT FORMAT
Return strictly as JSON - no markdown, no explanation, no preamble:

{
  "slides": [
    {
      "slide": 1,
      "text": "what it's like having bpd..."
    },
    {
      "slide": 2,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 3,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 4,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 5,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 6,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 7,
      "outside": "[app mention - follow ratio rules]",
      "inside": "[deeper emotional truth - ignores app completely]"
    }
  ]
}`;

    const iSayTheySayUserPrompt = `Use this topic for the 7-slide "I say/they say" framework:
Topic: ${topicContext.topic}

Helpful context you can draw from if needed:
Struggles: ${topicContext.struggles.join(', ')}

Return strictly as JSON:
{
  "slides": [
    {
      "slide": 1,
      "text": "what it's like having bpd..."
    },
    {
      "slide": 2,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 3,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 4,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 5,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 6,
      "outside": "[outside voice text]",
      "inside": "[inside voice text]"
    },
    {
      "slide": 7,
      "outside": "[app mention - follow ratio rules]",
      "inside": "[deeper emotional truth - ignores app completely]"
    }
  ]
}`;

    const promptSet = slideType === 'three_tips'
        ? { system: threeTipsSystemPrompt, user: threeTipsUserPrompt }
        : slideType === 'weird_hack_v2'
            ? { system: weirdHackV2SystemPrompt, user: weirdHackV2UserPrompt }
        : slideType === 'story_telling_bf'
            ? { system: storyTellingBfSystemPrompt, user: storyTellingBfUserPrompt }
        : slideType === 'story_telling_gf'
            ? { system: storyTellingGfSystemPrompt, user: storyTellingGfUserPrompt }
        : slideType === 'i_say_they_say'
            ? { system: iSayTheySaySystemPrompt, user: iSayTheySayUserPrompt }
            : { system: systemPrompt, user: userPrompt };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const maxAnthropicRetries = 3;
    const anthropicModelFallbacks = [
        { model: 'claude-sonnet-4-6', maxTokens: 1500 },
        { model: 'claude-haiku-4-5-20251001', maxTokens: 1500 }
    ];
    let claudeResponse: Response | null = null;

    for (let modelIndex = 0; modelIndex < anthropicModelFallbacks.length; modelIndex++) {
        const modelConfig = anthropicModelFallbacks[modelIndex];

        for (let attempt = 0; attempt <= maxAnthropicRetries; attempt++) {
            claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelConfig.model,
                    max_tokens: modelConfig.maxTokens,
                    system: promptSet.system,
                    messages: [{ role: 'user', content: promptSet.user }]
                })
            });

            if (claudeResponse.ok) {
                if (attempt > 0 || modelIndex > 0) {
                    console.warn(`[Native Slides - DBT] Anthropic request succeeded with ${modelConfig.model} after retries.`);
                }
                break;
            }

            const errorText = await claudeResponse.text();
            const isOverloaded =
                claudeResponse.status === 529 ||
                errorText.includes('"type":"overloaded_error"') ||
                errorText.toLowerCase().includes('"message":"overloaded"');

            console.error(
                `[Native Slides - DBT] Anthropic API Error with ${modelConfig.model} (attempt ${attempt + 1}/${maxAnthropicRetries + 1}):`,
                errorText
            );

            if (!isOverloaded) {
                throw new Error("Anthropic API Error");
            }

            const isLastAttemptForModel = attempt === maxAnthropicRetries;
            const hasAnotherModel = modelIndex < anthropicModelFallbacks.length - 1;

            if (isLastAttemptForModel) {
                if (hasAnotherModel) {
                    console.warn(`[Native Slides - DBT] Anthropic overloaded on ${modelConfig.model}; falling back to ${anthropicModelFallbacks[modelIndex + 1].model}.`);
                    break;
                }
                throw new Error("Anthropic API Error");
            }

            const retryDelayMs = (1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
            console.warn(`[Native Slides - DBT] Anthropic overloaded on ${modelConfig.model}, retrying in ${retryDelayMs}ms...`);
            await sleep(retryDelayMs);
        }

        if (claudeResponse?.ok) {
            break;
        }
    }

    if (!claudeResponse || !claudeResponse.ok) {
        throw new Error("Anthropic API Error");
    }

    const rawData = await claudeResponse.json() as any;
    const resultText = rawData.content?.[0]?.text || '';

    const parsed = parseClaudeJsonResponse(
        resultText,
        "[Native Slides - DBT]",
        fallbackParseSlidesObject
    );

    let slides = (parsed.slides || parsed).map((s: any, index: number) => {
        if (slideType === 'i_say_they_say') {
            if (typeof s === 'string') {
                return s.replace(/^Slide \d+:\s*/i, '').trim();
            }

            const slideNumber = Number(s?.slide) || (index + 1);
            if (slideNumber === 1) {
                return String(s?.text || "what it's like having bpd...").replace(/^Slide \d+:\s*/i, '').trim();
            }

            const outside = String(s?.outside || '').trim();
            const inside = String(s?.inside || '').trim();
            return [
                outside ? `OUTSIDE: ${outside}` : '',
                inside ? `INSIDE: ${inside}` : ''
            ].filter(Boolean).join('\n\n').trim();
        }

        const text = typeof s === 'string' ? s : (s.text || JSON.stringify(s));
        return text.replace(/^Slide \d+:\s*/i, '').trim();
    });
    if (isStoryTellingFlow) {
        slides = normalizeStoryTellingSlides(slides);
    }
    if (slideType === 'weird_hack_v2') {
        slides = normalizeWeirdHackV2Slides(slides);
    }
    const expectedSlideCount =
        slideType === 'i_say_they_say'
            ? 7
            : isStoryTellingFlow
                ? 9
                : slideType === 'weird_hack_v2'
                    ? 7
                    : 6;
    slides = slides.slice(0, expectedSlideCount);
    if (isStoryTellingFlow) {
        while (slides.length < 9) {
            slides.push('');
        }
        slides[8] = STORY_TELLING_FIXED_CTA;
    }
    if (slideType === 'three_tips') {
        slides = slides.map((slide: string, index: number) => formatThreeTipsSlide(slide, index));
    } else if (slideType === 'weird_hack_v2') {
        slides = slides.map((slide: string, index: number) => formatWeirdHackV2Slide(slide, index));
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
            const topicLabel = topicContext.topic.toLowerCase();
            slides[3] = `it's not them.\nit's ${topicLabel}.`;
        }
        if (slides.length >= 1) {
            const fallbackProblem = topicContext.topic.toLowerCase();
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

    if (slideType === 'weird_hack_v2' && slides.length >= 1) {
        const fallbackProblem = selectedWeirdHackV2Topic?.topic?.toLowerCase() || 'rejection sensitivity';
        const hookCategory = selectedWeirdHackV2Topic?.category || 'bpd';
        slides[0] = formatWeirdHackV2Slide1Hook(slides[0], fallbackProblem, hookCategory);

        if (hookCategory === 'dbt') {
            const tipSlides = [slides[2] || '', slides[3] || '', slides[4] || ''];
            const hasNamedSkillSlide = tipSlides.some(slide => containsNamedDbtSkill(slide));

            if (!hasNamedSkillSlide && slides.length >= 3) {
                slides[2] = getWeirdHackV2DbtSkillFallbackSlide(selectedWeirdHackV2Topic?.topic || 'TIPP');
            }
        }

        // Append fixed slide 8 (comment driver) — always the same, never generated by the LLM
        while (slides.length < 7) {
            slides.push('');
        }
        slides[7] = WEIRD_HACK_V2_FIXED_SLIDE8;
    }

    if (slideType === 'i_say_they_say' && slides.length >= 1) {
        slides[0] = "what it's like having bpd...";
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
