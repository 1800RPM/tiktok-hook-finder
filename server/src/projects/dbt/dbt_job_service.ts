import type { Database } from "bun:sqlite";
import { generateImage } from "../../image_generator";
import { generateDbtSlides } from "./dbt_service";

export type DbtTopicMode = "random" | "fixed";

export interface DbtJobInput {
    topic_mode?: DbtTopicMode;
    topic?: string;
    includeBranding?: boolean;
    artStyle?: string;
    generateImages?: boolean;
    generateMetadata?: boolean;
    aspectRatio?: "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
    imageMaxRetries?: number;
}

interface DbtJobRunnerKeys {
    anthropicApiKey: string;
    geminiApiKey?: string;
}

const DBT_TOPICS = [
    "FP Dynamics",
    "Splitting",
    "Abandonment Panic",
    "Relationship Cycles",
    "Quiet BPD",
    "Identity/Sense of Self",
    "Emotional Dysregulation",
    "Reframes/Truths",
    "DBT Skills",
    "Recovery Milestones",
    "Therapy Truths",
    "Rejection Sensitivity",
    "Digital Self-Harm"
] as const;

export function getDbtTopics(): string[] {
    return [...DBT_TOPICS];
}

export function initDbtJobTables(db: Database): void {
    db.run(`
        CREATE TABLE IF NOT EXISTS dbt_post_jobs (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            topic_mode TEXT NOT NULL,
            requested_topic TEXT,
            selected_topic TEXT,
            input_json TEXT NOT NULL,
            output_json TEXT,
            error_text TEXT,
            current_step TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS dbt_post_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            step TEXT NOT NULL,
            status TEXT NOT NULL,
            details_json TEXT,
            error_text TEXT,
            started_at TEXT,
            ended_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(job_id) REFERENCES dbt_post_jobs(id)
        )
    `);
}

export function createDbtJob(db: Database, input: DbtJobInput): { id: string; status: string } {
    const topicMode: DbtTopicMode = input.topic_mode === "fixed" ? "fixed" : "random";
    const requestedTopic = (input.topic || "").trim();
    const canonicalTopic = findCanonicalTopic(requestedTopic);

    if (topicMode === "fixed") {
        if (!requestedTopic) throw new Error("topic is required when topic_mode is 'fixed'");
        if (!canonicalTopic) {
            throw new Error(`invalid topic '${requestedTopic}'`);
        }
    }

    const id = `dbt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const normalized: DbtJobInput = {
        topic_mode: topicMode,
        topic: canonicalTopic || requestedTopic || undefined,
        includeBranding: input.includeBranding !== false,
        artStyle: input.artStyle,
        generateImages: input.generateImages !== false,
        generateMetadata: input.generateMetadata !== false,
        aspectRatio: input.aspectRatio || "9:16",
        imageMaxRetries: clampRetries(input.imageMaxRetries)
    };

    db.query(`
        INSERT INTO dbt_post_jobs (
            id, status, topic_mode, requested_topic, input_json, current_step
        ) VALUES (?, 'queued', ?, ?, ?, 'queued')
    `).run(id, topicMode, requestedTopic || null, JSON.stringify(normalized));

    return { id, status: "queued" };
}

export function getDbtJob(db: Database, id: string): any | null {
    const job = db.query(`
        SELECT id, status, topic_mode, requested_topic, selected_topic, input_json, output_json, error_text, current_step, created_at, updated_at
        FROM dbt_post_jobs
        WHERE id = ?
    `).get(id) as any;

    if (!job) return null;

    const steps = db.query(`
        SELECT step, status, details_json, error_text, started_at, ended_at, created_at
        FROM dbt_post_steps
        WHERE job_id = ?
        ORDER BY id ASC
    `).all(id) as any[];

    return {
        ...job,
        input: tryParseJson(job.input_json),
        output: tryParseJson(job.output_json),
        steps: steps.map((s) => ({
            ...s,
            details: tryParseJson(s.details_json)
        }))
    };
}

export async function runDbtJob(db: Database, jobId: string, keys: DbtJobRunnerKeys): Promise<void> {
    const row = db.query(`SELECT input_json, topic_mode, requested_topic FROM dbt_post_jobs WHERE id = ?`).get(jobId) as any;
    if (!row) throw new Error(`job not found: ${jobId}`);

    const input = (tryParseJson(row.input_json) || {}) as DbtJobInput;
    const selectedTopic = resolveTopic(input);

    updateJob(db, jobId, {
        status: "running",
        current_step: "generate_slides",
        selected_topic: selectedTopic,
        error_text: null
    });

    const output: any = {
        selected_topic: selectedTopic
    };

    try {
        startStep(db, jobId, "generate_slides");
        const native = await generateDbtSlides({
            ANTHROPIC_API_KEY: keys.anthropicApiKey,
            topic: selectedTopic,
            includeBranding: input.includeBranding !== false,
            artStyle: input.artStyle || "hopper"
        });
        output.visual_style = native.visual_style;
        output.slides = native.slides || [];
        output.image_prompts = native.image_prompts || {};
        completeStep(db, jobId, "generate_slides", {
            slide_count: Array.isArray(native.slides) ? native.slides.length : 0,
            visual_style: native.visual_style
        });

        if (input.generateImages !== false) {
            if (!keys.geminiApiKey) throw new Error("Gemini API key missing for image generation");
            updateJob(db, jobId, { current_step: "generate_images" });
            startStep(db, jobId, "generate_images");

            const prompts = orderedPromptList(native.image_prompts || {});
            const images = [];
            const maxRetries = clampRetries(input.imageMaxRetries);
            output.image_progress = {
                total: prompts.length,
                completed: 0,
                failed: 0,
                statuses: [] as Array<{ slideIndex: number; success: boolean; attempts: number; error: string | null }>,
                status: "running"
            };
            updateJob(db, jobId, { output_json: JSON.stringify(output) });
            updateRunningStepDetails(db, jobId, "generate_images", {
                image_total: prompts.length,
                image_completed: 0,
                image_failed: 0,
                max_retries: maxRetries
            });

            for (let i = 0; i < prompts.length; i++) {
                const result = await generateImageWithRetry(
                    prompts[i] || "",
                    keys.geminiApiKey,
                    input.aspectRatio || "9:16",
                    maxRetries
                );
                images.push({
                    slideIndex: i,
                    success: result.success,
                    image: result.image,
                    error: result.error || null,
                    attempts: result.attempts
                });

                output.image_progress.statuses.push({
                    slideIndex: i,
                    success: result.success,
                    attempts: result.attempts,
                    error: result.error || null
                });
                if (result.success) output.image_progress.completed += 1;
                else output.image_progress.failed += 1;

                updateRunningStepDetails(db, jobId, "generate_images", {
                    image_total: prompts.length,
                    image_completed: output.image_progress.completed,
                    image_failed: output.image_progress.failed,
                    last_slide_index: i,
                    max_retries: maxRetries
                });
                updateJob(db, jobId, { output_json: JSON.stringify(output) });
            }

            const failed = images.filter((i) => !i.success).length;
            if (failed > 0) throw new Error(`image generation failed for ${failed} slide(s)`);

            output.images = images;
            output.image_progress.status = "completed";
            completeStep(db, jobId, "generate_images", {
                image_count: images.length,
                max_retries: maxRetries
            });
        }

        if (input.generateMetadata !== false) {
            updateJob(db, jobId, { current_step: "generate_metadata" });
            startStep(db, jobId, "generate_metadata");
            const slidesText = (output.slides || []).map((s: string, i: number) => `Slide ${i + 1}: ${s}`).join("\n");
            const metadata = await generateDbtMetadata(slidesText, keys.anthropicApiKey);
            output.metadata = metadata;
            completeStep(db, jobId, "generate_metadata", {
                has_title: Boolean(metadata.title),
                has_description: Boolean(metadata.description)
            });
        }

        updateJob(db, jobId, {
            status: "completed",
            current_step: "done",
            output_json: JSON.stringify(output),
            error_text: null
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failCurrentRunningStep(db, jobId, message);
        updateJob(db, jobId, {
            status: "failed",
            current_step: "failed",
            output_json: JSON.stringify(output),
            error_text: message
        });
    }
}

function resolveTopic(input: DbtJobInput): string {
    if (input.topic_mode === "fixed") {
        const topic = (input.topic || "").trim();
        const canonicalTopic = findCanonicalTopic(topic);
        if (!canonicalTopic) {
            throw new Error(`invalid topic '${topic}'`);
        }
        return canonicalTopic;
    }
    return DBT_TOPICS[Math.floor(Math.random() * DBT_TOPICS.length)] || "FP Dynamics";
}

function findCanonicalTopic(topic: string): string | null {
    if (!topic) return null;
    const found = DBT_TOPICS.find((t) => t.toLowerCase() === topic.toLowerCase());
    return found || null;
}

function clampRetries(value: number | undefined): number {
    const fallback = 2;
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(5, Math.floor(value)));
}

async function generateImageWithRetry(
    prompt: string,
    apiKey: string,
    aspectRatio: "9:16" | "16:9" | "1:1" | "4:3" | "3:4",
    maxRetries: number
): Promise<{ success: boolean; image: { data: string; mime_type: string } | null; error?: string; attempts: number }> {
    let lastError = "unknown image generation error";
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const generated = await generateImage(prompt, apiKey, {
            aspectRatio,
            imageSize: "0.5K"
        });
        const first = generated.images?.[0];
        if (generated.success && first) {
            return {
                success: true,
                image: { data: first.data, mime_type: first.mimeType },
                attempts: attempt + 1
            };
        }

        lastError = generated.error || "No images generated";
        if (attempt < maxRetries) {
            const delayMs = 600 * (attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    return {
        success: false,
        image: null,
        error: lastError,
        attempts: maxRetries + 1
    };
}

function orderedPromptList(imagePrompts: Record<string, string>): string[] {
    const keys = Object.keys(imagePrompts)
        .filter((k) => /^slide\d+$/i.test(k))
        .sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));

    return keys.map((k) => imagePrompts[k] || "");
}

function tryParseJson(input: string | null | undefined): any {
    if (!input) return null;
    try {
        return JSON.parse(input);
    } catch {
        return null;
    }
}

function startStep(db: Database, jobId: string, step: string): void {
    db.query(`
        INSERT INTO dbt_post_steps (job_id, step, status, started_at)
        VALUES (?, ?, 'running', CURRENT_TIMESTAMP)
    `).run(jobId, step);
}

function completeStep(db: Database, jobId: string, step: string, details: any): void {
    db.query(`
        UPDATE dbt_post_steps
        SET status = 'completed', ended_at = CURRENT_TIMESTAMP, details_json = ?
        WHERE id = (
            SELECT id FROM dbt_post_steps
            WHERE job_id = ? AND step = ? AND status = 'running'
            ORDER BY id DESC
            LIMIT 1
        )
    `).run(JSON.stringify(details || {}), jobId, step);
}

function updateRunningStepDetails(db: Database, jobId: string, step: string, details: any): void {
    db.query(`
        UPDATE dbt_post_steps
        SET details_json = ?
        WHERE id = (
            SELECT id FROM dbt_post_steps
            WHERE job_id = ? AND step = ? AND status = 'running'
            ORDER BY id DESC
            LIMIT 1
        )
    `).run(JSON.stringify(details || {}), jobId, step);
}

function failCurrentRunningStep(db: Database, jobId: string, message: string): void {
    db.query(`
        UPDATE dbt_post_steps
        SET status = 'failed', ended_at = CURRENT_TIMESTAMP, error_text = ?
        WHERE id = (
            SELECT id FROM dbt_post_steps
            WHERE job_id = ? AND status = 'running'
            ORDER BY id DESC
            LIMIT 1
        )
    `).run(message, jobId);
}

function updateJob(db: Database, jobId: string, patch: Record<string, any>): void {
    const fields = Object.keys(patch);
    if (fields.length === 0) return;

    const sets = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => patch[f]);

    db.query(`
        UPDATE dbt_post_jobs
        SET ${sets}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(...values, jobId);
}

async function generateDbtMetadata(slidesText: string, apiKey: string): Promise<{ title: string; description: string }> {
    const systemPrompt = `You are a TikTok Content Strategist for DBT-Mind posts.
Write output in ENGLISH only.

DBT CAPTION FORMAT (strict):
1) emotional hook (1 line)
2) personal insight (1-2 short sentences)
3) app mention sentence including "@dbtmind"
4) hashtags on final line including #bpd #dbtskills #bpdrecovery plus 1-2 relevant extras

Global rules:
- lowercase only
- personal, raw, conversational tone
- no sales language
- no "link in bio"

Return ONLY valid JSON: {"title":"...","description":"..."}`;

    const userPrompt = `Generate title and description for these slides:\n${slidesText}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        },
        body: JSON.stringify({
            model: "claude-opus-4-6",
            max_tokens: 800,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`metadata generation failed: ${text}`);
    }

    const raw = (await response.json()) as any;
    const resultText = raw.content?.[0]?.text || "";
    const match = resultText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : resultText);

    return {
        title: String(parsed.title || "").trim(),
        description: String(parsed.description || "").trim()
    };
}
