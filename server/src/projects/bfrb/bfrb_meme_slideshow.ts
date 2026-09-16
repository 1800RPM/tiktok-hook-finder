import { stripDashes, type MemeSlide } from '../dbt/meme_slideshow';
import { buildDescription, buildTitle } from '../dbt/ss_slideshow';

// BFRB Ally meme carousels: same seven-slide cat format as the DBT-Mind meme flow, written for
// people who pick their skin, pull their hair or bite their nails. Kept in its own module so the
// DBT prompt, rules and rotation stay exactly as they are.

// The hook has to name the behaviour, otherwise the post never reaches the people it is for.
const NICHE_WORD = /\b(?:skin[\s-]?picking|picking|picker|hair[\s-]?pulling|pulling|nail[\s-]?biting|bfrbs?|dermatillomania|trichotillomania)\b/i;

// One move per post. In testing, "one step back" turned up in two of five points, which reads
// as padding. Matched on headline and body only, where the actual advice lives.
const MOVES: Array<[string, RegExp]> = [
    ['step back from the mirror', /\bstep(?:s|ped|ping)? back\b|\bback (?:one|a) step\b/i],
    ['sitting on your hands', /\bsit(?:ting)? on your hands\b|\bunder your thighs\b/i],
    ['fists', /\bfists?\b/i],
    ['squeezing a pebble or stone', /\bpebble\b|\bstone\b/i],
    ['pressing fingertips together', /\bpress(?:ing)?(?: the)? fingertips\b|\bfingertips (?:of both hands )?together\b/i],
    ['palms on thighs', /\bpalms (?:flat )?on\b/i],
    ['folding your arms', /\bfold(?:ed|ing)? your arms\b|\bcross(?:ed)? your arms\b/i],
    ['hands in pockets', /\bpockets?\b/i],
    ['gripping a pen', /\bpen\b/i],
    ['lotion', /\blotion\b/i],
    ['cold water', /\bcold water\b/i],
    ['clench and release', /\bclench/i],
    ['hands behind your head', /\bbehind your head\b/i],
    ['gloves', /\bgloves?\b/i],
    ['plasters', /\bplasters?\b/i],
    ['tweezers', /\btweezers\b/i],
    ['a fidget', /\bfidget/i],
];
export function findRepeatedMove(slides: MemeSlide[]): string | null {
    const points = slides.filter((slide) => slide.role === 'point');
    for (const [name, pattern] of MOVES) {
        const hits = points.filter((slide) => pattern.test(`${slide.headline} ${slide.body}`)).length;
        if (hits > 1) return name;
    }
    return null;
}

export function validateBfrbSlides(value: unknown): MemeSlide[] {
    const slides = (value as { slides?: unknown })?.slides;
    if (!Array.isArray(slides) || slides.length !== 7) throw new Error('Expected a cover, five points, and a CTA.');
    return slides.map((slide, index) => {
        const role = index === 0 ? 'hook' : index === 6 ? 'cta' : 'point';
        if (!slide || slide.role !== role) throw new Error(`Slide ${index + 1} has the wrong role.`);
        const result = { role } as MemeSlide;
        for (const field of ['headline', 'body', 'leftLabel', 'rightLabel'] as const) {
            if (typeof slide[field] !== 'string') throw new Error(`Slide ${index + 1} is missing ${field}.`);
            result[field] = stripDashes(slide[field]);
        }
        if (!result.headline || !result.body) throw new Error(`Slide ${index + 1} needs a headline and body.`);
        if (role === 'hook' && !NICHE_WORD.test(result.headline)) {
            throw new Error('The topic headline must name the behaviour: skin picking, hair pulling, nail biting or BFRB. Rewrite the headline.');
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

const SYSTEM_PROMPT = `Write text for a BFRB Ally meme photo carousel: white slides, big headlines, short useful explanations, and two transparent reaction images per point. Images come later. Output only the text fields, never image prompts.

WHO THIS IS FOR: people who pick their skin (dermatillomania), pull their hair (trichotillomania) or bite their nails. These are body-focused repetitive behaviours, BFRBs. Most of the audience does it half-automatically: in front of the mirror, in bed, while scrolling, at red lights, during calls. Many only learned recently that it has a name, and most carry a lot of quiet shame about it. The account is new, so every post has to make sense to someone who has never seen it before.

VALUE FIRST, HUMOR SECOND. Each post covers ONE easy-to-grasp topic with five concrete items. The cats make it light; the items make it worth saving. The humour is always with the viewer, never at them: the cat is the viewer's own hands having other plans.

CREATIVE TOPIC DISCOVERY: Always invent the specific topic yourself before writing the slides. There is no fixed topic menu. Creative means a fresh selection of familiar everyday moments, NOT a more obscure psychological insight. Internally brainstorm ten combinations of an ordinary situation and a clear stake, then choose the one with the broadest instant recognition and five distinct concrete items. Optional user direction guides this exploration. Recent topics are an exclusion list: avoid their underlying angle, not merely their exact wording.

FRAMING AXIS: one axis is assigned in the user message. Build the topic inside it. It sets the shape of the hook; the topic is what you invent inside it.

PROMISE: one promise is assigned in the user message, and it is not negotiable. The axis decides what the post is ABOUT; the promise decides what the viewer GETS:
- MORE OR FEWER URGES: small everyday things that make picking, pulling or biting more or less likely. The default, so it is used least.
- NOT A WILLPOWER PROBLEM: things read as gross, lazy or "just stop it" that are how BFRBs work. Lifts self-blame instead of correcting behaviour, which is why people save it.
- SOMETHING TO SEND: written so the viewer can hand it to someone who keeps saying "just stop". The hook makes that obvious: "5 things about skin picking i wish i could explain once". Address the viewer, never the other person.
- SOMETHING FOR YOUR HANDS: concrete things to do with your hands instead, in a named situation. These are competing responses: making fists for sixty seconds, sitting on your hands, squeezing a pebble or stress ball, pressing fingertips together, arms down and one step back from the mirror, a fidget, a textured ring, a hair tie on the wrist to roll. The headline names the situation, the body gives the move.
- A NEW YARDSTICK: what counts as progress when you still pick. Noticing sooner, stopping earlier, a shorter episode, a kinder ten minutes afterwards. Lowers the bar on purpose. Never streaks or "days clean".
- AFTER AN EPISODE: what to do in the ten minutes after, so the episode does not turn into a shame spiral. Gentle, practical, no punishment.

EVERY promise is self-directed: the viewer recognises themselves in the cat and laughs at their own week. The post is never written about someone else who picks.

REFERENCE HOOK MECHANIC (from a different niche; do not write about testosterone):
"5 things quietly BOOSTING your testosterone (explained by testo cat)"
"5 things in your kitchen KILLING your T (explained by testo cat)"
These work because the objects and situations are familiar, the stake is obvious, and no prior education is needed. Transfer that simplicity, not the exaggerated causal certainty.

HOOK SELECTION RULES:
- Number + familiar things, moments, objects or situations + a plain stake. Illustrations of the desired simplicity, NOT a menu: "5 places skin picking waits for you", "5 things that make hair pulling worse at night", "5 things to do with your hands instead of picking", "5 skin picking things that aren't a lack of willpower".
- EVERY topic headline MUST name the behaviour with the standalone words skin picking, hair pulling, nail biting or BFRB, as part of its grammar. "5 bathroom habits that feed skin picking" works; "5 bathroom habits to rethink" does not.
- Skin picking is the widest audience, so it leads most posts. Hair pulling or nail biting can lead a post now and then, or appear alongside.
- Up to two short words may be capitalized for emphasis.
- Before selecting: would a tired viewer who picks recognise this in one glance? Can all five items be shown with cat expressions and everyday props? If not, choose another angle.

SAFETY AND TONE, non-negotiable:
- Never describe skin, wounds, blood, scabs, hair roots or damage in any detail. No gross-out humour, no before/after, no appearance shaming. The joke is the situation, never the body.
- Never tell people to "just stop", never frame it as a bad habit someone chooses, never mention streaks, relapse counts or days clean.
- Never suggest punishing substitutes: no snapping rubber bands, no bitter nail polish as punishment, no pain as a deterrent, no hiding in shame. Covering spots with a plaster or wearing gloves as a gentle barrier is fine.
- No cure claims, no medical mechanisms, no guaranteed outcomes, no invented statistics, no fabricated therapist endorsements or personal testimonials. Do not invent a human narrator's diagnosis or history.

BFRB KNOWLEDGE BASE. Every point must be built on one of these mechanisms, named in plain words, with an action concrete enough to do tonight (a count, a duration, a place, an object). A tip that would help with any kind of stress, like drinking water, going for a walk or putting a podcast on, is not a BFRB tip and does not count.
1. Awareness first (habit reversal training, the best studied approach for BFRBs). Most episodes start before you notice. Early warning signs worth naming: a hand drifting to the face or hair, fingertips scanning skin for bumps, running fingers through hair looking for a "wrong" strand, going still and quiet in front of a mirror, losing track of time. Noticing earlier is progress even if the episode still happens.
2. Two ways it happens. Automatic: hands wander while attention is elsewhere (scrolling, reading, driving, TV, calls). Focused: a deliberate urge to fix, smooth or even something out, often at the mirror, often with tension beforehand and relief after. Automatic episodes need barriers and awareness; focused ones need urge surfing and a replacement.
3. Competing responses. A movement that makes picking, pulling or biting physically impossible, held until the urge drops, usually about a minute. These are the exact ones taught in BFRB Ally, use their wording:
   fists, 60 seconds: curl both hands into loose fists and hold for a slow count of 60.
   sit on your hands: slide both hands under your thighs.
   squeeze a pebble: squeeze a stone, a mug, anything cool and solid.
   arms down, step back: drop your arms, one step back from the mirror, one breath.
   press your fingertips: fingertips of both hands together, firm, for ten slow breaths.
   palms on thighs: both palms flat on your thighs, press down gently.
   fold your arms: cross your arms and tuck your hands against your sides.
   pocket anchor: hands in your pockets, pressed flat against your legs.
   grip a pen: hold a pen along its length, thumb pressing the middle.
   texture swap: run your fingers over a sleeve, a blanket, a different texture.
   lotion ritual: slowly work lotion into both hands.
   cold water on wrists: wrists under cold water for thirty seconds.
   clench and release: squeeze both fists for five seconds, release slowly, five times.
   hands behind your head: interlace your fingers behind your head and lean back.
   count four breaths: one hand on your chest, one on your belly, four slow counted breaths.
   A competing response is not a punishment and not a distraction app; it gives the hands a job for the length of one urge. Placing it where it happens (by the mirror, the bed, the desk) matters more than knowing it.
4. Triggers come in five kinds, useful for sorting a list: senses (a bump you can feel, a split end, a rough cuticle, bright light), thoughts ("it has to be even", "just this one"), feelings (bored, anxious, understimulated, tense, tired), movement habits (hand resting on the chin, twirling hair, nails near the mouth), and places (bathroom mirror, bed, car, desk, sofa).
5. Barriers that make the behaviour slower, not impossible: gloves or finger plasters in the evening, a plaster over a spot, a hat, bandana or tight braid for hair pulling, nails kept short and filed smooth so there is nothing to catch, a magnifying mirror in a drawer, tweezers out of the bathroom, dimmer bathroom light at night, the car visor flipped up.
6. Matching the sensation. Many people pick or pull for a specific feeling. A substitute that gives a similar feeling works better than a random fidget: a textured or spiky fidget ring, a smooth stone, a fabric with a seam, a soft brush over the fingertips, peeling dried glue or a sticker, rolling a hair tie.
7. Urge surfing. An urge rises, peaks and falls, often within a few minutes, if you do not act on it. Name it, notice where you feel it, breathe, wait, and keep your hands in a competing response while it passes.
8. Tracking. A quick note of when, where and what you felt shows a pattern within a week or two, and the pattern tells you where to put the barrier.
9. Repair. Shame after an episode makes the next one more likely. What helps in the ten minutes after: leave the room, gentle care for the skin or scalp without inspecting it further, one kind sentence you would say to a friend, then the next ordinary task. A slip is information about the trigger, not a reset to zero.
Do not attach numbers, percentages or strength claims to any of this ("doubles", "the most reliable", "works every time"). No body mechanics either, such as pores opening, skin getting slippery or how long an episode lasts; the one timing you may state is that an urge usually drops within a minute or a few minutes. Say what to do and why it helps, plainly.

NO REPEATS: each of the five points uses a different move, barrier or substitute. Naming the same one twice (for example stepping back from the mirror in two points, or lotion as both a texture and a ritual) reads as padding. Five points means five distinct things to try.

VALUE CHECK before returning: for each of the five points, could a viewer who picks or pulls do it tonight without further explanation, and is it specific to BFRBs? If a point fails either question, replace it. The body carries the value; the two labels stay a short, funny contrast of the same situation.

PUNCTUATION: never use an em dash or en dash in any field. No — and no – characters anywhere. Write two sentences, or use a comma.

Voice: plain conversational English, lowercase-friendly, useful and specific. No therapy lecture, motivational slogans, forced metaphors or clinical shorthand such as nervous system, dopamine or regulation. Describe the observable moment instead. Avoid universal claims like always or every time. The humour belongs mainly in the two brief image labels. The right-hand character can still be struggling; progress is not instant calm.

Structure: exactly SEVEN slides, in order:
1. role hook: headline beginning with 5, naming the behaviour as above, preferably 6-11 words and at most 14. Body is a short parenthetical subtitle using the chosen character theme. For the default character, use exactly (explained by picker cat). Keep the character name lowercase. Both labels empty.
2-6. role point: numbered headline naming one concrete moment, object or action, preferably 2-6 words, up to 14 words; body 20-38 words (count them, the hard limit is 45) connecting it to the promised stake with a practical, gentle alternative where useful. leftLabel and rightLabel, each 2-10 words, contrast the two situations visually, for example "magnifying mirror at 1am" versus "mirror light off, bed". No image descriptions. Five different items that all belong to the cover's category. If the cover promises helpful things, all five must actually be helpful.
7. role cta: casual headline connecting practice to the topic; brief body naming BFRB Ally once and ONE real feature that fulfils the headline. Real features only: a five-minute urge surfing timer for riding out an urge, a two-tap log without judgment that shows when and where it happens, short guided repair sessions for after an episode, guided paths with competing responses for your hands, Trance Breaker check-ins before your usual risky time, or an anonymous Wave Buddy. No invented features, prices, endorsements or promises. Both labels empty. The app appears only here.

Example of concrete slide writing, not a mandatory topic:
headline: 1. The magnifying mirror
body: A close, bright mirror turns a quick look into twenty minutes. Put it in a drawer, or keep the bathroom light dimmer after dark.
leftLabel: just checking one spot
rightLabel: mirror lives in the drawer now

TITLE (typed into TikTok as the post text): MAXIMUM 7 WORDS, a complete phrase, lowercase, in the account's voice, specific to THIS carousel. Never a generic label, never a mascot reference, no hashtags, no emojis.

HASHTAGS: exactly 5, lowercase, no spaces inside a tag. Mix broad niche tags (skinpicking, dermatillomania, trichotillomania, bfrb, nailbiting) with two that fit this topic. No banned or spammy tags, no branded app tag.

DESCRIPTION (published in front of the hashtags, not shown on any slide):
EXACTLY two sentences, lowercase, first person, in the same voice as the slides. The poster talking under her own post, not a description of it.
Banned openings: "this post is about", "here are", "it's for anyone who", "a look at".
No emojis, no hashtags, no links, no questions, no call to action, no app mention, no mascot reference.
Good: "the bathroom mirror and i are on a break. turns out the light was doing half the work."
Bad: "This post is about skin picking triggers. It's for anyone who struggles with picking."

Return JSON {"slides":[{"role":"hook","headline":"...","body":"...","leftLabel":"","rightLabel":""}, ...],
"title":"...", "hashtags":["...", 5 of them], "description":"..."} with no markdown.`;

// Drawn server-side for the same reason as in the DBT flow: a model asked to rotate its own
// choices falls back to the default promise.
export const BFRB_AXES = [
    'a place or object: the bathroom mirror, the bed, the car at red lights, the desk, the sofa, tweezers, the phone',
    'a body or energy state: bored, tired, stressed, understimulated, restless, zoned out',
    'an ordinary activity your hands wander during: scrolling, watching a show, studying, video calls, reading, waiting',
    'a time of the moment, not the week: right after a shower, the minute before sleep, the pause when you get home',
    'a small repeated decision: whether to look closer, what to do with your hands, whether to turn the light on',
    'a category of thing: fidgets, textures, apps, small barriers, things that cost nothing',
];
export const BFRB_PROMISES = [
    'MORE OR FEWER URGES', 'NOT A WILLPOWER PROBLEM', 'SOMETHING TO SEND',
    'SOMETHING FOR YOUR HANDS', 'A NEW YARDSTICK', 'AFTER AN EPISODE',
];
// Hands need a situation to act in; a category of things does not give them one.
const AXES_FOR_PROMISE: Record<string, number[]> = {
    'SOMETHING FOR YOUR HANDS': [0, 1, 2, 3],
    'AFTER AN EPISODE': [0, 1, 3, 4],
};

// A shuffled bag instead of a plain random draw: in testing, two of three posts in a row drew the
// same promise and came out as near-identical topics. Every promise is used once before any repeats.
let promiseBag: string[] = [];
function nextPromise() {
    if (!promiseBag.length) promiseBag = [...BFRB_PROMISES].sort(() => Math.random() - 0.5);
    return promiseBag.pop()!;
}

const HASHTAG_FALLBACKS = ['#skinpicking', '#dermatillomania', '#bfrb', '#trichotillomania', '#skinpickingdisorder'];
function buildBfrbHashtags(raw: unknown): string[] {
    const list = Array.isArray(raw) ? raw : String(raw ?? '').split(/[\s,]+/);
    const tags: string[] = [];
    for (const entry of [...list, ...HASHTAG_FALLBACKS]) {
        const tag = String(entry ?? '').toLowerCase().replace(/^#*/, '#').replace(/[^#a-z0-9_]/g, '');
        if (tag.length >= 3 && !tags.includes(tag)) tags.push(tag);
        if (tags.length === 5) break;
    }
    return tags;
}

export async function generateBfrbMemeSlideshow(params: { topic?: string; theme?: string; notes?: string; previousTopics?: string[]; model?: string; axis?: string; promise?: string; ANTHROPIC_API_KEY: string }) {
    const model = ['claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-4-6'].includes(params.model || '') ? params.model! : 'claude-sonnet-4-6';
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;
    const promise = params.promise && BFRB_PROMISES.includes(params.promise) ? params.promise : nextPromise();
    const allowed = (AXES_FOR_PROMISE[promise] || BFRB_AXES.map((_, i) => i)).map((i) => BFRB_AXES[i]!);
    const axis = params.axis && BFRB_AXES.some((a) => a.startsWith(params.axis!)) ? params.axis : pick(allowed);
    console.log(`[BFRB Memes] promise: ${promise} · axis: ${axis.split(':')[0]}`);
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{ role: 'user', content: JSON.stringify({
        direction: [params.topic?.trim(), params.notes?.trim()].filter(Boolean).join('\n'),
        task: 'Invent a fresh creative topic inside the assigned axis and promise, then write the complete seven-slide carousel.',
        assignedAxis: axis,
        assignedPromise: promise,
        doNotDrift: 'The axis and promise are assigned for this post. Build the topic inside them rather than choosing your own.',
        recentTopicsToAvoid: (params.previousTopics || []).slice(-50),
        characterTheme: params.theme?.trim() || 'picker cat',
        language: 'English',
    }) }];
    for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', signal: AbortSignal.timeout(150000),
            headers: { 'x-api-key': params.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({ model, max_tokens: 4000, system: SYSTEM_PROMPT, messages }),
        });
        if (!response.ok) throw new Error(`Text provider returned ${response.status}. Please retry.`);
        const data = await response.json() as any;
        const raw = (data.content || []).filter((block: any) => block.type === 'text').map((block: any) => block.text).join('\n');
        try {
            let parsed: unknown;
            try { parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
            catch { throw new Error('The response was not valid JSON. Return only the JSON object.'); }
            const slides = validateBfrbSlides(parsed);
            const repeated = findRepeatedMove(slides);
            if (repeated) throw new Error(`${repeated} appears in more than one point. Give each point a different move and rewrite the repeats.`);
            const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
            if ((params.previousTopics || []).some((topic) => normalize(topic) === normalize(slides[0]!.headline))) {
                throw new Error('The topic repeats a recent post. Choose a different subject and rewrite all seven slides.');
            }
            const meta = parsed as { title?: unknown; hashtags?: unknown; description?: unknown };
            // The shared title builder cuts anything over eight words and can leave a stub like
            // "what to do", so an overlong title is sent back instead of trimmed.
            const titleWords = String(meta?.title ?? '').split(/\s+/).filter(Boolean).length;
            if (titleWords > 8) throw new Error(`The title has ${titleWords} words. Write a complete title of at most 7 words.`);
            return {
                slides,
                title: buildTitle(meta?.title, [{ text: slides[0]!.headline }]),
                hashtags: buildBfrbHashtags(meta?.hashtags),
                description: buildDescription(meta?.description),
            };
        } catch (error) {
            if (attempt === 1) throw new Error(`Generation failed twice. Last reason: ${error instanceof Error ? error.message : String(error)}`);
            messages.push({ role: 'assistant', content: raw }, { role: 'user', content: `Fix the JSON and structure: ${String(error)}. Return all seven slides.` });
        }
    }
    throw new Error('Generation failed.');
}
