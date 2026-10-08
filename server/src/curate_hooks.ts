import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type HookRow = {
    id: string;
    hook_text: string;
    view_count: number;
    share_count: number;
    like_count: number;
    niche: string;
};

type HookEvaluation = {
    id: string;
    mental_health_fit: number;
    tiktok_native_score: number;
    curiosity_gap_score: number;
    relationship_relevance: number;
    reusable_mechanic: string;
    notes: string;
};

function loadEnvFile(path: string) {
    if (!existsSync(path)) return;

    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;

        const key = match[1];
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
    }
}

function clampScore(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(10, Math.round(parsed)));
}

function extractJsonArray(value: string) {
    const match = value.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found in LLM response");
    return JSON.parse(match[0]);
}

loadEnvFile(join(process.cwd(), ".env"));
loadEnvFile(join(process.cwd(), "..", ".env"));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing. Add it to .env or server/.env before running hook curation.");
}

const db = new Database("data/hooks.db", { create: true });

db.query(`
  CREATE TABLE IF NOT EXISTS hook_style_evaluations (
    hook_id TEXT PRIMARY KEY,
    mental_health_fit INTEGER NOT NULL,
    tiktok_native_score INTEGER NOT NULL,
    curiosity_gap_score INTEGER NOT NULL,
    relationship_relevance INTEGER NOT NULL,
    reusable_mechanic TEXT,
    notes TEXT,
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hook_id) REFERENCES viral_hooks(id)
  );
`).run();

const upsertEvaluation = db.prepare(`
  INSERT INTO hook_style_evaluations (
    hook_id,
    mental_health_fit,
    tiktok_native_score,
    curiosity_gap_score,
    relationship_relevance,
    reusable_mechanic,
    notes,
    evaluated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(hook_id) DO UPDATE SET
    mental_health_fit = excluded.mental_health_fit,
    tiktok_native_score = excluded.tiktok_native_score,
    curiosity_gap_score = excluded.curiosity_gap_score,
    relationship_relevance = excluded.relationship_relevance,
    reusable_mechanic = excluded.reusable_mechanic,
    notes = excluded.notes,
    evaluated_at = CURRENT_TIMESTAMP;
`);

const limitArg = Number(process.argv.find(arg => arg.startsWith("--limit="))?.split("=")[1] || 500);
const batchSize = Number(process.argv.find(arg => arg.startsWith("--batch-size="))?.split("=")[1] || 25);
const maxRetries = Number(process.argv.find(arg => arg.startsWith("--retries="))?.split("=")[1] || 5);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const hooks = db.query(`
    SELECT
      id,
      hook_text,
      COALESCE(view_count, 0) AS view_count,
      COALESCE(share_count, 0) AS share_count,
      COALESCE(like_count, 0) AS like_count,
      COALESCE(niche, '') AS niche
    FROM viral_hooks
    WHERE content_type = 'slideshow'
      AND hook_text IS NOT NULL
      AND trim(hook_text) != ''
      AND length(hook_text) BETWEEN 8 AND 140
      AND id NOT IN (SELECT hook_id FROM hook_style_evaluations)
    ORDER BY share_count DESC, view_count DESC, like_count DESC
    LIMIT ?
`).all(limitArg) as HookRow[];

console.log(`[Hook Curation] Evaluating ${hooks.length} unevaluated slideshow hooks...`);

async function evaluateBatch(batch: HookRow[]): Promise<HookEvaluation[]> {
    const prompt = `You are evaluating TikTok slideshow hooks as reusable style references for a DBT/BPD mental health story account.

Ideal viewer: a 23-year-old woman in the US with BPD. She responds to hooks that feel native to TikTok, emotionally specific, intimate, relationship-aware, and curiosity-driven.

Score each hook from 0-10:
- mental_health_fit: useful for mental health, loneliness, relationships, shame, attachment, therapy, identity, emotional struggle, or recovery
- tiktok_native_score: sounds like a real TikTok slideshow hook, not polished marketing
- curiosity_gap_score: creates "wait, what happens next?" or an unresolved open loop
- relationship_relevance: useful for boyfriend/girlfriend/attachment/BPD relationship story hooks

Also write:
- reusable_mechanic: the hook mechanic in 8 words max
- notes: short reason in 14 words max

Do not reward hooks just because they have huge views. Evaluate style transfer value.

Return only valid JSON array. One object per input:
[
  {
    "id": "hook id",
    "mental_health_fit": 0,
    "tiktok_native_score": 0,
    "curiosity_gap_score": 0,
    "relationship_relevance": 0,
    "reusable_mechanic": "short mechanic",
    "notes": "short reason"
  }
]

HOOKS:
${batch.map((hook, index) => `${index + 1}. id=${hook.id}\ntext="${hook.hook_text}"\nniche="${hook.niche}"\nviews=${hook.view_count} shares=${hook.share_count}`).join("\n\n")}`;

    let lastError = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": ANTHROPIC_API_KEY!,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 4000,
                messages: [{ role: "user", content: prompt }]
            })
        });

        if (response.ok) {
            const data = await response.json() as any;
            const text = data.content?.[0]?.text || "";
            const parsed = extractJsonArray(text);
            return Array.isArray(parsed) ? parsed : [];
        }

        const errorText = await response.text();
        lastError = errorText;
        const overloaded = response.status === 529 || errorText.toLowerCase().includes("overloaded");
        const rateLimited = response.status === 429 || errorText.toLowerCase().includes("rate");
        const retryable = overloaded || rateLimited || response.status >= 500;

        if (!retryable || attempt === maxRetries) {
            throw new Error(`Anthropic API Error: ${errorText}`);
        }

        const delayMs = Math.min(60000, (2000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 1000));
        console.warn(`[Hook Curation] Anthropic busy/rate-limited. Retrying batch in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await sleep(delayMs);
    }

    throw new Error(`Anthropic API Error: ${lastError || "unknown error"}`);
}

for (let i = 0; i < hooks.length; i += batchSize) {
    const batch = hooks.slice(i, i + batchSize);
    console.log(`[Hook Curation] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(hooks.length / batchSize)} (${batch.length})`);

    let evaluations: HookEvaluation[] = [];
    try {
        evaluations = await evaluateBatch(batch);
    } catch (error) {
        console.error(`[Hook Curation] Batch failed after retries. Skipping this batch so the job can continue.`, error);
        continue;
    }
    const knownIds = new Set(batch.map(hook => hook.id));

    db.transaction(() => {
        for (const evaluation of evaluations) {
            if (!knownIds.has(String(evaluation.id))) continue;

            upsertEvaluation.run(
                String(evaluation.id),
                clampScore(evaluation.mental_health_fit),
                clampScore(evaluation.tiktok_native_score),
                clampScore(evaluation.curiosity_gap_score),
                clampScore(evaluation.relationship_relevance),
                String(evaluation.reusable_mechanic || "").slice(0, 120),
                String(evaluation.notes || "").slice(0, 240)
            );
        }
    })();

    console.log(`[Hook Curation] Saved ${evaluations.length} evaluations.`);
}

const summary = db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN mental_health_fit >= 7 AND tiktok_native_score >= 7 AND curiosity_gap_score >= 6 AND relationship_relevance >= 5 THEN 1 ELSE 0 END) AS selected
    FROM hook_style_evaluations
`).get() as { total: number; selected: number };

console.log(`[Hook Curation] Done. Evaluated: ${summary.total}. Selected for style pool: ${summary.selected}.`);
