import { Database } from "bun:sqlite";
import path from "path";
import { readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync, readdirSync } from "fs";
import { searchHooksHybrid, loadEmbeddings } from "./semantic_search";
import { generateImage, generateCarouselImages, flattenImagePrompt, generateImageWithReferences } from "./image_generator";
import type { ReferenceImage } from "./image_generator";
import { generateSypSlides } from "./projects/syp/syp_service";
import { generateDbtSlides } from "./projects/dbt/dbt_service";
import { createDbtJob, getDbtJob, getDbtTopics, initDbtJobTables, runDbtJob } from "./projects/dbt/dbt_job_service";
import { getAnchorImage, buildUGCSlide1Prompt } from "./common/prompt_utils";
import { ART_STYLES } from "./projects/dbt/art_styles";

const DATA_DIR = existsSync(path.join(process.cwd(), "server", "data"))
    ? path.join(process.cwd(), "server", "data")
    : path.join(process.cwd(), "data");
const PROJECT_ROOT = existsSync(path.join(process.cwd(), "server"))
    ? process.cwd()
    : path.resolve(process.cwd(), "..");

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
    },
    brendabpd: {
        slide2: [
            path.join(DBT_REFERENCE_IMAGE_DIR, "brendabpd", "slide2.png")
        ],
        slide3: [
            path.join(DBT_REFERENCE_IMAGE_DIR, "brendabpd", "slide3.jpg")
        ],
        slide5: [
            path.join(DBT_REFERENCE_IMAGE_DIR, "brendabpd", "slide5.jpg")
        ]
    }
};

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

function getDbtCharacterReferenceConfig(characterId?: string) {
    return DBT_CHARACTER_REFERENCE_PATHS[characterId || ""] || DBT_CHARACTER_REFERENCE_PATHS.hannahbpd;
}

function getRandomItem<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)] ?? null;
}

function getHannahSlide5ReferencePaths(): string[] {
    const clientDir = path.join(DBT_REFERENCE_IMAGE_DIR, "hannahbpd");
    const fallbackPaths = getDbtCharacterReferenceConfig("hannahbpd").slide5;

    if (!existsSync(clientDir)) {
        return fallbackPaths;
    }

    try {
        const candidates = readdirSync(clientDir)
            .filter((fileName) => /^slide5_ref_\d+\.(png|jpe?g|webp)$/i.test(fileName))
            .map((fileName) => path.join(clientDir, fileName));

        const randomReference = getRandomItem(candidates);
        return randomReference ? [randomReference] : fallbackPaths;
    } catch (error) {
        console.warn("[DBT Slide 5:hannahbpd] Failed to resolve random reference image:", error);
        return fallbackPaths;
    }
}

function getDbtSlide2References(characterId?: string): ReferenceImage[] {
    const config = getDbtCharacterReferenceConfig(characterId);
    return loadFixedReferenceImages(config.slide2, `DBT Slide 2:${characterId || "hannahbpd"}`);
}

function getDbtSlide3References(characterId?: string): ReferenceImage[] {
    const config = getDbtCharacterReferenceConfig(characterId);
    return loadFixedReferenceImages(config.slide3, `DBT Slide 3:${characterId || "hannahbpd"}`);
}

function getDbtSlide5References(characterId?: string): ReferenceImage[] {
    const normalizedCharacterId = characterId || "hannahbpd";
    const config = getDbtCharacterReferenceConfig(normalizedCharacterId);
    const slide5Paths = normalizedCharacterId === "hannahbpd"
        ? getHannahSlide5ReferencePaths()
        : config.slide5;

    return loadFixedReferenceImages(slide5Paths, `DBT Slide 5:${normalizedCharacterId}`);
}

function getDbtFixedSlide2Prompt(characterId?: string): string {
    const basePrompt = "Create another version of the reference image with the same vibe and image filter, but in a different dark setting. No face visible of person in the image, only shot from a side angle or from behind. Candid iPhone 12 shot. No text in image. Same medium quality, dark authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.";
    if (characterId === "brendabpd") {
        return "Create another version of the reference image with the same vibe but in a different dark setting, keep the sky shot the same tho. No face visible of person in the image, only shot from a side angle or from behind. Candid iPhone 12 shot. No text in image. Same medium quality, dark authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.";
    }
    return basePrompt;
}

function getDbtFixedSlide3Prompt(characterId?: string): string {
    const basePrompt = "Create another version of the reference image with the same vibe but in different dark rainy setting. It should rain. Candid iPhone 12 shot. No text in image.";
    if (characterId === "brendabpd") {
        return `${basePrompt} Face of the person is not visible. Same medium quality, dark authentic Tiktok asthetic with imperfect overall softness, cheap low-light phone camera blur, slight accidental motion blur, underexposed shadows, and noisy compressed image quality.`;
    }
    return basePrompt;
}

function getDbtFixedSlide5Prompt(characterId?: string): string | null {
    if (characterId === "brendabpd") {
        return "Create another version of the reference image with the same vibe, keep the faceless person motive with the over the shoulder shot out of the drivers window while parked. Candid iPhone 12 shot. No text in image. Same medium quality, hopeful authentic Tiktok asthetic.";
    }
    if (!characterId || characterId === "hannahbpd") {
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
let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let API_KEYS_RAW = process.env.API_KEYS;

if (!ANTHROPIC_API_KEY || !OPENAI_API_KEY || !API_KEYS_RAW) {
    console.log("Ã¢Å¡Â Ã¯Â¸Â Keys not found in process.env, attempting manual load...");
    async function loadEnv(pathStr: string) {
        try {
            if (!existsSync(pathStr)) return;
            const envText = await file(pathStr).text();
            console.log(`Ã°Å¸â€œÂ Loading keys from ${pathStr}`);
            const anthropicMatch = envText.match(/ANTHROPIC_API_KEY=(.*)/);
            const openaiMatch = envText.match(/OPENAI_API_KEY=(.*)/);
            const geminiMatch = envText.match(/GEMINI_API_KEY=(.*)/);
            const apiKeysMatch = envText.match(/API_KEYS=(.*)/);

            if (anthropicMatch && anthropicMatch[1]) ANTHROPIC_API_KEY = anthropicMatch[1].trim();
            if (openaiMatch && openaiMatch[1]) OPENAI_API_KEY = openaiMatch[1].trim();
            if (geminiMatch && geminiMatch[1]) GEMINI_API_KEY = geminiMatch[1].trim();
            if (apiKeysMatch && apiKeysMatch[1]) API_KEYS_RAW = apiKeysMatch[1].trim();
        } catch (e) {
            console.error(`Ã¢ÂÅ’ Failed to load ${pathStr}`);
        }
    }

    // Try loading from all possible locations
    await loadEnv(path.join(process.cwd(), ".env"));
    await loadEnv(path.join(process.cwd(), "server", ".env"));
    await loadEnv(path.join(process.cwd(), "..", ".env"));
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
console.log(`Ã°Å¸â€“Â¼Ã¯Â¸Â Gemini Key: ${!!GEMINI_API_KEY}`);

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
            const provided = (xApiKey || bearer).trim();
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
                if (wantsImages && !GEMINI_API_KEY) throw new Error("Gemini API Key missing");

                const created = createDbtJob(db, input || {});

                void runDbtJob(db, created.id, {
                    anthropicApiKey: ANTHROPIC_API_KEY!,
                    geminiApiKey: GEMINI_API_KEY || undefined
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
                const { slides, slides_text, service } = await req.json() as any;

                const fullSlideText = slides && Array.isArray(slides) ? slides.join('\n') : (slides_text || "");

                if (!fullSlideText.trim()) {
                    return sendJSON({ error: "Slides text is required" }, 400);
                }

                const isDbt = service === 'dbt';
                console.log(`[Banger Hooks] Generating for: ${fullSlideText.substring(0, 50)}... (Service: ${service || 'unknown'})`);

                let hookRequirementsPrompt = "";
                let systemPrompt = "";

                if (isDbt) {
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

                const userPrompt = `Slide Content: 
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
                        model: 'claude-opus-4-6',
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

                const normalizedHooks = hooks.map((h: string) => String(h || "").trim()).slice(0, 3);
                const finalHooks = isDbt
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
                        model: 'claude-opus-4-6',
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
                const effectiveFlow = service === 'dbt' ? 'weird_hack' : flow;

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
                    const isWeirdHackFlow = effectiveFlow === 'weird_hack';
                    console.log(`[Image Prompts] Generating ${selectedArtStyle.name} prompts for DBT-Mind with ${slides.length} slides${isSymbolic ? ' (Symbolic Mode)' : ''}${isWeirdHackFlow ? ' (Weird Hack Flow)' : ''}`);

                    const normalizedSlides = slides.map((s: any) => String(s || '').trim());
                    const staticSlides: Record<number, string> = {};
                    if (isSymbolic) staticSlides[1] = 'slide1.png';
                    if (isDbtProject && slides.length >= 6) staticSlides[6] = 'app_image.png';

                    const targetSlideIndices = normalizedSlides
                        .map((_, i) => i + 1)
                        .filter((i) => !staticSlides[i]);
                    const targetSlides = targetSlideIndices.map((i) => normalizedSlides[i - 1]);
                    const allSlidesLower = normalizedSlides.join('\n').toLowerCase();
                    const dbtSkillLexicon = [
                        "tipp", "stop", "wise mind", "opposite action", "radical acceptance",
                        "check the facts", "name the emotion", "urge surfing", "self-soothe",
                        "distress tolerance", "emotion regulation", "interpersonal effectiveness"
                    ];
                    const mentionedSkills = dbtSkillLexicon.filter(skill => allSlidesLower.includes(skill));
                    const emotionalSignals = [
                        allSlidesLower.match(/anx|panic|overwhelm|urge|spiral|late|abandon|leave|rejection/) ? "anxiety_abandonment" : null,
                        allSlidesLower.match(/split|all-or-nothing|hate|love|switch flip/) ? "splitting_instability" : null,
                        allSlidesLower.match(/skill|name|regulate|track|pattern|dbt/) ? "skill_building_reflection" : null
                    ].filter(Boolean);

                    const dbtPostContext = {
                        project: "DBT-Mind",
                        platform: "TikTok slideshow",
                        niche: "BPD/DBT psychoeducation",
                        flow: isWeirdHackFlow ? "weird_therapist_hacks" : "standard",
                        visual_style: selectedArtStyle.name,
                        hook_slide: normalizedSlides[0] || "",
                        detected_signals: emotionalSignals,
                        detected_dbt_skills: mentionedSkills
                    };

                    const darkMotifs = [
                        "rainy street with cars",
                        "rainy driver car window",
                        "foggy field",
                        "rainy roadside at night",
                        "foggy forest path"
                    ];
                    const shuffledDarkMotifs = [...darkMotifs].sort(() => Math.random() - 0.5);
                    const darkMotifBySlide: Record<number, string> = {
                        2: shuffledDarkMotifs[0],
                        3: shuffledDarkMotifs[1]
                    };

                    const getDbtSlideStyleOverride = (slideNumber: number) => {
                        if (slideNumber === 2) {
                            const motif = darkMotifBySlide[slideNumber];
                            return `DARK: night, rain, isolation, artificial light sources, emotionally heavy. MOTIF ONLY: ${motif}. No other motifs.`;
                        }
                        if (slideNumber === 3) {
                            return "DARK: night rain, isolation, emotionally heavy. Create a new variation of the reference vibe, not a copy. Show a woman inside a car in a dark rainy setting with her hand or forearm reaching out of the open window into the rain. Keep it road-based and cinematic, but change the surrounding setting, framing, lighting, or background details. NOT ocean, NOT lake, NOT coast, NOT open water, NOT boat.";
                        }
                        if (slideNumber === 4) {
                            return "TRANSITION: neither dark nor bright; dark-to-warm gradient background, abstract minimal, no distinct scene.";
                        }
                        if (slideNumber === 5) {
                            return "HOPEFUL: warm daylight, quiet morning moment, candid but alive. If a notebook is present, its contents must be empty or directly related to Slide 5 text.";
                        }
                        return "";
                    };

                    const dbtSystemPrompt = `You generate image prompts for DBT-Mind TikTok slideshow posts in the BPD/DBT niche.

CRITICAL:
- You will receive FULL-CAROUSEL context and per-slide text.
- Each image must match the target slide while still fitting the same post narrative.
- Do NOT create random aesthetic scenes that ignore the line.
- Do NOT illustrate metaphors literally.
- All images must feel like candid, spontaneous photos taken on an iPhone 12 (natural framing, imperfect realism).
- If a notebook is visible, its contents must be empty or directly related to the slide text.
- Slide 7 MUST always be first-person POV perspective.

CONTEXT INTEGRATION WORKFLOW:
1. Read the full carousel context first (hook, emotional arc, DBT skills if present).
2. Determine each slide role: validation, pattern naming, behavior consequence, DBT skill, or grounded reframe.
3. Build a scene that matches that role and the exact line's emotional meaning.
4. Ensure the set feels coherent as one post.

SEMANTIC FIT RULES:
- The image must be interpretable as the same emotional moment as the text.
- Prefer psychologically legible scenes over random props.
- If the line describes behavior ("testing", "pushing away", "checking"), show physical traces of that behavior.
- If the line describes nervous-system state, show environmental cues (light, space, object tension) consistent with that state.

${isSymbolic ? `SYMBOLIC MODE (NO PEOPLE):
- STRICTLY NO PEOPLE, NO BODY PARTS, NO FACES.
- Use candid iPhone-photo language with tasteful, clean-real aesthetics.
- Aesthetic floor: harmonious color palette, believable natural/practical light, clear focal object, no grime.
- Hard bans: trash, stains, cracked/damaged fixtures, random gross clutter, or ugly shock details.
- Diversity with coherence: avoid repeating the same setup template across slides.
- Allowed archetypes: threshold/entry, kitchen ritual, couch pause, bedside reset, shelf memory, desk reflection, window-weather moment, soft outdoor nature edge (path/trees/shoreline) when text supports it.
- Nature is optional support, not a generic backdrop. Use it only when it reinforces the slide meaning.` : `HUMAN-FIGURE MODE:
- Keep the figure grounded in a specific physical action.
- Avoid generic model-pose compositions.`}

STYLE RULES FOR ${selectedArtStyle.name.toUpperCase()}:
${selectedArtStyle.systemPromptPrinciples}

OUTPUT FORMAT:
- Return ONLY JSON with keys ${targetSlideIndices.map((i) => `"image${i}"`).join(', ')}.
- Each value must be ONE short prompt sentence.
- Keep prompts minimal and practical.
- Do NOT include extra styling directives, strict-rule boilerplate, or bullet-style add-ons.
- Do NOT add markdown.
- Do NOT add any style suffix/footer text.`;

                    const userPrompt = `Generate ${targetSlides.length} DBT-Mind image prompts.

FULL CAROUSEL CONTEXT:
${normalizedSlides.map((s: string, i: number) => `Slide ${i + 1}: "${s}"`).join('\n')}

POST CONTEXT JSON:
${JSON.stringify(dbtPostContext, null, 2)}

STYLE OVERRIDES (DBT-MIND ONLY):
- Slide 2 and Slide 3: DARK. night, rain, isolation, artificial light sources, emotionally heavy.
- Slide 4: TRANSITION. neither dark nor bright; a punch slide that should read as a dark-to-warm gradient background. abstract, minimal, no distinct scene.
- Slide 5: HOPEFUL. warm daylight, quiet morning moment, candid but alive.
- Slide 7: HOPEFUL CTA and ALWAYS POV (first-person) perspective.

TARGET SLIDES TO PROMPT:
${targetSlideIndices.map((i) => {
                        const override = getDbtSlideStyleOverride(i);
                        return `Image ${i} uses Slide ${i}: "${normalizedSlides[i - 1]}"${override ? ` | STYLE OVERRIDE: ${override}` : ''}`;
                    }).join('\n')}

QUALITY CHECK BEFORE FINAL OUTPUT:
- For each target slide, quickly verify "Would this still make sense if the text overlay was removed?"
- If no, rewrite that prompt.
${isSymbolic ? '- Also verify the set is aesthetically pleasing and semantically aligned; no random gritty domestic details.' : ''}`;

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
                            system: dbtSystemPrompt,
                            messages: [{ role: 'user', content: userPrompt }]
                        })
                    });

                    if (!claudeResponse.ok) {
                        const errorText = await claudeResponse.text();
                        console.error("[DBT Image Prompts] Error:", errorText);
                        return sendJSON({ error: "Anthropic API Error" }, 500);
                    }

                    let parsed;
                    try {
                        const rawData = await claudeResponse.json() as any;
                        const resultText = rawData.content?.[0]?.text || '';
                        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
                    } catch (parseErr) {
                        console.error("[DBT Image Prompts] JSON Parse Error:", parseErr);
                        return sendJSON({ error: "Failed to parse image prompts" }, 500);
                    }

                    const candidStylePrefix = "iPhone 12 candid style photo, spontanesouly taken. Medium quality, authentic Tiktok asthetic. ";
                    const noPersonSuffix = " No person visibile, no UI elements";
                    const fixedSlide2ReferencePrompt = getDbtFixedSlide2Prompt(resolvedCharacterId);
                    const fixedSlide3ReferencePrompt = getDbtFixedSlide3Prompt(resolvedCharacterId);
                    const fixedSlide5ReferencePrompt = getDbtFixedSlide5Prompt(resolvedCharacterId);
                    const ctaPrompt = isSymbolic
                        ? `${candidStylePrefix}first-person POV in a cozy living room, only crossed legs visible on a footstool by a reading chair, warm daylight, plants, no phone or screens.`
                        : `${candidStylePrefix}first-person POV resting moment in a quiet warm daylight room, no phone or screens.`;
                    if (normalizedSlides.length >= 7 && !staticSlides[7]) {
                        parsed.image7 = ctaPrompt;
                    }

                    // Enforce requested style prefix at the beginning of slides 2, 3, 5, and 7.
                    [2, 3, 5, 7].forEach((slideNumber) => {
                        const key = `image${slideNumber}`;
                        if (typeof parsed[key] !== 'string') return;
                        const current = parsed[key].trim();
                        const withPrefix = current.startsWith(candidStylePrefix)
                            ? current
                            : `${candidStylePrefix}${current}`;
                        parsed[key] = withPrefix.endsWith(noPersonSuffix)
                            ? withPrefix
                            : `${withPrefix}${noPersonSuffix}`;
                    });

                    // Slide 2 and 3 should remain fixed even after prompt regeneration/refresh.
                    if (normalizedSlides.length >= 2) {
                        parsed.image2 = fixedSlide2ReferencePrompt;
                    }
                    if (normalizedSlides.length >= 3) {
                        parsed.image3 = fixedSlide3ReferencePrompt;
                    }
                    if (normalizedSlides.length >= 5 && fixedSlide5ReferencePrompt) {
                        parsed.image5 = fixedSlide5ReferencePrompt;
                    }

                    // Slide 4 is the gradient transition slide: remove any leading iPhone-style prefix.
                    if (typeof parsed.image4 === 'string') {
                        parsed.image4 = parsed.image4
                            .replace(/^iPhone\s*12[^.]*photo[^.]*\.\s*/i, '')
                            .replace(/^iPhone\s*12[^.]*\.\s*/i, '')
                            .trim();
                    }
                    if (normalizedSlides.length >= 4 && (!parsed.image4 || !String(parsed.image4).trim())) {
                        parsed.image4 = "dark-to-warm gradient background, abstract minimal transition, no distinct scene.";
                    }

                    // DBT prompts stay minimal: no appended style footer/boilerplate.

                    // Convert object to array for frontend
                    const prompts = Object.keys(parsed)
                        .filter(key => key.startsWith('image'))
                        .sort((a, b) => (parseInt(a.replace('image', '')) || 0) - (parseInt(b.replace('image', '')) || 0))
                        .map(key => parsed[key]);

                    return sendJSON({
                        prompts: prompts,
                        image_prompts: parsed,
                        is_painting_style: true,
                        useStaticSlide1: isSymbolic,
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
                const { format, topic, profile, service, includeBranding, brandingMode } = await req.json() as any;

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
                        ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
                        includeBranding: includeBranding !== false
                    });
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

        // POST /generate-metadata - Generate TikTok Title & Description
        else if (cleanPath === "/generate-metadata" && method === "POST") {
            try {
                if (!ANTHROPIC_API_KEY) throw new Error("API Key missing");
                const { slides_text, service, includeBranding, brandingMode } = await req.json() as any;

                if (!slides_text || !slides_text.trim()) {
                    return sendJSON({ error: "Slides text is required" }, 400);
                }

                const isDbt = service === 'dbt';
                const isSyp = service === 'syp';

                // DBT-Mind: caption framework is enforced via dedicated prompt rules
                const needsDbtBrandingInDescription = isDbt;

                // SYP: branding in description when brandingMode is 'soft'
                const needsSypBrandingInDescription = isSyp && brandingMode === 'soft';

                console.log(`[Metadata Gen] Generating for: ${slides_text.substring(0, 50)}... (service: ${service || 'unknown'}, dbt: ${isDbt}, syp brandingMode: ${brandingMode || 'n/a'})`);

                // Build branding instruction
                let brandingInstruction = '';
                if (isDbt) {
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
- Must include "@dbtmind".
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
                const languageInstructions = isDbt ? `
## LANGUAGE: ENGLISH
- Write everything in English
- Tone target: young person with BPD, raw and fragmentary, not reflective and polished.
- Keep it conversational, imperfect, emotionally immediate.
- Avoid self-help-book voice and poetic writing.

Example output: {"title":"my brain wrote the breakup in 3 seconds","description":"one dry text and my brain already wrote the breakup, the funeral, and the part where i was wrong about everything.\ntook me too long to realize the feeling is real but the story i build from it usually isn't.\nmy therapist taught me stop and i actually use it now bc @dbtmind walks me through it when i'm too in it to think.\n#bpd #dbtskills #bpdrecovery #anxietyspiral #drytext"}` : `
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
                const brandingReminder = needsDbtBrandingInDescription
                    ? ' Follow the 4-part DBT caption framework exactly.'
                    : needsSypBrandingInDescription
                        ? ' KRITISCH: saveyourpet.de MUSS AM ANFANG der Description stehen (z.B. "saveyourpet.de hat mir den A*sch gerettet Ã°Å¸Ëœâ€š") - kreativ, nicht werblich!'
                        : '';

                const systemPrompt = `You are a TikTok Content Strategist. Your job is to write a catchy title (1-line) and a relatable description (caption) for a photo carousel.
${languageInstructions}
${brandingInstruction}
## YOUR TASK:
Based on the provided slide texts, generate:
1. A catchy Title for the post (one line, lowercase is fine).
2. A Description/Caption for the post.${brandingReminder}` + (isDbt ? `\n\nFor DBT captions: output 4 parts with line breaks and hashtags on the final line only.` : `\n\nFor non-DBT captions: keep it to 1-2 sentences max, 1-2 emojis used wisely, 3-5 relevant hashtags.`) + `

OUTPUT: Return ONLY a JSON object with "title" and "description" fields. No markdown, no explanation.`;

                const userPrompt = `Generate a Title and Description for these slides:
\n${slides_text}`;

                const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'claude-opus-4-6',
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

                // Resilient JSON extraction
                let cleanedText = resultText.trim();
                const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

                let parsed;
                try {
                    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);
                } catch (parseErr) {
                    console.error("[Metadata Gen] JSON Parse Error:", parseErr);
                    console.info("[Metadata Gen] Raw AI Response:", resultText);
                    return sendJSON({
                        error: "Failed to parse metadata JSON",
                        details: String(parseErr),
                        rawText: resultText.substring(0, 1000)
                    }, 500);
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
                        let mentionSeen = false;
                        const normalized: string[] = [];

                        for (const line of lines) {
                            if (line.startsWith('#')) {
                                normalized.push(line);
                                continue;
                            }

                            if (/@dbtmind/i.test(line)) {
                                if (mentionSeen) {
                                    const withoutMention = line
                                        .replace(/\s*@dbtmind\b/ig, '')
                                        .replace(/\s{2,}/g, ' ')
                                        .trim();
                                    if (withoutMention) normalized.push(withoutMention);
                                    continue;
                                }

                                mentionSeen = true;
                                normalized.push(
                                    line
                                        .replace(/(?:@dbtmind\s*)+/ig, '@dbtmind ')
                                        .replace(/\s{2,}/g, ' ')
                                        .trim()
                                );
                                continue;
                            }

                            normalized.push(line);
                        }

                        const bodyLines = normalized.filter((line: string) => !line.startsWith('#'));
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

                const normalizedTitle = String(parsed.title || '').trim();
                const normalizedDescription = formatMetadataDescription(String(parsed.description || ''), isDbt);

                return sendJSON({
                    title: normalizedTitle,
                    description: normalizedDescription
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
                        model: 'claude-opus-4-6',
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
            if (!GEMINI_API_KEY) {
                return sendJSON({ error: "Gemini API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { prompt, aspect_ratio = "9:16", count = 1, character_id, service } = body;

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

                        const flatPrompt = flattenImagePrompt(prompt, { includeUgcStyle: service !== 'dbt' });

                        let result;
                        if (anchor) {
                            result = await generateImageWithReferences(flatPrompt, [anchor], GEMINI_API_KEY, {
                                aspectRatio: aspect_ratio,
                                imageSize: "1K"
                            });
                        } else {
                            result = await generateImage(flatPrompt, GEMINI_API_KEY, {
                                aspectRatio: aspect_ratio,
                                imageSize: "1K"
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
        else if (cleanPath === "/generate-ai-images" && method === "POST") {
            if (!GEMINI_API_KEY) {
                return sendJSON({ error: "Gemini API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { imagePrompts, character_id, service, brandingMode, referenceImages = [] } = body;

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

                                if (service === 'dbt' && item.index === 1) {
                                    const slide2References = getDbtSlide2References(character_id);
                                    if (slide2References.length > 0) {
                                        finalReferences.push(...slide2References);
                                        finalPrompt += `\n\nCRITICAL: ${getDbtFixedSlide2Prompt(character_id)}`;
                                        console.log(`[Carousel Images] Added ${slide2References.length} fixed reference(s) for DBT slide 2`);
                                    }
                                }

                                if (service === 'dbt' && item.index === 2) {
                                    const slide3References = getDbtSlide3References(character_id);
                                    if (slide3References.length > 0) {
                                        finalReferences.push(...slide3References);
                                        finalPrompt += `\n\nCRITICAL: ${getDbtFixedSlide3Prompt(character_id)}`;
                                        console.log(`[Carousel Images] Added ${slide3References.length} fixed reference(s) for DBT slide 3`);
                                    }
                                }

                                // Slide 5 in DBT uses fixed visual references to avoid the generic AI look.
                                if (service === 'dbt' && item.index === 4) {
                                    const slide5References = getDbtSlide5References(character_id);
                                    if (slide5References.length > 0) {
                                        finalReferences.push(...slide5References);
                                        const fixedSlide5Prompt = getDbtFixedSlide5Prompt(character_id);
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

                                    const result = finalReferences.length > 0
                                        ? await generateImageWithReferences(finalPrompt, finalReferences, GEMINI_API_KEY!, { aspectRatio: (body.aspectRatio || "9:16") as any, imageSize: "1K" })
                                        : await generateImage(finalPrompt, GEMINI_API_KEY!, { aspectRatio: (body.aspectRatio || "9:16") as any, imageSize: "1K" });

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
            if (!GEMINI_API_KEY) {
                return sendJSON({ error: "Gemini API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { prompt, aspectRatio = "9:16", referenceImages = [] } = body;

                    if (!prompt) {
                        return sendJSON({ error: "Prompt is required" }, 400);
                    } else {
                        console.log(`[Custom Image] Generating with raw prompt and ${referenceImages.length} refs: ${prompt.substring(0, 50)}...`);

                        let result;
                        if (referenceImages && referenceImages.length > 0) {
                            const finalReferences = referenceImages.map((ref: any) => ({
                                data: ref.data,
                                mimeType: ref.mimeType || ref.mime_type || "image/png"
                            }));
                            result = await generateImageWithReferences(prompt, finalReferences, GEMINI_API_KEY, {
                                aspectRatio: aspectRatio,
                                imageSize: "1K"
                            });
                        } else {
                            result = await generateImage(prompt, GEMINI_API_KEY, {
                                aspectRatio: aspectRatio,
                                imageSize: "1K"
                            });
                        }

                        if (result.success && result.images && result.images.length > 0) {
                            const firstImage = result.images[0];
                            if (!firstImage) return sendJSON({ error: "Image generation returned empty data" }, 500);

                            return sendJSON({
                                success: true,
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
            if (!GEMINI_API_KEY) {
                return sendJSON({ error: "Gemini API Key not configured" }, 500);
            } else {
                try {
                    const body = await req.json() as any;
                    const { prompt, referenceImages = [], slideIndex = 0, service, slideText = '', brandingMode, character_id } = body;

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

                        if (service === 'dbt' && slideIndex === 1) {
                            const slide2References = getDbtSlide2References(character_id);
                            if (slide2References.length > 0) {
                                finalReferences.push(...slide2References);
                                flatPrompt += `\n\nCRITICAL: ${getDbtFixedSlide2Prompt(character_id)}`;
                                console.log(`[Image Gen] Added ${slide2References.length} fixed reference(s) for DBT slide 2`);
                            }
                        }

                        if (service === 'dbt' && slideIndex === 4) {
                            const slide5References = getDbtSlide5References(character_id);
                            if (slide5References.length > 0) {
                                finalReferences.push(...slide5References);
                                const fixedSlide5Prompt = getDbtFixedSlide5Prompt(character_id);
                                if (fixedSlide5Prompt) {
                                    flatPrompt += `\n\nCRITICAL: ${fixedSlide5Prompt}`;
                                }
                                console.log(`[Image Gen] Added ${slide5References.length} fixed reference(s) for DBT slide 5`);
                            }
                        }

                        if (service === 'dbt' && slideIndex === 2) {
                            const slide3References = getDbtSlide3References(character_id);
                            if (slide3References.length > 0) {
                                finalReferences.push(...slide3References);
                                flatPrompt += `\n\nCRITICAL: ${getDbtFixedSlide3Prompt(character_id)}`;
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

                        if (finalReferences.length > 0) {
                            result = await generateImageWithReferences(
                                flatPrompt,
                                finalReferences,
                                GEMINI_API_KEY,
                                { aspectRatio: (body.aspectRatio || "9:16") as any, imageSize: "1K" }
                            );
                        } else {
                            result = await generateImage(flatPrompt, GEMINI_API_KEY, {
                                aspectRatio: (body.aspectRatio || "9:16") as any,
                                imageSize: "1K"
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
