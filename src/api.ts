import { Database } from "bun:sqlite";
import path from "path";
import { readFileSync } from "fs";

const db = new Database("data/hooks.db");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const PORT = 3001; // Using 3001 to avoid conflicts

console.log(`🚀 Hook Bridge API starting on http://localhost:${PORT}`);

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);

        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        // Handle OPTIONS request
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        let response: Response;

        // GET /hooks - Get viral hooks from the DB
        if (url.pathname === "/hooks" && req.method === "GET") {
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
            response = Response.json(hooks);
        }
        // POST /generate - Generate a new hook using Claude and our Blueprints
        else if (url.pathname === "/generate" && req.method === "POST") {
            if (!ANTHROPIC_API_KEY) {
                response = Response.json({ error: "API Key missing" }, { status: 500 });
            } else {
                const { topic, archetype, slides, framework_type } = await req.json() as any;
                if (!topic && (!slides || slides.length === 0)) {
                    response = Response.json({ error: "Topic or Slides required" }, { status: 400 });
                } else {


                    // Load trends if available
                    let trends: any = null;
                    try {
                        const trendsPath = path.join(process.cwd(), 'data', 'trends_snapshot.json');
                        const content = readFileSync(trendsPath, "utf8");
                        trends = JSON.parse(content);
                    } catch (e) {
                        console.log("[Generate] Trends snapshot not found, using defaults");
                    }


                    console.log(`[Generate] Creating ${archetype || "Random"} hook for: ${topic}`);

                    // Fetch TOP 5 examples for the prompt to give it the "viral DNA"
                    const examples = db.query("SELECT hook_text FROM viral_hooks WHERE archetype = ? ORDER BY view_count DESC LIMIT 5").all(archetype || "The Warning / Signs");


                    try {
                        const claudResponse = await fetch('https://api.anthropic.com/v1/messages', {
                            method: 'POST',
                            headers: {
                                'x-api-key': ANTHROPIC_API_KEY,
                                'anthropic-version': '2023-06-01',
                                'content-type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: 'claude-3-haiku-20240307',
                                max_tokens: 200,
                                messages: [{
                                    role: 'user',
                                    content: `You are a viral TikTok Content Architect. Your goal is to create high-stakes "Curiosity Gaps" that stop the scroll instantly.
                                    
                                    TASK: Generate 3 VIRAL SLIDESHOW HOOKS.
                                    TOPIC: "${topic || "Analysis of provided slides"}"
                                    ARCHETYPE: ${archetype || "The Warning / Signs"}
                                    ${slides ? `FULL SLIDE CONTEXT:\n${slides.map((s: any, i: number) => `Slide ${i + 1}: ${typeof s === 'string' ? s : s.text}`).join('\n')}` : ''}
                                    
                                    HOOK FRAMEWORK TO USE:
                                    1. Forbidden Knowledge: Authority-challenging, "secrets" (e.g. "The truth your therapist won't say").
                                    2. Specific Number: List-based, authority-building (e.g. "5 BPD lies I believed for years").
                                    3. Pattern Interrupt: Reframes, confrontational energy (e.g. "You're not empathic. You're hypervigilant.").
                                    4. Transformation: Before/After, success stories (e.g. "6 months ago vs now").
                                    
                                    ${framework_type ? `REQUIRED FRAMEWORK: ${framework_type}` : 'Choose the best framework(s) based on the topic/slides.'}
                                    
                                    CRITICAL RULES (STRICT):
                                    - ONE SENTENCE ONLY. MAX 12 WORDS.
                                    - DO NOT summarize or describe (AVOID: "an unfiltered look...", "why i...").
                                    - IF SLIDES ARE PROVIDED: Ensure the hook "opens the loop" for the specific story in the slides.
                                    - WRITE THE HOOK AS THE CONTENT (e.g. "i finally realized the real reason i split").
                                    - NO EMOJIS / NO HASHTAGS.
                                    
                                    DNA TRENDS: ${trends?.slang?.slice(0, 5).join(', ') || 'hard truth, realization'}
                                    AESTHETIC: ${trends?.formatting_rules?.slice(0, 2).join(', ') || 'single sentence, intrigue'}
                                    
                                    INSPIRATION (Top Viral DNA):
                                    ${examples.map((e: any) => `- ${e.hook_text}`).join('\n')}
                                    
                                    Output format: JSON array of strings only. No other text.`





                                }]
                            })
                        });


                        const data = await claudResponse.json() as any;
                        const resultText = data.content?.[0]?.text;
                        response = Response.json({ hooks: JSON.parse(resultText) });
                    } catch (e) {
                        response = Response.json({ error: "Generation failed" }, { status: 500 });
                    }
                }
            }
        } else {
            response = new Response("Hook Finder API is running!", { status: 200 });
        }

        // Add CORS headers to the response
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    },
});

