import { Database } from "bun:sqlite";

const db = new Database("data/hooks.db");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

type Hook = {
    id: string;
    hook_text: string;
    niche: string;
};

const ARCHETYPES = [
    { name: "The POV Realization", description: "Describes a relatable situational moment or realization (e.g., 'POV: you realize...')" },
    { name: "The Warning / Signs", description: "Lists symptoms or signs of a problem (e.g., '3 signs of high-functioning anxiety')" },
    { name: "The Identity Label", description: "Directly addresses a specific type of person (e.g., 'To the girls with abandonment issues')" },
    { name: "The Controversial Truth", description: "Challenges common beliefs or states a hard truth (e.g., 'Your FP is actually destroying you')" },
    { name: "The Secret Sauce", description: "Promises hidden knowledge or a quick fix (e.g., 'The one skill that fixed my BPD splitting')" },
    { name: "The Emotional Vent", description: "Short, punching emotional expression or relatable struggle" }
];

async function getArchetype(hookText: string): Promise<string> {
    if (!ANTHROPIC_API_KEY) return "Uncategorized";

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
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: `Categorize the following TikTok hook into EXACTLY ONE of these archetypes:
                    ${ARCHETYPES.map(a => `${a.name}: ${a.description}`).join('\n')}
                    
                    Hook: "${hookText}"
                    
                    Return ONLY the name of the archetype.`
                }]
            })
        });

        const data = await response.json() as any;
        const result = data.content?.[0]?.text?.trim();

        // Match against known archetypes to handle slight LLM variations
        return ARCHETYPES.find(a => result?.includes(a.name))?.name || "The POV Realization";
    } catch (e) {
        return "The POV Realization";
    }
}

async function analyze() {
    const hooks = db.query("SELECT id, hook_text, niche FROM viral_hooks WHERE archetype IS NULL").all() as Hook[];
    console.log(`Analyzing ${hooks.length} hooks...`);

    for (const hook of hooks) {
        const archetype = await getArchetype(hook.hook_text);
        db.run("UPDATE viral_hooks SET archetype = ? WHERE id = ?", [archetype, hook.id]);
        console.log(`Labled: "${hook.hook_text.substring(0, 30)}..." as [${archetype}]`);
    }

    // Summary
    const stats = db.query("SELECT archetype, COUNT(*) as count, AVG(view_count) as avg_views FROM viral_hooks GROUP BY archetype ORDER BY count DESC").all();
    console.log("\n--- Archetype Distribution ---");
    console.table(stats);
}

analyze();
