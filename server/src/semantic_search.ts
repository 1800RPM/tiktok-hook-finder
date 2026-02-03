/**
 * Semantic Hook Search
 * 
 * Loads pre-computed embeddings and provides fast similarity search.
 */

import { readFileSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = existsSync(path.join(process.cwd(), "server", "data"))
    ? path.join(process.cwd(), "server", "data")
    : path.join(process.cwd(), "data");

const EMBEDDINGS_PATH = path.join(DATA_DIR, "hook_embeddings.json");

interface HookWithEmbedding {
    id: string;
    hook_text: string;
    embedding: number[];
    view_count: number;
    archetype: string;
    niche: string;
}

interface SearchResult {
    hook_text: string;
    view_count: number;
    archetype: string;
    niche: string;
    similarity: number;
}

// In-memory cache of embeddings
let cachedEmbeddings: HookWithEmbedding[] | null = null;

/**
 * Load embeddings from disk into memory (cached)
 */
export function loadEmbeddings(): HookWithEmbedding[] {
    if (cachedEmbeddings) {
        return cachedEmbeddings;
    }

    if (!existsSync(EMBEDDINGS_PATH)) {
        console.error(`❌ Embeddings file not found: ${EMBEDDINGS_PATH}`);
        return [];
    }

    console.log("🔄 Loading hook embeddings into memory...");
    const startTime = Date.now();

    cachedEmbeddings = JSON.parse(readFileSync(EMBEDDINGS_PATH, "utf8"));

    console.log(`✅ Loaded ${cachedEmbeddings!.length} embeddings in ${Date.now() - startTime}ms`);
    return cachedEmbeddings!;
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Generate an embedding for a query using OpenAI
 */
export async function generateQueryEmbedding(
    text: string,
    apiKey: string
): Promise<number[] | null> {
    try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "text-embedding-3-small",
                input: text
            })
        });

        if (!response.ok) {
            console.error("❌ OpenAI embedding error:", await response.text());
            return null;
        }

        const data = await response.json() as any;
        return data.data[0].embedding;
    } catch (error) {
        console.error("❌ Failed to generate query embedding:", error);
        return null;
    }
}

/**
 * Search for the most similar hooks to a given query
 */
export async function searchSimilarHooks(
    queryText: string,
    apiKey: string,
    topK: number = 15
): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(queryText, apiKey);
    if (!queryEmbedding) {
        console.log("⚠️ Failed to generate query embedding, falling back to empty results");
        return [];
    }

    // Load all hook embeddings
    const embeddings = loadEmbeddings();
    if (embeddings.length === 0) {
        return [];
    }

    console.log(`🔍 Searching ${embeddings.length} hooks for: "${queryText.substring(0, 50)}..."`);

    // Calculate similarity for all hooks
    const scoredHooks = embeddings.map(hook => ({
        hook_text: hook.hook_text,
        view_count: hook.view_count,
        archetype: hook.archetype,
        niche: hook.niche,
        similarity: cosineSimilarity(queryEmbedding, hook.embedding)
    }));

    // Sort by similarity (descending) and take top K
    scoredHooks.sort((a, b) => b.similarity - a.similarity);
    const topResults = scoredHooks.slice(0, topK);

    console.log(`✅ Found ${topResults.length} similar hooks (top similarity: ${topResults[0]?.similarity.toFixed(3)})`);

    return topResults;
}

/**
 * Search with combined archetype filtering (hybrid approach)
 */
export async function searchHooksHybrid(
    queryText: string,
    apiKey: string,
    archetype?: string,
    topK: number = 15
): Promise<SearchResult[]> {
    const allResults = await searchSimilarHooks(queryText, apiKey, topK * 2);

    if (!archetype) {
        return allResults.slice(0, topK);
    }

    // Boost hooks matching the archetype
    const boostedResults = allResults.map(r => ({
        ...r,
        similarity: r.archetype === archetype
            ? r.similarity * 1.2  // 20% boost for matching archetype
            : r.similarity
    }));

    boostedResults.sort((a, b) => b.similarity - a.similarity);
    return boostedResults.slice(0, topK);
}

// Pre-load embeddings on module import
loadEmbeddings();
