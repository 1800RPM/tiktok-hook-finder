/**
 * Image Generator Module - GPT Image 2
 * Generates TikTok slide images using OpenAI's image generation API.
 */

import sharp from "sharp";

// Types
export interface ImageGenerationOptions {
    aspectRatio?: "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
    imageSize?: "0.5K" | "1K" | "2K" | "4K";
}

export interface GeneratedImage {
    data: string;      // Base64-encoded image data
    mimeType: string;  // e.g., "image/png"
}

export interface ImageGenerationResult {
    success: boolean;
    images?: GeneratedImage[];
    error?: string;
}

interface OpenAIRequestTrace {
    clientRequestId: string;
    requestId: string | null;
    processingMs: string | null;
}

const OPENAI_IMAGE_MODEL = "gpt-image-2";
const OPENAI_API_BASE = "https://api.openai.com/v1";
const DEFAULT_OUTPUT_FORMAT = "png";
type OutputFormat = "png" | "jpeg" | "webp";

function normalizeImageSize(imageSize?: ImageGenerationOptions["imageSize"]): "1K" | "2K" | "4K" {
    if (!imageSize || imageSize === "0.5K") {
        return "4K";
    }
    return imageSize;
}

function resolveOutputFormat(): OutputFormat {
    return DEFAULT_OUTPUT_FORMAT;
}

function resolveOutputMimeType(outputFormat: OutputFormat): string {
    switch (outputFormat) {
        case "jpeg":
            return "image/jpeg";
        case "webp":
            return "image/webp";
        default:
            return "image/png";
    }
}

function resolveOpenAIQuality(imageSize: "1K" | "2K" | "4K"): "auto" | "low" | "medium" | "high" {
    if (imageSize === "1K") {
        return "medium";
    }
    return "auto";
}

function resolveOpenAISize(
    aspectRatio: NonNullable<ImageGenerationOptions["aspectRatio"]>,
    imageSize: "1K" | "2K" | "4K"
): string {
    const sizeMap: Record<"1K" | "2K" | "4K", Record<NonNullable<ImageGenerationOptions["aspectRatio"]>, string>> = {
        "1K": {
            "9:16": "864x1536",
            "16:9": "1536x864",
            "1:1": "1024x1024",
            "4:3": "1024x768",
            "3:4": "768x1024"
        },
        "2K": {
            "9:16": "1152x2048",
            "16:9": "2048x1152",
            "1:1": "2048x2048",
            "4:3": "2048x1536",
            "3:4": "1536x2048"
        },
        "4K": {
            "9:16": "2160x3840",
            "16:9": "3840x2160",
            "1:1": "2880x2880",
            "4:3": "3072x2304",
            "3:4": "2304x3072"
        }
    };

    return sizeMap[imageSize][aspectRatio];
}

function buildOpenAIRequestTrace(response: Response, clientRequestId: string): OpenAIRequestTrace {
    return {
        clientRequestId,
        requestId: response.headers.get("x-request-id"),
        processingMs: response.headers.get("openai-processing-ms")
    };
}

function formatOpenAITrace(trace: OpenAIRequestTrace): string {
    const requestId = trace.requestId || "unknown";
    const processingMs = trace.processingMs || "unknown";
    return `client_request_id=${trace.clientRequestId} request_id=${requestId} processing_ms=${processingMs}`;
}

async function parseOpenAIResponse(
    response: Response,
    clientRequestId: string
): Promise<{ payload: any; trace: OpenAIRequestTrace }> {
    const rawText = await response.text();
    const trace = buildOpenAIRequestTrace(response, clientRequestId);

    let payload: any = null;
    if (rawText) {
        try {
            payload = JSON.parse(rawText);
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        const message =
            payload?.error?.message ||
            payload?.message ||
            `${response.status} ${response.statusText}`.trim();
        throw new Error(`${message} (${formatOpenAITrace(trace)})`);
    }

    return {
        payload: payload || {},
        trace
    };
}

function extractGeneratedImages(payload: any, outputFormat: OutputFormat): GeneratedImage[] {
    const mimeType = resolveOutputMimeType(outputFormat);
    const items = Array.isArray(payload?.data) ? payload.data : [];

    return items
        .map((item: any) => {
            const data = typeof item?.b64_json === "string" ? item.b64_json : "";
            if (!data) return null;
            return {
                data,
                mimeType
            } satisfies GeneratedImage;
        })
        .filter((item: GeneratedImage | null): item is GeneratedImage => item !== null);
}

async function createReferenceFile(ref: ReferenceImage, index: number): Promise<File> {
    const mimeType = String(ref.mimeType || "image/png").toLowerCase();
    const extension =
        mimeType === "image/jpeg" ? "jpg" :
            mimeType === "image/webp" ? "webp" :
                "png";

    return new File(
        [Buffer.from(ref.data, "base64")],
        `reference-${index + 1}.${extension}`,
        { type: mimeType }
    );
}

function normalizeImageError(error: unknown): ImageGenerationResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ImageGen] Error:`, errorMessage);

    if (errorMessage.includes("quota") || errorMessage.includes("rate") || errorMessage.includes("429")) {
        return { success: false, error: "Rate limit exceeded. Please try again later." };
    }
    if (errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("policy")) {
        return { success: false, error: "Image generation blocked by safety filters." };
    }

    return { success: false, error: errorMessage };
}

/**
 * Generate a single image using GPT Image 2.
 * 
 * @param prompt - Text description of the image to generate
 * @param apiKey - OpenAI API key
 * @param options - Generation options (aspect ratio, size)
 * @returns Generated image data or error
 */
export async function generateImage(
    prompt: string,
    apiKey: string,
    options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
    if (!apiKey) {
        return { success: false, error: "OpenAI API key not configured" };
    }

    const { aspectRatio = "9:16" } = options;
    const imageSize = normalizeImageSize(options.imageSize);
    const outputFormat = resolveOutputFormat();
    const openaiSize = resolveOpenAISize(aspectRatio, imageSize);
    const quality = resolveOpenAIQuality(imageSize);

    try {
        const clientRequestId = crypto.randomUUID();
        console.log(`[ImageGen] Generating image with GPT Image 2...`);
        console.log(`[ImageGen] Prompt: ${prompt.substring(0, 100)}...`);
        console.log(`[ImageGen] Aspect: ${aspectRatio}, Size: ${imageSize} -> ${openaiSize}, Quality: ${quality}`);
        console.log(`[ImageGen] model=${OPENAI_IMAGE_MODEL} endpoint=images.generate client_request_id=${clientRequestId}`);

        const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "X-Client-Request-Id": clientRequestId
            },
            body: JSON.stringify({
                model: OPENAI_IMAGE_MODEL,
                prompt,
                size: openaiSize,
                quality,
                output_format: outputFormat
            })
        });
        const { payload, trace } = await parseOpenAIResponse(response, clientRequestId);
        const images = extractGeneratedImages(payload, outputFormat);

        if (images.length === 0) {
            console.error("[ImageGen] No images in response");
            return { success: false, error: "No images generated" };
        }

        console.log(
            `[ImageGen] Successfully generated ${images.length} image(s) model=${OPENAI_IMAGE_MODEL} endpoint=images.generate ${formatOpenAITrace(trace)}`
        );
        return { success: true, images };

    } catch (error) {
        return normalizeImageError(error);
    }
}

/**
 * Reference image for character consistency
 */
export interface ReferenceImage {
    data: string;      // Base64-encoded image data
    mimeType: string;  // e.g., "image/png"
}

const MAX_REFERENCE_DIMENSION = 1536;
const MAX_REFERENCE_BYTES = 1_500_000;

function sanitizeBase64(data: string): string {
    return String(data || "")
        .replace(/^data:[^;]+;base64,/, "")
        .replace(/\s+/g, "");
}

async function normalizeReferenceImage(ref: ReferenceImage, index: number): Promise<ReferenceImage> {
    const cleanedData = sanitizeBase64(ref.data);
    const mimeType = String(ref.mimeType || "image/png").toLowerCase();

    try {
        const inputBuffer = Buffer.from(cleanedData, "base64");
        if (inputBuffer.length === 0) {
            throw new Error("Empty image buffer");
        }

        let pipeline = sharp(inputBuffer, { failOn: "none" }).rotate();
        const metadata = await pipeline.metadata();

        if ((metadata.width || 0) > MAX_REFERENCE_DIMENSION || (metadata.height || 0) > MAX_REFERENCE_DIMENSION) {
            pipeline = pipeline.resize(MAX_REFERENCE_DIMENSION, MAX_REFERENCE_DIMENSION, {
                fit: "inside",
                withoutEnlargement: true
            });
        }

        let outputBuffer: Buffer;
        let outputMimeType: string;

        if (mimeType === "image/png") {
            outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
            outputMimeType = "image/png";

            if (outputBuffer.length > MAX_REFERENCE_BYTES) {
                outputBuffer = await sharp(outputBuffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
                outputMimeType = "image/jpeg";
            }
        } else {
            outputBuffer = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
            outputMimeType = "image/jpeg";
        }

        console.log(
            `[ImageGen] Normalized ref ${index + 1}: ${mimeType} -> ${outputMimeType}, ${inputBuffer.length}B -> ${outputBuffer.length}B`
        );

        return {
            data: outputBuffer.toString("base64"),
            mimeType: outputMimeType
        };
    } catch (error) {
        console.warn(
            `[ImageGen] Could not normalize reference ${index + 1}; using sanitized original. ${error instanceof Error ? error.message : String(error)}`
        );
        return {
            data: cleanedData,
            mimeType: mimeType
        };
    }
}

/**
 * Generate an image with reference images for character consistency
 * Uses up to 5 previous images to maintain consistent character appearance
 * 
 * @param prompt - Text description of the image to generate
 * @param referenceImages - Array of previously generated images to reference
 * @param apiKey - OpenAI API key
 * @param options - Generation options
 * @returns Generated image data or error
 */
export async function generateImageWithReferences(
    prompt: string,
    referenceImages: ReferenceImage[],
    apiKey: string,
    options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
    if (!apiKey) {
        return { success: false, error: "OpenAI API key not configured" };
    }

    const { aspectRatio = "9:16" } = options;
    const imageSize = normalizeImageSize(options.imageSize);
    const outputFormat = resolveOutputFormat();
    const openaiSize = resolveOpenAISize(aspectRatio, imageSize);
    const quality = resolveOpenAIQuality(imageSize);

    // Limit to 5 reference images to keep edit payloads manageable.
    const limitedRefs = referenceImages.slice(0, 5);

    try {
        const clientRequestId = crypto.randomUUID();
        const normalizedRefs = await Promise.all(
            limitedRefs.map((ref, index) => normalizeReferenceImage(ref, index))
        );

        console.log(`[ImageGen] Generating with ${normalizedRefs.length} reference image(s)...`);
        console.log(`[ImageGen] Prompt: ${prompt.substring(0, 100)}...`);
        console.log(`[ImageGen] Aspect: ${aspectRatio}, Size: ${imageSize} -> ${openaiSize}, Quality: ${quality}`);
        console.log(`[ImageGen] model=${OPENAI_IMAGE_MODEL} endpoint=images.edit client_request_id=${clientRequestId}`);

        const formData = new FormData();
        formData.append("model", OPENAI_IMAGE_MODEL);
        formData.append(
            "prompt",
            prompt + "\n\nIMPORTANT: Maintain the same core character appearance, styling, accessories, and scene anchors from the reference image(s) unless the prompt explicitly changes them."
        );
        formData.append("size", openaiSize);
        formData.append("quality", quality);
        formData.append("output_format", outputFormat);

        for (let i = 0; i < normalizedRefs.length; i++) {
            const ref = normalizedRefs[i];
            if (!ref) continue;
            const file = await createReferenceFile(ref, i);
            formData.append("image[]", file, file.name);
        }

        const response = await fetch(`${OPENAI_API_BASE}/images/edits`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "X-Client-Request-Id": clientRequestId
            },
            body: formData
        });
        const { payload, trace } = await parseOpenAIResponse(response, clientRequestId);
        const images = extractGeneratedImages(payload, outputFormat);

        if (images.length === 0) {
            console.error("[ImageGen] No images in response");
            return { success: false, error: "No images generated" };
        }

        console.log(
            `[ImageGen] Successfully generated image with ${normalizedRefs.length} reference(s) model=${OPENAI_IMAGE_MODEL} endpoint=images.edit ${formatOpenAITrace(trace)}`
        );
        return { success: true, images };

    } catch (error) {
        return normalizeImageError(error);
    }
}

/**
 * Generate multiple images in batch (for carousel generation)
 * 
 * @param prompts - Array of prompts (one per slide)
 * @param apiKey - OpenAI API key
 * @param options - Generation options
 * @returns Array of generated images with slide indices
 */
export async function generateCarouselImages(
    prompts: string[],
    apiKey: string,
    options: ImageGenerationOptions = {},
    referenceImages: ReferenceImage[] = [] // Support character references for the whole batch
): Promise<{ slideIndex: number; result: ImageGenerationResult }[]> {
    const results: { slideIndex: number; result: ImageGenerationResult }[] = [];

    console.log(`[ImageGen] Generating ${prompts.length} carousel images with ${referenceImages.length} reference(s)...`);

    // Generate images sequentially to avoid rate limits
    for (let i = 0; i < prompts.length; i++) {
        console.log(`[ImageGen] Generating slide ${i + 1}/${prompts.length}...`);

        // Use multi-reference generation if references are provided
        const result = referenceImages.length > 0
            ? await generateImageWithReferences(prompts[i] || '', referenceImages, apiKey, options)
            : await generateImage(prompts[i] || '', apiKey, options);

        results.push({ slideIndex: i, result });

        // Small delay between requests to be nice to the API
        if (i < prompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    const successCount = results.filter(r => r.result.success).length;
    console.log(`[ImageGen] Completed: ${successCount}/${prompts.length} images generated`);

    return results;
}

/**
 * UGC Style - Short and clear instructions
 */
const UGC_STYLE_OVERLAY = `

Style: iPhone selfie, front-facing camera. Phone is NOT visible - it's taking the photo. No mirror. Natural indoor lighting, visible skin texture, no filters. Raw and authentic. 
NEGATIVE: No pets on kitchen counters, no pets on tables, no pets on raised household surfaces. Pet must be on floor, bed, or couch.`;

/**
 * Convert a structured JSON image prompt to a flat text prompt for the image model
 * Keeps it simple to avoid confusing the AI
 */
export function flattenImagePrompt(prompt: any, options: { includeUgcStyle?: boolean } = { includeUgcStyle: true }): string {
    // If already a string, just add style
    if (typeof prompt === "string") {
        return options.includeUgcStyle ? prompt + UGC_STYLE_OVERLAY : prompt;
    }

    // Build a comprehensive description
    const parts: string[] = [];

    // Subject description (enhanced to include gesture and expression)
    if (prompt.subject) {
        const s = prompt.subject;
        let desc = "";

        // Core description
        if (s.description) {
            desc = s.description;
        } else {
            desc = s.age || "young woman";
            if (s.hair) desc += `, ${s.hair.color || ""} ${s.hair.style || ""} hair`;
        }

        // Expression (very important!)
        if (s.expression) {
            desc += `, ${s.expression}`;
        }

        // Gesture (from scroll stoppers)
        if (s.gesture) {
            desc += `, ${s.gesture}`;
        }

        parts.push(desc);
    }

    // Face details
    if (prompt.face) {
        const f = prompt.face;
        let faceParts: string[] = [];
        if (f.makeup) faceParts.push(f.makeup);
        if (f.skin) faceParts.push(f.skin);
        if (faceParts.length > 0) {
            parts.push(faceParts.join(", "));
        }
    }

    // Clothing
    if (prompt.clothing) {
        parts.push(`wearing ${prompt.clothing}`);
    }

    // Accessories
    if (prompt.accessories) {
        if (typeof prompt.accessories === "string") {
            parts.push(prompt.accessories);
        } else {
            const acc: string[] = [];
            if (prompt.accessories.earrings) acc.push(prompt.accessories.earrings);
            if (prompt.accessories.jewelry) acc.push(prompt.accessories.jewelry);
            if (acc.length > 0) parts.push(acc.join(", "));
        }
    }

    // Position (from scroll stoppers - e.g., "sitting on bed", "car selfie")
    if (prompt.position) {
        parts.push(prompt.position);
    }

    // Setting/background
    if (prompt.setting) {
        parts.push(`in ${prompt.setting}`);
    } else if (prompt.background?.setting) {
        parts.push(`in ${prompt.background.setting}`);
    }

    // Pet (IMPORTANT - Luna's cat, Mia's dog)
    if (prompt.pet && prompt.pet !== "none" && prompt.pet !== "none visible") {
        parts.push(prompt.pet);
    } else if (prompt.background?.elements) {
        const elements = Array.isArray(prompt.background.elements)
            ? prompt.background.elements
            : [prompt.background.elements];
        const pet = elements.find((e: any) =>
            typeof e === "string" && (e.toLowerCase().includes("cat") || e.toLowerCase().includes("dog"))
        );
        if (pet) parts.push(pet);
    }

    // Photography style
    if (prompt.photography) {
        const p = prompt.photography;
        let photoDesc: string[] = [];
        if (p.style) photoDesc.push(p.style);
        if (p.angle) photoDesc.push(p.angle);
        if (p.lighting) photoDesc.push(p.lighting);
        if (photoDesc.length > 0) {
            parts.push(photoDesc.join(", "));
        }
    }

    // Simple pose - just the gesture (legacy format)
    if (prompt.pose?.other_hand) {
        parts.push(prompt.pose.other_hand);
    }

    const result = parts.join(". ");
    console.log(`[flattenImagePrompt] Result: ${result.substring(0, 150)}...`);

    return options.includeUgcStyle ? result + UGC_STYLE_OVERLAY : result;
}


