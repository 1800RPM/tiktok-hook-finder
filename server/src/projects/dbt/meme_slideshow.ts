import { buildDescription, buildHashtags, buildTitle } from './ss_slideshow';

export type MemeSlide = { role: 'hook' | 'point' | 'cta'; headline: string; body: string; leftLabel: string; rightLabel: string };

// Dashes joining clauses are the loudest AI tell in this format. The prompt bans them; this
// rewrites the stragglers so a single stray dash never costs a whole regeneration.
export function stripDashes(text: string) {
    return text.replace(/\s*[–—]\s*/g, ', ').replace(/,\s*([,.!?])/g, '$1').replace(/\s+,/g, ',').trim();
}
export function validateMemeSlides(value: unknown): MemeSlide[] {
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
        if (role === 'hook' && !/\b(?:bpd|dbt)\b/i.test(result.headline)) {
            throw new Error('The topic headline must include the word BPD or DBT. Keep the everyday hook style and rewrite the headline.');
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

VALUE FIRST, HUMOR SECOND. This is a mass-appeal everyday-habits meme carousel for people who want steadier moods and less overwhelming days, including people with BPD. The viewer may know nothing about DBT. Use the other slideshow flows for useful subject knowledge, not their confessional therapy-lesson hook style. Each post covers ONE easy-to-grasp topic with five concrete items.

CREATIVE TOPIC DISCOVERY: Always invent the specific topic yourself before writing the slides. There is no fixed topic menu. Creative means a fresh selection of familiar everyday things, NOT a more obscure psychological insight. Internally brainstorm ten different combinations of an ordinary category/situation and a clear emotional benefit/cost. Choose the one with the broadest instant recognition and five distinct concrete items. Optional user direction guides this exploration. Recent topics are an exclusion list: avoid their underlying angle, not merely their exact wording, even across languages.

FRAMING AXIS: one axis is assigned to this post in the user message. Build the topic inside it. A time or day frame (mornings, evenings, weekends, after work, weekdays, 3am) is never assigned, because it is the frame every writer defaults to and it produced a run of near-identical posts. The assigned axis will be one of these:
- a physical object or place: your phone, the kitchen, the bathroom mirror, your bag, the front door, laundry, the fridge
- a recurring social situation: making plans, group chats, being asked how you are, saying no, seeing someone unexpectedly
- a small repeated decision: what to eat, whether to reply, whether to cancel, what to wear, which task first
- a body or energy state: tired, hungry, overstimulated, restless, running on four hours of sleep
- an ordinary task: errands, chores, admin, appointments, packing, cleaning up
- a category of thing: apps, drinks, sounds, purchases, chores, messages
The axis sets the shape of the hook; the topic is what you invent inside it.

PROMISE: one promise is assigned to this post in the user message, and it is not negotiable.
The axis decides what the post is ABOUT; the promise decides what the viewer GETS. Rotating only
the axis is what produced ten posts in a row that all ended in "makes your BPD day harder or
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
- FOR SOMEONE WHO LOVES THEM: written for a partner, friend or parent of a person with BPD.
  The hook must name that reader, or the post reads as just another post for the same audience
  as all the others: "5 things that actually help when your partner has BPD", "5 things people
  with BPD wish you knew", "5 small things to say when someone you love is spiralling". A hook
  that merely mentions BPD is not enough here.
  This audience is large and badly served, and it is also where this niche goes wrong, so the
  rules are strict: the person with BPD is never the problem to be managed. No "dealing with",
  no "surviving", no warning signs, no walking on eggshells, no advice that amounts to
  monitoring someone. Write concrete things that genuinely help, the way you would tell a
  friend what works, and keep the person with BPD someone worth loving rather than a condition
  to handle. If a point could be read as a complaint about them, cut it.

Whatever the promise, the hook still has to carry the standalone word BPD or DBT as part of its
grammar: "5 things that aren't laziness, they're BPD" works, "5 sentences that stop a spiral"
does not, because the niche word is missing entirely.

REFERENCE HOOK MECHANIC (from a different niche; do not write about testosterone):
"5 things quietly BOOSTING your testosterone (explained by testo cat)"
"4 drinks that DESTROY your T (explained by testo cat)"
"5 things in your kitchen KILLING your T (explained by testo cat)"
"5 HIGH-T habits that cost nothing (explained by testo cat)"
These work because the objects and situations are familiar, the personal stake is obvious, and no prior education is needed. Transfer that simplicity. Do not transfer hormone claims, exaggerated causal certainty, or a hierarchy of healthy/unhealthy people.

HOOK SELECTION RULES:
- Number + familiar things/habits/objects/situations + plain emotional stake. The viewer should care if they merely want their day to feel easier, without studying therapy or identifying with a diagnosis.
- Begin with ordinary life, through the axis you chose above. These are illustrative, not a menu or rotation: what sits on someone's kitchen counter, what they do while scrolling, which messages they leave open, what they carry in their bag, how they answer "how are you". Invent other ordinary situations freely.
- Whatever it promises, the stake has to be plain and personal. Avoid vague self-improvement slogans and promises to cure BPD.
- Rejected direction: "5 things DBT teaches that sound wrong at first", "5 ways BPD progress is easy to miss", "5 truths about radical acceptance". These require interest in therapy concepts before the viewer cares.
- Illustrations of the desired simplicity, NOT options to repeatedly select: "5 everyday habits making BPD days harder", "5 things in your kitchen that make BPD days harder", "5 DBT habits that cost nothing". Invent the actual topic yourself and make the emotional stake clear where needed.
- EVERY topic headline MUST contain the standalone word BPD or DBT, regardless of language. Weave it naturally into the simple everyday hook. A mention only in the subtitle, body, or app name does not count. Keep the subject concrete and broadly relatable; including the niche word must not turn the hook into an abstract therapy lesson.
- Up to two short words may be capitalized for emphasis. Keep the rest easy to read. Strong phrasing is welcome; unsupported claims that a food, drink, or habit causes/cures a disorder are not.
- Before selecting: would an ordinary tired or stressed viewer understand and care in one glance? Can all five items be shown with recognizable cat expressions, actions, or everyday props? Does the hook promise five items rather than five abstract lessons? If any answer is no, choose another angle.

Ground the value in realistic everyday choices and emotional wellbeing. Avoid defaulting to abstract identity, recovery milestones, acceptance lessons, or therapy homework. Never default to unanswered messages, reply speed, favorite-person fixation, generic splitting explainers, or relationship stereotypes. No villain framing. Never imply ordinary experiences diagnose BPD or are unique to BPD. No cure claims, medical mechanisms, guaranteed outcomes, dangerous hacks, fabricated therapist endorsements or invented personal testimonials.

PUNCTUATION: never use an em dash or en dash in any field. No — and no – characters anywhere, not as an aside, not as a pause, not to join clauses. Write two sentences, or use a comma. Dashes in the middle of a sentence are the clearest sign a machine wrote the text.

Voice: plain conversational English, useful and specific. No therapy lecture, motivational slogans, forced metaphors, or theatrical precision. Avoid clinical shorthand such as distorted thoughts, nervous system, dysregulation, cortisol, or emotional hijacking. Describe the observable experience instead. Avoid universal claims like always, every time, or proof that something works. The humor belongs mainly in the two brief image labels. The right-hand character can still be upset. Do not portray distress as moral failure or DBT as instant serenity. Never use jokes about blowing up, being dangerous, or causing relationship damage. Unless the promise is FOR SOMEONE WHO LOVES THEM or the user asks for interpersonal content, at most one point may center arguments or relationship repair. Do not invent a human narrator's diagnosis, therapy history, or app experience. The FOR SOMEONE WHO LOVES THEM promise is the one case where the reader is not assumed to have BPD, so address them directly and never speak about the person with BPD as if they were absent from the room.

Structure: exactly SEVEN slides, in order:
1. role hook: headline beginning with 5, containing the standalone word BPD or DBT, preferably 6–11 words and at most 14. Follow the everyday hook rules above. Body is a short parenthetical subtitle using the chosen character theme. For the default character, use exactly (explained by bpd cat) in English, or (erklärt von bpd cat) in German. Keep the character name bpd cat lowercase. Both labels empty.
2–6. role point: numbered headline naming one concrete habit, item, or action, preferably 2–6 words, up to 14 words; body 20–40 words connecting that ordinary behavior to the promised emotional stake with a practical alternative where useful. leftLabel and rightLabel, each 2–10 words, contrast the habits or situations visually. These can be "one more video" versus "phone on the charger"; they do NOT have to be a mistaken belief versus a therapy reframe. No image descriptions. Five different items that belong to the cover's category. If the cover says evening habits, every point must be an evening habit. If it promises helpful habits, all five must actually be helpful actions, not a list of problems.
7. role cta: casual headline connecting practice to the topic; brief body naming DBT-Mind once and ONE real feature (step-by-step DBT skills library, journaling, guided breathwork, or chain analysis). The feature must fulfill the headline: use journaling for recording progress, the skills library for following instructions. No invented features, prices, endorsements, personal usage claims, or promises. Both labels empty. The app appears only here.

Example of concrete slide writing, not a mandatory topic:
headline: 1. Saying yes before checking
body: You agree to another plan while your week is already full. Look at your calendar before answering so you can leave yourself an evening with nothing booked.
leftLabel: sure, i can fit it in
rightLabel: let me check first
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
export const MEME_AXES = [
    'a physical object or place: the kitchen, the bathroom mirror, your bag, the front door, laundry, the fridge',
    'a recurring social situation: making plans, group chats, being asked how you are, saying no, running into someone',
    'a small repeated decision: what to eat, whether to reply, whether to cancel, what to wear, which task first',
    'a body or energy state: tired, hungry, overstimulated, restless, running on four hours of sleep',
    'an ordinary task: errands, chores, admin, appointments, packing, tidying up',
    'a category of thing: apps, drinks, sounds, purchases, messages, small habits that cost nothing',
];
export const MEME_PROMISES = [
    'EASIER OR HARDER DAY', 'NOT A CHARACTER FLAW', 'SOMETHING TO SEND',
    'A SCRIPT', 'A NEW YARDSTICK', 'FOR SOMEONE WHO LOVES THEM',
];
// Some pairings fight each other. A promise written for a partner cannot be built on "things in
// your fridge": twice in testing that axis pulled the hook back to the usual audience and the
// partner disappeared, while social situations and things-to-say landed it first time. Same for
// a script, which needs a situation to speak into rather than an object to point at.
const AXES_FOR_PROMISE: Record<string, number[]> = {
    'FOR SOMEONE WHO LOVES THEM': [1, 2, 3, 5],
    'A SCRIPT': [1, 2, 3],
};

export async function generateMemeSlideshow(params: { topic?: string; theme?: string; notes?: string; previousTopics?: string[]; language?: string; model?: string; axis?: string; promise?: string; ANTHROPIC_API_KEY: string }) {
    const model = ['claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-4-6'].includes(params.model || '') ? params.model! : 'claude-sonnet-4-6';
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;
    const promise = params.promise && MEME_PROMISES.includes(params.promise) ? params.promise : pick(MEME_PROMISES);
    const allowed = (AXES_FOR_PROMISE[promise] || MEME_AXES.map((_, i) => i)).map((i) => MEME_AXES[i]!);
    const axis = params.axis && MEME_AXES.some((a) => a.startsWith(params.axis!)) ? params.axis : pick(allowed);
    console.log(`[Meme Slideshow] promise: ${promise} · axis: ${axis.split(':')[0]}`);
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{ role: 'user', content: JSON.stringify({
        direction: [params.topic?.trim(), params.notes?.trim()].filter(Boolean).join('\n'),
        task: 'Invent a fresh creative topic inside the assigned axis and promise, then write the complete seven-slide carousel.',
        assignedAxis: axis,
        assignedPromise: promise,
        doNotDrift: 'The axis and promise are assigned for this post. Build the topic inside them rather than choosing your own.',
        recentTopicsToAvoid: (params.previousTopics || []).slice(-50),
        characterTheme: !params.theme?.trim() || params.theme.trim().toLowerCase() === 'cats' ? 'bpd cat' : params.theme.trim(),
        language: params.language === 'de' ? 'Native casual German. All visible copy and labels in German, including the subtitle.' : 'English',
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
            // Parsed separately so a SyntaxError, which can quote the model's own text, never
            // reaches the user. Everything thrown below this point is a message we wrote.
            let parsed: unknown;
            try { parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
            catch { throw new Error('The response was not valid JSON. Return only the JSON object.'); }
            const slides = validateMemeSlides(parsed);
            const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
            if ((params.previousTopics || []).some((topic) => normalize(topic) === normalize(slides[0]!.headline))) {
                throw new Error('The topic repeats a recent post. Choose a different subject and rewrite all seven slides.');
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
            messages.push({ role: 'assistant', content: raw }, { role: 'user', content: `Fix the JSON and structure: ${String(error)}. Return all seven slides.` });
        }
    }
    throw new Error('Generation failed.');
}
