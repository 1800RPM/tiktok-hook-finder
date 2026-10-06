// Batch publishing: approved slides go to Supabase Storage as public URLs, then post-bridge
// hands each post to TikTok as a real draft (tiktok.draft) with the photo-post title in its own
// field (tiktok.title). The post is finished in the TikTok app, where the sound gets added.

const POST_BRIDGE_API = 'https://api.post-bridge.com/v1';
const BUCKET = 'post-images';

async function postBridge(path: string, init: RequestInit = {}) {
    const key = process.env.POST_BRIDGE_API_KEY;
    if (!key) throw new Error('POST_BRIDGE_API_KEY is missing in server/.env.');
    const response = await fetch(`${POST_BRIDGE_API}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
        signal: AbortSignal.timeout(30000),
    });
    const data: any = await response.json().catch(() => null);
    if (!response.ok) {
        const message = data?.message || data?.error || (Array.isArray(data?.errors) ? data.errors.join(', ') : '') || 'request failed';
        throw new Error(`post-bridge ${response.status}: ${typeof message === 'string' ? message : JSON.stringify(message)}`);
    }
    return data;
}

export async function listPublishAccounts() {
    const accounts: Array<{ id: string; name: string; service: string; needsReconnect: boolean }> = [];
    for (let offset = 0; offset < 500; offset += 50) {
        const page = await postBridge(`/social-accounts?limit=50&offset=${offset}`);
        for (const a of page?.data || []) accounts.push({ id: String(a.id), name: a.username, service: a.platform, needsReconnect: Boolean(a.needs_reconnect) });
        if (!page?.meta?.next) break;
    }
    return accounts;
}

export async function createTikTokDraft(input: { accountId: string; caption: string; title?: string; imageUrls: string[] }) {
    if (!/^\d+$/.test(input.accountId)) throw new Error('Unknown account. Pick the account again in the Batch tab.');
    if (!input.imageUrls.length || input.imageUrls.length > 35) throw new Error('A TikTok photo post needs 1 to 35 images.');
    const data = await postBridge('/posts', {
        method: 'POST',
        body: JSON.stringify({
            caption: input.caption,
            social_accounts: [Number(input.accountId)],
            media_urls: input.imageUrls,
            // No scheduled_at: handed to TikTok right away, and draft keeps it out of the feed.
            platform_configurations: { tiktok: { draft: true, ...(input.title ? { title: input.title.slice(0, 90) } : {}) } },
        }),
    });
    return { id: String(data?.id ?? data?.data?.id ?? ''), status: String(data?.status ?? data?.data?.status ?? 'created') };
}

function supabaseConfig() {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing in server/.env.');
    return { url, key };
}

let bucketReady: Promise<void> | null = null;
function ensureBucket() {
    // Created on first use and public, because post-bridge fetches the images without credentials.
    bucketReady ??= (async () => {
        const { url, key } = supabaseConfig();
        const response = await fetch(`${url}/storage/v1/bucket`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
        });
        if (!response.ok) {
            const text = await response.text();
            if (!/already exists|Duplicate/i.test(text)) throw new Error(`Supabase bucket: ${response.status} ${text.slice(0, 200)}`);
        }
    })().catch((error) => { bucketReady = null; throw error; });
    return bucketReady;
}

export async function uploadSlideImage(path: string, bytes: ArrayBuffer, contentType = 'image/png') {
    if (!/^[a-z0-9][a-z0-9/_-]{0,180}\.(png|jpg)$/i.test(path) || path.includes('..')) throw new Error('Invalid image path.');
    if (bytes.byteLength === 0 || bytes.byteLength > 15 * 1024 * 1024) throw new Error('Image must be between 1 byte and 15 MB.');
    await ensureBucket();
    const { url, key } = supabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': contentType, 'x-upsert': 'true' },
        body: bytes,
    });
    if (!response.ok) throw new Error(`Supabase upload ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function publishingStatus() {
    return {
        postBridge: Boolean(process.env.POST_BRIDGE_API_KEY),
        storage: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    };
}
