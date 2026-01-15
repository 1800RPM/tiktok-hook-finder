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
                const { topic, archetype, slides, framework_type, topic_hint } = await req.json() as any;
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
                                    content: `You are a viral TikTok Content Architect specializing in "Curiosity Gaps."

${slides && slides.length > 0 ? `
## TOPIC/CONTEXT:
${topic_hint ? `The current hook/topic is: "${topic_hint}"` : topic ? `Topic: "${topic}"` : 'Infer the topic from the slides below.'}

## SLIDE BODY CONTENT (Slides 2-6):
${slides.map((s: any, i: number) => `Slide ${i + 2}: ${typeof s === 'string' ? s : s.text}`).join('\n')}

## YOUR TASK:
Generate 3 VIRAL HOOKS (for Slide 1) that "open the loop" for the story above.
The hook MUST directly reference or tease the core themes in these slides.
DO NOT generate generic hooks. The hook should feel like it was written FOR these slides.
` : `
## YOUR TASK:
Generate 3 VIRAL HOOKS for the topic: "${topic}"
`}


## HOOK STYLE: ${framework_type || 'Choose the best fit'}
- Forbidden Knowledge: Authority-challenging, "secrets" (e.g. "The truth your therapist won't say").
- Specific Number: List-based IF the slides have a list structure (e.g. "3 BPD truths I learned").
- Pattern Interrupt: Reframes, confrontational (e.g. "You're not sensitive. You're under-regulated.").
- Transformation: Before/After (e.g. "6 months ago vs now").

## CRITICAL RULES:
- ONE SENTENCE ONLY. MAX 12 WORDS.
- DO NOT describe (AVOID: "an unfiltered look...").
- MUST reference the content/themes from the slides if provided.
- NO EMOJIS / NO HASHTAGS.

Output format: JSON array of 3 strings only. No other text.`






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

