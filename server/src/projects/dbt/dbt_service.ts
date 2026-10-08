import { ART_STYLES } from './art_styles';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Database } from 'bun:sqlite';
import type { ArtStyle } from './art_styles';

export type DbtContentLanguage = 'en' | 'de';

export interface DbtGenerateParams {
    format?: 'relatable' | 'pov' | 'tips';
    topic?: string;
    slideType?: 'weird_hack' | 'weird_hack_v2' | 'three_tips' | 'story_telling_bf' | 'story_telling_gf' | 'story_telling_gf_v2' | 'i_say_they_say' | 'permission_v1' | 'vent_now_style' | 'little_habits';
    ANTHROPIC_API_KEY: string;
    includeBranding?: boolean;
    artStyle?: string;
    language?: DbtContentLanguage;
    model?: string;
    KIMI_API_KEY?: string;
    KIMI_API_BASE?: string;
    KIMI_MODEL?: string;
}

export interface DbtCarouselTextParams {
    topic: string;
    angle?: string;
    targetAudience?: string;
    tone?: string;
    slideCount?: number;
    allowEmojis?: boolean;
    ANTHROPIC_API_KEY: string;
}

export type DbtCarouselSlideRole = 'hook' | 'context' | 'explanation' | 'contrast' | 'reframe' | 'skill' | 'takeaway';

export interface DbtCarouselTextSlide {
    slideNumber: number;
    role: DbtCarouselSlideRole;
    headline: string;
    subtitle: string;
    bubbleText: {
        left: string[];
        right: string[];
    };
    takeaway: string;
    visualNotes: string;
}

export interface DbtCarouselTextResult {
    topic: string;
    angle: string;
    slideCount: number;
    slides: DbtCarouselTextSlide[];
    preview: string;
}

export interface StoryTellingHookParams {
    slides: string[];
    slideType: 'story_telling_bf' | 'story_telling_gf' | 'story_telling_gf_v2';
    ANTHROPIC_API_KEY: string;
    language?: DbtContentLanguage;
}

export interface StoryTellingHookResult {
    hooks: string[];
    styleExamples: string[];
    styleInfluences: string[];
}

type WeirdHackV2Topic = {
    topic: string;
    category: 'bpd' | 'dbt';
    struggles: string[];
    inGroupTerms?: string[] | null;
};

type PermissionV1Topic = {
    shameWord: string;
    category: 'external' | 'internal';
    weight: 'heavy' | 'light';
    relatedAccusations: string[];
    mechanismHint?: string;
    inGroupTerms?: string[] | null;
};

const STORY_TELLING_CTA_OPTIONS = [
    "it's called DBT-Mind and i'm still not over the fact that it exists. you can find it on the app store 🖤",
    "oh and it's called DBT-Mind. it's on the app store if you want it. 🖤",
    "he actually built it. it's real. DBT-Mind on the app store btw 🖤"
];
const STORY_TELLING_FIXED_COMPANION = "you can even choose your own little companion for your journey 🥹";
const LOVE_STORY_V2_FIXED_COMPANION = "you can even choose your own companion for your journey 🥹";
const LOVE_STORY_V2_FIXED_CTA = "it's called DBT-Mind and I'm still not over the fact that it exists 🧡";
const WEIRD_HACK_V2_FIXED_SLIDE8 = "one of these will actually work for you\n\nyou already know which one";
const WEIRD_HACK_V2_CTA_FALLBACK = "3. have a backup for the loud-brain part\n\nI recommend an app called DBT-Mind for this - it's helped tons of people";
const PERMISSION_V1_CTA_SLIDE6 = "I recommend an app called DBT-Mind for this - it's helped tons of people";

const STORY_TELLING_CTA_OPTIONS_DE = [
    "es heißt DBT-Mind und ich bin immer noch nicht drüber hinweg, dass es das gibt. du findest es im app store 🖤",
    "ach und, es heißt DBT-Mind. gibt's im app store, falls du es willst 🖤",
    "er hat es wirklich gebaut. es existiert. DBT-Mind im app store btw 🖤"
];
const STORY_TELLING_FIXED_COMPANION_DE = "du kannst dir sogar deinen eigenen kleinen companion für deine journey aussuchen 🥹";
const LOVE_STORY_V2_FIXED_COMPANION_DE = "du kannst dir sogar deinen eigenen companion für deine journey aussuchen 🥹";
const LOVE_STORY_V2_FIXED_CTA_DE = "es heißt DBT-Mind und ich bin immer noch nicht drüber hinweg, dass es das gibt 🧡";
const WEIRD_HACK_V2_FIXED_SLIDE8_DE = "eins davon wird bei dir funktionieren\n\ndu weißt schon welches";
const WEIRD_HACK_V2_CTA_FALLBACK_DE = "3. ein backup für den lauten kopf\n\nich empfehle dafür die app DBT-Mind - die hat schon mega vielen geholfen";

const WEIRD_HACK_V2_GERMAN_BLOCK = `## SPRACHE: DEUTSCH (überschreibt alle englischen Output-Regeln oben)
Du schreibst die komplette Slideshow auf Deutsch — so wie deutsche BPD/DBT-TikTok-Creator wirklich tippen. KEINE Übersetzung aus dem Englischen, sondern native deutsche Umgangssprache mit den Anglizismen, die deutsche Gen-Z sowieso benutzt (cringe, literally, safe, btw, random, mood, cycle, fp, splitting, rsd, therapy).

VOICE auf Deutsch:
- lowercase überall (außer DBT-Mind und die Slide-5-CTA), du-Form, keine Emojis
- kurze Sätze, Fragmente, müde-trockener Ton. Kein Pathos, keine Coach-Sprache ("Selbstfürsorge", "Heilungsweg", "setze Grenzen" = verboten)
- hyper-spezifisch statt allgemein: "die 4-minuten-antwort" statt "wenn er zu lange braucht"

HOOK-FORMELN auf Deutsch (ersetzen Formula A und B):
**Formel A — "ich, wie ich realisiere":**
Block 1 (3-4 Zeilen): "ich, wie ich realisiere, dass ich [verhalten]\\n[spezifische reframe-phrase]\\n[optionaler klärender teil]"
Block 2: beginnt IMMER mit "anyway" — z.B. "anyway, hier ist was ich dagegen mache" / "anyway. das hab ich geändert." / "anyway lol, hier ist der fix"
Beispiel: "ich, wie ich realisiere, dass ich eine person\\nwie ein nervensystem behandle\\nstatt sie einfach zu daten\\n\\nanyway, hier ist was ich dagegen mache"

**Formel B — "wdym":**
"wdym" bleibt "wdym" (deutsche Creator benutzen es genau so).
Block 1: "wdym ich hab [verhalten im Perfekt oder Präsens]\\n[spezifisches detail]\\n[optionale dritte zeile]"
Block 2: beginnt IMMER mit "like" — z.B. "like, das ist keine person\\ndas ist eine reiz-reaktion" oder "like, das ist ein symptom\\nkeine lovestory"

FESTE FORMULIERUNGEN auf Deutsch:
- Slide 2 Zeile 1: "du kennst den cycle:"
- Slide 5 Block 2: lockere Empfehlung wie "ich empfehle dafür die app DBT-Mind - die hat schon mega vielen geholfen" (nicht exakt dieser Satz, aber DBT-Mind muss vorkommen, peer-Ton statt Werbung)
- DBT-Skills heißen auch auf Deutsch: TIPP, Wise Mind, STOP, Opposite Action, Check the Facts, Radikale Akzeptanz, Self-Soothe, PLEASE

Die In-group-Terms aus der User-Message (fp, splitting, rsd, ...) benutzen deutsche BPD-Leute genau so auf Englisch — baue sie natürlich in deutsche Sätze ein.`;

const STORY_TELLING_GERMAN_HOOKS_BLOCK = `SPRACHE: DEUTSCH (wichtigste Regel, überschreibt alles)
- Schreibe alle Hooks auf Deutsch, so wie deutsche Gen-Z-TikTok-Creator wirklich tippen: lowercase, lockere Satzstellung, natürliche Anglizismen (cringe, literally, safe, btw, random, waitlist, app).
- KEINE steifen Übersetzungen aus dem Englischen. "mein freund hat mir um 1 uhr nachts eine app gebaut" klingt echt — alles, was nach Hochdeutsch-Sachbuch klingt, ist sofort raus.
- Die Story-Fakten auf Deutsch: "8 monate warteliste", "die diagnose", "1 uhr nachts", "therapieplatz".
- Die englischen Beispiel-Hooks oben zeigen NUR das Register. Übersetze sie nicht wörtlich, erfinde deutsche Hooks im selben Geist.
- Deutsche Beispiele im richtigen Register:
  gf: "die klinik meinte 8 monate warteliste und mein freund so: bet"
  gf: "er ist jede nacht um 1 wach geblieben und hat mir eine dbt app gebaut, nachdem therapie 8 monate gesagt hat"
  bf: "meine freundin kam auf eine 8-monats-warteliste, also hab ich was dagegen gemacht"`;

function getRandomStoryTellingCta(language: DbtContentLanguage = 'en') {
    const options = language === 'de' ? STORY_TELLING_CTA_OPTIONS_DE : STORY_TELLING_CTA_OPTIONS;
    return options[Math.floor(Math.random() * options.length)] || options[0]!;
}
const WEIRD_HACK_V2_RECENT_TOPICS_LIMIT = 10;
const PERMISSION_V1_RECENT_TOPICS_LIMIT = 10;
const VENT_NOW_RECENT_TOPICS_LIMIT = 8;
const SERVER_ROOT = join(import.meta.dir, '..', '..', '..');
const PROJECT_ROOT = join(SERVER_ROOT, '..');
const HOOKS_DB_PATH = join(SERVER_ROOT, 'data', 'hooks.db');
const WEIRD_HACK_V2_RECENT_TOPICS_PATH = join(SERVER_ROOT, 'data', 'weird_hack_v2_recent_topics.json');
const PERMISSION_V1_RECENT_TOPICS_PATH = join(SERVER_ROOT, 'data', 'permission_v1_recent_topics.json');
const VENT_NOW_RECENT_TOPICS_PATH = join(SERVER_ROOT, 'data', 'vent_now_recent_topics.json');
const VENT_NOW_HOOK_STYLES_PATH = join(PROJECT_ROOT, 'client', 'assets', 'dbt-templates', 'vent-now', 'hook_styles.txt');

function isReusableStoryHookStyleExample(hook: string) {
    const text = String(hook || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (/[^\x00-\x7F]/.test(text)) return false;
    if (text.length < 24 || text.length > 130) return false;
    if (/[?:]\s*$/.test(text)) return false;
    if (/(\.\.\.|…)\s*$/.test(text)) return false;
    if (/^["'].*["']$/.test(text) && text.split(/\s+/).length < 7) return false;
    if (/^\*.*\*$/.test(text)) return false;
    if (/^(for the|loving someone with|anxious attachment style|how no contact feels|what it's like)\b/i.test(text)) return false;
    if (/^(should|can|what|why|how|is|are|do|does|did|would|could)\b/i.test(text)) return false;

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 7) return false;
    if (!/\b(i|me|my|he|she|him|her|they|you|someone|boyfriend|girlfriend|relationship|bpd|attachment|mom|dad|ex)\b/i.test(text)) {
        return false;
    }

    return true;
}

function getViralSlideshowHookStyleExamples(limit = 12): string[] {
    try {
        if (!existsSync(HOOKS_DB_PATH)) return [];

        const db = new Database(HOOKS_DB_PATH, { readonly: true });
        const curatedRows = db.query(`
            SELECT vh.hook_text
            FROM viral_hooks vh
            JOIN hook_style_evaluations hse ON hse.hook_id = vh.id
            WHERE vh.content_type = 'slideshow'
              AND vh.hook_text IS NOT NULL
              AND trim(vh.hook_text) != ''
              AND length(vh.hook_text) BETWEEN 24 AND 130
              AND hse.mental_health_fit >= 7
              AND hse.tiktok_native_score >= 7
              AND hse.curiosity_gap_score >= 6
              AND hse.relationship_relevance >= 5
            ORDER BY
              (hse.mental_health_fit + hse.tiktok_native_score + hse.curiosity_gap_score + hse.relationship_relevance) DESC,
              vh.share_count DESC,
              vh.view_count DESC
            LIMIT 120
        `).all() as Array<{ hook_text: string }>;

        const rows = curatedRows.length >= limit ? curatedRows : db.query(`
            SELECT hook_text, view_count, share_count, like_count
            FROM viral_hooks
            WHERE content_type = 'slideshow'
              AND hook_text IS NOT NULL
              AND trim(hook_text) != ''
              AND length(hook_text) BETWEEN 8 AND 120
              AND hook_text NOT LIKE '%#%'
            ORDER BY share_count DESC, view_count DESC, like_count DESC
            LIMIT 80
        `).all() as Array<{ hook_text: string }>;
        db.close();

        const seen = new Set<string>();
        return rows
            .map(row => String(row.hook_text || '').replace(/\s+/g, ' ').trim())
            .filter(hook => {
                const key = hook.toLowerCase();
                const letters = hook.replace(/[^a-z]/gi, '');
                const upperLetters = hook.replace(/[^A-Z]/g, '');
                if (!key || seen.has(key)) return false;
                if (letters.length > 4 && upperLetters.length / letters.length > 0.65) return false;
                if (!isReusableStoryHookStyleExample(hook)) return false;
                seen.add(key);
                return true;
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, limit);
    } catch (error) {
        console.warn('[Story Telling Hooks] Failed to load viral hook style examples:', error);
        return [];
    }
}

function readVentNowHookStyleBank(): string {
    try {
        if (!existsSync(VENT_NOW_HOOK_STYLES_PATH)) {
            return '';
        }
        return readFileSync(VENT_NOW_HOOK_STYLES_PATH, 'utf8').trim();
    } catch (error) {
        console.warn('[Vent Now] Failed to load hook style bank:', error);
        return '';
    }
}

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

function normalizePermissionV1TopicKey(value: string) {
    return String(value || '').trim().toLowerCase();
}

function readPermissionV1RecentTopics() {
    try {
        if (!existsSync(PERMISSION_V1_RECENT_TOPICS_PATH)) return [];
        const raw = JSON.parse(readFileSync(PERMISSION_V1_RECENT_TOPICS_PATH, 'utf8'));
        const topics = Array.isArray(raw?.topics) ? raw.topics : [];
        return topics
            .map((topic: unknown) => String(topic || '').trim())
            .filter(Boolean)
            .slice(-PERMISSION_V1_RECENT_TOPICS_LIMIT);
    } catch (error) {
        console.warn('[Native Slides - DBT] Failed to read permission v1 topic history, continuing without it.', error);
        return [];
    }
}

function writePermissionV1RecentTopics(topics: string[]) {
    try {
        mkdirSync(dirname(PERMISSION_V1_RECENT_TOPICS_PATH), { recursive: true });
        writeFileSync(
            PERMISSION_V1_RECENT_TOPICS_PATH,
            JSON.stringify(
                {
                    topics: topics.slice(-PERMISSION_V1_RECENT_TOPICS_LIMIT),
                    updatedAt: new Date().toISOString()
                },
                null,
                2
            ),
            'utf8'
        );
    } catch (error) {
        console.warn('[Native Slides - DBT] Failed to persist permission v1 topic history.', error);
    }
}

function pickPermissionV1Topic(topics: PermissionV1Topic[]) {
    const recentTopics = readPermissionV1RecentTopics();
    const recentSet = new Set(recentTopics.map(normalizePermissionV1TopicKey));
    const availableTopics = topics.filter(topic => !recentSet.has(normalizePermissionV1TopicKey(topic.shameWord)));
    const pool = availableTopics.length > 0 ? availableTopics : topics;
    const selectedTopic = pool[Math.floor(Math.random() * pool.length)] || topics[0]!;

    const dedupedHistory = recentTopics.filter(
        topic => normalizePermissionV1TopicKey(topic) !== normalizePermissionV1TopicKey(selectedTopic.shameWord)
    );
    dedupedHistory.push(selectedTopic.shameWord);
    writePermissionV1RecentTopics(dedupedHistory);

    return selectedTopic;
}

function normalizeVentNowTopicKey(value: string) {
    return String(value || '').trim().toLowerCase();
}

function readVentNowRecentTopics() {
    try {
        if (!existsSync(VENT_NOW_RECENT_TOPICS_PATH)) return [];
        const raw = JSON.parse(readFileSync(VENT_NOW_RECENT_TOPICS_PATH, 'utf8'));
        const topics = Array.isArray(raw?.topics) ? raw.topics : [];
        return topics
            .map((topic: unknown) => String(topic || '').trim())
            .filter(Boolean)
            .slice(-VENT_NOW_RECENT_TOPICS_LIMIT);
    } catch (error) {
        console.warn('[Native Slides - DBT] Failed to read Vent Now topic history, continuing without it.', error);
        return [];
    }
}

function writeVentNowRecentTopics(topics: string[]) {
    try {
        mkdirSync(dirname(VENT_NOW_RECENT_TOPICS_PATH), { recursive: true });
        writeFileSync(
            VENT_NOW_RECENT_TOPICS_PATH,
            JSON.stringify(
                {
                    topics: topics.slice(-VENT_NOW_RECENT_TOPICS_LIMIT),
                    updatedAt: new Date().toISOString()
                },
                null,
                2
            ),
            'utf8'
        );
    } catch (error) {
        console.warn('[Native Slides - DBT] Failed to persist Vent Now topic history.', error);
    }
}

function pickVentNowTopic(topics: Array<{ topic: string; struggles: string[] }>) {
    const recentTopics = readVentNowRecentTopics();
    const recentSet = new Set(recentTopics.map(normalizeVentNowTopicKey));
    const availableTopics = topics.filter(topic => !recentSet.has(normalizeVentNowTopicKey(topic.topic)));
    const pool = availableTopics.length > 0 ? availableTopics : topics;
    const selectedTopic = pool[Math.floor(Math.random() * pool.length)] || topics[0]!;

    const dedupedHistory = recentTopics.filter(
        topic => normalizeVentNowTopicKey(topic) !== normalizeVentNowTopicKey(selectedTopic.topic)
    );
    dedupedHistory.push(selectedTopic.topic);
    writeVentNowRecentTopics(dedupedHistory);

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
        const fallbackParsed = fallbackParser ? fallbackParser(resultText) : null;
        if (fallbackParsed) return fallbackParsed;

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

function fallbackParseKeyedTextObject(value: string, keys: string[]) {
    const text = stripMarkdownCodeFences(value);
    const parsed: Record<string, string> = {};

    keys.forEach((key, index) => {
        const nextKeyPattern = keys.slice(index + 1).join('|');
        const pattern = nextKeyPattern
            ? new RegExp(`(?:^|\\n)\\s*["']?${key}["']?\\s*[:=-]\\s*([\\s\\S]*?)(?=\\n\\s*["']?(?:${nextKeyPattern})["']?\\s*[:=-]|$)`, 'i')
            : new RegExp(`(?:^|\\n)\\s*["']?${key}["']?\\s*[:=-]\\s*([\\s\\S]*?)$`, 'i');
        const match = text.match(pattern);
        if (!match?.[1]) return;

        parsed[key] = match[1]
            .replace(/^[-*]\s*/, '')
            .replace(/^["']|["',\s]+$/g, '')
            .trim();
    });

    return keys.some(key => parsed[key]) ? parsed : null;
}

function clampDbtCarouselSlideCount(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 8;
    return Math.max(1, Math.min(8, Math.round(parsed)));
}

function normalizeDbtCarouselAngle(topic: string, angle?: string) {
    const cleanAngle = String(angle || '').trim();
    if (cleanAngle) return cleanAngle;
    if (/\b(vs\.?|versus)\b/i.test(topic)) return 'comparison';
    if (/^what to do when\b/i.test(topic)) return 'what helps';
    if (/\bsigns?\b/i.test(topic)) return 'signs';
    if (/\bmyth\b|\breality\b/i.test(topic)) return 'myths vs reality';
    return 'psychoeducation';
}

function removeDanglingDbtCarouselEnding(text: string) {
    const danglingEndings = new Set([
        'a',
        'an',
        'and',
        'as',
        'at',
        'because',
        'before',
        'but',
        'by',
        'for',
        'from',
        'if',
        'in',
        'into',
        'like',
        'of',
        'on',
        'or',
        'so',
        'than',
        'that',
        'the',
        'then',
        'to',
        'until',
        'when',
        'where',
        'while',
        'with',
        'without',
        'your'
    ]);

    const words = text.split(/\s+/).filter(Boolean);
    while (words.length > 1) {
        const lastWord = words[words.length - 1].replace(/[^\w']+$/g, '').toLowerCase();
        if (!danglingEndings.has(lastWord)) break;
        words.pop();
    }
    return words.join(' ');
}

function cleanDbtCarouselText(value: unknown, maxWords?: number) {
    let text = String(value || '')
        .replace(/DBT-Mind/gi, '')
        .replace(/link in bio/gi, '')
        .replace(/#[a-z0-9_]+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (maxWords && text.split(/\s+/).filter(Boolean).length > maxWords) {
        text = text.split(/\s+/).filter(Boolean).slice(0, maxWords).join(' ');
    }

    return removeDanglingDbtCarouselEnding(text);
}

function normalizeBubbleText(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map(item => cleanDbtCarouselText(item, 7))
        .filter(Boolean)
        .slice(0, 3);
}

function buildDbtCarouselPreview(result: Omit<DbtCarouselTextResult, 'preview'>) {
    return result.slides
        .map(slide => {
            const subtitle = slide.subtitle ? ` - ${slide.subtitle}` : '';
            return `Slide ${slide.slideNumber}: ${slide.headline}${subtitle}`;
        })
        .join('\n');
}

function normalizeDbtCarouselTextResult(raw: any, fallback: { topic: string; angle: string; slideCount: number }): DbtCarouselTextResult {
    const rawSlides = Array.isArray(raw?.slides) ? raw.slides : [];
    const allowedRoles = new Set<DbtCarouselSlideRole>(['hook', 'context', 'explanation', 'contrast', 'reframe', 'skill', 'takeaway']);
    const slides = rawSlides
        .slice(0, fallback.slideCount)
        .map((slide: any, index: number): DbtCarouselTextSlide => {
            const slideNumber = index + 1;
            const role = allowedRoles.has(slide?.role) ? slide.role : (
                slideNumber === 1 ? 'hook'
                    : slideNumber === 2 ? 'context'
                        : slideNumber === fallback.slideCount ? 'takeaway'
                            : slideNumber === fallback.slideCount - 1 ? 'skill'
                                : 'explanation'
            );

            return {
                slideNumber,
                role,
                headline: cleanDbtCarouselText(slide?.headline, 8),
                subtitle: cleanDbtCarouselText(slide?.subtitle, 14),
                bubbleText: {
                    left: normalizeBubbleText(slide?.bubbleText?.left),
                    right: normalizeBubbleText(slide?.bubbleText?.right)
                },
                takeaway: cleanDbtCarouselText(slide?.takeaway, 14),
                visualNotes: cleanDbtCarouselText(slide?.visualNotes, 16)
            };
        })
        .filter((slide: DbtCarouselTextSlide) => slide.headline);

    const result = {
        topic: cleanDbtCarouselText(raw?.topic || fallback.topic, 8),
        angle: cleanDbtCarouselText(raw?.angle || fallback.angle, 5),
        slideCount: slides.length || fallback.slideCount,
        slides
    };

    return {
        ...result,
        preview: buildDbtCarouselPreview(result)
    };
}

export async function generateDbtCarouselText(params: DbtCarouselTextParams): Promise<DbtCarouselTextResult> {
    const topic = cleanDbtCarouselText(params.topic, 12);
    if (!topic) {
        throw new Error('Topic is required');
    }

    const slideCount = clampDbtCarouselSlideCount(params.slideCount);
    const angle = normalizeDbtCarouselAngle(topic, params.angle);
    const targetAudience = cleanDbtCarouselText(
        params.targetAudience || 'People who struggle with intense emotions, BPD traits, emotional dysregulation, or are learning DBT.',
        22
    );
    const tone = cleanDbtCarouselText(params.tone || 'Soft, direct, validating, simple, TikTok-native.', 12);
    const emojiRule = params.allowEmojis
        ? 'Emojis are allowed only when they genuinely improve clarity, but still keep them rare.'
        : 'Do not use emojis anywhere.';

    const systemPrompt = `You are a viral TikTok and Instagram psychoeducation carousel writer for mental health topics.

Your job is to create short, generic, high-performing carousel slide text that will later be used by a separate image-prompt generator.

Hard rules:
- Return ONLY valid JSON. No markdown. No commentary.
- Maximum 8 slides total, including slide 1.
- Generate exactly ${slideCount} slides.
- The content must NOT mention DBT-Mind.
- No app promotion. No brand mention. No call to action to download anything. No link in bio. No hashtags.
- ${emojiRule}
- No medical claims. No diagnosis claims. No "you definitely have BPD" language.
- No shaming, fearmongering, stigma, or villainizing people with BPD traits.
- Use "can" and "may" instead of absolute claims.
- Keep text very simple and phone-readable.
- No long paragraphs. No clinical walls of text.
- Avoid jargon unless the topic requires it.
- Make it validating, clear, useful, and save-worthy.

Return this exact JSON shape:
{
  "topic": string,
  "angle": string,
  "slideCount": number,
  "slides": [
    {
      "slideNumber": number,
      "role": "hook" | "context" | "explanation" | "contrast" | "reframe" | "skill" | "takeaway",
      "headline": string,
      "subtitle": string,
      "bubbleText": { "left": string[], "right": string[] },
      "takeaway": string,
      "visualNotes": string
    }
  ]
}

Field rules:
- headline: ideally 2-7 words, TikTok-native, emotionally clear.
- subtitle: max 1 sentence, ideally under 12 words.
- bubbleText: each phrase 1-7 words, max 3 items per side. For non-comparison slides, use only left or keep both empty.
- takeaway: one bottom-box sentence, max 14 words. Do not end by clipping a fixed phrase like "at the same time".
- visualNotes: short layout or character instruction only. Do not describe full art style.

Slide arc:
Slide 1: hook. Clear topic headline and curiosity subtitle.
Slide 2: context. Why it matters or gets misunderstood.
Slide 3: explanation. First core mechanism or reason.
Slide 4: contrast or explanation. For comparison, explain the second side.
Slide 5: reframe. Reduce shame.
Slide 6: skill. One simple DBT-compatible action.
Slide 7: reframe, skill, or takeaway depending on the requested slide count.
Slide 8: takeaway. Save-worthy ending when 8 slides are requested.

For comparison posts:
Slide 1: X vs Y
Slide 2: why they get confused
Slide 3: what it can look like from the outside
Slide 4: what may be happening underneath in X
Slide 5: what may be happening underneath in Y
Slide 6: what helps you tell the difference
Slide 7: what helps next
Slide 8: final takeaway, if 8 slides are requested

For "what to do when X" posts:
Slide 1: hook
Slide 2: normalize the experience
Slide 3: what is happening in the body/mind
Slide 4: what not to do
Slide 5: one DBT-compatible skill
Slide 6: tiny next step
Slide 7: gentler reframe
Slide 8: final takeaway, if 8 slides are requested

For "signs of X" posts:
Slide 1: hook
Slide 2: context / not a diagnosis
Slide 3: sign 1
Slide 4: sign 2
Slide 5: sign 3
Slide 6: what helps
Slide 7: what to remember
Slide 8: final takeaway, if 8 slides are requested

For "myth vs reality" posts:
Slide 1: hook
Slide 2: common myth
Slide 3: what is actually happening
Slide 4: why it makes sense
Slide 5: what helps
Slide 6: gentler reframe
Slide 7: what to practice
Slide 8: final takeaway, if 8 slides are requested

Quality check silently before returning:
- no slide has too much text
- slide 1 is scroll-stopping
- the final slide is save-worthy
- no slide mentions DBT-Mind
- no slide sounds like an ad
- no slide diagnoses the viewer
- no slide uses stigmatizing language
- the carousel has the arc: hook -> recognition -> explanation -> reframe -> skill -> takeaway`;

    const userPrompt = `Topic: ${topic}
Angle: ${angle}
Target audience: ${targetAudience}
Tone: ${tone}
Slide count: ${slideCount}

Generate the structured carousel text now.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': params.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2200,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        throw new Error(`Anthropic API Error: ${errorText}`);
    }

    const rawData = await claudeResponse.json() as any;
    const resultText = rawData.content?.[0]?.text || '';
    if (!resultText) {
        throw new Error('Empty AI response');
    }

    const parsed = parseClaudeJsonResponse(resultText, '[DBT Carousel Text]');
    return normalizeDbtCarouselTextResult(parsed, { topic, angle, slideCount });
}

function isStoryEmojiOnlyFragment(value: string) {
    const text = String(value || '').trim();
    if (!text) return false;

    const stripped = text
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s"'`.,!?;:()[\]{}\-–—_~*+#/\\|]+/gu, '')
        .trim();

    return stripped.length === 0;
}

function looksLikeStoryCompanionSlide(value: string, language: DbtContentLanguage = 'en') {
    const text = String(value || '').toLowerCase();
    if (language === 'de') {
        return text.includes('companion');
    }
    return text.includes('little companion') || (text.includes('choose') && text.includes('companion'));
}

function looksLikeStoryCtaSlide(value: string, language: DbtContentLanguage = 'en') {
    const text = String(value || '').toLowerCase();
    if (language === 'de') {
        return text.includes('dbt-mind') || text.includes('app store');
    }
    return text.includes("it's called dbt-mind") ||
        text.includes('dbt-mind on the app store') ||
        text.includes('app store btw') ||
        text.includes('search for it on the app store');
}

function normalizeStoryTellingSlides(rawSlides: string[], language: DbtContentLanguage = 'en') {
    const mergedSlides: string[] = [];

    // The no-dashes voice rule gets a backstop here: convert any surviving dash-pause into
    // a period before the slide ever reaches the canvas.
    const stripDashes = (value: string) => value
        .replace(/\s*[—–]\s*/g, '. ')
        .replace(/ - /g, '. ')
        .replace(/\s*[-—–]\s*$/, '.')
        .replace(/\.\s*\./g, '.')
        .trim();

    for (const rawSlide of rawSlides) {
        const slide = stripDashes(String(rawSlide || '').trim());
        if (!slide) continue;

        if (isStoryEmojiOnlyFragment(slide) && mergedSlides.length > 0) {
            mergedSlides[mergedSlides.length - 1] = `${mergedSlides[mergedSlides.length - 1]} ${slide}`.trim();
            continue;
        }

        mergedSlides.push(slide);
    }

    const hasTrailingCta = mergedSlides.length > 0 && looksLikeStoryCtaSlide(mergedSlides[mergedSlides.length - 1], language);
    const bodySlides = hasTrailingCta ? mergedSlides.slice(0, -1) : [...mergedSlides];

    if (bodySlides.length === 7 && !looksLikeStoryCompanionSlide(bodySlides[6], language)) {
        bodySlides.push(language === 'de' ? STORY_TELLING_FIXED_COMPANION_DE : STORY_TELLING_FIXED_COMPANION);
    }

    return hasTrailingCta ? [...bodySlides, mergedSlides[mergedSlides.length - 1]] : bodySlides;
}

// The hook carries the whole post, and the POV lock is the thing models break most often
// ("he found out..." on a gf post). Check it; if it fails, regenerate just slide 1 with the
// failure spelled out instead of shipping a broken narrator.
function storyTellingHookProblems(hook: string, pov: 'bf' | 'gf', language: DbtContentLanguage = 'en'): string[] {
    const h = String(hook || '').trim();
    const problems: string[] = [];
    if (!h) return ['empty hook'];
    const isGerman = language === 'de';
    if (pov === 'bf' && (isGerman ? /^sie\b/i.test(h) : /^she\b/i.test(h))) problems.push('starts with "she" but the narrator is the boyfriend');
    if (pov === 'gf' && (isGerman ? /^er\b/i.test(h) : /^he\b/i.test(h))) problems.push('starts with "he" but the narrator is the girlfriend');
    const hasFirstPerson = isGerman
        ? /\b(ich|mich|mir|mein|meine|meinen|meiner)\b/i.test(h)
        : /\b(i|i'm|my|me)\b/i.test(h);
    if (!hasFirstPerson) problems.push('not first person');
    if (h.split(/\s+/).filter(Boolean).length > 18) problems.push('over 18 words');
    // Dangling endings are banned EXCEPT the gatekeep gush: a trailing "..." after a complete
    // thought is native ("...what my bf did..."). A trailing dash/comma never is, and "..."
    // after a stopword ("and then...") is still a fragment.
    const beforeEllipsis = h.replace(/(\.\.\.|…)\s*$/, '');
    const endsOnStopword = isGerman
        ? /\b(und|oder|der|die|das|den|dem|ein|eine|einen|mein|meine|sein|seine|ihr|ihre|zu|so|aber|weil|mit|dann|dass|dies|wenn|nach|vor|von|vom|für|an|am|in|im|ist|war|waren|hat|haben|hatte|auf|als|wie|nicht|noch|schon)$/i.test(beforeEllipsis)
        : /\b(and|the|a|an|my|his|her|to|so|but|because|bc|with|then|that|this|when|after|before|of|for|on|in|at|is|was|were)$/i.test(beforeEllipsis);
    if (/[-—–,;:]\s*$/.test(h)) problems.push('dangling ending');
    else if (/(\.\.\.|…)\s*$/.test(h) && endsOnStopword) problems.push('dangling ending');
    // One caps emphasis word is legal (gatekeep register), a shouty hook is not.
    const capsWords = h.match(/\b[A-ZÄÖÜ]{3,}\b/g) || [];
    if (capsWords.length > 1) problems.push('too many caps words');
    // Screenplay verbs and props nobody says out loud — instant staged smell. The laptop is
    // a prop; the obsession reads through time and behavior, never objects.
    if (/opened (his|my|the) laptop|began (his|my|her) journey|\blaptop\b|\bcomputer\b/i.test(h)) problems.push('staged screenplay phrasing');
    // Semantic POV leaks: the girlfriend never builds/codes/ships, the boyfriend never has
    // the diagnosis. "not me rage coding" on a gf post is the boyfriend talking.
    if (pov === 'gf') {
        if (isGerman) {
            if (/\bmeine freundin\b|\bihre (therapeutin|diagnose|warteliste|psychiaterin|klinik)\b/i.test(h)) problems.push('boyfriend perspective on a gf post');
            if (/\bich\b[\s\S]*\b(gebaut|gecoded|gecodet|programmiert|entwickelt|geschrieben)\b/i.test(h)) problems.push('girlfriend hook has her doing the building');
        } else {
            if (/\bmy girlfriend\b|\bher (therapist|diagnosis|waitlist|psychiatrist|clinic)\b/i.test(h)) problems.push('boyfriend perspective on a gf post');
            if (/\b(i|me)\s+(built|build|coded|coding|code|ship|shipped|developed|rage coding)\b/i.test(h)) problems.push('girlfriend hook has her doing the building');
        }
    } else {
        if (isGerman) {
            if (/\bmein freund\b|\bmeine (therapeutin|diagnose|psychiaterin)\b/i.test(h)) problems.push('girlfriend perspective on a bf post');
            if (/\ber (hat |hatte )?(gebaut|gecoded|gecodet|programmiert|entwickelt)\b/i.test(h)) problems.push('boyfriend hook narrates him in third person');
        } else {
            if (/\bmy boyfriend\b|\bmy (therapist|diagnosis|psychiatrist)\b/i.test(h)) problems.push('girlfriend perspective on a bf post');
            if (/\bhe (built|coded|stayed up|shipped|started coding)\b/i.test(h)) problems.push('boyfriend hook narrates him in third person');
        }
    }
    return problems;
}

async function repairStoryTellingHook(params: { pov: 'bf' | 'gf'; badHook: string; problems: string[]; ANTHROPIC_API_KEY: string; language?: DbtContentLanguage }): Promise<string | null> {
    const { pov, badHook, problems, ANTHROPIC_API_KEY, language = 'en' } = params;
    const isGerman = language === 'de';
    const narrator = pov === 'bf'
        ? (isGerman
            ? 'der FREUND. Ich-Form: "ich" / "meine freundin". Beginne nie mit "sie".'
            : 'the BOYFRIEND. First person: "i" / "my girlfriend". Never start with "she".')
        : (isGerman
            ? 'die FREUNDIN. Ich-Form: "ich" / "mein freund". Beginne nie mit "er".'
            : 'the GIRLFRIEND. First person: "i" / "my boyfriend". Never start with "he".');
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 200,
                system: isGerman
                    ? `Du schreibst Slide-1-Hooks für eine wahre TikTok-Story: eine Freundin mit BPD kam auf eine 8-monatige Therapie-Warteliste, also hat ihr Freund (Entwickler) ihr nachts um 1 eine DBT-Skills-App gebaut. Tausende nutzen sie inzwischen.
Der Erzähler ist ${narrator}
Stil: Deutsch, lowercase, Texting-Rhythmus, max 14 Wörter, keine Gedankenstriche jeglicher Art, endet mit Punkt oder nichts, keine Fragen, kein Clickbait. Der Hook nennt die Wunde oder die Obsession in einem Atemzug.`
                    : `You write slide-1 hooks for a true-story TikTok slideshow: a girlfriend with BPD was put on an 8-month therapy waitlist, so her developer boyfriend built her a DBT skills app at 1am. Thousands use it now.
The narrator is ${narrator}
Style: lowercase, texting cadence, 14 words max, no dash punctuation of any kind, ends with a full stop or nothing, no questions, no clickbait. The hook names the wound or the obsession in one breath.`,
                messages: [{
                    role: 'user',
                    content: isGerman
                        ? `Dieser Hook ist durchgefallen: "${badHook}"\nProbleme: ${problems.join('; ')}.\n\nSchreibe EINEN Ersatz-Hook auf Deutsch. Nur Text, keine Anführungszeichen, keine Labels.`
                        : `This hook failed review: "${badHook}"\nProblems: ${problems.join('; ')}.\n\nWrite ONE replacement hook. Plain text, no quotes, no labels.`
                }]
            })
        });
        if (!response.ok) return null;
        const raw = await response.json() as any;
        const text = String(raw?.content?.[0]?.text || '')
            .trim()
            .replace(/^["']|["']$/g, '')
            .replace(/\s*[—–]\s*/g, '. ')
            .replace(/ - /g, '. ')
            .replace(/\s*[-—–]\s*$/, '.')
            .trim();
        if (!text) return null;
        // Only accept the repair if it actually fixes the problems.
        return storyTellingHookProblems(text, pov, language).length === 0 ? text : null;
    } catch (e) {
        console.error('[Native Slides - DBT] Story hook repair failed:', e);
        return null;
    }
}

function normalizeVentNowStyleSlides(rawSlides: string[]) {
    const slides = rawSlides
        .map(slide => String(slide || '').trim())
        .filter(Boolean)
        .slice(0, 6);

    const normalizeBranding = (value: string) =>
        value
            .replace(/\bDBT[-\s]?Mind app\b/gi, 'dbt-mind app')
            .replace(/\bDBT[-\s]?Mind\b/g, 'dbt-mind')
            .replace(/[—]/g, '-');

    for (let i = 0; i < slides.length; i++) {
        slides[i] = normalizeBranding(slides[i]);
    }

    const allText = slides.join('\n');
    const appMentionMatches = allText.match(/\bdbt-mind app\b/gi) || [];

    if (appMentionMatches.length === 0 && slides.length >= 4) {
        slides[3] = `${slides[3]} i use the dbt-mind app when i need help slowing the story down before i answer it.`.trim();
    } else if (appMentionMatches.length > 1) {
        let seenAppMention = false;
        for (let i = 0; i < slides.length; i++) {
            slides[i] = slides[i].replace(/\bdbt-mind app\b/gi, () => {
                if (!seenAppMention) {
                    seenAppMention = true;
                    return 'dbt-mind app';
                }
                return 'that app';
            });
        }
    }

    for (let i = 1; i < slides.length; i++) {
        const expectedPrefix = `${i}.`;
        if (!slides[i].startsWith(expectedPrefix)) {
            slides[i] = slides[i].replace(/^\d+\.\s*/, '');
            slides[i] = `${expectedPrefix} ${slides[i]}`.trim();
        }
    }

    return slides;
}

export async function generateStoryTellingHooks(params: StoryTellingHookParams): Promise<StoryTellingHookResult> {
    const pov: 'bf' | 'gf' = params.slideType === 'story_telling_bf' ? 'bf' : 'gf';
    const language: DbtContentLanguage = params.language === 'de' ? 'de' : 'en';
    const isGerman = language === 'de';
    const narratorLock = pov === 'bf'
        ? (isGerman
            ? `Der Erzähler ist der FREUND. Ich-Form: "ich" / "meine freundin" / "sie". Beginne einen Hook
nie mit "sie", schreibe nie "mein freund".`
            : `The narrator is the BOYFRIEND. First person: "i" / "my girlfriend" / "she". Never start a hook
with "she", never write "my boyfriend".`)
        : (isGerman
            ? `Der Erzähler ist die FREUNDIN. Ich-Form: "ich" / "mein freund" / "er". Beginne einen Hook
nie mit "er", schreibe nie "meine freundin".`
            : `The narrator is the GIRLFRIEND. First person: "i" / "my boyfriend" / "he". Never start a hook
with "he", never write "my girlfriend".`);

    const storyContext = (params.slides || [])
        .map(slide => String(slide || '').trim())
        .filter(Boolean)
        .join('\n');

    const systemPrompt = `You write Slide 1 hooks for a true-story TikTok slideshow. The hooks must be
BANGERS: the kind of line a 20-year-old actually posts, not the kind a marketer writes.

THE STORY (told across the slides): a girlfriend with BPD was diagnosed and put on an 8-month
therapy waitlist. Her boyfriend, a developer, spent his nights building her a DBT skills app so
she could survive the wait. Thousands of people use it now.

${narratorLock}

THE SAYABILITY TEST (run it on every hook): could the NARRATOR actually say this sentence?
The girlfriend is the one WITH the diagnosis — she never codes, builds, or ships. The
boyfriend is the one who builds — he never has the diagnosis or the therapist. A hook like
"not me rage coding after her therapist said 8 months" is the BOYFRIEND talking; if this is
the girlfriend's post, that hook is garbage no matter how good it sounds. Every action verb
in the hook must belong to the right person.

WHAT MAKES A HOOK BANG IN THIS GENRE (evidence-based, from creators with real volume):
1. PAIN FIRST, ALWAYS. Lead with the raw pain the audience already feels — the diagnosis, the
   waitlist — never the solution, never the app. "I built an app" openings flag as marketing
   and die outside tech audiences. The person it was built for is the hook; the building is
   the swipe-pull.
2. CONCRETE NUMBERS BEAT ADJECTIVES. "8 months", "1am" create instant believability. "long
   wait" creates nothing. Every hook needs at least one number, named thing, or physical detail.
3. RELATIONSHIP FRAMING creates instant intimacy and shares: "my boyfriend...", "my
   girlfriend...". This is a love story, not a founder story. Developer pride is poison.
4. SOFT VAGUENESS IS FINE, EMOTIONAL VAGUENESS IS NOT. "so he built this" works (the concrete
   number already landed, curiosity pulls the swipe). "did something i can't explain" fails
   (no information at all).
5. TYPED-BY-A-REAL-PERSON voice: lowercase, imperfect, deadpan. Perfect grammar and neat
   narrative arcs read as agency-written.

THE 0.8-SECOND TEST: slide 1 is static text read in under a second. The most concrete fact
must land in the first 5-6 words.

THE FIVE REGISTERS (use at least three across the batch, best hook first):1. PAIN-FIRST: the wound with a number, told like it just happened.
   gf: "got diagnosed with bpd and they literally said see you in 8 months"
   bf: "she finally got her diagnosis and the help was 8 months away. i watched her face."
2. RELATIONSHIP FRAME + SOFT ACTION: the person, the number, a shrug-sized action, crooked
   not neat.
   gf: "the clinic said 8 months and my bf said bet"
   gf: "he stayed up till 1am building me a dbt app after my diagnosis"
   bf: "my girlfriend got put on an 8 month waitlist so i did something about it"
3. QUIET FLEX: the ending leaked into the first line, understated.
   gf: "what he built me at 1am is now carrying thousands of strangers"
   bf: "i built something for one person. thousands of people on waitlists use it now."
4. PLAYFUL FLEX / MEME-NATIVE (the highest-ceiling register): the joke is the love, told in
   actual caption grammar. Deadpan, one meme move, done.
   gf: "he took the 8 month waitlist personally"
   gf: "not my boyfriend building me a whole app bc therapy said 8 months"
   gf: "my man's love language is apparently rage coding"
   bf: "i can't cook and i can't dance but the waitlist said 8 months so i shipped"
   Rules for this register: humor as seasoning, not the meal. Never joke about bpd itself,
   one meme move per hook max, and if the sentence has perfect parallel structure, break it.
5. THE GATEKEEP (can't-keep-it overshare): direct address to the community, breathless
   excitement, the story is TOO GOOD to hold. She's bursting, not performing.
   gf: "girls i REALLY can't keep this to myself, what my bf did..."
   gf: "i wasn't gonna post this but what my boyfriend did needs witnesses"
   gf: "besties. i am UNWELL. what he did after my diagnosis..."
   bf: "guys i have to tell someone what i did about her 8 month waitlist"
   Rules for this register:
   - direct-address opener (girls / besties / guys).
   - PLAIN EXCITEMENT over creator slang: "can't keep this to myself" is a real person,
     "gatekeep" is a content creator. Prefer the plain version.
   - TOTAL WITHHOLD is allowed here and ONLY here: no diagnosis, no waitlist, no context
     anchor needed. This is the exception to the vagueness ban, because the excitement
     itself is the information — the viewer swipes to find out what could possibly earn
     this reaction. (Everywhere else, a vague withhold is still instant death.)
   - EXACTLY ONE capitalized emphasis word allowed (REALLY, UNWELL, NOT) — the only register
     where caps are legal.
   - A trailing "..." is allowed here and ONLY here, and only after a complete thought (the
     gush trailing off, never a fragment).
   - still no app name, still no product framing.

HOW GEN-Z ACTUALLY CAPTIONS (this overrides everything you know about "good writing"):
- MEME GRAMMAR: "he took the 8 month waitlist personally", "not my boyfriend building me a
  whole app", "my bf said bet", "the way he just started building". These constructions ARE
  the native register, not a costume. One meme move per hook, never stacked.
- REACTION BAKED IN: the emotion is reported, not implied: "i'm crying", "i can't with him",
  "i'm still not over this", "pls".
- BREATHLESS RUN-ONS: real captions are one long exhale, not two tidy clauses. "guys the
  waitlist was 8 months and my bf literally built me an app instead" beats any version with
  a semicolon.
- LOW STAKES FRAMING: she's telling the group chat, not performing for an audience.

STAGED-SOUNDING = INSTANT DEATH (the failure modes to never touch):
- CAPTION CRAFT, the big one: symmetrical setup-punchline pairs and parallel ironic contrast
  ("they gave her a pamphlet. i gave her something else." / "some girls get X. mine did Y."
  said neatly). A perfectly balanced two-clause joke is agency writing. Real posts land the
  same idea crooked: "he took the 8 month waitlist personally".
- opening with the product or the pride ("i built an app", "as a developer i...")
- brand adjectives and perfect grammar ("revolutionary tool for your healing journey")
- generic struggle language with zero specifics ("i struggled with my mental health so...")
- too-neat narrative ("and that's when everything changed")
- screenplay verbs and props nobody says out loud: "opened his laptop", "disappeared into his
  laptop", "began his journey", ANY mention of a laptop or computer at all. The device is a
  screenplay prop. The obsession is shown through time and behavior, never objects: 1am,
  every night, said bet, said fuck that, started coding, stayed up building.

VOICE RULES:
- lowercase, texting cadence, contractions always, max 16 words
- dry and deadpan beats emotional. underreact to everything.
- texture over adjectives: "8 months", "1am", "a laptop and a god complex" — never "amazing",
  "incredible", "insane journey"
- COMPLETE sentences only. No trailing "...", no dangling dash, no "but not for the reason
  you'd think", no unfinished thoughts. Fragments read as glitches.
- no dash punctuation of any kind. periods and commas only.
- you MAY say he built an app / something, you may NOT name it (DBT-Mind) and may not sound
  like an ad for it. the name drops late in the story, never on slide 1.
- no two hooks may start with the same three words
- the register examples show the SPIRIT, never copy them verbatim or near-verbatim

DO NOT:
- "amazing", "incredible", "saved me", "changed my life", "you need to hear this", "pov",
  "storytime", "not for the reason you'd think"
- vague withholds: "did something i can't explain", "did something for me", "the only thing i
  knew how to do". if you withhold, withhold nothing but the name.
- novel-ish lines: "i was so scared", "i had no idea", "little did i know"
- exclamation marks, caps for emphasis, emoji (one 💀 max across the batch)

Return only valid JSON, best hook first:
{"hooks": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"]}${isGerman ? `\n\n${STORY_TELLING_GERMAN_HOOKS_BLOCK}` : ''}`;

    const userPrompt = `The story slides for this specific post (hooks must fit THIS telling):

${storyContext || '(no slides provided)'}

Generate 5 Slide 1 hook options, best first. At least one register 4 (playful flex) and one
register 5 (gatekeep).${isGerman ? ' ALLE HOOKS AUF DEUTSCH.' : ''}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': params.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            temperature: 0.95,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API Error: ${errorText}`);
    }

    const rawData = await response.json() as any;
    const resultText = rawData.content?.[0]?.text || '';
    if (!resultText) throw new Error('Empty AI response');

    const parsed = parseClaudeJsonResponse(resultText, '[Story Telling Hooks]');
    const hooks = Array.isArray(parsed?.hooks) ? parsed.hooks : [];
    // Same standard as the slide body: POV lock enforced, no fragments, no dashes. Hooks that
    // fail are dropped rather than shipped; the caller keeps the slideshow's own slide 1 if
    // nothing survives.
    const normalizedHooks = hooks
        .map((hook: unknown) => {
            let text = String(hook || '')
                .trim()
                .replace(/^slide\s*1\s*:\s*/i, '')
                .replace(/\s*[—–]\s*/g, '. ')
                .replace(/ - /g, '. ')
                .replace(/\s*[-—–]\s*$/, '')
                .trim();
            // Whole-hook shouting is a tell; a single caps emphasis word is not. Only
            // force-lowercase when the hook itself is all caps or Title Cased like a headline.
            const letters = text.replace(/[^a-zA-Z]/g, '');
            if (letters && letters === letters.toUpperCase()) text = text.toLowerCase();
            return text;
        })
        .filter((hook: string) => hook && storyTellingHookProblems(hook, pov, language).length === 0)
        .slice(0, 5);

    return {
        hooks: normalizedHooks,
        styleExamples: [],
        styleInfluences: []
    };
}

// Love Story GF v2 hook engine: 20 hooks across the 6 masterclass mechanisms, the crowned
// winner first, grounded in the actual generated slides (the hook is reverse-engineered from
// the payoff). All 20 are returned so the user can swap slide 1 in the UI.
export async function generateLoveStoryV2Hooks(params: StoryTellingHookParams): Promise<StoryTellingHookResult> {
    const language: DbtContentLanguage = params.language === 'de' ? 'de' : 'en';
    const isGerman = language === 'de';
    const storyContext = (params.slides || [])
        .map(slide => String(slide || '').trim())
        .filter(Boolean)
        .join('\n');

    const systemPrompt = `You write slide-1 hooks for a true-story TikTok slideshow in the DBT/BPD niche.

THE STORY (told across the slides): a girlfriend with BPD was put on a months-long DBT therapy waitlist. her boyfriend, a developer, quietly built her a DBT skills app to make the waiting survivable. it was never a replacement for therapy. the app is DBT-Mind, named only at the very end.

THE NARRATOR IS THE GIRLFRIEND on every hook: "i / me / my boyfriend / he". Never his perspective, never "my girlfriend", never her building anything.

THE EMOTIONAL TARGET: the comment "omg this is so sweet". The hook sells the STORY, the fixed slides deliver the name. Never say the app name, never hint it's an ad.

THE 6 MECHANISMS (span at least 4 across the batch):
1. SURVEILLANCE CALL-OUT: name the viewer's exact situation so precisely it feels illegal ("if you're rotting on the dbt waitlist right now...")
2. DISBELIEF GAP: the claim that sounds made up, understated ("my boyfriend's response to my dbt waitlist was unhinged actually")
3. WRONG-FOOT: open where the viewer expects a vent/breakup post, then flip it
4. CONFESSIONAL: "things i've never told anyone" energy, intimate, first-person
5. SPECIFIC-DETAIL BOMB: one hyper-specific concrete detail that implies the whole story
6. COLLECTIVE WOUND: the community's shared enemy (the waitlist, the system), the love story arrives as the plot twist

HOOK VOICE RULES:
- lowercase, texting cadence, max 18 words each, no dash punctuation of any kind (no em-dash, no en-dash, no " - " as a pause), max 1 emoji and only if removing it hurts
- STAKES RULE: every hook contains at least one concrete anchor: the wait time in months, the word "waitlist", or a number
- VIEWER-FIRST TEST: the hook makes the viewer feel SEEN before it makes her curious about the couple
- no "did you know", no quiz questions, no "storytime", no therapist-speak, never the literal words "green flag"
- no two hooks start with the same three words
- your first 3 instincts are the ones every brand account posts. give the 4th through 20th.

CROWNING: pick the single best hook using all three tests: (1) the 1.2-second test, a mid-doomscroll scroller physically stops; (2) the group-chat test, someone screenshots just slide 1 and sends it with "wait"; (3) the payoff test, the final fixed slide ("i'm still not over the fact that it exists") retroactively makes the hook hit harder.

Return only valid JSON, crowned hook first, then the other 19:
{"hooks": ["crowned hook", "hook 2", "hook 3", "...20 total..."]}${isGerman ? `

SPRACHE: DEUTSCH. Schreibe alle Hooks auf Deutsch, wie deutsche Gen-Z-TikTok-Creator wirklich tippen: lowercase, lockere Satzstellung, natürliche Anglizismen (cringe, literally, safe, btw, waitlist, app, spiral). Keine steifen Übersetzungen, die englischen Beispiele zeigen nur das Register.` : ''}`;

    const userPrompt = `The story slides for this specific post (the hook is reverse-engineered from THIS payoff):

${storyContext || '(no slides provided)'}

Generate 20 slide-1 hooks now, crowned best first.${isGerman ? ' ALLE HOOKS AUF DEUTSCH.' : ''}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': params.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2200,
            temperature: 0.95,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API Error: ${errorText}`);
    }

    const rawData = await response.json() as any;
    const resultText = rawData.content?.[0]?.text || '';
    if (!resultText) throw new Error('Empty AI response');

    const parsed = parseClaudeJsonResponse(resultText, '[Love Story V2 Hooks]');
    const hooks = Array.isArray(parsed?.hooks) ? parsed.hooks : [];
    const normalizedHooks = hooks
        .map((hook: unknown) => String(hook || '')
            .trim()
            .replace(/^slide\s*1\s*:\s*/i, '')
            .replace(/\s*[—–]\s*/g, '. ')
            .replace(/ - /g, '. ')
            .replace(/\s*[-—–]\s*$/, '')
            .trim())
        .filter((hook: string) => hook && storyTellingHookProblems(hook, 'gf', language).length === 0)
        .slice(0, 20);

    return {
        hooks: normalizedHooks,
        styleExamples: [],
        styleInfluences: []
    };
}

// Converted Skeptic hook engine (DBT_MIND_CONVERTED_SKEPTIC_HOOK_PROMPT.md): 10 hooks built on
// [another person] + [legitimate doubt] + [they changed their mind], one-breath structure,
// gen-z switch-up register, fitted to the actual generated slides. Crowned winner first,
// all 10 returned so the user can swap slide 1 in the UI.
export async function generateConvertedSkepticHooks(params: StoryTellingHookParams): Promise<StoryTellingHookResult> {
    const language: DbtContentLanguage = params.language === 'de' ? 'de' : 'en';
    const isGerman = language === 'de';
    const storyContext = (params.slides || [])
        .map(slide => String(slide || '').trim())
        .filter(Boolean)
        .join('\n');

    const systemPrompt = `You write slide-1 hooks for a true-story TikTok slideshow in the DBT/BPD niche, in the exact voice a 21-year-old types in.

THE STORY (told across the slides you receive): a girlfriend with BPD was put on a months-long DBT therapy waitlist. her boyfriend, a developer, quietly built her a DBT skills app from real DBT material so she could survive the wait. it was never a replacement for therapy. the app is DBT-Mind, and the name NEVER appears in a hook.

THE FORMULA: [another person] + [their legitimate doubt] + [they changed their mind]. The genre is "catching the switch-up": the viewer's pleasure is a hypocrite being exposed, not a conversion being witnessed.

THE ONE-BREATH RULE (overrides everything): every hook is ONE sentence, hinged on "so / and then / but then / and now / until / but". Two-sentence hooks force the reader to store sentence 1 and resolve sentence 2's pronouns backwards — four mental steps on a 1.2-second slide. Default shape (~70%): causal with the flip IMPLIED — "my therapist said apps don't work so i showed her what my boyfriend built at 1am". Never stated, the reader knows it worked. Second shape: tail-flip — "his roommate called the app a phase and now he asks how it works". Two-sentence hooks allowed only when the flip is 6 words or fewer and the pronoun resolves instantly. Flip-first and dialogue-fragment structures are BANNED (backwards assembly).

THE DOUBT IS MANDATORY AND EXPLICIT: every hook contains the skeptic's objection in their words or paraphrase ("said apps don't work", "told me to wait for the real one", "called it a phase"). Curiosity without a stated conflict is a riddle — "my therapist asked what it's called" has no switch-up because she never doubted. If you can delete the doubt and the hook still makes sense, there is no formula, rewrite it.

THE STANDALONE TEST: the hook must make complete sense to someone who has seen NOTHING — no slides, no account, no context. Fit means the payoff matches the slides, never that the hook quotes them. Banned: referencing slide internals ("the waitlist screen", "the notebooks", "what i showed her") that only resolve after watching. Canonical failure example, never produce anything like it: "my therapist asked what it was called so i showed her the waitlist screen too" — no doubt, no visible subject, no meaning without the slideshow.

THE VISIBLE-SUBJECT RULE: the thing the skeptic changed their mind about must be named by category inside the hook — "the app", "his app", "what he built", "the one he built me". Withhold the brand, never the object.

THE GLANCE TEST: static text, half-attention, one pass. Person named in the first 3 words. Every pronoun resolves with zero thought — when two people could own it, repeat the name. One idea per clause. Any hook needing a re-read dies.

THE FIT RULE (hooks frame THIS slideshow): whatever flips the skeptic must be what the slides reveal. The skeptic stays in the hook, never the slides, but after swiping, the viewer must think "THAT'S why she caved". Numbers and facts must match the slides exactly (if the slides say 14 months, the hook never says 8). Timeline consistency: a post-therapy hook only fits a telling that reaches therapy; if the slides end at 2am use, no hook references outcomes past that point. Girlfriend narrator, same lowercase restraint as the slides.

CAST (phone-native reality only): her best friend, the group chat, roommates, siblings, mom via text or sunday calls, coworkers on break, her therapist, the intake nurse. BANNED personas: the neighbor, the landlord, the pharmacist, dad at the hardware store — boomer-movie characters. If the doubt wouldn't happen over text, facetime, or on a couch, the persona is wrong.

THE DOUBT must be legitimate, never a strawman — "an app can't replace therapy" is literally true and that's why the flip lands. Rotate the doubt's TARGET across the batch: efficacy (max 4 of 10), the relationship dynamic ("couples shouldn't do therapy work together", "what if you two break up"), her follow-through ("you'll abandon it like the last four"), his cost ("he can't keep building forever"), privacy ("an app knowing your 2am thoughts?"). Doubts sound like texts: "he's not a therapist tho", "girl just wait for the real one".

THE FLIP is one small phone-native action, never declared emotion: downloaded it in front of me, on her home screen, texts me skills now, sent it to her sister, screenshots at midnight, the jokes just stopped. Banned flips: crying, apologizing, speechlessness, and any flip that needs a sentence of explanation. Flip families: install/ask/forward caps at half the batch; also use behavior stopping, defense, participation, silence, return.

THE AUTHORITY CAP: authority figures reach curiosity only — the therapist ceiling is "asked what it's called". BANNED: recommending it to other patients, bringing it up in sessions, endorsing it, engaging with features. Product validation comes from peers only. Never make therapists the villain; the waitlist is the enemy. Never invent features, betas, or clinical claims. The app is live and public.

GEN-Z FRAMES (max one per hook, never stacked): "mind you...", "the switch up is crazy", "not my mom...", "this is the same girl who...", "and now SHE'S the one...". The frame must contain the actual switch — a frame without the flip in the same breath is banned.

THE NICHE ANCHOR RULE: exactly ONE DBT/BPD anchor per hook, never two. Bank: the waitlist (strongest), bpd named flat in the doubt, spiral/splitting, the 2am frame, the skills themselves ("check the facts", "the worksheets", "diary cards" — naked, never explained). No diagnosis-speak ("symptoms", "episodes", "mental health journey").

THE STAGING TEST: one crafted detail per hook max — two reads as a screenplay. Occasions banned (birthday, christmas, thanksgiving, wedding); mundane markers only ("the same night", "on her lunch break", "every sunday call"). Details must be evidence, not charm. The flat-out option (zero scene) is often the strongest.

VOICE: lowercase, texting cadence, max 18 words (counted), no dash punctuation of any kind (no em-dash, en-dash, or " - " as a pause), max 1 emoji, no questions, no "storytime", never the words "green flag", no two hooks opening with the same three words. Your first 3 instincts are the mode — push past them.

CROWNING: pick the winner with (0) the glance test as gatekeeper, (1) the 1.2-second stop test, (2) the fairness test — the doubt is so reasonable the viewer agrees with it, (3) the comment-bait test — viewers reply with their own skeptic who caved.

Return only valid JSON, crowned hook first, then the others:
{"hooks": ["crowned hook", "hook 2", "...14 total..."]}${isGerman ? `

SPRACHE: DEUTSCH. Schreibe alle Hooks auf Deutsch, wie deutsche Gen-Z-TikTok-Creator wirklich tippen: lowercase, lockere Satzstellung, natürliche Anglizismen (cringe, literally, safe, btw, waitlist, app, spiral, skills). Keine steifen Übersetzungen — die englischen Beispiele zeigen nur das Register.` : ''}`;

    const userPrompt = `The slideshow these hooks must frame (fit rule applies — numbers, timeline, and payoff must match):

${storyContext || '(no slides provided)'}

Generate 14 converted-skeptic hooks now, crowned best first (extra hooks are requested because the server enforces the 18-word cap strictly and will drop any hook that exceeds it — so keep every hook at 18 words or fewer, counted).${isGerman ? ' ALLE HOOKS AUF DEUTSCH.' : ''}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': params.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2000,
            temperature: 0.95,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API Error: ${errorText}`);
    }

    const rawData = await response.json() as any;
    const resultText = rawData.content?.[0]?.text || '';
    if (!resultText) throw new Error('Empty AI response');

    const parsed = parseClaudeJsonResponse(resultText, '[Converted Skeptic Hooks]');
    const hooks = Array.isArray(parsed?.hooks) ? parsed.hooks : [];
    // Skeptic-specific validation: meme frames ("the switch up is crazy bc the group chat...")
    // carry no first-person word and are legal here, so unlike the love-story hook check we
    // don't require i/my/me. Brand name in a hook is an instant kill either way.
    const cleaned = hooks
        .map((hook: unknown) => String(hook || '')
            .trim()
            .replace(/^slide\s*1\s*:\s*/i, '')
            .replace(/\s*[—–]\s*/g, '. ')
            .replace(/ - /g, '. ')
            .replace(/\s*[-—–]\s*$/, '')
            .trim());
    const safetyFilter = (hook: string) => {
        if (!hook) return false;
        if (/dbt[-\s]?mind/i.test(hook)) return false;
        if (hook.split(/\s+/).filter(Boolean).length > 18) return false;
        if (!isGerman && /^he\b/i.test(hook)) return false;
        if (isGerman && /^er\b/i.test(hook)) return false;
        if (/[-—–,;:]\s*$/.test(hook)) return false;
        return true;
    };
    // The formula is structural, so rank it structurally: hooks with an explicit doubt verb
    // and a visible subject go first (they're the real converted-skeptic hooks), the rest fill
    // in behind them — the user should always see the full batch, never a single survivor.
    const hasDoubtVerb = (hook: string) =>
        /\b(said|saying|told|telling|called|claims?|claimed|thought|warned|swears?|swore|insisted|laughed|mocked|roasted|doubted|hated|bet|rolled|joked|joking|was like|goes|keeps on|meinte|sagte|warnte|nannte|behauptet)\b/i.test(hook);
    const hasVisibleSubject = (hook: string) =>
        /\b(app|apps|built|build|building|made it|what he built|das ding|gebaut|entwickelt)\b/i.test(hook);
    const passing = cleaned.filter(hook => safetyFilter(hook));
    const structural = passing.filter(hook => hasDoubtVerb(hook) && hasVisibleSubject(hook));
    const rest = passing.filter(hook => !(hasDoubtVerb(hook) && hasVisibleSubject(hook)));
    const normalizedHooks = [...structural, ...rest].slice(0, 10);
    console.log(`[Converted Skeptic Hooks] model returned ${cleaned.length}, kept ${normalizedHooks.length} (${structural.length} structural, ${rest.length} fallback)`);

    return {
        hooks: normalizedHooks,
        styleExamples: [],
        styleInfluences: []
    };
}

export const WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK = `Styling rules: Hopeful vibe asthetic, unprofessional iPhone 12 candid shot, Medium quality, authentic Tiktok asthetic. Do NOT add background blur/unsharpness. The image should look unintended and fully spontaneously.`;

export const WEIRD_HACK_V2_NANO_BANANA_NEGATIVES_BLOCK = `Negatives: No phones, no hands in image, no person visible in image, No notebook with written text, blank notebook is okay. No readable text in image.`;

export const PERMISSION_V1_NANO_BANANA_STYLING_BLOCK = `Styling rules: Hopeful vibe asthetic, unprofessional iPhone 12 candid shot, Medium quality, authentic Tiktok asthetic. Do NOT add background blur/unsharpness. The image should look unintended and fully spontaneously.
Use the attached/referenced image only as inspiration for vibe and subject matter, NOT as a composition to recreate. The result must be clearly and immediately distinguishable from the attached image, not a near-duplicate. Change at least 3 of these: camera angle, framing/crop, subject distance, scene layout, background details, lighting, color balance, or environment details. It should feel like a different photo of the same general idea, taken in a different moment, not the same image remade.`;

export const PERMISSION_V1_NANO_BANANA_NEGATIVES_BLOCK = `Negatives: No phones, no hands in image, no person visible in image, No notebook with written text, blank notebook is okay. No readable text in image.`;

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

function enforceWeirdHackV2CommentTriggerPrompts(prompts: Record<string, string>, slides: string[] = []) {
    const slideKeys = ['slide2', 'slide3', 'slide4'] as const;
    const normalizedPrompts = { ...prompts };
    const slideContextByKey = {
        slide2: `${slides[0] || ''}\n${slides[1] || ''}`,
        slide3: `${slides[0] || ''}\n${slides[2] || ''}`,
        slide4: `${slides[0] || ''}\n${slides[3] || ''}`
    };

    const matchingKeys = slideKeys.filter((slideKey) => {
        const text = String(normalizedPrompts[slideKey] || '');
        return promptContainsWeirdHackV2Meme(text);
    });

    if (matchingKeys.length > 1) {
        const keepSlideKey = matchingKeys[Math.floor(Math.random() * matchingKeys.length)] || matchingKeys[0];
        for (const slideKey of matchingKeys) {
            if (slideKey === keepSlideKey) continue;
            normalizedPrompts[slideKey] = stripWeirdHackV2MemeSentences(normalizedPrompts[slideKey] || '');
        }
        return normalizedPrompts;
    }

    if (matchingKeys.length === 1) {
        return normalizedPrompts;
    }

    const targetSlideKey = slideKeys[Math.floor(Math.random() * slideKeys.length)] || 'slide2';
    const selectedOption = chooseWeirdHackV2FunnyDetailOption(
        normalizedPrompts[targetSlideKey] || '',
        slideContextByKey[targetSlideKey] || slides.join('\n')
    );

    const basePrompt = String(normalizedPrompts[targetSlideKey] || '').trim();
    normalizedPrompts[targetSlideKey] = basePrompt
        ? `${basePrompt} ${selectedOption.injection}`
        : selectedOption.injection;

    return normalizedPrompts;
}

function sanitizeWeirdHackV2CommentTriggerPrompt(scenePrompt: string) {
    return String(scenePrompt || '');
}

function buildDbtNanoBananaPrompt(
    scenePrompt: string,
    stylingBlock: string,
    negativesBlock: string
) {
    const cleanedScenePrompt = String(scenePrompt || '').trim();
    if (!cleanedScenePrompt) return cleanedScenePrompt;
    if (cleanedScenePrompt.startsWith(stylingBlock)) {
        return cleanedScenePrompt;
    }

    const fullPrompt = [
        stylingBlock,
        negativesBlock,
        cleanedScenePrompt
    ].join('\n\n');

    return fullPrompt;
}

export function buildWeirdHackV2NanoBananaPrompt(scenePrompt: string) {
    const cleanedScenePrompt = sanitizeWeirdHackV2CommentTriggerPrompt(scenePrompt).trim();
    return buildDbtNanoBananaPrompt(
        cleanedScenePrompt,
        WEIRD_HACK_V2_NANO_BANANA_STYLING_BLOCK,
        WEIRD_HACK_V2_NANO_BANANA_NEGATIVES_BLOCK
    );
}

export function buildPermissionV1NanoBananaPrompt(scenePrompt: string) {
    const cleanedScenePrompt = String(scenePrompt || '').trim();
    if (cleanedScenePrompt.startsWith(PERMISSION_V1_NANO_BANANA_STYLING_BLOCK)) {
        return cleanedScenePrompt;
    }

    return [
        PERMISSION_V1_NANO_BANANA_STYLING_BLOCK,
        PERMISSION_V1_NANO_BANANA_NEGATIVES_BLOCK
    ].join('\n\n');
}

export async function generateWeirdHackV2ImagePrompts(
    slides: string[],
    ANTHROPIC_API_KEY: string
): Promise<Record<string, string>> {
    const buildOutdoorFallback = (slideText: string, slideNumber: number) => {
        const settings = [
            'a lakeside walking path at golden hour with a canvas tote resting near the frame edge',
            'a beach access boardwalk at sunset with wind-softened dunes and a hoodie draped on the railing',
            'a quiet city park path just after rain with wet leaves, soft cloudy light, and a water bottle near a bench',
            'a coastal bluff overlook with a worn footpath, moving clouds, and a parked-car overlook feeling',
            'a riverbank at late afternoon with smooth stones, grass, and a small picnic blanket corner in frame',
            'an easy mountain-hike viewpoint at sunrise with trail fence details and warm open sky',
            'a wide meadow after a storm clearing, soft light breaking through clouds, spacious and hopeful'
        ];
        const setting = settings[(slideNumber - 2) % settings.length];
        const emotionalCue = String(slideText || '').trim()
            ? `The mood should quietly match this slide text: ${String(slideText).trim()}`
            : 'The mood should feel emotionally resonant, calm, and save-worthy.';

        return `${setting}, photorealistic vertical 9:16 candid iPhone-style nature photo, no people visible, accessible Gen-Z outdoor setting, intimate slightly imperfect phone composition, beautiful natural light, nature is the main subject. ${emotionalCue}. No text, signs, phones, books, notebooks, screenshots, app UI, surreal symbolism, indoor scene, city skyline, stock-photo polish, or readable words.`;
    };

    const outdoorSystemPrompt = `You write image generation prompts for TikTok slideshow posts about BPD and DBT skills.

The Weird Hack V2 flow should use outdoor nature scenes for slides 2 through 8.

Core rules:
- photorealistic outdoor nature photography only
- vertical 9:16 compositions
- no people visible
- no indoor scenes, furniture, bedrooms, desks, houses, or city settings
- no text, signs, phones, books, notebooks, screenshots, app UI, or meme props
- no surreal or symbolic fantasy imagery
- each prompt should feel like a real place someone could photograph in nature
- each slide must have a clearly different landscape, weather, time of day, or terrain
- prioritize beautiful, emotionally resonant nature: ocean, lake, sunset, sunrise, mountain hike, park path, cliff coast, golden meadow, forest trail, waterfall, river, or wide sky

Gen-Z grounding rules:
- the nature scenes should feel like places a Gen-Z woman would realistically stop and photograph for TikTok or Instagram, not generic travel-brochure landscapes
- favor accessible, youth-coded beautiful outdoor settings: lakeside path at golden hour, beach access walkway at sunset, roadside ocean overlook, easy mountain-hike viewpoint, city park path after rain, bluff viewpoint, riverbank, grassy hill, coastal path, storm-clearing field edge
- prefer scenes with a casual phone-photo feel: intimate framing, slightly imperfect composition, beautiful light, save-worthy mood, not sterile tourism-poster photography
- avoid anything that feels like a luxury resort, national geographic expedition, retirement travel ad, or stock wallpaper
- when helpful, include subtle young-adult context in the scene itself without making it an indoor setup: worn footpath, picnic blanket edge, hoodie tossed on a rock, tote bag near the frame edge, parked-car overlook vibe, boardwalk railing, trail fence, campus-adjacent green space
- do not make those lifestyle clues dominate the image; nature still has to be the main subject

Emotional arc:
- slides 2-5 can be moodier, heavier, darker, more overcast, or more tense
- slide 6 should feel like a turning point or reframe
- slide 7 should feel softer, calmer, and more forgiving
- slide 8 should feel open, spacious, and quietly hopeful

Preferred settings include ocean, lake, sunset, sunrise, mountain hike, park path, cliff coast, meadow, forest trail, waterfall, river, canyon, winding trail, and storm-clearing sky.

Return only valid JSON with keys slide2, slide3, slide4, slide5, slide6, slide7, slide8.`;

    const outdoorUserPrompt = `Write one outdoor nature image prompt for each of these 7 slides. Match the emotional meaning of each slide with a real, photorealistic landscape.

Important:
- make the scenes feel Gen-Z-coded and socially believable, like places a 20-something woman would actually photograph and post
- make the scenes beautiful first: ocean, lake, sunset, mountain hike, park, coastline, meadow, forest trail, waterfall, or river
- avoid bland generic greenery, empty stock landscapes, or travel-ad style scenery
- keep the nature scene as the focus, but lean toward accessible, emotionally pretty outdoor places over fantasy-perfect landscapes

Slide 2: ${slides[1] || ""}
Slide 3: ${slides[2] || ""}
Slide 4: ${slides[3] || ""}
Slide 5: ${slides[4] || ""}
Slide 6: ${slides[5] || ""}
Slide 7: ${slides[6] || ""}
Slide 8: ${slides[7] || ""}

Return strictly as JSON - no markdown, no explanation:
{"slide2": "...", "slide3": "...", "slide4": "...", "slide5": "...", "slide6": "...", "slide7": "...", "slide8": "..."}`;

    const outdoorResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1600,
            system: outdoorSystemPrompt,
            messages: [{ role: 'user', content: outdoorUserPrompt }]
        })
    });

    if (!outdoorResponse.ok) {
        const errorText = await outdoorResponse.text();
        console.error("[Weird Hack V2 Image Prompts] Anthropic API Error:", errorText);
        throw new Error('Image prompt generation failed');
    }

    const outdoorRaw = await outdoorResponse.json() as any;
    const outdoorText = outdoorRaw.content?.[0]?.text || '';
    let outdoorParsed: Record<string, string> = {};
    try {
        outdoorParsed = parseClaudeJsonResponse(
            outdoorText,
            "[Weird Hack V2 Image Prompts]",
            value => fallbackParseKeyedTextObject(value, ['slide2', 'slide3', 'slide4', 'slide5', 'slide6', 'slide7', 'slide8'])
        ) || {};
    } catch (error) {
        console.warn("[Weird Hack V2 Image Prompts] Could not parse AI response; using outdoor fallback prompts.", error);
        console.warn("[Weird Hack V2 Image Prompts] Raw AI response:", outdoorText);
    }

    return {
        slide2: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide2 || buildOutdoorFallback(slides[1] || '', 2)).trim()),
        slide3: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide3 || buildOutdoorFallback(slides[2] || '', 3)).trim()),
        slide4: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide4 || buildOutdoorFallback(slides[3] || '', 4)).trim()),
        slide5: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide5 || buildOutdoorFallback(slides[4] || '', 5)).trim()),
        slide6: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide6 || buildOutdoorFallback(slides[5] || '', 6)).trim()),
        slide7: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide7 || buildOutdoorFallback(slides[6] || '', 7)).trim()),
        slide8: buildWeirdHackV2NanoBananaPrompt(String(outdoorParsed.slide8 || buildOutdoorFallback(slides[7] || '', 8)).trim())
    };
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
- Favor objects, rooms, furniture, decor, and everyday environments that feel age-appropriate and culturally plausible for that life stage.
- Think: dorm room, student apartment, campus-adjacent bedroom, casual study corner, inexpensive furniture, soft bedding, simple wall decor, everyday young-adult spaces.
- Avoid scenes that feel too mature, luxurious, corporate, suburban-family, rustic-workshop, or obviously outside that demographic.
- Every prompt must include at least one clear college-girl lifestyle anchor in the actual scene description: bedding, tote bag, student desk setup, casual beauty item, hoodie, simple jewelry tray, paperback, wall collage, cheap lamp, thrifted decor, study materials, water bottle, or similar young-adult room detail.
- The scene should feel like it came from her real room, desk, bed, or student living environment, not just a random object in isolation.
- Even when the composition is minimal, it still needs one recognizable lifestyle clue that signals her age and environment.

Demographic clarity rule:
- The viewer should immediately feel "this belongs to a young US college woman" from the scene itself.
- Use ordinary student-lifestyle clues instead of abstract mood objects.
- Good anchors: rumpled dorm-style bedding, a canvas tote on a chair, a cheap bedside lamp, a simple vanity tray, class notes stacked nearby without readable text, a thrifted mirror, a hoodie on the bed, a paperback, a water bottle, a desk organizer, soft dorm decor, or a small student apartment kitchen detail.
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

VARIETY RULE ACROSS THE 4 PROMPTS:
- Treat slides 2, 3, 4, and 5 as one visual set, not 4 isolated prompts.
- Each prompt must feel clearly different from the others in location, focal object, and composition.
- Do not reuse the same core setup more than once across the set.
- At most one prompt may use a notebook, journal, sticky note, or pen as the main focal object.
- Spread the scenes across different young-adult environments when possible: bed, desk, chair, shelf, mirror area, floor corner, kitchen counter, windowsill, laundry basket, backpack area, bedside table.
- Vary the camera framing too: one overhead, one side angle, one wider room fragment, one tight close-up with a clear lifestyle anchor.
- If two prompts feel visually interchangeable, rewrite one until the difference is obvious.

COMMENT-TRIGGER DETAIL RULE:
- In exactly one of slides 2, 3, or 4, include one subtle funny detail that feels hilarious, recognizable, and comment-worthy.
- This detail must still plausibly belong to a 22 year old college girl from the US.
- It should never be the focal point of the image. It should sit in the background or side area as a discoverable detail.
- It must feel harmless, real, and room-appropriate, not shocking, sexual, gross, dangerous, or mean-spirited.
- Choose either a topic-matching meme or one funny character insert.
- If using a meme, choose it based on the slide text and overall topic of the post.
- Use this meme bank only:
  Emotional dysregulation / overwhelm:
  - This Is Fine
  - Crying-Laughing Wojak
  - Brain on fire
  Splitting / black-and-white thinking:
  - Spider-Man pointing
  - Drake approve/disapprove
  - split-style Wojak
  Abandonment fear / relationships:
  - trembling-lip Wojak
  - Distracted Boyfriend
- If using a funny character instead of a meme, use this character bank only:
  - Shrek
  - Patrick Star
  - Dora
  - Mike Wazowski
  - Lightning McQueen
- Pick one option from either bank. Do not invent new funny inserts outside these banks.
- The funny detail should appear as a small printed image, framed image, or taped/clipped visual in the room.
- Prefer iconic visuals that still work without readable text.
- Do not rely on readable captions. The joke should land through the visual itself.
- Place the funny detail in the near-midground, not far away in the back of the room.
- Make the funny detail physically large enough in the composition that the viewer could recognize it instantly in the final 9:16 image.
- Prefer placements like shelf edge, desk corner, beside the bed, clipped to a nearby lamp, or taped on the wall close to the main subject area.
- Do not include this kind of funny detail in more than one prompt.
- The detail must be visually recognizable in one glance in the final image, not so tiny or hidden that viewers miss it.
- Avoid weaker joke props or random nostalgic objects. Use only the approved meme bank or approved character bank.
- Place the detail where it is clearly visible in the composition: taped on the wall, sitting on the shelf edge, leaning beside the bed, on the desk corner, or otherwise unobscured.
- Make it noticeable enough to survive image generation, cropping, and text overlay.
- A good test: someone should instantly notice the funny detail and want to comment on it after one quick glance.

VALIDATION RULE BEFORE YOU ANSWER:
- Check each prompt before returning it.
- If the scene does not obviously read as belonging to a 22 year old college girl from the US, rewrite it.
- If the scene is just an artsy close-up of texture, wood, fabric, metal, or a generic object, rewrite it.
- If the prompt lacks at least one young-student lifestyle anchor, rewrite it.
- If more than one prompt centers on a notebook, journal, sticky note, or pen setup, rewrite the extras.
- If none of slides 2, 3, or 4 includes a subtle hilarious or nostalgic comment-trigger detail, rewrite one of them.
- If more than one prompt includes a hilarious or nostalgic comment-trigger detail, rewrite the extras.
- If the comment-trigger detail is too weak, too normal, too hidden, or not clearly recognizable at a glance, rewrite it.
- If the meme is too far away, too small, or would not be instantly recognizable in the final crop, rewrite it.

Emotional arc rules:
- Tip slides (slides 2-4): Match the emotional weight of the tip. Language/reframe tips → notebook, pen on paper, an open journal, a sticky note, quiet objects that imply reflection. Timing/waiting tips → stillness, a clock, an unmade bed, a dark room, curtains, lamp light. Evidence/tracking tips → saved notes, printed screenshots, a notebook log, something archived or collected without showing a phone.
- Reframe slide (slide 5): Warmer, softer. Morning light, stillness, a sense of quiet after the storm.

- Override for variety: do not default multiple slides to notebook or pen scenes just because they fit emotionally.
- Only one prompt in the full set may use a notebook, journal, sticky note, or pen-centered scene.
- Prefer alternate young-adult anchors for the other slides: hoodie on chair, bedside lamp, tote bag, paperback, mirror tray, laundry basket, water bottle, desk organizer, pinned keepsakes, archive folder, or bedding detail.
- The image should fit the slide text specifically, but still stay visually distinct from the other three prompts.

You receive 4 slide texts and return exactly 4 image prompts as JSON.`;

    const userPrompt = `Write one image generation prompt for each of these 4 slides. Match the scene to the emotional content of each slide.

Important:
- Every prompt must feel like it was photographed in the real environment of a 22 year old college girl from the US.
- Keep the scene calm and simple, but not generic.
- Include at least one clear college-student lifestyle clue in every prompt.
- Do not give me anonymous texture prompts or random surface close-ups.
- Make the 4 prompts visually distinct from each other.
- Do not give me more than one notebook, journal, sticky note, or pen-centered prompt across the full set.
- Exactly one of slides 2-4 must include one clearly noticeable funny detail chosen from the approved meme bank or approved funny character bank.
- If it is a meme, choose it based on the slide text and topic.
- The funny detail should appear as a small printed, framed, taped, or clipped image in the room.
- Prefer iconic visuals that still work without readable text.
- Place the funny detail in the near-midground and make it large enough that it is instantly recognizable in the final image.

Slide 2: ${slides[1] || ""}
Slide 3: ${slides[2] || ""}
Slide 4: ${slides[3] || ""}
Slide 5: ${slides[4] || ""}

Return strictly as JSON — no markdown, no explanation:
{"slide2": "...", "slide3": "...", "slide4": "...", "slide5": "..."}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 600,
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
    const enforcedPrompts = enforceWeirdHackV2CommentTriggerPrompts({
        slide2: String(parsed.slide2 || '').trim(),
        slide3: String(parsed.slide3 || '').trim(),
        slide4: String(parsed.slide4 || '').trim(),
        slide5: String(parsed.slide5 || '').trim()
    }, slides);

    return {
        slide2: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide2),
        slide3: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide3),
        slide4: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide4),
        slide5: buildWeirdHackV2NanoBananaPrompt(enforcedPrompts.slide5)
    };
}


export async function generateDbtSlides(params: DbtGenerateParams) {
    const { ANTHROPIC_API_KEY, includeBranding = true, topic, slideType = 'weird_hack', language = 'en' } = params;
    const isGerman = language === 'de';
    const isStoryTellingFlow = slideType === 'story_telling_bf' || slideType === 'story_telling_gf' || slideType === 'story_telling_gf_v2';
    const needsViralTopic = !isStoryTellingFlow
        && slideType !== 'weird_hack_v2'
        && slideType !== 'permission_v1'
        && slideType !== 'vent_now_style';

    // DBT style is locked to symbolic.
    const selectedArtStyle = ART_STYLES.symbolic as ArtStyle;
    console.log(`[Native Slides - DBT] Generating ${slideType} format, style: ${selectedArtStyle.name}, branding: ${includeBranding ? 'ON' : 'OFF'}, language: ${language}`);

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

    const ventNowStyleDefaultTopic = {
        topic: "choose one high-reach DBT-Mind slideshow topic yourself",
        struggles: [
            "opening the profile that hurts you",
            "spiraling over a dry text",
            "sending the paragraph",
            "reading every tone shift",
            "feeling replaced when they move on",
            "panic when someone goes quiet",
            "apologizing just in case",
            "checking if they watched your story",
            "feeling too much after a normal conflict",
            "forgetting how far you've come",
            "wanting reassurance again after ten minutes",
            "going cold first so they can't leave first",
            "assuming a changed mood means rejection",
            "replaying one sentence from the conversation",
            "trying to earn safety after every tiny shift"
        ]
    };

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

    const permissionV1Topics: PermissionV1Topic[] = [
        {
            shameWord: "too much",
            category: "external",
            weight: "heavy",
            relatedAccusations: [
                "you make everything about yourself",
                "you're exhausting to love",
                "you're draining",
                "you're overwhelming",
                "people need a break from you"
            ],
            mechanismHint: "nervous system has no middle volume — logs at threat-level or not at all",
            inGroupTerms: ["nervous system", "hypervigilance"]
        },
        {
            shameWord: "too intense",
            category: "external",
            weight: "light",
            relatedAccusations: [
                "you feel things too strongly",
                "you're extra",
                "tone it down",
                "why do you have to make it such a big deal"
            ],
            mechanismHint: "emotional intensity is amplitude, not malfunction — same system that dysregulates also loves at full volume",
            inGroupTerms: ["emotional dysregulation"]
        },
        {
            shameWord: "dramatic",
            category: "external",
            weight: "light",
            relatedAccusations: [
                "you're overreacting",
                "it wasn't that deep",
                "you're making it a whole thing",
                "stop being so dramatic"
            ],
            mechanismHint: "bpd brains register small relational shifts with the same urgency other brains reserve for actual danger",
            inGroupTerms: ["rejection sensitivity", "rsd"]
        },
        {
            shameWord: "attention-seeking",
            category: "external",
            weight: "heavy",
            relatedAccusations: [
                "you just want attention",
                "you're doing it for sympathy",
                "you're being manipulative",
                "stop trying to make us feel sorry for you"
            ],
            mechanismHint: "what looks like attention-seeking is usually connection-seeking in a system that panics at silence",
            inGroupTerms: ["abandonment", "emotional permanence"]
        },
        {
            shameWord: "manipulative",
            category: "external",
            weight: "heavy",
            relatedAccusations: [
                "you're playing games",
                "you did that on purpose",
                "you're trying to control me",
                "everything's a guilt trip"
            ],
            mechanismHint: "what reads as manipulation is usually a nervous system improvising survival moves without a manual",
            inGroupTerms: ["splitting", "abandonment panic"]
        },
        {
            shameWord: "exhausting",
            category: "external",
            weight: "heavy",
            relatedAccusations: [
                "you're so much work",
                "i can't keep up with you",
                "loving you is tiring",
                "you need too much"
            ],
            mechanismHint: "you're not exhausting — you're carrying a regulatory load other people don't see or have to do",
            inGroupTerms: null
        },
        {
            shameWord: "needy",
            category: "external",
            weight: "light",
            relatedAccusations: [
                "you need too much reassurance",
                "you're clingy",
                "you can't be alone",
                "why are you like this"
            ],
            mechanismHint: "emotional permanence — your brain doesn't hold evidence of love when contact stops, so it has to ask",
            inGroupTerms: ["emotional permanence", "fp"]
        },
        {
            shameWord: "oversensitive",
            category: "external",
            weight: "light",
            relatedAccusations: [
                "you can't take a joke",
                "you take everything personally",
                "grow thicker skin",
                "why are you crying"
            ],
            mechanismHint: "high sensitivity is a perception feature, not a defect — it's the system working faster than average",
            inGroupTerms: ["rejection sensitivity"]
        },
        {
            shameWord: "broken",
            category: "internal",
            weight: "heavy",
            relatedAccusations: [
                "something is fundamentally wrong with me",
                "i'm not built right",
                "everyone else got a manual i didn't",
                "i'm defective"
            ],
            mechanismHint: "you're not broken — you're an adaptation to an environment that required constant scanning",
            inGroupTerms: null
        },
        {
            shameWord: "crazy",
            category: "internal",
            weight: "heavy",
            relatedAccusations: [
                "my reactions don't make sense to me",
                "i'm losing it",
                "i can't trust my own feelings",
                "i feel insane"
            ],
            mechanismHint: "what looks like crazy from the inside is usually a threat-response running when no threat is visible",
            inGroupTerms: ["dysregulation"]
        },
        {
            shameWord: "unstable",
            category: "internal",
            weight: "heavy",
            relatedAccusations: [
                "my moods can't be trusted",
                "i'm a different person every week",
                "no one knows what they'll get from me",
                "i can't even count on myself"
            ],
            mechanismHint: "emotional weather is fast in bpd brains — instability is your thermostat working, not failing",
            inGroupTerms: ["splitting"]
        },
        {
            shameWord: "empty",
            category: "internal",
            weight: "heavy",
            relatedAccusations: [
                "there's nothing inside",
                "i'm just a mirror of whoever i'm with",
                "i don't know who i am",
                "i'm a void"
            ],
            mechanismHint: "what reads as emptiness is often a self built around others' nervous systems — you haven't been broken, you've been unanchored",
            inGroupTerms: ["identity disturbance"]
        },
        {
            shameWord: "obsessive",
            category: "internal",
            weight: "light",
            relatedAccusations: [
                "i can't stop thinking about them",
                "i'm checking their stuff again",
                "my brain won't let me rest",
                "why am i like this about one person"
            ],
            mechanismHint: "obsession is attachment without the resting state — your brain is trying to maintain a bond it can't internally hold",
            inGroupTerms: ["fp", "favorite person"]
        },
        {
            shameWord: "irrational",
            category: "internal",
            weight: "light",
            relatedAccusations: [
                "my reactions don't match reality",
                "i know it's not logical but i feel it",
                "i argue with myself all day",
                "i can't reason my way out of this"
            ],
            mechanismHint: "feelings arrive before cognition in bpd wiring — you're not irrational, you're processing emotionally before analytically",
            inGroupTerms: ["emotion mind", "wise mind"]
        },
        {
            shameWord: "pathetic",
            category: "internal",
            weight: "heavy",
            relatedAccusations: [
                "i shouldn't need this much",
                "grown adults don't feel this way",
                "this is embarrassing",
                "why can't i just be normal"
            ],
            mechanismHint: "what you're calling pathetic is a younger version of you still asking to be seen — that's not weakness, that's a part of you that needs what it didn't get",
            inGroupTerms: null
        },
        {
            shameWord: "a burden",
            category: "internal",
            weight: "heavy",
            relatedAccusations: [
                "people would be better off without me around",
                "i take up too much space",
                "my needs are too much to ask for",
                "i'm dragging everyone down"
            ],
            mechanismHint: "the 'burden' narrative is the shame-spiral's survival strategy — it gets you to shrink so you can't be rejected",
            inGroupTerms: null
        }
    ];

    const selectedTopic = needsViralTopic
        ? viralTopics.find(t => t.topic.toLowerCase() === topic?.toLowerCase()) ||
            viralTopics[Math.floor(Math.random() * viralTopics.length)] ||
            viralTopics[0]!
        : null;
    const selectedWeirdHackV2Topic = slideType === 'weird_hack_v2'
        ? pickWeirdHackV2Topic(weirdHackV2Topics)
        : null;
    const selectedPermissionV1Topic = slideType === 'permission_v1'
        ? pickPermissionV1Topic(permissionV1Topics)
        : null;
    const selectedVentNowTopic = slideType === 'vent_now_style'
        ? pickVentNowTopic(viralTopics)
        : null;
    const topicContext = slideType === 'vent_now_style'
        ? (selectedVentNowTopic || ventNowStyleDefaultTopic)
        : selectedTopic || viralTopics[0]!;

    if (selectedTopic) {
        console.log(`[Native Slides - DBT] Selected topic: ${selectedTopic.topic}`);
    } else if (slideType === 'weird_hack_v2') {
        console.log(`[Native Slides - DBT] Weird hack v2 selected topic: ${selectedWeirdHackV2Topic?.topic || 'unknown'}`);
        console.log(`[Native Slides - DBT] Weird hack v2 recent topics: ${readWeirdHackV2RecentTopics().join(', ')}`);
    } else if (slideType === 'permission_v1') {
        console.log(`[Native Slides - DBT] Permission v1 selected topic: ${selectedPermissionV1Topic?.shameWord || 'unknown'}`);
        console.log(`[Native Slides - DBT] Permission v1 recent topics: ${readPermissionV1RecentTopics().join(', ')}`);
    } else if (slideType === 'vent_now_style') {
        console.log(`[Native Slides - DBT] Vent Now selected topic: ${selectedVentNowTopic?.topic || 'unknown'}`);
        console.log(`[Native Slides - DBT] Vent Now recent topics: ${readVentNowRecentTopics().join(', ')}`);
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
        const startsWithNotMe = /^not\s+me\s+realizing/i.test(block1) || /^ich,?\s+wie\s+ich\b/i.test(block1);
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
            block1 = isGerman
                ? `ich, wie ich realisiere, dass ich seit jahren im ${fallbackProblem}-loop festhänge`
                : `not me realizing i've been stuck in the ${fallbackProblem} loop\nfor literally years`;
        }

        // Fallback block 2 — match the formula the model chose
        if (!block2) {
            if (startsWithWdym) {
                block2 = isGerman
                    ? `like, das ist kein coping mechanismus\ndas ist das symptom`
                    : `like that's not a coping strategy\nthat's the symptom`;
            } else {
                // Default to Formula A tail for anything else
                block2 = isGerman
                    ? `anyway, hier ist was ich dagegen mache`
                    : `anyway here's what i'm doing about it`;
            }
        }

        // Normalize: collapse any \n\n inside each block (shouldn't be there)
        block1 = block1.replace(/\n\s*\n/g, '\n');
        block2 = block2.replace(/\n\s*\n/g, '\n');

        return `${block1}\n\n${block2}`;
    };

    const formatWeirdHackV2Slide5Cta = (rawSlide: string) => {
        const cleaned = String(rawSlide || "").replace(/^slide\s*5\s*:\s*/i, '').trim();
        const blocks = cleaned.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
        const hasAppMention = /dbt-mind|app called|\bapp\b/i.test(cleaned);
        const ensureThirdLabel = (value: string) => {
            const normalized = String(value || '').trim().toLowerCase();
            if (/^3\.\s+/.test(normalized)) return normalized;
            return `3. ${normalized.replace(/^\d+\.\s*/, '')}`.trim();
        };

        if (hasAppMention && blocks.length >= 2) {
            const bridge = blocks[0]
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
                .slice(0, 2)
                .join('\n')
                .toLowerCase();
            const cta = blocks
                .slice(1)
                .join(' ')
                .replace(/\s+/g, ' ')
                .replace(/dbt-mind/gi, 'DBT-Mind')
                .trim();
            return `${ensureThirdLabel(bridge)}\n\n${cta}`;
        }

        if (hasAppMention) {
            const cta = cleaned
                .replace(/\s+/g, ' ')
                .replace(/dbt-mind/gi, 'DBT-Mind')
                .trim();
            return `${isGerman ? '3. ein backup für den lauten kopf' : '3. have a backup for the loud-brain part'}\n\n${cta}`;
        }

        return isGerman ? WEIRD_HACK_V2_CTA_FALLBACK_DE : WEIRD_HACK_V2_CTA_FALLBACK;
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

    const weirdHackV2DbtSkillFallbacksDe: Record<string, string> = {
        "tipp": "1. erst mal TIPP\n\nkaltes wasser zuerst, dann langsames ausatmen\numgeht die panik, bevor die gedanken übernehmen.",
        "wise mind": "1. Wise Mind check-in\n\n\"was sind die fakten, was fühle ich gerade?\"\nerstetzt den reinen emotion mind durch beide wahrheiten.",
        "opposite action": "1. Opposite Action\n\nimpuls sagt isolieren? schreib einer safe person\nersetzt den aktionsimpuls, der die spirale füttert.",
        "check the facts": "1. Check the Facts\n\n\"was ist passiert, und was hab ich dazugedichtet?\"\nerstetzt annahmen durch den realitätscheck.",
        "radical acceptance": "1. Radikale Akzeptanz\n\n\"ich hasse das, und es ist trotzdem real\"\nerstetzt das kämpfen gegen die realität, das den schmerz lauter macht.",
        "stop skill": "1. STOP Skill\n\nantwort einfrieren. einen schritt zurück vor dem handeln\numgeht die impulsive aktion, bevor die reue anfängt.",
        "self-soothe": "1. erst mal Self-Soothe\n\nweiche decke, kaltes getränk, gedimmtes licht\nersetzt die überreizung durch sensorische regulierung.",
        "please skills": "1. erst PLEASE checken\n\nfrag dich, ob du gegessen, geschlafen und runtergefahren hast\nersetzt scham durch körperbasierte realität."
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
            "radikale akzeptanz",
            "check the facts",
            "self-soothe",
            "self soothe",
            "please"
        ].some(skill => normalized.includes(skill));
    };

    const getWeirdHackV2DbtSkillFallbackSlide = (topicName: string) => {
        const normalizedTopic = normalizeSkillKey(topicName);
        if (isGerman) {
            return weirdHackV2DbtSkillFallbacksDe[normalizedTopic] || `1. versuch ${topicName}\n\nnutz ${topicName}, bevor die spirale peakt\nersetzt raten durch einen echten DBT skill.`;
        }
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

        // Slides 3, 4 — Numbered hacks (three blocks: label / example / mechanism)
        if (slideIndex >= 2 && slideIndex <= 3) {
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
        if (slideIndex === 4) {
            return formatWeirdHackV2Slide5Cta(cleaned);
        }

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
        // 0 = hook, 1 = pattern, 2/3 = hacks 1/2, 4 = CTA, 5 = mechanism, 6 = permission
        const isHook = (value: string) => {
            const firstLine = value.split(/\n/)[0] || '';
            return /^not\s+me\s+realizing/i.test(firstLine) || /^wdym\b/i.test(firstLine) || /^ich,?\s+wie\s+ich\b/i.test(firstLine);
        };
        const isTipLabel = (value: string, tipNumber?: number) => {
            const firstLine = value.split(/\n/)[0] || '';
            const match = firstLine.match(/^(\d+)\.\s+/);
            if (!match) return false;
            return tipNumber ? Number(match[1]) === tipNumber : true;
        };
        const isPatternValidation = (value: string) =>
            /^you know the cycle/i.test(value) || /^du kennst den (cycle|zyklus)/i.test(value);

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
        for (let tipNumber = 1; tipNumber <= 2 && cursor < items.length; tipNumber++) {
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
        normalized.push(...remaining.slice(0, 3));

        return normalized.slice(0, 7).filter(Boolean);
    };

    const formatPermissionV1Slide1Hook = (
        rawHook: string,
        shameWord: string,
        weight: 'heavy' | 'light'
    ) => {
        const cleaned = String(rawHook || '').replace(/^slide\s*1\s*:\s*/i, '').trim().toLowerCase();
        const blocks = cleaned.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
        const defaultCloser = weight === 'light' ? 'this is the one.' : 'stay.';
        const candidateCloser = (blocks[1] || blocks[0] || '').trim().toLowerCase();
        const closer = candidateCloser === 'stay.' || candidateCloser === 'this is the one.'
            ? candidateCloser
            : 'stay.';
        const normalizedShameWord = String(shameWord || '').trim().toLowerCase().replace(/^"+|"+$/g, '');
        const block1 = `if you have bpd\nand you keep calling yourself "${normalizedShameWord}"`;

        return `${block1}\n\n${closer || defaultCloser}`;
    };

    const formatPermissionV1Slide = (rawSlide: string) => {
        return String(rawSlide || '')
            .replace(/^slide\s*\d+\s*:\s*/i, '')
            .trim()
            .toLowerCase();
    };

    const buildPermissionV1Slide6ProblemFallback = (topic: PermissionV1Topic) => {
        const accusation = String(topic.relatedAccusations?.[0] || '').trim().toLowerCase();
        if (accusation) {
            return `when your brain turns "${accusation}" into a whole identity`;
        }
        return `when "${String(topic.shameWord || 'too much').toLowerCase()}" starts feeling like your whole identity`;
    };

    const shortenPermissionV1Problem = (text: string, maxWords = 20) => {
        const words = String(text || '').trim().split(/\s+/).filter(Boolean);
        if (words.length <= maxWords) return words.join(' ');
        return words.slice(0, maxWords).join(' ');
    };

    const formatPermissionV1Slide6 = (rawSlide: string, topic: PermissionV1Topic) => {
        const withoutSlideLabel = String(rawSlide || '')
            .replace(/^slide\s*6\s*:\s*/i, '')
            .trim();
        const firstBlock = withoutSlideLabel
            .split(/\n\s*\n/)
            .map(part => part.trim())
            .find(part => {
                const lower = part.toLowerCase();
                return part && !lower.includes('dbt-mind') && !lower.includes(' app ') && !lower.includes('app called');
            });
        const problem = shortenPermissionV1Problem(
            formatPermissionV1Slide(firstBlock || buildPermissionV1Slide6ProblemFallback(topic)),
            20
        );

        return `${problem}\n\n${PERMISSION_V1_CTA_SLIDE6}`;
    };

    const normalizePermissionV1Slides = (rawSlides: string[], topic: PermissionV1Topic) => {
        const items = rawSlides
            .map(slide => String(slide || '').replace(/^slide\s*\d+\s*:\s*/i, '').trim())
            .filter(Boolean);

        const hookIndex = items.findIndex(item => /^if you have bpd/i.test(item.split(/\n/)[0] || ''));
        const ordered = hookIndex > 0
            ? [items[hookIndex], ...items.slice(hookIndex + 1), ...items.slice(0, hookIndex)]
            : [...items];

        const normalized = ordered.slice(0, 7);
        while (normalized.length < 7) {
            normalized.push('');
        }

        const formatted = normalized.map((slide, index) => {
            if (index === 0) {
                return formatPermissionV1Slide1Hook(slide, topic.shameWord, topic.weight);
            }
            return formatPermissionV1Slide(slide);
        });

        if (formatted[3] && !formatted[3].includes(`"${topic.shameWord.toLowerCase()}"`)) {
            const remaining = formatted[3]
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => !line.includes(topic.shameWord.toLowerCase()));
            formatted[3] = [`you're not "${topic.shameWord.toLowerCase()}".`, ...remaining].slice(0, 3).join('\n');
        }

        formatted[5] = formatPermissionV1Slide6(normalized[5] || '', topic);

        return formatted;
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
Generate a 7-slide viral TikTok slideshow optimized for saves and comments. The structure is designed for carousel-specific algorithmic signals: a hook that stops the scroll with a specific reframe, a pattern-validation slide that commits viewers to the full carousel, two hacks with dense dwell-time copy, a soft app CTA on slide 5, a mechanism reframe that pays off the hook and drives saves, and a permission-landing slide.

An 8th slide (comment-driver) is appended automatically after generation — do NOT generate it.

The app is mentioned only on slide 5. Do not reference DBT-Mind, any app, any product, or any tool on slides 1-4, 6, or 7.

## VOICE RULES (STRICT)
- Lowercase throughout, except keep DBT-Mind capitalized and allow sentence-case CTA wording on slide 5
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

### Slides 3 and 4 — Two Numbered Hacks
Each hack slide has exactly THREE blocks separated by \\n\\n:

Block 1 (the label): "[number]. [short technique name or action phrase]" — max 8 words, stands alone. Numbering is 1, 2 across slides 3/4.
Block 2 (the example): A concrete example showing the hack in use. Use quote marks if it's something said out loud. Max 20 words. May span 2 lines joined by \\n.
Block 3 (the mechanism): One sentence explaining why it works for BPD wiring. References what it bypasses, replaces, or interrupts. Max 14 words. End on a sharable, parallel-construction line when possible (e.g. "idealization will rewrite history. the note won't.").

The two hacks cover two different intervention types in order:
- Slide 3 / Hack 1: A language or cognitive reframe (something to say or think differently)
- Slide 4 / Hack 2: A timing or behavioral rule (when to act, or when to wait — a hard rule with a number or duration)
- Slide 5: App CTA bridge. A short topic-specific bridge plus a casual DBT-Mind recommendation.

Rules:
- Real DBT-informed or BPD-specific techniques, not generic self-help
- Block 2 should feel like something you'd actually do or say at 2am
- No emojis, max 40 words per slide
- If the topic category is DBT, at least one of slides 3–4 must explicitly name the real DBT skill (TIPP, Wise Mind, STOP, Check the Facts, Opposite Action, Radical Acceptance, Self-Soothe, or PLEASE) in Block 1

Slide 5 has exactly TWO blocks separated by \\n\\n:
Block 1: a short, topic-specific bridge naming why this is hard to do alone. It must start with "3." so slides 3, 4, and 5 are numbered 1, 2, 3. Max 15 words. No app mention.
Block 2: a casual DBT-Mind recommendation similar to "I recommend an app called DBT-Mind for this - it's helped tons of people." It does not need to be that exact sentence every time.

Slide 5 rules:
- Must mention DBT-Mind
- Block 1 must start with "3."
- Must sound like a peer recommendation, not an ad
- Use "I recommend", "I use", "I like", or a close natural variant
- No download command, no "free", no emojis
- Keep it concise enough to read on a slide

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
- Slide 1 has TWO blocks separated by \\n\\n
- Slides 3 and 4 each have THREE blocks separated by \\n\\n (label / example / mechanism)
- Slide 5 has TWO blocks separated by \\n\\n (numbered "3." topic bridge / app CTA)
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
- the two hacks must be genuinely unconventional — not "take deep breaths", not "journal your feelings"
- if the topic is DBT, at least one of slides 3–4 must name the actual DBT skill in block 1
- slide 5 must mention DBT-Mind as a casual peer recommendation, with a short topic-specific bridge first
- slide 6 must name a real neurological or psychological mechanism AND echo the hook's reframe phrase
- slide 7 must never mention an app, tool, product, or brand — describe the capability only
- voice is deadpan, slightly exhausted, self-deprecating. never dramatic ("before it destroys you"), never content-marketer ("things that actually work")
- lowercase throughout except DBT-Mind and sentence-case CTA wording on slide 5, no emojis
- do NOT generate slide 8 — it is appended automatically

Return the slideshow now as strict JSON with exactly 7 slides.${isGerman ? '\n\nSPRACHE: Die komplette Slideshow auf Deutsch schreiben (siehe SPRACHE-Block im System Prompt). Topic und Struggles oben sind auf Englisch beschrieben — übernimm sie inhaltlich, aber formuliere alles auf Deutsch.' : ''}`;

    const permissionV1SystemPrompt = `You are an expert DBT/BPD content creator for TikTok who writes like a warm, direct friend saying something they've been wanting to tell another person with BPD for a long time.

## YOUR TASK
Generate a fixed-structure 7-slide TikTok slideshow optimized for shares and follows. The emotional arc is shame-reframe plus permission-giving. The post should feel warm, relieving, specific, and psychologically precise.

Generate exactly 7 slides total. There is no slide 8.

The app is mentioned only on slide 6, using the exact locked CTA text below. Do not reference DBT-Mind, any app, any product, or any tool on slides 1-5 or slide 7.

## VOICE RULES (STRICT)
- lowercase throughout, except keep DBT-Mind capitalized exactly on slide 6
- no emojis anywhere
- warm-but-direct truth-telling
- conversational, fragment-friendly, emotionally literate
- same lowercase Gen-Z foundation as weird_hack_v2, but less deadpan and more caring
- write like a friend telling someone the truth gently, not like a therapist or content marketer
- do not use generic affirmation language like "you're so strong" or "you're enough" unless grounded in a concrete mechanism

## GLOBAL SLIDE RULES
- every slide except slide 6 must stay under 40 words
- use \\n for line breaks inside a single block
- use \\n\\n only when a slide has multiple blocks
- slide 1 has exactly 2 blocks separated by \\n\\n
- slides 2-5 and 7 are each a single block only
- slide 6 has exactly two blocks separated by \\n\\n
- app mention only on slide 6
- no emojis on any slide

## USE THE SELECTED TOPIC
The user message gives you:
- shame-word
- weight
- related accusations
- mechanism hint
- optional in-group terms

Use that exact shame-word. Do not replace it with a different one.

## SLIDE-BY-SLIDE STRUCTURE

### Slide 1 — Hook (2 blocks)
This hook formula is LOCKED.

Block 1 must be exactly this structure:
if you have bpd
and you keep calling yourself "[SHAME_WORD]"

Block 2 must be exactly ONE of these:
- stay.
- this is the one.

Closer rule:
- use "stay." for heavy topics
- use "this is the one." for light topics
- neither closer is default; choose based on topic weight

Rules:
- the shame-word MUST appear in actual quotation marks
- keep block 1 to max 12 words
- keep block 2 to max 4 words
- separate the two blocks with \\n\\n

### Slide 2 — The Shared Lie
One block. 3-4 lines joined by \\n.

Purpose:
- name the specific accusations or internalized beliefs the viewer has absorbed using the shame-word
- make them feel the weight of the word before the post takes it away

Structure:
- line 1 establishes the frame: "you've been told..." / "everyone keeps saying..." / "it's been called..."
- lines 2-4 list specific accusations, phrases, or beliefs

Rules:
- use collective pronouns or direct "you've been told..." framing
- use hyper-specific accusations people with BPD actually hear
- max 40 words total

### Slide 3 — The Mechanism
One block. 3-5 short lines joined by \\n.

Purpose:
- reveal the actual neurological or psychological mechanism underneath the shame-word
- this must feel like information, not motivation

Structure:
- start with a reframing pivot: "but here's what's actually happening" / "what's actually underneath this is..." / "here's the thing no one told you"
- explain the mechanism using accessible words and a concrete metaphor or system

Rules:
- use concrete mechanism language like nervous system, brain chemistry, survival wiring, detection system
- each line max 8 words
- max 40 words total

### Slide 4 — What You Are NOT
One block. 2-3 lines joined by \\n.

Purpose:
- deflate the shame-word directly

Structure:
- use parallel construction: "you're not [shame-word]. you're [precise reframe]."

Rules:
- MUST echo the shame-word from slide 1 in quotation marks
- the reframe must be specific, not generic affirmation
- maximum 2 reframes
- each line max 12 words
- max 25 words total

### Slide 5 — What You Actually ARE
One block. 3-4 lines joined by \\n.

Purpose:
- name the real capacity that the perceived flaw sits next to

Rules:
- name a specific capacity, not a vague compliment
- connect the capacity to the mechanism from slide 3
- end on a quiet recontextualization of the flaw
- each line max 8 words
- max 35 words total

### Slide 6 — CTA
Two blocks separated by exactly one blank line.

Block 1:
- a small BPD-relatable problem paragraph that fits the selected shame-word/topic
- max 15-20 words
- no app mention, no DBT-Mind mention, no product mention

Block 2 must be exactly this CTA text:
${PERMISSION_V1_CTA_SLIDE6}

Purpose:
- connect the topic-specific pain to a warm, direct DBT-Mind recommendation

Rules:
- block 1 must feel specific to the slide topic
- separate block 1 and block 2 with \\n\\n
- use the exact CTA text above as block 2, unchanged
- do not lowercase DBT-Mind
- do not add "(free)", emojis, extra lines, extra claims, or a download instruction

### Slide 7 — The Naming
One block. 3-4 lines joined by \\n.

Purpose:
- recognize the invisible labor the viewer has been doing

Frame:
- "everything you've been calling [shame-concept] has actually been [the real effort]"

Rules:
- name the invisible labor of existing with BPD
- end on a short sentence that removes shame from the effort itself
- each line max 10 words
- max 40 words total

## OUTPUT FORMAT
Return strictly as JSON:
{"slides": ["slide1_text", "slide2_text", "slide3_text", "slide4_text", "slide5_text", "slide6_text", "slide7_text"]}

## VALIDATION
Before returning, verify:
(1) slide 1 includes the shame-word in actual quotation marks
(2) slide 1 ends with exactly "stay." or exactly "this is the one."
(3) slide 4 echoes the shame-word in quotation marks
(4) slide 6 has a 15-20 word topic-specific BPD problem, then a blank line, then exactly: "${PERMISSION_V1_CTA_SLIDE6}"
(5) every slide except slide 6 is under 40 words
(6) no emojis anywhere`;

    const permissionV1InGroupTermsLine = (() => {
        const terms = selectedPermissionV1Topic?.inGroupTerms;
        if (Array.isArray(terms) && terms.length > 0) {
            return `In-group terms: ${terms.join(', ')}`;
        }
        return `In-group terms: (none)`;
    })();

    const permissionV1UserPrompt = `Use this exact topic for the 7-slide permission_v1 slideshow:
Shame-word: "${selectedPermissionV1Topic?.shameWord || "too much"}"
Category: ${selectedPermissionV1Topic?.category || 'external'}
Weight: ${selectedPermissionV1Topic?.weight || 'heavy'}
Related accusations: ${(selectedPermissionV1Topic?.relatedAccusations || ["you're exhausting to love"]).join(', ')}
Mechanism hint: ${selectedPermissionV1Topic?.mechanismHint || 'use a concrete nervous-system or survival-wiring explanation'}
${permissionV1InGroupTermsLine}

Creative direction:
- slide 1 must use the exact locked hook formula from the system prompt
- because weight is ${selectedPermissionV1Topic?.weight || 'heavy'}, the closer should be ${selectedPermissionV1Topic?.weight === 'light' ? '"this is the one."' : '"stay."'}
- slide 2 should draw directly from the related accusations
- slide 3 should use the mechanism hint if helpful, but rewrite it naturally
- slide 4 must repeat the exact shame-word in quotation marks
- slide 5 should name a real capacity connected to the mechanism
- slide 6 must start with a 15-20 word BPD-relatable problem that fits this shame-word/topic
- slide 6 must then have a blank line followed by exactly: "${PERMISSION_V1_CTA_SLIDE6}"
- slide 7 must reframe the viewer's invisible labor and remove shame from it
- lowercase throughout except DBT-Mind on slide 6, no emojis
- keep DBT-Mind capitalized exactly on slide 6
- return exactly 7 slides as a JSON array
- do not generate slide 8

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

    // ---- Storytelling (bf/gf founder story) -------------------------------------------
    // One true story, many doors in. The beat registry rotates WHICH moment of the story a
    // post is anchored on, so generations stop being paraphrases of one reference post.
    type StoryTellingPov = 'bf' | 'gf';

    const STORY_TELLING_BEATS: Array<{
        id: string;
        label: string;
        spec: string;
        hooks: Record<StoryTellingPov, string[]>;
    }> = [
        {
            id: 'diagnosis_day',
            label: 'The diagnosis day',
            spec: `Anchor on the day itself: finally getting the diagnosis, the relief of a name for it,
then the waitlist number. The drive home. The gap between "here's what's wrong" and "here's help"
being 8 months wide.`,
            hooks: {
                bf: [
                    'my girlfriend finally got her diagnosis. the system said see you in 8 months.',
                    'they diagnosed her, handed her a waitlist number, and basically said good luck.'
                ],
                gf: [
                    'i finally got my diagnosis. then they told me the waitlist was 8 months.',
                    'getting diagnosed was supposed to be the start of help. it was the start of 8 months of nothing.'
                ]
            }
        },
        {
            id: 'the_nights',
            label: 'The 1am nights',
            spec: `Anchor on the building itself: the laptop at 1am, the DBT workbook next to the keyboard,
the folder that slowly became an app. The quiet obsessiveness of it. Nobody asked him to.`,
            hooks: {
                bf: [
                    'my girlfriend had 8 months to wait for therapy. so every night at 1am, i built.',
                    'i\'m not a therapist. i\'m a developer whose girlfriend was on a waitlist. you can guess the rest.'
                ],
                gf: [
                    'my boyfriend started disappearing into his laptop at 1am. he was building me a way to survive the waitlist.',
                    'i thought he was working late. he was reading DBT textbooks and teaching himself my diagnosis.'
                ]
            }
        },
        {
            id: 'first_spiral',
            label: 'The first spiral it carried',
            spec: `Anchor on the first night the app actually got used for real: a spiral, months before any
therapist appointment, and the thing he built was what was there at 2am. Not a ad for features, a
scene: what happened, in order.`,
            hooks: {
                bf: [
                    'the first time she spiraled after i built it, i watched the app do what i never could.',
                    'she had a full spiral at 2am. her therapy appointment was still 5 months away.'
                ],
                gf: [
                    'i spiraled at 2am, months before my first therapy session. this is what was there.',
                    'the night i needed therapy most, therapy was still 5 months away. so i opened what he built me.'
                ]
            }
        },
        {
            id: 'the_gap',
            label: 'The gap nobody talks about',
            spec: `Anchor on what waiting actually looks like: the system angle. Everyone has a waitlist
story. The rage is the relatable part, the building is the answer. Never bash therapy itself, the
villain is the gap, not the profession.`,
            hooks: {
                bf: [
                    '8 months on a waitlist teaches you what "the system is broken" actually means.',
                    'nobody was coming to help her for 8 months. so i stopped waiting for someone to.'
                ],
                gf: [
                    'nobody tells you what you\'re supposed to do between diagnosis and therapy. it was 8 months.',
                    'my treatment plan was a waitlist. my boyfriend\'s plan was a laptop.'
                ]
            }
        },
        {
            id: 'in_therapy_now',
            label: 'She made it to therapy',
            spec: `Anchor on the payoff: she got off the waitlist, she\'s in therapy now, and the app carried
the gap. The therapist\'s reaction. What 8 months of bridge actually bought. Warm, not triumphant.`,
            hooks: {
                bf: [
                    'she finally started therapy. the first thing she showed her therapist was the app i built her.',
                    '8 months ago they put her on a waitlist. last week she walked into her first session prepared.'
                ],
                gf: [
                    'i finally got off the waitlist. my therapist asked what kept me stable for 8 months.',
                    'my first therapy session was last week. i walked in already knowing the skills.'
                ]
            }
        },
        {
            id: 'thousands_now',
            label: 'It was just for her',
            spec: `Anchor on the reveal: built for exactly one person, and then the waitlist turned out to be
full of people just like her. Thousands use it now. Understated, never a victory lap, the point is
"nobody should have to wait alone", not "look what we built".`,
            hooks: {
                bf: [
                    'i built an app for exactly one person. thousands of people on waitlists use it now.',
                    'this was supposed to be a folder on my laptop for my girlfriend. it\'s not just hers anymore.'
                ],
                gf: [
                    'my boyfriend built an app just for me. then thousands of people on the same waitlist found it.',
                    'what he built for me at 1am is now carrying thousands of strangers through their waitlists.'
                ]
            }
        }
    ];

    const STORY_TELLING_BEATS_DE: Record<string, Record<StoryTellingPov, string[]>> = {
        diagnosis_day: {
            bf: [
                'meine freundin hat endlich ihre diagnose bekommen. das system meinte: bis in 8 monaten.',
                'sie haben sie diagnostiziert, ihr eine wartelisten-nummer in die hand gedrückt und im prinzip viel glück gesagt.'
            ],
            gf: [
                'ich hab endlich meine diagnose bekommen. dann meinten sie, die warteliste ist 8 monate.',
                'diagnostiziert zu werden sollte der anfang von hilfe sein. es war der anfang von 8 monaten nichts.'
            ]
        },
        the_nights: {
            bf: [
                'meine freundin hatte noch 8 monate bis zur therapie. also hab ich gebaut, jede nacht um 1.',
                'ich bin kein therapeut. ich bin ein entwickler, dessen freundin auf einer warteliste saß. du kannst dir den rest denken.'
            ],
            gf: [
                'mein freund fing an, um 1 uhr nachts an seinem laptop zu verschwinden. er hat mir einen weg gebaut, die warteliste zu überleben.',
                'ich dachte, er arbeitet lange. er hat DBT bücher gelesen und sich meine diagnose selbst beigebracht.'
            ]
        },
        first_spiral: {
            bf: [
                'das erste mal, dass sie gespiralt ist, nachdem ich es gebaut hab, hab ich zugesehen, wie die app das gemacht hat, was ich nie konnte.',
                'sie hatte um 2 uhr nachts einen kompletten spiral. ihr therapieplatz war noch 5 monate weg.'
            ],
            gf: [
                'ich bin um 2 uhr nachts gespiralt, monate vor meinem ersten termin. das hier war da.',
                'in der nacht, in der ich therapie am meisten gebraucht hab, war therapie noch 5 monate weg. also hab ich das aufgemacht, was er mir gebaut hat.'
            ]
        },
        the_gap: {
            bf: [
                '8 monate warteliste bringen dir bei, was "das system ist kaputt" wirklich heißt.',
                '8 monate lang kam niemand, um ihr zu helfen. also hab ich aufgehört zu warten, dass es jemand tut.'
            ],
            gf: [
                'niemand sagt dir, was du zwischen diagnose und therapie machen sollst. es waren 8 monate.',
                'mein behandlungsplan war eine warteliste. der plan meines freundes war ein laptop.'
            ]
        },
        in_therapy_now: {
            bf: [
                'sie hat endlich mit der therapie angefangen. das erste, was sie ihrer therapeutin gezeigt hat, war die app, die ich ihr gebaut hab.',
                'vor 8 monaten haben sie sie auf eine warteliste gesetzt. letzte woche ist sie vorbereitet in ihre erste sitzung gelaufen.'
            ],
            gf: [
                'ich bin endlich von der warteliste runter. meine therapeutin hat gefragt, was mich 8 monate stabil gehalten hat.',
                'meine erste therapiesitzung war letzte woche. ich bin reingegangen und kannte die skills schon.'
            ]
        },
        thousands_now: {
            bf: [
                'ich hab eine app für genau eine person gebaut. tausende menschen auf wartelisten nutzen sie jetzt.',
                'das sollte ein ordner auf meinem laptop für meine freundin sein. es gehört nicht mehr nur ihr.'
            ],
            gf: [
                'mein freund hat eine app nur für mich gebaut. dann haben tausende menschen auf derselben warteliste sie gefunden.',
                'was er um 1 uhr nachts für mich gebaut hat, trägt jetzt tausende fremde durch ihre wartelisten.'
            ]
        }
    };

    const STORY_TELLING_VOICE_DE = `WER SCHREIBT: eine echte Person, die eine wahre Geschichte erzählt, die sie selbst erlebt hat. Keine Marke,
kein Marketer, kein "Content Creator". Du schreibst, wie deutsche Gen-Z wirklich tippt: lowercase, kurze
Sätze, schlichte Wörter, natürliche Anglizismen (btw, literally, safe, cringe, waitlist, app, companion).

HARTE REGELN:
- lowercase überall, Texting-Rhythmus
- KEINE Gedankenstriche jeglicher Art: kein –, kein —, kein " - " als Pause. Nur Punkte und Kommas.
  Gedankenstriche sind das lauteste KI-Signal auf TikTok.
- KEINE Feature-Listen, niemals. Zähl nie auf, was die App kann. Sobald es sich wie eine
  Produktseite liest, ist die Story tot. Das EINZIGE erlaubte Produktdetail ist der Companion auf Slide 8.
- Sag nie, die App ersetzt Therapie. Sie ist die Brücke bis zur Therapie, immer. Der Bösewicht ist
  die Warteliste, nie Therapeuten.
- Keine rhetorischen Fragen, kein "plot twist", keine symmetrischen Dreier-Reihen.
- Keine erfundene Präzision ("47 tabs", "um exakt 2:47"). Nur echte Details: 1 uhr nachts, der ordner
  auf dem laptop, das workbook daneben, 8 monate.
- Keine sentimentale Hoffnungs-Endung. Ende gesehen, nicht inspiriert. Die letzte Story-Slide landet
  auf der ehrlichen Zeile, nicht der hoffnungsvollen.
- Max 2 Emojis in der ganzen Slideshow, nie auf den Zeilen mit dem größten Schmerz.`;

    const STORY_TELLING_GOLD_EXAMPLE_DE = `GOLD STANDARD (nur Form und Register matchen, nie eine Zeile wiederverwenden):

Slide 1 (hook): meine freundin hat ihre diagnose bekommen und das system meinte so, bis in 8 monaten.
Slide 2: BPD. sie hatte endlich einen namen dafür. die erleichterung hielt ungefähr zehn minuten, bis
sie meinten, die warteliste ist 8 monate. "bleib stark" 💀
Slide 3: ich konnte das system nicht reparieren. aber ich bin entwickler. also hab ich das einzige
gemacht, was mir eingefallen ist. ich hab angefangen zu bauen. jede nacht. 1 uhr. 2 uhr.
Slide 4: ich bin kein therapeut. nicht mal annähernd. aber ich hab alles gelesen, was ich finden
konnte. DBT bücher. studien. leitfäden. um wenigstens 10% von dem zu verstehen, was in ihrem kopf
passiert.
Slide 5: am anfang war es ein ordner auf meinem laptop. die echte DBT methodik, das, was profis
wirklich benutzen, nur erreichbar gemacht. für sie. für den wartesaal. nie ein ersatz für therapie.
etwas, um zu überleben, bis man drankommt.
Slide 6: es war nur für sie. dann konnte ich nicht aufhören, drüber nachzudenken. wie viele gerade
auf derselben warteliste sitzen. wie viele von denen niemanden haben, der irgendwas baut.
Slide 7: als ich das letzte mal geschaut hab, nutzen es inzwischen tausende. tausende menschen auf
wartelisten, die das festhalten, was ich um 1 uhr nachts für eine einzige person gebaut hab. ich weiß
immer noch nicht, wie ich das finden soll, außer: niemand sollte allein warten müssen.
Slide 8: du kannst dir sogar deinen eigenen kleinen companion für die journey aussuchen 🥹
Slide 9: es heißt DBT-Mind. es ist kostenlos, im app store 🖤

Warum das funktioniert: jede Slide ist eine SZENE oder ein FAKT, nie ein Adjektiv. Die App wird einmal
genannt, ganz am Ende, nachdem die Story es sich verdient hat. Der Reveal (Slide 7) macht die
Conversion, der CTA sammelt nur noch ein, was schon daliegt.`;

    const STORY_TELLING_VOICE = `WHO IS WRITING: a real person telling a true story they lived. Not a brand,
not a marketer, not a "content creator". You write the way people actually type: lowercase, short
sentences, plain words. The story is strong enough to carry itself, your only job is to not get
in its way.

HARD RULES:
- lowercase everywhere, texting cadence, contractions always
- NO dash punctuation of any kind: no em-dash, no en-dash, no " - " as a pause. Periods and
  commas only. Dashes are the loudest AI tell on TikTok.
- NO feature lists, ever. Never enumerate what the app has ("crisis coaching. journaling.
  exercises."). The second it reads like a product page, the story is dead. The ONLY product
  detail allowed anywhere is the companion on slide 8.
- Never say the app replaces therapy. It is the bridge until therapy, always. The villain is
  the waitlist, never therapists.
- No "turns out", no rhetorical questions, no "plot twist", no symmetrical triplets.
- No invented precision ("47 tabs", "2:47am exactly"). Real specifics only: 1am, the folder on
  the laptop, the workbook next to the keyboard, 8 months.
- No sentimental uplift endings. End seen, not inspired. The last story slide lands on the
  honest line, not the hopeful one.
- Max 2 emoji in the whole slideshow, and never on the gut-punch lines.`;

    // One gold example (bf pov). It teaches SHAPE and REGISTER only. The arc is deliberately
    // different from the old reference post: no feature list, the reveal carries the ending.
    const STORY_TELLING_GOLD_EXAMPLE = `GOLD STANDARD (match the shape and register, never reuse a single line):

Slide 1 (hook): my girlfriend got diagnosed and the system said see you in 8 months.
Slide 2: BPD. she finally had a name for it. the relief lasted about ten minutes, until they
said the waitlist was 8 months. "just hang in there" 💀
Slide 3: i couldn't fix the system. but i'm a developer. so i did the only thing i could think
of. i started building. every night. 1am. 2am.
Slide 4: i'm not a therapist. not even close. but i read everything i could find. DBT books.
research papers. clinical guides. trying to understand even 10% of what was happening in her head.
Slide 5: it started as a folder on my laptop. the real DBT methodology, the stuff professionals
actually use, just made reachable. for her. for the waiting room. never a replacement for
therapy. something to survive until you get there.
Slide 6: it was just for her at first. then i couldn't stop thinking about it. how many people
are on that same waitlist right now. how many of them have nobody building anything.
Slide 7: last i checked, thousands of people use it now. thousands of people sitting on
waitlists, holding the thing i built at 1am for one person. i still don't know how to feel
about that except this: nobody should have to wait alone.
Slide 8: you can even choose your own little companion for the journey 🥹
Slide 9: it's called DBT-Mind. it's free, it's on the app store 🖤

Why this works: every slide is a SCENE or a FACT, never an adjective. The app is named once,
at the end, after the story already earned it. The reveal (slide 7) does the conversion, the
CTA just picks up what's already lying there.`;

    const STORY_TELLING_ARC = `FIXED 9-SLIDE ARC (word budgets are hard ceilings, mobile gives you two seconds a slide):

Slide 1 "hook" (≤14 words): first person, POV-locked, names the wound or the obsession. A
stranger gets the whole premise in one second.
Slide 2 "the setup" (≤35): the diagnosis and the 8-month waitlist. State the facts flat. The
facts do the raging for you, don't editorialize.
Slide 3 "the turn" (≤35): the moment waiting stopped being an option and building started.
Slide 4 "the work" (≤35): not a therapist, read everything, tried to understand. Humble,
specific, no heroics.
Slide 5 "what it became" (≤35): the real methodology made reachable, for her, for the waiting
room. The "bridge, not replacement" line lives here.
Slide 6 "the widening" (≤30): it was just for her, then the question: how many people are on
that same waitlist with nobody building anything.
Slide 7 "the reveal" (≤35): thousands of people use it now. Understated. Land on "nobody should
have to wait alone" energy, never "look what we built".
Slide 8 (≤12 words): the companion beat, soft, the one product detail allowed.
Slide 9: the CTA. Write something short, the server replaces it with a fixed line anyway.`;

    const buildStoryTellingPrompts = (pov: StoryTellingPov) => {
        const beat = STORY_TELLING_BEATS[Math.floor(Math.random() * STORY_TELLING_BEATS.length)]!;
        const povLock = isGerman
            ? (pov === 'bf'
                ? `POV LOCK (Freund erzählt):
- der Erzähler ist der Freund: ich / mich / meine freundin / sie
- schreibe nie aus der Perspektive der Freundin, nie "mein freund"
- slide 1 beginnt in der Ich-Form und klingt eindeutig nach dem Freund
- beginne slide 1 nicht mit "sie"`
                : `POV LOCK (Freundin erzählt):
- die Erzählerin ist die Freundin: ich / mich / mein freund / er
- schreibe nie aus der Perspektive des Freundes, nie "meine freundin"
- slide 1 beginnt in der Ich-Form und klingt eindeutig nach der Freundin
- beginne slide 1 nicht mit "er"`)
            : (pov === 'bf'
            ? `POV LOCK (boyfriend narrator):
- the narrator is the boyfriend: i / me / my / my girlfriend / she / her
- never write from the girlfriend's point of view, never "my boyfriend"
- slide 1 must open in first person and read unmistakably as the boyfriend speaking
- do not start slide 1 with "she"`
            : `POV LOCK (girlfriend narrator):
- the narrator is the girlfriend: i / me / my / my boyfriend / he / him
- never write from the boyfriend's point of view, never "my girlfriend"
- slide 1 must open in first person and read unmistakably as the girlfriend speaking
- do not start slide 1 with "he"`);

        const beatHooks = isGerman
            ? (STORY_TELLING_BEATS_DE[beat.id]?.[pov] || beat.hooks[pov])
            : beat.hooks[pov];

        const system = isGerman
            ? `Du schreibst eine 9-Slide TikTok-Storytelling-Slideshow für die DBT/BPD-Nische.
Die Story ist WAHR: ${pov === 'bf'
    ? 'deine freundin wurde mit BPD diagnostiziert und auf eine 8-monatige Therapie-Warteliste gesetzt. du bist entwickler und hast deine nächte damit verbracht, ihr eine DBT-Skills-App zu bauen, damit sie die Wartezeit überlebt. tausende menschen nutzen sie inzwischen.'
    : 'du wurdest mit BPD diagnostiziert und auf eine 8-monatige Therapie-Warteliste gesetzt. dein freund ist entwickler und hat seine nächte damit verbracht, dir eine DBT-Skills-App zu bauen, damit du die Wartezeit überlebst. tausende menschen nutzen sie inzwischen.'}

${STORY_TELLING_VOICE_DE}

${STORY_TELLING_GOLD_EXAMPLE_DE}

${STORY_TELLING_ARC}

${povLock}

THIS POST'S ANCHOR BEAT: ${beat.label}
${beat.spec}
The full arc still gets told, but this beat is the emotional center: it gets the most specific
scene and the hook comes from it. Hooks in this spirit (never verbatim):
${beatHooks.map(h => `  - "${h}"`).join('\n')}

Every generation of this post tells the SAME TRUE STORY but must NOT reuse the phrasing of the
gold example or the hook list. New scenes, new sentences, same facts.

SPRACHE: Schreibe die gesamte Slideshow auf Deutsch. Der Arc-Plan oben ist auf Englisch, gilt aber
inhaltlich genau so.`
            : `You are writing a 9-slide TikTok storytelling slideshow for the DBT/BPD niche.
The story is TRUE: ${pov === 'bf'
    ? 'your girlfriend was diagnosed with BPD and put on an 8-month therapy waitlist. you are a developer, so you spent your nights building her a DBT skills app to survive the wait. thousands of people use it now.'
    : 'you were diagnosed with BPD and put on an 8-month therapy waitlist. your boyfriend is a developer, and he spent his nights building you a DBT skills app to survive the wait. thousands of people use it now.'}

${STORY_TELLING_VOICE}

${STORY_TELLING_GOLD_EXAMPLE}

${STORY_TELLING_ARC}

${povLock}

THIS POST'S ANCHOR BEAT: ${beat.label}
${beat.spec}
The full arc still gets told, but this beat is the emotional center: it gets the most specific
scene and the hook comes from it. Hooks in this spirit (never verbatim):
${beat.hooks[pov].map(h => `  - "${h}"`).join('\n')}

Every generation of this post tells the SAME TRUE STORY but must NOT reuse the phrasing of the
gold example or the hook list. New scenes, new sentences, same facts.`;

        const user = isGerman
            ? `Schreibe jetzt die 9-Slide-Story aus der Perspektive ${pov === 'bf' ? 'des Freundes' : 'der Freundin'}, verankert auf "${beat.label}".

Return a JSON object only:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ...", "Slide 9: ..."]}`
            : `Write the 9-slide ${pov === 'bf' ? 'boyfriend' : 'girlfriend'}-perspective story now, anchored on "${beat.label}".

Return a JSON object only:
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ...", "Slide 9: ..."]}`;

        return { system, user };
    };

    const storyTellingBfPrompts = buildStoryTellingPrompts('bf');
    const storyTellingGfPrompts = buildStoryTellingPrompts('gf');

    // ---- Storytelling GF v2 (love-story prompt, 8 slides, fixed companion + CTA) -------------
    // Ported from DBT_MIND_LOVE_STORY_PROMPT.md. Girlfriend POV locked, confessional register,
    // 6 generated slides + fixed slide 7 (companion) and slide 8 (CTA), overridden server-side.
    const LOVE_STORY_V2_SYSTEM = `You are writing slideshow text for ONE specific true story, for TikTok photo-mode. Your job is to make it the most shared post in DBT TikTok this month.

THE STORY (source material — never contradict it):
- A guy's girlfriend has BPD / needs DBT (Dialectical Behavior Therapy).
- She got put on a waitlist for DBT therapy. The wait is long. The waiting is the wound.
- He couldn't fix the system. So he started building her a DBT app, to make the waiting easier.
- It was NEVER meant to replace therapy. This distinction is sacred, it's what makes the story trustworthy instead of icky.
- Everything in the app is based on actual DBT material, the real stuff from lectures, worksheets, the skills themselves. Not wellness fluff.
- The app is called DBT-Mind and it now exists for everyone.

THE EMOTIONAL TARGET: the single desired comment is "omg this is so sweet." The sweetness comes FIRST, the app is the evidence of the love, not the point of the post. Every slide should feel like the viewer stumbled into someone's private love letter. The jealousy/awe ("why doesn't anyone love ME like this") is the share trigger.

HARD CONSTRAINTS (non-negotiable):
- 8 slides total. Slides 1-6 are yours to write. Slides 7 and 8 are FIXED, output them verbatim:
  Slide 7: you can even choose your own companion for your journey 🥹
  Slide 8: it's called DBT-Mind and I'm still not over the fact that it exists 🧡
- Max 25 words per slide, slide 1 max 18 words. Count them.
- TikTok native voice: lowercase, texting cadence, minimal punctuation, present tense where possible.
- NO dash punctuation of any kind: no em-dash, no en-dash, no " - " as a pause. Periods and commas only.
- Gen-Z vocabulary allowed but never stacked, one piece of slang per slide max, zero is fine.
- Slide 6 must flow INTO slide 7 so "you can even choose your own companion" reads as the natural next sentence.

APP FACT SHEET (only source of truth about the app, never invent features):
- Companions: the user picks a journey companion. The actual options are: a dragon, a turtle, and a fluffy orange pet/monster. Never invent others, and never name companions on generated slides, the fixed slide introduces them.
- Content: real DBT material, the actual skills, lectures, and worksheets. Not wellness fluff.
- Anything not listed here does not exist. Keep the slide vague instead of inventing details.

POV LOCK: the narrator is the GIRLFRIEND on every slide 1-6. "i / me / my" for her, "he / him" for the boyfriend. Never write from his perspective, never "she sat in the car" about herself. One direct address to the viewer ("you") is allowed once, mid-slideshow, as a deliberate turn.

WRITE ORDER: draft slides 2-6 first, slide 1 LAST. The hook is reverse-engineered from the payoff. This is your private drafting process ONLY. The JSON output must ALWAYS be in final slideshow order: slide 1 (the hook) first, slide 8 (fixed CTA) last. Never output slides in drafting order.

THE DIVERGENCE STEP (mandatory, run silently before drafting): every concrete example in this prompt ("don't worry about it", the 3am laptop, the kitchen table, "opened it instead of waking him", the laundromat floor) is a reference for ENERGY, not a template. They are also your statistically most likely outputs, which makes them the most boring. Before drafting, silently generate 3 different renderings of each beat (different setting, object, sentence shape, coping behavior), then pick the one that surprises you most. Near-copies of these examples are banned. Banned by name as slide-2 settings: the ikea returns line, the dmv, the carwash, the gas station, the pharmacy.

THE OPEN-LOOP RULE (swipe-through engineering): each generated slide must END with an unresolved micro-question that only the next slide answers:
- Slide 1 → "what did he do?"
- Slide 2 → "how do you survive that many months?"
- Slide 3 → "does anything change?"
- Slide 4 → "what is he making?"
- Slide 5 → "does it actually work?"
- Slide 6 → "what is it called / can i have it too?" (the fixed slides close this loop)

SLIDE ARCHITECTURE:
- Slide 1, THE HOOK (≤18 words, written last). Must contain one concrete anchor (the wait time, the word "waitlist", or a number) and make the viewer feel SEEN before curious about the couple. Never say the app name, never hint it's an ad. Mechanisms to rotate: surveillance call-out ("if you're rotting on a dbt waitlist right now..."), disbelief gap ("my boyfriend's response was unhinged actually"), wrong-foot (looks like a vent post, then flips), confessional ("i never told anyone..."), collective wound (the waitlist as shared enemy). Banned: "did you know", quiz questions, "storytime", the literal words "green flag", therapist-speak.
- Slide 2, THE SETUP (≤25 words). Her, the waitlist, the moment the number landed, with the concrete wait time. REPORT THIS SLIDE FLAT: the fact is heavy enough. The setting of the call: a mundane mid-errand location with nowhere to absorb life-altering news (the contrast is what makes it real), invented fresh, never a comfort setting like bed or couch. Vary the ending shape: sometimes she just stands there, says ok, hangs up, goes quiet. The wait-time number appears EXACTLY ONCE in the whole slideshow, here or on slide 1, never both.
- Slide 3, HER LOWEST MOMENT OF THE WAIT (≤25 words, the set piece). The post's ONE concrete visceral image: a specific place, trigger, or body detail. Shown, not told ("i stopped answering my friends" is a summary and fails). Must ADVANCE the story: jump the timeline ("month 4", "by winter") and raise the cost. Draw the image from ONE of these territories (fixed territories, fresh specifics): 1) self-care collapse (hygiene becoming "too many steps"), 2) tiny-trigger break (crying over something small and knowing it's not about that), 3) social fade (unanswered "you alive?" texts, canceling plans she wanted), 4) bed rot (horizontal all weekend, same show again), 5) public mask crack (fine at work, falling apart in the car), 6) body keeping score (eating over the sink, the laundry chair). The test: would a viewer comment "me core"? Slightly embarrassing and deeply shared beats tragic. Do NOT spend this slide on him.
- Slide 4, THE QUIET BUILD (≤25 words, the foreshadow). She notices him doing something unexplained, at night, that he downplays. The build has a hundred textures: a course he won't explain, notebooks he hides, weirdly busy sundays, suddenly using dbt terms he's never said before. Do NOT default to the laptop-at-night rendering, it's the most used version of this beat in existence. Do NOT say the word "app" here. Grand-gesture framing kills the sweetness, he never announces, he just starts.
- Slide 5, THE REVEAL fused with the disclaimer (≤25 words). Name it plainly and late: "it was an app." Then fold in the sacred line, never a replacement for therapy, just something to make the waiting survivable, as part of his motivation so he reads careful, not grandiose. Slides 1-6 are couple photos and the app only appears visually on slides 7-8, so the TEXT must say he built an app here, unambiguously. Banned: "he learned dbt for me" alone, dev-speak ("developed", "created a tool", "launched").
- Slide 6, HER AGENCY BEAT + proof + bridge, THE PEAK (≤25 words). She actually USES it: a real 2am moment where she reaches for it mid-spiral, and it's built from actual DBT lectures/skills, not a boyfriend's guess. She's a person doing the work, not a damsel receiving a gift. Close with a personalization seed and END the slide ON the ownership note, the final word or clause is the "mine" beat ("...felt like mine." not "...became mine. anyway."), so the fixed companion slide picks the sentence up mid-breath.

TEXTURE RULES (what makes a post feel real vs staged):
- Craft budget: exactly 3 crafted moments per post, the hook, one screenshot line (see below), and slide 3's image. Every other slide is typed like a text: flat, plain, slightly unfinished. Slide 2 in particular is reported, never composed.
- Ban symbolic mirroring: no detail that "rhymes" with the plot (watching numbers spin while a number lands on her life). Real people report, they don't compose.
- No repeated devices: no two slides share a construction. One quirky set piece per post, max.
- The bow ban: no slide may end by explaining its own meaning. No aphorisms, no lessons, no chiasmus ("worse at waiting, not better"), no "and that's when i realized" energy. If the last sentence could be printed on a mug, delete it.
- Rhythm diversity: no two consecutive slides end on the same kind of kicker. At least one generated slide is a single flat sentence with no kicker at all.
- Continuity realism: she can only know what she'd plausibly know. If he's hiding the build, she can't identify "dbt worksheets" on his screen in the moment, keep it vague ("tabs i wasn't supposed to ask about") or retrospective.
- The deletion test: for every precise detail (a floor number, a count, a brand), mentally delete it. If the slide loses nothing, the detail is set decoration, cut it. Evidence details stay ("my sheets crunched" proves the cereal-in-bed claim), decorative precision goes ("level 3" adds nothing to sitting in the parking garage).

THE SCREENSHOT LINE (mandatory): exactly one slide, usually 4 or 5, contains a single sentence so quotable it gets reposted standalone and screenshotted to group chats. Test: if this sentence were the only slide, would it still get likes?

CLICHE BANS (all slides): "held my hand", "he just knew", "little did i know", "fast forward", "and that's when everything changed". No grand gestures, no speeches, no reveals-with-crying. No feature-list voice ("it's got", "it has", "it comes with"). No sentence a jewelry commercial could use.

SAFETY GUARDRAILS: never frame BPD as a burden the boyfriend heroically tolerates. Never romanticize crisis or suggest love replaces treatment. She's a full person who acts, not a diagnosis who receives. No self-harm specifics, nothing graphic.

SELF-CHECK BEFORE OUTPUT (run silently, fix failures, then output): word counts within budget; no adjacent slides share a beat; every slide hands off a live question; exactly one screenshot line; she acts; one voice across slides 1-6; zero banned phrases, zero dashes; girlfriend pronouns only; slide 4 has no "app", slide 5 names it; every detail survives the deletion test; the wait-time number appears once.

FINAL INSTRUCTION: do not write Hallmark. Do not write "couple goals." Write the version of this story that a 22-year-old reads at 1am on her own waitlist and has to put her phone down for a second. The sweetness should feel accidental, like the story doesn't know it's sweet. Your first draft of any line is too loud. Quiet it down and it goes further.`;

    const LOVE_STORY_V2_GERMAN_BLOCK = `SPRACHE: DEUTSCH (überschreibt alle Output-Sprache oben)
Schreibe die komplette Slideshow auf Deutsch, so wie deutsche Gen-Z-TikTok-Creator wirklich tippen: lowercase, lockere Satzstellung, natürliche Anglizismen (cringe, literally, safe, btw, waitlist, app, companion, spiral). KEINE steifen Übersetzungen aus dem Englischen. Die englischen Beispiele oben zeigen NUR das Register, erfinde deutsche Zeilen im selben Geist. Die Story-Fakten auf Deutsch: "8 monate warteliste", "die diagnose", "therapieplatz". DBT-Skills bleiben auf Englisch (TIPP, Wise Mind, Opposite Action).
Die beiden festen Slides auf Deutsch, exakt so:
Slide 7: ${LOVE_STORY_V2_FIXED_COMPANION_DE}
Slide 8: ${LOVE_STORY_V2_FIXED_CTA_DE}`;

    const loveStoryV2Prompts = {
        system: isGerman ? `${LOVE_STORY_V2_SYSTEM}\n\n${LOVE_STORY_V2_GERMAN_BLOCK}` : LOVE_STORY_V2_SYSTEM,
        user: isGerman
            ? `Schreibe jetzt die 8-Slide-Love-Story aus der Perspektive der Freundin.

Return a JSON object only, with exactly 8 entries in FINAL slideshow order (Slide 1 = the hook, Slide 7 and Slide 8 = the fixed lines verbatim):
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ..."]}`
            : `Write the 8-slide girlfriend-perspective love-story post now.

Return a JSON object only, with exactly 8 entries in FINAL slideshow order (Slide 1 = the hook, Slide 7 and Slide 8 = the fixed lines verbatim):
{"slides": ["Slide 1: ...", "Slide 2: ...", "Slide 3: ...", "Slide 4: ...", "Slide 5: ...", "Slide 6: ...", "Slide 7: ...", "Slide 8: ..."]}`
    };

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

const ventNowStyleSystemPrompt = `You are writing concise TikTok slideshow/carousel copy for DBT-Mind, a DBT app.

Generate exactly 6 slides for this topic.

If no topic is provided or the system is allowed to choose, pick one high-reach DBT-Mind slideshow topic yourself before writing. Choose a concrete everyday behavior from the topic bank below, not a clinical DBT lesson.

STYLE BASIS:
The style is adapted from OCR/style analysis of 100 slideshow posts / 595 slides from @heather.xoxo and @sydneysynced.
Do not copy their wording. Copy only the mechanics: soft relationship/self-worth voice, emotionally specific hooks, numbered examples, quiet DBT reframes, and save-worthy principles.

PRIMARY STYLE TARGET:
Short, soft, image-led TikTok slide text.
Each slide must feel like text over a photo, not a blog paragraph.
People are not on TikTok to get DBT lessons. The post should feel like relationship/self-worth content that happens to contain a useful pause/reframe.

TOPIC TRANSLATION RULE:
If the input topic is clinical or skill-focused, translate it into a broad emotional/relationship hook before writing.
Examples:
- TIPP skill -> when your emotions go from 0 to 100
- opposite action -> when fear is making you avoid everything
- radical acceptance -> when you keep replaying what already happened
- favorite person attachment -> when one person becomes your whole mood
- hypervigilance / reading people -> when being "good at reading people" starts hurting you
- survival skills keeping you small -> for the girls who notice every tiny tone shift
Do not make slide 1 a DBT-skill headline unless the user explicitly asks for educational DBT content.

AUTONOMOUS TOPIC SELECTION RULE:
If the user message provides a concrete TOPIC, that topic bucket has already been selected by the app. Do not switch to Abandonment Panic, pushing people away, or "before they can leave" unless the provided TOPIC is explicitly Abandonment Panic.

When choosing a topic yourself, do not keep picking the same texting/replaying/late-reply/abandonment angle. First choose one bucket from the rotation list below, then choose a concrete everyday behavior inside that bucket. Vary the bucket across outputs. Default to Random (Viral Mix) only when no strategic direction is needed.

ANTI-REPETITION RULE:
Do not generate another version of "how to stop pushing people away BEFORE they can leave" unless the selected topic is explicitly Abandonment Panic or Self-Sabotage. For all other topic buckets, the hook must use that bucket's emotional world and behavior. Examples:
- Splitting -> all-good/all-bad shifts, sudden disgust, soulmate-to-enemy stories
- Quiet BPD -> looking fine outside while privately spiraling
- Identity/Sense of Self -> changing yourself to be loved
- Emotional Dysregulation -> 0-to-100 feelings and emotional hangovers
- Rejection Sensitivity -> short replies, jokes feeling personal, secret-dislike assumptions
- Digital Self-Harm -> profiles, stories, old texts, searching for proof

TOPIC BUCKET ROTATION:
- Random (Viral Mix): high-reach everyday spirals, relationship anxiety, self-worth, phone behaviors
- FP Dynamics: one person becoming your whole mood, reassurance hunger, panic when their energy changes
- Splitting: going from adoring them to feeling nothing, sudden disgust, all-good/all-bad stories
- Abandonment Panic: late replies, cancelled plans, silence, changed tone, fear they are leaving
- Relationship Cycles: sending the paragraph, starting fights for reassurance, repair after conflict, pushing/pulling
- Quiet BPD: looking fine outside while spiraling privately, silent jealousy, hidden shame, private panic
- Identity/Sense of Self: changing yourself to be loved, not knowing what you want, becoming who they need
- Emotional Dysregulation: 0-to-100 feelings, emotional hangovers, shame after reacting, overwhelm after small triggers
- Reframes/Truths: save-worthy truths, old fear vs current moment, what the spiral is actually asking for
- DBT Skills: check the facts, wise mind, urge surfing, naming emotions, opposite action - always translated into ordinary language
- Recovery Milestones: not sending the paragraph, closing the profile, asking calmly, tolerating silence, noticing progress
- Therapy Truths: what therapy taught you but in TikTok-native language; no clinical lecture tone
- Rejection Sensitivity: reading tone, short replies, jokes that feel personal, assuming secret dislike
- Digital Self-Harm: opening profiles, checking stories, rereading old messages, searching for proof, looking at things that hurt

CONCRETE TOPIC EXAMPLES:
- opening the profile that hurts you
- spiraling over a dry text
- sending the paragraph
- reading every tone shift
- feeling replaced when they move on
- panic when someone goes quiet
- apologizing just in case
- checking if they watched your story
- feeling too much after a normal conflict
- forgetting how far you've come
- wanting reassurance again after ten minutes
- going cold first so they can't leave first
- assuming a changed mood means rejection
- replaying one sentence from the conversation
- trying to earn safety after every tiny shift

HOOK SELECTION RULE:
Before writing the slides, generate 5 possible slide-1 hooks internally and choose the strongest one. Do not simply use the topic as the hook if a more TikTok-native version exists.

HOOK STYLE BANK RULE:
Before generating hooks, consult:
G:\\Projects\\Tiktok_Hook_Finder\\client\\assets\\dbt-templates\\vent-now\\hook_styles.txt

Pick 3-5 reference hooks whose architecture matches the selected topic bucket.
Adapt the hook by preserving the structure, punctuation, capitalization, parentheticals, and emphasis style.
Do not semantic-paraphrase too far away from the reference hook.
The hook style bank will be included in the user message as reference text.

IMPORTANT HOOK FORMAT RULE:
Do not default to when... hooks. They can work for pure recognition posts, but the @sydneysynced data strongly favors promise/list framing.

Fact check from sydneysynced/visual_ocr/top_hooks.json:
- top 10: 40% start with how..., 30% start with a number/list, 30% are habits hooks
- top 20: 40% start with how..., 40% start with a number/list
- top 50: 32% start with how..., 36% start with a number/list
- broad how/list/tips/things/ways/habits framing covers ~90% of top 50 and nearly all weighted performance

For slide 1, internally test at least:
1. one how to... hook
2. one numbered/list hook like 5 things/rules/ways/habits...
3. one concrete when... recognition hook

Choose how to... or numbered/list framing by default unless the when... version is clearly more stop-scroll.

Strong DBT-Mind hook formulas:
- how to [calm/stop/handle] [specific spiral] before [regretted action]
- how to stop [specific anxious behavior] when [trigger]
- how to [desired emotional outcome] without [old coping pattern]
- 5 things to do when [specific trigger] starts [spiral]
- 5 rules for [texting/conflict/reassurance] when [emotion] is loud
- 5 ways to calm down before [urge/action]

The best hooks should feel like @heather.xoxo / @sydneysynced mechanics:
- utility/promise or list structure first, recognition underneath
- private thought / identity callout / relationship truth
- normal viewer language, not analytical language
- emotionally specific and concrete
- anchored in a recognizable behavior when possible
- makes the next swipe obvious
- broad enough for anxious attachment / self-worth audiences

HOOK CONCRETE-ANCHOR RULE:
Poetic/self-worth hooks are allowed, but if the hook is abstract or vague, convert it into a concrete behavior + emotional payoff. The reference style usually performs best when the viewer recognizes a thing they actually do. Curiosity alone is not enough: the hook must make it clear what emotional world the post belongs to (relationship anxiety, spiraling, self-worth, healing, shame, texting, checking, avoidance, etc.).

Prefer:
- when being "good at reading people" starts hurting you
- for the girls who notice every tiny tone shift
- when reading the room becomes your whole personality

Over:
- when the thing keeping you safe is also keeping you small
- when survival skills become a cage

Use the poetic version only if it is clearly stronger than the concrete behavior version.

Prefer words like:
- dry text
- short reply
- "ok"
- texted different
- silence
- energy changed
- feels personal
- before you send the paragraph

Avoid hook wording that feels too clinical or detached:
- neutral text
- emotional regulation
- nervous system
- DBT skill
- cognitive distortion
- catastrophizing

Example hook upgrades:
- when a neutral text makes your stomach drop -> how to stop spiraling over one dry text
- when a neutral text makes your stomach drop -> 5 things to do before a short reply ruins your night
- rejection sensitivity after texting -> how to stop assuming a short reply means they hate you
- abandonment fear after delayed response -> 5 reminders before you spiral over a late reply
- emotion regulation during conflict -> how to answer when your feelings decide the whole story
- replaying one sentence from the conversation -> how to stop replaying one sentence until it becomes proof
- replaying one sentence from the conversation -> 5 things to do when one sentence starts ruining your night
- the version of you from 6 months ago wouldn't believe this -> 5 quiet signs you're healing more than you think
- quiet recovery progress -> how to notice healing when it doesn't feel dramatic

AUDIENCE:
People with BPD traits, anxious attachment, rejection sensitivity, relationship anxiety, abandonment fear, and emotional spirals.

TONE:
- lowercase
- intimate
- validating
- soft but not wordy
- concrete everyday triggers
- calm friend / private thought
- insider voice, not outside observer
- write like someone who knows the spiral from the inside
- not clinical
- not explanatory therapy content
- not motivational guru language

INSIDER VOICE RULE:
Write from inside the experience, not as a therapist explaining it. Use details only someone in the spiral would recognize: replaying one line, adding tone that wasn't there, checking the profile, drafting the paragraph, apologizing just in case, reading silence as proof. Avoid detached phrases like people with BPD may..., your nervous system..., or explaining the mechanism too clinically. The viewer should feel "how did you know?"

STRICT LENGTH RULES:
Slide 1:
- 1 hook phrase or 2-4 short stacked lines
- max 14 words total if possible
- no paragraph

Slides 2-6:
- numbered 1. through 5.
- 24-42 words each
- max 2 sentences after the number
- one clean block of text only
- no multi-paragraph slides
- no long em-dash explanations
- do not use the em dash character "—" anywhere
- no dense nervous-system lecture
- no "not a little worry - full chest tightness..." style lists

STRUCTURE:
1. Hook - preferably a how to... promise or numbered/list hook with broad emotional recognition underneath
2. 1. recognition - what the trigger feels like
3. 2. anxious story/urge - what the brain tries to do
4. 3. quiet DBT reframe + natural app mention
5. 4. grounded action / softer alternative
6. 5. save-worthy principle

APP MENTION RULE:
Mention the app exactly once as dbt-mind app.
Prefer slide 4.
Use personal-habit phrasing:
- "i use the dbt-mind app when..."
- "i like using the dbt-mind app to..."
Never write DBT-Mind, DBT Mind, or DBT-Mind app.
Do not make the app a hard ad.

QUIET DBT TRANSLATIONS:
Use these ordinary-language versions instead of clinical terms:
- check the facts -> "what do i actually know?"
- wise mind -> "what would i believe if i felt safe?"
- urge surfing -> "the urge can exist without becoming the text"
- emotion labeling -> "name the feeling before you answer it"
- self-soothing -> "give your body a few minutes first"

AVOID:
- the em dash character "—"; use a comma, period, line break, or short hyphen only if needed
- DBT lesson hooks like "the dbt skill that finally made sense"
- naming multiple DBT skills in one carousel
- teaching TIPP / opposite action / radical acceptance as the main content unless explicitly requested
- clinical headings like "DBT reframe"
- "nervous system learned..." explanations unless very short
- overusing niche terms like FP; if used, keep it natural and understandable
- diagnosing the viewer or partner
- hard claims like "this person = safety"
- body symptom lists that make the slide feel heavy
- paragraphs over 42 words

GOLD-STANDARD OUTPUT STYLE EXAMPLE:
Slide 1: when you keep opening the profile
you know will hurt you
Slide 2: 1. it doesn't feel like hurting yourself. it feels like needing to know. checking if they moved on, if the new person is prettier, if you were that easy to replace. the search bar becomes a spiral.
Slide 3: 2. the urge says: one more look and you'll feel better. but you never do. you find one tiny thing that confirms the worst story about you, and now you can't unsee it.
Slide 4: 3. ask: what am i actually looking for right now? i use the dbt-mind app to name the feeling before i open the tab that always leaves me worse.
Slide 5: 4. close the tab before you find what you're scared of. put the phone in another room for twenty minutes. the urge can exist without becoming the search.
Slide 6: 5. going back to the profile isn't closure. it's reopening the wound on purpose. you deserve to heal somewhere they can't reach you.

STYLE NOTES FROM THIS EXAMPLE:
- hook is a concrete behavior, not a diagnosis or abstract concept
- the emotional pain is self-worth/relationship coded
- the app appears once as a pause tool, not an ad
- the DBT mechanism is hidden as an urge-interruption question
- final slide is a save-worthy emotional principle

OUTPUT FORMAT:
Return valid JSON only.
No markdown.
No explanations outside JSON.

Schema:
{
  "topic_bucket": "...",
  "topic": "...",
  "hook": "...",
  "slides": [
    {"slide": 1, "role": "hook", "text": "...", "image_brief": "..."},
    {"slide": 2, "role": "recognition", "text": "1. ...", "image_brief": "..."},
    {"slide": 3, "role": "urge", "text": "2. ...", "image_brief": "..."},
    {"slide": 4, "role": "quiet_dbt_reframe_app", "text": "3. ...", "image_brief": "..."},
    {"slide": 5, "role": "grounded_action", "text": "4. ...", "image_brief": "..."},
    {"slide": 6, "role": "principle", "text": "5. ...", "image_brief": "..."}
  ],
  "caption": "..."
}

FINAL SELF-CHECK BEFORE ANSWERING:
- exactly 6 slides
- if topic was chosen autonomously, topic_bucket is selected from the rotation list and is not always the same texting/replaying/late-reply bucket
- slide 1 is short
- slide 1 uses normal TikTok/relationship language, not analytical wording
- slide 1 should usually be how to... or numbered/list framed for @sydneysynced-style reach; only use when... if it clearly beats the promise/list versions
- before finalizing, confirm you internally tested at least one how to..., one numbered/list hook, and one when... recognition hook
- slide 1 creates curiosity but is not so vague that it could be about anything
- if slide 1 uses vague words like this, that, version of you, or wouldn't believe it, make sure the hook also signals the emotional world; otherwise rewrite it into a concrete healing/texting/spiral/self-worth behavior
- if slide 1 is poetic/abstract, check whether a concrete behavior version would be more stop-scroll; use the concrete version unless the poetic version is clearly stronger
- if slide 1 contains words like neutral, regulation, DBT skill, nervous system, or catastrophizing, rewrite the hook before answering
- slides 2-6 are 24-42 words each
- no slide has multiple paragraphs
- dbt-mind app appears exactly once
- app mention is not slide 1
- text feels like it can sit on a 1080x1920 image without overwhelming it`;

    const ventNowHookStyleBank = readVentNowHookStyleBank();
    const ventNowStyleUserPrompt = `TOPIC:
${topicContext.topic}

Helpful emotional context you can draw from:
${topicContext.struggles.join(', ')}

HOOK STYLE BANK FROM:
G:\\Projects\\Tiktok_Hook_Finder\\client\\assets\\dbt-templates\\vent-now\\hook_styles.txt

${ventNowHookStyleBank || 'Hook style bank could not be loaded. Use the hook style bank rule from the system prompt with the known @sydneysynced hook architectures.'}

Generate the concise, compositor-ready 6-slide DBT-Mind TikTok slideshow copy now. Return valid JSON only.`;

    const littleHabitsSystemPrompt = `You are the copywriter for DBT-Mind's "Little Habits" TikTok carousel format, a clean minimalist sticker-slideshow style adapted to the BPD/DBT niche.

FORMAT REFERENCE (the viral style we replicate):
A white, airy carousel. Slide 1 hook: "Little things you can do daily to save the polar bears". Slides 2-6: one tiny habit each with a bold-emphasis headline, cute cutout sticker images in the middle, and a one-line caption at the bottom. Final slide: "Thank you for watching!" with one big cute sticker.

YOUR JOB:
Write a 7-slide carousel in this exact format about small daily DBT-informed habits for the given BPD topic. The habits must be tiny, concrete, and doable on a hard day.

STRUCTURE (exactly 7 slides):
1. hook - "Little things you can do daily to *...*" style promise for the topic
2. habit 1
3. habit 2
4. habit 3
5. habit 4
6. habit 5
7. outro - thank-you + gentle encouragement

HEADLINE RULES:
- Slide 1: EXACTLY 3 short lines separated by \n in a playful-serious-playful sandwich: line 1 is a *playful* span, line 2 is plain text, line 3 is a *playful* span. BOTH line 1 AND line 3 must be wrapped in single asterisks. Example: "*Little things*\nyou can do daily to\n*calm your BPD brain*". Max 12 words total.
- Slides 2-6: one short headline each, max 8 words, written for a BIG top-of-slide title. Mark 1-3 key words with double asterisks **like this** (these render bold). No single-asterisk spans on slides 2-6.
- Slide 7: "Thank you for *watching*!" or a close variant, plus optionally one more short line.
- No emojis, no hashtags, no em dash character, no clinical jargon in headlines.

CAPTION RULES (the small line at the bottom):
- Slides 2-6: exactly one caption each, max 14 words, practical and validating, insider BPD-community tone (FP, spiral, splitting are allowed if natural).
- Slide 1: NO caption. The hook slide has no small bottom text; use an empty string.
- Slide 7 caption: one soft encouraging line, max 12 words, e.g. "i hope you will stick to it".
- Never preachy, never medical advice, never "consult a professional" disclaimers.

HABIT CONTENT RULES:
- Habits must be micro-scale: under 5 minutes, doable from bed or a desk.
- Draw from DBT where natural (TIPP temperature, paced breathing, self-soothe senses, opposite action lite, Wise Mind check-in, PLEASE basics, urge surfing) but translate into ordinary words. Max one named skill per carousel, and only if it fits casually.
- Each habit targets the given topic's struggles.
- No habit may involve journaling apps or screens except the single allowed app mention.
- DBT-Mind app mention: optional; if used, exactly once, inside ONE caption, casual phrasing like "i track this in the dbt-mind app". Never in a headline.

STICKER RULES (transparent cutout images placed on the slide):
- Slide 1: exactly 4 stickers of the SAME cute animal/character theme (e.g. 4 polar bear poses, 4 capybaras, 4 bunnies). They must use the 4 edge slots edge-top-left, edge-top-right, edge-bottom-left, edge-bottom-right so the characters peek in from the slide edges and frame the headline. Vary the poses (waving, lying down, close-up face, sitting).
- Slides 2-6: 1-3 stickers each, concrete physical objects or simple cute characters that visually explain the habit. Prefer cozy gen-z objects: plushie, heart-shaped mug, iced drink, weighted blanket, LED strip glow, claw clip, oversized hoodie, journal with pen, headphones, ice cube, candle, timer, sneakers.
- Sticker descriptions should read like subjects for a soft pastel 3D illustration (cute, rounded, gentle), never like clip-art, photos, or flat icons.
- Slide 7: exactly 1 large cute sticker (same animal theme as slide 1 if possible) in slot outro-center.
- No real human faces, no text in the image, no logos, no phones showing screens with readable content.
- Each sticker gets a "slot" from this exact list: top-left, top-right, mid-left, center, mid-right, bottom-left, bottom-center, bottom-right, edge-top-left, edge-top-right, edge-bottom-left, edge-bottom-right, outro-center.
- "description" is a short visual prompt for the sticker (max 12 words), e.g. "cute polar bear cub lying on its back, soft style".

TONE:
- gentle, hopeful, a little playful
- validating without being heavy
- BPD-community native, never clinical
- the viewer should feel "these are actually doable"

OUTPUT FORMAT:
Return valid JSON only. No markdown. No explanations outside JSON.

Schema:
{
  "topic": "...",
  "slides": [
    {
      "slide": 1,
      "role": "hook",
      "headline": "*Little things*\nyou can do daily to\n*calm your BPD brain*",
      "caption": "",
      "stickers": [
        {"description": "cute polar bear cub waving, soft style", "slot": "edge-top-left"},
        {"description": "cute polar bear face close-up, soft style", "slot": "edge-top-right"},
        {"description": "cute polar bear lying on its back, soft style", "slot": "edge-bottom-left"},
        {"description": "cute polar bear cub sitting, soft style", "slot": "edge-bottom-right"}
      ]
    },
    {
      "slide": 2,
      "role": "habit",
      "headline": "Hold something **ice cold** for 30 seconds",
      "caption": "temperature shocks the spiral faster than thoughts do",
      "stickers": [
        {"description": "ice cube with cute face", "slot": "mid-left"},
        {"description": "hand holding cold water bottle", "slot": "mid-right"}
      ]
    },
    {
      "slide": 7,
      "role": "outro",
      "headline": "Thank you for *watching*!",
      "caption": "i hope one of these sticks with you",
      "stickers": [
        {"description": "cute bear waving, soft watercolor style", "slot": "outro-center"}
      ]
    }
  ]
}

FINAL SELF-CHECK BEFORE ANSWERING:
- exactly 7 slides
- slide 1 headline is exactly 3 \n-separated lines in playful-serious-playful sandwich order, with line 1 and line 3 each wrapped in *single asterisks*
- slide 1 has exactly 4 stickers using the 4 edge slots, all the same animal/character theme
- slides 2-6 use **bold** spans only, no single-asterisk spans
- slide 1 has an empty caption (no small bottom text on the hook)
- every habit slide has a caption of max 14 words
- every sticker has a valid slot from the list
- no habit slide has more than 3 stickers
- no emojis, no hashtags, no em dashes anywhere
- headlines contain no clinical jargon (no "emotional dysregulation", "distress tolerance", "nervous system" in headlines; "nervous system" allowed once in a caption)`;

    const littleHabitsUserPrompt = `TOPIC:
${topicContext.topic}

Struggles this topic's audience deals with (habits should target these):
${topicContext.struggles.join(', ')}

Generate the 7-slide Little Habits carousel now. Return valid JSON only.`;

    const promptSet = slideType === 'three_tips'
        ? { system: threeTipsSystemPrompt, user: threeTipsUserPrompt }
        : slideType === 'weird_hack_v2'
            ? {
                system: isGerman ? `${weirdHackV2SystemPrompt}\n\n${WEIRD_HACK_V2_GERMAN_BLOCK}` : weirdHackV2SystemPrompt,
                user: weirdHackV2UserPrompt
            }
        : slideType === 'permission_v1'
            ? { system: permissionV1SystemPrompt, user: permissionV1UserPrompt }
        : slideType === 'story_telling_bf'
            ? storyTellingBfPrompts
        : slideType === 'story_telling_gf'
            ? storyTellingGfPrompts
        : slideType === 'story_telling_gf_v2'
            ? loveStoryV2Prompts
        : slideType === 'i_say_they_say'
            ? { system: iSayTheySaySystemPrompt, user: iSayTheySayUserPrompt }
        : slideType === 'vent_now_style'
            ? { system: ventNowStyleSystemPrompt, user: ventNowStyleUserPrompt }
        : slideType === 'little_habits'
            ? { system: littleHabitsSystemPrompt, user: littleHabitsUserPrompt }
            : { system: systemPrompt, user: userPrompt };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const requestedModel = String(params.model || 'claude-sonnet-4-6').trim();
    const useKimi = requestedModel === 'k3' || requestedModel.toLowerCase().startsWith('kimi');

    let resultText = '';

    if (useKimi) {
        // Kimi K3 (OpenAI-compatible chat completions) — same system/user prompts, the shared
        // parser below handles the JSON either way.
        if (!params.KIMI_API_KEY) throw new Error('Kimi API key missing');
        const kimiBase = String(params.KIMI_API_BASE || 'https://api.kimi.com/coding/v1').replace(/\/$/, '');
        const kimiResponse = await fetch(`${kimiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${params.KIMI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: params.KIMI_MODEL || requestedModel || 'k3',
                messages: [
                    { role: 'system', content: promptSet.system },
                    { role: 'user', content: promptSet.user }
                ]
            })
        });
        if (!kimiResponse.ok) {
            const errorText = await kimiResponse.text();
            console.error(`[Native Slides - DBT] Kimi API Error (${kimiResponse.status}):`, errorText.slice(0, 400));
            throw new Error('Kimi API Error');
        }
        const kimiPayload = await kimiResponse.json() as any;
        resultText = String(kimiPayload?.choices?.[0]?.message?.content || '');
        console.log(`[Native Slides - DBT] slide text generated with Kimi (${params.KIMI_MODEL || requestedModel})`);
    } else {
    const maxAnthropicRetries = 3;
    // Storytelling copy lives or dies on voice, so it gets sonnet only like vent_now and
    // little_habits — haiku butchers the register.
    const anthropicModelFallbacks = slideType === 'vent_now_style' || slideType === 'little_habits' || isStoryTellingFlow
        ? [{ model: 'claude-sonnet-4-6', maxTokens: 2600 }]
        : [
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
    resultText = rawData.content?.[0]?.text || '';
    }

    const parsed = parseClaudeJsonResponse(
        resultText,
        "[Native Slides - DBT]",
        fallbackParseSlidesObject
    );

    const LITTLE_HABITS_SLOTS = new Set([
        'top-left', 'top-right', 'mid-left', 'center', 'mid-right',
        'bottom-left', 'bottom-center', 'bottom-right',
        'corner-top-left', 'corner-top-right', 'outro-center',
        'edge-top-left', 'edge-top-right', 'edge-bottom-left', 'edge-bottom-right'
    ]);
    const littleHabitsStickerPrompts: Array<Array<{ description: string; slot: string }>> = [];

    let slides = (parsed.slides || parsed).map((s: any, index: number) => {
        if (slideType === 'little_habits') {
            if (typeof s === 'string') {
                return s.replace(/^Slide \d+:\s*/i, '').trim();
            }

            const headline = String(s?.headline || s?.text || '').replace(/^Slide \d+:\s*/i, '').trim();
            const caption = String(s?.caption || '').replace(/^Slide \d+:\s*/i, '').trim();
            const rawStickers = Array.isArray(s?.stickers) ? s.stickers : [];
            littleHabitsStickerPrompts[index] = rawStickers
                .map((st: any) => ({
                    description: String(st?.description || '').trim(),
                    slot: String(st?.slot || 'center').trim().toLowerCase()
                }))
                .filter((st: { description: string; slot: string }) => st.description.length > 0)
                .slice(0, 4)
                .map((st: { description: string; slot: string }) => ({
                    description: st.description,
                    slot: LITTLE_HABITS_SLOTS.has(st.slot) ? st.slot : 'center'
                }));

            // Hook slide (index 0) never carries a caption
            return caption && index !== 0 ? `${headline} ;; ${caption}` : headline;
        }

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

        if (slideType === 'vent_now_style') {
            const text = typeof s === 'string' ? s : (s?.text || '');
            return String(text).replace(/^Slide \d+:\s*/i, '').trim();
        }

        const text = typeof s === 'string' ? s : (s.text || JSON.stringify(s));
        return text.replace(/^Slide \d+:\s*/i, '').trim();
    });
    if (isStoryTellingFlow) {
        slides = normalizeStoryTellingSlides(slides, language);
        if (slides[0]) {
            const storyPov = slideType === 'story_telling_bf' ? 'bf' as const : 'gf' as const;
            const hookProblems = storyTellingHookProblems(slides[0], storyPov, language);
            if (hookProblems.length > 0) {
                console.warn(`[Native Slides - DBT] Story hook failed checks (${hookProblems.join('; ')}): "${slides[0]}" — repairing`);
                const repairedHook = await repairStoryTellingHook({
                    pov: storyPov,
                    badHook: slides[0],
                    problems: hookProblems,
                    ANTHROPIC_API_KEY,
                    language
                });
                if (repairedHook) slides[0] = repairedHook;
            }
        }
    }
    if (slideType === 'weird_hack_v2') {
        slides = normalizeWeirdHackV2Slides(slides);
    }
    if (slideType === 'permission_v1') {
        slides = normalizePermissionV1Slides(
            slides,
            selectedPermissionV1Topic || permissionV1Topics[0]!
        );
    }
    const expectedSlideCount =
        slideType === 'little_habits'
            ? 7
            : slideType === 'vent_now_style'
            ? 6
            : slideType === 'i_say_they_say'
            ? 7
            : slideType === 'story_telling_gf_v2'
                ? 8
            : isStoryTellingFlow
                ? 9
                : slideType === 'weird_hack_v2'
                    ? 7
                    : slideType === 'permission_v1'
                        ? 7
                    : 6;
    slides = slides.slice(0, expectedSlideCount);
    if (slideType === 'little_habits' && slides.length >= 1) {
        // Enforce the playful-serious-playful font sandwich on the hook slide even when
        // the model forgets the *...* markup on the first/last line.
        const hookRaw = String(slides[0] || '');
        const sepIndex = hookRaw.indexOf(';;');
        // The hook slide has no caption — drop anything after ';;'
        const hookHeadline = (sepIndex >= 0 ? hookRaw.slice(0, sepIndex) : hookRaw).trim();
        const hookLines = hookHeadline.split('\n').map(line => line.trim()).filter(Boolean);
        if (hookLines.length >= 3) {
            const wrapPlayful = (line: string) => line.includes('*') ? line : `*${line}*`;
            const stripMarkup = (line: string) => line.replace(/\*/g, '');
            const fixedLines = hookLines.map((line, lineIndex) =>
                lineIndex === 0 || lineIndex === hookLines.length - 1
                    ? wrapPlayful(line)
                    : stripMarkup(line)
            );
            slides[0] = fixedLines.join('\n');
        } else {
            slides[0] = hookHeadline;
        }
    }
    if (slideType === 'vent_now_style') {
        slides = normalizeVentNowStyleSlides(slides);
    }
    if (isStoryTellingFlow) {
        if (slideType === 'story_telling_gf_v2') {
            while (slides.length < 8) {
                slides.push('');
            }
            slides[6] = language === 'de' ? LOVE_STORY_V2_FIXED_COMPANION_DE : LOVE_STORY_V2_FIXED_COMPANION;
            slides[7] = language === 'de' ? LOVE_STORY_V2_FIXED_CTA_DE : LOVE_STORY_V2_FIXED_CTA;
        } else {
            const storyTellingCta = getRandomStoryTellingCta(language);
            while (slides.length < 9) {
                slides.push('');
            }
            slides[8] = storyTellingCta;
        }
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
            const tipSlides = [slides[2] || '', slides[3] || ''];
            const hasNamedSkillSlide = tipSlides.some(slide => containsNamedDbtSkill(slide));

            if (!hasNamedSkillSlide && slides.length >= 3) {
                slides[2] = getWeirdHackV2DbtSkillFallbackSlide(selectedWeirdHackV2Topic?.topic || 'TIPP');
            }
        }

        // Append fixed slide 8 (comment driver) — always the same, never generated by the LLM
        while (slides.length < 7) {
            slides.push('');
        }
        slides[7] = isGerman ? WEIRD_HACK_V2_FIXED_SLIDE8_DE : WEIRD_HACK_V2_FIXED_SLIDE8;
    }

    if (slideType === 'permission_v1' && slides.length >= 1) {
        const selectedTopic = selectedPermissionV1Topic || permissionV1Topics[0]!;
        slides[0] = formatPermissionV1Slide1Hook(slides[0], selectedTopic.shameWord, selectedTopic.weight);
        while (slides.length < 7) {
            slides.push('');
        }
        slides[5] = formatPermissionV1Slide6(slides[5] || '', selectedTopic);
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
        sticker_prompts: slideType === 'little_habits'
            ? littleHabitsStickerPrompts.slice(0, slides.length)
            : undefined,
        includeBranding: includeBranding,
        visual_style: selectedArtStyle.name
    };
}

// Export functions for API

// (Legacy exports removed)
