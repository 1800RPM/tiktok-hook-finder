// TikTok sound recommendations for the Slideshows and Meme Slides tabs.
//
// Each tab has its own pool because the two formats want opposite sounds. The slideshow pool
// leans on reference accounts whose carousels model that format; the meme pool leans on a
// curated list, because its taste criteria are specific enough that a scrape cannot reproduce
// them. Hashtag scrapes add range to both.
//
// The pool is cached on disk because scraping costs API credits and the answer barely moves
// hour to hour. Recommendations are drawn at random from the top of the pool rather than
// strictly ranked, so "refresh" actually produces something new.
import path from 'path';
import { mkdir, readFile, writeFile, rename } from 'fs/promises';

const root = path.resolve(import.meta.dir, '../../../..');

// The two tabs need opposite sounds, so each gets its own pool. Mixing them is the mistake
// worth designing against: melancholic indie is right under moody Pinterest photography and
// wrong under a deadpan cat explaining that making the bed takes two minutes.
export type SoundFlow = 'slideshow' | 'meme';

// Five buckets, because the posts themselves sit somewhere between a joke and real advice and
// the right sound depends on which way a given post leans. The labels are what the filter row
// shows, so they are written for the person choosing, not for a taxonomy.
export const SOUND_CATEGORIES = [
    { id: 'playful', label: 'Verspielt', hint: 'schrullig-freundlich, die Standardader' },
    { id: 'cartoon', label: 'Cartoon', hint: 'albern, Slapstick, Zeichentrick' },
    { id: 'upbeat', label: 'Gute Laune', hint: 'treibend und hell, ohne albern zu sein' },
    { id: 'calm', label: 'Ruhig', hint: 'warm und zurückhaltend, für ernstere Themen' },
    { id: 'neutral', label: 'Neutral', hint: 'unauffälliger Hintergrund, stört den Text nie' },
] as const;
export type SoundCategory = typeof SOUND_CATEGORIES[number]['id'];

type Profile = {
    file: string;
    handles: string[]; handlePages: number;
    hashtags: string[]; hashtagPages: number; region: string;
    minDuration: number; maxDuration: number;
    licensedOnly: boolean;
    // Whether a sound only counts when it was used under a photo carousel.
    photoOnly: boolean;
    reject?: RegExp;
    seeds?: Array<{ id: string; category: SoundCategory }>;
    target: number;
    // How wide the random draw reaches into the ranked pool. The slideshow pool is uniformly
    // on-format so it can draw broadly; the meme pool is a curated core plus a noisy tail,
    // where drawing broadly surfaces the noise.
    drawWindow: number;
    // How many of a draw must come from vetted sounds. The scraped tail is unjudged: it is
    // there for range, but a shortlist made entirely of it wastes the user's listening time.
    minVetted: number;
    // Whether scraped candidates get a model taste check before they can be suggested.
    taste: boolean;
};

const PROFILES: Record<SoundFlow, Profile> = {
    slideshow: {
        file: path.join(root, 'server/data/ss_sound_pool.json'),
        // Creators whose carousels define this format; their choices are the strongest signal.
        handles: ['sydneysynced', 'heather.xoxo'],
        // Ten posts per call, and the back catalogue is where the variety lives. The top ten
        // of two accounts can never reach the 50-75 a pool needs to stop repeating.
        handlePages: 6,
        hashtags: ['bpdtok', 'bpdthings', 'dbtskills', 'bpdawareness', 'mentalhealthmemes',
            'borderlinepersonalitydisorder', 'bpdmemes', 'mentalhealthjourney', 'quotesaesthetic', 'sadquotes'],
        hashtagPages: 3,
        region: 'DE',
        // Under 15s loops audibly; over 70s is a song the viewer never reaches the end of.
        minDuration: 15, maxDuration: 70,
        licensedOnly: false,
        photoOnly: true,
        target: 75,
        drawWindow: 0.6,
        minVetted: 0,
        taste: false,
    },
    meme: {
        file: path.join(root, 'server/data/meme_sound_pool.json'),
        // No reference accounts here: the format's own niche tags are a vent surface, and a
        // sad track under a cat joke reads as a mistake. German tags instead, because a sound
        // running on a German account is proof it is licensed in Germany -- the single most
        // common reason a suggestion turns out to be unusable.
        handles: [], handlePages: 0,
        // Two groups. The German tags prove the track is licensed here, which is the thing
        // that cannot be checked any other way. The production-music tags are where the seam
        // actually is: the approved sounds are library cues, not songs, and that is a corner
        // of TikTok the cat tags only brush against. All are queried with region=DE, so the
        // results are what a German account can reach.
        // Chosen by measured keep rate, not by guessing. The taste check makes that measurable:
        // #cartoonmusic kept 75%, #comedymusic 71%, #silly 71%, while #lofimusic kept 0 of 10,
        // #jazzmusic 3 of 28 and #chillbeats 2 of 14. Ambient and chill tags fill the pool with
        // exactly the sentimentality this format cannot carry, so they are gone.
        hashtags: [
            // Production-music seam: where the approved sounds actually live.
            'cartoonmusic', 'playfulmusic', 'comedymusic', 'royaltyfreemusic', 'elevatormusic',
            'backgroundmusic', 'productionmusic', 'quirkymusic', 'vlogmusic', 'happymusic',
            'upbeatmusic', 'circusmusic', 'kazoo', 'funnymusic', 'bouncymusic', 'sitcom',
            'quirkyinstrumental', 'comedysketch', 'silly',
            // Cat and meme surfaces, which also prove the track runs on German accounts.
            'funnycats', 'catmemes', 'katzen', 'lustigekatzen', 'katzenliebe', 'katzenmemes',
            'katzenmama', 'memesdeutsch',
        ],
        // Deeper on fewer tags: six pages of a 70% source beats four pages of a 10% one.
        hashtagPages: 6,
        region: 'DE',
        // Seven slides need the length; a 34s sound loops audibly under them.
        minDuration: 40, maxDuration: 70,
        // Original sounds carry someone's voice, which fights slide text that must be read.
        licensedOnly: true,
        // Off here: what matters is that the track is licensed in Germany and fits the tone,
        // and a library track under a cat video proves both. Requiring a carousel threw away
        // almost the entire German yield and left the pool at eleven sounds.
        photoOnly: false,
        // Two bans in one. Sentimental markers, because pure piano and vent tracks were
        // rejected in testing. And German-language tracks: the slide copy is English and a
        // German vocal fights it, which is how "Hier kommt Conni" and "Guten Abend gute Nacht"
        // reached a shortlist from the German cat tags.
        reject: /\b(piano|sad|slowed|reverb|cry|crying|hurt|hurts|lonely|miss(ing)? you|heartbreak|grief|tears)\b|[\u00e4\u00f6\u00fc\u00df]|\b(der|die|das|und|ich|du|wir|nicht|mit|auf|ist|sind|ein|eine|einen|kommt|gute|nacht|abend|lied|titelsong|freundin|liebe|leben|mein|dein|traurig|weinen)\b/i,
        // Approved for this format in testing. These are the core of the pool rather than a
        // fallback: the taste criteria are specific enough that a broad scrape cannot
        // reproduce them, so the curated list carries the quality and the scrape adds range.
        // See the meme-slide-sounds skill for why each one fits.
        seeds: [
            { id: '6773560878408140802', category: 'neutral' },  // Simple Pleasantries - Arthur Benson
            { id: '7638038467818342417', category: 'playful' },  // Curious Little Creatures - BlueWhaleMusic
            { id: '7180363119678457857', category: 'playful' },  // Funny and Unusual Scene - HarmonicoHCO
            { id: '7225592100154820609', category: 'upbeat' },   // This Is The Life (Sped Up) - Amy Macdonald
            { id: '6927016038370428930', category: 'cartoon' },  // Funny - Gold-Tiger
            { id: '7367281879719135248', category: 'cartoon' },  // Funny Comedy - Bwd sound
            { id: '7321887043663169537', category: 'calm' },     // Feeling Blue - Caleb Arredondo
            { id: '6850015623452297217', category: 'calm' },     // Need 2 - Pinegrove, the serious pole
            // Clumsy Situations, Cats (both versions) and Go Kitty Go fit the format but the
            // song endpoint returns no playable URL for them, so they cannot be previewed.
        ],
        // The taste check keeps roughly half, so the raw target is about twice the number of
        // usable sounds wanted. A hundred usable is the point where a category filter still
        // has depth: the smallest bucket needs enough entries to be worth filtering to.
        target: 300,
        // Once the taste check runs, everything left in the pool has passed it, so the draw
        // can reach broadly. A fixed narrow window was right when the tail was unjudged; now
        // it would just hide two thirds of the usable sounds.
        drawWindow: 0.75,
        // One guaranteed known-good sound per draw, not two. With only eight approved sounds
        // a floor of two meant the same handful kept coming back; the taste check now covers
        // the rest, so the other two slots are free to be discoveries.
        minVetted: 1,
        taste: true,
    },
};

const POOL_TTL_MS = 12 * 60 * 60 * 1000;

export type SsSound = {
    id: string; title: string; artist: string; duration: number;
    isOriginal: boolean; playUrl: string; cover: string; link: string;
    source: 'reference' | 'hashtag'; via: string; plays: number; saves: number;
    // Set by the taste check. Undefined means it was never judged.
    fits?: boolean; verdict?: string; category?: SoundCategory;
};
type Pool = { updated: number; sounds: SsSound[] };

async function api(url: string, key: string) {
    const response = await fetch(url, { headers: { 'x-api-key': key }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`ScrapeCreators returned ${response.status}`);
    return await response.json() as any;
}

function firstUrl(value: any): string {
    const list = value?.url_list;
    return (Array.isArray(list) && typeof list[0] === 'string') ? list[0] : '';
}

function toSound(item: any, source: 'reference' | 'hashtag', via: string, profile: Profile): SsSound | null {
    const music = item?.music || {};
    const id = music.id_str || String(music.id || '');
    const duration = Number(music.duration || 0);
    // Without a playable URL the card cannot be previewed, which is the whole point.
    const playUrl = firstUrl(music.play_url);
    if (!id || !playUrl || duration < profile.minDuration || duration > profile.maxDuration) return null;
    if (profile.licensedOnly && music.is_original_sound) return null;
    const title = String(music.title || 'Unbenannter Sound');
    if (profile.reject?.test(title)) return null;
    const stats = item.statistics || {};
    return {
        id, title, artist: String(music.author || ''),
        duration, isOriginal: !!music.is_original_sound, playUrl,
        cover: firstUrl(music.cover_thumb) || firstUrl(music.cover_medium),
        link: `https://www.tiktok.com/music/x-${id}`, source, via,
        plays: Number(stats.play_count || 0), saves: Number(stats.collect_count || 0),
    };
}

// A seed is an already-approved sound, fetched directly so the pool has a known-good floor
// even when a scrape returns little. It is shaped like a scraped entry minus the post stats.
async function fetchSeed(id: string, key: string, profile: Profile): Promise<SsSound | null> {
    try {
        const music = (await api(`https://api.scrapecreators.com/v1/tiktok/song?clipId=${id}`, key))?.music_info;
        if (!music) return null;
        const playUrl = firstUrl(music.play_url);
        if (!playUrl) return null;
        return {
            id, title: String(music.title || 'Unbenannter Sound'), artist: String(music.author || ''),
            duration: Number(music.duration || 0), isOriginal: !!music.is_original_sound, playUrl,
            cover: firstUrl(music.cover_thumb) || firstUrl(music.cover_medium),
            link: `https://www.tiktok.com/music/x-${id}`, source: 'reference', via: 'geprüft',
            plays: Number(music.user_count || 0), saves: 0,
        };
    } catch (error) { console.error(`[Sounds] seed ${id}:`, error); return null; }
}

async function scrape(key: string, profile: Profile, label: string): Promise<SsSound[]> {
    const found: SsSound[] = [];
    for (const seedEntry of profile.seeds || []) {
        const seed = await fetchSeed(seedEntry.id, key, profile);
        if (seed) found.push({ ...seed, category: seedEntry.category });
    }
    for (const handle of profile.handles) {
        let cursor = '';
        for (let page = 0; page < profile.handlePages; page++) {
            try {
                const url = `https://api.scrapecreators.com/v3/tiktok/profile/videos?handle=${handle}&sort_by=popular&region=US${cursor ? `&max_cursor=${cursor}` : ''}`;
                const data = await api(url, key);
                for (const item of data?.aweme_list || []) {
                    // Only carousels: a sound chosen for a video is not evidence for a slideshow.
                    if (!item?.image_post_info) continue;
                    const sound = toSound(item, 'reference', '@' + handle, profile);
                    if (sound) found.push(sound);
                }
                cursor = data?.has_more && data?.max_cursor != null ? String(data.max_cursor) : '';
                if (!cursor) break;
            } catch (error) { console.error(`[${label}] ${handle}:`, error); break; }
        }
    }
    const enough = () => new Set(found.map((s) => s.id)).size >= profile.target;
    for (const hashtag of profile.hashtags) {
        if (enough()) break;
        let cursor = '';
        for (let page = 0; page < profile.hashtagPages; page++) {
            try {
                const url = `https://api.scrapecreators.com/v1/tiktok/search/hashtag?hashtag=${hashtag}&region=${profile.region}${cursor ? `&cursor=${cursor}` : ''}`;
                const data = await api(url, key);
                for (const item of data?.aweme_list || []) {
                    if (profile.photoOnly && !item?.image_post_info) continue;
                    const sound = toSound(item, 'hashtag', '#' + hashtag, profile);
                    if (sound) found.push(sound);
                }
                cursor = data?.has_more && data?.cursor ? String(data.cursor) : '';
                if (!cursor) break;
            } catch (error) { console.error(`[${label}] #${hashtag}:`, error); break; }
        }
    }
    // Keep the highest-performing post per sound; the same track appears across many posts.
    const best = new Map<string, SsSound>();
    for (const sound of found) {
        const current = best.get(sound.id);
        if (!current || sound.plays > current.plays) best.set(sound.id, sound);
        // A vetted or reference sound keeps its label even when a hashtag copy has more plays,
        // otherwise an approved sound shows up as an unvetted hashtag find.
        if (current?.source === 'reference') {
            const winner = best.get(sound.id)!;
            winner.source = 'reference';
            winner.via = current.via;
        }
    }
    return [...best.values()];
}

const pools = new Map<SoundFlow, Pool>();
const builds = new Map<SoundFlow, Promise<Pool>>();

async function load(flow: SoundFlow): Promise<Pool | null> {
    const cached = pools.get(flow);
    if (cached) return cached;
    try {
        const parsed = JSON.parse(await readFile(PROFILES[flow].file, 'utf8'));
        pools.set(flow, parsed);
        return parsed;
    } catch { return null; }
}

export async function getSoundPool(key: string, flow: SoundFlow, force = false, anthropicKey = ''): Promise<Pool> {
    const profile = PROFILES[flow];
    const cached = await load(flow);
    if (!force && cached && Date.now() - cached.updated < POOL_TTL_MS && cached.sounds.length) return cached;
    const running = builds.get(flow);
    if (running) return running;
    const build = (async () => {
        const scraped = await scrape(key, profile, flow === 'meme' ? 'Meme Sounds' : 'SS Sounds');
        // Carry forward verdicts already paid for, so a rebuild only judges what is new.
        const known = new Map((cached?.sounds || []).map((s) => [s.id, s]));
        for (const sound of scraped) {
            const previous = known.get(sound.id);
            if (previous?.fits !== undefined) {
                sound.fits = previous.fits;
                sound.verdict = previous.verdict;
                sound.category = previous.category;
            }
        }
        const sounds = profile.taste ? await vetSounds(scraped, anthropicKey) : scraped;
        // A failed scrape must not wipe a working pool.
        if (!sounds.length && cached?.sounds.length) return cached;
        const next: Pool = { updated: Date.now(), sounds };
        pools.set(flow, next);
        await mkdir(path.dirname(profile.file), { recursive: true });
        await writeFile(profile.file + '.tmp', JSON.stringify(next, null, 1));
        await rename(profile.file + '.tmp', profile.file);
        return next;
    })().finally(() => { builds.delete(flow); });
    builds.set(flow, build);
    return build;
}

// The taste criteria from the meme-slide-sounds skill, in a form a model can apply. Keyword
// filters catch the obvious cases and miss the ones that matter: "snowfall" by Øneheart &
// reidenshi contains no banned word and is exactly the ambient sentimentality this format
// cannot carry. Judging a title and artist is a question about music, not about strings.
const MEME_TASTE_PROMPT = `You are judging TikTok sounds for one specific format: white-background
meme carousels where deadpan reaction cats deliver practical advice about living with BPD. The
tone is light humour carrying real advice.

A sound fits when it is playful, curious or warm without committing hard in either direction. It
should feel like it is smiling, not laughing. Production and library music hits this most
reliably, because it was written to sit under something rather than to be the thing.

A sound does NOT fit when it is:
- ambient, atmospheric, lo-fi or "chill" in a melancholic way (Øneheart, reidenshi, sleep or
  study playlist material). This is the most common near-miss: it sounds inoffensive and it
  quietly turns a joke into a sad post.
- sentimental or emotional, a ballad, and solo piano in particular
- a sad or heartbreak song, whatever the tempo
- loud, chaotic, hyperpop, phonk, or a joke sound effect, all of which bury the advice
- sung in a language other than English, because the slide copy is English
- a mainstream pop hit whose own meaning would take over the post

You cannot hear these tracks, so judge from what the title and artist actually tell you. When
the signal is genuinely weak, reject: a wrong suggestion costs the user listening time, and the
pool has more candidates than it needs.

Also sort each sound you keep into exactly one bucket, so the user can filter by the mood a
given post needs. Judge the sound itself, not the title's subject:
- playful: schrulliges, freundliches Library-Material. The default seam for this format.
- cartoon: slapstick, zeichentrickhaft, broad and silly.
- upbeat: bright and driving without tipping into silly.
- calm: warm and held back, for the posts that carry more weight.
- neutral: plain background that never competes with the text.
A rejected sound still needs a bucket; it is ignored.

Return JSON only:
{"verdicts":[{"id":"...","fits":true|false,"category":"playful","reason":"under 12 words"}]}
One entry per supplied id, no invented ids.`;

// One call per pool rebuild, so the taste check costs a fraction of a cent every twelve hours.
const TASTE_BATCH = 60;

async function vetSounds(sounds: SsSound[], anthropicKey: string): Promise<SsSound[]> {
    // Judge anything not yet judged, and anything judged before a later field was introduced.
    // Without the second case an existing pool could never gain categories, and the only way
    // to get them would be deleting the pool, which throws away verdicts already paid for.
    const candidates = sounds.filter((s) => s.source !== 'reference'
        && (s.fits === undefined || (s.fits && !s.category)));
    if (!candidates.length || !anthropicKey) return sounds;
    // Batched: a few hundred verdicts do not fit in one response, and a truncated JSON body
    // would lose the whole run rather than one chunk of it.
    for (let start = 0; start < candidates.length; start += TASTE_BATCH) {
        await vetBatch(sounds, candidates.slice(start, start + TASTE_BATCH), anthropicKey);
    }
    console.log(`[Meme Sounds] taste check: ${sounds.filter((s) => s.fits !== false).length}/${sounds.length} kept`);
    return sounds;
}

async function vetBatch(sounds: SsSound[], candidates: SsSound[], anthropicKey: string) {
    const payload = candidates.map((s) => ({ id: s.id, title: s.title, artist: s.artist, seconds: s.duration }));
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', signal: AbortSignal.timeout(120000),
            headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6', max_tokens: 4000, system: MEME_TASTE_PROMPT,
                messages: [{ role: 'user', content: JSON.stringify({ sounds: payload }) }],
            }),
        });
        if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
        const data = await response.json() as any;
        const raw = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
        const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
        const parsed = JSON.parse(raw.slice(start, end + 1));
        const byId = new Map<string, any>((parsed.verdicts || []).map((v: any) => [String(v.id), v]));
        for (const sound of sounds) {
            const verdict = byId.get(sound.id);
            if (!verdict) continue;
            sound.fits = !!verdict.fits;
            sound.verdict = String(verdict.reason || '').slice(0, 120);
            const category = String(verdict.category || '');
            if (SOUND_CATEGORIES.some((c) => c.id === category)) sound.category = category as SoundCategory;
        }
    } catch (error) {
        // An unjudged batch is still usable; the vetted seeds and the other batches carry it.
        console.error('[Meme Sounds] taste batch failed:', error);
    }
}

// Reference-account sounds first, then the better-performing hashtag finds.
function score(sound: SsSound) {
    return (sound.source === 'reference' ? 1_000_000_000 : 0) + sound.saves * 20 + sound.plays;
}

export function pickSounds(sounds: SsSound[], count: number, exclude: string[], draw = 0.6, minVetted = 0, category = ''): SsSound[] {
    const skip = new Set(exclude);
    // A rejected sound never reaches a shortlist. A category narrows the pool before ranking,
    // so the vetted floor still applies within whatever the user filtered to.
    const ranked = sounds
        .filter((s) => !skip.has(s.id) && s.fits !== false && (!category || s.category === category))
        .sort((a, b) => score(b) - score(a));
    if (ranked.length <= count) return ranked;

    const take = (from: SsSound[], howMany: number) => {
        const picked: SsSound[] = [];
        const bag = [...from];
        while (picked.length < howMany && bag.length) {
            picked.push(...bag.splice(Math.floor(Math.random() * bag.length), 1));
        }
        return picked;
    };
    // Guarantee a floor of vetted sounds before the scraped tail gets a turn.
    const vetted = minVetted > 0 ? take(ranked.filter((s) => s.source === 'reference'), minVetted) : [];
    if (vetted.length >= count) return vetted.slice(0, count);
    // Draw from a shortlist rather than the strict top, so refreshing shows something new
    // without dropping into the weak tail. The window scales with the pool: a fixed small
    // window made a 100-sound pool behave like a 15-sound one, and the same few tracks kept
    // coming back across separate posts, which is exactly what the pool exists to prevent.
    const span = draw > 1 ? draw : Math.ceil(ranked.length * draw);
    const window = Math.min(ranked.length, Math.max(count * 5, span));
    const taken = new Set(vetted.map((s) => s.id));
    const shortlist = ranked.slice(0, window).filter((s) => !taken.has(s.id));
    return [...vetted, ...take(shortlist, count - vetted.length)];
}

export async function recommendSsSounds(key: string, flow: SoundFlow, count: number, exclude: string[], refresh: boolean, anthropicKey = '', category = '') {
    const current = await getSoundPool(key, flow, refresh, anthropicKey);
    const usable = current.sounds.filter((s) => s.fits !== false);
    return {
        sounds: pickSounds(current.sounds, count, exclude, PROFILES[flow].drawWindow, PROFILES[flow].minVetted, category),
        // What each filter would actually offer, so the UI can grey out an empty one.
        categories: SOUND_CATEGORIES.map((c) => ({ ...c, count: usable.filter((s) => s.category === c.id).length })),
        poolSize: usable.length,
        updated: current.updated,
        flow,
    };
}

// The CDN URL can expire, so a stale pool entry is refetched once before giving up. Both pools
// are searched: the player only knows a sound id, not which tab suggested it.
export async function resolveSoundAudio(key: string, id: string): Promise<string | null> {
    for (const flow of ['slideshow', 'meme'] as SoundFlow[]) {
        const known = (await load(flow))?.sounds.find((s) => s.id === id);
        if (known?.playUrl) return known.playUrl;
    }
    try {
        const data = await api(`https://api.scrapecreators.com/v1/tiktok/song?clipId=${id}`, key);
        return firstUrl(data?.music_info?.play_url) || null;
    } catch { return null; }
}
