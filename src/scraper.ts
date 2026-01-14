import db, { insertHook } from "./db/hooks";
import { extractTextFromImage } from "./ocr";

const SCRAPE_CREATORS_API_KEY = process.env.SCRAPE_CREATORS_API_KEY || "PLACEHOLDER_KEY";
const NICHES = [
    "dark psychology", "manipulation signs", "toxic traits", "green flags", "emotional intelligence",
    "subconscious mind", "inner child healing", "shadow work", "mental health truth", "psychology facts",
    "dating advice for women", "dating advice for men", "relationship realizations", "breakup recovery",
    "loneliness", "social anxiety", "introvert problems", "overthinking at night",
    "career advice", "corporate humor", "burnout recovery", "productivity hacks",
    "financial freedom", "wealth mindset", "discipline", "stoicism", "philosophy",
    "morning routine", "wellness", "biohacking", "fitness motivation",
    "travel hacks", "hidden gems", "digital nomad", "remote work",
    "mindset shifts", "success secrets", "entrepreneurship", "startup life"
];

const VIEW_THRESHOLD = 20000; // Lowered to 20k for massive volume
const PAGES_PER_NICHE = 10; // 10 pages * ~30 = 300 items per niche
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));


// Helper to check if hook exists
function hookExists(id: string): boolean {
    const row = db.query("SELECT 1 FROM viral_hooks WHERE id = ?").get(id);
    return !!row;
}

async function fetchData(hashtag: string) {
    console.log(`\n--- Searching for SLIDESHOWS in: ${hashtag} ---`);
    let cursor = 0;
    let count = 0;
    const NICHE_LIMIT = 200;

    for (let page = 0; page < PAGES_PER_NICHE; page++) {
        if (count >= NICHE_LIMIT) break;

        console.log(`  Fetching page ${page + 1} (cursor: ${cursor})...`);
        const searchUrl = `https://api.scrapecreators.com/v1/tiktok/search/top?query=${encodeURIComponent(hashtag)}&cursor=${cursor}`;

        try {
            const response = await fetch(searchUrl, {
                headers: { 'x-api-key': SCRAPE_CREATORS_API_KEY }
            });
            const json = await response.json() as any;

            const results =
                json.results || json.items || json.item_list || json.search_list ||
                (json.data && (json.data.results || json.data.items || json.data.item_list || json.data.search_list || json.data.data)) ||
                [];

            if (results.length === 0) {
                console.log(`  No more results for ${hashtag}`);
                break;
            }

            for (const item of results) {
                if (count >= NICHE_LIMIT) break;

                // Check if already in DB - SKIP OCR if so
                if (hookExists(item.id)) {
                    // console.log(`    Skipping existing: ${item.id}`);
                    continue;
                }

                const isSlideshow = item.content_type === "multi_photo" || (Array.isArray(item.images) && item.images.length > 0);
                if (!isSlideshow) continue;

                const views = item.statistics?.play_count || 0;
                if (views < VIEW_THRESHOLD) continue;

                if (item.desc_language !== "en") continue;

                const videoUrl = `https://www.tiktok.com/@${item.author?.unique_id}/video/${item.id}`;
                let hookText = "";

                const firstImageUrl = Array.isArray(item.images) ? item.images[0] : null;

                if (firstImageUrl) {
                    console.log(`    [OCR] Processing (${views.toLocaleString()} views): ${videoUrl}`);
                    hookText = await extractTextFromImage(firstImageUrl);

                    if (hookText && hookText !== "NO_TEXT" && !hookText.startsWith("Error")) {
                        insertHook.run({
                            $id: item.id || Math.random().toString(),
                            $hook_text: hookText,
                            $video_url: videoUrl,
                            $view_count: views,
                            $like_count: item.statistics?.digg_count || 0,
                            $share_count: item.statistics?.share_count || 0,
                            $comment_count: item.statistics?.comment_count || 0,
                            $niche: hashtag,
                            $content_type: "slideshow",
                            $is_ocr: 1,
                            $transcription: null
                        });
                        console.log(`    Saved (${++count}/${NICHE_LIMIT}): "${hookText.substring(0, 40)}..."`);
                    }
                    await sleep(100);
                }
            }

            cursor = json.cursor || json.next_cursor || (cursor + results.length);
            await sleep(500);
        } catch (error) {
            console.error("  Error fetching page:", error);
            break;
        }
    }
}


async function run() {
    for (const niche of NICHES) {
        await fetchData(niche);
        await sleep(1000);
    }
    console.log("\n--- COLLECTION COMPLETE ---");
}

run();
