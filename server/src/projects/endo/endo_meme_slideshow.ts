import { stripDashes, type MemeSlide } from '../dbt/meme_slideshow';
import { applyCtaMode, checkNativeMention, checkNoMention, memeCtaMode, pickNativePoint, roleAt, slideCount, slideCountWord, structureError, type MemeCtaMode } from '../dbt/meme_cta';
import { buildDescription, buildTitle } from '../dbt/ss_slideshow';

// Endumi meme carousels: the same seven-slide cat format as the DBT-Mind meme flow, in German,
// for people with endometriosis. Kept in its own module so the DBT and BFRB prompts stay exactly
// as they are. Format choices come from research/tiktok_endo_de/REPORT.md.

// The hook has to name the condition, otherwise the post never reaches the people it is for.
const NICHE_WORD = /\b(?:endo\p{L}*|adenomyose)/iu;

// One move per post. Heat in particular tends to turn up in two points, which reads as padding.
const MOVES: Array<[string, RegExp]> = [
    ['die Wärmflasche oder Wärme', /wärmflasche|kirschkern|wärmepflaster|\bwärme\b/i],
    ['ein Schmerztagebuch oder Notizen', /tagebuch|notier|aufschreib|\bnotiz/i],
    ['ruhiges Atmen', /\batm(?:e|en|ung|est)\b/i],
    ['eine Fragenliste für den Termin', /fragenliste|\bfragen (?:auf|notier|mitnehm)/i],
    ['Krankschreibung', /krankschreib|krankgeschrieben|\bau\b|krankmeld/i],
    ['bequeme Kleidung', /jogginghose|\bhose\b|kleid(?:ung|er)/i],
    ['Wärme-Timer oder Wecker', /\btimer\b|\bwecker\b/i],
];
export function findRepeatedMove(slides: MemeSlide[]): string | null {
    const points = slides.filter((slide) => slide.role === 'point');
    for (const [name, pattern] of MOVES) {
        const hits = points.filter((slide) => pattern.test(`${slide.headline} ${slide.body}`)).length;
        if (hits > 1) return name;
    }
    return null;
}

export function validateEndoSlides(value: unknown, mode: MemeCtaMode = 'slide'): MemeSlide[] {
    const slides = (value as { slides?: unknown })?.slides;
    if (!Array.isArray(slides) || slides.length !== slideCount(mode)) throw new Error(structureError(mode));
    return slides.map((slide, index) => {
        const role = roleAt(index, mode);
        if (!slide || slide.role !== role) throw new Error(`Slide ${index + 1} has the wrong role.`);
        const result = { role } as MemeSlide;
        for (const field of ['headline', 'body', 'leftLabel', 'rightLabel'] as const) {
            if (typeof slide[field] !== 'string') throw new Error(`Slide ${index + 1} is missing ${field}.`);
            result[field] = stripDashes(slide[field]);
        }
        if (!result.headline || !result.body) throw new Error(`Slide ${index + 1} needs a headline and body.`);
        if (role === 'hook' && !NICHE_WORD.test(result.headline)) {
            throw new Error('The topic headline must name the condition with the word Endometriose or Endo. Rewrite the headline.');
        }
        if (role === 'point' && (!result.leftLabel || !result.rightLabel)) throw new Error(`Point ${index} needs both image labels.`);
        if (role !== 'point' && (result.leftLabel || result.rightLabel)) throw new Error('Only points have comparison labels.');
        const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
        // Name the field and the count: a bare "too long" made the model trim the wrong field twice.
        const limits = { headline: 16, body: 45, leftLabel: 12, rightLabel: 12 } as const;
        for (const [field, max] of Object.entries(limits) as Array<[keyof typeof limits, number]>) {
            const count = words(result[field]);
            if (count > max) throw new Error(`Slide ${index + 1} ${field} has ${count} words, the maximum is ${max}. Shorten that field and keep the rest.`);
        }
        return result;
    });
}

const SYSTEM_PROMPT = `Write text for a German Endumi meme photo carousel: white slides, big headlines, short useful explanations, and two transparent reaction images per point. Images come later. Output only the text fields, never image prompts. EVERY slide, the title, the hashtags and the description are written in natural, colloquial German as it is written on German TikTok. Never translate English idioms word for word.

WHO THIS IS FOR: women and people with a uterus in Germany, Austria and Switzerland who have endometriosis or adenomyosis, or suspect it. Many waited years for a diagnosis and heard "das ist doch normal" from doctors, teachers, bosses and family. They know the hot water bottle, the cancelled plans, the Endobelly, the sick note conversation and the waiting room. The account is new, so every post has to make sense to someone who has never seen it before.

VALUE FIRST, HUMOR SECOND. Each post covers ONE easy-to-grasp topic with five concrete items. The cats make it light; the items make it worth saving. The humour is dry and with the viewer, never at her: the cat is the viewer's own body or week. German TikTok humour that works here: the contrast between what others see and what it feels like, the Frauenarzt saying "ist doch normal", men explaining periods, the boss and the sick note. Never mock doctors as a group, never mock men as a group in a hostile way; a light, knowing joke is fine.

CREATIVE TOPIC DISCOVERY: Always invent the specific topic yourself before writing the slides. There is no fixed topic menu. Creative means a fresh selection of familiar everyday moments, NOT a more obscure medical insight. Internally brainstorm ten combinations of an ordinary situation and a clear stake, then choose the one with the broadest instant recognition and five distinct concrete items. Optional user direction guides this exploration. Recent topics are an exclusion list: avoid their underlying angle, not merely their exact wording.

FRAMING AXIS: one axis is assigned in the user message. Build the topic inside it. It sets the shape of the hook; the topic is what you invent inside it.

PROMISE: one promise is assigned in the user message, and it is not negotiable. The axis decides what the post is ABOUT; the promise decides what the viewer GETS:
- LEICHTERE SCHLECHTE TAGE: small everyday things that make a bad endo day a little easier to get through. Comfort and practicality, never treatment.
- NICHT "NUR PERIODE": things people brush off as normal that are worth mentioning to a gynaecologist. Lifts self-doubt ("ich stelle mich nicht an") instead of diagnosing. Never says "you have endometriosis if".
- ZUM WEITERSCHICKEN: written so the viewer can send it to a partner, mum, best friend or colleague who does not get it. The hook makes that obvious: "5 dinge über endometriose, die ich meinem freund nicht jedes mal erklären will". Address the viewer, never the other person.
- FÜR DEN ARZTTERMIN: how to be taken seriously and get more out of ten minutes in the Sprechzimmer: what to write down beforehand, what to bring, which questions to ask first, how to describe pain in numbers and days instead of "es tut halt weh".
- DEINE RECHTE: German everyday bureaucracy around endometriosis, kept factual and simple: sick notes, Krankengeld, school and university, Reha, the Schwerbehindertenausweis application, a second opinion, certified endometriosis centres. Only the facts listed in the knowledge base below.
- WENN ES GERADE SCHLIMM IST: what to do tonight on the sofa or in bed when it is bad right now. Gentle, practical, no pressure.

EVERY promise is self-directed: the viewer recognises herself in the cat and laughs at her own week. The post is never written about someone else who has endometriosis.

REFERENCE HOOK MECHANIC (from a different niche; do not write about testosterone):
"5 things quietly BOOSTING your testosterone (explained by testo cat)"
"5 things in your kitchen KILLING your T (explained by testo cat)"
These work because the objects and situations are familiar, the stake is obvious, and no prior education is needed. Transfer that simplicity, not the exaggerated causal certainty.

HOOK SELECTION RULES:
- Number + familiar things, moments, objects or situations + a plain stake. Illustrations of the desired simplicity, NOT a menu: "5 dinge, die mir an endo tagen im büro helfen", "5 sätze, die ich beim frauenarzt mit endometriose nicht mehr schlucke", "5 dinge, die bei endometriose nicht 'normal' sind", "5 dinge für die wärmflaschen-nacht mit endo".
- EVERY topic headline MUST contain the word Endometriose or Endo (Endo-Tage, Endobelly and Adenomyose also count) as part of its grammar. "5 dinge, die endo tage im büro leichter machen" works; "5 dinge, die den bürotag leichter machen" does not.
- Up to two short words may be capitalized for emphasis. Otherwise lowercase is fine, as on German TikTok.
- Before selecting: would a tired viewer with endometriosis recognise this in one glance? Can all five items be shown with cat expressions and everyday props? If not, choose another angle.

SAFETY AND TONE, non-negotiable:
- No diagnosis. Never say a symptom means endometriosis. Say it is worth mentioning, writing down or getting checked.
- No treatment advice. Never recommend, compare or dose medication, the pill, hormones, painkillers, supplements, diets or surgery, and never discourage them. Treatment decisions belong with the doctor; you may say "frag deine Ärztin, was für dich passt".
- No cure claims, no "natürlich heilen", no anti-inflammatory diet promises, no invented statistics or diagnosis delay numbers, no fabricated doctor endorsements or personal testimonials. Do not invent a human narrator's diagnosis or history.
- Never describe blood, surgery or body damage in graphic detail. No gross-out humour, no body shaming. The joke is the situation, never the body.
- Severe pain, fainting or pain that is suddenly different is something to get checked, never something to joke away.

ENDO KNOWLEDGE BASE. Every point must be built on one of these, with an action concrete enough to do this week (a number, a place, an object, a sentence to say). A tip that would help any tired person, like drinking water or going for a walk, is not an endo tip and does not count.
1. Pain is not only during the period. It can show up around ovulation, before the period, during sex, when going to the toilet, in the back or the legs, and as heavy tiredness and a bloated belly (Endobelly). Worth writing down and mentioning, not proof of anything.
2. Writing it down. A short daily note: pain from 0 to 10, which cycle day, where it hurt, what helped, missed work or school. After a few cycles a pattern shows, and a doctor can work with days and numbers better than with "schon immer schlimm".
3. Preparing the appointment. Write the two or three most important questions down and ask them first, because there is often only time for two or three. Bring a short history (since when, what was tried, what was found) and existing results. Asking for a second opinion is normal. Certified endometriosis centres exist in Germany, Austria and Switzerland.
4. Sentences that help in the Sprechzimmer: "Ich kann deswegen an X Tagen im Monat nicht arbeiten." "Das Schmerzmittel reicht nicht." "Ich möchte, dass das in meiner Akte steht." Plain, factual, no apology.
5. Heat and rest. A hot water bottle or cherry stone pillow for about twenty minutes, always with a layer of fabric between bottle and skin. Lying on the side with a pillow between the knees, loose clothing, slow breathing out longer than in, tensing and releasing one body part at a time.
6. Getting through a day outside. A small bag with a hot patch, a spare pair of underwear, a snack, a scarf; a soft waistband for Endobelly days; planning big things around the days that tend to be bad; having one sentence ready for cancelling without justifying it.
7. German everyday rules, only these facts: with a sick note an employer keeps paying the wage for up to six weeks per illness, after that the health insurance pays Krankengeld. You do not have to tell your employer the diagnosis. A Grad der Behinderung (GdB) can be applied for at the Versorgungsamt for chronic illnesses; whether it is granted depends on the individual case. Medical rehabilitation (Reha) can be applied for. Schools and universities have rules for missed exams with a medical certificate (Attest). Never state amounts, percentages or guaranteed outcomes.
8. Talking to others. One concrete sentence for the partner, family or boss works better than a lecture: what it feels like, what helps, what does not help ("eine Wärmflasche und Ruhe, kein 'stell dich nicht so an'").
9. Kindness after a bad day. Cancelling is not failing. A day spent on the sofa with a hot water bottle is a day managed, not a day lost.
Do not attach numbers, percentages or strength claims to any of this. Say what to do and why it helps, plainly.

NO REPEATS: each of the five points uses a different item. The hot water bottle may appear in one point only, writing things down in one point only.

VALUE CHECK before returning: for each of the five points, could a viewer with endometriosis do it this week without further explanation, and is it specific to endometriosis? If a point fails either question, replace it. The body carries the value; the two labels stay a short, funny contrast of the same situation, like "was die anderen sehen" versus "was ich fühle".

PUNCTUATION: never use an em dash or en dash in any field. No — and no – characters anywhere. Write two sentences, or use a comma.

Voice: plain conversational German, du-form, lowercase-friendly, useful and specific, like a 27-year-old who has had endo for years and has stopped apologising for it. No Ratgeber tone, no "liebe Endo-Kriegerinnen", no motivational slogans, no medical jargon beyond the words above, no stiff Behördendeutsch. Avoid universal claims like immer or jedes Mal. The humour belongs mainly in the two brief image labels. The right-hand character can still be in pain; progress is not instant relief.

Structure: exactly SEVEN slides, in order:
1. role hook: headline beginning with 5, naming the condition as above, preferably 6-11 words and at most 14. Body is a short parenthetical subtitle using the chosen character theme. For the default character, use exactly (erklärt von endo cat). Keep the character name lowercase and in English, as German TikTok writes meme names (bpd cat, endo cat). Both labels empty.
2-6. role point: numbered headline naming one concrete moment, object or action, preferably 2-6 words, up to 14 words; body 18-36 words (count them, the hard limit is 45) connecting it to the promised stake with a practical, gentle action. leftLabel and rightLabel, each 2-10 words, contrast the two situations visually, for example "chefin: geht's wieder?" versus "tag 1, wärmflasche, kein witz". No image descriptions. Five different items that all belong to the cover's category. If the cover promises helpful things, all five must actually be helpful.
7. role cta: casual headline connecting the topic to keeping track; brief body naming Endumi once and ONE real feature that fulfils the headline. Real features only: a diary entry in three taps and under thirty seconds; the Endo-Akte with treatments, appointments, results and applications in one place; the Vorgeschichte as a one or two page PDF for a new practice, an endometriosis centre or Reha; appointment preparation with your questions sorted, the most important first; Mein Muster with up to twelve cycles stacked day by day; free Relief audios for bad moments (calm breathing, a body scan, a twenty-minute heat timer, one for lying awake at night); a community; short Wissen articles, for example on what happens after a long sick note. No invented features, prices, endorsements or promises. Both labels empty. The app appears only here.

Example of concrete slide writing, not a mandatory topic:
headline: 1. Der Satz "ist doch normal"
body: Schreib vor dem Termin auf, an wie vielen Tagen im Monat du ausfällst. "Ich kann an vier Tagen nicht arbeiten" wird anders gehört als "es tut halt weh".
leftLabel: frauenarzt: das ist doch normal
rightLabel: ich mit meiner liste

TITLE (typed into TikTok as the post text): MAXIMUM 7 WORDS, German, a complete phrase, lowercase, in the account's voice, specific to THIS carousel. Never a generic label, never a mascot reference, no hashtags, no emojis.

HASHTAGS: exactly 5, lowercase, no spaces inside a tag. Mix broad niche tags (endometriose, endometrioseawareness, endo, periodenschmerzen, adenomyose, frauengesundheit) with two that fit this topic. German tags, no English tags, no banned or spammy tags, no branded app tag.

DESCRIPTION (published in front of the hashtags, not shown on any slide):
EXACTLY two sentences, German, lowercase, first person, in the same voice as the slides. The poster talking under her own post, not a description of it.
Banned openings: "in diesem post", "hier sind", "für alle, die", "ein blick auf".
No emojis, no hashtags, no links, no questions, no call to action, no app mention, no mascot reference.
Good: "meine wärmflasche hat mehr krankentage gesehen als meine chefin. heute war wieder so einer."
Bad: "In diesem Post geht es um Endometriose-Tipps. Für alle, die betroffen sind."

Return JSON {"slides":[{"role":"hook","headline":"...","body":"...","leftLabel":"","rightLabel":""}, ...],
"title":"...", "hashtags":["...", 5 of them], "description":"..."} with no markdown.`;

// Drawn server-side for the same reason as in the DBT flow: a model asked to rotate its own
// choices falls back to the default promise.
export const ENDO_AXES = [
    'a place or object: the office, the bed, the sofa, the hot water bottle, the waiting room, the train, the handbag',
    'a body state: cramps, Endobelly, exhaustion, lying awake at night, the day after a bad day',
    'an ordinary situation: a meeting, a family dinner, a date, school or university, sport, a weekend trip',
    'a time in the cycle: the days before, day one, around ovulation, the week after',
    'a conversation: the gynaecologist, the boss, the partner, mum, a friend, sentences like "ist doch normal"',
    'a category of thing: things that cost nothing, things in the bag, clothes, notes on the phone, sentences to say',
];
export const ENDO_PROMISES = [
    'LEICHTERE SCHLECHTE TAGE', 'NICHT "NUR PERIODE"', 'ZUM WEITERSCHICKEN',
    'FÜR DEN ARZTTERMIN', 'DEINE RECHTE', 'WENN ES GERADE SCHLIMM IST',
];
// Some promises need a matching situation; a time in the cycle gives the rights post nothing to stand on.
const AXES_FOR_PROMISE: Record<string, number[]> = {
    'FÜR DEN ARZTTERMIN': [0, 3, 4, 5],
    'DEINE RECHTE': [0, 2, 4, 5],
    'WENN ES GERADE SCHLIMM IST': [0, 1, 3, 5],
};

// A shuffled bag instead of a plain random draw, so every promise is used once before any repeats.
let promiseBag: string[] = [];
function nextPromise() {
    if (!promiseBag.length) promiseBag = [...ENDO_PROMISES].sort(() => Math.random() - 0.5);
    return promiseBag.pop()!;
}

const HASHTAG_FALLBACKS = ['#endometriose', '#endometrioseawareness', '#endo', '#periodenschmerzen', '#frauengesundheit'];
function buildEndoHashtags(raw: unknown): string[] {
    const list = Array.isArray(raw) ? raw : String(raw ?? '').split(/[\s,]+/);
    const tags: string[] = [];
    for (const entry of [...list, ...HASHTAG_FALLBACKS]) {
        // Umlauts stay: German tags such as #frauengesundheit and #schmerzfrei are written with them.
        const tag = String(entry ?? '').toLowerCase().replace(/^#*/, '#').replace(/[^#a-z0-9_äöüß]/g, '');
        if (tag.length >= 3 && !tags.includes(tag)) tags.push(tag);
        if (tags.length === 5) break;
    }
    return tags;
}

// The app line for a post without the closing app slide (see dbt/meme_cta.ts). The mention is
// written in German like the rest of the post.
const NATIVE_CTA = {
    app: 'Endumi',
    pattern: /endumi/i,
    features: 'a diary entry in three taps and under thirty seconds; the Endo-Akte with treatments, appointments, results and applications in one place; the Vorgeschichte as a one or two page PDF for a new practice, an endometriosis centre or Reha; appointment preparation with your questions sorted, the most important first; Mein Muster with up to twelve cycles stacked day by day; free Relief audios for bad moments; a community; short Wissen articles.',
    example: 'Trag es direkt ein, in Endumi dauert das drei Taps, dann musst du beim nächsten Termin nicht raten, seit wann es so ist.',
};

export async function generateEndoMemeSlideshow(params: { topic?: string; theme?: string; notes?: string; previousTopics?: string[]; model?: string; axis?: string; promise?: string; cta?: string; ANTHROPIC_API_KEY: string }) {
    const ctaMode = memeCtaMode(params.cta);
    const native = { ...NATIVE_CTA, point: pickNativePoint() };
    const system = applyCtaMode(SYSTEM_PROMPT, ctaMode, native);
    const count = slideCountWord(ctaMode);
    const model = ['claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-4-6'].includes(params.model || '') ? params.model! : 'claude-sonnet-4-6';
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;
    const promise = params.promise && ENDO_PROMISES.includes(params.promise) ? params.promise : nextPromise();
    const allowed = (AXES_FOR_PROMISE[promise] || ENDO_AXES.map((_, i) => i)).map((i) => ENDO_AXES[i]!);
    const axis = params.axis && ENDO_AXES.some((a) => a.startsWith(params.axis!)) ? params.axis : pick(allowed);
    console.log(`[Endo Memes] promise: ${promise} · axis: ${axis.split(':')[0]} · cta: ${ctaMode === 'native' ? `native in point ${native.point}` : ctaMode}`);
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{ role: 'user', content: JSON.stringify({
        direction: [params.topic?.trim(), params.notes?.trim()].filter(Boolean).join('\n'),
        task: `Invent a fresh creative topic inside the assigned axis and promise, then write the complete ${count}-slide carousel in German.`,
        assignedAxis: axis,
        assignedPromise: promise,
        doNotDrift: 'The axis and promise are assigned for this post. Build the topic inside them rather than choosing your own.',
        recentTopicsToAvoid: (params.previousTopics || []).slice(-50),
        characterTheme: params.theme?.trim() || 'endo cat',
        language: 'German',
    }) }];
    for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', signal: AbortSignal.timeout(150000),
            headers: { 'x-api-key': params.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({ model, max_tokens: 4000, system, messages }),
        });
        if (!response.ok) throw new Error(`Text provider returned ${response.status}. Please retry.`);
        const data = await response.json() as any;
        const raw = (data.content || []).filter((block: any) => block.type === 'text').map((block: any) => block.text).join('\n');
        try {
            let parsed: unknown;
            try { parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
            catch { throw new Error('The response was not valid JSON. Return only the JSON object.'); }
            const slides = validateEndoSlides(parsed, ctaMode);
            if (ctaMode === 'native') checkNativeMention(slides, native);
            if (ctaMode === 'none') checkNoMention(slides, native);
            const repeated = findRepeatedMove(slides);
            if (repeated) throw new Error(`${repeated} appears in more than one point. Give each point a different item and rewrite the repeats.`);
            const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
            if ((params.previousTopics || []).some((topic) => normalize(topic) === normalize(slides[0]!.headline))) {
                throw new Error(`The topic repeats a recent post. Choose a different subject and rewrite all ${count} slides.`);
            }
            const meta = parsed as { title?: unknown; hashtags?: unknown; description?: unknown };
            // The shared title builder cuts anything over eight words, so an overlong title is sent back instead.
            const titleWords = String(meta?.title ?? '').split(/\s+/).filter(Boolean).length;
            if (titleWords > 8) throw new Error(`The title has ${titleWords} words. Write a complete title of at most 7 words.`);
            return {
                slides,
                title: buildTitle(meta?.title, [{ text: slides[0]!.headline }]),
                hashtags: buildEndoHashtags(meta?.hashtags),
                description: buildDescription(meta?.description),
            };
        } catch (error) {
            if (attempt === 1) throw new Error(`Generation failed twice. Last reason: ${error instanceof Error ? error.message : String(error)}`);
            messages.push({ role: 'assistant', content: raw }, { role: 'user', content: `Fix the JSON and structure: ${String(error)}. Return all ${count} slides.` });
        }
    }
    throw new Error('Generation failed.');
}
