import { Database } from "bun:sqlite";

const db = new Database("data/hooks.db");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const PORT = 3001; // Using 3001 to avoid conflicts

console.log(`🚀 Hook Bridge API starting on http://localhost:${PORT}`);

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);

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
            return Response.json(hooks);
        }

        // POST /generate - Generate a new hook using Claude and our Blueprints
        if (url.pathname === "/generate" && req.method === "POST") {
            if (!ANTHROPIC_API_KEY) return Response.json({ error: "API Key missing" }, { status: 500 });

            const { topic, archetype } = await req.json() as any;
            if (!topic) return Response.json({ error: "Topic required" }, { status: 400 });

            console.log(`[Generate] Creating ${archetype || "Random"} hook for: ${topic}`);

            // Fetch a few examples for the prompt
            const examples = db.query("SELECT hook_text FROM viral_hooks WHERE archetype = ? ORDER BY RANDOM() LIMIT 3").all(archetype || "The Warning / Signs");

            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
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
                            content: `You are a viral TikTok marketing expert. 
                            Generate 3 VIRAL SLIDESHOW HOOKS (headlines) for the topic: "${topic}"
                            
                            Use the following marketing archetype: ${archetype || "The Warning / Signs"}
                            
                            Inspiration from viral hooks:
                            ${examples.map((e: any) => `- ${e.hook_text}`).join('\n')}
                            
                            Output format: JSON array of strings only. No other text.`
                        }]
                    })
                });

                const data = await response.json() as any;
                const resultText = data.content?.[0]?.text;
                return Response.json({ hooks: JSON.parse(resultText) });
            } catch (e) {
                return Response.json({ error: "Generation failed" }, { status: 500 });
            }
        }

        return new Response("Hook Finder API is running!", { status: 200 });
    },
});
