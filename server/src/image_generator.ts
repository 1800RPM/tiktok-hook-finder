/**
 * Image Generator Module - Nano Banana Pro (Gemini 3 Pro Image Preview)
 * Generates TikTok slide images using Google's Gemini image generation API
 */

import { GoogleGenAI } from "@google/genai";

// Types
export interface ImageGenerationOptions {
    aspectRatio?: "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
    imageSize?: "1K" | "2K" | "4K";
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

// Singleton client instance
let genAIClient: GoogleGenAI | null = null;

/**
 * Initialize or get the Gemini AI client
 */
function getClient(apiKey: string): GoogleGenAI {
    if (!genAIClient) {
        genAIClient = new GoogleGenAI({ apiKey });
    }
    return genAIClient;
}

/**
 * Generate a single image using Nano Banana Pro (Gemini 3 Pro Image Preview)
 * 
 * @param prompt - Text description of the image to generate
 * @param apiKey - Gemini API key
 * @param options - Generation options (aspect ratio, size)
 * @returns Generated image data or error
 */
export async function generateImage(
    prompt: string,
    apiKey: string,
    options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
    if (!apiKey) {
        return { success: false, error: "Gemini API key not configured" };
    }

    const { aspectRatio = "9:16", imageSize = "2K" } = options;

    try {
        const client = getClient(apiKey);

        console.log(`[ImageGen] Generating image with Nano Banana Pro...`);
        console.log(`[ImageGen] Prompt: ${prompt.substring(0, 100)}...`);
        console.log(`[ImageGen] Aspect: ${aspectRatio}, Size: ${imageSize}`);

        const response = await client.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: prompt,
            config: {
                responseModalities: ["Image"],
                // @ts-ignore - imageConfig may not be in types yet
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: imageSize
                }
            }
        });

        const images: GeneratedImage[] = [];

        // Extract images from response parts
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                // @ts-ignore - inlineData structure
                if (part.inlineData) {
                    images.push({
                        // @ts-ignore
                        data: part.inlineData.data,
                        // @ts-ignore
                        mimeType: part.inlineData.mimeType || "image/png"
                    });
                }
            }
        }

        if (images.length === 0) {
            console.error("[ImageGen] No images in response");
            return { success: false, error: "No images generated" };
        }

        console.log(`[ImageGen] Successfully generated ${images.length} image(s)`);
        return { success: true, images };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ImageGen] Error:`, errorMessage);

        // Check for common error types
        if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
            return { success: false, error: "Rate limit exceeded. Please try again later." };
        }
        if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
            return { success: false, error: "Image generation blocked by safety filters." };
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Reference image for character consistency
 */
export interface ReferenceImage {
    data: string;      // Base64-encoded image data
    mimeType: string;  // e.g., "image/png"
}

/**
 * Generate an image with reference images for character consistency
 * Uses up to 5 previous images to maintain consistent character appearance
 * 
 * @param prompt - Text description of the image to generate
 * @param referenceImages - Array of previously generated images to reference
 * @param apiKey - Gemini API key
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
        return { success: false, error: "Gemini API key not configured" };
    }

    const { aspectRatio = "9:16", imageSize = "2K" } = options;

    // Limit to 5 reference images (Gemini's limit for human consistency)
    const limitedRefs = referenceImages.slice(0, 5);

    try {
        const client = getClient(apiKey);

        console.log(`[ImageGen] Generating with ${limitedRefs.length} reference image(s)...`);
        console.log(`[ImageGen] Prompt: ${prompt.substring(0, 100)}...`);

        // Build contents array: prompt first, then reference images
        const contents: any[] = [
            { text: prompt + "\n\nIMPORTANT: Maintain the EXACT same character appearance (face, hair, accessories) as shown in the reference image(s)." }
        ];

        // Add reference images as inlineData
        for (const ref of limitedRefs) {
            contents.push({
                inlineData: {
                    mimeType: ref.mimeType,
                    data: ref.data
                }
            });
        }

        const response = await client.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: contents,
            config: {
                responseModalities: ["Image"],
                // @ts-ignore - imageConfig may not be in types yet
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: imageSize
                }
            }
        });

        const images: GeneratedImage[] = [];

        // Extract images from response parts
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                // @ts-ignore - inlineData structure
                if (part.inlineData) {
                    images.push({
                        // @ts-ignore
                        data: part.inlineData.data,
                        // @ts-ignore
                        mimeType: part.inlineData.mimeType || "image/png"
                    });
                }
            }
        }

        if (images.length === 0) {
            console.error("[ImageGen] No images in response");
            return { success: false, error: "No images generated" };
        }

        console.log(`[ImageGen] Successfully generated image with ${limitedRefs.length} reference(s)`);
        return { success: true, images };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ImageGen] Error:`, errorMessage);

        if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
            return { success: false, error: "Rate limit exceeded. Please try again later." };
        }
        if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
            return { success: false, error: "Image generation blocked by safety filters." };
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Generate multiple images in batch (for carousel generation)
 * 
 * @param prompts - Array of prompts (one per slide)
 * @param apiKey - Gemini API key
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
 * Convert a structured JSON image prompt to a flat text prompt for Gemini
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


