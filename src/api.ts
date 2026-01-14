import { Database } from "bun:sqlite";
import path from "path";

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
                const { topic, archetype } = await req.json() as any;
                if (!topic) {
                    response = Response.json({ error: "Topic required" }, { status: 400 });
                } else {
                    // Load trends if available
                    let trends: any = null;
                    try {
                        const trendsPath = path.join(process.cwd(), 'data', 'trends_snapshot.json');
                        const content = require("fs").readFileSync(trendsPath, "utf8");
                        trends = JSON.parse(content);
                    } catch (e) {
                        // Fallback
                    }

                    console.log(`[Generate] Creating ${archetype || "Random"} hook for: ${topic}`);

                    // Fetch a few examples for the prompt
                    const examples = db.query("SELECT hook_text FROM viral_hooks WHERE archetype = ? ORDER BY RANDOM() LIMIT 3").all(archetype || "The Warning / Signs");

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
                                    content: `You are a viral TikTok strategy and psychology expert for Millennials and Gen-Z (demographic: ages 20-35).
                                    
                                    TASK: Generate 3 VIRAL SLIDESHOW HOOKS (headlines) for the topic: "${topic}"
                                    ARCHETYPE: ${archetype || "The Warning / Signs"}
                                    
                                    STYLE GUIDELINES (STRICT):
                                    - NO EMOJIS.
                                    - NO HASHTAGS.
                                    - Tone: Authentic, deeply relatable, and slightly intellectual. 
                                    - Avoid "internet slang" (e.g., no 'lowkey', 'gatekeeping', 'mfs').
                                    - Focus on specific human experiences, realizations, or struggles.
                                    
                                    CURRENT PSYCHOLOGICAL TRENDS: ${trends?.slang?.slice(0, 5).join(', ') || 'personal growth, mental clarity, recovery'}
                                    FORMATTING: ${trends?.formatting_rules?.join(', ') || 'no periods, conversational'}
                                    
                                    INSPIRATION FROM VIRAL POSTS:
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

