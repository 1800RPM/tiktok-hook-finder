/**
 * Hook Embeddings Generator
 * 
 * Generates OpenAI embeddings for all viral hooks and saves them to a local JSON file.
 * Run with: bun run src/embed_hooks.ts
 */

import { Database } from "bun:sqlite";
import { writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";

// Load .env from project root
const envPath = path.join(process.cwd(), "..", ".env");
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && match[1] && match[2]) {
            process.env[match[1].trim()] = match[2].trim();
        }
    }
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, cheapest option
const BATCH_SIZE = 100; // OpenAI allows up to 2048 texts per request
const OUTPUT_PATH = path.join(process.cwd(), "data", "hook_embeddings.json");

interface Hook {
    id: string;
    hook_text: string;
    view_count: number;
    archetype: string;
    niche: string;
}

interface HookWithEmbedding extends Hook {
    embedding: number[];
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: texts
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    return data.data.map((d: any) => d.embedding);
}

async function main() {
    if (!OPENAI_API_KEY) {
        console.error("❌ OPENAI_API_KEY not found in environment");
        process.exit(1);
    }

    console.log("🧠 Hook Embedding Generator");
    console.log("==========================\n");

    // Connect to SQLite database
    const dbPath = path.join(process.cwd(), "data", "hooks.db");
    if (!existsSync(dbPath)) {
        console.error(`❌ Database not found at: ${dbPath}`);
        process.exit(1);
    }

    const db = new Database(dbPath);

    // Fetch all hooks
    const hooks = db.query(`
        SELECT 
            id,
            hook_text,
            view_count,
            archetype,
            niche
        FROM viral_hooks
        WHERE hook_text IS NOT NULL AND hook_text != ''
        ORDER BY view_count DESC
    `).all() as Hook[];

    console.log(`📊 Found ${hooks.length} hooks in database`);

    // Check for existing embeddings file to resume
    let existingEmbeddings: HookWithEmbedding[] = [];
    const existingIds = new Set<string>();

    if (existsSync(OUTPUT_PATH)) {
        console.log("📂 Found existing embeddings file, will resume...");
        existingEmbeddings = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
        existingEmbeddings.forEach(h => existingIds.add(h.id));
        console.log(`   Already have ${existingEmbeddings.length} embeddings`);
    }

    // Filter to hooks that need embedding
    const hooksToEmbed = hooks.filter(h => !existingIds.has(h.id));
    console.log(`🔄 Need to generate embeddings for ${hooksToEmbed.length} hooks\n`);

    if (hooksToEmbed.length === 0) {
        console.log("✅ All hooks already have embeddings!");
        return;
    }

    // Process in batches
    const allEmbeddings: HookWithEmbedding[] = [...existingEmbeddings];
    let processedCount = 0;

    for (let i = 0; i < hooksToEmbed.length; i += BATCH_SIZE) {
        const batch = hooksToEmbed.slice(i, i + BATCH_SIZE);
        const texts = batch.map(h => h.hook_text);

        console.log(`📤 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(hooksToEmbed.length / BATCH_SIZE)} (${batch.length} hooks)...`);

        try {
            const embeddings = await generateEmbeddings(texts);

            for (let j = 0; j < batch.length; j++) {
                allEmbeddings.push({
                    ...batch[j],
                    embedding: embeddings[j] || []
                });
            }

            processedCount += batch.length;
            console.log(`   ✅ Generated ${processedCount}/${hooksToEmbed.length} embeddings`);

            // Save progress after each batch
            writeFileSync(OUTPUT_PATH, JSON.stringify(allEmbeddings, null, 0));

            // Small delay to avoid rate limits
            if (i + BATCH_SIZE < hooksToEmbed.length) {
                await new Promise(r => setTimeout(r, 500));
            }

        } catch (error) {
            console.error(`❌ Error processing batch:`, error);
            console.log("💾 Saving progress before exit...");
            writeFileSync(OUTPUT_PATH, JSON.stringify(allEmbeddings, null, 0));
            process.exit(1);
        }
    }

    // Final save with pretty formatting for inspection
    console.log(`\n💾 Saving ${allEmbeddings.length} embeddings to ${OUTPUT_PATH}...`);
    writeFileSync(OUTPUT_PATH, JSON.stringify(allEmbeddings, null, 0));

    const fileSize = (existsSync(OUTPUT_PATH) ? require("fs").statSync(OUTPUT_PATH).size / 1024 / 1024 : 0).toFixed(2);
    console.log(`\n✅ Done! File size: ${fileSize} MB`);
}

main();
