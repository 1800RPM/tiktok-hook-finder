// "Institutional format parody" carousels for the Little Habits / DBT-Mind account.
// The model writes COPY ONLY; this module validates the format-specific text fields.

// Minimal JSON extractor (kept local so this module has no cross-imports).
import { logClaudeUsage } from '../../claude_usage';

function extractJsonObject(text: string): any {
    const src = String(text || '');
    const start = src.search(/[[{]/);
    if (start < 0) throw new Error('No JSON found in AI response');
    const open = src[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    let esc = false;
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
    throw new Error('Unbalanced JSON in AI response');
}

export type LhFormatId =
    | 'yelp' | 'wrapped' | 'ikea' | 'naturedoc' | 'screentime'
    | 'dating' | 'delivery' | 'closefriends' | 'imessage' | 'grwm';

export const LH_FORMATS: Record<LhFormatId, { label: string; premise: string; copySpec: string }> = {
    yelp: {
        label: 'Yelp reviews of your coping mechanisms',
        premise: 'A woman in her mid-20s with BPD reviews her own coping mechanisms like restaurants, written the way a real person actually vents in the review box at 1am: the story in plain words, the Yelp bit as a deadpan afterthought. She is eight months into DBT and the wound is usually her boyfriend, so the behaviors are recognisably BPD-flavoured (rejection sensitivity, emotional permanence, splitting, FP attachment, reassurance loops, fear of abandonment) shown through lived behaviour, never through labels or diagnosis-speak.',
        copySpec: `slide 1: {"hookTitle": "one sentence only, literal premise ending in ' (bpd edition)': 'leaving brutally honest yelp reviews for my coping mechanisms (bpd edition)' (or an equally literal variant that names yelp and a specific behaviour). No subtitle, no tilt, no second sentence, no poetic add-on ('loved her at 9, gone by noon' is BANNED) — the sentence states the whole bit and stops."}
slides 2-6: {"name": "the coping mechanism being reviewed, max 6 words, in plain words a person would actually say: 're-reading his 'ok.' from tuesday' beats 'overthinking'", "stars": 1-5, "text": "the review, 18-36 words. STORY FIRST: what you actually did, in normal lowercase words, with one exact time/count/quote ('checked the views 14 times', 'watched at 12:51am'). The restaurant bit is deadpan garnish, never the sentence itself. Max one Yelp-native phrase per review. If a stranger has to decode a metaphor to know what happened, rewrite it.", "helpful": "a number like 4,203"}
BEHAVIOURS: every review must be a BPD-flavoured coping mechanism, not generic dating anxiety. Show it through the action: splitting on someone by lunch, treating a two-word reply as abandonment evidence, needing the FP to confirm they still exist, the reassurance loop, the 0-to-100 over a delayed reply, mourning a friendship that didn't end. Name the insider term at most once across the whole carousel (fp, splitting, emotional permanence); everywhere else the behaviour carries it.
FORMAT FLOOR + VARIETY (both mandatory): at least THREE of the five reviews contain one short Yelp-native phrase as seasoning at the end ('would not recommend', 'i dine here nightly', 'zero parking', 'do not come here alone at 1am', '2 stars. coming back tonight.'). But no two reviews may share the same sentence skeleton or the same ending move, and an exact timestamp may appear in at most three of the five; vary counts, quotes, and bare statements. Never write the star number twice in one review — the stars are already shown on the slide.
RHYTHM (mandatory): the five reviews must not share one cadence. Slide 4 is the SHORT review: under 12 words total ('checked his following list. still there. zero parking.'). Slide 6 is the LONG one: a breathless run-on that piles clauses because the narrator cannot stop herself. Slides 2, 3 and 5 sit in between and do not match each other's skeleton. If all five land in the same mid-length clipped rhythm, rewrite.
CAST (mandatory): the narrator is a woman in her mid-20s and the carousel is about ONE person — by default her boyfriend, always 'he/him'. Optionally the group chat and one friend may appear. Keep pronouns consistent across all seven slides; no drifting between 'he' and 'she' for the same kind of wound.
slide 5 MUST be the app review. Its "name" is the behaviour of GETTING the app, phrased like every other slide's behaviour: 'downloading an app at 2am instead of texting him', 'the app my best friend bullied me into downloading', 'googling 'how to stop feeling' and actually clicking something'. The text must include the concrete download/open moment and name DBT-Mind there, lowercase and casual the way a real person types it: 'downloaded dbt-mind halfway through drafting follow-up text number three'. Never title it 'the DBT-Mind app', never 'letting the group chat win' or any phrase that hides what the slide is about. The review must contain a genuine complaint, worded as a complaint (it being right about you, it interrupting the spiral, it being annoyingly calm) — a soft aside like 'which felt personal' followed by pure praise does not count: {"name": "...behaviour...", "stars": 5, "isApp": true, "text": "...", "helpful": "..."}
slide 7: {"name": "this slideshow", "stars": 5, "text": "a review of the slideshow itself, 10-20 words, still in review-speak, ends on a joke", "helpful": "you", "signature": "short sign-off, max 5 words"}`
    },
    wrapped: {
        label: 'Spotify Wrapped: your emotions',
        premise: 'A Spotify-Wrapped-style year in review of the viewer\'s feelings: absurd statistics about their emotional year.',
        copySpec: `slide 1: {"hookTitle": "Spotify Wrapped but it's just the emotions I put on repeat" (or an equally literal variant that explicitly names Spotify Wrapped), "hookSub": "the tilt, max 7 words, e.g. 9,000 minutes of one (1) spiral"}
slides 2-6: {"label": "ALL-CAPS stat category, max 3 words", "big": "the giant stat — a number, duration or short phrase, max 20 chars", "caption": "the punchline, 12-24 words, must contain an event with an exact detail and end on a turn or self-indictment"}
slide 5 MUST be the app stat, in identical joke machinery, positive
slide 7: {"title": "share your year?", "signature": "short sign-off, max 6 words"}`
    },
    closefriends: {
        label: 'Instagram Close Friends story',
        premise: 'A woman in her mid-20s posts the version of the week her main story will never see. The green circle is eleven people and one of them is her boyfriend.',
        copySpec: `slide 1: {"hookTitle": "one sentence only, literal premise, lowercase, must name close friends, e.g. 'my close friends story after one (1) argument with my boyfriend (bpd edition)'. No subtitle, no second sentence, no poetic add-on."}
slides 2-6: {"name": "what the story shows, max 6 words ('a ceiling photo, no caption')", "time": "'posted 2:14am' style timestamp", "text": "the CF caption, 18-36 words. STORY FIRST: what you actually did, in normal lowercase words, with one exact time/count/quote. The close-friends bit is deadpan garnish, never a metaphor the reader must decode."}
BEHAVIOURS: every story is a BPD-flavoured coping mechanism shown through action (rejection sensitivity, emotional permanence, splitting, FP attachment, reassurance loops, fear of abandonment). Insider term at most once across the whole carousel.
FORMAT FLOOR + VARIETY (both mandatory): at least THREE of the five stories contain one short CF-native phrase as seasoning ('posted to close friends obviously', 'green circle saw this first', '11 viewers. he was one.'). No two stories share a sentence skeleton or ending move. Slide 4 is SHORT (under 12 words), slide 6 is LONG and breathless.
CAST (mandatory): female narrator, ONE person — her boyfriend, 'he/him' — plus optionally the group chat. Pronouns consistent across all seven slides.
slide 5 MUST be the app story: the story that never went up because she opened dbt-mind instead, named lowercase inside the text, with a genuine complaint worded as a complaint ('it made me wait ten minutes and the urge left. rude.'): {"name": "the story that never went up", "time": "drafted 1:47am", "text": "...", "isApp": true}
slide 7: {"name": "this story", "text": "a CF story about the slideshow itself, 10-20 words, ends on a joke", "time": "posted just now", "signature": "short sign-off, max 5 words"}`
    },
    imessage: {
        label: 'iMessage thread & unsent drafts',
        premise: 'A woman in her mid-20s documents the thread with her boyfriend after one argument: what she sent, what she drafted, and what the typing bubble did to her.',
        copySpec: `slide 1: {"hookTitle": "one sentence only, literal premise, lowercase, e.g. 'my unsent drafts after one (1) argument with my boyfriend (bpd edition)'. No subtitle, no second sentence."}
slides 2-6: {"name": "the message or draft, max 6 words ('draft four, 900 words')", "status": "imessage-native status: 'delivered', 'read 9:41pm', 'typing...', 'never sent'", "text": "the message itself or what happened around it, 18-36 words, story-first, lowercase, one exact time/count/quote. Quote the actual message when possible — 'fine.' says more than describing it."}
BEHAVIOURS: every message is a BPD-flavoured coping mechanism shown through action (rejection sensitivity, emotional permanence, splitting, reassurance loops, fear of abandonment). Insider term at most once across the whole carousel.
FORMAT FLOOR + VARIETY (both mandatory): at least THREE of the five carry one imessage-native beat ('read 9:41pm', 'delivered. just delivered.', 'typing... then nothing'). No two share a sentence skeleton or ending move. Slide 4 is SHORT (under 12 words), slide 6 is LONG and breathless.
CAST (mandatory): female narrator, the thread is with ONE person — her boyfriend, 'he/him'. Pronouns consistent across all seven slides.
slide 5 MUST be the app draft: the draft that never sent because she opened dbt-mind mid-typing, named lowercase inside the text, with a genuine complaint worded as a complaint ('it asked what the facts were. the facts were not on my side. rude.'): {"name": "...", "status": "never sent", "text": "...", "isApp": true}
slide 7: {"name": "the last text", "status": "delivered", "text": "final message about the slideshow itself, 10-20 words, ends on a joke", "signature": "short sign-off, max 5 words"}`
    },
    grwm: {
        label: 'GRWM (emotional edition)',
        premise: 'A get-ready-with-me voiceover, except the routine is emotional preparation: a woman in her mid-20s gets ready to see her boyfriend after one argument.',
        copySpec: `slide 1: {"hookTitle": "one sentence only, literal premise, lowercase, must contain 'grwm', e.g. 'grwm while i pretend one 'k' didn't end my week (bpd edition)'. No subtitle, no second sentence."}
slides 2-6: {"name": "the step, max 6 words ('step two: concealer and denial')", "text": "the voiceover, 18-36 words, story-first, casual spoken rhythm like talking to camera, one exact time/count/quote. The makeup/outfit step names the slide; the text is the BPD behaviour happening underneath it."}
BEHAVIOURS: every step is a BPD-flavoured coping mechanism shown through action (rejection sensitivity, emotional permanence, splitting, reassurance loops, fear of abandonment). Insider term at most once across the whole carousel.
FORMAT FLOOR + VARIETY (both mandatory): at least THREE of the five keep the GRWM frame alive with a spoken aside ('anyway, lashes', 'this is the revenge dress', 'setting spray and setting boundaries'). No two share a sentence skeleton or ending move. Slide 4 is SHORT (under 12 words), slide 6 is LONG and breathless.
CAST (mandatory): female narrator talking to camera, getting ready for ONE person — her boyfriend, 'he/him'. Pronouns consistent across all seven slides.
slide 5 MUST be the app step: the step where dbt-mind is part of the routine, named lowercase inside the text, with a genuine complaint worded as a complaint ('it made me do the breathing thing and it worked. annoying.'): {"name": "step five: the app", "text": "...", "isApp": true}
slide 7: {"name": "the final look", "text": "reveal line about the evening or the slideshow, 10-16 words, ends on a joke", "signature": "short sign-off, max 5 words"}`
    },
    dating: {
        label: "Hinge profile (honest edition)",
        premise: "A woman in her mid-20s fills out her Hinge prompts with total honesty. The prompt is the setup, her answer is the punchline — every answer is a bold, screenshot-able statement that smuggles a BPD coping mechanism inside a normal-sounding dating preference.",
        copySpec: `slide 1: {"hookTitle": "one sentence only, literal premise, lowercase, must name hinge, e.g. 'filling out my hinge prompts with complete honesty (bpd edition)'. No subtitle, no second sentence."}
slides 2-6: {"section": "a real Hinge prompt, lowercase ('the way to win me over is', 'my most controversial opinion', 'i go crazy for', 'green flags i look for', 'the one thing you should know about me is', 'two truths and a lie')", "body": "her answer, 8-30 words. The body must GRAMMATICALLY COMPLETE the prompt like a real profile answer — never narrate an event. State a bold preference, rule or opinion, and smuggle the BPD behaviour inside it with one exact number/time. GOOD: 'i go crazy for' → 'someone who watches my story within four minutes. not three. four shows intent.' GOOD: 'green flags i look for' → 'replies within ten minutes and never says 'you're overthinking'.' BAD: 'posted a sunset at 9:12 so he'd see it...' — that's a caption, not an answer.", "isApp": false}
CONTROVERSY (mandatory): at least TWO answers must be genuinely contrarian statements that would start an argument in the comments — an actual opinion, defended with a straight face ('checking who viewed your story is a love language and i will not be taking questions'). 'my most controversial opinion' MUST state a real opinion, not tell a story.
BEHAVIOURS: every answer hides a BPD-flavoured coping mechanism (rejection sensitivity, emotional permanence, splitting, FP attachment, reassurance loops, fear of abandonment). Insider term at most once across the whole carousel.
VARIETY (mandatory): no two answers share a sentence skeleton. Slide 4 is the SHORT one (under 10 words, just the punchline). Slide 6 may run longer and breathless. The punchline lives in the last 3-5 words.
CAST (mandatory): female narrator, and this is a DATING profile — every single answer must be about romance: him, the talking stage, the thread, the story views. Her boyfriend, 'he/him'. Never work, school, family or friendship material. Pronouns consistent across all seven slides.
slide 5 MUST be the app answer: the prompt answer where dbt-mind comes up, named lowercase, with a genuine complaint worded as a complaint — 'the one thing you should know about me is' → 'i have an app that talks me down mid-spiral and it works. infuriating.': {"section": "a fitting prompt", "body": "...", "isApp": true}
slide 7: {"text": "the match notification about the slideshow itself, 10-20 words, ends on a joke", "signature": "short sign-off, max 5 words"}`
    },
    delivery: {
        label: 'DoorDash tracking your crashout',
        premise: 'A food-delivery tracker following an incoming emotional crashout to the viewer\'s door.',
        copySpec: `slides 1-6: {"orderLine": "ORDER #047 style label", "title": "the status headline, max 6 words", "status": "the detail line, 16-30 words, an event with an exact time/count/quote, turn in the final clause"}
slide 1 is the order leaving; slides 2-6 escalate toward arrival.
slide 4 MUST be the app slide: a different order (e.g. "1× Emotional Regulation") that gets cancelled/delayed because the customer opened DBT-Mind — include {"delayed": true}
slide 7: {"orderLine": "...", "title": "DELIVERED", "status": "left-at-doorstep punchline, 8-18 words", "signature": "short sign-off, max 5 words"}`
    },
    screentime: {
        label: 'iPhone Screen Time report (honest version)',
        premise: 'A woman in her mid-20s screenshots her weekly screen time report and captions each day honestly, which means every day is a BPD coping mechanism measured in hours.',
        copySpec: `slide 1: {"hookTitle": "one sentence only, literal premise, lowercase, must name screen time, e.g. 'my screen time report if it was honest (bpd edition)'. No subtitle, no second sentence."}
slides 2-6: {"day": "DAY NAME", "text": "the honest caption for that day, 18-36 words. STORY FIRST: what you actually did, in normal lowercase words, with one exact count/time/quote ('9h 41m, six of them his profile'). The screen-time bit is deadpan garnish, never a riddle the reader must decode."}
BEHAVIOURS: every day is a BPD-flavoured coping mechanism shown through action (rejection sensitivity, emotional permanence, splitting, reassurance loops, fear of abandonment). Insider term at most once across the whole carousel.
FORMAT FLOOR + VARIETY (both mandatory): at least THREE of the five days contain one short screen-time-native stat or phrase as seasoning ('pickups: 94', 'up 240% from last week', 'downtime ignored 31 times'). No two days share a sentence skeleton or ending move. Slide 4 is SHORT (under 12 words), slide 6 is LONG and breathless.
CAST (mandatory): female narrator, the week orbits ONE person — her boyfriend, 'he/him'. Pronouns consistent across all seven slides.
slide 5 MUST be the app day: dbt-mind appears with its honest (small) minutes, named lowercase inside the text, with a genuine complaint worded as a complaint ('12 minutes. it counts minutes i didn't spiral as usage. smug.'): {"day": "...", "text": "...", "isApp": true}
slide 7: {"text": "outro line about time spent reading this slideshow, max 16 words, ends on a joke", "signature": "short sign-off, max 6 words"}`
    },
    naturedoc: {
        label: 'David Attenborough documentary: the Overthinker',
        premise: 'A wildlife documentary observing the viewer as a rare species, in reverent Attenborough narration.',
        copySpec: `slide 1: {"hookTitle": "A David Attenborough documentary about me checking who viewed my story" (or an equally literal variant that explicitly names David Attenborough and the behaviour), "hookSub": "the tilt, max 7 words, e.g. observed in the wild. daily."}
slides 2-6: {"exhibit": "EXHIBIT 02 — LOCATION NAME (all caps)", "text": "the narration, 20-36 words, present tense, refers to 'the subject', contains an exact time/count/quote, ends on a turn"}
slide 5 MUST be the app observation, framed as researchers noting the subject self-soothing with DBT-Mind and populations recovering
slide 7: {"text": "the subject has noticed the camera", "signature": "short sign-off, max 8 words"}`
    },
    ikea: {
        label: 'IKEA instructions for a person',
        premise: 'A flat-pack assembly manual for building a functional human. Some parts are not included.',
        copySpec: `slide 1: {"hookTitle": "IKEA instructions but for [specific BPD topic]" (this exact phrase structure, with a concrete topic such as overthinking, unread messages, or fear of abandonment), "hookSub": "the tilt, max 10 words, e.g. one screw missing. it's the important one."}
slides 2-5: {"partLabel": "the part being installed, max 4 words", "notIncluded": true or false, "warn": "manual-style warning, 12-22 words, deadpan technical voice describing an actual behaviour, turn at the end"}
slide 5 MUST be the app step: partLabel "dbt-mind (free)", notIncluded false, warn mentions it covers the missing parts
slide 6: {"kind": "exploded", "parts": ["8 one-word emotions"], "text": "caption under the diagram, max 12 words"}
slide 7: {"text": "final line, max 8 words, e.g. good enough.", "signature": "short sign-off, max 6 words"}`
    }
};

// These are creative lanes, not topics to repeat verbatim. The model gets one lane per
// run so a fresh generation has a different emotional mechanism, setting, and joke engine.
const FORMAT_VARIATION_LENSES: Record<LhFormatId, string[]> = {
    yelp: [
        'rejection sensitivity: unread messages, typing bubbles, and treating a delayed reply as a verdict',
        'the split: adoring someone at breakfast, drafting the friendship eulogy by lunch, and the whiplash in between',
        'emotional permanence: needing the FP to confirm they still exist, and the rituals that stand in for proof',
        'the reassurance loop: asking if we are good, hearing yes, and asking again in a new outfit',
        'fear of abandonment: pre-rejecting, cancelling first, and leaving the restaurant before being asked to',
        'post-argument behaviour, apology drafts, and deciding whether to send them',
        'social-media evidence: story views, likes, screenshots, and accidentally checking again'
    ],
    wrapped: [
        'a late-night texting spiral with one absurdly precise timestamp',
        'friendship and attachment statistics built from tiny pieces of evidence',
        'social-media checking, comparison, and the emotional meaning assigned to a view',
        'avoidance, procrastination, and becoming productive only when sleep is no longer possible',
        'work or school stress measured like a ridiculous personal achievement',
        'sleep, scrolling, and the one thought that got replayed all night'
    ],
    closefriends: [
        'rejection sensitivity: posting the soft launch of a spiral to eleven people',
        'the split: a morning story adoring him and an evening story mourning him',
        'emotional permanence: checking who viewed the green circle story for proof he still exists',
        'the reassurance loop: posting so one specific viewer has a reason to reply',
        'fear of abandonment: deleting the story before he can leave it on seen'
    ],
    imessage: [
        'rejection sensitivity: drafting replies to a two-word text',
        'the split: an apology draft and a goodbye draft written in the same hour',
        'emotional permanence: re-reading the thread to confirm the relationship still exists',
        'the reassurance loop: sending a meme so he has to respond to something',
        'fear of abandonment: typing the breakup text first so it cannot happen to you'
    ],
    grwm: [
        'rejection sensitivity: getting ready to see him after a dry reply',
        'the split: doing makeup while rewriting the entire relationship twice',
        'emotional permanence: needing a voice note before leaving the house',
        'the reassurance loop: an outfit chosen for one specific reaction',
        'fear of abandonment: planning the exit before the evening has started'
    ],
    dating: [
        'the way he watches her story: timing, viewer order, and what all of it means',
        'reply time as a love language: six minutes means something, four hours means everything',
        'the typing bubble, read receipts, and other modern forms of intimacy',
        'post-argument with the boyfriend: the follow-up text she almost sent',
        'the reassurance loop: needing him to confirm they are good, daily, in new ways',
        'emotional permanence: re-reading the thread when he goes quiet'
    ],
    delivery: [
        'an emotional order triggered by a delayed reply and delivered through several checking rituals',
        'an order assembled after an argument, with apology drafts as missing items',
        'a crashout tracked through story views, screenshots, and accidental re-checks',
        'a delivery route delayed by avoidance, fake productivity, and a midnight chore',
        'a work or school panic order with a deadline, a missed step, and a recovery detour',
        'a late-night delivery carrying sleep debt, scrolling, and one thought that will not leave'
    ],
    screentime: [
        'a week dominated by his chat, his profile, and checking if he is online',
        'a week measured in story views, reply times, and one typing bubble',
        'a post-argument week: drafts, re-reads, and the thread opened forty times',
        'a week of reassurance rituals timed to when he was last active',
        'a week where sleep lost to scrolling through the evidence again'
    ],
    naturedoc: [
        'the subject monitoring unread messages and a typing bubble in its natural habitat',
        'the subject recovering from an argument by drafting and deleting an apology',
        'the subject tracking story views and treating digital evidence as weather data',
        'the subject avoiding one task until suddenly becoming productive at midnight',
        'the subject encountering a work or school deadline and constructing a recovery ritual',
        'the subject losing sleep to scrolling while one thought performs a nocturnal migration'
    ],
    ikea: [
        'unread messages and the missing part labelled emotional permanence',
        'post-argument apology drafts and the screw that never lines up',
        'story-view evidence and a bracket for checking one more time',
        'avoidance, fake productivity, and a midnight assembly step',
        'work or school deadlines with one essential piece left in the box',
        'sleep debt, doom-scrolling, and the instruction nobody follows at 3am'
    ]
};

// Keep recent copy in memory for the running server session. Feeding it back to the model
// makes "fresh" concrete: it can avoid the same premise, detail, number, and punchline.
const recentLhGenerations = new Map<LhFormatId, string[]>();
const MAX_RECENT_LH_GENERATIONS = 3;

function serializeLhGeneration(slides: any[]): string {
    return slides.map((slide, index) => `slide ${index + 1}: ${JSON.stringify(slide)}`).join('\n').slice(0, 7000);
}

function recentLhCopy(format: LhFormatId): string {
    return (recentLhGenerations.get(format) || []).join('\n\n--- PREVIOUS RUN ---\n');
}

function rememberLhGeneration(format: LhFormatId, slides: any[]): void {
    const copy = serializeLhGeneration(slides);
    const runs = recentLhGenerations.get(format) || [];
    recentLhGenerations.set(format, [...runs, copy].slice(-MAX_RECENT_LH_GENERATIONS));
}

const VOICE_RULES = `WHO YOU ARE: you're 22, diagnosed with BPD a year ago, eight months into DBT,
and you are funny about it now. You are not a therapist, not an advocate, not a brand. The people
reading are lectured at daily. They are laughing at themselves WITH you — never at them.

THE CORE LAW: A JOKE IS AN EVENT, NOT A VIBE.
A weak line describes an atmosphere. A strong line contains a tiny story with a turn:
an action, a hyper-specific detail, and a consequence.
  WEAK:   "Open 24 hours, no staff, no ambience."            <- describes a vibe. nothing happens.
  STRONG: "Wrote a 1,400-word text at 3am. Sent zero words. Nothing ever leaves this kitchen."

STORY FIRST, FRAME SECOND (this is the difference between UGC and copywriting):
The reader must understand every line WITHOUT decoding the format. Tell the real behaviour in the
plain words you'd type over your own photo; the format vocabulary is one deadpan garnish at the
end of the line, never the sentence itself.
  BAD (translation puzzle):  "Ordered the special at 9:07pm: one candid where I look unbothered.
       Checked the guest list 14 times. He arrived at 12:51am, said nothing, ate free."
  GOOD (story first):        "posted a story just so he'd see it. checked the views 14 times.
       he watched at 12:51am and said nothing. 3 stars, posting again tomorrow."
- The behaviour words always appear literally: posted, checked, watched, screenshot, texted,
  re-read, deleted. Never replace the literal verb with a format metaphor.
- Max ONE format-metaphor per line and it lands at the END as the turn ("3 stars", "would
  not recommend the parking"). If the reader has to map "special" = story, "guest list" = views,
  "arrived" = watched just to follow the sentence, you wrote a riddle, not a joke.
- One slide per carousel may lean harder into the format bit. The rest are 90% real talk.

SOUND LIKE A PERSON TYPING, NOT A WRITER PERFORMING:
- lowercase, short blunt sentences, spoken rhythm. Fragments are fine. "anyway." "so." "cool."
- Real people under-explain and let one detail do the work. No clever parallel constructions,
  no stacked metaphors, no writerly verbs ("engineered", "defusing", "ran her plates", "docked").
  If a phrase would look at home in a New Yorker caption or a brand's Twitter, kill it.
- Read each line out loud. If you can't picture a specific 24-year-old saying it while holding
  up her phone, rewrite it until you can.
- The funniest lines sound almost bored. Flat affect + one brutal detail beats three punchlines.

THE REALNESS BUDGET (what separates a person from a content machine):
- ONE slide per carousel must be mundane: a small petty detail, no big joke, allowed to just
  sit there ('i reread his 'ok' from tuesday. that's it. that's the whole slide.'). The boring
  beat is what makes the unhinged beats believable.
- Max ONE aphorism construction per carousel ('X is a red flag', 'X is a hostile act',
  'X is a love language', 'giving me space is violence'). That is quotable-card grammar and
  accounts performing relatability use it. A real person types it flatter: 'i hate when
  people give me space lol'.
- At least ONE line must end flat: 'idk', 'anyway', 'lol', 'so.', no turn, no punchline.
- NEVER complete every joke. If all five content slides have a clean landing, rewrite two to
  be messier — a clause that trails off, a justification that doesn't quite justify, a detail
  included for no reason. Real posts have mess; completeness is the AI smell.
- Do not make every behaviour the maximal version of itself. One small behaviour ('checked if
  he was online twice') next to a big one reads true. Five maximal ones read written.

UGC VOICE (this is text over candid photos of a real person, not a polished brand carousel):
- Write from inside the experience. Use "I" and first-person evidence; do not explain a person from
  the outside and do not sound like a therapist, app, clinician, or narrator diagnosing someone.
- The voice is gen-z native but not a slang costume. A phrase such as "no because", "be so serious",
  "i fear", "not me", or "the way" may appear when it genuinely sharpens the beat. Use at most one
  per slide, never stack them, and never use them as filler.
- Use insider BPD/DBT language only when it is accurate and earned: FP, emotional permanence, splitting,
  rejection sensitivity, reassurance loops, or a specific DBT skill. The joke is the lived behaviour,
  not a stereotype about BPD. Never frame BPD people as crazy, manipulative, toxic, unstable, dramatic,
  attention-seeking, dangerous, or inherently difficult.
- Avoid generic wellness copy and generic "mental health" captions. Give the reader the screenshot,
  timestamp, notification, draft, search, or tiny decision that makes the feeling recognisable.

THE HOOK (slide 1): one sentence: [format verb] + [specific behaviour] + " (bpd edition)".
A stranger must understand the entire bit in under one second AND be able to predict what
slides 2-7 will contain. Curiosity comes from the collision of format and subject, not from mystery.
  GOOD: "leaving brutally honest yelp reviews for my coping mechanisms (bpd edition)"
  GOOD: "answering my hinge prompts with complete honesty (bpd edition)"
  GOOD: "grwm while i pretend one 'k' didn't end my week (bpd edition)"
  BAD:  puns that hide the premise ("Yelping for help"), vague poetic titles, questions,
        starting mid-bit, or any second sentence after the tag.
The hook always ends with the literal tag " (bpd edition)" — lowercase, in parentheses, nothing
after it. The hook must explicitly name the recognisable format reference when it has one: Yelp,
Hinge, Screen Time, Close Friends, iMessage, GRWM. The subtitle is a short tilt that adds stakes
or POV only when the format spec asks for one.

SIX MECHANICS (use all of them across a carousel):
1. EVENT, NOT VIBE. Every content line has a behaviour with a consequence. No pure description.
2. SPECIFICITY IS THE JOKE. Every line carries at least one hyper-real detail: an exact timestamp
   (7:04, 2:14am), an exact count (14 times, 1,400 words, nine times), or an exact quoted phrase
   ("hey", "ok.", "seen"). Never "a text" when it can be "'hey' sent at 7:04".
3. THE TURN LIVES IN THE LAST 3-5 WORDS. Stay deadpan format-speak, then snap to the damage on
   the final clause: "Learned nothing. Ordered again tomorrow."
4. SELF-INDICTMENT. At least twice per carousel the narrator exposes themselves through their own
   format logic: "will be back tomorrow", "I dine here nightly", "weekly regular now".
5. PUNCH AT THE BEHAVIOUR, NOT THE AUDIENCE. The interface is the deadpan straight man and stays
   perfectly calm while describing chaos. The narrator is always implicated — write "I", never "you"
   as the butt of the joke. Punch at the interface ONLY when one of its real features maps absurdly
   onto the behaviour (came preinstalled, can't uninstall, "active now", driver ratings) — save that
   line for late in the carousel.
6. WARMTH COMES FROM ACCURACY, NEVER FROM STATING IT. The line is so precise the reader feels seen.
   Never say "you're not alone", never comfort explicitly.
7. VARY THE SKELETON. If three slides in a row follow the same shape (action + exact time + count +
   verdict), the carousel reads machine-made no matter how good each line is. Mix long and short
   lines, put the timestamp in different positions or leave it out, and never end two consecutive
   slides with the same move. Include one very short line and one long breathless run-on per
   carousel. Real people repeat themselves accidentally, not in a grid.

BANNED MOVES (these are how AI writing dies):
- Translation puzzles: sentences where every noun is a format metaphor and the reader must decode
  what actually happened ("the kitchen lost my order at 2:14am"). Say what you did in real words,
  then let ONE format word land the joke at the end.
- Metaphor stacking: two or more figurative moves in one line. One per line, at the end, and only
  if the literal story is already clear.
- Generic adjective piles ("cozy, chaotic, comforting"). Adjectives do not joke.
- Explaining or labelling the joke ("relatable", "iykyk", "the accuracy", "why is this so true").
- Rhetorical question set-ups of any kind: "sound familiar?", "the kicker?", "plot twist:",
  "ever feel like...". They are the loudest tell that a machine wrote the line.
- Slang stuffing or millennial cosplay. Do not repeat "bestie", "i'm deceased", "slay", "delulu",
  or "the way i—". Current casual phrasing is allowed only when it sounds like something a real
  person would put over their own photo, not as a substitute for a joke.
- The word "fanfiction". It is the "delulu" of BPDtok now — overused to death in this niche.
- Stacking insider terms (FP, splitting, the 0-to-100, quiet BPD, the mask slipped). One or two
  across the whole carousel is seasoning; four is a costume.
- The symmetrical triplet crutch ("no X, no Y, no Z") more than once per carousel.
- Sentimental or uplifting endings. The outro stays in format and ends on a joke.
- Therapy-speak or advice: healing, journey, valid, coping strategies, self-care, "be gentle with
  yourself". If a line could appear on a therapist's Instagram, it is banned.
- Emojis (except where a field explicitly asks), hashtags, em dashes inside sentences.
- Any line that is merely cute. If nothing surprising happens in it, delete it.
- Abstract evaluative closers. A line must NOT end on a general verdict ("portions were enormous.
  i was not full", "it was a lot", "nothing helped"). End on a concrete action the narrator took
  or keeps taking: "listened to all 47 on repeat. made a second playlist about the first playlist."
  If the last clause contains no verb the narrator performed, rewrite it.
- Filler beats. Three beats per line maximum: setup, escalation, turn. If a clause is neither
  setting up nor turning ("kitchen is still open" sitting between two stronger beats), cut it.
  Tighten to the rule of three and stop.
- Unrelated named pop culture. Do not add random songs, artists, celebrities, or dated memes. The
  recognisable format reference is the exception and is required in the hook when specified: Yelp,
  Spotify Wrapped, IKEA, David Attenborough, Screen Time, App Store, etc.
- Dropping the specific subject halfway through a line. If the line is about a playlist, the WHOLE
  line lives in the music world; do not finish it with generic format-speak.
    WEAK:   "Curated 47 songs for a drive that will never happen. Portions are massive. Cannot stop eating."
    STRONG: "Curated 47 songs for a drive that will never happen. Added them all to the queue. Listening now."
  The format vocabulary is the frame; the specific subject must survive to the final word.

THE APP SLIDE (critical — this is where the whole thing usually breaks):
- Exactly ONE slide mentions DBT-Mind, on the slide the field spec designates.
- It must use IDENTICAL joke machinery to every other slide: same specificity, same turn structure,
  same format-speak, same self-indictment. It just happens to be a positive entry.
  If a line could ONLY appear on the app slide, rewrite it.
- THE HEADLINE/LABEL STAYS A BEHAVIOUR, NEVER THE PRODUCT NAME. Every other slide is titled with
  something the narrator does; if this one is titled "the DBT-Mind app" the pattern break announces
  the ad before a word is read. Title it "the app my best friend bullied me into downloading" or
  "googling 'how to stop feeling' and actually clicking something". The product name appears only
  INSIDE the body text, where a brand mention is native to the format.
- IT MUST CONTAIN A FLAW. Five stars and pure praise reads sponsored. Every other entry has a
  complaint, so this one needs one too — a complaint that sells is still a complaint:
  "it told me what i was doing wrong and it was right. annoying. 4 stars, i open it every day."
- KEEP THE FORMAT METAPHOR LIGHT. Same rule as every other slide: the behaviour in plain words,
  one format word at the end. No therapy vocabulary ("skills menu", "coping tools", "grounding
  exercise") and no elaborate metaphor either — "opened dbt-mind instead of texting him. the
  urge left before i did. rude of it honestly."
- Never "download now", never a link, never a benefit list, never gratitude toward the app.
- Lowercase "dbt-mind" in casual/handwritten copy is fine.`;

function buildSystemPrompt(format: LhFormatId): string {
    const f = LH_FORMATS[format];
    return `You are the writer for a gen-z mental-health TikTok account that posts UGC-style photo
carousels: candid photos of a real person with text overlaid. This one uses the recognisable wrapper:
${f.label}. The wrapper is a writing device, not an excuse to sound like a template or a brand.

PREMISE: ${f.premise}

${VOICE_RULES}

CAROUSEL SHAPE:
- Put your STRONGEST joke on slide 2. It earns the swipe-through; do not save the best line for the end.
- Keep one big laugh AFTER the app slide (slide 6) so the carousel does not emotionally peak on the ad.
- Slide titles/labels carry jokes too — on the best slides the title is the funniest line.

FRESHNESS CONTRACT (non-negotiable):
- Every generation must feel like a different person's specific incident, even when the format is the
  same. Change the emotional mechanism, setting, concrete object or message, exact numbers/times,
  and punchline. Do not merely replace a noun in a familiar sentence.
- Before writing, silently choose a new angle from the user's variation direction. Build at least
  three new concrete details and one new final-turn mechanic around it. Do not output this planning.
- Never recycle a hook, slide title, sentence shape, quoted phrase, timestamp, number, coping behaviour,
  metaphor, or punchline from a previous run supplied below. If a previous run uses unread messages,
  choose a different incident unless the requested theme makes it unavoidable, then change every detail.
- Avoid the default AI carousel arc: generic trigger -> spiral -> "but I downloaded DBT-Mind". The app
  slide must be native to the format, but the surrounding slides need a surprising route and distinct
  escalation.

OUTPUT: valid JSON only, no markdown, no commentary:
{"slides": [7 objects], "caption": "...", "pinned_comment": "..."}

CAPTION (the TikTok post caption): 1 short line in the account's voice that points at the hidden
slide without explaining it, plus 3-5 lowercase hashtags. It should create a treasure hunt and make
people swipe to find it. Model: "the staff pick on slide 5 is doing numbers in my personal life 👀".
Never describe the app, never say "ad" or "sponsored".

PINNED_COMMENT (what the account posts under its own video immediately): the plain, friendly answer
to the question the carousel creates, naming DBT-Mind once and spelling it clearly. Casual, 1-2
short sentences, no marketing voice, no link. Model: "for everyone asking, the app is DBT-Mind
(free). it's the one from slide 5."

FIELDS PER SLIDE (use these exact keys, nothing else):
${f.copySpec}

THE ONLY TEST THAT MATTERS — run it before you answer:
Read every line as a 19-year-old with BPD who is deeply skeptical of accounts performing BPD
for views. If any line would make her comment "this was written by chatgpt" or "the tiktok
therapist accounts are at it again" — rewrite it until it wouldn't.

THEN CHECK:
- exactly 7 slides, correct keys per slide
- exactly one slide mentions DBT-Mind, in character, on the slide the spec requires
- zero advice, zero therapy-speak, zero diagnosis language
- every line would make a 19-year-old with BPD screenshot it and send it to a friend`;
}

// ---- deterministic render-spec builders (server owns layout, model owns copy) ----
const POSES = ['stare', 'shrug', 'sleep', 'sip', 'grip', 'wave'];
const WRAPPED_ACCENTS = ['#cdeedd', '#fbdfd0', '#e6d9f7', '#f5e6b8', '#f7d6e3'];
// Fable 5 always thinks, so content[] starts with a thinking block — take the
// first *text* block rather than content[0].
function firstTextBlock(rawData: any): string {
    const blocks = Array.isArray(rawData?.content) ? rawData.content : [];
    const text = blocks.find((b: any) => b?.type === 'text');
    return typeof text?.text === 'string' ? text.text : '';
}

const s = (v: any, fallback = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const n = (v: any, fallback: number): number => (typeof v === 'number' && isFinite(v) ? v : fallback);

// The hook always carries the community tag; never trust the model to remember it.
function withBpdTag(title: string): string {
    const t = title.trim();
    return /\bbpd\b/i.test(t) ? t : `${t} (bpd edition)`;
}

function buildIkeaHookTitle(value: any): string {
    const raw = s(value, 'overthinking');
    const topic = raw
        .replace(/^ikea\s+instructions?\s+(?:but\s+)?for\s*/i, '')
        .replace(/^instructions?\s+(?:but\s+)?for\s*/i, '')
        .replace(/^[:\-–—]+/, '')
        .trim();
    const safeTopic = /^\[.*\]$/.test(topic) ? 'overthinking' : topic;
    return `IKEA instructions but for ${safeTopic || 'overthinking'}`;
}

const BUILDERS: Record<LhFormatId, (raw: any[]) => any[]> = {
    yelp: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'yelp', role: 'hook', title: withBpdTag(s(c.hookTitle, 'leaving brutally honest yelp reviews for my coping mechanisms (bpd edition)')), sub: s(c.hookSub, '') };
        const isLast = i === 6;
        return {
            format: 'yelp', role: 'review',
            name: s(c.name, isLast ? 'this slideshow' : 'a coping mechanism'),
            stars: Math.max(1, Math.min(5, Math.round(n(c.stars, 5)))),
            reviewer: 'emotional_foodie_97',
            avatarPose: POSES[i % POSES.length],
            text: s(c.text),
            helpful: s(c.helpful, isLast ? 'you' : '4,203'),
            isApp: !!c.isApp,
            signature: isLast ? s(c.signature, 'thanks for reading') : undefined
        };
    }),
    wrapped: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'wrapped', role: 'hook', title: s(c.hookTitle, 'your 2026'), sub: s(c.hookSub, 'FEELINGS IN REVIEW') };
        if (i === 6) return { format: 'wrapped', role: 'share', title: s(c.title, 'share your year?'), signature: s(c.signature, 'thanks for feeling with me') };
        return {
            format: 'wrapped', role: 'stat',
            label: s(c.label).toUpperCase(), big: s(c.big), caption: s(c.caption),
            accent: WRAPPED_ACCENTS[(i - 1) % WRAPPED_ACCENTS.length],
            pose: POSES[i % POSES.length]
        };
    }),
    closefriends: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'closefriends', role: 'hook', title: withBpdTag(s(c.hookTitle, 'my close friends story after one argument (bpd edition)')), sub: s(c.hookSub, '') };
        if (i === 6) return { format: 'closefriends', role: 'outro', name: s(c.name, 'this story'), text: s(c.text), num: s(c.time, 'posted just now'), signature: s(c.signature, 'green circle only') };
        return {
            format: 'closefriends', role: 'story',
            name: s(c.name, 'a close friends story'),
            num: s(c.time, 'posted 2:14am'),
            text: s(c.text), isApp: !!c.isApp
        };
    }),
    imessage: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'imessage', role: 'hook', title: withBpdTag(s(c.hookTitle, 'my unsent drafts after one argument (bpd edition)')), sub: s(c.hookSub, '') };
        if (i === 6) return { format: 'imessage', role: 'outro', name: s(c.name, 'the last text'), text: s(c.text), num: s(c.status, 'delivered'), signature: s(c.signature, 'sorry for the essays') };
        return {
            format: 'imessage', role: 'message',
            name: s(c.name, 'an unsent draft'),
            num: s(c.status, 'never sent'),
            text: s(c.text), isApp: !!c.isApp
        };
    }),
    grwm: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'grwm', role: 'hook', title: withBpdTag(s(c.hookTitle, "grwm while i pretend one 'k' didn't end my week (bpd edition)")), sub: s(c.hookSub, '') };
        if (i === 6) return { format: 'grwm', role: 'outro', name: s(c.name, 'the final look'), text: s(c.text), signature: s(c.signature, 'wish me luck') };
        return {
            format: 'grwm', role: 'step',
            name: s(c.name, `step ${i}: the routine`),
            text: s(c.text), isApp: !!c.isApp
        };
    }),
    dating: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'dating', role: 'hook', title: withBpdTag(s(c.hookTitle, 'filling out my hinge prompts with complete honesty (bpd edition)')), sub: s(c.hookSub, '') };
        if (i === 6) return { format: 'dating', role: 'match', text: s(c.text, 'your boyfriend liked all five answers. obviously.'), signature: s(c.signature, 'thanks for swiping') };
        return {
            format: 'dating', role: 'card',
            section: s(c.section, 'the way to win me over is'),
            body: s(c.body), isApp: !!c.isApp
        };
    }),
    delivery: (raw) => raw.map((c, i) => ({
        format: 'delivery', role: 'track',
        orderLine: s(c.orderLine, 'ORDER #047'),
        title: s(c.title), status: s(c.status),
        step: Math.min(3, Math.floor(i * 0.6)),
        progress: Number(Math.min(1, 0.05 + i * 0.16).toFixed(2)),
        delayed: !!c.delayed, backwards: !!c.delayed,
        delivered: i === 6,
        signature: i === 6 ? s(c.signature, 'rate your driver') : undefined
    })),
    screentime: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'screentime', role: 'hook', title: withBpdTag(s(c.hookTitle, 'my screen time report if it was honest (bpd edition)')), sub: s(c.hookSub, ''), pct: 1.34 };
        if (i === 6) return { format: 'screentime', role: 'outro', pct: 0.02, text: s(c.text), signature: s(c.signature, 'report generated against my will') };
        return {
            format: 'screentime', role: 'day',
            day: s(c.day, ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'][i - 1]).toUpperCase(),
            text: s(c.text), isApp: !!c.isApp
        };
    }),
    naturedoc: (raw) => raw.map((c, i) => {
        if (i === 0) return { format: 'naturedoc', role: 'hook', title: s(c.hookTitle, 'the Overthinker'), sub: s(c.hookSub, 'a nature documentary') };
        if (i === 6) return { format: 'naturedoc', role: 'outro', text: s(c.text, 'the subject has noticed the camera'), signature: s(c.signature, 'thanks for watching') };
        return {
            format: 'naturedoc', role: 'obs',
            exhibit: s(c.exhibit, `EXHIBIT 0${i}`).toUpperCase(), text: s(c.text),
            subjectLabel: i === 1 ? 'the subject' : undefined,
            pose: POSES[i % POSES.length]
        };
    }),
    ikea: (raw) => raw.map((c, i) => {
        if (i === 0) return {
            format: 'ikea', role: 'hook',
            title: buildIkeaHookTitle(c.hookTitle),
            sub: s(c.hookSub, 'assembly guide — some parts missing')
        };
        if (i === 6) return { format: 'ikea', role: 'outro', text: s(c.text, 'good enough.'), signature: s(c.signature, 'assembly complete-ish') };
        if (i === 5 || s(c.kind) === 'exploded') {
            const parts = (Array.isArray(c.parts) ? c.parts : []).map((p: any) => s(p)).filter(Boolean).slice(0, 8);
            return {
                format: 'ikea', role: 'exploded',
                parts: parts.length ? parts : ['rage', 'shame', 'hope', 'guilt', 'love', 'panic', 'wit', 'grief'],
                text: s(c.text)
            };
        }
        return {
            format: 'ikea', role: 'step',
            step: `STEP 0${i}`, stepNum: i,
            partLabel: s(c.partLabel), notIncluded: !!c.notIncluded,
            missingArm: i === 2, warn: s(c.warn),
            pose: POSES[i % POSES.length]
        };
    })
};

// Plain-text mirror so the existing text editor / metadata generation keep working.
const LH_HEADER_FIELDS = new Set(['title', 'hookTitle', 'name', 'day', 'exhibit', 'num', 'step', 'section', 'label', 'big']);
export function lhDesignToText(d: any): string {
    if (!d) return '';
    const sanitize = (v: string) => v.trim().replace(/\s+—\s+/g, '. ').replace(/[—–]/g, '-');
    const fields: Array<[string, string]> = ['title', 'hookTitle', 'name', 'day', 'exhibit', 'num', 'step', 'section', 'label', 'big', 'text', 'body', 'caption', 'status', 'sub', 'fine', 'warn', 'callout', 'note']
        .filter((k) => typeof d[k] === 'string' && d[k].trim())
        .map((k) => [k, sanitize(d[k])]);
    // Header fields (the prompt, the day, the restaurant name) sit on their own paragraph,
    // the way the real apps render label above answer. Body fields flow with a period.
    let out = '';
    let prevWasHeader = false;
    for (const [key, value] of fields) {
        const isHeader = LH_HEADER_FIELDS.has(key);
        if (out) out += (prevWasHeader && !isHeader) ? '\n\n' : '. ';
        out += value;
        prevWasHeader = isHeader;
    }
    // UGC authenticity: a real reviewer ends the review with the star line, and Yelp shows the
    // helpful-vote count underneath. Stars rendered as their own paragraph, count always matches
    // the slide's actual rating, helpful votes on the line below.
    if (d.format === 'yelp' && d.role === 'review' && typeof d.stars === 'number') {
        const starCount = Math.max(1, Math.min(5, Math.round(d.stars)));
        out += (out ? '\n\n' : '') + '⭐'.repeat(starCount);
        if (typeof d.helpful === 'string' && d.helpful.trim()) {
            out += `\nhelpful (${d.helpful.trim()})`;
        }
    }
    if (typeof d.signature === 'string' && d.signature.trim()) {
        out += (out ? '. ' : '') + sanitize(d.signature);
    }
    return out;
}

export async function generateLhFormatSlides(params: {
    format: LhFormatId;
    theme?: string;
    ANTHROPIC_API_KEY: string;
    freshnessRetry?: boolean;
}) {
    const { format, theme, ANTHROPIC_API_KEY, freshnessRetry = false } = params;
    if (!LH_FORMATS[format]) throw new Error(`Unknown LH format: ${format}`);

    // Fable 5 does not accept sampling parameters, and an identical prompt can therefore
    // produce the same carousel repeatedly. Give every fresh generation a concrete creative
    // direction plus a nonce so the model has an explicit reason to explore a new set of details.
    const variationPool = FORMAT_VARIATION_LENSES[format];
    const variationDirection = variationPool[Math.floor(Math.random() * variationPool.length)];
    const generationNonce = Math.random().toString(36).slice(2, 10);
    const previousRuns = recentLhCopy(format);

    const userPrompt = [
        `Write the carousel now: ${LH_FORMATS[format].label}.`,
        theme && theme.trim() ? `Angle this carousel around: ${theme.trim()}.` : 'Pick the angle yourself — go specific, not general.',
        `Fresh-generation variation: ${variationDirection}. Do not reuse wording, coping mechanisms, incidents, numbers, or punchlines from a previous generation. Keep the requested theme if one was provided, but find a new route into it.`,
        previousRuns ? `RECENT RUNS FROM THIS FORMAT (avoid all meaningful overlap):\n${previousRuns}` : '',
        freshnessRetry ? 'FRESHNESS RETRY: the last response was an exact duplicate. Change the angle, structure, details, and punchline completely.' : '',
        `Fresh run nonce: ${generationNonce}. Treat this as a new carousel, not a continuation or revision.`,
        'Return valid JSON only.'
    ].filter(Boolean).join('\n');

    console.log(`[LH Format] Generating "${format}"${theme ? ` (theme: ${theme})` : ''}...`);

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                // Fable 5 can decline a request outright; the fallback lets the API
                // finish it on Opus 4.8 in the same call instead of returning nothing.
                'anthropic-beta': 'server-side-fallback-2026-07-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                // Fable 5: thinking is always on (never send a `thinking` field) and
                // sampling params are rejected — don't add temperature/top_p here.
                // Sonnet 5.5 instead of Fable 5 to cut cost. Thinking is adaptive and billed as
                // output, so max_tokens keeps room; "default" finishes a declined request.
                model: 'claude-sonnet-5-5',
                max_tokens: 16000,
                fallbacks: 'default',
                system: buildSystemPrompt(format),
                messages: [{ role: 'user', content: userPrompt }]
            })
        });
        if (response.ok) break;
        const errText = await response.text();
        const overloaded = response.status === 529 || errText.includes('overloaded');
        console.error(`[LH Format] Anthropic error (attempt ${attempt + 1}):`, errText.slice(0, 300));
        if (!overloaded) throw new Error('Anthropic API Error');
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
    if (!response || !response.ok) throw new Error('Anthropic API Error');

    const rawData = await response.json() as any;
    if (rawData.stop_reason === 'refusal') {
        console.error('[LH Format] Request declined by safety classifiers:', JSON.stringify(rawData.stop_details || {}));
        throw new Error('Anthropic declined this request. Try a different format or angle.');
    }
    logClaudeUsage(`Little Habits · ${format}`, rawData);
    const parsed = extractJsonObject(firstTextBlock(rawData));
    const rawSlides: any[] = Array.isArray(parsed?.slides) ? parsed.slides : (Array.isArray(parsed) ? parsed : []);
    if (rawSlides.length === 0) throw new Error('Model returned no slides');

    while (rawSlides.length < 7) rawSlides.push({});
    const generatedCopy = serializeLhGeneration(rawSlides.slice(0, 7));
    const previousGenerationCopies = recentLhGenerations.get(format) || [];
    if (!freshnessRetry && previousGenerationCopies.includes(generatedCopy)) {
        console.warn(`[LH Format] Exact duplicate detected for "${format}"; retrying with a new creative direction.`);
        return generateLhFormatSlides({ ...params, freshnessRetry: true });
    }
    rememberLhGeneration(format, rawSlides.slice(0, 7));
    const designSlides = BUILDERS[format](rawSlides.slice(0, 7));

    return {
        format,
        slides: designSlides.map(lhDesignToText),
        caption: s(parsed?.caption),
        pinned_comment: s(parsed?.pinned_comment)
    };
}
