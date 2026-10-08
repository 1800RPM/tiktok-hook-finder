// Batch slideshow generator — produces N complete post bundles per session.
// Format: face hook (slide 1) + dusk-photo value slides + woven text CTA,
// the kenzie.vents pattern. Each bundle = numbered images + slide texts +
// caption + pinned comment + meta.json, written to the Queue folder.

import { mkdirSync, writeFileSync, copyFileSync, readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { SS_CTAS, type SsCtaId } from "./ss_slideshow";

const ASSETS_ROOT = "G:\\Projects\\DBT-Mind Tiktok\\New Slideshow Format\\Assets\\Images";
const QUEUE_ROOT = "G:\\Projects\\DBT-Mind Tiktok\\New Slideshow Format\\Queue";
const USAGE_FILE = path.join(ASSETS_ROOT, "_usage.json");
const DEDUP_DAYS = 7;
const SLIDE_COUNT = 7; // 1 hook + 6 points

// ---------------------------------------------------------------------------
// Format registry
// ---------------------------------------------------------------------------
export type SsFormatId = 'things-nobody-tells' | 'shamed-for' | 'thought-was-flaw' | 'skills-that-work' | 'texts-unsent';

export const SS_FORMATS: Record<SsFormatId, { label: string; premise: string; hookExamples: string; pointSpec: string }> = {
    'things-nobody-tells': {
        label: 'X things nobody tells you about recovery',
        premise: 'Reflective recovery truths nobody warns you about — the boring, unglamorous parts of getting better with BPD.',
        hookExamples: `"5 things nobody tells you about bpd recovery (the boring parts)" / "from 8 months of dbt, not a therapist"`,
        pointSpec: 'each point: one unglamorous recovery truth. grief for the highs, calm feeling wrong, losing crisis-friends, invisible wins. melancholic but warm.'
    },
    'shamed-for': {
        label: 'Things you got shamed for, explained properly',
        premise: 'Reframing behaviors people got shamed for as symptoms with logic behind them — validation through explanation, not comfort.',
        hookExamples: `"5 bpd things you got shamed for, explained properly"`,
        pointSpec: 'each point: one shamed behavior (going 0-to-100, long paragraphs, neediness, calling yourself crazy first) + the actual mechanism behind it. end each with the reframe that lands.'
    },
    'thought-was-flaw': {
        label: 'Things I thought were personality flaws (they were BPD)',
        premise: 'Diagnosis-hindsight: traits the narrator beat themselves up over for years that turned out to be symptoms.',
        hookExamples: `"5 things i thought were personality flaws (they were bpd)" / "from someone who found out at 22"`,
        pointSpec: 'each point: one "flaw" + what it actually was. past-tense shame, present-tense understanding. "i wasn\'t too much, i was overwhelmed" energy.'
    },
    'skills-that-work': {
        label: 'DBT skills that actually work at 3am',
        premise: 'Practical skills delivered like a friend texting what actually works — funny but usable, never a lecture.',
        hookExamples: `"dbt skills that actually work at 3am (from someone who's needed them)"`,
        pointSpec: 'each point: one real DBT skill (TIPP, opposite action, check the facts, STOP, wise mind, radical acceptance, paced breathing, 5-4-3-2-1 grounding) explained concretely enough to DO, with a funny-but-true closer.'
    },
    'texts-unsent': {
        label: 'Paragraphs I wrote and never sent',
        premise: 'The unsent paragraphs — what the narrator almost texted and what they did instead. relational, highest share rate.',
        hookExamples: `"paragraphs i wrote at 2am and never sent (you're welcome)"`,
        pointSpec: 'each point: the text they almost sent (quoted, specific) + what happened because they didn\'t send it. self-indictment and relief mixed.'
    }
};

const SS_FORMAT_IDS = Object.keys(SS_FORMATS) as SsFormatId[];
const SS_CTA_IDS = Object.keys(SS_CTAS) as SsCtaId[];

// ---------------------------------------------------------------------------
// Voice + structure prompt
// ---------------------------------------------------------------------------
const SS_VOICE = `You ARE a 22-year-old woman with BPD, 8 months into DBT, posting reflective photo carousels.
You write like you text. You are NOT a therapist account and NOT a motivational page.

AUDIENCE: gen-z mental-health TikTok (BPD girlies, 16-25). They are ad-skeptical,
lecture-allergic, and can smell AI writing instantly.

RHYTHM RULES (these matter more than tone adjectives):
- Headlines: max 8 words, numbered ("2. calm feels wrong before it feels good")
- Bodies: max 25 words, broken into 2-4 short lines (\\n). At least one line ≤4 words.
- No line longer than 8 words. Fragments over sentences.
- lowercase everywhere. max 1 emoji per slide, never on the emotional line.

INSIDER TEXTURE (use 1-2 per carousel, never stacked):
fp, splitting, "the 0-to-100", "gone by morning", quiet bpd, "left on delivered",
checking who viewed your story after the fight, the 4-hour replay, one song ruining a good day.

BANNED (AI/cringe tells — instant rewrite):
- "i recommend an app called", "turns out:" more than once, symmetrical triplets
- rhetorical setups ("sound familiar?", "the kicker?"), explaining the joke
- therapy-speak: healing journey, self-care, valid, be gentle with yourself
- millennial-gen-z cosplay: bestie, no bc, i'm deceased, "delulu"
- sentimental endings, advice-voice ("you should"), hashtags in slides
- invented theatrical numbers ("47 spirals") — small real details beat big fake ones`;

const STRUCTURE_RULES = `STRUCTURE — 7 slides, this exact shape:

slide 1 (role "hook"): the scroll-stopper over a face photo. format headline + a tilt
  line on its own line ("from 8 months of dbt, not a therapist"). a stranger gets the
  whole premise in under a second.

slide 2 (role "point", point 1): THE SECOND HOOK — this is critical. TikTok can serve
  the carousel STARTING at slide 2, so it must work as its own entry point: the most
  relatable point, no dependency on slide 1. if someone lands here cold they must
  immediately feel "this is about me".

slides 3-6 (role "point", points 2-5): one idea each. headline carries the point,
  body proves it with one small true detail, last line is the turn or the quotable.

slide 7 (role varies): the emotional peak — the slide people screenshot and send.

CTA (woven, text-only, one line): the app mention is the FINAL LINE of the slide
  indicated, in identical voice, attached to that slide's behavior — the app as the
  tool for the thing the slide just described. never its own paragraph-block of praise,
  never "download", never "i recommend". model: "the venty app has been great for this".`;

function buildSystemPrompt(format: SsFormatId, ctaId: SsCtaId, ctaSlide: number): string {
    const f = SS_FORMATS[format];
    const cta = SS_CTAS[ctaId];
    return `${SS_VOICE}

FORMAT: ${f.label}
PREMISE: ${f.premise}
HOOK EXAMPLES (match this register, don't copy): ${f.hookExamples}
POINTS: ${f.pointSpec}

${STRUCTURE_RULES}

THE APP MENTION goes on SLIDE ${ctaSlide} as its final line, adapting this approved line
(keep it casual, first-person, tool-for-the-behavior; you may lightly rephrase to fit
the slide but keep it ONE line and name the app "dbt-mind" lowercase):
"${cta.line}"

OUTPUT: valid JSON only, no markdown:
{"slides": [{"n": 1, "role": "hook", "headline": "...", "body": "..."},
            {"n": 2, "role": "point", "headline": "2. ...", "body": "..."}, ...],
 "caption": "...", "pinned_comment": "..."}

CAPTION: 1 short line pointing at the app slide without explaining it (treasure hunt),
plus 3-5 lowercase hashtags. never "ad", never describes the app.
PINNED_COMMENT: the plain friendly answer to "what app?", names DBT-Mind once,
1-2 short sentences, no link.

FINAL CHECK: exactly 7 slides. slide 2 works standalone. every body ≤25 words.
exactly one slide names the app, as its final line, on slide ${ctaSlide}.
would a skeptical 19-year-old with bpd screenshot the last slide?`;
}

// ---------------------------------------------------------------------------
// Anthropic call with retry
// ---------------------------------------------------------------------------
function extractJsonObject(text: string): any {
    const src = String(text || '');
    const start = src.search(/[[{]/);
    if (start < 0) throw new Error('No JSON found');
    const open = src[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (inStr) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === '"') inStr = false;
            continue;
        }
        if (ch === '"') inStr = true;
        else if (ch === open) depth++;
        else if (ch === close) {
            depth--;
            if (depth === 0) return JSON.parse(src.slice(start, i + 1));
        }
    }
    throw new Error('Unbalanced JSON');
}

async function generateScript(params: {
    format: SsFormatId; ctaId: SsCtaId; ctaSlide: number;
    theme?: string; ANTHROPIC_API_KEY: string;
}) {
    const { format, ctaId, ctaSlide, theme, ANTHROPIC_API_KEY } = params;
    const userPrompt = [
        `Write the carousel: ${SS_FORMATS[format].label}.`,
        theme?.trim() ? `Angle: ${theme.trim()}.` : 'Pick a specific angle yourself (fp spirals, 3am overthinking, post-argument shame, quiet bpd...).',
        'Return valid JSON only.'
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6', max_tokens: 2400,
                system: buildSystemPrompt(format, ctaId, ctaSlide),
                messages: [{ role: 'user', content: userPrompt }]
            })
        });
        if (response.ok) {
            const rawData = await response.json() as any;
            const rawText = rawData.content?.[0]?.text || '';
            try {
                return extractJsonObject(rawText);
            } catch {
                console.error(`[SS Batch] JSON parse failed (attempt ${attempt + 1}), tail:`, rawText.slice(-100));
                continue;
            }
        }
        const errText = await response.text();
        const overloaded = response.status === 529 || errText.includes('overloaded');
        console.error(`[SS Batch] Anthropic error (attempt ${attempt + 1}):`, errText.slice(0, 200));
        if (!overloaded) throw new Error('Anthropic API Error');
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
    throw new Error('Script generation failed after retries');
}

// ---------------------------------------------------------------------------
// Image pool matching with usage dedup
// ---------------------------------------------------------------------------
type UsageMap = Record<string, string>; // "pool/file" -> ISO date

function loadUsage(): UsageMap {
    try { return JSON.parse(readFileSync(USAGE_FILE, 'utf8')); } catch { return {}; }
}
function saveUsage(u: UsageMap) { writeFileSync(USAGE_FILE, JSON.stringify(u, null, 2)); }

function pickFromPool(pool: string, count: number, usage: UsageMap): string[] {
    const dir = path.join(ASSETS_ROOT, pool);
    if (!existsSync(dir)) throw new Error(`Image pool missing: ${pool}`);
    const cutoff = Date.now() - DEDUP_DAYS * 86400000;
    const fresh = readdirSync(dir)
        .filter((f) => f.endsWith('.jpg'))
        .filter((f) => {
            const used = usage[`${pool}/${f}`];
            return !used || new Date(used).getTime() < cutoff;
        });
    if (fresh.length < count) throw new Error(`Pool ${pool} exhausted (${fresh.length} fresh, need ${count})`);
    // shuffle
    for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
    }
    const picked = fresh.slice(0, count);
    const today = new Date().toISOString().slice(0, 10);
    picked.forEach((f) => { usage[`${pool}/${f}`] = today; });
    return picked.map((f) => path.join(dir, f));
}

// ---------------------------------------------------------------------------
// Bundle writer
// ---------------------------------------------------------------------------
function writeBundle(params: {
    accountId: string; postIndex: number; script: any;
    format: SsFormatId; ctaId: SsCtaId; ctaSlide: number; usage: UsageMap;
}) {
    const { accountId, postIndex, script, format, ctaId, ctaSlide, usage } = params;
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(QUEUE_ROOT, date, `account-${accountId}`, `post-${String(postIndex).padStart(2, '0')}`);
    mkdirSync(dir, { recursive: true });

    const hookImg = pickFromPool('01-hook', 1, usage)[0];
    const duskImgs = pickFromPool('05-dusk', SLIDE_COUNT - 1, usage);
    copyFileSync(hookImg, path.join(dir, '1_hook.jpg'));
    duskImgs.forEach((src, i) => copyFileSync(src, path.join(dir, `${i + 2}.jpg`)));

    const slides: any[] = Array.isArray(script.slides) ? script.slides.slice(0, SLIDE_COUNT) : [];
    const textParts = slides.map((s, i) => {
        const head = String(s.headline || '').trim();
        const body = String(s.body || '').trim();
        return `Slide ${i + 1}:\n${head}${head && body ? '\n\n' : ''}${body}`;
    });
    writeFileSync(path.join(dir, 'slide_texts.txt'), textParts.join('\n\n---\n\n'));
    writeFileSync(path.join(dir, 'caption.txt'), String(script.caption || ''));
    writeFileSync(path.join(dir, 'pinned_comment.txt'), String(script.pinned_comment || ''));
    writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
        account: accountId, format, cta_id: ctaId,
        cta_position: ctaSlide === SLIDE_COUNT ? 'final' : 'penultimate',
        cta_slide: ctaSlide, created: new Date().toISOString()
    }, null, 2));

    return dir;
}

// ---------------------------------------------------------------------------
// Batch entry point
// ---------------------------------------------------------------------------
export async function generateSsBatch(params: {
    count: number;
    theme?: string;
    formats?: SsFormatId[];
    accountId?: string;
    ANTHROPIC_API_KEY: string;
}) {
    const count = Math.max(1, Math.min(10, params.count || 5));
    const accountId = (params.accountId || 'default').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'default';
    const formatPool = (params.formats?.length ? params.formats : SS_FORMAT_IDS).filter((f) => f in SS_FORMATS);
    if (!formatPool.length) throw new Error('No valid formats');

    console.log(`[SS Batch] Generating ${count} scripts for account "${accountId}"...`);
    const usage = loadUsage();

    const jobs = Array.from({ length: count }, (_, i) => ({
        index: i + 1,
        format: formatPool[i % formatPool.length],
        ctaId: SS_CTA_IDS[Math.floor(Math.random() * SS_CTA_IDS.length)],
        // A/B: half get CTA on final slide, half penultimate
        ctaSlide: i % 2 === 0 ? SLIDE_COUNT : SLIDE_COUNT - 1
    }));

    const results: any[] = [];
    const errors: any[] = [];
    let cursor = 0;
    const workers = Array.from({ length: Math.min(3, jobs.length) }, async () => {
        while (cursor < jobs.length) {
            const job = jobs[cursor++];
            try {
                const script = await generateScript({
                    format: job.format, ctaId: job.ctaId, ctaSlide: job.ctaSlide,
                    theme: params.theme, ANTHROPIC_API_KEY: params.ANTHROPIC_API_KEY
                });
                if (!Array.isArray(script?.slides) || script.slides.length < SLIDE_COUNT) {
                    throw new Error(`Model returned ${script?.slides?.length ?? 0} slides`);
                }
                const bundlePath = writeBundle({
                    accountId, postIndex: job.index, script,
                    format: job.format, ctaId: job.ctaId, ctaSlide: job.ctaSlide, usage
                });
                saveUsage(usage);
                results.push({
                    post: job.index, bundle: bundlePath, format: job.format,
                    cta: job.ctaId, cta_position: job.ctaSlide === SLIDE_COUNT ? 'final' : 'penultimate',
                    hook: String(script.slides[0]?.headline || ''),
                    caption: String(script.caption || '')
                });
                console.log(`[SS Batch] post-${job.index} done (${job.format})`);
            } catch (e) {
                console.error(`[SS Batch] post-${job.index} failed:`, e);
                errors.push({ post: job.index, error: String(e) });
            }
        }
    });
    await Promise.all(workers);

    return {
        account: accountId,
        generated: results.length,
        failed: errors.length,
        bundles: results.sort((a, b) => a.post - b.post),
        errors
    };
}
