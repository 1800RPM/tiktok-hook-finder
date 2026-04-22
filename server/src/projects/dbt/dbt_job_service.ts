import type { Database } from "bun:sqlite";
import { generateImage } from "../../image_generator";
import { generateDbtSlides } from "./dbt_service";
import sharp from "sharp";
import path from "path";
import { existsSync, readFileSync } from "fs";

export type DbtTopicMode = "random" | "fixed";

export interface DbtJobInput {
    topic_mode?: DbtTopicMode;
    topic?: string;
    includeBranding?: boolean;
    artStyle?: string;
    generateImages?: boolean;
    generateMetadata?: boolean;
    renderTextOverlay?: boolean;
    aspectRatio?: "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
    imageMaxRetries?: number;
}

interface DbtJobRunnerKeys {
    anthropicApiKey: string;
    openaiApiKey?: string;
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
        renderTextOverlay: input.renderTextOverlay !== false,
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
        const slidesResult = await withRetry(
            async (attempt: number) => {
                updateRunningStepDetails(db, jobId, "generate_slides", {
                    attempt,
                    max_attempts: 4
                });
                return await generateDbtSlides({
                    ANTHROPIC_API_KEY: keys.anthropicApiKey,
                    topic: selectedTopic,
                    includeBranding: input.includeBranding !== false,
                    artStyle: "symbolic"
                });
            },
            {
                maxAttempts: 4,
                baseDelayMs: 2000,
                shouldRetry: isRetryableAnthropicError
            }
        );
        const native = slidesResult.result;
        output.visual_style = native.visual_style;
        output.slides = native.slides || [];
        output.image_prompts = native.image_prompts || {};
        completeStep(db, jobId, "generate_slides", {
            slide_count: Array.isArray(native.slides) ? native.slides.length : 0,
            visual_style: native.visual_style,
            attempts: slidesResult.attempts
        });

        if (input.generateImages !== false) {
            if (!keys.openaiApiKey) throw new Error("OpenAI API key missing for image generation");
            updateJob(db, jobId, { current_step: "generate_images" });
            startStep(db, jobId, "generate_images");

            const prompts = orderedPromptList(native.image_prompts || {});
            const images = [];
            const maxRetries = clampRetries(input.imageMaxRetries);
            const staticTemplates = getDbtStaticTemplateMap(output.slides || []);
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
                const templateFilename = staticTemplates[i];
                const result = templateFilename
                    ? loadStaticTemplateImage(templateFilename, i)
                    : await generateImageWithRetry(
                        prompts[i] || "",
                        keys.openaiApiKey,
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

            if (input.renderTextOverlay !== false) {
                updateJob(db, jobId, { current_step: "render_overlays" });
                startStep(db, jobId, "render_overlays");

                const renderedImages = await renderSlidesWithTextOverlays(output.slides || [], images);
                output.rendered_images = renderedImages;
                output.images_with_text = renderedImages;

                completeStep(db, jobId, "render_overlays", {
                    rendered_count: renderedImages.length
                });
            }
        }

        if (input.generateMetadata !== false) {
            updateJob(db, jobId, { current_step: "generate_metadata" });
            startStep(db, jobId, "generate_metadata");
            const slidesText = (output.slides || []).map((s: string, i: number) => `Slide ${i + 1}: ${s}`).join("\n");
            const metadataResult = await withRetry(
                async (attempt: number) => {
                    updateRunningStepDetails(db, jobId, "generate_metadata", {
                        attempt,
                        max_attempts: 4
                    });
                    return await generateDbtMetadata(slidesText, keys.anthropicApiKey);
                },
                {
                    maxAttempts: 4,
                    baseDelayMs: 2500,
                    shouldRetry: isRetryableAnthropicError
                }
            );
            const metadata = metadataResult.result;
            output.metadata = metadata;
            completeStep(db, jobId, "generate_metadata", {
                has_title: Boolean(metadata.title),
                has_description: Boolean(metadata.description),
                attempts: metadataResult.attempts
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

function getDbtStaticTemplateMap(slides: string[]): Record<number, string> {
    const map: Record<number, string> = {};
    if (slides.length >= 1) map[0] = "slide1.png";
    if (slides.length >= 6) map[5] = "app_image.png";
    return map;
}

function loadStaticTemplateImage(
    filename: string,
    slideIndex: number
): { success: boolean; image: { data: string; mime_type: string } | null; error?: string; attempts: number } {
    const candidates = [
        path.join(process.cwd(), "data", "templates", filename),
        path.join(process.cwd(), "server", "data", "templates", filename),
        path.join(process.cwd(), "client", filename),
        path.join(process.cwd(), "..", "client", filename),
        path.join(process.cwd(), filename)
    ];

    const found = candidates.find((p) => existsSync(p));
    if (!found) {
        return {
            success: false,
            image: null,
            error: `static template not found for slide ${slideIndex + 1}: ${filename}`,
            attempts: 1
        };
    }

    const data = readFileSync(found).toString("base64");
    return {
        success: true,
        image: { data, mime_type: "image/png" },
        attempts: 1
    };
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
            imageSize: "1K"
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

async function renderSlidesWithTextOverlays(
    slides: string[],
    images: Array<{ slideIndex: number; success: boolean; image: { data: string; mime_type: string } | null }>
): Promise<Array<{ slideIndex: number; image: { data: string; mime_type: string } }>> {
    const rendered: Array<{ slideIndex: number; image: { data: string; mime_type: string } }> = [];

    for (const item of images) {
        if (!item.success || !item.image) {
            throw new Error(`render overlay failed: missing image for slide ${item.slideIndex + 1}`);
        }
        const slideText = String(slides[item.slideIndex] || "").trim();
        const baseBuffer = Buffer.from(item.image.data, "base64");
        const composed = await composeTextOverlay(baseBuffer, slideText, item.slideIndex);
        rendered.push({
            slideIndex: item.slideIndex,
            image: {
                data: composed.toString("base64"),
                mime_type: "image/png"
            }
        });
    }

    return rendered;
}

async function composeTextOverlay(baseImageBuffer: Buffer, text: string, slideIndex: number): Promise<Buffer> {
    const base = sharp(baseImageBuffer);
    const metadata = await base.metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1920;

    const fontSize = Math.max(30, Math.round(width * 0.045));
    const lineHeight = Math.round(fontSize * 1.18);
    const boxWidth = Math.round(width * 0.82);
    const boxX = Math.round((width - boxWidth) / 2);
    const maxCharsPerLine = Math.max(14, Math.floor((boxWidth * 0.82) / (fontSize * 0.58)));
    const paragraphGap = Math.round(fontSize * 0.45);
    const padX = Math.round(fontSize * 0.38);
    const padY = Math.round(fontSize * 0.26);
    const anchorY = Math.round(height * getOverlayAnchorY(slideIndex));

    const paragraphs = splitParagraphs(text).map((p) => wrapTextLines(p, maxCharsPerLine));
    const paragraphHeights = paragraphs.map((lines) => lines.length * lineHeight + padY * 2);
    const totalHeight = paragraphHeights.reduce((a, b) => a + b, 0) + Math.max(0, paragraphs.length - 1) * paragraphGap;
    let currentY = Math.round(anchorY - totalHeight / 2);

    const blocks: string[] = [];
    paragraphs.forEach((lines, idx) => {
        const blockHeight = paragraphHeights[idx] || 0;
        const rectY = currentY;
        const textStartY = rectY + padY + lineHeight - Math.round(fontSize * 0.2);
        const escapedLines = lines.map(escapeXml);

        blocks.push(
            `<rect x="${boxX}" y="${rectY}" rx="${Math.round(fontSize * 0.2)}" ry="${Math.round(fontSize * 0.2)}" width="${boxWidth}" height="${blockHeight}" fill="rgba(255,255,255,0.93)"/>`
        );

        escapedLines.forEach((line, lineIdx) => {
            const lineY = textStartY + lineIdx * lineHeight;
            blocks.push(
                `<text x="${Math.round(width / 2)}" y="${lineY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#111111">${line}</text>`
            );
        });

        currentY += blockHeight + paragraphGap;
    });

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${blocks.join("\n  ")}
</svg>`;

    return await base
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png()
        .toBuffer();
}

function getOverlayAnchorY(slideIndex: number): number {
    if (slideIndex === 0) return 0.72;
    if (slideIndex === 5) return 0.78;
    return 0.5;
}

function splitParagraphs(text: string): string[] {
    const raw = text
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
    return raw.length > 0 ? raw : [""];
}

function wrapTextLines(input: string, maxCharsPerLine: number): string[] {
    const words = input.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxCharsPerLine || !current) {
            current = candidate;
        } else {
            lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function isRetryableAnthropicError(error: unknown): boolean {
    const message = String(error instanceof Error ? error.message : error || "").toLowerCase();
    return (
        message.includes("overload") ||
        message.includes("overloaded") ||
        message.includes("rate limit") ||
        message.includes("429") ||
        message.includes("503") ||
        message.includes("529") ||
        message.includes("anthropic api error")
    );
}

async function withRetry<T>(
    fn: (attempt: number) => Promise<T>,
    options: { maxAttempts: number; baseDelayMs: number; shouldRetry: (error: unknown) => boolean }
): Promise<{ result: T; attempts: number }> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
        try {
            const result = await fn(attempt);
            return { result, attempts: attempt };
        } catch (error) {
            lastError = error;
            const canRetry = attempt < options.maxAttempts && options.shouldRetry(error);
            if (!canRetry) throw error;
            const backoffMs = options.baseDelayMs * attempt;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || "retry failed"));
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
