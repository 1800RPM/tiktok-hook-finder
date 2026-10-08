import { buildDescription, buildHashtags, buildTitle } from './ss_slideshow';
import { logClaudeUsage } from '../../claude_usage';
import { applyCtaMode, checkNativeMention, checkNoMention, memeCtaMode, pickNativePoint, roleAt, slideCount, slideCountWord, structureError, type MemeCtaMode } from './meme_cta';

export type MemeSlide = { role: 'hook' | 'point' | 'cta'; headline: string; body: string; leftLabel: string; rightLabel: string };

// Dashes joining clauses are the loudest AI tell in this format. The prompt bans them; this
// rewrites the stragglers so a single stray dash never costs a whole regeneration.
export function stripDashes(text: string) {
    return text.replace(/\s*[–—]\s*/g, ', ').replace(/,\s*([,.!?])/g, '$1').replace(/\s+,/g, ',').trim();
}
export function validateMemeSlides(value: unknown, mode: MemeCtaMode = 'slide'): MemeSlide[] {
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
        if (role === 'hook' && !/\b(?:bpd|dbt)\b/i.test(result.headline)) {
            throw new Error('The topic headline must include the word BPD or DBT. Keep the hook style and rewrite the headline.');
        }
        if (role === 'point' && (!result.leftLabel || !result.rightLabel)) throw new Error(`Point ${index} needs both image labels.`);
        if (role !== 'point' && (result.leftLabel || result.rightLabel)) throw new Error('Only points have comparison labels.');
        const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
        if (words(result.headline) > 16 || words(result.body) > 45 || words(result.leftLabel) > 12 || words(result.rightLabel) > 12) {
            throw new Error(`Slide ${index + 1} is too long for the format.`);
        }

        return result;
    });
}

const SYSTEM_PROMPT = `Write text for a DBT-Mind meme photo carousel: white slides, big headlines, short useful explanations, and two transparent reaction images per point. Images come later. Output only the text fields, never image prompts.

RECOGNITION FIRST, HUMOR SECOND, VALUE THIRD. The viewer has BPD and has already seen every BPD meme there is. A post works when she feels CAUGHT: "how do you know i do that", the small embarrassing truth she has felt for years and never heard anyone say out loud. Two of the best-saved posts in this niche work exactly like that: "my biggest red flag is i forget the way people have treated me as soon as they start being nice again" and "nothing hurts more than seeing myself again in the same situation after getting better for a while". Specific, a little uncomfortable, never a textbook symptom. Each post covers ONE such experience with five concrete items, and the bodies still give something practical to do.

CREATIVE TOPIC DISCOVERY: Always invent the specific topic yourself before writing the slides. There is no fixed topic menu. Internally brainstorm ten topics inside the assigned territory, then run the FRESHNESS TEST on each: has a person with BPD already seen this as a meme twenty times? If yes, it is out. Keep only the ones that name a behaviour so specific it makes the viewer slightly embarrassed to recognise it. Choose the strongest, with five distinct concrete items. Optional user direction guides this exploration. Recent topics are an exclusion list: avoid their underlying angle, not merely their exact wording, even across languages.

OVERUSED, never the topic of a post (every BPD account has posted these to death): the dry text, sending or not sending the paragraph, double texting, waiting for a reply, the favorite person, a generic splitting explainer, "emotions from 0 to 100", "i'm fine" when you are not, "BPD is not manipulation", generic emptiness, abandonment explained, "BPD in relationships". Ordinary objects and places (your bag, the fridge, the front door, the kitchen) are also out: nobody recognises herself in a door. Also out as an item: "the laugh that came out wrong", the first idea every writer has for replaying.

TERRITORY: one territory is assigned to this post in the user message. Build the topic inside it. It names an experience; the topic is the specific, fresh angle you find inside it. The examples in a territory describe it, they are NOT your five items: find items of your own that nobody has listed yet. The assigned territory will be one of these:
- forgiving too fast: the moment someone is nice again, everything they did is wiped, and you defend them to your own friends
- rehearsed conversations: FUTURE talks practised in advance, arguments you win, apologies you will give, confessions you will never make. Not replaying the past, that is the cringe hangover
- borrowed personality: picking up the music taste, phrases, opinions or style of whoever you spend the most time with
- bracing after good: the dread when a day, a date or a week goes too well, waiting for it to fall apart
- leaving first: going cold, pulling back or ending things before the other person can, so it hurts less
- invisible effort: how much a normal day costs, reading every face and tone, replaying, masking, and nobody seeing any of it
- evidence keeping: screenshots, rereading old chats, counting who reached out first, collecting proof either way
- the cringe hangover: replaying a tiny social moment for hours or days, long after everyone else forgot it happened

PROMISE: one promise is assigned to this post in the user message, and it is not negotiable.
The territory decides what the post is ABOUT; the promise decides what the viewer GETS. Rotating only
the subject is what produced ten posts in a row that all ended in "makes your BPD day harder or
easier" - the subject changed every time and the payoff never did, which reads as one post
repeated. Six promises, all equally valid:
- EASIER OR HARDER DAY: the everyday cost or relief of a habit. The default, so use it least.
- NOT A CHARACTER FLAW: things read as laziness, drama or attention that are BPD. Lifts
  self-blame instead of correcting behaviour, which is why people save it.
- SOMETHING TO SEND: written so the viewer can hand it to a person who does not get it. The hook
  has to make that obvious, because a post nobody realises is sendable does not get sent:
  "5 things about BPD i wish i could explain once and never again", "5 BPD things that sound
  like excuses and aren't". Address the viewer, never the other person.
- A SCRIPT: actual sentences to say, to yourself or out loud, in a named situation. The five
  headlines are still short labels for the situation, not the sentences themselves, and the
  sentence belongs in the body. The two image captions stay a contrast pair exactly as in every
  other post: what you would have said versus what you say now.
- A NEW YARDSTICK: what counts as progress, a good day, or enough on a bad day. Lowers the bar
  on purpose rather than asking for more effort.
- A HACK: five small, weird, physical moves for the assigned territory, each doable in a minute,
  free, tonight. The hook says the word "hacks" in a shape of your own (not always "weird BPD
  hacks for when..."). Each headline names the move itself in plain words, the body says
  exactly what to do and one plain sentence on why it helps, 30 words at most. The two
  captions are before versus after the hack. The freshness test applies to the hacks too: ice
  cubes, cold water, 5-4-3-2-1, box breathing, journaling, timers, "say it out loud", silly
  voices, "take a walk" and "drink water" are what every account posts, so they are out. Each
  hack uses a different kind of move: one with an object, one with the phone, one with
  another person, one with the body, one with a place. Never credit a therapist or any
  professional: no "my therapist gave me", the cat simply does it.

EVERY promise here is self-directed: the viewer recognises themselves in the cat, and laughs at
their own week. That is what lets this format be light about something heavy. So the post is
never written for someone else about a person with BPD, and the hook is never framed around
another person's behaviour. "5 things to say when someone you love has BPD and cancels plans"
is the shape to avoid: the viewer becomes the person who got it wrong, the cat makes light of
the cancelling, and the person with BPD ends up the punchline rather than the audience. Posts
for partners and family belong in the other slideshow format, not here.

Whatever the promise, the hook still has to carry the standalone word BPD or DBT as part of its
grammar: "5 things that aren't laziness, they're BPD" works, "5 sentences that stop a spiral"
does not, because the niche word is missing entirely.

REFERENCE HOOK MECHANIC (from a different niche; do not write about testosterone):
"5 things quietly BOOSTING your testosterone (explained by testo cat)"
"4 drinks that DESTROY your T (explained by testo cat)"
"5 things in your kitchen KILLING your T (explained by testo cat)"
"5 HIGH-T habits that cost nothing (explained by testo cat)"
These work because the hook reads in one glance and the personal stake is obvious. Transfer that simplicity of the hook, not the objects: here the five items are small behaviours, not things in a kitchen. Do not transfer hormone claims, exaggerated causal certainty, or a hierarchy of healthy/unhealthy people.

HOOK SELECTION RULES:
- Number + one specific, rarely named BPD behaviour + plain stake. One glance should be enough to feel caught.
- These show the level of specificity, they are NOT a menu: "5 things BPD makes you forgive way too fast", "5 conversations your BPD brain already won in the shower", "5 times BPD made you a different person this week", "5 ways BPD makes you leave first so you can't get left".
- The headline NEVER names the character (no "BPD cat", no "cat", no mascot). The subtitle in brackets already introduces it, so naming it in the headline reads twice. Write the headline about "you", "your BPD" or "BPD girls", never about the character. Invent your own inside the assigned territory, and never reuse these.
- Whatever it promises, the stake has to be plain and personal. Avoid vague self-improvement slogans and promises to cure BPD.
- Rejected direction: "5 things DBT teaches that sound wrong at first", "5 ways BPD progress is easy to miss", "5 truths about radical acceptance". These require interest in therapy concepts before the viewer cares.
- EVERY topic headline MUST contain the standalone word BPD or DBT, regardless of language. Weave it naturally into the hook. A mention only in the subtitle, body, or app name does not count.
- Up to two short words may be capitalized for emphasis. Keep the rest easy to read. Strong phrasing is welcome; unsupported claims that a food, drink, or habit causes/cures a disorder are not.
- Before selecting: does it pass the freshness test? Would a viewer with BPD feel a little caught, not lectured? Can all five items be shown with recognizable cat expressions or actions? If any answer is no, choose another angle.

Ground the value in what the viewer can actually do the next time it happens. Avoid abstract identity, recovery milestones, acceptance lessons, or therapy homework. Nothing from the OVERUSED list. No villain framing: the other people in these situations are not the bad guys, and neither is the viewer. Never imply ordinary experiences diagnose BPD or are unique to BPD. No cure claims, medical mechanisms, guaranteed outcomes, dangerous hacks, fabricated therapist endorsements or invented personal testimonials.

PUNCTUATION: never use an em dash or en dash in any field. No — and no – characters anywhere, not as an aside, not as a pause, not to join clauses. Write two sentences, or use a comma. Dashes in the middle of a sentence are the clearest sign a machine wrote the text.

Voice: plain conversational English, useful and specific. No therapy lecture, motivational slogans, forced metaphors, or theatrical precision. Avoid clinical shorthand such as distorted thoughts, nervous system, dysregulation, cortisol, or emotional hijacking. Describe the observable experience instead. Avoid universal claims like always, every time, or proof that something works. The humor belongs mainly in the two brief image labels. The right-hand character can still be upset. Do not portray distress as moral failure or DBT as instant serenity. Never use jokes about blowing up, being dangerous, or causing relationship damage. Unless the user asks for interpersonal content, at most one point may center arguments or relationship repair. Do not invent a human narrator's diagnosis, therapy history, or app experience.

Structure: exactly SEVEN slides, in order:
1. role hook: headline beginning with 5, containing the standalone word BPD or DBT, preferably 6–11 words and at most 14. Follow the hook rules above. Body is a short parenthetical subtitle using the chosen character theme. For the default character, use exactly (explained by bpd cat) in English, or (erklärt von bpd cat) in German. Keep the character name bpd cat lowercase. Both labels empty.
2–6. role point: numbered headline naming one concrete habit, item, or action, preferably 2–6 words, up to 14 words; body 20–40 words connecting that ordinary behavior to the promised emotional stake with a practical alternative where useful. leftLabel and rightLabel, each 2–10 words, contrast the habits or situations visually. These can be "one more video" versus "phone on the charger"; they do NOT have to be a mistaken belief versus a therapy reframe. No image descriptions. Five different items that belong to the cover's category. If the cover says evening habits, every point must be an evening habit. If it promises helpful habits, all five must actually be helpful actions, not a list of problems.
7. role cta: casual headline connecting practice to the topic; brief body naming DBT-Mind once and ONE real feature (step-by-step DBT skills library, journaling, guided breathwork, or chain analysis). The feature must fulfill the headline: use journaling for recording progress, the skills library for following instructions. No invented features, prices, endorsements, personal usage claims, or promises. Both labels empty. The app appears only here.

Example of concrete slide writing, not a mandatory topic:
headline: 1. Defending them to your friends
body: They went cold for a week, sent one sweet message, and now you are explaining why it was fine. Write down what happened while it is happening, so the nice message does not erase it.
leftLabel: he's actually so sweet
rightLabel: reading my own notes
The action should be understandable before the body is read. Let the cats make it funny. Do not turn the explanation into a therapy lecture.

TITLE (what gets typed into TikTok when the post goes up): MAXIMUM 8 WORDS, lowercase, in the
account's voice, specific to THIS carousel. Never a generic label like "bpd things", never a
character or mascot reference, no hashtags, no emojis.

HASHTAGS: exactly 5, lowercase, no spaces inside a tag. Mix broad niche tags with two that fit
this specific topic. No banned or spammy tags, no branded app tag.

DESCRIPTION (published in front of the hashtags, not shown on any slide):
EXACTLY two sentences, lowercase, first person, in the same voice as the slides. This is the
poster talking under her own post, not a description of it: a summary announces and targets,
a caption just says one more true sentence to people who can already see the post.
Banned openings: "this post is about", "here are", "it's for anyone who", "a look at".
No emojis, no hashtags, no links, no questions, no call to action, no app mention, no mascot
or character reference. Not a teaser or a cliffhanger.
Good: "the laundry chair has been a permanent fixture since march. turns out deciding was the
part that was breaking, not the folding."
Bad: "This post is about ordinary chores that get stuck for bpd reasons. It's for anyone with
a four minute task sitting on the list."
The bad one explains the post to someone already looking at it, in a register no one here
writes in.

Return JSON {"slides":[{"role":"hook","headline":"...","body":"...","leftLabel":"","rightLabel":""}, ...],
"title":"...", "hashtags":["...", 5 of them], "description":"..."} with no markdown.`;

// Assigned by the server rather than chosen by the model. Asking it to pick and then police
// its own variety does not hold: across five runs it fell back to the default promise three
// times and repeated a combination twice, because it can see previous headlines but not which
// axis or promise produced them. A draw here makes the rotation real.
// Territories are rarely named BPD experiences, not objects or places. The object axes produced
// "5 signs your front door counts as a BPD win": nobody recognises herself in a door, and the
// usual BPD meme topics (dry text, the paragraph, FP) are banned in the prompt as overused.
export const MEME_AXES = [
    'forgiving too fast: the moment someone is nice again, everything they did is wiped, and you defend them to your own friends',
    'rehearsed conversations: FUTURE talks practised in advance, arguments you win, apologies you will give, confessions you will never make. Not replaying the past, that is the cringe hangover',
    'borrowed personality: picking up the music taste, phrases, opinions or style of whoever you spend the most time with',
    'bracing after good: the dread when a day, a date or a week goes too well, waiting for it to fall apart',
    'leaving first: going cold, pulling back or ending things before the other person can, so it hurts less',
    'invisible effort: how much a normal day costs, reading every face and tone, replaying, masking, and nobody seeing any of it',
    'evidence keeping: screenshots, rereading old chats, counting who reached out first, collecting proof either way',
    'the cringe hangover: replaying a tiny social moment for hours or days, long after everyone else forgot it happened',
];
// Every promise here is self-directed: the viewer sees themselves in the cat, which is what
// lets the format be light about something heavy. A partner-facing promise breaks that, because
// the viewer becomes the person who got it wrong and the laugh lands on someone else's
// behaviour. That audience is real and now lives in the slideshow flow's for_partners
// archetype, where the register is earnest and no cat has to carry the joke.
export const MEME_PROMISES = [
    'EASIER OR HARDER DAY', 'NOT A CHARACTER FLAW', 'SOMETHING TO SEND',
    'A SCRIPT', 'A NEW YARDSTICK', 'A HACK',
];
// Some pairings fight each other. A script needs a moment where something gets said, so it skips
// the territories that are mostly inner experience (borrowed personality, invisible effort).
const AXES_FOR_PROMISE: Record<string, number[]> = {
    'A SCRIPT': [0, 1, 3, 4, 6, 7],
};

// The app line for a post without the closing app slide (see meme_cta.ts).
const DBT_NATIVE = {
    app: 'DBT-Mind',
    pattern: /dbt[\s-]?mind/i,
    features: 'the step-by-step DBT skills library (for following instructions), journaling (for recording what happened or progress), guided breathwork, or chain analysis (for working out what led to a moment).',
    example: 'Write down what happened while it is still happening, the journal in DBT-Mind is made for exactly this, so one sweet message cannot erase it.',
};

export async function generateMemeSlideshow(params: { topic?: string; theme?: string; notes?: string; previousTopics?: string[]; language?: string; model?: string; axis?: string; promise?: string; cta?: string; ANTHROPIC_API_KEY: string }) {
    const ctaMode = memeCtaMode(params.cta);
    const native = { ...DBT_NATIVE, point: pickNativePoint() };
    const system = applyCtaMode(SYSTEM_PROMPT, ctaMode, native);
    const count = slideCountWord(ctaMode);
    const model = ['claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-sonnet-5-5'].includes(params.model || '') ? params.model! : 'claude-sonnet-5-5';
    // Sonnet 5.5 thinks before it answers (adaptive by default), so it needs room beyond the
    // 4000 tokens the copy itself takes, and a decline is finished by a fallback model.
    const sonnet55 = model === 'claude-sonnet-5-5';
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;
    const promise = params.promise && MEME_PROMISES.includes(params.promise) ? params.promise : pick(MEME_PROMISES);
    const allowed = (AXES_FOR_PROMISE[promise] || MEME_AXES.map((_, i) => i)).map((i) => MEME_AXES[i]!);
    const axis = params.axis && MEME_AXES.some((a) => a.startsWith(params.axis!)) ? params.axis : pick(allowed);
    console.log(`[Meme Slideshow] promise: ${promise} · axis: ${axis.split(':')[0]} · cta: ${ctaMode === 'native' ? `native in point ${native.point}` : ctaMode}`);
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{ role: 'user', content: JSON.stringify({
        direction: [params.topic?.trim(), params.notes?.trim()].filter(Boolean).join('\n'),
        task: `Invent a fresh creative topic inside the assigned territory and promise, then write the complete ${count}-slide carousel.`,
        assignedAxis: axis,
        assignedPromise: promise,
        doNotDrift: 'The territory (assignedAxis) and promise are assigned for this post. Build the topic inside them rather than choosing your own.',
        recentTopicsToAvoid: (params.previousTopics || []).slice(-50),
        characterTheme: !params.theme?.trim() || params.theme.trim().toLowerCase() === 'cats' ? 'bpd cat' : params.theme.trim(),
        language: params.language === 'de' ? 'Native casual German. All visible copy and labels in German, including the subtitle.' : 'English',
    }) }];
    for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', signal: AbortSignal.timeout(150000),
            headers: { 'x-api-key': params.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(sonnet55 ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}) },
            body: JSON.stringify({ model, max_tokens: sonnet55 ? 16000 : 4000, system, messages, ...(sonnet55 ? { fallbacks: 'default' } : {}) }),
        });
        if (!response.ok) throw new Error(`Text provider returned ${response.status}. Please retry.`);
        const data = await response.json() as any;
        logClaudeUsage('Meme slides · copy', data, attempt);
        const raw = (data.content || []).filter((block: any) => block.type === 'text').map((block: any) => block.text).join('\n');
        try {
            // Parsed separately so a SyntaxError, which can quote the model's own text, never
            // reaches the user. Everything thrown below this point is a message we wrote.
            let parsed: unknown;
            try { parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
            catch { throw new Error('The response was not valid JSON. Return only the JSON object.'); }
            const slides = validateMemeSlides(parsed, ctaMode);
            if (ctaMode === 'native') checkNativeMention(slides, native);
            if (ctaMode === 'none') checkNoMention(slides, native);
            // The bracket subtitle introduces the character, so a headline naming it too reads
            // twice: "5 conversations BPD cat already won (explained by bpd cat)".
            const character = !params.theme?.trim() || params.theme.trim().toLowerCase() === 'cats' ? 'cat' : params.theme.trim().toLowerCase().replace(/s$/, '');
            const headlineWords = slides[0]!.headline.toLowerCase().split(/[^\p{L}\p{N}]+/u).map((word) => word.replace(/s$/, ''));
            if (headlineWords.includes(character)) {
                throw new Error(`The hook headline names the character ("${character}"), but the subtitle already does. Rewrite the headline about "you" or "your BPD" without the character.`);
            }
            if (promise === 'A HACK' && !/\bhacks?\b/i.test(slides[0]!.headline) && params.language !== 'de') {
                throw new Error('This post is assigned the HACK promise, so the hook headline must say "hacks", e.g. "5 weird BPD hacks for when you start leaving first".');
            }
            const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
            if ((params.previousTopics || []).some((topic) => normalize(topic) === normalize(slides[0]!.headline))) {
                throw new Error(`The topic repeats a recent post. Choose a different subject and rewrite all ${count} slides.`);
            }
            const meta = parsed as { title?: unknown; hashtags?: unknown; description?: unknown };
            return {
                slides,
                title: buildTitle(meta?.title, [{ text: slides[0]!.headline }]),
                hashtags: buildHashtags(meta?.hashtags, params.language === 'de' ? 'de' : 'en'),
                description: buildDescription(meta?.description),
            };
        } catch (error) {
            if (attempt === 1) throw new Error(`Generation failed twice. Last reason: ${error instanceof Error ? error.message : String(error)}`);
            messages.push({ role: 'assistant', content: raw }, { role: 'user', content: `Fix the JSON and structure: ${String(error)}. Return all ${count} slides.` });
        }
    }
    throw new Error('Generation failed.');
}
