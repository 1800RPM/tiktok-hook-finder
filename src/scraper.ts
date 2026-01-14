import { insertHook } from "./db/hooks";
import { extractTextFromImage } from "./ocr";

const SCRAPE_CREATORS_API_KEY = process.env.SCRAPE_CREATORS_API_KEY || "PLACEHOLDER_KEY";
const NICHES = [
    "BPD", "DBT", "Borderline Personality Disorder", "BPD symptoms", "BPD Favorite Person",
    "BPD splitting", "Quiet BPD", "High functioning BPD", "CPTSD", "Trauma recovery",
    "Toxic Relationships", "Relationship advice", "Attachment Styles", "Anxious Attachment",
    "Avoidant Attachment", "Disorganized Attachment", "Narcissistic Abuse", "Narcissism signs",
    "Abandonment Issues", "Childhood trauma", "Inner child healing", "Mental Health tips",
    "Mental health Hacks", "Anxiety relief", "Depression facts", "Emotional dysregulation",
    "Therapy thoughts", "POV Mental Health", "Self love journey", "Toxic friendship signs",
    "Boundary setting", "Validation skills", "DBT coping skills", "Rejection sensitive dysphoria",
    "ADHD and BPD", "Neurodivergent mental health"
];

const VIEW_THRESHOLD = 30000; // Lowered to 30k for volume while staying "viral"
const PAGES_PER_NICHE = 5; // 5 pages * ~40 items = 200 items per niche attempt

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchData(hashtag: string) {
    console.log(`\n--- Searching for SLIDESHOWS in: ${hashtag} ---`);
    let cursor = 0;
    let count = 0;
    const NICHE_LIMIT = 50;

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

                const isSlideshow = item.content_type === "multi_photo" || (Array.isArray(item.images) && item.images.length > 0);
                if (!isSlideshow) continue;

                const views = item.statistics?.play_count || 0;
                if (views < VIEW_THRESHOLD) continue;

                if (item.desc_language !== "en") continue;

                const videoUrl = `https://www.tiktok.com/@${item.author?.unique_id}/video/${item.id}`;
                let hookText = "";
                let isOcr = 0;

                const firstImageUrl = Array.isArray(item.images) ? item.images[0] : null;

                if (firstImageUrl) {
                    console.log(`    [OCR] Processing (${views.toLocaleString()} views): ${videoUrl}`);
                    hookText = await extractTextFromImage(firstImageUrl);
                    isOcr = 1;
                    await sleep(100);
                }

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
                        $is_ocr: isOcr,
                        $transcription: null
                    });
                    console.log(`    Saved (${++count}/${NICHE_LIMIT}): "${hookText.substring(0, 40)}..."`);
                }
            }

            // Update cursor from response if available, otherwise increment based on typical page size
            cursor = json.cursor || json.next_cursor || (cursor + results.length);

            await sleep(500); // Between pages
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
