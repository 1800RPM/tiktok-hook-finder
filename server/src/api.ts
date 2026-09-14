import { Database } from "bun:sqlite";
import path from "path";
import { readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, statSync } from "fs";
import { searchHooksHybrid, loadEmbeddings } from "./semantic_search";
import { OPENAI_IMAGE_MODEL, generateImage, generateCarouselImages, flattenImagePrompt, generateImageWithReferences } from "./image_generator";
import type { ReferenceImage } from "./image_generator";
import { generateSypSlides } from "./projects/syp/syp_service";
import { buildPermissionV1NanoBananaPrompt, buildWeirdHackV2NanoBananaPrompt, generateConvertedSkepticHooks, generateDbtCarouselText, generateDbtSlides, generateLoveStoryV2Hooks, generateStoryTellingHooks, generateWeirdHackV2ImagePrompts } from "./projects/dbt/dbt_service";
import { createDbtJob, getDbtJob, getDbtTopics, initDbtJobTables, runDbtJob } from "./projects/dbt/dbt_job_service";
import { generateLhFormatSlides, LH_FORMATS } from "./projects/dbt/lh_formats";
import type { LhFormatId } from "./projects/dbt/lh_formats";
import { generateSsSlideshow, generateSsTopicSeeds } from "./projects/dbt/ss_slideshow";
import { recommendSsSounds, resolveSoundAudio } from "./projects/dbt/ss_sounds";
import { generateMemeSlideshow } from "./projects/dbt/meme_slideshow";
import { getMemeAssets, startMemeAnalysis, editMemeLabels, selectMemeAssets } from "./projects/dbt/meme_assets";
import { generateSsBatch, SS_FORMATS } from "./projects/dbt/ss_batch";
import type { SsFormatId } from "./projects/dbt/ss_batch";
import { generateTheScriptSlideshow } from "./projects/dbt/the_script";
import { getAnchorImage, buildUGCSlide1Prompt } from "./common/prompt_utils";
import { ART_STYLES } from "./projects/dbt/art_styles";

const SERVER_ROOT = path.resolve(import.meta.dir, "..");
const PROJECT_ROOT = path.resolve(SERVER_ROOT, "..");
const DATA_DIR = path.join(SERVER_ROOT, "data");

const ANCHORS_DIR = path.join(DATA_DIR, "anchors");
if (!existsSync(ANCHORS_DIR)) {
    mkdirSync(ANCHORS_DIR, { recursive: true });
}

const DBT_REFERENCE_IMAGE_DIR = path.join(DATA_DIR, "reference-images", "dbt");

const DBT_CHARACTER_REFERENCE_PATHS: Record<string, { slide2: string[]; slide3: string[]; slide5: string[] }> = {
    hannahbpd: {
        slide2: [
            path.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide2_ref_2.png")
        ],
        slide3: [
            path.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide3_ref_2.png")
        ],
        slide5: [
            path.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide5_ref_1.png"),
            path.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd", "slide5_ref_2.png")
        ]
    }
};

function getDbtReferenceCharacterId(characterId?: string): string {
    if (!characterId || characterId === "kendra") {
        return "hannahbpd";
    }
    return characterId;
}

function getDbtReferenceDir(characterId?: string, flow = "weird_hack"): string {
    const normalizedFlow = flow === "weird_hack_v2" ? "weird_hack" : flow;
    return path.join(DBT_REFERENCE_IMAGE_DIR, getDbtReferenceCharacterId(characterId), normalizedFlow);
}

function getLegacyDbtReferenceDir(characterId?: string): string {
    return path.join(DBT_REFERENCE_IMAGE_DIR, getDbtReferenceCharacterId(characterId));
}

function getDbtStaticTemplateDir(characterId?: string, flow = "weird_hack"): string {
    const normalizedFlow = flow === "weird_hack_v2" ? "weird_hack" : flow;
    const flowDirName = normalizedFlow === "i_say_they_say" ? "I_feel" : normalizedFlow;
    return path.join(PROJECT_ROOT, "client", "assets", "dbt-templates", characterId || "hannahbpd", flowDirName);
}

function getDbtStaticSlidePath(characterId?: string, slideNumber = 1, flow = "weird_hack"): string {
    const normalizedCharacterId = characterId || "hannahbpd";
    const normalizedFlow = flow === "weird_hack_v2" ? "weird_hack_v2" : flow;

    if (slideNumber === 6) {
        return "assets/dbt-templates/cta_slide_template.jpg";
    }

    if (slideNumber === 1 && normalizedCharacterId === "kendra") {
        return "assets/dbt-templates/weidhackv2/custom-image-1775651626440.png";
    }

    return "slide1.png";
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
    const closer = opener === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let i = start; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            if (escaping) {
                escaping = false;
            } else if (char === "\\") {
                escaping = true;
            } else if (char === "\"") {
                inString = false;
            }
            continue;
        }

        if (char === "\"") {
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

function fallbackParseMetadataObject(value: string) {
    const text = extractBalancedJson(value) || stripMarkdownCodeFences(value);
    if (!text) return null;

    const titleMatch = text.match(/"title"\s*:\s*"([\s\S]*?)"\s*,\s*"description"\s*:/i);
    const descriptionMatch = text.match(/"description"\s*:\s*"([\s\S]*?)"\s*}\s*$/i);

    if (!titleMatch || !descriptionMatch) return null;

    const decodeField = (field: string) =>
        field
            .replace(/\\"/g, "\"")
            .replace(/\\r/g, "\r")
            .replace(/\\n/g, "\n")
            .replace(/\\\\/g, "\\")
            .trim();

    return {
        title: decodeField(titleMatch[1]),
        description: decodeField(descriptionMatch[1])
    };
}

function toClientAssetPath(fullPath: string): string {
    const relativePath = path.relative(path.join(PROJECT_ROOT, "client"), fullPath);
    return relativePath.split(path.sep).join("/");
}

function getRandomDbtSlide1TemplatePath(characterId?: string, flow = "weird_hack"): string | null {
    if (flow !== "three_tips") return null;

    const templateDir = getDbtStaticTemplateDir(characterId, flow);
    if (!existsSync(templateDir)) {
        return null;
    }

    try {
        const candidates = readdirSync(templateDir)
            .filter((fileName) => /^slide1_ref_\d+\.(png|jpe?g|webp)$/i.test(fileName))
            .map((fileName) => path.join(templateDir, fileName));
        const selected = getRandomItem(candidates);
        return selected ? toClientAssetPath(selected) : null;
    } catch (error) {
        console.warn(`[DBT Slide 1] Failed to resolve random static template for ${characterId || "hannahbpd"}:${flow}`, error);
        return null;
    }
}

function getRandomDbtClientReferencePath(characterId: string | undefined, flow: string, slideNumber: number): string | null {
    if (flow !== "three_tips") return null;

    const templateDir = getDbtStaticTemplateDir(characterId, flow);
    if (!existsSync(templateDir)) {
        return null;
    }

    try {
        const pattern = new RegExp(`^slide${slideNumber}_ref_\\d+\\.(png|jpe?g|webp)$`, "i");
        const candidates = readdirSync(templateDir)
            .filter((fileName) => pattern.test(fileName))
            .map((fileName) => path.join(templateDir, fileName));
        return getRandomItem(candidates);
    } catch (error) {
        console.warn(`[DBT Slide ${slideNumber}] Failed to resolve random client reference for ${characterId || "hannahbpd"}:${flow}`, error);
        return null;
    }
}

function getRandomDbtIFeelReferencePath(characterId?: string): string | null {
    const candidates = getDbtIFeelReferencePaths(characterId);
    return getRandomItem(candidates);
}

function getDbtIFeelReferencePaths(characterId?: string): string[] {
    const templateDir = getDbtStaticTemplateDir(characterId, "i_say_they_say");
    if (!existsSync(templateDir)) {
        return [];
    }

    try {
        return readdirSync(templateDir)
            .filter((fileName) => /\.(png|jpe?g|webp)$/i.test(fileName))
            .map((fileName) => path.join(templateDir, fileName));
    } catch (error) {
        console.warn(`[DBT I Feel] Failed to resolve random reference for ${characterId || "hannahbpd"}`, error);
        return [];
    }
}

function getMimeTypeForReferencePath(refPath: string): string {
    const ext = path.extname(refPath).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    return "image/png";
}

function loadFixedReferenceImages(refPaths: string[], logLabel: string): ReferenceImage[] {
    const references: ReferenceImage[] = [];

    for (const refPath of refPaths) {
        if (!existsSync(refPath)) {
            console.warn(`[${logLabel}] Reference image missing: ${refPath}`);
            continue;
        }

        try {
            references.push({
                data: readFileSync(refPath).toString("base64"),
                mimeType: getMimeTypeForReferencePath(refPath)
            });
        } catch (error) {
            console.warn(`[${logLabel}] Failed to load reference image ${refPath}:`, error);
        }
    }

    return references;
}

function parseDbtDualVoiceSlideText(slideText: string): { outside: string; inside: string } | null {
    const match = String(slideText || "").match(/^OUTSIDE:\s*([\s\S]*?)\n+\s*INSIDE:\s*([\s\S]*)$/i);
    if (!match) return null;

    const outside = String(match[1] || "").trim();
    const inside = String(match[2] || "").trim();
    if (!outside || !inside) return null;

    return { outside, inside };
}

function getDbtCharacterReferenceConfig(characterId?: string) {
    const normalizedCharacterId = getDbtReferenceCharacterId(characterId);
    return DBT_CHARACTER_REFERENCE_PATHS[normalizedCharacterId] || DBT_CHARACTER_REFERENCE_PATHS.hannahbpd;
}

function getRandomItem<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)] ?? null;
}

function getImageSizeForFlow(service?: string, flow?: string): "1K" | "4K" {
    if (service === "dbt") {
        return "1K";
    }
    return "4K";
}

function getSlide5ReferenceCandidates(referenceDir: string): string[] {
    if (!existsSync(referenceDir)) {
        return [];
    }

    try {
        return readdirSync(referenceDir)
            .filter((fileName) => /^slide5_ref_\d+\.(png|jpe?g|webp)$/i.test(fileName))
            .map((fileName) => path.join(referenceDir, fileName));
    } catch (error) {
        console.warn(`[DBT Slide 5] Failed to resolve random reference images in ${referenceDir}:`, error);
        return [];
    }
}

function getDbtPermissionV1SlideReferencePaths(characterId: string | undefined, slideNumber: number): string[] {
    if (slideNumber < 2 || slideNumber > 7) {
        return [];
    }

    const slideDir = path.join(
        getDbtReferenceDir(characterId || "hannahbpd", "permission_v1"),
        `slide${slideNumber}`
    );

    if (!existsSync(slideDir)) {
        return [];
    }

    try {
        return readdirSync(slideDir)
            .filter((fileName) => /\.(png|jpe?g|webp)$/i.test(fileName))
            .map((fileName) => path.join(slideDir, fileName));
    } catch (error) {
        console.warn(`[DBT Permission V1] Failed to resolve reference images in ${slideDir}:`, error);
        return [];
    }
}

function getDbtPermissionV1SlideReferences(characterId: string | undefined, slideNumber: number): ReferenceImage[] {
    const normalizedCharacterId = characterId || "hannahbpd";
    const refPaths = getDbtPermissionV1SlideReferencePaths(normalizedCharacterId, slideNumber);
    const randomRefPath = getRandomItem(refPaths);
    if (!randomRefPath) {
        return [];
    }
    return loadFixedReferenceImages([randomRefPath], `DBT Permission V1 Slide ${slideNumber}:${normalizedCharacterId}`);
}

function getHannahSlide5ReferencePaths(flow = "weird_hack"): string[] {
    const flowDir = getDbtReferenceDir("hannahbpd", flow);
    const legacyDir = getLegacyDbtReferenceDir("hannahbpd");
    const fallbackPaths = getDbtCharacterReferenceConfig("hannahbpd").slide5;

    const candidates = [
        ...getSlide5ReferenceCandidates(flowDir),
        ...getSlide5ReferenceCandidates(legacyDir)
    ];

    const randomReference = getRandomItem(candidates);
    return randomReference ? [randomReference] : fallbackPaths;
}

function getDbtSlide2References(characterId?: string, flow = "weird_hack"): ReferenceImage[] {
    const normalizedCharacterId = characterId || "hannahbpd";
    if (flow === "i_say_they_say") {
        const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
        return randomIFeelRef
            ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 2:${normalizedCharacterId}`)
            : [];
    }
    const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 2);
    if (randomClientRef) {
        return loadFixedReferenceImages([randomClientRef], `DBT Slide 2:${normalizedCharacterId}:${flow}`);
    }
    const config = getDbtCharacterReferenceConfig(normalizedCharacterId);
    const flowPath = path.join(getDbtReferenceDir(normalizedCharacterId, flow), "slide2.png");
    const refPaths = existsSync(flowPath) ? [flowPath] : config.slide2;
    return loadFixedReferenceImages(refPaths, `DBT Slide 2:${normalizedCharacterId}:${flow}`);
}

function getDbtSlide1References(characterId?: string, flow = "weird_hack"): ReferenceImage[] {
    const normalizedCharacterId = characterId || "hannahbpd";
    if (flow === "i_say_they_say") {
        const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
        return randomIFeelRef
            ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 1:${normalizedCharacterId}`)
            : [];
    }
    const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 1);
    if (randomClientRef) {
        return loadFixedReferenceImages([randomClientRef], `DBT Slide 1:${normalizedCharacterId}:${flow}`);
    }
    return [];
}

function getDbtSlide3References(characterId?: string, flow = "weird_hack"): ReferenceImage[] {
    const normalizedCharacterId = characterId || "hannahbpd";
    if (flow === "i_say_they_say") {
        const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
        return randomIFeelRef
            ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 3:${normalizedCharacterId}`)
            : [];
    }
    const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 3);
    if (randomClientRef) {
        return loadFixedReferenceImages([randomClientRef], `DBT Slide 3:${normalizedCharacterId}:${flow}`);
    }
    const config = getDbtCharacterReferenceConfig(normalizedCharacterId);
    const flowPath = path.join(getDbtReferenceDir(normalizedCharacterId, flow), "slide3.png");
    const refPaths = existsSync(flowPath) ? [flowPath] : config.slide3;
    return loadFixedReferenceImages(refPaths, `DBT Slide 3:${normalizedCharacterId}:${flow}`);
}

function getDbtSlide4References(characterId?: string, flow = "weird_hack"): ReferenceImage[] {
    const normalizedCharacterId = characterId || "hannahbpd";
    if (flow === "i_say_they_say") {
        const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
        return randomIFeelRef
            ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 4:${normalizedCharacterId}`)
            : [];
    }
    const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 4);
    if (randomClientRef) {
        return loadFixedReferenceImages([randomClientRef], `DBT Slide 4:${normalizedCharacterId}:${flow}`);
    }
    return [];
}

function getDbtSlide5References(characterId?: string, flow = "weird_hack"): ReferenceImage[] {
    const normalizedCharacterId = characterId || "hannahbpd";
    if (flow === "i_say_they_say") {
        const randomIFeelRef = getRandomDbtIFeelReferencePath(normalizedCharacterId);
        return randomIFeelRef
            ? loadFixedReferenceImages([randomIFeelRef], `DBT I Feel Slide 5:${normalizedCharacterId}`)
            : [];
    }
    const randomClientRef = getRandomDbtClientReferencePath(normalizedCharacterId, flow, 5);
    if (randomClientRef) {
        return loadFixedReferenceImages([randomClientRef], `DBT Slide 5:${normalizedCharacterId}:${flow}`);
    }
    const config = getDbtCharacterReferenceConfig(normalizedCharacterId);
    const flowDir = getDbtReferenceDir(normalizedCharacterId, flow);
    const flowPath = path.join(flowDir, "slide5.png");
    const slide5Paths = normalizedCharacterId === "hannahbpd"
        ? getHannahSlide5ReferencePaths(flow)
        : (existsSync(flowPath) ? [flowPath] : config.slide5);

    return loadFixedReferenceImages(slide5Paths, `DBT Slide 5:${normalizedCharacterId}:${flow}`);
}

const DBT_THREE_TIPS_WOMAN_DESCRIPTION = "Woman specs: 170cm tall, brown long hair and 21 years old.";
const DBT_THREE_TIPS_FIXED_PROMPT_PREFIX = "Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background.";
const DBT_THREE_TIPS_DEGRADED_PHONE_RULE = "CRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.";
const DBT_THREE_TIPS_SHARED_FIXED_PROMPT = `${DBT_THREE_TIPS_FIXED_PROMPT_PREFIX}\n\n${DBT_THREE_TIPS_DEGRADED_PHONE_RULE}`;
const DBT_I_FEEL_SHARED_FIXED_PROMPT = `Two figures as a couple, man and woman, both mid-20s. The painting must feel clearly 19th century, and the couple should look like they are from the 19th century too. Emotional dynamic: one person says "[outside voice text]" while the other feels "[inside voice text]".
The figures should not illustrate the text literally - capture the emotional distance between them.
Painting: cracked varnish, impasto brushstrokes, muted dark warm tones, dark vignetting, canvas texture visible.

Make the painting look like the physical painting was scanned in with a super low budget scanner and therefore has a super bad visual quality. No frame visible. No text in image.`;

function buildDbtIFeelPrompt(slideText: string, slideNumber?: number): string {
    const dualVoice = parseDbtDualVoiceSlideText(slideText);
    const outside = dualVoice?.outside || "[outside voice text]";
    const inside = dualVoice?.inside || "[inside voice text]";

    return `Two figures as a couple, man and woman, both mid-20s. The painting must feel clearly 19th century, and the couple should look like they are from the 19th century too. Emotional dynamic: one person says "${outside}" while the other feels "${inside}".
The figures should not illustrate the text literally - capture the emotional distance between them.
Painting: cracked varnish, impasto brushstrokes, muted dark warm tones, dark vignetting, canvas texture visible.

Make the painting look like the physical painting was scanned in with a super low budget scanner and therefore has a super bad visual quality. No frame visible. No text in image.`;
}

function getDbtFixedSlide1Prompt(flow = "weird_hack"): string | null {
    if (flow === "i_say_they_say") {
        return DBT_I_FEEL_SHARED_FIXED_PROMPT;
    }
    if (flow === "three_tips") {
        return "Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background. Make sure the image contains an astonishing, amazing and real looking sky. Dont overexxagerate the look of the sky tho.\n\nCRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.";
    }
    return null;
}

function getDbtFixedSlide2Prompt(characterId?: string, flow = "weird_hack"): string {
    if (flow === "i_say_they_say") {
        return DBT_I_FEEL_SHARED_FIXED_PROMPT;
    }
    if (flow === "three_tips") {
        return DBT_THREE_TIPS_SHARED_FIXED_PROMPT;
    }
    const basePrompt = "Create another version of the reference image with the same foggy vibe and same blurry image filter, but in a different dark setting. No face visible of person in the image, only shot from a side angle or from behind. Person should hold a cigarette, not a vape. Candid iPhone 12 shot. No text in image. Same medium quality, dark authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.";
    return basePrompt;
}

function getDbtFixedSlide3Prompt(characterId?: string, flow = "weird_hack"): string {
    if (flow === "i_say_they_say") {
        return DBT_I_FEEL_SHARED_FIXED_PROMPT;
    }
    if (flow === "three_tips") {
        return "Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background. Add some real asthetic to the image to make it look super nice for the viewers eyes.\n\nCRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.";
    }
    const basePrompt = "Create another version of the reference image with the same vibe but in different dark rainy setting. It should rain. Candid iPhone 12 shot. No text in image.";
    return basePrompt;
}

function getDbtFixedSlide4Prompt(flow = "weird_hack"): string | null {
    if (flow === "i_say_they_say") {
        return DBT_I_FEEL_SHARED_FIXED_PROMPT;
    }
    if (flow === "three_tips") {
        return "Create another version of the reference image with the same vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background. Add some real asthetic to the image to make it look super nice for the viewers eyes.\n\nCRITICAL - the image must look like a degraded phone photo: heavily underexposed and crushed shadows, strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look as if taken on an old iPhone in poor light. NOT a clean or professional photo. The image should look almost too dark and slightly out of focus - like someone accidentally took it at night.";
    }
    return null;
}

function getDbtFixedSlide5Prompt(characterId?: string, flow = "weird_hack"): string | null {
    if (flow === "i_say_they_say") {
        return DBT_I_FEEL_SHARED_FIXED_PROMPT;
    }
    if (flow === "three_tips") {
        return "Create another version of the reference image with the same hopeful and uplifting, slightly brighter vibe and same blurry/washed image filter, but in a slightly different setting. No face visible of person in the image. Woman specs: 170cm tall, brown long hair and 21 years old. No flashlight and no bright lights, no blurred background.\n\nCRITICAL - keep the image aligned with the bright hopeful reference images. The scene should feel lighter, softer, and more open than Slides 1-4. The image must still look like a degraded phone photo: strong digital noise and grain throughout, lossy JPEG compression artifacts visible, slight motion blur from shaky hands, washed-out low-contrast look, imperfect focus, and candid old-iPhone quality. NOT a clean or professional photo. Keep it hopeful and slightly brighter, not dark night-heavy.";
    }
    if (!characterId || characterId === "hannahbpd" || characterId === "kendra") {
        return "Create another version of the reference image with the same vibe and image filter. No face visible of person in the image, only shot from a side angle or from behind when person is included. Only include a person when the reference image has one in it. Candid iPhone 12 shot. No text in image. Same medium quality, authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.";
    }
    return null;
}

function isTrustedFrontendOrigin(origin: string | null): boolean {
    if (!origin) return false;

    try {
        const { hostname, protocol } = new URL(origin);
        if (protocol !== "https:") return false;

        if (hostname === "tiktok-hook-finder.vercel.app") {
            return true;
        }

        return hostname.startsWith("tiktok-hook-finder-") && hostname.endsWith(".vercel.app");
    } catch {
        return false;
    }
}

const db = new Database(path.join(DATA_DIR, "hooks.db"));
initDbtJobTables(db);

// (Moved to common/prompt_utils.ts)
const { file } = Bun;

// Robust API Key loading
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let KIMI_API_KEY = process.env.KIMI_API_KEY;
let SCRAPE_CREATORS_API_KEY = process.env.SCRAPE_CREATORS_API_KEY;
let API_KEYS_RAW = process.env.API_KEYS;
let KIMI_API_BASE = process.env.KIMI_API_BASE || "https://api.kimi.com/coding/v1";
let KIMI_DEFAULT_MODEL = process.env.KIMI_MODEL || "k3";

if (!ANTHROPIC_API_KEY || !OPENAI_API_KEY || !KIMI_API_KEY || !API_KEYS_RAW || !SCRAPE_CREATORS_API_KEY) {
    console.log("Ã¢Å¡Â Ã¯Â¸Â Keys not found in process.env, attempting manual load...");
    async function loadEnv(pathStr: string) {
        try {
            if (!existsSync(pathStr)) return;
            const envText = await file(pathStr).text();
            console.log(`Ã°Å¸â€œÂ Loading keys from ${pathStr}`);
            const anthropicMatch = envText.match(/ANTHROPIC_API_KEY=(.*)/);
            const openaiMatch = envText.match(/OPENAI_API_KEY=(.*)/);
            const kimiMatch = envText.match(/KIMI_API_KEY=(.*)/);
            const kimiBaseMatch = envText.match(/KIMI_API_BASE=(.*)/);
            const kimiModelMatch = envText.match(/KIMI_MODEL=(.*)/);
            const apiKeysMatch = envText.match(/API_KEYS=(.*)/);
            const scrapeMatch = envText.match(/SCRAPE_CREATORS_API_KEY=(.*)/);

            if (anthropicMatch && anthropicMatch[1]) ANTHROPIC_API_KEY = anthropicMatch[1].trim();
            if (openaiMatch && openaiMatch[1]) OPENAI_API_KEY = openaiMatch[1].trim();
            if (kimiMatch && kimiMatch[1]) KIMI_API_KEY = kimiMatch[1].trim();
            if (kimiBaseMatch && kimiBaseMatch[1]) KIMI_API_BASE = kimiBaseMatch[1].trim();
            if (kimiModelMatch && kimiModelMatch[1]) KIMI_DEFAULT_MODEL = kimiModelMatch[1].trim();
            if (apiKeysMatch && apiKeysMatch[1]) API_KEYS_RAW = apiKeysMatch[1].trim();
            if (scrapeMatch && scrapeMatch[1]) SCRAPE_CREATORS_API_KEY = scrapeMatch[1].trim();
        } catch (e) {
            console.error(`Ã¢ÂÅ’ Failed to load ${pathStr}`);
        }
    }

    // Try loading from stable project-relative locations
    await loadEnv(path.join(PROJECT_ROOT, ".env"));
    await loadEnv(path.join(SERVER_ROOT, ".env"));
}

const PORT = parseInt(process.env.PORT || "3001", 10); // Railway/hosted platforms inject PORT
const IMAGE_GEN_CONCURRENCY = Math.max(1, Math.min(4, parseInt(process.env.IMAGE_GEN_CONCURRENCY || "2", 10) || 2));
const API_KEYS = new Set(
    String(API_KEYS_RAW || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
);

console.log(`Ã°Å¸Å¡â‚¬ Hook Bridge API starting on http://localhost:${PORT}`);
console.log(`Ã°Å¸â€œâ€š Working Directory: ${process.cwd()}`);
console.log(`Ã°Å¸â€â€˜ Anthropic Key: ${!!ANTHROPIC_API_KEY}`);
console.log(`Ã°Å¸â€â€˜ OpenAI Key: ${!!OPENAI_API_KEY}`);

// Pre-load embeddings at startup
try {
    const embeddings = loadEmbeddings();
    console.log(`Ã°Å¸Â§Â  Semantic search ready with ${embeddings.length} hooks`);
} catch (e) {
    console.log("Ã¢Å¡Â Ã¯Â¸Â Semantic search not available, falling back to archetype-based");
}

try {
    const test = db.query("SELECT 1").get();
    console.log(`Ã¢Å“â€¦ Database connected: ${JSON.stringify(test)}`);
} catch (e) {
    console.error(`Ã¢ÂÅ’ Database connection failed:`, e);
}

// ---- Local photo library ------------------------------------------------
// Folders of ready-made photos that live outside the repo (so 100s of MB of
// images never enter git). Override with IMAGE_LIBRARY_ROOT in server/.env.
const IMAGE_LIBRARY_ROOT = process.env.IMAGE_LIBRARY_ROOT
    || "G:/Projects/DBT-Mind Tiktok";

const LIBRARY_SKIP_DIRS = new Set([".git", "node_modules", ".venv", "__pycache__", "Videos"]);

const LIBRARY_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function isLibraryImage(name: string): boolean {
    return LIBRARY_IMAGE_EXT.has(path.extname(name).toLowerCase());
}

// Any subfolder (up to 3 levels deep) that directly contains images becomes a set.
function listImageLibrarySets(): Array<{ id: string; label: string; count: number }> {
    const sets: Array<{ id: string; label: string; count: number }> = [];
    if (!existsSync(IMAGE_LIBRARY_ROOT)) return sets;

    const walk = (dir: string, rel: string, depth: number) => {
        if (depth > 5 || sets.length >= 150) return;
        let entries: string[] = [];
        try { entries = readdirSync(dir); } catch { return; }

        const images = entries.filter(isLibraryImage);
        if (images.length > 0 && rel) {
            sets.push({ id: rel, label: rel.replace(/[\\/]/g, " · "), count: images.length });
        }
        for (const entry of entries) {
            if (entry.startsWith(".") || LIBRARY_SKIP_DIRS.has(entry)) continue;
            const full = path.join(dir, entry);
            let isDir = false;
            try { isDir = statSync(full).isDirectory(); } catch { continue; }
            if (isDir) walk(full, rel ? `${rel}/${entry}` : entry, depth + 1);
        }
    };

    walk(IMAGE_LIBRARY_ROOT, "", 0);
    return sets.sort((a, b) => a.label.localeCompare(b.label));
}

// Resolve a set id to an absolute dir, refusing anything outside the library root.
function resolveImageLibraryDir(setId: string): string | null {
    const cleaned = String(setId || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!cleaned || cleaned.includes("..")) return null;
    const full = path.resolve(IMAGE_LIBRARY_ROOT, cleaned);
    const root = path.resolve(IMAGE_LIBRARY_ROOT);
    if (!full.startsWith(root)) return null;
    if (!existsSync(full)) return null;
    try { if (!statSync(full).isDirectory()) return null; } catch { return null; }
    return full;
}

// Load UGC Base Prompts for realistic Slide 1 generation
let ugcBasePrompts: any = null;
const SYP_DIR = path.join(DATA_DIR, "frameworks", "SaveYourPet");
const DBT_DIR = path.join(DATA_DIR, "frameworks", "DBT-Mind");

try {
    const ugcBasePath = path.join(DATA_DIR, "ugc_base_prompts.json");
    if (existsSync(ugcBasePath)) {
        ugcBasePrompts = JSON.parse(readFileSync(ugcBasePath, 'utf-8'));
        console.log(`Ã°Å¸â€œÂ¸ UGC Base Prompts loaded with ${Object.keys(ugcBasePrompts.settings).length} settings`);
    }
} catch (e) {
    console.log("Ã¢Å¡Â Ã¯Â¸Â UGC Base Prompts not loaded, using legacy prompts");
}

// (Moved to common/prompt_utils.ts)


function formatDbtSlide1Hook(rawHook: string, fallbackProblem = "this pattern"): string {
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
}


// buildUGCSlide1Prompt now returns a string directly.

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        console.log(`[Request] ${req.method} ${url.pathname}`);

        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
        };

        // Handle OPTIONS request
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // Helper to send JSON responses with CORS
        const sendJSON = (data: any, status = 200) => {
            const resp = Response.json(data, { status });
            Object.entries(corsHeaders).forEach(([k, v]) => resp.headers.set(k, v));
            return resp;
        };

        const cleanPath = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
        const method = req.method;

        // Healthcheck endpoint for hosting providers (kept unauthenticated intentionally)
        if (cleanPath === "/health" && method === "GET") {
            return sendJSON({ ok: true, service: "hook-bridge-api" });
        }

        // Optional API key auth for public deployments
        if (API_KEYS.size > 0) {
            const originHeader = req.headers.get("Origin") || req.headers.get("origin");
            const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
            const xApiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key") || "";
            const bearer = authHeader.toLowerCase().startsWith("bearer ")
                ? authHeader.slice(7).trim()
                : "";
            // <img src> and other tag-based loads cannot set headers, so the key may
            // also arrive as a query param (used by the photo-library thumbnails).
            const queryKey = url.searchParams.get("key") || "";
            const provided = (xApiKey || bearer || queryKey).trim();
            const isTrustedOrigin = isTrustedFrontendOrigin(originHeader);
            if (!API_KEYS.has(provided) && !isTrustedOrigin) {
                return sendJSON({ error: "Unauthorized" }, 401);
            }
        }
        console.log(`[Router] ${method} ${url.pathname} -> Cleaned Path: ${cleanPath}`);

        // GET /dbt/topics - list supported DBT topic names for fixed selection
        if (cleanPath === "/dbt/topics" && method === "GET") {
            return sendJSON({ topics: getDbtTopics() });
        }
        // POST /dbt/jobs - create async DBT-Mind post generation job
        else if (cleanPath === "/dbt/jobs" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API Key missing");
                const input = await req.json() as any;
                const wantsImages = input?.generateImages !== false;
                if (wantsImages && !OPENAI_API_KEY) throw new Error("OpenAI API Key missing for image generation");

                const created = createDbtJob(db, input || {});

                void runDbtJob(db, created.id, {
                    anthropicApiKey: ANTHROPIC_API_KEY!,
                    openaiApiKey: OPENAI_API_KEY || undefined
                });

                return sendJSON({
                    job_id: created.id,
                    status: created.status
                }, 202);
            } catch (e) {
                return sendJSON({ error: "DBT job creation failed", details: String(e) }, 400);
            }
        }
        // GET /dbt/jobs/:id - fetch job state and artifacts
        else if (cleanPath.startsWith("/dbt/jobs/") && method === "GET") {
            try {
                const jobId = decodeURIComponent(cleanPath.replace("/dbt/jobs/", ""));
                if (!jobId) return sendJSON({ error: "job id is required" }, 400);

                const job = getDbtJob(db, jobId);
                if (!job) return sendJSON({ error: "job not found", job_id: jobId }, 404);

                return sendJSON(job);
            } catch (e) {
                return sendJSON({ error: "DBT job fetch failed", details: String(e) }, 500);
            }
        }
        // GET /hooks - Get viral hooks from the DB
        if (cleanPath === "/hooks" && method === "GET") {
            try {
                const niche = url.searchParams.get("niche");
                const archetype = url.searchParams.get("archetype");
                const limit = parseInt(url.searchParams.get("limit") || "10");

                let query = "SELECT hook_text, view_count, archetype, niche, video_url FROM viral_hooks";
                const params: any[] = [];

                if (niche || archetype) {
                    query += " WHERE";
                    if (niche) {
                        query += " niche LIKE ?";
                        params.push(`%${niche}%`);
                    }
                    if (niche && archetype) query += " AND";
                    if (archetype) {
                        query += " archetype = ?";
                        params.push(archetype);
                    }
                }

                query += " ORDER BY view_count DESC LIMIT ?";
                params.push(limit);

                const hooks = db.query(query).all(...params);
                return sendJSON(hooks);
            } catch (e) {
                return sendJSON({ error: "Fetch failed", details: String(e) }, 500);
            }
        }
        // POST /generate - Generate a new hook
        else if (cleanPath === "/generate" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const body = await req.json() as any;
                const { topic } = body;
                console.log(`[Generate] topic: ${topic}`);
                return sendJSON({ hooks: ["Test Hook 1", "Test Hook 2", "Test Hook 3"] });
            } catch (e) {
                return sendJSON({ error: "Generation failed", details: String(e) }, 500);
            }
        }
        // POST /improve-hook or /improve-hooks - Banger Hooks Generator (Quick Hook Improver)
        else if ((cleanPath === "/improve-hook" || cleanPath === "/improve-hooks") && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const { slides, slides_text, service, slideType, language } = await req.json() as any;
                const isDbtStoryFlow =
                    service === 'dbt' &&
                    (slideType === 'story_telling_bf' || slideType === 'story_telling_gf' || slideType === 'story_telling_gf_v2');
                const slideList = Array.isArray(slides) ? slides.map((s: any) => String(s || "").trim()) : [];
                const hookContextSlides = isDbtStoryFlow ? slideList.slice(1) : slideList;
                const storyHookContextText = hookContextSlides
                    .map((slide: string, index: number) => `Slide ${index + 2}: ${slide}`)
                    .join('\n');
                const fullSlideText = hookContextSlides.length > 0
                    ? (isDbtStoryFlow ? storyHookContextText : hookContextSlides.join('\n'))
                    : (slides_text || "");

                if (!fullSlideText.trim()) {
                    return sendJSON({ error: "Slides text is required" }, 400);
                }

                const isDbt = service === 'dbt';
                console.log(`[Banger Hooks] Generating for: ${fullSlideText.substring(0, 50)}... (Service: ${service || 'unknown'})`);

                let hookRequirementsPrompt = "";
                let systemPrompt = "";

                if (isDbtStoryFlow) {
                    const hookResult = slideType === 'story_telling_gf_v2'
                        ? await generateConvertedSkepticHooks({
                            slides: hookContextSlides,
                            slideType,
                            ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
                            language: language === 'de' ? 'de' : 'en'
                        })
                        : await generateStoryTellingHooks({
                            slides: hookContextSlides,
                            slideType,
                            ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
                            language: language === 'de' ? 'de' : 'en'
                        });

                    if (!hookResult.hooks.length) {
                        return sendJSON({ error: "Failed to generate hooks" }, 500);
                    }

                    return sendJSON({
                        hooks: hookResult.hooks,
                        hook_style_examples: hookResult.styleExamples,
                        hook_style_influences: hookResult.styleInfluences
                    });
                } else if (isDbt) {
                    hookRequirementsPrompt = `For this slide post, create an ABSOLUTE VIRAL BANGER HOOK, which will replace the current cheap slide 1 hook. Give me three options. The post will be in the BPD niche on Tiktok. The hook must create ABSOLUTE curiosity within the first 3 seconds and must be like a cliffhanger is a good series. Use the best fitting option from this framework:

Here are the 4 hook frameworks that consistently trigger all 6 behaviors: 

The Forbidden Knowledge Hook "Secrets I learned working at [company]" "What [industry] doesn't want you to know" "I got fired for sharing this" Why it works: Creates instant curiosity gap. Viewer HAS to know the secret. High completion rate because they're waiting for the reveal.

The Specific Number Hook "5 ways to [outcome] that actually work" "I made $4,431 last week doing this" "3 things I wish I knew before [experience]" Why it works: Numbers create concrete expectations. Viewer knows exactly what they're getting. Easy to consume. High save rate.

The Pattern Interrupt Hook "This is wrong but it works" "I shouldn't be telling you this" "Everyone does X but here's what actually happens" Why it works: Challenges existing beliefs. Creates cognitive dissonance that demands resolution. High comment rate because people want to argue or agree.

The Transformation Hook "How I went from [bad state] to [good state]" "6 months ago I was [struggle]. Now [success]" "The thing that changed everything for me"`;

                    systemPrompt = `You are a viral TikTok hook writer for the BPD niche. Your task is to generate 3 viral banger hooks in JSON format.
CRITICAL RULES:
1. Return ONLY a JSON array of 3 strings: ["hook 1", "hook 2", "hook 3"].
2. Use ONLY the slide content provided in the user message for context.
3. Lowercase only. No exclamation points.
4. Each hook must follow one of the 4 frameworks provided (Forbidden Knowledge, Specific Number, Pattern Interrupt, or Transformation).
5. Max 15 words per hook.`;
                } else {
                    // Fallback or SYP prompt
                    hookRequirementsPrompt = `You are generating TikTok hooks for a viral account. Your job is to create scroll-stopping hooks.
                        
THE GOAL: Make the viewer stop scrolling and immediately want to see the next slide.

HOOK RULES:
1. MAX 15 WORDS Ã¢â‚¬â€ shorter is almost always better
2. NO QUESTIONS Ã¢â‚¬â€ statements hit harder than questions
3. NO EMOJIS Ã¢â‚¬â€ breaks the tone
4. LOWERCASE Ã¢â‚¬â€ feels intimate, not performative`;

                    systemPrompt = `You are a viral TikTok hook writer. Your task is to generate 3 hooks in JSON format.
CRITICAL RULES:
1. Return ONLY a JSON array of 3 strings: ["hook 1", "hook 2", "hook 3"].
2. Use ONLY the slide content provided in the user message for context.
3. Strictly follow the "NO FILLER WORDS", "MAX 15 WORDS", and "LOWERCASE" rules.`;
                }

                const userPrompt = isDbtStoryFlow
                    ? `Story post structure:
Slide 1: [your hook comes here]
${fullSlideText}

${hookRequirementsPrompt}`
                    : `Slide Content: 
${fullSlideText}

${hookRequirementsPrompt}`;

                const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 500,
                        system: systemPrompt,
                        messages: [{ role: 'user', content: userPrompt }]
                    })
                });

                if (!claudeResponse.ok) {
                    const errorText = await claudeResponse.text();
                    console.error("[Banger Hooks] Anthropic API Error:", errorText);
                    return sendJSON({ error: "Anthropic API Error", details: errorText }, claudeResponse.status);
                }

                const rawData = await claudeResponse.json() as any;
                const resultText = rawData.content?.[0]?.text || '';

                if (!resultText) {
                    return sendJSON({ error: "Empty AI response" }, 500);
                }

                // Extract JSON array
                let hooks: string[] = [];
                try {
                    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        hooks = JSON.parse(jsonMatch[0]);
                    } else {
                        hooks = JSON.parse(resultText);
                    }
                } catch (parseErr) {
                    const matches = resultText.match(/"([^"]+)"/g);
                    if (matches) {
                        hooks = matches.slice(0, 3).map((m: string) => m.replace(/"/g, ''));
                    }
                }

                if (!hooks || hooks.length === 0) {
                    return sendJSON({ error: "Failed to generate hooks" }, 500);
                }

                const normalizedHooks = hooks
                    .map((h: string) => String(h || "").trim().replace(/^slide\s*1\s*:\s*/i, ''))
                    .slice(0, 3);
                const finalHooks = isDbtStoryFlow
                    ? normalizedHooks
                    : isDbt
                        ? normalizedHooks.map((h: string) => formatDbtSlide1Hook(h))
                        : normalizedHooks.map((h: string) => h.toLowerCase());

                return sendJSON({
                    hooks: finalHooks
                });
            } catch (e) {
                console.error("[Banger Hooks] Error:", e);
                return sendJSON({ error: "Hook generation failed", details: String(e) }, 500);
            }
        }
        // POST /improve-app-mention - Improve the app mention slide
        else if (cleanPath === "/improve-app-mention" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const { slides, service } = await req.json() as any;
                const fullSlideText = Array.isArray(slides) ? slides.join('\n') : "";

                if (!fullSlideText.trim()) {
                    return sendJSON({ error: "Slides text is required" }, 400);
                }

                console.log(`[App Mention] Improving for: ${fullSlideText.substring(0, 50)}...`);

                const systemPrompt = `You are an expert in viral TikTok content for the mental health niche, specifically BPD/DBT communities. Your task is to seamlessly integrate a DBT app mention into an emotional slideshow post without breaking the raw, confessional tone that makes these posts resonate.
Context:
- The slide post is marketing a DBT app, but should never feel like marketing
- The goal is to make viewers curious enough to comment "what app?"
- The target audience is people with BPD or emotional regulation struggles who scroll TikTok for relatable content

The Problem You're Solving:
The final slide often breaks the emotional flow by shifting into "solution mode" or "recommendation mode." This kills the authenticity that made the earlier slides hit. Your job is to fix this.

Rules for the Integrated Slide:
1. Maintain first-person confessional voice Ã¢â‚¬â€ The slide must sound like a whispered admission, not advice
2. Use "my dbt app" Ã¢â‚¬â€ Never "a dbt app" or "this dbt app I found." "My" signals personal ownership, like mentioning "my therapist" or "my journal"
3. Connect to earlier slide language Ã¢â‚¬â€ Reference a feeling, behavior, or phrase from the previous slides to create continuity
4. Show the action, don't explain the skill Ã¢â‚¬â€ Instead of "it has this skill called opposite action," say what you actually do: "do the opposite of what my brain wants"
5. Keep it imperfect Ã¢â‚¬â€ Avoid toxic positivity. Words like "sometimes," "trying to," or "it's hard but" maintain honesty
6. No CTA energy Ã¢â‚¬â€ Never "you should try" or "it really helps." The slide is about you, not them
7. Preserve the rhythm Ã¢â‚¬â€ Match the sentence length and cadence of the other slides. Short lines. Breath between thoughts.
8. Lowercase only. No exclamation points.
9. Return ONLY a JSON array of 3 strings: ["option 1", "option 2", "option 3"].`;

                const userPrompt = `Slide Content: 
${fullSlideText}

Based on the context above, generate three options for the integrated app mention slide.`;

                const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 500,
                        system: systemPrompt,
                        messages: [{ role: 'user', content: userPrompt }]
                    })
                });

                if (!claudeResponse.ok) {
                    const errorText = await claudeResponse.text();
                    console.error("[App Mention] Anthropic API Error:", errorText);
                    return sendJSON({ error: "Anthropic API Error", details: errorText }, claudeResponse.status);
                }

                const rawData = await claudeResponse.json() as any;
                const resultText = rawData.content?.[0]?.text || '';

                if (!resultText) {
                    return sendJSON({ error: "Empty AI response" }, 500);
                }

                // Extract JSON array
                let mentions: string[] = [];
                try {
                    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        mentions = JSON.parse(jsonMatch[0]);
                    } else {
                        mentions = JSON.parse(resultText);
                    }
                } catch (parseErr) {
                    const matches = resultText.match(/"([^"]+)"/g);
                    if (matches) {
                        mentions = matches.slice(0, 3).map((m: string) => m.replace(/"/g, ''));
                    }
                }

                return sendJSON({
                    mentions: mentions.map(m => m.toLowerCase()).slice(0, 3)
                });
            } catch (e) {
                console.error("[App Mention] Error:", e);
                return sendJSON({ error: "App mention improvement failed", details: String(e) }, 500);
            }
        }
        // GET /personas - Get available character personas with anchor status
        else if (cleanPath === "/personas" && method === "GET") {
            try {
                const projectFilter = url.searchParams.get("project"); // 'syp' or 'dbt'
                const personasPath = path.join(DATA_DIR, "personas.json");
                const personasData = JSON.parse(readFileSync(personasPath, 'utf-8'));

                let personas = personasData.personas;
                if (projectFilter) {
                    personas = personas.filter((p: any) =>
                        p.supported_projects && p.supported_projects.includes(projectFilter)
                    );
                }

                const personasWithAnchors = personas.map((p: any) => {
                    const anchor = getAnchorImage(p.id, ANCHORS_DIR);
                    return {
                        ...p,
                        hasAnchor: !!anchor,
                        anchorData: anchor ? anchor.data : null
                    };
                });

                return sendJSON({ personas: personasWithAnchors });
            } catch (e) {
                return sendJSON({ error: "Failed to load personas" }, 500);
            }
        }
        // GET /syp-profiles - Get available SYP character profiles with anchor status
        else if (cleanPath === "/syp-profiles" && method === "GET") {
            try {
                const profilesPath = path.join(DATA_DIR, "syp_profiles.json");
                let profiles = [];

                if (existsSync(profilesPath)) {
                    const profilesData = JSON.parse(readFileSync(profilesPath, 'utf-8'));
                    profiles = profilesData.profiles || [];
                } else {
                    // Default SYP profiles if file doesn't exist
                    profiles = [
                        { id: 'lisa_milo', name: 'Lisa & Milo (Hund)', type: 'dog' },
                        { id: 'anna_simba', name: 'Anna & Simba (Katze)', type: 'cat' },
                        { id: 'sarah_luna', name: 'Sarah & Luna (Katze)', type: 'cat' },
                        { id: 'julia_balu', name: 'Julia & Balu (Hund)', type: 'dog' }
                    ];
                }

                const profilesWithAnchor = profiles.map((p: any) => {
                    const anchor = getAnchorImage(p.id, ANCHORS_DIR);
                    return {
                        ...p,
                        hasAnchor: !!anchor,
                        anchorData: anchor ? anchor.data : null
                    };
                });

                return sendJSON({ profiles: profilesWithAnchor });
            } catch (e) {
                console.error("[SYP Profiles] Error:", e);
                return sendJSON({ error: "Failed to load SYP profiles" }, 500);
            }
        }
        // POST /set-persona-anchor - Pin an image as character reference
        else if (cleanPath === "/set-persona-anchor" && method === "POST") {
            try {
                const { persona_id, image_data } = await req.json() as any;
                if (!persona_id || !image_data) return sendJSON({ error: "Missing data" }, 400);

                const filePath = path.join(ANCHORS_DIR, `${persona_id}.png`);
                const base64Data = image_data.replace(/^data:image\/\w+;base64,/, "");
                writeFileSync(filePath, Buffer.from(base64Data, "base64"));

                console.log(`[Anchor] Saved character anchor for ${persona_id}`);
                return sendJSON({ success: true, message: "Anchor saved" });
            } catch (e) {
                return sendJSON({ error: "Failed to save anchor", details: String(e) }, 500);
            }
        }
        // DELETE /persona-anchor - Remove a character reference
        else if (cleanPath === "/persona-anchor" && method === "DELETE") {
            try {
                const persona_id = url.searchParams.get("persona_id");
                console.log(`[Anchor] Received DELETE request for persona_id: ${persona_id}`);
                if (!persona_id) return sendJSON({ error: "Missing ID" }, 400);

                const filePath = path.join(ANCHORS_DIR, `${persona_id}.png`);
                console.log(`[Anchor] Target file for deletion: ${filePath}`);
                if (existsSync(filePath)) {
                    unlinkSync(filePath);
                    console.log(`[Anchor] Successfully deleted anchor for ${persona_id}`);
                } else {
                    console.log(`[Anchor] Anchor file for ${persona_id} not found at ${filePath}`);
                }
                return sendJSON({ success: true, message: "Anchor removed" });
            } catch (e) {
                console.error("[Anchor] Failed to remove anchor:", e);
                return sendJSON({ error: "Failed to remove anchor", details: String(e) }, 500);
            }
        }
        // POST /generate-image-prompts - Generate image prompts for slides based on character
        else if (cleanPath === "/generate-image-prompts" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const { slides, character_id, character, setting_override, framing, theme, partner_anchor, service, brandingMode, artStyle, flow } = await req.json() as any;
                const resolvedCharacterId = character_id || character;
                const effectiveArtStyle = service === 'dbt' ? 'symbolic' : artStyle;
                const effectiveFlow = service === 'dbt' ? (flow || 'weird_hack') : flow;

                if (!slides || !Array.isArray(slides) || slides.length === 0) {
                    return sendJSON({ error: "Slides array is required" }, 400);
                }

                // Determine if this is SYP or DBT project based on service parameter
                const isSypProject = service === 'syp';
                const isDbtProject = service === 'dbt';

                // Load personas
                const personasPath = path.join(DATA_DIR, "personas.json");
                const personasData = JSON.parse(readFileSync(personasPath, 'utf-8'));

                // Map SYP profile IDs to correct persona based on profile
                // lisa_milo uses the new 'lisa' persona, cats use 'luna', other dogs use 'mia'
                let effectiveCharacterId = resolvedCharacterId;
                if (isSypProject && resolvedCharacterId) {
                    const sypProfileMapping: { [key: string]: { personaId: string; type: string; petDesc: string } } = {
                        'lisa_milo': { personaId: 'lisa', type: 'dog', petDesc: 'fluffy golden retriever named Milo looking curious and playful' },
                        'anna_simba': { personaId: 'luna', type: 'cat', petDesc: 'orange tabby cat named Simba looking regal and slightly judgy' },
                        'sarah_luna': { personaId: 'luna', type: 'cat', petDesc: 'elegant gray cat named Luna with piercing green eyes' },
                        'julia_balu': { personaId: 'mia', type: 'dog', petDesc: 'happy labrador named Balu with tongue out' }
                    };

                    const sypProfile = sypProfileMapping[resolvedCharacterId];
                    if (sypProfile) {
                        effectiveCharacterId = sypProfile.personaId;
                        console.log(`[Image Prompts] SYP profile '${resolvedCharacterId}' mapped to persona '${effectiveCharacterId}' (${sypProfile.type})`);
                    }
                }

                let persona = personasData.personas.find((p: any) => p.id === effectiveCharacterId) || personasData.personas[0];

                // Override pet description for SYP profiles to match the specific pet
                if (isSypProject && resolvedCharacterId) {
                    const sypProfiles: { [key: string]: { type: string; petDesc: string } } = {
                        'lisa_milo': { type: 'dog', petDesc: 'fluffy golden retriever named Milo looking curious and playful' },
                        'anna_simba': { type: 'cat', petDesc: 'orange tabby cat named Simba looking regal and slightly judgy' },
                        'sarah_luna': { type: 'cat', petDesc: 'elegant gray cat named Luna with piercing green eyes' },
                        'julia_balu': { type: 'dog', petDesc: 'happy labrador named Balu with tongue out' }
                    };
                    const sypProfile = sypProfiles[resolvedCharacterId];
                    if (sypProfile && persona.pet) {
                        // Create a copy with the correct pet for this SYP profile
                        persona = {
                            ...persona,
                            pet: {
                                type: sypProfile.type,
                                description: sypProfile.petDesc
                            }
                        };
                    }
                }

                // Load outfit/setting for SYP
                let selectedOutfit = null;
                let selectedSetting = null;
                if (isSypProject) {
                    try {
                        const outfitsPath = path.join(DATA_DIR, "syp_outfits.json");
                        if (existsSync(outfitsPath)) {
                            const outfitsData = JSON.parse(readFileSync(outfitsPath, 'utf-8'));
                            const outfits = outfitsData.outfits;
                            selectedOutfit = outfits[Math.floor(Math.random() * outfits.length)];
                            console.log(`[Image Prompts] Selected outfit: ${selectedOutfit.id} - ${selectedOutfit.name}`);
                        }

                        const settingsPath = path.join(DATA_DIR, "syp_settings.json");
                        if (existsSync(settingsPath)) {
                            const settingsData = JSON.parse(readFileSync(settingsPath, 'utf-8'));
                            const settings = settingsData.settings;
                            selectedSetting = settings[Math.floor(Math.random() * settings.length)];
                            console.log(`[Image Prompts] Selected setting: ${selectedSetting.id} - ${selectedSetting.name}`);
                        }
                    } catch (e) {
                        console.log('[Image Prompts] Error loading SYP extras:', e);
                    }
                }

                // Load scroll stoppers for variety
                const scrollStoppersPath = path.join(DATA_DIR, "scroll_stoppers.json");
                const scrollStoppers = JSON.parse(readFileSync(scrollStoppersPath, 'utf-8'));

                // Determine framing context for image generation (DBT-Mind only - SYP is always solo + pet)
                const friendFramings = ["watching_my_friend"];
                // Friend content is ONLY for DBT-Mind, never for SYP
                const isFriendContent = !isSypProject && friendFramings.includes(framing);

                // If DBT project, we use a completely different system prompt (Classical Paintings)
                if (isDbtProject) {
                    const selectedArtStyle = (ART_STYLES[effectiveArtStyle] || ART_STYLES.symbolic) as any;
                    const isSymbolic = selectedArtStyle.id === 'symbolic';
                    const isWeirdHackFlow = effectiveFlow === 'weird_hack' || effectiveFlow === 'weird_hack_v2';
                    console.log(`[Image Prompts] Generating ${selectedArtStyle.name} prompts for DBT-Mind with ${slides.length} slides${isSymbolic ? ' (Symbolic Mode)' : ''}${isWeirdHackFlow ? ' (Weird Hack Flow)' : ''}`);

                    const normalizedSlides = slides.map((s: any) => String(s || '').trim());
                    const staticSlides: Record<number, string> = {};
                    const usesStaticDbtSlide1Template = effectiveFlow === "weird_hack" || effectiveFlow === "weird_hack_v2";
                    const usesStaticDbtSlide6Template = effectiveFlow === "weird_hack";
                    if (isSymbolic && usesStaticDbtSlide1Template) {
                        staticSlides[1] = getDbtStaticSlidePath(resolvedCharacterId, 1, effectiveFlow) || 'slide1.png';
                    }
                    if (isDbtProject && slides.length >= 6 && usesStaticDbtSlide6Template) staticSlides[6] = getDbtStaticSlidePath(resolvedCharacterId, 6, effectiveFlow);

                    if (effectiveFlow === "weird_hack_v2") {
                        const weirdHackV2Prompts = await generateWeirdHackV2ImagePrompts(normalizedSlides, ANTHROPIC_API_KEY!);
                        const parsed: Record<string, string> = {};

                        if (weirdHackV2Prompts.slide2) parsed.image2 = weirdHackV2Prompts.slide2;
                        if (weirdHackV2Prompts.slide3) parsed.image3 = weirdHackV2Prompts.slide3;
                        if (weirdHackV2Prompts.slide4) parsed.image4 = weirdHackV2Prompts.slide4;
                        if (weirdHackV2Prompts.slide5) parsed.image5 = weirdHackV2Prompts.slide5;
                        if (weirdHackV2Prompts.slide6) parsed.image6 = weirdHackV2Prompts.slide6;
                        if (weirdHackV2Prompts.slide7) parsed.image7 = weirdHackV2Prompts.slide7;
                        if (weirdHackV2Prompts.slide8) parsed.image8 = weirdHackV2Prompts.slide8;

                        const prompts = normalizedSlides.map((_, index) => parsed[`image${index + 1}`] || null);

                        return sendJSON({
                            prompts: prompts,
                            image_prompts: parsed,
                            is_painting_style: false,
                            useStaticSlide1: isSymbolic && usesStaticDbtSlide1Template,
                            staticSlides: staticSlides
                        });
                    }

                    const parsed: Record<string, string> = {};
                    const fixedSlide1ReferencePrompt = getDbtFixedSlide1Prompt(effectiveFlow);
                    const fixedSlide2ReferencePrompt = getDbtFixedSlide2Prompt(resolvedCharacterId, effectiveFlow);
                    const fixedSlide3ReferencePrompt = getDbtFixedSlide3Prompt(resolvedCharacterId, effectiveFlow);
                    const fixedSlide4ReferencePrompt = getDbtFixedSlide4Prompt(effectiveFlow);
                    const fixedSlide5ReferencePrompt = getDbtFixedSlide5Prompt(resolvedCharacterId, effectiveFlow);

                    if (normalizedSlides.length >= 1 && fixedSlide1ReferencePrompt) {
                        parsed.image1 = fixedSlide1ReferencePrompt;
                    }
                    if (normalizedSlides.length >= 2) {
                        parsed.image2 = fixedSlide2ReferencePrompt;
                    }
                    if (normalizedSlides.length >= 3) {
                        parsed.image3 = fixedSlide3ReferencePrompt;
                    }
                    if (normalizedSlides.length >= 4 && fixedSlide4ReferencePrompt) {
                        parsed.image4 = fixedSlide4ReferencePrompt;
                    }
                    if (normalizedSlides.length >= 5 && fixedSlide5ReferencePrompt) {
                        parsed.image5 = fixedSlide5ReferencePrompt;
                    }

                    if (effectiveFlow === "weird_hack" || effectiveFlow === "weird_hack_v2") {
                        if (normalizedSlides.length >= 4 && (!parsed.image4 || !String(parsed.image4).trim())) {
                            parsed.image4 = "dark-to-warm gradient background, abstract minimal transition, no distinct scene.";
                        }
                    }

                    if (effectiveFlow === "i_say_they_say") {
                        normalizedSlides.forEach((slideText, index) => {
                            parsed[`image${index + 1}`] = buildDbtIFeelPrompt(slideText, index + 1);
                        });
                    }

                    if (effectiveFlow === "permission_v1") {
                        normalizedSlides.forEach((_, index) => {
                            const slideNumber = index + 1;
                            if (slideNumber >= 2 && slideNumber <= 7) {
                                parsed[`image${slideNumber}`] = buildPermissionV1NanoBananaPrompt('');
                            }
                        });
                    }

                    const prompts = normalizedSlides.map((_, index) => parsed[`image${index + 1}`] || null);

                    return sendJSON({
                        prompts: prompts,
                        image_prompts: parsed,
                        is_painting_style: true,
                        useStaticSlide1: isSymbolic && usesStaticDbtSlide1Template,
                        staticSlides: staticSlides
                    });
                } else {
                    // UGC Style (SYP and regular DBT if ever used)
                    console.log(`[Image Prompts] Generating UGC-style prompts for ${persona.name} (${persona.subject.hair.color} / ${persona.pet?.type || 'no pet'} / ${service}) with ${slides.length} slides`);
                    console.log(`[Image Prompts] Service: ${service || 'syp'}, Framing: ${framing || 'none'}`);

                    // ===== SAVEYOURPET.DE SLIDE DETECTION (for SYP only) =====
                    let saveyourpetSlideInstruction = '';
                    if (isSypProject) {
                        const saveyourpetKeywords = [
                            'saveyourpet.de', 'saveyourpet',
                            'absicherung', 'vorsorge', 'schutz fÃƒÂ¼r',
                            'was wenn er mal krank wird', 'was wenn sie mal krank wird',
                            'bin ich auf einen notfall vorbereitet', 'sollte ich mich besser absichern',
                            'hat vorgesorgt', 'hat sich um absicherung gekÃƒÂ¼mmert'
                        ];

                        const saveyourpetSlideIndices: number[] = [];
                        slides.forEach((slide: string, index: number) => {
                            const lowerSlide = slide.toLowerCase();
                            if (saveyourpetKeywords.some(keyword => lowerSlide.includes(keyword))) {
                                saveyourpetSlideIndices.push(index + 1);
                                console.log(`[Image Prompts] Detected saveyourpet.de content in Slide ${index + 1}: "${slide.substring(0, 50)}..."`);
                            }
                        });

                        if (saveyourpetSlideIndices.length > 0 && brandingMode === 'full') {
                            console.log(`[Image Prompts] Will apply LAPTOP/OVER-THE-SHOULDER prompt for slide(s): ${saveyourpetSlideIndices.join(', ')}`);

                            // Get pet name from profile
                            const petNames: { [key: string]: string } = {
                                'lisa_milo': 'Milo',
                                'anna_simba': 'Simba',
                                'sarah_luna': 'Luna',
                                'julia_balu': 'Balu'
                            };
                            const petName = petNames[resolvedCharacterId] || 'the pet';

                            saveyourpetSlideInstruction = `

## Ã¢Å¡Â Ã¯Â¸Â CRITICAL: SAVEYOURPET.DE SLIDE SPECIAL TREATMENT
For slide(s) ${saveyourpetSlideIndices.join(', ')} (contains saveyourpet.de / Absicherung / Vorsorge content):

**DO NOT use iPhone selfie format for these slides!**

Instead, use this EXACT format:
"Over-the-shoulder shot, same ${persona.subject.hair.color} girl on bed looking at laptop screen showing saveyourpet.de website, ${petName} sleeping behind laptop, soft lamp lighting, cozy bedroom, raw UGC aesthetic, laptop screen clearly visible (25-40% of frame)"

**KEY DIFFERENCES for saveyourpet.de slides:**
- Camera angle: OVER-THE-SHOULDER (not selfie)
- Device: LAPTOP (not phone)
- Laptop shows: saveyourpet.de website
- Pet position: Sleeping BEHIND the laptop or nearby
- Setting: On bed, cozy apartment vibe

This is the ONLY slide type where a device screen is shown prominently.`;
                        }
                    }

                    // ===== Build the UGC-style Slide 1 prompt as a detailed string =====
                    const slide1Text = slides[0] || "";
                    const ugcSlide1Prompt = buildUGCSlide1Prompt(persona, scrollStoppers, slide1Text, ugcBasePrompts, setting_override, isSypProject, DATA_DIR, selectedOutfit, selectedSetting);

                    console.log(`[Image Prompts] UGC Slide 1 built: ${ugcSlide1Prompt.substring(0, 100)}...`);

                    // Format expression options for AI (for slides 2-6)
                    const expressionList = scrollStoppers.expressions.map((e: any) => `- ${e.id}: ${e.description}`).join('\n');

                    // Build framing context section
                    let framingContextSection = '';
                    if (isFriendContent) {
                        framingContextSection = `
## Ã°Å¸â€˜Â¯ FRIEND POV FRAMING
This is "watching my friend" content - the narrator is a FRIEND observing.

**SLIDE ANALYSIS:**
- The friend (narrator) is watching/reacting to the girl's BPD moments
- Some slides may need TWO GIRLS (the friend and the girl with BPD)
- The friend has a loving, amused, supportive energy
`;
                    }

                    // ===== SYSTEM PROMPT with framing context =====
                    const systemPrompt = `You create image prompts for TikTok selfie slideshows.

## PRE-BUILT SLIDE 1 (ALREADY DONE - DO NOT CHANGE):
We have already built a hyper-realistic UGC-style prompt for Slide 1:
"${ugcSlide1Prompt}"

YOUR JOB: Create prompts for SLIDES 2-6 ONLY.
${framingContextSection}${saveyourpetSlideInstruction}
## CHARACTER CONSISTENCY (CRITICAL - same girl all slides):
- Hair: ${persona.subject.hair.color}, ${persona.subject.hair.style}
- Age: ${persona.subject.age}
- Face: ${persona.face.makeup}, ${persona.face.skin}${persona.subject?.body ? `
- Body: ${persona.subject.body.figure}` : ''}
- Accessories: ${persona.accessories.earrings}, ${persona.accessories.jewelry || 'none'}
- Clothing: ${selectedOutfit ? selectedOutfit.description : 'same outfit as Slide 1'} (SAME clothing all slides)
- Setting: ${selectedSetting ? selectedSetting.description : 'cozy home environment'} (SAME location all slides)
- PET: ${persona.pet?.description || 'none'} (include in 1-2 slides if appropriate)

## UGC AESTHETIC (CRITICAL - apply to all):
- iPhone front-camera selfie style
- Slight wide-angle distortion, visible grain
- No ring light, no professional lighting
- ${isSypProject ? 'Authentic pet owner energy, theatrical comedy vibe' : 'Authentic mental health creator energy'}
- Raw UGC aesthetic, not polished
- Ã¢Å¡Â Ã¯Â¸Â SELFIE HAND LOGIC: ONE HAND MUST HOLD THE PHONE to take the photo!
- Ã¢ÂÅ’ NEVER: phone in hands showing something, both hands on face/mouth, hands together in prayer, any pose requiring BOTH hands
- Ã¢ÂÅ’ NEVER SHOW A PET ON A COUNTER: No pets on kitchen counters, tables, or raised surfaces. Pet must be on floor, bed, or couch.
- Ã¢Å“â€¦ VALID: One hand gesturing, touching face, petting pet, etc. (the other hand holds phone - never mention it)

## EXPRESSION OPTIONS (pick appropriate one for each slide's emotion):
${expressionList}

## SLIDES 2-6 FORMAT:
Each prompt should be a single descriptive sentence:
"Same ${persona.subject.hair.color} girl${persona.subject?.body ? `, ${persona.subject.body.figure}` : ''}, ${selectedOutfit ? selectedOutfit.description : 'same outfit as Slide 1'}, [EXPRESSION], in ${selectedSetting ? selectedSetting.description : 'same setting as Slide 1'}, ${persona.pet?.type ? persona.pet.type + ' nearby' : ''}, iPhone front-camera selfie, ${selectedSetting?.lighting || 'warm lighting'}, raw UGC aesthetic"

## EMOTIONAL PROGRESSION GUIDE:
- Slide 2: escalation emotion (shocked, suspicious, concerned)
- Slide 3: listing/explaining (thoughtful, direct)
- Slide 4: processing (contemplative, slight understanding)
- Slide 5: realization/tool usage (soft half-smile, figured something out)
- Slide 6: hopeful close (genuine warmth, peaceful, grounded)`;

                    const userPrompt = `Generate image prompts for SLIDES 2-${slides.length} ONLY.

SLIDE TEXT:
${slides.map((s: string, i: number) => `Slide ${i + 1}: "${s}"`).join('\n')}

Return JSON with this exact structure:
{
  "image1": "ALREADY BUILT - USE THE UGC PROMPT PROVIDED",
${Array.from({ length: slides.length - 1 }, (_, i) => `  "image${i + 2}": "[prompt for slide ${i + 2}]"`).join(',\n')}
}

REMINDER: image1 is already done. Just fill in image2-image${slides.length} with descriptive prompts.`;

                    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'x-api-key': ANTHROPIC_API_KEY!,
                            'anthropic-version': '2023-06-01',
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'claude-sonnet-4-6',
                            max_tokens: 2500,
                            system: systemPrompt,
                            messages: [{ role: 'user', content: userPrompt }]
                        })
                    });

                    if (!claudeResponse.ok) {
                        const errorText = await claudeResponse.text();
                        console.error("[UGC Image Prompts] Error:", errorText);
                        return sendJSON({ error: "Anthropic API Error" }, 500);
                    }

                    const rawData = await claudeResponse.json() as any;
                    const resultText = rawData.content?.[0]?.text || '';
                    let parsed;
                    try {
                        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
                    } catch (parseErr) {
                        console.error("[UGC Image Prompts] JSON Parse Error:", parseErr);
                        console.info("[UGC Image Prompts] Raw AI Response:", resultText);
                        return sendJSON({ error: "Failed to parse image prompts", details: String(parseErr), raw: resultText.substring(0, 1000) }, 500);
                    }
                    parsed.image1 = ugcSlide1Prompt;

                    // Convert to array
                    const prompts = Object.keys(parsed)
                        .filter(key => key.startsWith('image'))
                        .sort((a, b) => (parseInt(a.replace('image', '')) || 0) - (parseInt(b.replace('image', '')) || 0))
                        .map(key => parsed[key]);

                    return sendJSON({
                        prompts: prompts,
                        image_prompts: parsed,
                        character_name: persona.name
                    });
                }
            } catch (e) {
                console.error("[Image Prompts] Error:", e);
                return sendJSON({ error: "Image prompts generation failed", details: String(e) }, 500);
            }
        }
        // POST /generate-native-slides - Generate the actual carousel slide text
        else if (cleanPath === "/generate-native-slides" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const { format, topic, profile, service, includeBranding, brandingMode, slideType, language, model } = await req.json() as any;

                let result;
                if (service === 'syp' || profile) {
                    result = await generateSypSlides({
                        profile: profile || "lisa_milo",
                        topic: topic || "lifestyle_random",
                        ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
                        DATA_DIR: DATA_DIR,
                        SYP_DIR: SYP_DIR,
                        ugcBasePrompts: ugcBasePrompts,
                        brandingMode: brandingMode || (includeBranding !== false ? 'full' : 'none')
                    });
                } else {
                    result = await generateDbtSlides({
                        format: format || 'relatable',
                        topic: topic || 'favorite_person',
                        slideType: slideType || 'weird_hack',
                        ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
                        includeBranding: includeBranding !== false,
                        language: language === 'de' ? 'de' : 'en',
                        model: model || 'claude-sonnet-4-6',
                        KIMI_API_KEY: KIMI_API_KEY,
                        KIMI_API_BASE: KIMI_API_BASE,
                        KIMI_MODEL: KIMI_DEFAULT_MODEL
                    });

                    const isStoryTellingFlow = slideType === 'story_telling_bf' || slideType === 'story_telling_gf' || slideType === 'story_telling_gf_v2';
                    if (isStoryTellingFlow && result.slides && Array.isArray(result.slides)) {
                        const hookResult = slideType === 'story_telling_gf_v2'
                            ? await generateConvertedSkepticHooks({
                                slides: result.slides.slice(1, 6),
                                slideType,
                                ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
                                language: language === 'de' ? 'de' : 'en'
                            })
                            : await generateStoryTellingHooks({
                                slides: result.slides.slice(1),
                                slideType,
                                ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
                                language: language === 'de' ? 'de' : 'en'
                            });

                        if (hookResult.hooks.length > 0) {
                            result.slides[0] = hookResult.hooks[0];
                            (result as any).hook_options = hookResult.hooks;
                            (result as any).hook_style_examples = hookResult.styleExamples;
                            (result as any).hook_style_influences = hookResult.styleInfluences;
                        }
                    }
                }

                // Format response with Slide numbers for the front-end textarea
                if (result.slides && Array.isArray(result.slides)) {
                    result.slides = result.slides.map((text: string, i: number) => `Slide ${i + 1}: ${text}`);
                }

                return sendJSON(result);
            } catch (e) {
                console.error("Native Slides API Error:", e);
                return sendJSON({ error: "Native generation failed", details: String(e) }, 500);
            }
        }

        // POST /generate-stickman-topics - Generate one complete BPD slideshow concept
        else if (cleanPath === "/generate-stickman-topics" && method === "POST") {
            try {
                const body = await req.json() as any;
                const previousTopics = String(body.previousTopics || '').trim();
                const angleSeed = String(body.angleSeed || 'a clearly different BPD or DBT experience').trim();
                const noveltySeed = String(body.noveltySeed || '').trim();
                const requestedModel = String(body.model || 'claude-sonnet-4-6').trim();

                if (requestedModel === 'k3' || requestedModel.startsWith('kimi')) {
                    if (!KIMI_API_KEY) throw new Error("Kimi API key missing");
                    const kimiPrompt = `Generate one complete BPD and DBT educational carousel. Create one hook plus five numbered slides. The hook starts with 5, is maximum 10 words, and is not a question. Each slide has a specific personal headline in you language, maximum 12 words, and one supporting line, maximum 10 words. The post must be shareable, compassionate, BPD or DBT specific, and naturally addressable with DBT skills. Never use dashes. Do not repeat prior topics, hook structures, emotional angles, or the phrase 5 ways BPD makes you shrink yourself for others. Required creative direction: ${angleSeed}. Novelty seed: ${noveltySeed}. Previous topics to avoid: ${previousTopics || '(none)'}. Assess whether the topic is strong for Gen Z and not overdone. Return JSON only with this shape: {"hook":"...","slides":[{"number":1,"headline":"...","supportingLine":"..."},{"number":2,"headline":"...","supportingLine":"..."},{"number":3,"headline":"...","supportingLine":"..."},{"number":4,"headline":"...","supportingLine":"..."},{"number":5,"headline":"...","supportingLine":"..."}],"shareTrigger":"...","angle":"...","assessment":{"viralForGenZ":true,"overdoneScore":1,"note":"..."}}`;
                    const kimiResponse = await fetch(`${KIMI_API_BASE.replace(/\/$/, '')}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${KIMI_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: requestedModel || KIMI_DEFAULT_MODEL,
                            max_tokens: 1400,
                            messages: [{ role: 'user', content: kimiPrompt }]
                        })
                    });
                    if (!kimiResponse.ok) throw new Error(`Kimi HTTP ${kimiResponse.status}: ${(await kimiResponse.text()).slice(0, 300)}`);
                    const kimiPayload = await kimiResponse.json() as any;
                    const kimiRaw = kimiPayload?.choices?.[0]?.message?.content || '';
                    const kimiParsed = JSON.parse(kimiRaw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim());
                    const kimiSlides = Array.isArray(kimiParsed.slides) ? kimiParsed.slides.slice(0, 5).map((item: any, index: number) => ({
                        number: index + 1,
                        headline: String(item.headline || '').trim(),
                        supportingLine: String(item.supportingLine || '').trim()
                    })).filter((item: any) => item.headline && item.supportingLine) : [];
                    if (!kimiParsed.hook || kimiSlides.length !== 5 || !kimiParsed.shareTrigger) throw new Error('Kimi returned an invalid slideshow');
                    return sendJSON({ success: true, carousel: {
                        hook: String(kimiParsed.hook).trim(),
                        slides: kimiSlides,
                        shareTrigger: String(kimiParsed.shareTrigger).trim(),
                        angle: String(kimiParsed.angle || '').trim(),
                        assessment: kimiParsed.assessment || {}
                    }});
                }
                if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API key missing");
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 900,
                        messages: [{
                            role: 'user',
                            content: `Generate 1 TikTok list-post concept for a BPD (Borderline Personality Disorder) / DBT educational channel. The concept is a complete text-based carousel in the style of “5 signs you lost yourself”: one hook slide followed by 5 numbered slides.

This generation must be meaningfully different from previous generations. Novelty seed: ${noveltySeed || '(none)'}. Required creative direction: ${angleSeed}.

Hook slide rules:
- Starts with “5”.
- Maximum 10 words.
- Clearly tied to BPD or DBT.
- Curiosity-driving title, not a question.
- Sounds searchable, screenshot-worthy, and natural when spoken aloud.

Slides 1 to 5:
- Each has one numbered headline, maximum 12 words, plus one short supporting line, maximum 10 words.
- Headlines are specific and personal, written in “you” language, not clinical language.
- Supporting lines should add the emotional “oh, that’s me” detail.
- Each slide must be readable in about 2 seconds on a phone.

Choose exactly one angle for this generation. Rotate between mildly controversial or myth-busting, deeply relatable and emotionally specific, or educational but surprising DBT/BPD reframes. The post must be BPD or DBT specific, shareable, compassionate, non-stigmatizing, and naturally addressable with emotional regulation, distress tolerance, interpersonal effectiveness, or mindfulness skills in DBT-Mind.

Do not reuse the same hook structure, central experience, emotional angle, or wording from the previous topics. Do not use the pattern “5 ways BPD makes you...” or the topic about shrinking yourself for others unless it is explicitly present as a previous topic and you transform it into a genuinely different concept. Prefer a different sentence structure and emotional situation.

Hard rules:
- Never use dashes anywhere. No em dashes, en dashes, or double hyphens. Use periods, commas, or line breaks.
- Do not use generic mental health content.
- Do not diagnose or imply every person with BPD has the same experience.
- Avoid duplicate angles and hooks from this existing list:
${previousTopics || '(none provided)'}

Before finalizing, assess whether this is a strong Gen-Z TikTok topic and whether it is overdone. If it is weak or overdone, discard it and generate a replacement.

Return JSON only in this exact shape:
{"hook":"...","slides":[{"number":1,"headline":"...","supportingLine":"..."},{"number":2,"headline":"...","supportingLine":"..."},{"number":3,"headline":"...","supportingLine":"..."},{"number":4,"headline":"...","supportingLine":"..."},{"number":5,"headline":"...","supportingLine":"..."}],"shareTrigger":"...","angle":"relatable|myth-busting|educational","assessment":{"viralForGenZ":true,"overdoneScore":1,"note":"..."}}`
                        }]
                    })
                });

                if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
                const payload = await response.json() as any;
                const raw = payload?.content?.find((item: any) => item.type === 'text')?.text || '';
                const parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim());
                const slides = Array.isArray(parsed.slides) ? parsed.slides.slice(0, 5).map((item: any, index: number) => ({
                    number: index + 1,
                    headline: String(item.headline || '').trim(),
                    supportingLine: String(item.supportingLine || '').trim()
                })).filter((item: any) => item.headline && item.supportingLine) : [];
                const carousel = {
                    hook: String(parsed.hook || '').trim(),
                    slides,
                    shareTrigger: String(parsed.shareTrigger || '').trim(),
                    angle: String(parsed.angle || '').trim(),
                    assessment: parsed.assessment || {}
                };
                if (!carousel.hook || slides.length !== 5 || !carousel.shareTrigger) throw new Error('Carousel generator returned an invalid slideshow');
                return sendJSON({ success: true, carousel });
            } catch (e) {
                console.error("[Stickman Topics] Error:", e);
                return sendJSON({ error: "Stickman topic generation failed", details: String(e) }, 500);
            }
        }

        // POST /generate-dbt-carousel-text - Generate generic psychoeducation carousel text for DBT image prompts
        else if (cleanPath === "/generate-dbt-carousel-text" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const body = await req.json() as any;
                const result = await generateDbtCarouselText({
                    topic: body.topic,
                    angle: body.angle,
                    targetAudience: body.targetAudience,
                    tone: body.tone,
                    slideCount: body.slideCount,
                    allowEmojis: body.allowEmojis,
                    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!
                });
                const { preview, ...carousel } = result;

                return sendJSON({
                    success: true,
                    carousel,
                    preview
                });
            } catch (e) {
                console.error("[DBT Carousel Text] Error:", e);
                return sendJSON({ error: "DBT carousel text generation failed", details: String(e) }, 500);
            }
        }

        // POST /generate-metadata - Generate TikTok Title & Description
        else if (cleanPath === "/generate-metadata" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const { slides_text, service, includeBranding, brandingMode, slideType, topic, slide1Hook, language } = await req.json() as any;

                if (!slides_text || !slides_text.trim()) {
                    return sendJSON({ error: "Slides text is required" }, 400);
                }

                const isDbt = service === 'dbt';
                const isSyp = service === 'syp';
                const isLittleHabits = service === 'lh' || slideType === 'little_habits';
                const isWeirdHackV2 = isDbt && slideType === 'weird_hack_v2';
                const isPermissionV1 = isDbt && slideType === 'permission_v1';
                const isVentNowStyle = isDbt && slideType === 'vent_now_style';

                // DBT-Mind: caption framework is enforced via dedicated prompt rules
                const needsDbtBrandingInDescription = isDbt;

                // SYP: branding in description when brandingMode is 'soft'
                const needsSypBrandingInDescription = isSyp && brandingMode === 'soft';

                console.log(`[Metadata Gen] Generating for: ${slides_text.substring(0, 50)}... (service: ${service || 'unknown'}, dbt: ${isDbt}, syp brandingMode: ${brandingMode || 'n/a'})`);

                // Build branding instruction
                let brandingInstruction = '';
                if (isLittleHabits) {
                    brandingInstruction = `
## LITTLE HABITS TIKTOK METADATA

This is a playful Little Habits parody/interface carousel. Keep the metadata in the same
dry, specific, self-aware voice as the slides. The title is what the creator types as the
TikTok post title, not a description of the format.

TITLE RULES:
- Maximum 8 words. This is a hard limit.
- Lowercase, casual, and specific to this carousel.
- No hashtags, quotation marks, emojis, or generic labels like "mental health tips".
- Do not copy slide 1 word for word.

DESCRIPTION RULES:
- Write a short, natural caption that complements the carousel.
- Put 5 relevant lowercase hashtags on the final line, separate from the title.
- Always include #bpd, #dbt, and #bpdrecovery; add two topic-specific tags.
- Never use #fyp or #foryou.
`;
                } else if (isWeirdHackV2) {
                    brandingInstruction = `
## CRITICAL: WEIRD_HACK_V2 CAPTION FRAMEWORK (GEN-Z DEADPAN VOICE)

This caption must match the deadpan, self-deprecating, slightly-exhausted voice of the slide carousel. Not therapeutic. Not educational. Not polished. Written like someone typing a confession into notes app at 11pm.

### STRUCTURE (4 parts, in this exact order):

1) **App mention as opener (1 line, ≤15 words)**
   - MUST start with "the dbt-mind app" as the first 3 words of the description.
   - The sentence frames the app as a tool the narrator uses, casually, like mentioning a productivity tool to a friend.
   - Reference at least one specific hack or concept from the slides (90-minute rule, screenshot predictions, the scan, the paragraph text, etc).
   - Example openers:
     - "the dbt-mind app is where i keep the 90-min rule now. also the screenshot one."
     - "the dbt-mind app has check the facts built in. that's mostly what i use it for."
     - "the dbt-mind app tracks this for me. i'd forget otherwise."
   - NEVER write "download the dbt-mind app" or "check out dbt-mind" — those are ad voices.
   - NEVER write "DBT-Mind" with capitals. Always lowercase "dbt-mind app".

2) **Deadpan reflection (1 line, ≤15 words)**
   - Continues the confession voice of the slides.
   - Names something real the narrator still struggles with. Keeps emotional tension — does NOT wrap things up tidily.
   - Examples:
     - "the scan still happens. i just lose to it less."
     - "honestly made peace with the fact that 'just stop scanning' was never gonna be the answer."
     - "not fixed. just slightly less feral at 2am."
   - Lowercase. Fragments welcome. No semicolons.

3) **Micro-closer (optional, 1 short line)**
   - Only include if it adds something — otherwise skip.
   - Can be a single word or phrase. Examples: "anyway.", "that's it.", "ok bye.", "wish i'd learned this sooner."
   - Never motivational ("you've got this!"). Never earnest ("healing is a journey").

4) **Hashtags (final line, on its own line)**
   - Always include: #bpd #bpdtiktok #dbt #bpdrecovery
   - Add 1-2 topic-specific hashtags based on slide content. Good options: #fp #quietbpd #dbtskills #splitting #rsd #fpdynamics #attachmentstyle
   - Total 5-7 hashtags MAX. Never exceed 7.
   - NEVER use #fyp or #foryou — these are dead signals in 2026 and get downranked.

### EMOJI RULES (STRICT):

Allowed emojis only (use 0-2 total across the entire caption):
- 🫶 (soft affection, replacement for ❤️)
- 🫠 (melting face — overwhelm, dissociation, "i can't")
- 😵‍💫 (spiral eyes — anxiety, brain rot)
- 🫥 (dotted line face — invisible, ghosted)
- 😶‍🌫️ (face in clouds — dissociating, spacing out)
- 🥲 (tearful smile — bittersweet, coping)
- 💀 (self-deprecating laughter after a painful admission)
- 😭 (laughing OR actually crying, context-dependent)
- 😔 (quiet sad)

BANNED emojis (reading as millennial-coded, corporate, or overused):
- ❌ ❤️ ✨ 💅 😂 👍 🙌 🔥 💯 🎉 🥰 🥹 🤍 💕

Emoji placement: end of a line, never mid-sentence. Stacking emojis (🫠🫠🫠) is banned — one emoji does the work.

Default to ZERO emojis. Only add one if it genuinely lands. Over-use of emojis is the #1 tell of generated content.

### TITLE RULES (for the "title" field):

- 1 line, ≤60 characters
- Lowercase
- Fragment allowed
- Should work as a scroll-stopper if used as the video's visible title
- Pull the strongest reframe phrase from slide 6 or the hook as the title
- Examples:
  - "treating his typing speed like a vital sign 😶‍🌫️"
  - "the scan just never got the memo"
  - "my brain wrote the breakup in 3 seconds"
- NEVER title-case. NEVER include "BPD tips" or "DBT hacks" framing — those are content-marketer titles.

### LANGUAGE: ENGLISH

### EXAMPLE OUTPUT for this voice:
{"title":"treating his typing speed like a vital sign","description":"the dbt-mind app is where the 90-min rule lives now. also the screenshot one. that's mostly what i use it for.\nthe scan still happens. i just lose to it less 🫠\nanyway.\n#bpd #bpdtiktok #dbt #bpdrecovery #fp #attachmentstyle"}

### WHAT TO AVOID:
- ❌ "Struggling with BPD? Here's what helped me!" (ad voice)
- ❌ "This post hit different 💯🔥" (wrong emojis, wrong voice)
- ❌ "Healing is not linear ✨" (corny + banned emoji)
- ❌ "Tag someone who needs this" (engagement farming)
- ❌ "Download DBT-Mind today" (ad voice)
- ❌ Mentioning the app more than once in the description
`;
                } else if (isPermissionV1) {
                    brandingInstruction = `
CRITICAL: PERMISSION_V1 CAPTION FRAMEWORK (WARM, DIRECT, BPD-COMMUNITY VOICE)

This caption must match the warm, direct, permission-giving voice of the permission_v1 slide carousel. Unlike weird_hack_v2's deadpan-confession voice, permission_v1 is warmer - "a friend telling you something they've been wanting to say." Quiet. Kind. Still Gen-Z, still lowercase, still fragment-tolerant, but softer.

The slides follow this emotional arc: shame-word hook -> shared accusations -> mechanism reveal -> identity reframe -> positive flip -> explicit permission -> naming the secret effort. The caption should extend this arc, not restart it.

STRUCTURE (3 parts, in this exact order):

App mention as opener (1 line, <=22 words)

- MUST start with "the dbt-mind app" as the first 3 words.
- The sentence frames the app as something the narrator personally uses. Casual, first-person. Never "download" or "check out" voice.
- The app capability referenced MUST match the topic of the post. Use the slide content to infer the topic. Match examples:

Identity/self topics ("empty", "broken", "unstable", "pathetic", "a burden") -> "where i started writing down who i actually am" / "where i keep what i'm learning about myself" / "where i hold the new version of me when the old story tries to come back"
Emotion/regulation topics ("too much", "too intense", "dramatic", "oversensitive", "crazy", "irrational") -> "where the reframes live when i can't find them at 3am" / "where i track what actually works when i'm dysregulated"
Attachment/relational topics ("needy", "obsessive", "attention-seeking", "manipulative", "exhausting") -> "where i track what my brain forgets about people" / "where i keep the proof of love when my brain tries to delete it"

- Reference the specific reframe or mechanism from this post, not a generic feature. Read the slide text and pull something concrete.
- NEVER write "DBT-Mind" with capitals. Always lowercase "dbt-mind app".

Reflection line (1-2 lines, <=25 words total)

- Echoes the shame-word from slide 1 in quotation marks (essential - keeps caption-to-post cohesion)
- Mirrors the parallel-construction move from slide 4 ("you're not 'X'. you're [Y].")
- Warm, tired, Gen-Z-coded. Ends on a resigned-but-accepting phrase like "but here we are." / "turns out." / "who knew." / "wish i'd known sooner."
- This line functions as the caption's emotional landing - it should feel like a private thought spoken aloud.

Hashtags (final line, on its own line)

- Always include: #bpd #bpdtiktok #dbt #bpdrecovery
- Add 1-2 topic-specific hashtags based on the topic. Matching:

Identity topics -> #quietbpd #identitydisturbance
External shame topics -> #bpdawareness (use sparingly)
Attachment topics -> #fp #attachmentstyle
Regulation topics -> #dbtskills #emotionalregulation
Splitting/cognition topics -> #splitting #blackandwhitethinking

- Total 5-7 hashtags MAX. Never exceed 7.
- NEVER use #fyp or #foryou - dead signals, downranked in 2026.

EMOJI RULES (STRICT - quieter than weird_hack_v2):
Permission_v1 is a quieter format than v2. Emojis should be RARE.
Default to ZERO emojis. If you add one, it must be from this allowlist only:

- 🫶 (soft affection)
- 🫠 (melting - overwhelm)
- 😵‍💫 (spiral - anxiety, brain rot)
- 🫥 (dotted line - invisible, ghosted)
- 😶‍🌫️ (face in clouds - dissociating)
- 🥲 (tearful smile - bittersweet)
- 💀 (self-deprecating laughter)
- 😭 (laughing OR crying, context-dependent)
- 😔 (quiet sad)

RULE: For HEAVY topics, use ZERO emojis. Heavy topics include: "empty", "broken", "crazy", "unstable", "a burden", "pathetic", "exhausting", "attention-seeking", "manipulative", "too much".
For LIGHT topics, optionally use ONE emoji at the end of the reflection line. Light topics include: "dramatic", "intense", "obsessive", "needy", "oversensitive", "irrational".
NEVER use two emojis. NEVER stack emojis. If in doubt, use zero.

BANNED (reading as millennial-coded, corporate, overused):
❌ ❤️ ✨ 💅 😂 👍 🙌 🔥 💯 🎉 🥰 🥹 🤍 💕

TITLE RULES (for the "title" field):
- 1 line, <=60 characters
- Lowercase
- Fragment allowed
- Pull the single most evocative phrase from the slides - typically from slide 5 (the positive flip) or slide 4 (the reframe)
- Should work as a scroll-stopping fragment in the viewer's FYP
- NEVER title-case, NEVER "BPD tips" / "DBT hacks" framing
- Examples of the right voice:

"worn as emptiness because no one named it right"
"you're not too much. you're a sensor."
"the labor of holding everyone else"
"you didn't form around yourself"

EXAMPLE OUTPUT for this voice (topic: "empty"):
{"title":"worn as emptiness because no one named it right","description":"the dbt-mind app is where i started writing down who i actually am. slow process. the reframes from this post are in there too.\nno one ever told me \"empty\" was just unanchored. but here we are.\n#bpd #bpdtiktok #dbt #bpdrecovery #quietbpd #identitydisturbance"}

EXAMPLE OUTPUT for a LIGHT topic (topic: "dramatic"):
{"title":"your brain isn't being dramatic. it's reading the room.","description":"the dbt-mind app is where the reframes live when i can't find them at 3am. this exact post is basically notes-to-self 😔\n\"dramatic\" was never the right word. turns out rsd has a name.\n#bpd #bpdtiktok #dbt #bpdrecovery #rsd #rejectionsensitivity"}

WHAT TO AVOID:

❌ "Struggling with feeling empty? Here's what helped!" (ad voice)
❌ "You are not broken, you are beautiful ✨" (wrong emojis, wrong voice, corny)
❌ "Save this for later 💯" (engagement farming, banned emoji)
❌ "Tag someone who needs to hear this" (engagement farming)
❌ "Download DBT-Mind to start healing today!" (ad voice)
❌ Using "the dbt-mind app" more than once in the description
❌ Adding motivational closers ("you've got this!", "healing is a journey")
❌ Capitalized "DBT-Mind" in the description
❌ Two or more emojis in the caption
❌ Any emoji at all on heavy topics (empty, broken, crazy, exhausting, etc.)
`;
                } else if (isVentNowStyle) {
                    brandingInstruction = `
## CRITICAL: VENT_NOW_STYLE METADATA FRAMEWORK

You are generating the TikTok post title field and description for a DBT-Mind slideshow post.

The title is separate from:
1. the slide 1 hook text shown inside the slideshow image
2. the TikTok caption/description with hashtags

REFERENCE STYLE:
Use @sydneysynced-style TikTok title mechanics.

The title should feel like a short soft-curiosity wrapper, emotional label, or casual personal note.

Observed title examples from @sydneysynced:
- part 2!
- my best advice
- these change everything
- these changed everything!!
- advice straight from my therapist
- save these immediately
- you owe optimism to yourself
- she changed my life
- i love life so much (and you should too)
- you're not bound to lifelong social anxiety btw
- people miss these way too often
- i can't emphasize these enough

TITLE RULES:
- Generate exactly 5 title options.
- 3-10 words each if possible.
- lowercase unless emphasis is intentional.
- Do not use hashtags in titles.
- Do not duplicate the slide 1 hook exactly.
- Do not make it sound like SEO.
- Do not over-explain the topic.
- Do not mention DBT-Mind unless the post is explicitly app-forward.
- Make it feel native to TikTok: casual, soft, emotionally specific, slightly curiosity-based.
- It can sound like a private note, advice label, series label, or emotional reminder.

GOOD TITLE PATTERNS:
- save this for later
- advice i needed sooner
- this changed how i text back
- you're allowed to pause first
- part 2!
- quiet reminders for tonight
- for when your brain gets loud
- read this before texting back
- this one is for tonight
- things i'm still learning

BAD TITLE PATTERNS:
- DBT skills for emotional regulation
- How to manage BPD symptoms using DBT
- Mental health advice for people with borderline personality disorder
- #bpd #dbt #mentalhealth
- exact copy of slide 1

DESCRIPTION RULES:
- The description should only include hashtags.
- The AI should choose 5 hashtags that fit the slide content.
- Return exactly 5 hashtags total.
- All hashtags must be lowercase.
- Never use #fyp or #foryou.
- Do not use hashtags in the title.

OUTPUT FORMAT:
Return JSON only.

Schema:
{
  "titles": [
    {
      "title": "...",
      "style": "soft curiosity / advice label / series label / emotional reminder / personal truth",
      "why": "..."
    }
  ],
  "best_title": "...",
  "description": "..."
}
`;
                } else if (isDbt) {
                    brandingInstruction = `
## CRITICAL: DBT-MIND CAPTION FRAMEWORK (4 PARTS, IN THIS ORDER)
Write the description as exactly four parts:
1) Emotional hook (exactly 1 line)
- Summarize the post's emotional core as an "afterthought" feeling.
- Must complement slide 1, not repeat it.
- No label, no announcement, lowercase.

2) Personal insight (1-2 sentences)
- Rephrase the main message for viewers who did not read all slides.
- Personal, raw, lowercase, no clinical tone.
- Keep emotional tension; do not sound solution-first.

3) App mention (exactly 1 sentence)
- Casual, personal recommendation tone.
- Never include "@dbt-mind" or "@dbtmind".
- Refer to it naturally as "DBT-Mind" or "DBT-Mind (free)" only.
- Never call it "the dbt app", "my dbt app", or "that app".
- If possible, mention the concrete skill/feature from the slides (for example: stop, wise mind, check the facts, diary, logging, urge surfing).
- No ad tone, no "check out", no sales language.

4) Hashtags (final line only)
- Always include: #bpd #dbtskills #bpdrecovery
- Add 1-2 topic-specific hashtags based on the slide topic.

## GLOBAL RULES FOR DBT CAPTIONS
- Lowercase only.
- No "link in bio".
- Must read like a personal post, not a brand account.
- Keep phrasing colloquial and lived-in, not polished or poetic.
- Prefer everyday language (example style: "too in it to think", not "apply it").
- Gen-Z casual style is allowed where natural (short sentences, imperfect grammar, "bc", "rn").
- Self-ironic hyperbole humor is allowed, especially in part 1, when it fits the topic.
`;
                } else if (needsSypBrandingInDescription) {
                    brandingInstruction = `
## Ã¢Å¡Â Ã¯Â¸Â CRITICAL: SAVEYOURPET.DE MUSS AM ANFANG DER DESCRIPTION STEHEN!

Die Slides erwÃƒÂ¤hnen Absicherung/Vorsorge thematisch, aber nicht saveyourpet.de direkt.
Du MUSST saveyourpet.de in der Description erwÃƒÂ¤hnen - und zwar **AM ANFANG**, nicht am Ende!

### WICHTIGSTE REGELN:
1. **saveyourpet.de ZUERST** - direkt im ersten Satz, BEVOR der Rest der Beschreibung kommt
2. **Kreativ & Authentisch** - soll wie ein echtes Statement klingen, NICHT wie Werbung
3. **Emotional/Humorvoll** - die Person teilt ihre ECHTE Erfahrung

### Ã¢Å“â€¦ GUTE BEISPIELE (nutze diesen Stil):
- "saveyourpet.de hat mir meinen A*sch gerettet Ã°Å¸Ëœâ€š [REST DER DESCRIPTION]"
- "saveyourpet.de - bester Move ever. [REST DER DESCRIPTION]"
- "Dank saveyourpet.de kann ich endlich wieder schlafen Ã°Å¸Ââ€¢ [REST DER DESCRIPTION]"
- "saveyourpet.de gecheckt Ã¢â€ â€™ Panik weg Ã°Å¸â€™â€ Ã¢â‚¬ÂÃ¢â„¢â‚¬Ã¯Â¸Â [REST DER DESCRIPTION]"
- "saveyourpet.de war die beste Entscheidung. Punkt. [REST DER DESCRIPTION]"
- "hÃƒÂ¤tte ich saveyourpet.de mal frÃƒÂ¼her gefunden Ã°Å¸Â¥Â² [REST DER DESCRIPTION]"
- "saveyourpet.de = endlich ruhig schlafen Ã°Å¸ËœÂ´ [REST DER DESCRIPTION]"

### Ã¢ÂÅ’ SCHLECHTE BEISPIELE (VERMEIDE DIESE):
- "Tierkrankenversicherung vergleichen auf saveyourpet.de" Ã¢â€ â€™ zu werblich!
- "mehr auf saveyourpet.de" Ã¢â€ â€™ zu formal, zu werblich
- "alles zu Absicherung: saveyourpet.de" Ã¢â€ â€™ klingt wie ein Slogan
- "[Description]... Jetzt endlich abgesichert Ã¢â‚¬â€œ hÃƒÂ¤tte ich mal frÃƒÂ¼her gemacht." Ã¢â€ â€™ saveyourpet.de muss VOR diesem Satz kommen!

### FORMAT:
"saveyourpet.de [kreatives Statement]. [1-2 SÃƒÂ¤tze zur Story/Emotion] [2-3 Emojis] [3-5 Hashtags]"
`;
                } else if (isSyp && brandingMode === 'none') {
                    brandingInstruction = `
## Ã¢Å¡Â Ã¯Â¸Â WICHTIG: KEIN BRANDING (KEIN saveyourpet.de)
- Ã¢ÂÅ’ ErwÃƒÂ¤hne saveyourpet.de NIEMALS in der Description!
- Ã¢Å“â€¦ Aber: Nutze Begriffe wie "Tierkrankenversicherung", "Absicherung" oder "OP-Schutz" in der Caption, um das Thema der Slides aufzugreifen.
- Ã¢Å“â€¦ Die Regel "Verwende niemals das Wort Versicherung" ist fÃƒÂ¼r diesen Post AUFGEHOBEN.
- Ã¢Å“â€¦ Beispiel: "Bin so froh, dass ich das Thema Tierkrankenversicherung endlich angegangen bin Ã°Å¸Ââ€¢Ã°Å¸â„¢Â"
`;
                }

                // Language-specific instructions
                const dbtIsGerman = (isDbt || isLittleHabits) && language === 'de';
                const dbtGermanLanguageBlock = `
## LANGUAGE: GERMAN (überschreibt jede "LANGUAGE: ENGLISH"-Anweisung oben)
- Write everything in German, in the voice of the German BPD TikTok community.
- Lowercase, du-perspective, short raw sentences, natural anglicisms (cringe, literally, safe, btw, random, fp, splitting, waitlist).
- Not therapy-speak, no coaching voice, no stiff translated German.
- The app opener becomes "die dbt-mind app" instead of "the dbt-mind app" (still lowercase, still first).
- Hashtags stay lowercase; German tags like #mentalegesundheit are fine alongside #bpd #dbt #bpdtok.

Example output: {"title":"mein kopf hat die trennung in 3 sekunden geschrieben","description":"die dbt-mind app ist der ort, an dem die 90-minuten-regel jetzt wohnt.\nder scan passiert trotzdem. ich verliere nur seltener gegen ihn 🫠\nanyway.\n#bpd #dbt #bpdtok #bpdrecovery #mentalegesundheit"}`;
                const languageInstructions = (isDbt || isLittleHabits) ? (dbtIsGerman ? dbtGermanLanguageBlock : `
## LANGUAGE: ENGLISH
- Write everything in English
- Tone target: young person with BPD, raw and fragmentary, not reflective and polished.
- Keep it conversational, imperfect, emotionally immediate.
- Avoid self-help-book voice and poetic writing.

Example output: {"title":"my brain wrote the breakup in 3 seconds","description":"one dry text and my brain already wrote the breakup, the funeral, and the part where i was wrong about everything.\ntook me too long to realize the feeling is real but the story i build from it usually isn't.\nmy therapist taught me stop and i actually use it now bc DBT-Mind walks me through it when i'm too in it to think.\n#bpd #dbtskills #bpdrecovery #anxietyspiral #drytext"}`) : `
## LANGUAGE: GERMAN
- Write everything in German
- Natural, authentic, conversational tone
- Relatable and warm, not overly trendy or slang-heavy
- Avoid excessive Gen-Z slang
- Simple, clear language that anyone can understand
- Slightly humorous or self-aware is okay, but keep it grounded
- English hashtags are fine

## STYLE EXAMPLES:
Ã¢ÂÅ’ BAD: "die 3am anxiety hits different wenn..." (too Gen-Z)
Ã¢Å“â€¦ GOOD: "3 Uhr nachts und ich google wieder..." (natural German)

Ã¢ÂÅ’ BAD: "when your dog is lowkey your therapist fr" (too slang-heavy)
Ã¢Å“â€¦ GOOD: "wenn dein Hund besser schlÃƒÂ¤ft als du" (simple, relatable)

Example output: {"title": "wenn dein hund besser schlÃƒÂ¤ft als du", "description": "Er schnarcht. Ich google. So lÃƒÂ¤uft das hier. Ã°Å¸Ââ€¢Ã°Å¸Ëœâ€¦ #hundemama #haustier #schlaflos"}`;

                // Reminder for description branding
                const brandingReminder = isLittleHabits
                    ? ' Follow the Little Habits metadata rules exactly: the title is 8 words or fewer with no hashtags, and the description ends with exactly 5 lowercase hashtags.'
                    : isWeirdHackV2
                    ? ' CRITICAL: description must start with "the dbt-mind app" as the first 3 words. Follow the weird_hack_v2 caption framework and emoji rules exactly.'
                    : isPermissionV1
                        ? ' CRITICAL: description must start with "the dbt-mind app" as the first 3 words. Follow the permission_v1 caption framework - warmer than v2, quieter on emojis, echo the shame-word in quotes.'
                    : isVentNowStyle
                        ? ' Follow the Vent Now title framework exactly: generate 5 title options, choose best_title, and end the description with exactly 5 lowercase hashtags.'
                    : needsDbtBrandingInDescription
                        ? ' Follow the 4-part DBT caption framework exactly.'
                        : needsSypBrandingInDescription
                            ? ' KRITISCH: saveyourpet.de MUSS AM ANFANG der Description stehen (z.B. "saveyourpet.de hat mir den A*sch gerettet Ã°Å¸Ëœâ€š") - kreativ, nicht werblich!'
                            : '';

                const formatTailInstruction = isWeirdHackV2
                    ? `\n\nFor weird_hack_v2 captions: description opens with "the dbt-mind app", uses the deadpan confession voice, 0-2 emojis from the allowed list only, 5-7 hashtags max on the final line. Never title-case. Never use banned emojis.`
                    : isPermissionV1
                        ? `\n\nFor permission_v1 captions: description opens with "the dbt-mind app", uses the warm-but-direct permission voice, echoes the shame-word from slide 1 in quotes, trends toward ZERO emojis (one max, never for heavy topics like 'empty'/'broken'/'exhausting'), 5-7 hashtags max on the final line. Never title-case. Never use banned emojis.`
                    : isLittleHabits
                        ? `\n\nFor Little Habits metadata: the title is maximum 8 words with no hashtags. The description ends with exactly 5 lowercase hashtags, including #bpd, #dbt, and #bpdrecovery.`
                    : isVentNowStyle
                        ? `\n\nFor vent_now_style metadata: output exactly 5 title options and best_title. Description must end with exactly 5 lowercase hashtags selected for the slide content.`
                    : isDbt
                        ? `\n\nFor DBT captions: output 4 parts with line breaks and hashtags on the final line only.`
                        : `\n\nFor non-DBT captions: keep it to 1-2 sentences max, 1-2 emojis used wisely, 3-5 relevant hashtags.`;

                const systemPrompt = isVentNowStyle ? `You are a TikTok Content Strategist. Your job is to write TikTok metadata for a DBT-Mind Vent Now Style photo carousel.
${languageInstructions}
${brandingInstruction}
## YOUR TASK:
Based on the provided topic, slide 1 hook, and slide texts:
1. Generate exactly 5 TikTok title options using the title framework.
2. Choose the best title as "best_title".
3. Generate a matching description containing only exactly 5 lowercase hashtags.${brandingReminder}${formatTailInstruction}

OUTPUT: Return ONLY a JSON object with "titles", "best_title", and "description" fields. No markdown, no explanation.` : `You are a TikTok Content Strategist. Your job is to write a catchy title (1-line) and a relatable description (caption) for a photo carousel.
${languageInstructions}
${brandingInstruction}
## YOUR TASK:
Based on the provided slide texts, generate:
1. A catchy Title for the post (one line, lowercase is fine).${isLittleHabits ? ' For Little Habits, it must be 8 words or fewer and contain no hashtags.' : ''}
2. A Description/Caption for the post.${brandingReminder}${formatTailInstruction}

OUTPUT: Return ONLY a JSON object with "title" and "description" fields. No markdown, no explanation.`;

                const inferredSlide1Hook = String(slide1Hook || "")
                    || String(slides_text || "").split('\n').find((line: string) => line.trim())?.replace(/^Slide\s*\d+\s*[:\-]\s*/i, '').trim()
                    || "";
                const userPrompt = isVentNowStyle
                    ? `INPUTS:
Topic: ${String(topic || "autonomous Vent Now topic").trim()}
Slide 1 hook: ${inferredSlide1Hook}
Slide texts:
${slides_text}`
                    : `Generate a Title and Description for these slides:
\n${slides_text}`;

                const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
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

                if (!claudeResponse.ok) {
                    const errorData = await claudeResponse.json() as any;
                    return sendJSON({ error: "Claude API Error", details: errorData.error?.message }, claudeResponse.status);
                }

                const rawData = await claudeResponse.json() as any;
                const resultText = rawData.content?.[0]?.text || '';

                const extractedJson = extractBalancedJson(resultText) || stripMarkdownCodeFences(resultText);

                let parsed;
                try {
                    parsed = JSON.parse(extractedJson);
                } catch (parseErr) {
                    parsed = fallbackParseMetadataObject(resultText);
                    if (!parsed) {
                        console.error("[Metadata Gen] JSON Parse Error:", parseErr);
                        console.info("[Metadata Gen] Raw AI Response:", resultText);
                        return sendJSON({
                            error: "Failed to parse metadata JSON",
                            details: String(parseErr),
                            rawText: resultText.substring(0, 1000)
                        }, 500);
                    }
                }

                const formatMetadataDescription = (rawDescription: string, dbtMode: boolean): string => {
                    const text = String(rawDescription || "")
                        .replace(/\r\n/g, '\n')
                        .replace(/[ \t]+\n/g, '\n')
                        .trim();

                    if (!text) return "";

                    const lines = text
                        .split('\n')
                        .map((line: string) => line.trim())
                        .filter(Boolean);

                    if (dbtMode) {
                        const normalized: string[] = [];

                        for (const line of lines) {
                            if (line.startsWith('#')) {
                                normalized.push(line);
                                continue;
                            }

                            normalized.push(
                                line
                                    .replace(/\s*@dbt-?mind\b/ig, '')
                                    .replace(/\s{2,}/g, ' ')
                                    .trim()
                            );
                        }

                        const bodyLines = normalized.filter((line: string) => line && !line.startsWith('#'));
                        const hashtags = normalized
                            .filter((line: string) => line.startsWith('#'))
                            .flatMap((line: string) => line.split(/\s+/))
                            .filter((tag: string) => tag.startsWith('#'))
                            .map((tag: string) => tag.toLowerCase());

                        const uniqueHashtags = [...new Set(hashtags)];
                        const body = bodyLines.join('\n').trim();
                        const hashtagLine = uniqueHashtags.join(' ').trim();

                        return hashtagLine ? `${body}\n${hashtagLine}`.trim() : body;
                    }

                    const hashtagTokens = lines
                        .filter((line: string) => line.startsWith('#'))
                        .flatMap((line: string) => line.split(/\s+/))
                        .filter((tag: string) => tag.startsWith('#'))
                        .map((tag: string) => tag.toLowerCase());

                    const uniqueHashtags = [...new Set(hashtagTokens)];
                    const bodyLines = lines.filter((line: string) => !line.startsWith('#'));
                    let body = bodyLines.join('\n').trim();

                    if (!body && uniqueHashtags.length > 0) {
                        return uniqueHashtags.join(' ');
                    }

                    // If there are many sentences in one block, add a paragraph break for readability.
                    const sentences = body
                        .split(/(?<=[.!?])\s+/)
                        .map((s: string) => s.trim())
                        .filter(Boolean);

                    if (sentences.length >= 3 && !body.includes('\n')) {
                        const splitAt = Math.ceil(sentences.length / 2);
                        body = `${sentences.slice(0, splitAt).join(' ')}\n${sentences.slice(splitAt).join(' ')}`.trim();
                    }

                    return uniqueHashtags.length > 0 ? `${body}\n${uniqueHashtags.join(' ')}`.trim() : body;
                };

                const formatVentNowDescription = (rawDescription: string): string => {
                    const text = String(rawDescription || "")
                        .replace(/\r\n/g, '\n')
                        .replace(/[ \t]+\n/g, '\n')
                        .trim();
                    if (!text) return "";

                    const fallbackTags = ['#bpd', '#dbt', '#bpdrecovery', '#anxiousattachment', '#selfworth'];
                    const hashtagMatches = text.match(/#[a-z0-9_]+/ig) || [];
                    const hashtags = [...new Set(
                        hashtagMatches
                            .map((tag: string) => tag.toLowerCase())
                            .filter((tag: string) => tag !== '#fyp' && tag !== '#foryou')
                    )];

                    for (const tag of fallbackTags) {
                        if (hashtags.length >= 5) break;
                        if (!hashtags.includes(tag)) hashtags.push(tag);
                    }

                    return hashtags.slice(0, 5).join(' ');
                };

                const normalizedTitle = String(
                    isVentNowStyle
                        ? (parsed.best_title || parsed.title || parsed.titles?.[0]?.title || '')
                        : (parsed.title || '')
                ).trim();
                const normalizedDescription = isVentNowStyle
                    ? formatVentNowDescription(String(parsed.description || ''))
                    : formatMetadataDescription(String(parsed.description || ''), isDbt);

                const normalizedTitleForResponse = isLittleHabits
                    ? normalizedTitle
                        .replace(/#[a-z0-9_]+/ig, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 8)
                        .join(' ')
                    : normalizedTitle;

                const metadataHashtagFallbacks = ['#bpd', '#dbt', '#bpdrecovery', '#dbtskills', '#mentalhealth'];
                const responseHashtags = [...new Set(
                    (normalizedDescription.match(/#[a-z0-9_]+/ig) || [])
                        .map((tag: string) => tag.toLowerCase())
                        .filter((tag: string) => tag !== '#fyp' && tag !== '#foryou')
                )];
                if (isLittleHabits) {
                    for (const fallback of metadataHashtagFallbacks) {
                        if (responseHashtags.length >= 5) break;
                        if (!responseHashtags.includes(fallback)) responseHashtags.push(fallback);
                    }
                }

                return sendJSON({
                    title: normalizedTitleForResponse,
                    description: normalizedDescription,
                    ...(isLittleHabits ? { hashtags: responseHashtags.slice(0, 5) } : {})
                });
            } catch (e) {
                console.error("Metadata Generation Error:", e);
                return sendJSON({ error: "Generation failed", details: String(e) }, 500);
            }
        }
        // POST /generate-full - Full end-to-end carousel generation
        else if (cleanPath === "/generate-full" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                // 1. Load BPD Topics
                const bpdTopicsPath = path.join(DATA_DIR, "bpd_topics.json");
                const bpdTopicsContent = readFileSync(bpdTopicsPath, "utf8");
                const bpdData = JSON.parse(bpdTopicsContent);

                // Flatten topics for selection
                const allTopics = bpdData.tiers.flatMap((t: any) => t.topics.map((top: any) => ({ ...top, tier: t.tier, tier_name: t.name })));

                // Select a random topic (or one provided in request body)
                const body = await req.json() as any;
                const preferred_topic = body.preferred_topic;
                const persona_id = body.persona_id || 'luna';

                // Load persona
                const personasPath = path.join(DATA_DIR, "personas.json");
                const personasContent = readFileSync(personasPath, "utf8");
                const personasData = JSON.parse(personasContent);
                const selectedPersona = personasData.personas.find((p: any) => p.id === persona_id) || personasData.personas[0];

                console.log(`[Full Gen] Selected Persona: ${selectedPersona.name} `);

                const selectedTopic = preferred_topic
                    ? allTopics.find((t: any) => t.name.toLowerCase().includes(preferred_topic.toLowerCase())) || allTopics[Math.floor(Math.random() * allTopics.length)]
                    : allTopics[Math.floor(Math.random() * allTopics.length)];

                const randomAngle = selectedTopic.angles[Math.floor(Math.random() * selectedTopic.angles.length)];

                console.log(`[Full Gen] Selected Topic: ${selectedTopic.name} | Angle: ${randomAngle} `);

                // 2. Generate Slides 2-6
                const slideResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 1200,
                        messages: [{
                            role: 'user',
                            content: `You are the DBT - Mind Content Writer.You create viral TikTok slideshow text for the BPD / DBT niche.

## YOUR TASK:
Generate 5 slides(Slides 2 - 6) for a TikTok carousel.Slide 1(the hook) will be generated separately.

                TOPIC: ${selectedTopic.name}
SPECIFIC ANGLE: ${randomAngle}

            ---

## SLIDE PURPOSE:
            - Slide 2: First truth.Calm, direct.Name the experience.
- Slide 3: Deepen the point.Explain WHY.
- Slide 4: The turn / realization.The "aha" moment.
- Slide 5: Continue the insight.Casually mention DBT - Mind app as a TOOL, not the hero.
- Slide 6: Hopeful close.End with Ã°Å¸â€™Å“ emoji.Grounded, not fake - happy.

---

## CRITICAL RULES:
            1. NO EMOJIS on Slides 2 - 5. ONLY Ã°Å¸â€™Å“ on Slide 6.
            2. Each slide = 1 - 2 SHORT, PUNCHY sentences.MAX 30 words per slide.
3. Tone: "Subtle Gen-Z" = authentic, validating, slightly raw.NOT cringe.
4. Use BPD - specific language: splitting, FP, dysregulated, nervous system, trauma bond, etc.
5. Write in FIRST PERSON perspective("I", "you").
6. Slide 5 app mention must feel like a casual aside, NOT a sales pitch.

---

## APP MENTION RULES(Slide 5):
The app should feel like an AFTERTHOUGHT, not the main point.The insight comes first.

Ã¢Å“â€¦ NATIVE PHRASING(USE THESE):
- "The pattern was always there (tracking in DBT-Mind app made it obvious)."
    - "I didn't see it until I started logging triggers in apps like DBT-Mind app."
    - "Mood tracking changed everything - something like DBT-Mind app to see patterns."

Ã¢ÂÅ’ SALESY(NEVER USE - sounds like an ad):
- "DBT-Mind app helped me..."
    - "Tracking in DBT-Mind app showed me..."
    - "DBT-Mind app taught me..."
    - "[Action] in DBT-Mind app [result]"(this structure is too direct)

---

## ANTI - PATTERNS(DO NOT USE):
- "y'all", "I gotchu", "bestie", "raise your hand if..."
    - Generic self - help advice that applies to everyone
        - Clinical / therapist tone("It's important to remember...")
            - Hashtags or calls to action like "follow for more"
                - Multiple emojis or any emoji except Ã°Å¸â€™Å“ on Slide 6

---

## EXAMPLE OUTPUT(Splitting topic):
[
    "One second they're your whole world. The next they're the enemy.",
    "It's not a choice. Your brain literally can't hold both truths at once.",
    "The gray area doesn't exist when your nervous system is in survival mode.",
    "The triggers were always there - I just couldn't see them until I tried mood tracking (apps like DBT-Mind app).",
    "You're not crazy. You're running on a dysregulated system. And you can learn to catch it. Ã°Å¸â€™Å“"
]

## EXAMPLE OUTPUT(FP Dynamics topic):
[
    "That person you can't stop thinking about? You're not in love. You're in withdrawal.",
    "Your brain got addicted to the emotional highs and now their absence feels like death.",
    "FP attachment isn't love. It's your nervous system using someone else to regulate.",
    "I finally saw my pattern when I started journaling it - something like DBT-Mind app makes it hard to ignore.",
    "Real love doesn't feel like survival. You can learn the difference. Ã°Å¸â€™Å“"
]

---

    Now generate 5 slides for the topic "${selectedTopic.name}" with angle "${randomAngle}".

Output format: JSON array of 5 strings ONLY.No markdown, no explanation.`
                        }]
                    })
                });

                const slideData = await slideResponse.json() as any;
                const slideRawText = slideData.content?.[0]?.text || '';
                let slidesText;
                try {
                    const slideJsonMatch = slideRawText.match(/\[[\s\S]*\]/);
                    slidesText = JSON.parse(slideJsonMatch ? slideJsonMatch[0] : slideRawText.replace(/```json | ```/g, '').trim());
                } catch (e) {
                    console.error("[Full Gen] Failed to parse slides:", e);
                    console.info("[Full Gen] Raw Slides Text:", slideRawText);
                    throw new Error("Failed to parse generated slides");
                }

                console.log(`[Full Gen] Generated 5 slides for ${selectedTopic.name}`);

                // 3. Generate Hooks based on slides
                const hookResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 500,
                        messages: [{
                            role: 'user',
                            content: `You are the DBT - Mind Hook Architect.You create viral scroll - stopping hooks for TikTok carousels in the BPD / DBT niche.

## YOUR TASK:
Generate 3 VIRAL HOOKS for Slide 1 that "open the loop" for the story below.

    TOPIC: ${selectedTopic.name}
ANGLE: ${randomAngle}

## CONTEXT(Slides 2 - 6):
${slidesText.map((s: string, i: number) => `Slide ${i + 2}: ${s}`).join('\n')}

---

## HOOK TYPES(choose the best fit):
1. ** Forbidden Knowledge **: "The truth about X that no one talks about"
2. ** Pattern Interrupt **: "You're not X. You're Y."(challenges assumption)
3. ** Transformation **: "6 months ago I was X. Now I Y."

---

## CRITICAL RULES:
1. MAX 12 WORDS per hook.ONE SENTENCE ONLY.
2. NO EMOJIS.
3. DO NOT name "BPD" in the hook.Describe the EXPERIENCE instead.
4. Create a "curiosity gap" that forces a swipe to Slide 2.
5. Be specific, not generic.

---

## EXAMPLE HOOKS:
- "The truth about your 'favorite person' that no one talks about"
    - "Why losing your FP feels like actual death"
    - "You're not empathic. You're hypervigilant."
    - "The moment they go from soulmate to enemy"
    - "Why you push away everyone who gets close"
    - "That's not a connection. That's a trauma bond."

---

    Output format: JSON array of 3 strings ONLY.No markdown, no explanation.`
                        }]
                    })
                });

                const hookDataRes = await hookResponse.json() as any;
                const hookRawText = hookDataRes.content?.[0]?.text || '';
                let hooks;
                try {
                    const hookJsonMatch = hookRawText.match(/\[[\s\S]*\]/);
                    hooks = JSON.parse(hookJsonMatch ? hookJsonMatch[0] : hookRawText.replace(/```json | ```/g, '').trim());
                } catch (e) {
                    console.error("[Full Gen] Failed to parse hooks:", e);
                    console.info("[Full Gen] Raw Hooks Text:", hookRawText);
                    throw new Error("Failed to parse generated hooks");
                }
                if (Array.isArray(hooks) && hooks.length > 0) {
                    const fallbackProblem = String(selectedTopic?.name || "this pattern").toLowerCase();
                    hooks = hooks.map((h: string) => formatDbtSlide1Hook(h, fallbackProblem));
                }

                console.log(`[Full Gen] Generated 3 hooks for ${selectedTopic.name}`);

                // 4. Load scroll-stopping elements
                const scrollStoppersPath = path.join(DATA_DIR, "scroll_stoppers.json");
                const scrollStoppersContent = readFileSync(scrollStoppersPath, "utf8");
                const scrollStoppers = JSON.parse(scrollStoppersContent);

                // Pick random elements for Image 1
                const randomGesture = scrollStoppers.gestures[Math.floor(Math.random() * scrollStoppers.gestures.length)];
                const randomExpression = scrollStoppers.expressions[Math.floor(Math.random() * scrollStoppers.expressions.length)];
                const randomPosition = scrollStoppers.positions[Math.floor(Math.random() * scrollStoppers.positions.length)];

                console.log(`[Full Gen]Scroll - stoppers: ${randomGesture.id}, ${randomExpression.id}, ${randomPosition.id} `);

                // 5. Generate Image Prompts
                const imagePromptResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 2500,
                        messages: [{
                            role: 'user',
                            content: `You are the DBT - Mind Image Prompt Generator.Create 6 image prompts for a TikTok carousel.

## CONTEXT:
TOPIC: ${selectedTopic.name}
HOOK: ${hooks[0]}

SLIDE TEXT:
Slide 1: ${hooks[0]}
${slidesText.map((s: string, i: number) => `Slide ${i + 2}: ${s}`).join('\n')}

---

## CHARACTER PERSONA(MUST USE - this is the consistent character for all 6 images):
${JSON.stringify(selectedPersona, null, 2)}

CRITICAL: The subject's hair, accessories, and pet MUST match the persona above exactly.
    - Hair: ${selectedPersona.subject.hair.color}, ${selectedPersona.subject.hair.style}
- Accessories: ${selectedPersona.accessories.earrings}, ${selectedPersona.accessories.jewelry}
- Pet: ${selectedPersona.pet ? selectedPersona.pet.description : 'No pet'}

Clothing and setting can vary based on the topic, but the PERSON must be consistent.

---

## SCROLL - STOPPING ELEMENTS FOR IMAGE 1(MUST USE):
Use these EXACT elements for Image 1 to maximize engagement:

GESTURE: ${randomGesture.description}
EXPRESSION: ${randomExpression.description}
POSITION / POSE: ${randomPosition.description}

These elements make the image interesting and scroll - stopping while staying authentic.

---

## SETTING VARIETY(STRICTLY NO BATHROOMS):
Choose settings based on topic, but VARY them:
- Bedroom: bed visible, natural daylight or lamp
    - Living room couch: relaxed, blanket, warm lighting
        - Car: steering wheel visible, daylight through windows
            - Kitchen: morning light, coffee mug nearby
                - Window seat: natural light, hopeful energy

---

## CORE INSTRUCTION (AMATEUR SNAPCHAT VIBE)
Preserve exact facial identity (bone structure, eyes, nose, lips). Adapt style/mood without altering identity.
Vibe: Spontaneous candid photo someone sends to a friend on Snapchat. Amateur quality, slightly raw, 100% unposed. NO UI elements or text in the image. Brighter, everyday lighting.

## REALISM RULES(CRITICAL):
1. Skin is NEVER smooth or filtered. Include visible micro-pores, natural oils, and peach fuzz. NO plastic skin.
2. Makeup: Sharp elegant black winged eyeliner, defined lashes, muted lips with satin finish. Natural glow.
3. Clothes: Fashion-forward outfit (jacket/zip-up with graphic prints). Realistic fabric folds.
4. Overall vibe: "Pretty but comedically overwhelmed" German pet owner. CUTE MESSY, not distressed.
5. NO MIRRORS: Strictly avoid any mention of mirrors, reflects in glass, or looking into a mirror.
6. NO BATHROOMS: Strictly avoid any mention of bathrooms, toilets, or showers.
7. NO TEXT/UI: Strictly avoid any text overlays, buttons, or UI elements in the image itself.

## CAMERA TYPE(Amateur Selfie):
Standard smartphone camera style, casual eye-level or slightly tilted angle.
DEEP FOCUS: Everything in the image must be sharp and clear. NO background blur, NO bokeh, NO unsharpness.
Natural lighting, clear and bright. No ring light, no professional polish, no beauty filters.
Vertical 9:16 format.


---

## IMAGE 1 FORMAT(JSON - Scroll - Stopper):
Must be a complete JSON object with these sections:
- subject(description, age, hair, clothing, face with makeup and expression)
- pose(phone_hand, other_hand gesture)
    - accessories(earrings, jewelry, phone_case)
    - photography(camera_style, angle, quality, lighting)
    - background(setting, elements array with pet in REALISTIC position, lighting)

## IMAGES 2 - 6 FORMAT(Text - Calm Progression):
Each is a single descriptive sentence covering:
- Same person, same outfit, same pet(in different but realistic position)
    - Selfie type and setting (can change rooms naturally)
- Expression(calm, not matching slide 1 intensity)
    - Lighting(progressing toward warmer)

### Expression Guide for Images 2 - 6:
    - Image 2: neutral, direct, calm
        - Image 3: thoughtful, slightly reflective
            - Image 4: processing, subtle understanding
                - Image 5: soft half - smile, "figured something out"
                    - Image 6: genuine warmth, peaceful, grounded, hopeful

---

## OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
    "image1": { /* full JSON prompt */ },
${Array.from({ length: (slidesText.length + 1) - 1 }, (_, i) => `    "image${i + 2}": "text prompt..."`).join(',\n')}
}

Output ONLY the JSON object.No markdown, no explanation.`
                        }]
                    })
                });

                const imagePromptData = await imagePromptResponse.json() as any;
                let imagePrompts;
                try {
                    imagePrompts = JSON.parse(imagePromptData.content[0].text.replace(/```json | ```/g, '').trim());
                } catch (e) {
                    console.error("Failed to parse image prompts:", e);
                    imagePrompts = null;
                }

                console.log(`[Full Gen] Generated image prompts for ${selectedTopic.name}`);

                return sendJSON({
                    topic: selectedTopic.name,
                    angle: randomAngle,
                    slides: slidesText,
                    hooks: hooks,
                    imagePrompts: imagePrompts
                });

            } catch (err) {
                console.error("Full Generation Error:", err);
                return sendJSON({ error: "Full generation failed", details: String(err) }, 500);
            }
        }
        // POST /generate-image - Generate image
        else if (cleanPath === "/generate-image" && method === "POST") {
            if (!OPENAI_API_KEY) {
                return sendJSON({ error: "OpenAI API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { prompt, aspect_ratio = "9:16", count = 1, character_id, service, flow } = body;

                    if (!prompt) {
                        return sendJSON({ error: "Prompt is required" }, 400);
                    } else {
                        // ONLY load anchor for SYP service
                        let anchor = null;
                        if (service === 'syp' && character_id) {
                            anchor = getAnchorImage(character_id, ANCHORS_DIR);
                        } else {
                            console.log(`[Image Gen] Skipping anchor load for service: ${service || 'unknown'} (DBT uses pure prompting)`);
                        }

                        console.log(`[Image Gen] Generating ${count} image(s) ${anchor ? "with character anchor" : "pure prompt"}...`);

                        let flatPrompt = flattenImagePrompt(prompt, { includeUgcStyle: service !== 'dbt' });
                        const effectiveFlow = service === 'dbt' ? (flow || "weird_hack") : flow;
                        if (service === 'dbt' && effectiveFlow === 'weird_hack_v2') {
                            flatPrompt = buildWeirdHackV2NanoBananaPrompt(flatPrompt);
                        }

                        const imageSize = getImageSizeForFlow(service, flow);
                        let result;
                        if (anchor) {
                            result = await generateImageWithReferences(flatPrompt, [anchor], OPENAI_API_KEY, {
                                aspectRatio: aspect_ratio,
                                imageSize
                            });
                        } else {
                            result = await generateImage(flatPrompt, OPENAI_API_KEY, {
                                aspectRatio: aspect_ratio,
                                imageSize
                            });
                        }

                        if (result.success && result.images) {
                            return sendJSON({
                                success: true,
                                images: result.images.map(img => ({
                                    data: img.data,
                                    mime_type: img.mimeType
                                }))
                            });
                        } else {
                            return sendJSON({
                                success: false,
                                error: result.error || "Image generation failed"
                            }, 500);
                        }
                    }
                } catch (err) {
                    console.error("Image Generation Error:", err);
                    return sendJSON({
                        error: "Image generation failed",
                        details: err instanceof Error ? err.message : String(err)
                    }, 500);
                }
            }
        }
        // POST /generate-ai-images - Generate all carousel images
        // ---- Local photo library (folders of images that live outside the repo) ----
        // GET /image-library                      -> list sets (folders containing images)
        // GET /image-library/images?set=<rel>     -> filenames in that set
        // GET /image-library/file?set=<rel>&name= -> the image bytes
        else if (cleanPath === "/image-library" && method === "GET") {
            try {
                const sets = listImageLibrarySets();
                return sendJSON({ root: IMAGE_LIBRARY_ROOT, sets });
            } catch (e) {
                return sendJSON({ error: "Could not read image library", details: String(e) }, 500);
            }
        }
        else if (cleanPath === "/image-library/images" && method === "GET") {
            try {
                const dir = resolveImageLibraryDir(url.searchParams.get("set") || "");
                if (!dir) return sendJSON({ error: "Unknown set" }, 400);
                const images = readdirSync(dir).filter(isLibraryImage).sort();
                return sendJSON({ images, count: images.length });
            } catch (e) {
                return sendJSON({ error: "Could not read set", details: String(e) }, 500);
            }
        }
        else if (cleanPath === "/image-library/file" && method === "GET") {
            try {
                const dir = resolveImageLibraryDir(url.searchParams.get("set") || "");
                const name = path.basename(url.searchParams.get("name") || "");
                if (!dir || !name || !isLibraryImage(name)) {
                    return sendJSON({ error: "Bad request" }, 400);
                }
                const filePath = path.join(dir, name);
                if (!existsSync(filePath)) return sendJSON({ error: "Not found" }, 404);
                const ext = path.extname(name).toLowerCase();
                const mime = ext === ".png" ? "image/png"
                    : ext === ".webp" ? "image/webp"
                    : ext === ".gif" ? "image/gif" : "image/jpeg";
                const headers = new Headers(corsHeaders);
                headers.set("Content-Type", mime);
                headers.set("Cache-Control", "public, max-age=3600");
                return new Response(readFileSync(filePath), { headers });
            } catch (e) {
                return sendJSON({ error: "Could not read image", details: String(e) }, 500);
            }
        }
        // GET /lh/formats - list the institutional-parody carousel formats
        else if (cleanPath === "/lh/formats" && method === "GET") {
            return sendJSON({
                formats: Object.entries(LH_FORMATS).map(([id, f]) => ({ id, label: f.label, premise: f.premise }))
            });
        }
        // POST /generate-lh-format - write copy for one parody carousel (returns render specs)
        else if (cleanPath === "/generate-lh-format" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API Key missing");
                const body = await req.json() as any;
                const format = String(body?.format || '') as LhFormatId;
                if (!LH_FORMATS[format]) {
                    return sendJSON({ error: `Unknown format. Valid: ${Object.keys(LH_FORMATS).join(', ')}` }, 400);
                }
                const result = await generateLhFormatSlides({
                    format,
                    theme: typeof body?.theme === 'string' ? body.theme : undefined,
                    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!
                });
                return sendJSON(result);
            } catch (e) {
                console.error("[LH Format] Error:", e);
                return sendJSON({ error: "LH format generation failed", details: String(e) }, 500);
            }
        }
        else if (cleanPath === '/meme-assets' && method === 'GET') {
            try { return sendJSON(await getMemeAssets()); }
            catch { return sendJSON({ error: 'Could not scan the meme asset folder.' }, 500); }
        }
        else if (cleanPath === '/meme-assets/analyze' && method === 'POST') {
            if (!ANTHROPIC_API_KEY) return sendJSON({ error: 'Anthropic API key is not configured.' }, 503);
            try { return sendJSON(await startMemeAnalysis(ANTHROPIC_API_KEY)); }
            catch { return sendJSON({ error: 'Could not start asset analysis.' }, 500); }
        }
        else if (cleanPath === '/meme-assets/labels' && method === 'POST') {
            try {
                const body: any = await req.json();
                if (typeof body?.id !== 'string' || typeof body?.override !== 'string' || body.override.length > 1500) return sendJSON({ error: 'Provide an asset ID and up to 1500 characters of label corrections.' }, 400);
                return sendJSON(await editMemeLabels(body.id, body.override));
            } catch { return sendJSON({ error: 'Could not save label corrections.' }, 500); }
        }
        else if (cleanPath === '/meme-assets/select' && method === 'POST') {
            if (!ANTHROPIC_API_KEY) return sendJSON({ error: 'Anthropic API key is not configured.' }, 503);
            try {
                const body: any = await req.json();
                if (!Array.isArray(body?.slides) || body.slides.length < 1 || body.slides.length > 6 ||
                    body.slides.some((s: any) => !s || !['hook', 'point'].includes(s.role) || ['headline', 'body', 'leftLabel', 'rightLabel'].some((k) => typeof s[k] !== 'string' || s[k].length > 3000))) return sendJSON({ error: 'Provide one to six cover/point slides.' }, 400);
                if (body.alternative && (typeof body.alternative.id !== 'string' || !['left', 'right', 'accentLeft', 'accentRight'].includes(body.alternative.side))) return sendJSON({ error: 'Invalid alternative request.' }, 400);
                const alreadyUsed = Array.isArray(body.alreadyUsed) ? body.alreadyUsed : [];
                if (alreadyUsed.length > 400 || alreadyUsed.some((id: any) => typeof id !== 'string' || id.length > 64)) return sendJSON({ error: 'Invalid used-image list.' }, 400);
                return sendJSON(await selectMemeAssets(ANTHROPIC_API_KEY, body.slides, body.alternative, alreadyUsed));
            } catch (error) { console.error('[Meme assets]', error); return sendJSON({ error: 'Image selection failed. Check the asset analysis status and retry.' }, 500); }
        }
        else if (cleanPath === "/generate-meme-slideshow" && method === "POST") {
            try {
                const body = await req.json() as any;
                if (!body || (body.topic !== undefined && (typeof body.topic !== 'string' || body.topic.length > 500))) {
                    return sendJSON({ error: "Topic direction must be text of up to 500 characters." }, 400);
                }
                if (body.previousTopics !== undefined && (!Array.isArray(body.previousTopics) || body.previousTopics.length > 50 ||
                    body.previousTopics.some((topic: unknown) => typeof topic !== 'string' || topic.length > 500))) {
                    return sendJSON({ error: "Recent topics must be a list of up to 50 short titles." }, 400);
                }
                if ((body.theme !== undefined && (typeof body.theme !== 'string' || body.theme.length > 120)) ||
                    (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 2000))) {
                    return sendJSON({ error: "Theme or notes exceed the allowed length." }, 400);
                }
                if (!ANTHROPIC_API_KEY) return sendJSON({ error: "Anthropic API key is not configured on the server." }, 503);
                return sendJSON(await generateMemeSlideshow({
                    topic: body.topic?.trim(), theme: body.theme, notes: body.notes, previousTopics: body.previousTopics,
                    language: body.language, model: body.model, ANTHROPIC_API_KEY,
                }));
            } catch (error) {
                console.error("[Meme Slideshow] Generation failed:", error);
                return sendJSON({ error: "Meme slideshow generation failed. Please retry." }, 500);
            }
        }
        // GET /ss-sounds - three sound suggestions for the current slideshow post
        else if (cleanPath === "/ss-sounds" && method === "GET") {
            if (!SCRAPE_CREATORS_API_KEY) return sendJSON({ error: "ScrapeCreators API key is not configured." }, 503);
            try {
                const params = new URL(req.url).searchParams;
                const exclude = (params.get("exclude") || "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 60);
                const count = Math.min(Math.max(parseInt(params.get("count") || "3", 10) || 3, 1), 10);
                return sendJSON(await recommendSsSounds(SCRAPE_CREATORS_API_KEY, count, exclude, params.get("refresh") === "1"));
            } catch (error) {
                console.error("[SS Sounds] Recommendation failed:", error);
                return sendJSON({ error: "Sound suggestions could not be loaded. Please retry." }, 500);
            }
        }
        // GET /ss-sounds/audio - proxy the CDN stream so the browser never sees the API key
        // and an expired URL can be refetched transparently.
        else if (cleanPath === "/ss-sounds/audio" && method === "GET") {
            if (!SCRAPE_CREATORS_API_KEY) return new Response("Not configured", { status: 503 });
            try {
                const id = (new URL(req.url).searchParams.get("id") || "").trim();
                if (!/^[0-9]{5,32}$/.test(id)) return new Response("Invalid id", { status: 400 });
                const target = await resolveSoundAudio(SCRAPE_CREATORS_API_KEY, id);
                if (!target) return new Response("Sound not found", { status: 404 });
                const range = req.headers.get("range");
                const upstream = await fetch(target, { headers: range ? { range } : {}, signal: AbortSignal.timeout(30000) });
                if (!upstream.ok || !upstream.body) return new Response("Upstream error", { status: 502 });
                const headers = new Headers(corsHeaders);
                for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
                    const value = upstream.headers.get(key);
                    if (value) headers.set(key, value);
                }
                headers.set("cache-control", "public, max-age=3600");
                return new Response(upstream.body, { status: upstream.status, headers });
            } catch (error) {
                console.error("[SS Sounds] Audio proxy failed:", error);
                return new Response("Audio unavailable", { status: 502 });
            }
        }
        // POST /generate-ss-topic-seeds - generate the topic list used by the legacy flow
        else if (cleanPath === "/generate-ss-topic-seeds" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API Key missing");
                const body = await req.json() as any;
                const requestedModel = String(body?.model || 'claude-fable-5').trim();
                const model = ['claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-4-6'].includes(requestedModel)
                    ? requestedModel
                    : 'claude-fable-5';
                const result = await generateSsTopicSeeds({
                    model,
                    usedSeeds: Array.isArray(body?.usedSeeds) ? body.usedSeeds : [],
                    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!
                });
                return sendJSON(result);
            } catch (e) {
                console.error("[SS Topic Seeds] Error:", e);
                return sendJSON({ error: "Topic seed generation failed", details: String(e) }, 500);
            }
        }
        // POST /generate-ss-slideshow - write copy for one aesthetic photo slideshow (copy only)
        else if (cleanPath === "/generate-ss-slideshow" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API Key missing");
                const body = await req.json() as any;
                const requestedModel = String(body?.model || 'claude-fable-5').trim();
                const model = ['claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-4-6'].includes(requestedModel)
                    ? requestedModel
                    : 'claude-fable-5';
                const result = await generateSsSlideshow({
                    theme: typeof body?.theme === 'string' ? body.theme : undefined,
                    language: body?.language === 'de' ? 'de' : 'en',
                    format: ['legacy', 'simple', 'dbt', 'hacks', 'meme'].includes(String(body?.format)) ? String(body.format) : 'current',
                    topicSeed: typeof body?.topicSeed === 'string' ? body.topicSeed : undefined,
                    archetype: typeof body?.archetype === 'string' ? body.archetype : undefined,
                    territory: typeof body?.territory === 'string' ? body.territory : undefined,
                    hook: typeof body?.hook === 'string' ? body.hook : undefined,
                    previousTexts: Array.isArray(body?.previousTexts) ? body.previousTexts : undefined,
                    model,
                    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!
                });
                return sendJSON(result);
            } catch (e) {
                console.error("[SS Slideshow] Error:", e);
                return sendJSON({ error: "Slideshow generation failed", details: String(e) }, 500);
            }
        }
        // POST /generate-the-script - write copy for one "The Script" 9-slide text slideshow
        else if (cleanPath === "/generate-the-script" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API Key missing");
                const body = await req.json() as any;
                const result = await generateTheScriptSlideshow({
                    scenario: typeof body?.scenario === 'string' ? body.scenario : undefined,
                    pov: typeof body?.pov === 'string' ? body.pov : undefined,
                    tone: typeof body?.tone === 'string' ? body.tone : undefined,
                    theme: typeof body?.theme === 'string' ? body.theme : undefined,
                    language: typeof body?.language === 'string' ? body.language : undefined,
                    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!
                });
                return sendJSON(result);
            } catch (e) {
                console.error("[The Script] Error:", e);
                return sendJSON({ error: "The Script generation failed", details: String(e) }, 500);
            }
        }
        // GET /ss/formats - list batch slideshow formats
        else if (cleanPath === "/ss/formats" && method === "GET") {
            return sendJSON({
                formats: Object.entries(SS_FORMATS).map(([id, f]) => ({ id, label: f.label, premise: f.premise }))
            });
        }
        // POST /generate-ss-batch - generate N complete post bundles (images + texts + funnel)
        else if (cleanPath === "/generate-ss-batch" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API Key missing");
                const body = await req.json() as any;
                const result = await generateSsBatch({
                    count: typeof body?.count === 'number' ? body.count : 5,
                    theme: typeof body?.theme === 'string' ? body.theme : undefined,
                    formats: Array.isArray(body?.formats) ? body.formats as SsFormatId[] : undefined,
                    accountId: typeof body?.account === 'string' ? body.account : undefined,
                    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!
                });
                return sendJSON(result);
            } catch (e) {
                console.error("[SS Batch] Error:", e);
                return sendJSON({ error: "Batch generation failed", details: String(e) }, 500);
            }
        }
        else if (cleanPath === "/generate-stickers" && method === "POST") {
            if (!OPENAI_API_KEY) {
                return sendJSON({ error: "OpenAI API Key not configured" }, 500);
            }
            try {
                const body = await req.json() as any;
                const rawStickers = Array.isArray(body?.stickers) ? body.stickers : [];

                const stickerJobs = rawStickers
                    .map((st: any, orderIndex: number) => ({
                        prompt: String(st?.prompt || st?.description || "").trim(),
                        slot: String(st?.slot || "center").trim().toLowerCase(),
                        slideIndex: Number.isInteger(st?.slideIndex) ? st.slideIndex : null,
                        orderIndex
                    }))
                    .filter((st: { prompt: string }) => st.prompt.length > 0)
                    .slice(0, 24);

                if (stickerJobs.length === 0) {
                    return sendJSON({ error: "stickers array with at least one prompt is required" }, 400);
                }

                const STICKER_STYLE_SUFFIX = "Cute kawaii sticker illustration in a soft 3D clay render style, pastel colors, rounded friendly shapes, smooth gradients, gentle shading, cozy gen-z aesthetic. Isolated die-cut sticker, single subject, clean crisp edges, no text, no letters, no logos, no background, no ground shadow, centered composition with margin around the subject.";

                console.log(`[Stickers] Generating ${stickerJobs.length} transparent sticker(s)...`);

                const results: Array<{ orderIndex: number; slot: string; slideIndex: number | null; success: boolean; image?: any; error?: string }> = [];
                let nextIndex = 0;
                const workerCount = Math.min(IMAGE_GEN_CONCURRENCY, stickerJobs.length);
                const workers = Array.from({ length: workerCount }, async () => {
                    while (true) {
                        const current = nextIndex++;
                        if (current >= stickerJobs.length) break;
                        const job = stickerJobs[current];
                        if (!job) continue;

                        const result = await generateImage(
                            `${job.prompt}. ${STICKER_STYLE_SUFFIX}`,
                            OPENAI_API_KEY!,
                            { aspectRatio: "1:1", imageSize: "1K", background: "transparent", model: "gpt-image-1" }
                        );

                        results.push({
                            orderIndex: job.orderIndex,
                            slot: job.slot,
                            slideIndex: job.slideIndex,
                            success: result.success,
                            image: result.success ? result.images?.[0] : undefined,
                            error: result.success ? undefined : (result.error || "Sticker generation failed")
                        });
                    }
                });
                await Promise.all(workers);

                results.sort((a, b) => a.orderIndex - b.orderIndex);
                return sendJSON({ results });
            } catch (e) {
                console.error("[Stickers] Error:", e);
                return sendJSON({ error: "Sticker generation failed", details: String(e) }, 500);
            }
        }
        else if (cleanPath === "/generate-ai-images" && method === "POST") {
            if (!OPENAI_API_KEY) {
                return sendJSON({ error: "OpenAI API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { imagePrompts, character_id, service, brandingMode, referenceImages = [], flow, storyAiFlow } = body;
                    const effectiveFlow = service === 'dbt' ? (flow || 'weird_hack') : flow;

                    if (!imagePrompts) {
                        return sendJSON({ error: "imagePrompts object is required" }, 400);
                    } else {
                        // Find all image prompts dynamically (image1, image2, ..., imageN)
                        const imageKeys = Object.keys(imagePrompts)
                            .filter(key => /^image\d+$/.test(key))
                            .sort((a, b) => parseInt(a.replace('image', '')) - parseInt(b.replace('image', '')));

                        console.log(`[Carousel Images] Generating ${imageKeys.length} carousel images for character: ${character_id || 'unspecified'}...`);

                        const promptsWithIndices: { prompt: string, index: number, originalPrompt: string }[] = [];
                        for (const key of imageKeys) {
                            if (imagePrompts[key]) {
                                const index = parseInt(key.replace('image', '')) - 1; // 0-indexed
                                promptsWithIndices.push({
                                    prompt: flattenImagePrompt(imagePrompts[key], { includeUgcStyle: service !== 'dbt' }),
                                    originalPrompt: imagePrompts[key],
                                    index: index
                                });
                            }
                        }

                        if (promptsWithIndices.length === 0) {
                            return sendJSON({ error: "No valid image prompts found" }, 400);
                        } else {
                            // Prepare base references: user provided + optional character anchor
                            const baseReferences = referenceImages.map((ref: any) => ({
                                data: ref.data,
                                mimeType: ref.mimeType || ref.mime_type || "image/png"
                            }));
                            const iFeelReferencePaths = service === 'dbt' && effectiveFlow === 'i_say_they_say'
                                ? getDbtIFeelReferencePaths(character_id)
                                : [];
                            const shuffledIFeelReferencePaths = [...iFeelReferencePaths].sort(() => Math.random() - 0.5);
                            const uniqueIFeelReferencePathBySlide = new Map<number, string>();
                            if (shuffledIFeelReferencePaths.length > 0) {
                                promptsWithIndices.forEach((item, orderIndex) => {
                                    const assignedPath = shuffledIFeelReferencePaths[orderIndex];
                                    if (assignedPath) {
                                        uniqueIFeelReferencePathBySlide.set(item.index, assignedPath);
                                    }
                                });
                            }

                            // If no user references, check for anchor (SYP only)
                            if (baseReferences.length === 0 && service === 'syp' && character_id) {
                                const anchor = getAnchorImage(character_id, ANCHORS_DIR);
                                if (anchor) baseReferences.push(anchor);
                            }

                            // Generate images in parallel (capped)
                            const workerCount = Math.min(IMAGE_GEN_CONCURRENCY, promptsWithIndices.length);
                            const results: Array<{ slideIndex: number; result: any }> = [];
                            let nextIndex = 0;
                            const workers = Array.from({ length: workerCount }, async () => {
                                while (true) {
                                    const current = nextIndex++;
                                    if (current >= promptsWithIndices.length) break;
                                    const item = promptsWithIndices[current];
                                    if (!item) continue;
                                    console.log(`[Carousel Images] Generating slide ${item.index + 1}/${imageKeys.length}...`);

                                let finalPrompt = item.prompt;
                                let finalReferences = [...baseReferences];
                                const usesLegacyDbtFixedReferences =
                                    service === 'dbt' &&
                                    !storyAiFlow &&
                                    effectiveFlow !== 'i_say_they_say' &&
                                    effectiveFlow !== 'weird_hack_v2' &&
                                    effectiveFlow !== 'permission_v1';

                                if (service === 'dbt' && effectiveFlow === 'weird_hack_v2') {
                                    finalPrompt = buildWeirdHackV2NanoBananaPrompt(finalPrompt);
                                } else if (service === 'dbt' && effectiveFlow === 'permission_v1' && item.index >= 1 && item.index <= 6) {
                                    finalPrompt = buildPermissionV1NanoBananaPrompt(finalPrompt);
                                }

                                if (service === 'dbt' && effectiveFlow === 'i_say_they_say') {
                                    const assignedReferencePath = uniqueIFeelReferencePathBySlide.get(item.index);
                                    const iFeelReference = assignedReferencePath
                                        ? loadFixedReferenceImages([assignedReferencePath], `DBT I Feel Slide ${item.index + 1}:${character_id || 'hannahbpd'}`)
                                        : getDbtSlide1References(character_id, effectiveFlow);
                                    if (iFeelReference.length > 0) {
                                        finalReferences.push(...iFeelReference);
                                    }
                                }

                                if (service === 'dbt' && effectiveFlow === 'permission_v1') {
                                    const slideNumber = item.index + 1;
                                    const permissionV1References = getDbtPermissionV1SlideReferences(character_id, slideNumber);
                                    if (permissionV1References.length > 0) {
                                        finalReferences.push(...permissionV1References);
                                        console.log(`[Carousel Images] Added ${permissionV1References.length} permission_v1 reference(s) for DBT slide ${slideNumber}`);
                                    }
                                }

                                if (service === 'dbt' && storyAiFlow) {
                                    finalPrompt += `\n\nSTORY AI COUPLE FLOW:
- Use the provided Slide 1 reference image as the identity anchor for the couple.
- Generate a new candid photo of the same couple in the requested setting, not a remake of Slide 1.
- Keep the couple believable and consistent: same apparent ages, faces when visible, hair, skin tone, body types, and style.
- Do not preserve the exact outfits by default. Use natural casual outfit changes that fit the new setting, weather, and time of day.
- Reuse the same outfits only when the new image plausibly belongs to the same outing or location as Slide 1, such as another beach/date/trip photo.
- If the prompt asks for a selfie, make it an actual casual couple selfie taken by one partner at arm length, with natural phone-camera distortion and imperfect framing.
- It is acceptable for the couple to be seen from behind, as silhouettes, partially hidden, or from far away.
- Keep it spontaneous, imperfect, vertical 9:16 iPhone relationship-photo aesthetic.
- Do not add readable text, logos, extra people, studio lighting, fantasy scenes, or influencer-style posing.`;
                                }

                                if (usesLegacyDbtFixedReferences && item.index === 0) {
                                    const slide1References = getDbtSlide1References(character_id, effectiveFlow);
                                    if (slide1References.length > 0) {
                                        finalReferences.push(...slide1References);
                                        const fixedSlide1Prompt = getDbtFixedSlide1Prompt(effectiveFlow);
                                        if (fixedSlide1Prompt) {
                                            finalPrompt += `\n\nCRITICAL: ${fixedSlide1Prompt}`;
                                        }
                                        console.log(`[Carousel Images] Added ${slide1References.length} fixed reference(s) for DBT slide 1`);
                                    }
                                }

                                if (usesLegacyDbtFixedReferences && item.index === 1) {
                                    const slide2References = getDbtSlide2References(character_id, effectiveFlow);
                                    if (slide2References.length > 0) {
                                        finalReferences.push(...slide2References);
                                        finalPrompt += `\n\nCRITICAL: ${getDbtFixedSlide2Prompt(character_id, effectiveFlow)}`;
                                        console.log(`[Carousel Images] Added ${slide2References.length} fixed reference(s) for DBT slide 2`);
                                    }
                                }

                                if (usesLegacyDbtFixedReferences && item.index === 2) {
                                    const slide3References = getDbtSlide3References(character_id, effectiveFlow);
                                    if (slide3References.length > 0) {
                                        finalReferences.push(...slide3References);
                                        finalPrompt += `\n\nCRITICAL: ${getDbtFixedSlide3Prompt(character_id, effectiveFlow)}`;
                                        console.log(`[Carousel Images] Added ${slide3References.length} fixed reference(s) for DBT slide 3`);
                                    }
                                }

                                if (usesLegacyDbtFixedReferences && item.index === 3) {
                                    const slide4References = getDbtSlide4References(character_id, effectiveFlow);
                                    if (slide4References.length > 0) {
                                        finalReferences.push(...slide4References);
                                        const fixedSlide4Prompt = getDbtFixedSlide4Prompt(effectiveFlow);
                                        if (fixedSlide4Prompt) {
                                            finalPrompt += `\n\nCRITICAL: ${fixedSlide4Prompt}`;
                                        }
                                        console.log(`[Carousel Images] Added ${slide4References.length} fixed reference(s) for DBT slide 4`);
                                    }
                                }

                                // Slide 5 in DBT uses fixed visual references to avoid the generic AI look.
                                if (usesLegacyDbtFixedReferences && item.index === 4) {
                                    const slide5References = getDbtSlide5References(character_id, effectiveFlow);
                                    if (slide5References.length > 0) {
                                        finalReferences.push(...slide5References);
                                        const fixedSlide5Prompt = getDbtFixedSlide5Prompt(character_id, effectiveFlow);
                                        if (fixedSlide5Prompt) {
                                            finalPrompt += `\n\nCRITICAL: ${fixedSlide5Prompt}`;
                                        }
                                        console.log(`[Carousel Images] Added ${slide5References.length} fixed reference(s) for DBT slide 5`);
                                    }
                                }

                                // Website screenshot injection for SYP
                                const isSypProject = service === 'syp';
                                const saveyourpetKeywords = ['saveyourpet.de', 'saveyourpet', 'absicherung', 'vorsorge', 'schutz fÃƒÂ¼r', 'laptop screen showing'];
                                const lowerPrompt = (finalPrompt + ' ' + item.originalPrompt).toLowerCase();
                                const needsWebsiteScreenshot = isSypProject && brandingMode === 'full' && saveyourpetKeywords.some(kw => lowerPrompt.includes(kw));

                                if (needsWebsiteScreenshot) {
                                    const websiteScreenshotPath = path.join(DATA_DIR, "anchors", "saveyourpet", "website_screenshot_laptop.png");
                                    if (existsSync(websiteScreenshotPath)) {
                                        try {
                                            const screenshotData = readFileSync(websiteScreenshotPath).toString('base64');
                                            finalReferences.push({ data: screenshotData, mimeType: "image/png" });
                                            finalPrompt += "\n\nCRITICAL: The laptop screen MUST display the saveyourpet.de website exactly as shown in the reference image.";
                                        } catch (e) { console.warn("Failed to load SYP screenshot", e); }
                                    }
                                }

                                    const imageSize = getImageSizeForFlow(service, effectiveFlow);
                                    const result = finalReferences.length > 0
                                        ? await generateImageWithReferences(finalPrompt, finalReferences, OPENAI_API_KEY!, { aspectRatio: (body.aspectRatio || "9:16") as any, imageSize })
                                        : await generateImage(finalPrompt, OPENAI_API_KEY!, { aspectRatio: (body.aspectRatio || "9:16") as any, imageSize });

                                results.push({
                                    slideIndex: item.index,
                                    result: result
                                });

                                }
                            });

                            await Promise.all(workers);

                            const images = results.map(r => {
                                const firstImage = r.result.images?.[0];
                                return {
                                    slideIndex: r.slideIndex,
                                    success: r.result.success,
                                    image: firstImage ? {
                                        data: firstImage.data,
                                        mime_type: firstImage.mimeType
                                    } : null,
                                    error: r.result.error
                                };
                            });

                            const successCount = images.filter(i => i.success).length;
                            console.log(`[Carousel Images] Generated ${successCount}/${promptsWithIndices.length} images`);

                            return sendJSON({
                                success: successCount > 0,
                                images: images,
                                stats: {
                                    total: promptsWithIndices.length,
                                    successful: successCount,
                                    failed: promptsWithIndices.length - successCount
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.error("Carousel Image Generation Error:", err);
                    return sendJSON({
                        error: "Carousel image generation failed",
                        details: err instanceof Error ? err.message : String(err)
                    }, 500);
                }
            }
        }
        // POST /generate-custom-image - Generate a single image from a raw prompt
        else if (cleanPath === "/generate-custom-image" && method === "POST") {
            if (!OPENAI_API_KEY) {
                return sendJSON({ error: "OpenAI API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { prompt, aspectRatio = "9:16", referenceImages = [], service, flow } = body;
                    const requestedImageSize =
                        body.imageSize === "1K" || body.imageSize === "2K" || body.imageSize === "4K"
                            ? body.imageSize
                            : undefined;

                    if (!prompt) {
                        return sendJSON({ error: "Prompt is required" }, 400);
                    } else {
                        console.log(
                            `[Custom Image] Generating with model=${OPENAI_IMAGE_MODEL} and ${referenceImages.length} refs: ${prompt.substring(0, 50)}...`
                        );

                        const imageSize = requestedImageSize || getImageSizeForFlow(service, flow);
                        let result;
                        if (referenceImages && referenceImages.length > 0) {
                            const finalReferences = referenceImages.map((ref: any) => ({
                                data: ref.data,
                                mimeType: ref.mimeType || ref.mime_type || "image/png"
                            }));
                            result = await generateImageWithReferences(prompt, finalReferences, OPENAI_API_KEY, {
                                aspectRatio: aspectRatio,
                                imageSize
                            });
                        } else {
                            result = await generateImage(prompt, OPENAI_API_KEY, {
                                aspectRatio: aspectRatio,
                                imageSize
                            });
                        }

                        if (result.success && result.images && result.images.length > 0) {
                            const firstImage = result.images[0];
                            if (!firstImage) return sendJSON({ error: "Image generation returned empty data" }, 500);

                            return sendJSON({
                                success: true,
                                model: OPENAI_IMAGE_MODEL,
                                image: {
                                    data: firstImage.data,
                                    mime_type: firstImage.mimeType
                                }
                            });
                        } else {
                            return sendJSON({ success: false, error: result.error || "Generation failed" }, 500);
                        }
                    }
                } catch (err) {
                    console.error("Custom Image Generation Error:", err);
                    return sendJSON({ error: "Custom generation failed", details: String(err) }, 500);
                }
            }
        }
        // POST /generate-image-with-refs - Generate image with reference images
        else if (cleanPath === "/generate-image-with-refs" && method === "POST") {
            if (!OPENAI_API_KEY) {
                return sendJSON({ error: "OpenAI API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { prompt, referenceImages = [], slideIndex = 0, service, slideText = '', brandingMode, character_id, flow, storyAiFlow } = body;

                    if (!prompt) {
                        return sendJSON({ error: "Prompt is required" }, 400);
                    } else {
                        console.log(`[Image Gen] Generating slide ${slideIndex + 1} with ${referenceImages.length} reference(s)...`);

                        let flatPrompt = flattenImagePrompt(prompt, { includeUgcStyle: service !== 'dbt' });
                        let result: any = { success: false, error: "Initialization error" };

                        // Prepare references: user provided + optional character anchor
                        let finalReferences = referenceImages.map((ref: any) => ({
                            data: ref.data,
                            mimeType: ref.mimeType || ref.mime_type || "image/png"
                        }));

                        // If no specific references provided, check for character anchor
                        // CRITICAL: DO NOT use character anchor for DBT project (Classical Paintings)
                        if (finalReferences.length === 0 && body.character_id && service !== 'dbt') {
                            const anchor = getAnchorImage(body.character_id, ANCHORS_DIR);
                            if (anchor) finalReferences.push(anchor);
                        }

                        const effectiveFlow = service === 'dbt' ? (flow || "weird_hack") : flow;
                        if (service === 'dbt' && effectiveFlow === 'weird_hack_v2') {
                            flatPrompt = buildWeirdHackV2NanoBananaPrompt(flatPrompt);
                        } else if (service === 'dbt' && effectiveFlow === 'permission_v1' && slideIndex >= 1 && slideIndex <= 6) {
                            flatPrompt = buildPermissionV1NanoBananaPrompt(flatPrompt);
                        }
                        const usesLegacyDbtFixedReferences =
                            service === 'dbt' &&
                            !storyAiFlow &&
                            effectiveFlow !== 'i_say_they_say' &&
                            effectiveFlow !== 'weird_hack_v2' &&
                            effectiveFlow !== 'permission_v1';

                        if (service === 'dbt' && effectiveFlow === 'i_say_they_say') {
                            const iFeelReference = getDbtSlide1References(character_id, effectiveFlow);
                            if (iFeelReference.length > 0) {
                                finalReferences.push(...iFeelReference);
                            }
                        }

                        if (service === 'dbt' && effectiveFlow === 'permission_v1') {
                            const slideNumber = slideIndex + 1;
                            const permissionV1References = getDbtPermissionV1SlideReferences(character_id, slideNumber);
                            if (permissionV1References.length > 0) {
                                finalReferences.push(...permissionV1References);
                                console.log(`[Image Gen] Added ${permissionV1References.length} permission_v1 reference(s) for DBT slide ${slideNumber}`);
                            }
                        }

                        if (service === 'dbt' && storyAiFlow) {
                            flatPrompt += `\n\nSTORY AI COUPLE FLOW:
- Use the provided Slide 1 reference image as the identity anchor for the couple.
- Generate a new candid photo of the same couple in the requested setting, not a remake of Slide 1.
- Keep the couple believable and consistent: same apparent ages, faces when visible, hair, skin tone, body types, and style.
- Do not preserve the exact outfits by default. Use natural casual outfit changes that fit the new setting, weather, and time of day.
- Reuse the same outfits only when the new image plausibly belongs to the same outing or location as Slide 1, such as another beach/date/trip photo.
- If the prompt asks for a selfie, make it an actual casual couple selfie taken by one partner at arm length, with natural phone-camera distortion and imperfect framing.
- It is acceptable for the couple to be seen from behind, as silhouettes, partially hidden, or from far away.
- Keep it spontaneous, imperfect, vertical 9:16 iPhone relationship-photo aesthetic.
- Do not add readable text, logos, extra people, studio lighting, fantasy scenes, or influencer-style posing.`;
                        }

                        if (usesLegacyDbtFixedReferences && slideIndex === 0) {
                            const slide1References = getDbtSlide1References(character_id, flow || "weird_hack");
                            if (slide1References.length > 0) {
                                finalReferences.push(...slide1References);
                                const fixedSlide1Prompt = getDbtFixedSlide1Prompt(flow || "weird_hack");
                                if (fixedSlide1Prompt) {
                                    flatPrompt += `\n\nCRITICAL: ${fixedSlide1Prompt}`;
                                }
                                console.log(`[Image Gen] Added ${slide1References.length} fixed reference(s) for DBT slide 1`);
                            }
                        }

                        if (usesLegacyDbtFixedReferences && slideIndex === 1) {
                            const slide2References = getDbtSlide2References(character_id, flow || "weird_hack");
                            if (slide2References.length > 0) {
                                finalReferences.push(...slide2References);
                                flatPrompt += `\n\nCRITICAL: ${getDbtFixedSlide2Prompt(character_id, flow || "weird_hack")}`;
                                console.log(`[Image Gen] Added ${slide2References.length} fixed reference(s) for DBT slide 2`);
                            }
                        }

                        if (usesLegacyDbtFixedReferences && slideIndex === 4) {
                            const slide5References = getDbtSlide5References(character_id, flow || "weird_hack");
                            if (slide5References.length > 0) {
                                finalReferences.push(...slide5References);
                                const fixedSlide5Prompt = getDbtFixedSlide5Prompt(character_id, flow || "weird_hack");
                                if (fixedSlide5Prompt) {
                                    flatPrompt += `\n\nCRITICAL: ${fixedSlide5Prompt}`;
                                }
                                console.log(`[Image Gen] Added ${slide5References.length} fixed reference(s) for DBT slide 5`);
                            }
                        }

                        if (usesLegacyDbtFixedReferences && slideIndex === 3) {
                            const slide4References = getDbtSlide4References(character_id, flow || "weird_hack");
                            if (slide4References.length > 0) {
                                finalReferences.push(...slide4References);
                                const fixedSlide4Prompt = getDbtFixedSlide4Prompt(flow || "weird_hack");
                                if (fixedSlide4Prompt) {
                                    flatPrompt += `\n\nCRITICAL: ${fixedSlide4Prompt}`;
                                }
                                console.log(`[Image Gen] Added ${slide4References.length} fixed reference(s) for DBT slide 4`);
                            }
                        }

                        if (usesLegacyDbtFixedReferences && slideIndex === 2) {
                            const slide3References = getDbtSlide3References(character_id, flow || "weird_hack");
                            if (slide3References.length > 0) {
                                finalReferences.push(...slide3References);
                                flatPrompt += `\n\nCRITICAL: ${getDbtFixedSlide3Prompt(character_id, flow || "weird_hack")}`;
                                console.log(`[Image Gen] Added ${slide3References.length} fixed reference(s) for DBT slide 3`);
                            }
                        }

                        // ===== SAVEYOURPET.DE WEBSITE SCREENSHOT INJECTION =====
                        // Check if this is a SYP slide that needs the website screenshot
                        const isSypProject = service === 'syp';
                        const saveyourpetKeywords = [
                            'saveyourpet.de', 'saveyourpet',
                            'absicherung', 'vorsorge', 'schutz fÃƒÂ¼r',
                            'laptop screen showing', 'laptop.*saveyourpet'
                        ];
                        const lowerPrompt = (flatPrompt + ' ' + slideText).toLowerCase();
                        const needsWebsiteScreenshot = isSypProject && brandingMode === 'full' && saveyourpetKeywords.some(kw =>
                            lowerPrompt.includes(kw.toLowerCase()) || new RegExp(kw, 'i').test(lowerPrompt)
                        );

                        if (needsWebsiteScreenshot) {
                            console.log(`[Image Gen] Detected saveyourpet.de slide - adding website screenshot reference`);

                            // Load website screenshot
                            const websiteScreenshotPath = path.join(DATA_DIR, "anchors", "saveyourpet", "website_screenshot_laptop.png");
                            if (existsSync(websiteScreenshotPath)) {
                                try {
                                    const screenshotData = readFileSync(websiteScreenshotPath).toString('base64');
                                    finalReferences.push({
                                        data: screenshotData,
                                        mimeType: "image/png"
                                    });
                                    console.log(`[Image Gen] Added website screenshot as reference (${finalReferences.length} total refs)`);

                                    // Enhance prompt to explicitly tell AI to use the screenshot on laptop
                                    flatPrompt = flatPrompt + "\n\nCRITICAL: The laptop screen MUST display the saveyourpet.de website exactly as shown in the reference image (the website screenshot). Place the website screenshot content on the laptop screen in the generated image.";
                                } catch (screenshotError) {
                                    console.warn(`[Image Gen] Could not load website screenshot: ${screenshotError}`);
                                }
                            } else {
                                console.warn(`[Image Gen] Website screenshot not found at: ${websiteScreenshotPath}`);
                            }
                        }

                        const imageSize = getImageSizeForFlow(service, effectiveFlow);
                        if (finalReferences.length > 0) {
                                result = await generateImageWithReferences(
                                    flatPrompt,
                                    finalReferences,
                                OPENAI_API_KEY,
                                { aspectRatio: (body.aspectRatio || "9:16") as any, imageSize }
                            );
                        } else {
                            result = await generateImage(flatPrompt, OPENAI_API_KEY, {
                                aspectRatio: (body.aspectRatio || "9:16") as any,
                                imageSize
                            });
                        }

                        if (result.success && result.images && result.images.length > 0) {
                            return sendJSON({
                                success: true,
                                slideIndex: slideIndex,
                                image: {
                                    data: result.images[0].data,
                                    mime_type: result.images[0].mimeType
                                },
                                referencesUsed: finalReferences.length,
                                websiteScreenshotUsed: needsWebsiteScreenshot
                            });
                        } else {
                            return sendJSON({
                                success: false,
                                slideIndex: slideIndex,
                                error: result.error || "Image generation failed"
                            }, 500);
                        }
                    }
                } catch (err) {
                    console.error("Image with References Error:", err);
                    return sendJSON({
                        error: "Image generation failed",
                        details: err instanceof Error ? err.message : String(err)
                    }, 500);
                }
            }
        }
        else {
            console.log(`[Warning] No route matched for ${method} ${cleanPath}`);
            return sendJSON({
                error: "Route not found",
                path: cleanPath,
                method: method,
                message: "Hook Bridge API is running, but this endpoint was not found."
            }, 404);
        }

        return new Response("Unsupported request", { status: 400, headers: corsHeaders });
    },
});
