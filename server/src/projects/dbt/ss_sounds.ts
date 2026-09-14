// TikTok sound recommendations for the aesthetic photo slideshow flow.
//
// The pool is built from two sources. The reference accounts are creators whose posts are the
// visual and tonal model for this format, so whatever they put under a carousel is by
// definition on-format; those sounds are ranked first. Hashtag scrapes fill the pool out and
// keep it from going stale when the reference accounts post rarely.
//
// The pool is cached on disk because scraping costs API credits and the answer barely moves
// hour to hour. Recommendations are drawn at random from the top of the pool rather than
// strictly ranked, so "refresh" actually produces something new.
import path from 'path';
import { mkdir, readFile, writeFile, rename } from 'fs/promises';

const root = path.resolve(import.meta.dir, '../../../..');
const poolFile = path.join(root, 'server/data/ss_sound_pool.json');

// Creators whose carousels define this format. Their sound choices are the strongest signal.
const REFERENCE_HANDLES = ['sydneysynced', 'heather.xoxo'];
// Broader surfaces, so the pool keeps growing between reference-account posts. These tags are
// chosen because they actually return photo carousels: the niche's own tags are a vent surface
// full of melancholic indie, which is the wrong register for a meme but the right one here --
// this format is moody Pinterest photography, and the reference accounts sit in the same place
// (Noah Kahan, Hozier, Sam Fender).
const POOL_HASHTAGS = ['bpdtok', 'bpdthings', 'dbtskills', 'bpdawareness', 'mentalhealthmemes',
    'borderlinepersonalitydisorder', 'bpdmemes', 'mentalhealthjourney', 'quotesaesthetic', 'sadquotes'];
const POOL_PAGES = 3;
// The reference accounts are the best source, so go deep on them: ten posts per call, and
// their back catalogue is where the variety lives. The pool needs 50-75 sounds to stop
// repeating across posts, which the top ten of two accounts can never supply.
const REFERENCE_PAGES = 6;
const TARGET_POOL = 75;

const POOL_TTL_MS = 12 * 60 * 60 * 1000;
// Slideshow posts run 6 slides; anything under 15s loops audibly, anything over 70s is a
// full song the viewer never reaches the end of.
const MIN_DURATION = 15, MAX_DURATION = 70;

export type SsSound = {
    id: string; title: string; artist: string; duration: number;
    isOriginal: boolean; playUrl: string; cover: string; link: string;
    source: 'reference' | 'hashtag'; via: string; plays: number; saves: number;
};
type Pool = { updated: number; sounds: SsSound[] };

let pool: Pool | null = null;
let building: Promise<Pool> | null = null;

async function api(url: string, key: string) {
    const response = await fetch(url, { headers: { 'x-api-key': key }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`ScrapeCreators returned ${response.status}`);
    return await response.json() as any;
}

function firstUrl(value: any): string {
    const list = value?.url_list;
    return (Array.isArray(list) && typeof list[0] === 'string') ? list[0] : '';
}

function toSound(item: any, source: 'reference' | 'hashtag', via: string): SsSound | null {
    const music = item?.music || {};
    const id = music.id_str || String(music.id || '');
    const duration = Number(music.duration || 0);
    // Without a playable URL the card cannot be previewed, which is the whole point.
    const playUrl = firstUrl(music.play_url);
    if (!id || !playUrl || duration < MIN_DURATION || duration > MAX_DURATION) return null;
    const stats = item.statistics || {};
    return {
        id, title: String(music.title || 'Unbenannter Sound'), artist: String(music.author || ''),
        duration, isOriginal: !!music.is_original_sound, playUrl,
        cover: firstUrl(music.cover_thumb) || firstUrl(music.cover_medium),
        link: `https://www.tiktok.com/music/x-${id}`, source, via,
        plays: Number(stats.play_count || 0), saves: Number(stats.collect_count || 0),
    };
}

async function scrape(key: string): Promise<SsSound[]> {
    const found: SsSound[] = [];
    for (const handle of REFERENCE_HANDLES) {
        let cursor = '';
        for (let page = 0; page < REFERENCE_PAGES; page++) {
            try {
                const url = `https://api.scrapecreators.com/v3/tiktok/profile/videos?handle=${handle}&sort_by=popular&region=US${cursor ? `&max_cursor=${cursor}` : ''}`;
                const data = await api(url, key);
                for (const item of data?.aweme_list || []) {
                    // Only carousels: a sound chosen for a video is not evidence for a slideshow.
                    if (!item?.image_post_info) continue;
                    const sound = toSound(item, 'reference', '@' + handle);
                    if (sound) found.push(sound);
                }
                cursor = data?.has_more && data?.max_cursor != null ? String(data.max_cursor) : '';
                if (!cursor) break;
            } catch (error) { console.error(`[SS Sounds] ${handle}:`, error); break; }
        }
    }
    const enough = () => new Set(found.map((s) => s.id)).size >= TARGET_POOL;
    for (const hashtag of POOL_HASHTAGS) {
        if (enough()) break;
        let cursor = '';
        for (let page = 0; page < POOL_PAGES; page++) {
            try {
                const url = `https://api.scrapecreators.com/v1/tiktok/search/hashtag?hashtag=${hashtag}&region=DE${cursor ? `&cursor=${cursor}` : ''}`;
                const data = await api(url, key);
                for (const item of data?.aweme_list || []) {
                    if (!item?.image_post_info) continue;
                    const sound = toSound(item, 'hashtag', '#' + hashtag);
                    if (sound) found.push(sound);
                }
                cursor = data?.has_more && data?.cursor ? String(data.cursor) : '';
                if (!cursor) break;
            } catch (error) { console.error(`[SS Sounds] #${hashtag}:`, error); break; }
        }
    }
    // Keep the highest-performing post per sound; the same track appears across many posts.
    const best = new Map<string, SsSound>();
    for (const sound of found) {
        const current = best.get(sound.id);
        if (!current || sound.plays > current.plays) best.set(sound.id, sound);
        // A sound seen on a reference account keeps that label even if a hashtag copy wins.
        if (current?.source === 'reference') best.get(sound.id)!.source = 'reference';
    }
    return [...best.values()];
}

async function load(): Promise<Pool | null> {
    if (pool) return pool;
    try { pool = JSON.parse(await readFile(poolFile, 'utf8')); return pool; }
    catch { return null; }
}

export async function getSoundPool(key: string, force = false): Promise<Pool> {
    const cached = await load();
    if (!force && cached && Date.now() - cached.updated < POOL_TTL_MS && cached.sounds.length) return cached;
    if (building) return building;
    building = (async () => {
        const sounds = await scrape(key);
        // A failed scrape must not wipe a working pool.
        if (!sounds.length && cached?.sounds.length) return cached;
        const next: Pool = { updated: Date.now(), sounds };
        pool = next;
        await mkdir(path.dirname(poolFile), { recursive: true });
        await writeFile(poolFile + '.tmp', JSON.stringify(next, null, 1));
        await rename(poolFile + '.tmp', poolFile);
        return next;
    })().finally(() => { building = null; });
    return building;
}

// Reference-account sounds first, then the better-performing hashtag finds.
function score(sound: SsSound) {
    return (sound.source === 'reference' ? 1_000_000_000 : 0) + sound.saves * 20 + sound.plays;
}

export function pickSounds(sounds: SsSound[], count: number, exclude: string[]): SsSound[] {
    const skip = new Set(exclude);
    const ranked = sounds.filter((s) => !skip.has(s.id)).sort((a, b) => score(b) - score(a));
    if (ranked.length <= count) return ranked;
    // Draw from a shortlist rather than the strict top, so refreshing shows something new
    // without dropping into the weak tail. The window scales with the pool: a fixed small
    // window made a 100-sound pool behave like a 15-sound one, and the same few tracks kept
    // coming back across separate posts, which is exactly what the pool exists to prevent.
    const window = Math.min(ranked.length, Math.max(count * 5, Math.ceil(ranked.length * 0.6)));
    const shortlist = ranked.slice(0, window);
    const chosen: SsSound[] = [];
    while (chosen.length < count && shortlist.length) {
        chosen.push(...shortlist.splice(Math.floor(Math.random() * shortlist.length), 1));
    }
    return chosen;
}

export async function recommendSsSounds(key: string, count: number, exclude: string[], refresh: boolean) {
    const current = await getSoundPool(key, refresh);
    return {
        sounds: pickSounds(current.sounds, count, exclude),
        poolSize: current.sounds.length,
        updated: current.updated,
    };
}

// The CDN URL can expire, so a stale pool entry is refetched once before giving up.
export async function resolveSoundAudio(key: string, id: string): Promise<string | null> {
    const current = await load();
    const known = current?.sounds.find((s) => s.id === id);
    if (known?.playUrl) return known.playUrl;
    try {
        const data = await api(`https://api.scrapecreators.com/v1/tiktok/song?clipId=${id}`, key);
        return firstUrl(data?.music_info?.play_url) || null;
    } catch { return null; }
}
