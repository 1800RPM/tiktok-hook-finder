import { Database } from "bun:sqlite";
import path from "path";
import { readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { searchHooksHybrid, loadEmbeddings } from "./semantic_search";
import { generateImage, generateCarouselImages, flattenImagePrompt, generateImageWithReferences } from "./image_generator";
import type { ReferenceImage } from "./image_generator";
import { generateSypSlides } from "./projects/syp/syp_service";
import { generateDbtSlides } from "./projects/dbt/dbt_service";
import { getAnchorImage, buildUGCSlide1Prompt } from "./common/prompt_utils";
import { ART_STYLES } from "./projects/dbt/art_styles";

const DATA_DIR = existsSync(path.join(process.cwd(), "server", "data"))
    ? path.join(process.cwd(), "server", "data")
    : path.join(process.cwd(), "data");

const ANCHORS_DIR = path.join(DATA_DIR, "anchors");
if (!existsSync(ANCHORS_DIR)) {
    mkdirSync(ANCHORS_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, "hooks.db"));

// (Moved to common/prompt_utils.ts)
const { file } = Bun;

// Robust API Key loading
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!ANTHROPIC_API_KEY || !OPENAI_API_KEY) {
    console.log("⚠️ Keys not found in process.env, attempting manual load...");
    async function loadEnv(pathStr: string) {
        try {
            if (!existsSync(pathStr)) return;
            const envText = await file(pathStr).text();
            console.log(`📝 Loading keys from ${pathStr}`);
            const anthropicMatch = envText.match(/ANTHROPIC_API_KEY=(.*)/);
            const openaiMatch = envText.match(/OPENAI_API_KEY=(.*)/);
            const geminiMatch = envText.match(/GEMINI_API_KEY=(.*)/);

            if (anthropicMatch && anthropicMatch[1]) ANTHROPIC_API_KEY = anthropicMatch[1].trim();
            if (openaiMatch && openaiMatch[1]) OPENAI_API_KEY = openaiMatch[1].trim();
            if (geminiMatch && geminiMatch[1]) GEMINI_API_KEY = geminiMatch[1].trim();
        } catch (e) {
            console.error(`❌ Failed to load ${pathStr}`);
        }
    }

    // Try loading from all possible locations
    await loadEnv(path.join(process.cwd(), ".env"));
    await loadEnv(path.join(process.cwd(), "server", ".env"));
    await loadEnv(path.join(process.cwd(), "..", ".env"));
}

const PORT = 3001; // Using 3001 to avoid conflicts

console.log(`🚀 Hook Bridge API starting on http://localhost:${PORT}`);
console.log(`📂 Working Directory: ${process.cwd()}`);
console.log(`🔑 Anthropic Key: ${!!ANTHROPIC_API_KEY}`);
console.log(`🔑 OpenAI Key: ${!!OPENAI_API_KEY}`);
console.log(`🖼️ Gemini Key: ${!!GEMINI_API_KEY}`);

// Pre-load embeddings at startup
try {
    const embeddings = loadEmbeddings();
    console.log(`🧠 Semantic search ready with ${embeddings.length} hooks`);
} catch (e) {
    console.log("⚠️ Semantic search not available, falling back to archetype-based");
}

try {
    const test = db.query("SELECT 1").get();
    console.log(`✅ Database connected: ${JSON.stringify(test)}`);
} catch (e) {
    console.error(`❌ Database connection failed:`, e);
}

// Load UGC Base Prompts for realistic Slide 1 generation
let ugcBasePrompts: any = null;
const SYP_DIR = path.join(DATA_DIR, "frameworks", "SaveYourPet");
const DBT_DIR = path.join(DATA_DIR, "frameworks", "DBT-Mind");

try {
    const ugcBasePath = path.join(DATA_DIR, "ugc_base_prompts.json");
    if (existsSync(ugcBasePath)) {
        ugcBasePrompts = JSON.parse(readFileSync(ugcBasePath, 'utf-8'));
        console.log(`📸 UGC Base Prompts loaded with ${Object.keys(ugcBasePrompts.settings).length} settings`);
    }
} catch (e) {
    console.log("⚠️ UGC Base Prompts not loaded, using legacy prompts");
}

// (Moved to common/prompt_utils.ts)



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
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
        console.log(`[Router] ${method} ${url.pathname} -> Cleaned Path: ${cleanPath}`);

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
1. MAX 15 WORDS — shorter is almost always better
2. NO QUESTIONS — statements hit harder than questions
3. NO EMOJIS — breaks the tone
4. LOWERCASE — feels intimate, not performative`;

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

                return sendJSON({
                    hooks: hooks.map(h => h.toLowerCase()).slice(0, 3)
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
1. Maintain first-person confessional voice — The slide must sound like a whispered admission, not advice
2. Use "my dbt app" — Never "a dbt app" or "this dbt app I found." "My" signals personal ownership, like mentioning "my therapist" or "my journal"
3. Connect to earlier slide language — Reference a feeling, behavior, or phrase from the previous slides to create continuity
4. Show the action, don't explain the skill — Instead of "it has this skill called opposite action," say what you actually do: "do the opposite of what my brain wants"
5. Keep it imperfect — Avoid toxic positivity. Words like "sometimes," "trying to," or "it's hard but" maintain honesty
6. No CTA energy — Never "you should try" or "it really helps." The slide is about you, not them
7. Preserve the rhythm — Match the sentence length and cadence of the other slides. Short lines. Breath between thoughts.
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
                const { slides, character_id, setting_override, framing, theme, partner_anchor, service, brandingMode, artStyle, flow } = await req.json() as any;

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
                let effectiveCharacterId = character_id;
                if (isSypProject && character_id) {
                    const sypProfileMapping: { [key: string]: { personaId: string; type: string; petDesc: string } } = {
                        'lisa_milo': { personaId: 'lisa', type: 'dog', petDesc: 'fluffy golden retriever named Milo looking curious and playful' },
                        'anna_simba': { personaId: 'luna', type: 'cat', petDesc: 'orange tabby cat named Simba looking regal and slightly judgy' },
                        'sarah_luna': { personaId: 'luna', type: 'cat', petDesc: 'elegant gray cat named Luna with piercing green eyes' },
                        'julia_balu': { personaId: 'mia', type: 'dog', petDesc: 'happy labrador named Balu with tongue out' }
                    };

                    const sypProfile = sypProfileMapping[character_id];
                    if (sypProfile) {
                        effectiveCharacterId = sypProfile.personaId;
                        console.log(`[Image Prompts] SYP profile '${character_id}' mapped to persona '${effectiveCharacterId}' (${sypProfile.type})`);
                    }
                }

                let persona = personasData.personas.find((p: any) => p.id === effectiveCharacterId) || personasData.personas[0];

                // Override pet description for SYP profiles to match the specific pet
                if (isSypProject && character_id) {
                    const sypProfiles: { [key: string]: { type: string; petDesc: string } } = {
                        'lisa_milo': { type: 'dog', petDesc: 'fluffy golden retriever named Milo looking curious and playful' },
                        'anna_simba': { type: 'cat', petDesc: 'orange tabby cat named Simba looking regal and slightly judgy' },
                        'sarah_luna': { type: 'cat', petDesc: 'elegant gray cat named Luna with piercing green eyes' },
                        'julia_balu': { type: 'dog', petDesc: 'happy labrador named Balu with tongue out' }
                    };
                    const sypProfile = sypProfiles[character_id];
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
                const friendFramings = ["watching_my_bestie"];
                // Friend content is ONLY for DBT-Mind, never for SYP
                const isFriendContent = !isSypProject && friendFramings.includes(framing);

                // If DBT project, we use a completely different system prompt (Classical Paintings)
                if (isDbtProject) {
                    const selectedArtStyle = (ART_STYLES[artStyle] || ART_STYLES.hopper) as any;
                    const isSymbolic = selectedArtStyle.id === 'symbolic';
                    const isWeirdHackFlow = flow === 'weird_hack';
                    console.log(`[Image Prompts] Generating ${selectedArtStyle.name} prompts for DBT-Mind with ${slides.length} slides${isSymbolic ? ' (Symbolic Mode)' : ''}${isWeirdHackFlow ? ' (Weird Hack Flow)' : ''}`);

                    const dbtSystemPrompt = `You are generating image prompts for TikTok slideshow art in the style of ${selectedArtStyle.name}. Your job is to translate slide text into a visual scene — NOT to illustrate metaphors literally.

CORE PRINCIPLE:
${isSymbolic
                            ? 'Every image is a candid, spontaneous snapshot. Point-and-shoot iPhone realism focused on quiet intimacy. NO STAGING. NO PINTEREST SYMBOLS. NO rocks with words. STRICTLY NO PEOPLE, NO HANDS, NO FACES.'
                            : 'Every image is "a person in a moment of quiet introspection" — never "a woman with a concept." Even in surreal styles like James Jean or Remedios Varo, the core must be a human figure engaged in a specific physical act or posture.'}

${isWeirdHackFlow ? `NARRATIVE FLOW: WEIRD THERAPIST HACKS
The slides describe "weird" or unconventional therapist advice. 
Visual focus: The scenes should feel like "insider secrets" or "hidden knowledge." 
Incorporate objects that suggest a clinical but unconventional setting (e.g., a therapeutic sandbox, a complex mechanical watch, an unusual botanical specimen, a stack of handwritten journals). 
The lighting should feel slightly more mysterious or "revelatory."` : ''}

TRANSLATION RULES:

1. IGNORE METAPHORS IN THE TEXT
The slide text will contain metaphors like "spiral," "filling in the blanks," "the urge is loud." 
DO NOT visualize these literally (e.g., no literal spirals).
Instead, ask: what is the PHYSICAL SETTING or INTIMATE SPACE${isSymbolic ? ' (using zero-staging real world objects)' : ''} this person is in?

Examples:
- "checking the facts / naming the emotion" → ${isSymbolic ? 'a candid, spontaneous snapshot of a simple closed journal with a textured leather cover resting casually on a wooden bedside table, soft morning light filtering through a window' : 'person writing at a desk, or staring at a single object in their hands.'}
- "spiral / emptiness / void" → ${isSymbolic ? 'a candid, spontaneous snapshot of a half-empty glass of water on a dusty wooden shelf, low natural light casting a long shadow across the grain' : 'person with head in hands, or looking out a window at a complex landscape.'}
- "opposite action / skill use" → ${isSymbolic ? 'a candid, spontaneous snapshot of a single metallic pen lying next to a pair of glasses on a sun-drenched wooden surface, natural highlights and reflections' : 'person walking away from something, or methodically tidying a space.'}

2. STYLE PRINCIPLES FOR ${selectedArtStyle.name.toUpperCase()}:
${selectedArtStyle.systemPromptPrinciples}

3. AVOID THE "AI LOOK":
- **NO 3D RENDERING**: For ${selectedArtStyle.name}, ensure the prompt describes it as a ${selectedArtStyle.id === 'hopper' ? 'painting' : 'drawing/illustration'}.
- **NO VOLUMETRIC LIGHT**: Unless it's Hopper, avoid ray-tracing or cinematic fog. Use "flat light" or "illustrative shading".
- **NO CGI FACES**: Describe faces as "drawn", "painterly", or "stylized".

4. PROMPT STRUCTURE

Use this format for each prompt:

"${selectedArtStyle.name} style. Subject: [physical description${isSymbolic ? ' of objects or nature' : ' of woman + what she\'s doing + body language'}]. Setting: [location based on style principles + dramatic lighting]. Atmosphere: [1-2 words for mood]. Composition: [geometric or organic framing details]."

Then add this exact style suffix to every prompt:

${selectedArtStyle.suffix}

4. EXAMPLES

Slide text: "when i catch myself setting little traps like not texting first to see if they'll reach out i have to stop and name what i'm actually doing"
Resulting prompt: "${selectedArtStyle.name} style. Subject: ${isSymbolic ? 'An unlit candle sitting on an empty wooden table, a single matchstick lying next to it' : `A young woman ${selectedArtStyle.id === 'jean' ? 'dissolving into a swirling mass of petals and vines, her posture showing lonely hesitation' : 'seated at a table at night, staring at her phone, posture of lonely hesitation'}`}. Setting: ${selectedArtStyle.id === 'hopper' ? 'empty room, harsh overhead light, large window' : 'a luminous, dreamlike space where architecture flows into nature'}. Atmosphere: quiet tension. Composition: ${isSymbolic ? 'close-up shot on the table surface' : `figure ${selectedArtStyle.id === 'jean' ? 'merged with a dense, fractal organic background' : 'framed by the vertical line of a doorway'}`}." [plus style suffix]

Return JSON:
{
  ${isSymbolic ? '' : '"image1": "...",'}
  "image2": "...",
  "image3": "...",
  "image4": "...",
  "image5": "...",
  "image6": "...",
  "image7": "..."
} (If symbolic mode, skip image1 entirely)`;


                    const targetSlides = isSymbolic ? slides.slice(1) : slides;
                    const startIndex = isSymbolic ? 1 : 0;

                    const userPrompt = `Follow the Translation Rules to generate ${targetSlides.length} image prompts based on these specific slide texts:

${targetSlides.map((s: string, i: number) => `Image ${startIndex + i + 1} (Context from Slide ${startIndex + i + 1} text): "${s}"`).join('\n')}

Return a JSON object with keys ${targetSlides.map((_, i) => `"image${startIndex + i + 1}"`).join(', ')}. Ensure each prompt translates the physical situation of that specific slide's text as per the rules.`;

                    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'x-api-key': ANTHROPIC_API_KEY!,
                            'anthropic-version': '2023-06-01',
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'claude-opus-4-6',
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

                    // Append the global style to all generated image prompts
                    const styleOverlay = selectedArtStyle.suffix;

                    Object.keys(parsed).forEach(key => {
                        if (key.startsWith('image') && typeof parsed[key] === 'string' && !parsed[key].includes("FACE RULES:")) {
                            parsed[key] += styleOverlay;
                        }
                    });

                    // Convert object to array for frontend
                    const prompts = Object.keys(parsed)
                        .filter(key => key.startsWith('image'))
                        .sort((a, b) => (parseInt(a.replace('image', '')) || 0) - (parseInt(b.replace('image', '')) || 0))
                        .map(key => parsed[key]);

                    return sendJSON({
                        prompts: prompts,
                        image_prompts: parsed,
                        is_painting_style: true,
                        useStaticSlide1: isSymbolic
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
                            'absicherung', 'vorsorge', 'schutz für',
                            'was wenn er mal krank wird', 'was wenn sie mal krank wird',
                            'bin ich auf einen notfall vorbereitet', 'sollte ich mich besser absichern',
                            'hat vorgesorgt', 'hat sich um absicherung gekümmert'
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
                            const petName = petNames[character_id] || 'the pet';

                            saveyourpetSlideInstruction = `

## ⚠️ CRITICAL: SAVEYOURPET.DE SLIDE SPECIAL TREATMENT
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
## 👯 FRIEND POV FRAMING
This is "watching my bestie" content - the narrator is a FRIEND observing.

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
- ⚠️ SELFIE HAND LOGIC: ONE HAND MUST HOLD THE PHONE to take the photo!
- ❌ NEVER: phone in hands showing something, both hands on face/mouth, hands together in prayer, any pose requiring BOTH hands
- ❌ NEVER SHOW A PET ON A COUNTER: No pets on kitchen counters, tables, or raised surfaces. Pet must be on floor, bed, or couch.
- ✅ VALID: One hand gesturing, touching face, petting pet, etc. (the other hand holds phone - never mention it)

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
                            model: 'claude-opus-4-6',
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
                    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
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

                // DBT-Mind: Use the new branding openers
                const needsDbtBrandingInDescription = isDbt;

                // SYP: branding in description when brandingMode is 'soft'
                const needsSypBrandingInDescription = isSyp && brandingMode === 'soft';

                console.log(`[Metadata Gen] Generating for: ${slides_text.substring(0, 50)}... (service: ${service || 'unknown'}, dbt: ${isDbt}, syp brandingMode: ${brandingMode || 'n/a'})`);

                // Build branding instruction
                let brandingInstruction = '';
                if (isDbt) {
                    brandingInstruction = `
## ⚠️ CRITICAL: DBT-MIND DESCRIPTION FORMAT
The description MUST start with exactly one of these three openers (choose one at random):
1. "@dbtmind is the app I use every single day to navigate my BPD recovery. ❤️🩹"
2. "@dbtmind app makes practicing DBT skills actually doable outside of the therapy room. 📱"
3. "@dbtmind app helps me stay consistent with my mental health goals even on the hard days."

After the opener, add one or two sentences related to the specific slide content.
`;
                } else if (needsSypBrandingInDescription) {
                    brandingInstruction = `
## ⚠️ CRITICAL: SAVEYOURPET.DE MUSS AM ANFANG DER DESCRIPTION STEHEN!

Die Slides erwähnen Absicherung/Vorsorge thematisch, aber nicht saveyourpet.de direkt.
Du MUSST saveyourpet.de in der Description erwähnen - und zwar **AM ANFANG**, nicht am Ende!

### WICHTIGSTE REGELN:
1. **saveyourpet.de ZUERST** - direkt im ersten Satz, BEVOR der Rest der Beschreibung kommt
2. **Kreativ & Authentisch** - soll wie ein echtes Statement klingen, NICHT wie Werbung
3. **Emotional/Humorvoll** - die Person teilt ihre ECHTE Erfahrung

### ✅ GUTE BEISPIELE (nutze diesen Stil):
- "saveyourpet.de hat mir meinen A*sch gerettet 😂 [REST DER DESCRIPTION]"
- "saveyourpet.de - bester Move ever. [REST DER DESCRIPTION]"
- "Dank saveyourpet.de kann ich endlich wieder schlafen 🐕 [REST DER DESCRIPTION]"
- "saveyourpet.de gecheckt → Panik weg 💆‍♀️ [REST DER DESCRIPTION]"
- "saveyourpet.de war die beste Entscheidung. Punkt. [REST DER DESCRIPTION]"
- "hätte ich saveyourpet.de mal früher gefunden 🥲 [REST DER DESCRIPTION]"
- "saveyourpet.de = endlich ruhig schlafen 😴 [REST DER DESCRIPTION]"

### ❌ SCHLECHTE BEISPIELE (VERMEIDE DIESE):
- "Tierkrankenversicherung vergleichen auf saveyourpet.de" → zu werblich!
- "mehr auf saveyourpet.de" → zu formal, zu werblich
- "alles zu Absicherung: saveyourpet.de" → klingt wie ein Slogan
- "[Description]... Jetzt endlich abgesichert – hätte ich mal früher gemacht." → saveyourpet.de muss VOR diesem Satz kommen!

### FORMAT:
"saveyourpet.de [kreatives Statement]. [1-2 Sätze zur Story/Emotion] [2-3 Emojis] [3-5 Hashtags]"
`;
                } else if (isSyp && brandingMode === 'none') {
                    brandingInstruction = `
## ⚠️ WICHTIG: KEIN BRANDING (KEIN saveyourpet.de)
- ❌ Erwähne saveyourpet.de NIEMALS in der Description!
- ✅ Aber: Nutze Begriffe wie "Tierkrankenversicherung", "Absicherung" oder "OP-Schutz" in der Caption, um das Thema der Slides aufzugreifen.
- ✅ Die Regel "Verwende niemals das Wort Versicherung" ist für diesen Post AUFGEHOBEN.
- ✅ Beispiel: "Bin so froh, dass ich das Thema Tierkrankenversicherung endlich angegangen bin 🐕🙏"
`;
                }

                // Language-specific instructions
                const languageInstructions = isDbt ? `
## LANGUAGE: ENGLISH
- Write everything in English
- Natural, authentic, helpful, and supportive tone
- Relatable and warm, with a slight Gen-Z touch (e.g., "bestie", "vibes", "real", "lowkey")
- Simple, clear language that anyone can understand
- Focus on delivering value and making the viewer feel seen

Example output: {"title": "when they go from soulmate to enemy in 5 minutes", "description": "@dbtmind is the app I use every single day to navigate my BPD recovery. ❤️🩹 the split was so fast I got whiplash. it's so real. #bpd #bpdawareness #mentalhealth #dbt #splitting"}` : `
## LANGUAGE: GERMAN
- Write everything in German
- Natural, authentic, conversational tone
- Relatable and warm, not overly trendy or slang-heavy
- Avoid excessive Gen-Z slang
- Simple, clear language that anyone can understand
- Slightly humorous or self-aware is okay, but keep it grounded
- English hashtags are fine

## STYLE EXAMPLES:
❌ BAD: "die 3am anxiety hits different wenn..." (too Gen-Z)
✅ GOOD: "3 Uhr nachts und ich google wieder..." (natural German)

❌ BAD: "when your dog is lowkey your therapist fr" (too slang-heavy)
✅ GOOD: "wenn dein Hund besser schläft als du" (simple, relatable)

Example output: {"title": "wenn dein hund besser schläft als du", "description": "Er schnarcht. Ich google. So läuft das hier. 🐕😅 #hundemama #haustier #schlaflos"}`;

                // Reminder for description branding
                const brandingReminder = needsDbtBrandingInDescription
                    ? ' Remember to start the description with one of the @dbtmind openers!'
                    : needsSypBrandingInDescription
                        ? ' KRITISCH: saveyourpet.de MUSS AM ANFANG der Description stehen (z.B. "saveyourpet.de hat mir den A*sch gerettet 😂") - kreativ, nicht werblich!'
                        : '';

                const systemPrompt = `You are a TikTok Content Strategist. Your job is to write a catchy title (1-line) and a relatable description (caption) for a photo carousel.
${languageInstructions}
${brandingInstruction}
## YOUR TASK:
Based on the provided slide texts, generate:
1. A catchy Title for the post (one line, lowercase is fine).
2. A Description/Caption for the post (1-2 sentences max, 2-3 emojis, 3-5 relevant hashtags).${brandingReminder}

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
                if (jsonMatch) cleanedText = jsonMatch[0];

                const parsed = JSON.parse(cleanedText);
                return sendJSON({
                    title: parsed.title,
                    description: parsed.description
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
                        model: 'claude-opus-4-6',
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
- Slide 6: Hopeful close.End with 💜 emoji.Grounded, not fake - happy.

---

## CRITICAL RULES:
            1. NO EMOJIS on Slides 2 - 5. ONLY 💜 on Slide 6.
            2. Each slide = 1 - 2 SHORT, PUNCHY sentences.MAX 30 words per slide.
3. Tone: "Subtle Gen-Z" = authentic, validating, slightly raw.NOT cringe.
4. Use BPD - specific language: splitting, FP, dysregulated, nervous system, trauma bond, etc.
5. Write in FIRST PERSON perspective("I", "you").
6. Slide 5 app mention must feel like a casual aside, NOT a sales pitch.

---

## APP MENTION RULES(Slide 5):
The app should feel like an AFTERTHOUGHT, not the main point.The insight comes first.

✅ NATIVE PHRASING(USE THESE):
- "The pattern was always there (tracking in DBT-Mind app made it obvious)."
    - "I didn't see it until I started logging triggers in apps like DBT-Mind app."
    - "Mood tracking changed everything - something like DBT-Mind app to see patterns."

❌ SALESY(NEVER USE - sounds like an ad):
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
                - Multiple emojis or any emoji except 💜 on Slide 6

---

## EXAMPLE OUTPUT(Splitting topic):
[
    "One second they're your whole world. The next they're the enemy.",
    "It's not a choice. Your brain literally can't hold both truths at once.",
    "The gray area doesn't exist when your nervous system is in survival mode.",
    "The triggers were always there - I just couldn't see them until I tried mood tracking (apps like DBT-Mind app).",
    "You're not crazy. You're running on a dysregulated system. And you can learn to catch it. 💜"
]

## EXAMPLE OUTPUT(FP Dynamics topic):
[
    "That person you can't stop thinking about? You're not in love. You're in withdrawal.",
    "Your brain got addicted to the emotional highs and now their absence feels like death.",
    "FP attachment isn't love. It's your nervous system using someone else to regulate.",
    "I finally saw my pattern when I started journaling it - something like DBT-Mind app makes it hard to ignore.",
    "Real love doesn't feel like survival. You can learn the difference. 💜"
]

---

    Now generate 5 slides for the topic "${selectedTopic.name}" with angle "${randomAngle}".

Output format: JSON array of 5 strings ONLY.No markdown, no explanation.`
                        }]
                    })
                });

                const slideData = await slideResponse.json() as any;
                const slidesText = JSON.parse(slideData.content[0].text.replace(/```json | ```/g, '').trim());

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
                const hooks = JSON.parse(hookDataRes.content[0].text.replace(/```json | ```/g, '').trim());

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
                        model: 'claude-opus-4-6',
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

## SETTING VARIETY(DO NOT always use bathroom):
Choose settings based on topic, but VARY them:
- Bedroom: bed visible, natural daylight or lamp
    - Living room couch: relaxed, blanket, warm lighting
        - Car: steering wheel visible, daylight through windows
            - Kitchen: morning light, coffee mug nearby
                - Window seat: natural light, hopeful energy

---

## CORE INSTRUCTION (ULTRA-REALISM)
Preserve exact facial identity (bone structure, eyes, nose, lips). Adapt style/mood without altering identity.
Vibe: Ultra-realistic fashion photo shoot, cinematic realism, modern mirror selfie fashion aesthetic, soft grunge + urban femininity.

## REALISM RULES(CRITICAL):
1. Skin is NEVER smooth or filtered. Include visible micro-pores, natural oils, and peach fuzz. NO plastic skin.
2. Makeup: Sharp elegant black winged eyeliner, defined lashes, muted lips with satin finish. Natural glow.
3. Clothes: Fashion-forward outfit (jacket/zip-up with graphic prints). Realistic fabric folds.
4. Overall vibe: "Pretty but comedically overwhelmed" German pet owner. CUTE MESSY, not distressed.

## CAMERA TYPE(selfies only):
Handheld smartphone camera style (iPhone-like lens), slight wide-angle distortion, handheld feel.
Ultra-high resolution, photo-real texture, 9:16 vertical.
Natural imperfection: subtle noise, soft highlights, realistic reflections.
No ring light, no professional polish, no beauty filters.


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
                                imageSize: "2K"
                            });
                        } else {
                            result = await generateImage(flatPrompt, GEMINI_API_KEY, {
                                aspectRatio: aspect_ratio,
                                imageSize: "2K"
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
                    const { imagePrompts, character_id, service, brandingMode } = body;

                    if (!imagePrompts) {
                        return sendJSON({ error: "imagePrompts object is required" }, 400);
                    } else {
                        // Find all image prompts dynamically (image1, image2, ..., imageN)
                        const imageKeys = Object.keys(imagePrompts)
                            .filter(key => /^image\d+$/.test(key))
                            .sort((a, b) => parseInt(a.replace('image', '')) - parseInt(b.replace('image', '')));

                        console.log(`[Carousel Images] Generating ${imageKeys.length} carousel images for character: ${character_id || 'unspecified'}...`);

                        const promptsWithIndices: { prompt: string, index: number }[] = [];
                        for (const key of imageKeys) {
                            if (imagePrompts[key]) {
                                const index = parseInt(key.replace('image', '')) - 1; // 0-indexed
                                promptsWithIndices.push({
                                    prompt: flattenImagePrompt(imagePrompts[key], { includeUgcStyle: service !== 'dbt' }),
                                    index: index
                                });
                            }
                        }

                        if (promptsWithIndices.length === 0) {
                            return sendJSON({ error: "No valid image prompts found" }, 400);
                        } else {
                            // ONLY load anchor if this is the SYP service
                            // DBT-Mind must be pure prompt-based to achieve the classical painting style
                            let anchor = null;
                            if (service === 'syp' && character_id) {
                                console.log(`[Carousel Images] Looking for anchor for character_id: "${character_id}" (Service: SYP)`);
                                anchor = getAnchorImage(character_id, ANCHORS_DIR);
                                if (anchor) {
                                    console.log(`[Carousel Images] ✅ ANCHOR FOUND - data length: ${anchor.data?.length}, mimeType: ${anchor.mimeType}`);
                                } else {
                                    console.log(`[Carousel Images] ⚠️ NO ANCHOR FOUND for "${character_id}"`);
                                }
                            } else {
                                console.log(`[Carousel Images] Skipping anchor load for service: ${service || 'unknown'} (DBT uses pure prompting)`);
                            }

                            // Generate images one by one or using the batch logic
                            // To preserve indices correctly, we'll map them back
                            const results = [];
                            for (const item of promptsWithIndices) {
                                console.log(`[Carousel Images] Generating slide ${item.index + 1}/${imageKeys.length}...`);

                                let anchorToUse = anchor;
                                // DBT uses pure prompting, no anchor
                                if (service === 'dbt') anchorToUse = null;

                                const result = anchorToUse
                                    ? await generateImageWithReferences(item.prompt, [anchorToUse], GEMINI_API_KEY, { aspectRatio: "9:16", imageSize: "2K" })
                                    : await generateImage(item.prompt, GEMINI_API_KEY, { aspectRatio: "9:16", imageSize: "2K" });

                                results.push({
                                    slideIndex: item.index,
                                    result: result
                                });

                                // Small delay between requests to be nice to the API
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }

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
                    const { prompt, aspectRatio = "9:16" } = await req.json() as any;
                    if (!prompt) {
                        return sendJSON({ error: "Prompt is required" }, 400);
                    } else {
                        console.log(`[Custom Image] Generating with raw prompt: ${prompt.substring(0, 50)}...`);

                        const result = await generateImage(prompt, GEMINI_API_KEY, {
                            aspectRatio: aspectRatio,
                            imageSize: "2K"
                        });

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
                    const { prompt, referenceImages = [], slideIndex = 0, service, slideText = '', brandingMode } = body;

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

                        // ===== SAVEYOURPET.DE WEBSITE SCREENSHOT INJECTION =====
                        // Check if this is a SYP slide that needs the website screenshot
                        const isSypProject = service === 'syp';
                        const saveyourpetKeywords = [
                            'saveyourpet.de', 'saveyourpet',
                            'absicherung', 'vorsorge', 'schutz für',
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
                                { aspectRatio: "9:16", imageSize: "2K" }
                            );
                        } else {
                            result = await generateImage(flatPrompt, GEMINI_API_KEY, {
                                aspectRatio: "9:16",
                                imageSize: "2K"
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
