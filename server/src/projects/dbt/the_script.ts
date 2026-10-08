// "The Script" slideshows for the DBT-Mind account: 9-slide text carousels that give
// word-for-word scripts for the moments BPD makes wordless (repair after an outburst,
// vulnerability hangover, mid-split pause...). Not advice, not validation, LINES.
//
// Quality control is structural, not hopeful:
// - The model writes COPY ONLY inside a fixed 9-role skeleton with hard word budgets;
//   violations are rejected and retried with the failure reasons spelled out.
// - Three gold examples (posts that defined the format) are inlined few-shot, models
//   imitate register far better than they follow abstract voice rules.
// - The app bridge (slide 9) is a {{APP}} token the server replaces with a line from a
//   curated bank (usage voice, lowercase "dbt-mind"), so the model can never slip into
//   ad-speak or invent feature claims.
// - Left-on-read / unreplied-text is BANNED as the central scenario: it is the most
//   saturated trope in BPDtok and flattens BPD into the "clingy texter" stereotype.

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

export type TsScenarioId =
    | 'morning_after' | 'vulnerability_hangover' | 'mid_split' | 'masking'
    | 'object_permanence' | 'identity_disturbance' | 'canceling_plans'
    | 'group_chat_silence' | 'numb_good_news' | 'social_recovery';

// The underused territory. Left-on-read is deliberately NOT here.
export const TS_SCENARIOS: Record<TsScenarioId, { label: string; hooks: string[]; hooksDe: string[]; spec: string }> = {
    morning_after: {
        label: 'The morning after the outburst',
        hooks: [
            'for the girls who rehearse the apology in the shower the morning after',
            'you said something at midnight you can\'t unsay. here\'s the repair script'
        ],
        hooksDe: [
            'für alle, die am morgen danach die entschuldigung unter der dusche proben',
            'du hast um mitternacht was gesagt, das du nicht zurücknehmen kannst. hier ist das reparatur-skript'
        ],
        spec: `The moment: shame the morning AFTER an outburst, replaying what you said, chest tight,
drafting the apology. The trap: the 400-word paragraph that apologizes for existing, three
follow-ups, a joke to lighten it, then silence while you wait to find out if you're still loved.
Script territory: the short repair text, the in-person redo, the "take whatever time you need"
line for when they need space. The insight: over-apologizing teaches your brain the relationship
survives on your groveling, short repair fixes the thing without self-abandonment.`
    },
    vulnerability_hangover: {
        label: 'The vulnerability hangover',
        hooks: [
            'you told someone your entire life story on the first hangout and now you want to move countries',
            'the vulnerability hangover is real and there\'s a morning-after protocol for it'
        ],
        hooksDe: [
            'du hast beim ersten treffen deine komplette lebensgeschichte erzählt und willst jetzt auswandern',
            'der vulnerability hangover ist real und es gibt ein protokoll für den morgen danach'
        ],
        spec: `The moment: you overshared with someone new, it felt like connection, and now your brain
is generating footage of them judging you. The trap: going silent, convincing yourself they're
gossiping, demoting them from "potential best friend" to "person i avoid at parties". Script
territory: the reality-check line you say to yourself, the follow-up text that names it instead
of retreating, the pacing script that buys you grace next time. The insight: the hangover isn't
caused by oversharing, it's caused by the story you tell yourself after, check the facts.`
    },
    mid_split: {
        label: 'Splitting mid-conversation',
        hooks: [
            'you\'re mid-sentence with your best friend and you can feel yourself starting to hate them',
            'stop being mean to your friends in your head for 90 seconds and read this'
        ],
        hooksDe: [
            'du sitzt mit deiner besten freundin zusammen und spürst, wie du sie gerade anfängst zu hassen',
            'hör auf, deine freunde 90 sekunden lang im kopf fertigzumachen, und lies das hier'
        ],
        spec: `The moment: five minutes ago they were your favorite person, then one slightly off thing
and now every memory is evidence, and you're watching it happen like a nature documentary. The
trap: going cold mid-conversation, one-word answers, letting them feel the temperature drop, then
exploding or leaving. Script territory: the mid-split pause line ("my brain is flipping on you,
give me 20 minutes"), the flooded exit line, the re-entry text with the humor that proves the
split ended. The insight: a split survives on being invisible, narrating it takes the wheel.`
    },
    masking: {
        label: 'Quiet BPD / masking',
        hooks: [
            'if you\'re the chill friend, this one\'s gonna hurt',
            'for the "low maintenance" friends whose insides are running at a 9/10'
        ],
        hooksDe: [
            'wenn du der chillige friend bist, wird das hier wehtun',
            'für die "unkomplizierten" freunde, deren innenleben auf 9 von 10 läuft'
        ],
        spec: `The moment: you're known as the chill one while internally at a 9/10, the mask costs
everything and nobody knows. The trap: white-knuckling through, then crashing alone, then
resenting people for not noticing what you hid from them. Script territory: the "i'm not actually
fine, can i be honest for a second" opener, the low-cost honesty line that doesn't detonate the
mask all at once, the text that asks for company without explaining why. The insight: you don't
have to take the whole mask off, one honest sentence is the skill.`
    },
    object_permanence: {
        label: 'Object permanence (out of sight = gone)',
        hooks: [
            'stop scrolling if someone leaving the room feels like someone leaving your life',
            'my favorite person went on a work trip and my brain held a funeral'
        ],
        hooksDe: [
            'scroll-stopp, wenn sich jemand, der den raum verlässt, anfühlt wie jemand, der dein leben verlässt',
            'meine favorite person ist auf dienstreise und mein gehirn hält gerade ihre beerdigung ab'
        ],
        spec: `The moment: someone leaves, a trip, a busy week, even just the room, and your brain
files them under "gone forever". The trap: either clinging (check-ins that exhaust them) or
pre-grieving (acting like the relationship already ended, picking fights to get it over with).
Script territory: the "my brain does the gone-forever thing, you don't have to fix it" line, the
reconnection text for when they return, the anchor ritual you set up together before they leave.
The insight: the feeling is real and the forecast is wrong, you can say both out loud.`
    },
    identity_disturbance: {
        label: 'Identity disturbance',
        hooks: [
            'for the ones who don\'t know what they like when nobody\'s watching',
            'things i\'ve never said out loud: i practice being a person before people come over'
        ],
        hooksDe: [
            'für alle, die nicht wissen, was sie mögen, wenn niemand zuschaut',
            'sachen, die ich nie laut gesagt hab: ich übe, eine person zu sein, bevor leute vorbeikommen'
        ],
        spec: `The moment: someone asks what you want / like / think and there's nothing there, you've
been mirroring so long you can't find the original. The trap: panicking, picking whatever the
other person likes, then feeling hollow and fake afterward. Script territory: the "i actually
don't know yet, give me a day" line (buying time without shame), the low-stakes preference
declaration ("i'm trying out liking X, no idea if it's mine yet"), the line for when you changed
your mind again. The insight: "i don't know" said out loud is an identity, a placeholder self
beats a borrowed one.`
    },
    canceling_plans: {
        label: 'Canceling plans you wanted',
        hooks: [
            'if you cancel plans you actually wanted to go to, i need 90 seconds of your time',
            'i\'ve lied about why i canceled so many times i have a rotation'
        ],
        hooksDe: [
            'wenn du pläne absagst, auf die du dich eigentlich gefreut hast, brauch ich 90 sekunden von dir',
            'ich hab so oft gelogen, warum ich absage, dass ich inzwischen eine rotation hab'
        ],
        spec: `The moment: you wanted to go, you were excited, and now the day is here and every cell
says cancel, so you invent a migraine. The trap: the lie, the guilt about the lie, then
avoiding the person because the lie is still in the room. Script territory: the honest-cancel
text that doesn't over-explain, the reschedule line that proves it's not them, the "i bailed
because my brain bailed, not because of you" repair for a pattern they've noticed. The insight:
people can hold a canceled plan; what breaks friendships is the weird energy of the cover-up.`
    },
    group_chat_silence: {
        label: 'Too much in the group chat',
        hooks: [
            'for the ones who go silent in the group chat for a week because they felt too much on a tuesday',
            'how i stay in the group chat when everything in me wants to vanish'
        ],
        hooksDe: [
            'für alle, die eine woche im gruppenchat verschwinden, weil ihnen am dienstag alles zu viel war',
            'wie ich im gruppenchat bleibe, obwohl alles in mir abhauen will'
        ],
        spec: `The moment: you sent something into the group chat, the energy felt off (or you decided
it was), and now you can't open the app, a week of silence follows. The trap: waiting for the
shame to fade before re-entering, which takes so long the silence becomes the thing you have to
explain. Script territory: the low-stakes re-entry message (a meme, no apology tour), the "sorry
i went feral, my brain did the thing" one-liner, the script for answering "where'd you go" without
a 4-paragraph confession. The insight: nobody tracked your absence as hard as you did, re-entry
costs one normal message, not a defense statement.`
    },
    numb_good_news: {
        label: 'Numb at good news',
        hooks: [
            'why good news makes me feel nothing (and what i do instead of performing badly)',
            'how i react to good news when i feel absolutely nothing inside'
        ],
        hooksDe: [
            'warum gute nachrichten bei mir gar nichts auslösen (und was ich statt schlechtem schauspiel mache)',
            'wie ich auf gute nachrichten reagiere, wenn ich innerlich komplett nichts fühle'
        ],
        spec: `The moment: something objectively good happens, to you or someone you love, and you
feel nothing, then feel monstrous for feeling nothing, then perform the reaction. The trap:
over-performing to compensate (which feels faker), or going flat and watching them notice.
Script territory: the honest-adjacent line ("i'm so happy for you, i'm just running on empty,
don't read my face"), the follow-up for after ("i felt it later, at 1am, of course"), the
self-talk script that separates "didn't feel it" from "don't care". The insight: delayed emotion
is still emotion, the feeling arriving late doesn't make it counterfeit.`
    },
    social_recovery: {
        label: 'The 3-hour social recovery',
        hooks: [
            'for the ones who need 3 hours to recover from 10 minutes of small talk',
            'how i stop replaying the conversation without cancelling the next one'
        ],
        hooksDe: [
            'für alle, die für 10 minuten smalltalk 3 stunden recovery brauchen',
            'wie ich aufhöre, das gespräch zu replayen, ohne das nächste abzusagen'
        ],
        spec: `The moment: a short social interaction ends and the replay begins, every word audited,
every face re-read, a 10-minute chat costing the whole evening. The trap: concluding you were
weird, resolving to be quieter next time, quietly canceling future plans to avoid the tax.
Script territory: the post-event containment line you say to yourself ("the audit is closed, no
verdict today"), the text to a safe person that reality-tests one specific moment instead of the
whole night, the pre-plans script that builds recovery time in ("i'll come for an hour, leaving
early is my self-care not a statement"). The insight: the replay feels like processing but it's
just punishment with extra steps, you can adjourn it out loud.`
    }
};

const TS_SCENARIO_IDS = Object.keys(TS_SCENARIOS) as TsScenarioId[];

export type TsPovId = 'self' | 'other_side';
export type TsToneId = 'dark_humor' | 'soft';

// Server-owned app bridges (slide 9). Usage voice, never recommendation voice, the app is
// something the narrator DOES, never something she sells. Lowercase "dbt-mind" matches the
// register; the pinned comment carries the "what app?" answer. Rotated per generation.
export const TS_BRIDGES: string[] = [
    'i keep all my scripts saved in dbt-mind so the dysregulated version of me doesn\'t have to improvise',
    'i keep these in dbt-mind because 2am me cannot be trusted to remember a single sentence',
    'the scripts live in dbt-mind now, next to the crisis screen for the nights the words won\'t come at all',
    'i stopped trusting my memory mid-spiral and started keeping the lines in dbt-mind instead',
    'mine live in dbt-mind so future me can just open the app and read'
];

export const TS_BRIDGES_DE: string[] = [
    'ich hab alle meine skripte in dbt-mind gespeichert, damit die dysregulierte version von mir nicht improvisieren muss',
    'die liegen in dbt-mind, weil man dem 2-uhr-nachts-ich keinen einzigen satz zutrauen kann',
    'die skripte wohnen jetzt in dbt-mind, direkt neben dem krisen-screen für die nächte, in denen gar keine worte kommen',
    'ich hab aufgehört, meinem gedächtnis mitten im spiral zu vertrauen, und speicher die sätze jetzt in dbt-mind',
    'meine liegen in dbt-mind, damit zukunfts-ich die app einfach aufmachen und ablesen kann'
];

const TS_GOLD_EXAMPLE_DE = `DEUTSCHES GOLD-BEISPIEL, eine komplette Slideshow auf muttersprachlichem
TikTok-Deutsch. Match FORM, LÄNGE und REGISTER exakt. Übernimm keine Zeile.

BEISPIEL, splitting mid-conversation:
1 (hook): du sitzt mit deiner besten freundin zusammen und spürst, wie du sie gerade anfängst zu hassen
2 (scene): vor fünf minuten war sie noch dein lieblingsmensch. dann droppt sie einen satz, der
leicht daneben ist, und dein kopf klappt sofort die akte auf. jede erinnerung an sie liest sich
plötzlich wie ein beweisstück. du nickst noch, aber innerlich bist du schon raus.
3 (trap): was du normalerweise machst: du wirst von einer sekunde auf die andere eiskalt,
antwortest nur noch mit "hm", sie merkt sofort, dass bei dir die jalousie runtergeht, und dann
explodierst du oder gehst. morgen darfst du alles wieder zusammenkleben.
4 (script): die notbremse, laut und mitten im satz: "ich merk grad, mein kopf dreht gerade gegen
dich und ich trau ihm nicht. gib mir 20 minuten." [fühlt sich bescheuert an, das laut zu sagen.
bescheuerter ist drei stunden funkstille.]
5 (script): wenn du raus musst: "ich bin grad komplett voll und sag sonst noch was, das ich nicht
so meine. ich schreib dir heute abend." [gehen mit ansage ist eine pause. gehen ohne ansage ist
ein drama.]
6 (script): der wiedereinstieg für heute abend: "so, bin wieder da. mein gehirn wollte mir drei
stunden einreden, dass du der bösewicht bist. bist du nicht. sorry fürs abtauchen." [humor ist
hier kein verharmlosen. humor ist der beweis, dass der split vorbei ist.]
7 (why): ein split überlebt nur, solange er unsichtbar bleibt. sobald du ihn laut aussprichst,
verliert er das lenkrad.
8 (2am): mitten im split keine sätze zusammenbekommen? vereinbart vorher ein codewort mit deinen
leuten. du sagst "es flippt" und alle wissen bescheid, ohne dass du irgendwas erklären musst.
9 (bridge): {{APP}}. schick das der freundin, die gerade in ihrer ein-wort-antwort-ära steckt.`;

const TS_GERMAN_BLOCK = `SPRACHE: DEUTSCH (überschreibt alle englischen Output-Regeln oben)
Schreibe die gesamte Slideshow (slides, hooks, title, caption, pinned_comment) auf Deutsch — so
wie deutsche BPD-TikTok-Creator wirklich tippen: lowercase, du-Form, kurze Sätze, natürliche
Anglizismen (cringe, literally, safe, btw, random, mood, fp, splitting, droppen, triggern,
spiralen). KEINE Übersetzung aus dem Englischen. Schreib jede Zeile direkt auf Deutsch, als
WhatsApp-Nachricht an eine Freundin gedacht.

${TS_GOLD_EXAMPLE_DE}

- Die Szenario-Beschreibung und die englischen Gold-Beispiele oben zeigen NUR Struktur und
  Inhalt. Das deutsche Gold-Beispiel zeigt die STIMME. Übernimm keine einzige englische Zeile.
- Die Skript-Zeilen (in Anführungszeichen) müssen wörtlich sendbar sein, genau so, wie man es
  einer Freundin wirklich schreiben würde.
- "what you usually do:" wird auf Deutsch zu "was du normalerweise machst:".
- CAPTION-Vorbild auf Deutsch: "slide 4 hat meine freundschaften durch so manchen morgen getragen"
- PINNED_COMMENT-Vorbild auf Deutsch: "für alle, die fragen: die skripte liegen in DBT-Mind (kostenlos) 🖤"

VERBOTEN, typische Übersetzungs-Fehler (so klingt es, wenn man Englisch ins Deutsche schiebt):
- "dein kopf schneidet ein beweisvideo zusammen" → niemand sagt das. besser: "dein kopf klappt
  sofort die akte auf"
- "du lässt sie die kalte spüren" → übersetztes idiom. besser: "sie merkt sofort, dass bei dir
  die jalousie runtergeht"
- "belastungsmaterial", "eiszeit", "komplett drüber", "temperaturabfall" → gekünstelte bilder,
  die deutsche tiktokler nicht benutzen. besser: "beweisstück", "funkstille", "komplett voll"
- substantiv-ketten im ratgeber-stil ("selbstverletzungsverhalten", "beziehungsdynamik") und
  coach-sprache ("selbstfürsorge", "heilungsweg", "setze grenzen", "kommuniziere deine bedürfnisse")
Faustregel für jede Zeile: würde eine 19-jährige das genau so in ihren chat tippen? wenn nicht,
schreib sie um.

- Die deutsche Rechtschreibung gilt NICHT als Stil-Regel: lowercase ist hier Stimme, kein Fehler.
- Hashtags: mindestens 3 aus #bpd #dbt #bpdtok #borderline #dbtskills #quietbpd #bpdrecovery,
  gerne ergänzt um deutsche wie #mentalegesundheit.
- Das {{APP}}-Token bleibt {{APP}} (der Server ersetzt es), auf Slide 9 NICHT selbst eine App nennen.
- Die Label-Regel bleibt: 2-3 der 20 Hooks nennen das Label (bpd, borderline, quiet bpd, fp),
  der Rest tagged ein Verhalten, nie eine Diagnose.`;

// This is deliberately appended after the broad German rules above. The model sees many
// English examples in the shared format prompt, so these concrete German examples act as the
// final register anchor and prevent literal sentence-by-sentence translation.
const TS_GERMAN_NATIVE_OVERRIDE = `NATIVE-DEUTSCH-PRÃœFUNG, bevor du JSON ausgibst:
- Ãœbersetze keine englische Satzlogik. Denke zuerst in einer echten deutschen Chat-Nachricht
  und schreibe sie dann lowercase auf. Wenn ein Satz wie eine Ãœbersetzung klingt, schreibe ihn
  komplett neu.
- Keine wÃ¶rtlichen Calques oder US-Therapie-Internetdeutsch: "dein mensch", "deine person",
  "was du normalerweise machst", "der Deal fÃ¼r nÃ¤chstes Mal", "die Entschuldigungs-Idee",
  "ich fÃ¼hle mich nicht gesehen" oder "das Nervensystem geht in Panikmodus". Nutze stattdessen
  echte Chat-Wendungen wie "wenn jemand aus dem chat abtaucht", "was dann meistens passiert",
  "fÃ¼r nÃ¤chstes mal", "die nachricht zum wiederreinkommen" und "ich dreh direkt durch".
- Nutze deutsche Verben und feste Wendungen: "abtauchen", "raus sein", "komplett raus",
  "hinterher noch", "direkt denken", "keinen bock haben", "ich dreh durch", "passt schon",
  "bin kurz weg" und "ich meld mich". Anglizismen nur, wenn sie in deutschen TikTok-Chats
  wirklich normal sind. Keine deutschen Substantive an eine englische Satzstruktur kleben.
- Die Textzeilen mÃ¼ssen wie echte Nachrichten klingen, nicht wie Untertitel eines Ratgebers.
  Erlaubt sind kurze, unperfekte Chat-SÃ¤tze. Verboten sind glatte Hochdeutsch-SÃ¤tze, die niemand
  einer Freundin schicken wÃ¼rde.

DEUTSCHE GOLD-BEISPIELE, nur Register und Rhythmus Ã¼bernehmen, niemals kopieren:
- hook: "wenn jemand nach einer nachricht von dir plÃ¶tzlich aus dem gruppenchat abtaucht"
- scene: "dienstag hat sie dir fÃ¼nf nachrichten hintereinander geschickt. mittwoch ist sie weg.
  online, aber nicht im chat. und dein gehirn entscheidet natÃ¼rlich direkt, dass du schuld bist."
- trap: "was dann meistens passiert: du fragst, ob du was komisches gesagt hast, und erklÃ¤rst
  direkt, dass alles okay ist. obwohl literally niemand gesagt hat, dass irgendwas nicht okay ist."
- script: "hey, ich war kurz komplett raus. ist nichts gegen euch, mein kopf war einfach laut."
  [keine entschuldigungsspirale. eine normale nachricht reicht.]
- script: "wenn ich wieder abtauche, schick mir bitte kein verhÃ¶r. ein normales hey reicht."
  [konkret sein ist weniger unangenehm als wieder verschwinden.]
- why: "du musst nicht klingen wie ein therapeutischer podcast. du musst nur sagen, was gerade
  wirklich los ist."

Schreibe nicht "was du normalerweise machst:" als wÃ¶rtliche Ãœbersetzung. WÃ¤hle je nach Kontext
"was dann meistens passiert:", "was du dann oft machst:" oder "und dann machst du das hier:".
Alle zehn Szenariozeilen, alle 20 Hooks, der Titel, die Caption und der Kommentar mÃ¼ssen diesen
deutschen Registertest bestehen. Keine englische Zeile darf im deutschen Output Ã¼brig bleiben.`;

const TS_GERMAN_NATIVE_OVERRIDE_FINAL = `FINAL NATIVE GERMAN CHECK:
Write like a German 22-year-old in a real TikTok chat, not like an English sentence translated into German.
Use lowercase and natural German verbs. Do not use literal calques such as "dein mensch", "deine person",
"was du normalerweise machst", "der Deal fuer naechstes Mal", "die Entschuldigungs-Idee", "your person",
or "what you usually do". Prefer real chat wording such as "wenn jemand aus dem chat abtaucht", "was dann
meistens passiert", "fuer naechstes mal", "die nachricht zum wiederreinkommen", "ich dreh direkt durch",
"ich war kurz komplett raus" and "ein normales hey reicht". Use English slang only when German TikTok users
actually use it, like literally, safe, btw, mood, fp or splitting. Do not glue German nouns to English syntax.

Native German examples for rhythm only, never copy them:
- "wenn jemand nach einer nachricht von dir ploetzlich aus dem gruppenchat abtaucht"
- "dienstag hat sie dir fuenf nachrichten hintereinander geschickt. mittwoch ist sie weg. online, aber
  nicht im chat. und dein gehirn entscheidet natuerlich direkt, dass du schuld bist."
- "was dann meistens passiert: du fragst, ob du was komisches gesagt hast, und erklaerst direkt, dass alles
  okay ist. obwohl literally niemand gesagt hat, dass irgendwas nicht okay ist."
- "hey, ich war kurz komplett raus. ist nichts gegen euch, mein kopf war einfach laut."
- "wenn ich wieder abtauche, schick mir bitte kein verhoer. ein normales hey reicht."

Read every German slide aloud before returning it. If it sounds like subtitles, therapy copy, or a literal
translation, rewrite it. Every slide, all hooks, title, caption and pinned comment must be native German.`;

const TS_POV_SPEC: Record<TsPovId, string> = {
    self: `POV: the narrator HAS BPD and the scripts are what SHE says. Hooks speak to the viewer
as the one living it ("for the girls who...", "you're mid-sentence and...").`,
    other_side: `POV: flip it, the narrator has BPD but is coaching the person who loves someone
with it. Hooks speak to the partner/friend ("what to say when your person goes quiet",
"if your friend with bpd cancels on you again"). The scripts are lines the OTHER person can say,
written by someone on the receiving end who knows what actually lands. Never scolding, never
"they're difficult", the tone is "here's the cheat code from inside".`
};

const TS_TONE_SPEC: Record<TsToneId, string> = {
    dark_humor: `TONE: dark humor. The jokes are coping, the honesty is gallows-adjacent, the
bracket notes are allowed to be funny. Funny only when the funny IS the truth.`,
    soft: `TONE: soft. Tender, quiet, a little raw. No gags, the warmth does the work. Bracket
notes read like a hand on the shoulder, not a punchline.`
};

const TS_VOICE = `WHO YOU ARE: you're 22. you got diagnosed with BPD a year ago and you've been
in DBT for about 8 months. you post the exact sentences that got you through the moments where
your brain deletes all language. You are not a therapist, not an advocate, not a brand. You
write the way you text: lowercase, contractions, no try-hard punctuation. You are writing to
one person who is exactly where you were a year ago.

WHAT A SCRIPT SLIDE IS: a word-for-word line in quotes that the viewer can copy and send/say
verbatim, followed by ONE bracketed note in [square brackets], a single dry line of insight
about why the line works or what urge to resist. The bracket note is the most screenshot-able
part of the whole slideshow. Never two bracket notes, never a second script on one slide.
  GOOD script slide: "i've been thinking about last night. what i said wasn't okay and i'm
  sorry. you didn't deserve that tone." [then stop typing. the urge to add a second paragraph
  is the shame talking, not the friendship.]
  BAD script slide: "Just communicate openly and honestly!" (advice, not a script, banned)

BANNED, the tells that get you clocked as a brand or a machine:
- The left-on-read / unreplied-text / "they're mad at me" scenario as the engine of the
  slideshow. A phone may appear incidentally; the unanswered text may NOT be the plot.
- Clinical framing: "symptoms of", "people with bpd tend to", anything that positions the
  viewer as a patient. No therapy-speak: "self-care", "healing journey", "valid", "hold space",
  "communicate your needs".
- Advice voice: "you should", "try to", "make sure to", "just talk to them". Scripts only.
- Symmetrical triplets, rhetorical question setups, "turns out", "plot twist", "the kicker?".
- Invented precision ("47 times", "at exactly 2:14am"). Real specificity only.
- CAPS for emphasis, "bestie", "no bc", "i'm deceased", "the way i" trailing off, emoji (max 1 in the
  WHOLE slideshow, and never on an emotional line).
- Dash punctuation of ANY kind: no em-dash, no en-dash, no " - " as a pause. It is
  the single most recognized AI tell on TikTok. Use a period or a comma, always.
- Sentimental uplift. No slide ends by reassuring anyone. End seen, not comforted.
- Reusing ANY line from the gold examples or this prompt. They show register, never content.`;

// Few-shot beats rules. These three are the format-defining posts, the model must match
// their register and shape without reusing a single line of content.
const TS_GOLD_EXAMPLES = `GOLD STANDARD, three complete slideshows that defined this format.
Match the SHAPE, the LENGTH and the REGISTER exactly. Never reuse the content.

EXAMPLE A, the morning after the outburst:
1 (hook): for the girls who rehearse the apology in the shower the morning after
2 (scene): you said something at midnight that you can't unsay. you've already replayed it 40
times. your chest has been tight since you woke up and you haven't even checked your phone yet.
3 (trap): what you usually do: write a 400-word paragraph that apologizes for existing, three
follow-ups, a joke to lighten it, then silence while you wait to find out if you're still loved.
4 (script): the repair text (send this, nothing else): "i've been thinking about last night.
what i said wasn't okay and i'm sorry. you didn't deserve that tone." [then stop typing. the
urge to add a second paragraph is the shame talking, not the friendship.]
5 (script): the in-person version: "can i redo last night? i was dysregulated and i took it out
on you. i'm sorry. i'm working on catching it earlier." [notice: no self-flagellation. "i'm the
worst" is not an apology, it's a request for comfort.]
6 (script): if they need space: "take whatever time you need. i'm not going anywhere and i'm
not going to blow up your phone." [this one sentence does more repair than 40 check-ins.]
7 (why): short repair = you fixed the thing without abandoning yourself. over-apologizing
teaches your brain the relationship survives on your groveling. it doesn't.
8 (2am): too ashamed to write anything at all? then the only job is: don't send the 400-word
paragraph. phone in another room, cold water on your face, write the 3 sentences after.
9 (bridge): {{APP}}. your 9am self needs this before the midnight version of you does something.

EXAMPLE B, the vulnerability hangover:
1 (hook): you told someone your entire life story on the first hangout and now you want to move
countries
2 (scene): it felt so good in the moment. they were nodding, you were glowing. then you got
home and your brain started the replay: "why did i tell them that. they think i'm insane."
3 (trap): what you usually do: go completely silent, convince yourself they're gossiping about
you, and quietly demote them from "potential best friend" to "person i avoid at parties".
4 (script): the reality-check script (say to yourself, out loud if you can): "i shared a lot.
that felt like connection. the hangover is my shame alarm, not evidence of what they think."
[your brain has zero footage of their face judging you. it's generating it.]
5 (script): the follow-up text that normalizes it instead of retreating: "lol i realize i gave
you the director's cut of my entire life yesterday. thanks for being cool about it." [naming it
kills the power it has over you.]
6 (script): the pacing script for next time: "i tend to overshare when i like someone, so if i
start doing the whole autobiography thing just change the subject." [saying this once buys you
unlimited grace.]
7 (why): the hangover isn't caused by oversharing, it's caused by the story you tell yourself
after. check the facts, that's literally the skill.
8 (2am): mid-hangover and can't think? don't send anything and don't disappear. wait 24 hours.
the hangover has a half-life and it always passes before the friendship does.
9 (bridge): {{APP}}. save this for the next time you give someone the director's cut.

EXAMPLE C, splitting mid-conversation:
1 (hook): you're mid-sentence with your best friend and you can feel yourself starting to hate them
2 (scene): five minutes ago they were your favorite person on earth. then they said one slightly
off thing and now every memory you have of them is evidence. you're watching it happen like a
nature documentary and you can't stop it.
3 (trap): what you usually do: go cold mid-conversation, give one-word answers, let them feel
the temperature drop, then either explode or leave, and spend tomorrow rebuilding.
4 (script): the pause script (say it out loud, mid-split, even if your voice is flat): "i just
noticed my brain flipping on you and i don't trust it right now. give me 20 minutes." [you
didn't deny the feeling. you didn't act on it either. that's the whole skill.]
5 (script): the exit script if you need to leave: "i'm getting flooded and i'm gonna say
something i don't mean. i'll text you tonight." [naming the flood keeps it from becoming the
story.]
6 (script): the re-entry script for tonight: "okay i'm back. my brain tried to tell me you're a
villain for approximately 3 hours. you're not. sorry for going statue mode." [humor here isn't
minimizing, it's proof the split ended.]
7 (why): a split survives on being invisible. the second you narrate it, it loses the steering
wheel.
8 (2am): can't form sentences mid-split? pre-agree on one word with your people. you say
"flipping" and they know exactly what's happening without you explaining anything.
9 (bridge): {{APP}}. send this to the friend who gets your one-word answer era.

Notice what all three share: the scripts are SPECIFIC enough to send verbatim, the bracket
notes are one dry line each, the scene slide is surveillance-level precise, and nothing,
anywhere, sounds like advice.`;

// Hard word budgets per role (the #1 failure mode of this format is text walls on mobile).
// Grace of +4 words is applied at validation; beyond that the attempt is rejected.
const TS_ROLE_ORDER = ['hook', 'scene', 'trap', 'script', 'script', 'script', 'why', 'fallback', 'bridge'] as const;
type TsRole = typeof TS_ROLE_ORDER[number];

const TS_WORD_BUDGET: Record<TsRole, number> = {
    hook: 15,
    scene: 30,
    trap: 25,
    script: 40,
    why: 25,
    fallback: 25,
    bridge: 30
};

const TS_SLIDE_SPEC = `FIXED 9-SLIDE STRUCTURE, every slide has a role and a HARD word budget.
Mobile viewers give you two seconds per slide; a wall of text on any slide kills the set.

1. "hook" (≤15 words): identity call-out or pattern interrupt naming the exact moment. No
   question, no "did you know". A stranger gets the whole premise in under one second.
2. "scene" (≤30): the moment rendered so precisely it feels like surveillance. Present tense,
   second person. One image, no backstory.
3. "trap" (≤25): "what you usually do:" + the behavior that makes it worse, named with love.
4-6. "script" (≤40 each): three word-for-word scripts for three distinct sub-moments of the
   scenario. Label each ("the repair text:", "if they need space:"), put the line in quotes,
   then ONE [bracket note]. Each script must be sendable/sayable verbatim, if a real person
   couldn't say it out loud without cringing, it's not a script, it's advice.
7. "why" (≤25): the casual DBT logic in friend-voice, why the short/honest version works and
   the impulse version doesn't. You may name the skill loosely ("that's the whole skill",
   "check the facts") but never lecture.
8. "fallback" (≤25): the 2am version, what to do when too dysregulated to remember any script.
   One physical, doable instruction.
9. "bridge" (≤30 EXCLUDING the app sentence): put the token {{APP}} where the app sentence
   goes (the server writes that sentence, never name an app yourself), then a save-bait or
   send-to-a-friend closer that answers the question the slideshow created ("where do i keep
   these so i remember at 2am?"). Never "download", never "link in bio", never a feature list.

THE ARC: seen (1-2) → named (3) → equipped (4-6) → trusting (7) → held (8) → converted (9).
Slides 4-6 are the saveable payload. Slide 2 is what gets it shared. Slide 9 converts.`;

function buildSystemPrompt(scenario: TsScenarioId, pov: TsPovId, tone: TsToneId, language: 'en' | 'de' = 'en'): string {
    return `You are the writer for a gen-z mental-health TikTok account (DBT/BPD niche). This
format is called THE SCRIPT: 9 text slides giving word-for-word scripts for one moment BPD
makes wordless. Not advice. Not validation. Lines.

${TS_VOICE}

${TS_GOLD_EXAMPLES}

${TS_SLIDE_SPEC}

THIS SLIDESHOW'S SCENARIO: ${TS_SCENARIOS[scenario].label}
${TS_SCENARIOS[scenario].spec}
${language === 'de'
    ? `Deutsche Hooks, die für dieses Szenario funktionieren (schreib einen in diesem Geist, nie wörtlich):\n${TS_SCENARIOS[scenario].hooksDe.map(h => `  - "${h}"`).join('\n')}`
    : `Hooks that work for this scenario (write one in this spirit, never verbatim):\n${TS_SCENARIOS[scenario].hooks.map(h => `  - "${h}"`).join('\n')}`}

${TS_POV_SPEC[pov]}

${TS_TONE_SPEC[tone]}

OUTPUT: valid JSON only, no markdown, no commentary:
{"slides": [9 objects], "hooks": ["...", 20 of them], "title": "...", "hashtags": ["...", 5 of them],
 "caption": "...", "pinned_comment": "..."}

HOOKS: slide 1 uses your single best hook. "hooks" is 20 MORE slide-1 options for the same
slideshow, so the poster can swap. Each: =15 words, lowercase, no dash characters, about THIS
scenario. Spread across mechanisms (max 4 each): pattern interrupt ("stop scrolling if..."),
identity call-out ("for the girls who..."), curiosity gap with real stakes, confessional
("things i've never said out loud:"), save-bait that implies future utility without saying
"save this". No two hooks may share the same first 3 words.

LABEL RATIO (targeting strategy, not style): exactly 2-3 of the 20 hooks may name the label
("bpd", "quiet bpd", "fp") — those are the search/community beacons (model: "quiet bpd is
leaving a chat nobody knew you left"). The other 17-18 must tag a BEHAVIOR, never a diagnosis:
the viewer should feel surveilled by the specificity, not categorized by a label. Behavior
hooks reach the diagnosed, the undiagnosed, and the just-relaters; label hooks only reach the
first group.

Each slide object: {"role": "hook"|"scene"|"trap"|"script"|"why"|"fallback"|"bridge",
"text": "the slide copy"}. Paragraphs inside a slide may be separated by a single blank line
(\\n\\n); never more. Script slides keep the quoted line and the [bracket note] in one
paragraph. Slide 9's text contains {{APP}}.

TITLE: MAXIMUM 8 WORDS, lowercase, the account's voice, specific to THIS slideshow, never
slide 1 copied, never a generic label. No hashtags, no emoji, no quotes.

HASHTAGS: exactly 5, lowercase, each starting with #. At least 3 BPD/DBT specific (#bpd #dbt
#bpdtok #quietbpd #dbtskills #bpdrecovery #emotionalregulation). No self-harm tags, no #fyp spam.

CAPTION: 1 short line in the account's voice pointing at the scripts without explaining them.
Model: "slide 4 has carried my friendships through some rough mornings"

PINNED_COMMENT: the plain friendly answer to "what app?", names DBT-Mind once, casual, 1-2
short sentences, no link. Model: "for everyone asking, the scripts live in DBT-Mind (free) 🖤"

THE ONLY TEST THAT MATTERS: read every slide as a 19-year-old with BPD who is deeply skeptical
of accounts performing BPD for views. If any line would make her comment "this was written by
chatgpt", rewrite it until it wouldn't.

THEN CHECK:
- exactly 9 slides, roles in order: hook, scene, trap, script, script, script, why, fallback, bridge
- every slide within its word budget (hook 15, scene 30, trap 25, scripts 40, why 25,
  fallback 25, bridge 30 excluding the app sentence)
- each script slide: one quoted verbatim line + one [bracket note]
- slide 9 contains {{APP}} and nothing else about any app
- the three scripts cover three DISTINCT sub-moments, not the same line rephrased
- no banned tell anywhere; no line borrowed from the examples or this prompt
- the central scenario is NOT an unanswered text${language === 'de' ? `

${TS_GERMAN_BLOCK}

${TS_GERMAN_NATIVE_OVERRIDE_FINAL}` : ''}`;
}

function firstTextBlock(rawData: any): string {
    const blocks = Array.isArray(rawData?.content) ? rawData.content : [];
    const text = blocks.find((b: any) => b?.type === 'text');
    return typeof text?.text === 'string' ? text.text : '';
}

const s = (v: any, fallback = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

// Backstop for the no-dashes rule: even with the ban in the prompt, models slip one in
// occasionally. Runs on every piece of returned copy. A period keeps the gen-z cadence.
const stripAiDashes = (v: string): string => s(v)
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/ - /g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/ ,/g, ',')
    .trim();

const wordCount = (v: string) => String(v || '').split(/\s+/).filter(Boolean).length;

// Structural validation, this is what makes the output consistently good instead of
// occasionally good. Failures are fed back to the model verbatim on retry.
function validateSlides(rawSlides: any[]): string[] {
    const failures: string[] = [];
    if (!Array.isArray(rawSlides) || rawSlides.length !== 9) {
        return [`expected exactly 9 slides, got ${Array.isArray(rawSlides) ? rawSlides.length : 0}`];
    }
    TS_ROLE_ORDER.forEach((expectedRole, i) => {
        const slide = rawSlides[i] || {};
        const role = s(slide.role).toLowerCase();
        const text = s(slide.text);
        if (role !== expectedRole) {
            failures.push(`slide ${i + 1} must have role "${expectedRole}", got "${role || 'none'}"`);
        }
        if (!text) {
            failures.push(`slide ${i + 1} has no text`);
            return;
        }
        // {{APP}} doesn't count against the bridge budget, it's replaced server-side.
        const counted = text.replace(/\{\{\s*app\s*\}\}/gi, '');
        const budget = TS_WORD_BUDGET[expectedRole] + 4; // small grace
        const words = wordCount(counted);
        if (words > budget) {
            failures.push(`slide ${i + 1} (${expectedRole}) is ${words} words, budget is ${TS_WORD_BUDGET[expectedRole]}. Cut it, don't shrink it.`);
        }
        if (expectedRole === 'script') {
            if (!/"[^"]+"/.test(text) && !/“[^”]+”/.test(text)) {
                failures.push(`slide ${i + 1} (script) needs the word-for-word line in quotes`);
            }
            if (!/\[[^\]]+\]/.test(text)) {
                failures.push(`slide ${i + 1} (script) needs exactly one [bracket note]`);
            }
        }
        if (expectedRole === 'bridge' && !/\{\{\s*app\s*\}\}/i.test(text)) {
            failures.push('slide 9 (bridge) must contain the {{APP}} token');
        }
    });
    return failures;
}

// German needs a language-quality backstop in addition to the structural checks. The most
// common failure is not incorrect grammar; it is a grammatically possible sentence that no
// German Gen-Z person would actually type because it mirrors English syntax.
function validateGermanNative(candidate: any): string[] {
    const source = [
        ...(Array.isArray(candidate?.slides) ? candidate.slides.map((slide: any) => slide?.text) : []),
        ...(Array.isArray(candidate?.hooks) ? candidate.hooks : []),
        candidate?.title,
        candidate?.caption,
        candidate?.pinned_comment
    ].map((value) => s(value)).join(' ').toLowerCase();
    const failures: string[] = [];
    const literalCalques = [
        'dein mensch',
        'deine person',
        'was du normalerweise machst',
        'der deal für nächstes mal',
        'der deal fuer naechstes mal',
        'die entschuldigungs-idee',
        'die entschuldigungsidee',
        'ich fühle mich nicht gesehen',
        'ich fuehle mich nicht gesehen',
        'das nervensystem geht in panikmodus',
        'what you usually do',
        'your person',
        'next time'
    ];
    const found = literalCalques.filter((phrase) => source.includes(phrase));
    if (found.length) {
        failures.push(`german copy contains literal or unnatural calque(s): ${found.join(', ')}. Rewrite those lines in native German chat language.`);
    }

    // A full German carousel should contain unmistakable German function words. This catches
    // an English answer that merely kept the requested JSON shape and a few German labels.
    const germanMarkers = source.match(/\b(ich|mich|mir|mein|meine|du|dir|dich|dein|deine|wenn|dass|nicht|und|aber|weil|jetzt|schon|noch|wieder|kurz|einfach|direkt|warum|was|wie)\b/g) || [];
    if (germanMarkers.length < 10) {
        failures.push('german output does not contain enough native German function words; rewrite every field in German, not English with German labels.');
    }
    return failures;
}

// Hooks get their own pass: 20 distinct options, each short enough to stop a scroll.
function cleanHooks(raw: any): string[] {
    const list = Array.isArray(raw) ? raw : [];
    const seen = new Set<string>();
    const hooks: string[] = [];
    for (const entry of list) {
        const hook = stripAiDashes(s(entry)).replace(/^["“”]+|["“”]+$/g, '');
        const key = hook.toLowerCase();
        if (!hook || wordCount(hook) > 18 || seen.has(key)) continue;
        seen.add(key);
        hooks.push(hook);
        if (hooks.length >= 20) break;
    }
    return hooks;
}

const LABEL_HOOK_RE = /\b(bpd|borderline|quiet bpd|fp)\b/i;
const countLabelHooks = (hooks: string[]) => hooks.filter(h => LABEL_HOOK_RE.test(h)).length;

const TITLE_MAX_WORDS = 8;
function buildTitle(raw: any, hookText: string): string {
    let title = s(raw)
        .replace(/#[\w]+/g, ' ')
        .replace(/["“”]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!title) title = hookText;
    const words = title.split(' ').filter(Boolean);
    return words.length <= TITLE_MAX_WORDS ? title : words.slice(0, TITLE_MAX_WORDS).join(' ');
}

const HASHTAG_FALLBACKS = ['#bpd', '#dbt', '#bpdtok', '#dbtskills', '#mentalhealth'];
const HASHTAG_FALLBACKS_DE = ['#bpd', '#dbt', '#bpdtok', '#borderline', '#mentalegesundheit'];
function buildHashtags(raw: any, language: 'en' | 'de' = 'en'): string[] {
    const list = Array.isArray(raw) ? raw : s(raw).split(/[\s,]+/);
    const seen = new Set<string>();
    const tags: string[] = [];
    for (const entry of list) {
        const tag = s(entry).toLowerCase().replace(/^#*/, '#').replace(/[^#a-z0-9_]/g, '');
        if (tag.length < 3 || seen.has(tag)) continue;
        seen.add(tag);
        tags.push(tag);
    }
    const fallbacks = language === 'de' ? HASHTAG_FALLBACKS_DE : HASHTAG_FALLBACKS;
    for (const fallback of fallbacks) {
        if (tags.length >= 5) break;
        if (!seen.has(fallback)) { seen.add(fallback); tags.push(fallback); }
    }
    return tags.slice(0, 5);
}

export async function generateTheScriptSlideshow(params: {
    scenario?: string;
    pov?: string;
    tone?: string;
    theme?: string;
    language?: string;
    ANTHROPIC_API_KEY: string;
}) {
    const { ANTHROPIC_API_KEY } = params;
    const language: 'en' | 'de' = params.language === 'de' ? 'de' : 'en';

    const reqScenario = s(params.scenario);
    const scenarioId: TsScenarioId = reqScenario && reqScenario !== 'random' && reqScenario in TS_SCENARIOS
        ? reqScenario as TsScenarioId
        : TS_SCENARIO_IDS[Math.floor(Math.random() * TS_SCENARIO_IDS.length)] ?? 'morning_after';

    const reqPov = s(params.pov);
    const povId: TsPovId = reqPov && reqPov !== 'random' && reqPov in TS_POV_SPEC
        ? reqPov as TsPovId
        : (Math.random() < 0.7 ? 'self' : 'other_side');

    const reqTone = s(params.tone);
    const toneId: TsToneId = reqTone && reqTone !== 'random' && reqTone in TS_TONE_SPEC
        ? reqTone as TsToneId
        : (Math.random() < 0.5 ? 'dark_humor' : 'soft');

    const bridgeBank = language === 'de' ? TS_BRIDGES_DE : TS_BRIDGES;
    const bridge = bridgeBank[Math.floor(Math.random() * bridgeBank.length)] ?? bridgeBank[0]!;

    const theme = s(params.theme);
    const baseUserPrompt = [
        'Write the slideshow now.',
        theme ? `Angle it around this specific shade of the scenario: ${theme}.` : 'Pick the sharpest, most specific version of this scenario, the one nobody has posted yet.',
        language === 'de' ? 'ALLES AUF DEUTSCH (siehe SPRACHE-Block im System Prompt).' : '',
        'Return valid JSON only.'
    ].filter(Boolean).join('\n');

    console.log(`[The Script] Generating (scenario: ${scenarioId}, pov: ${povId}, tone: ${toneId}, language: ${language})${theme ? ` (theme: ${theme})` : ''}...`);

    const messages: Array<{ role: string; content: string }> = [{ role: 'user', content: baseUserPrompt }];
    let parsed: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'server-side-fallback-2026-07-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                // Fable 5: thinking is always on (never send a `thinking` field) and
                // sampling params are rejected, don't add temperature/top_p here.
                // Sonnet 5.5 instead of Fable 5 to cut cost. Thinking is adaptive and billed as
                // output, so max_tokens keeps room; "default" finishes a declined request.
                model: 'claude-sonnet-5-5',
                max_tokens: 16000,
                fallbacks: 'default',
                system: buildSystemPrompt(scenarioId, povId, toneId, language),
                messages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            const overloaded = response.status === 529 || errText.includes('overloaded');
            console.error(`[The Script] Anthropic error (attempt ${attempt + 1}):`, errText.slice(0, 300));
            if (!overloaded) throw new Error('Anthropic API Error');
            await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
            continue;
        }

        const rawData = await response.json() as any;
        if (rawData.stop_reason === 'refusal') {
            console.error('[The Script] Request declined by safety classifiers:', JSON.stringify(rawData.stop_details || {}));
            throw new Error('Anthropic declined this request. Try a different scenario or theme.');
        }
        logClaudeUsage('The Script', rawData, attempt);

        const rawText = firstTextBlock(rawData);
        let candidate: any = null;
        try {
            candidate = extractJsonObject(rawText);
        } catch (parseErr) {
            console.error(`[The Script] JSON parse failed (attempt ${attempt + 1}):`, String(parseErr), '| raw tail:', rawText.slice(-120));
        }

        const candidateSlides: any[] = Array.isArray(candidate?.slides) ? candidate.slides : [];
        const failures = candidate ? validateSlides(candidateSlides) : ['response was not valid JSON with a "slides" array'];
        if (candidate && language === 'de') {
            failures.push(...validateGermanNative(candidate));
        }
        const candidateHooks = candidate ? cleanHooks(candidate?.hooks) : [];
        if (candidate && candidateHooks.length < 10) {
            failures.push('the "hooks" array must contain 20 distinct slide-1 hook options (15 words max each)');
        }
        if (candidate && candidateHooks.length >= 10) {
            const labelCount = countLabelHooks(candidateHooks);
            if (labelCount < 2 || labelCount > 4) {
                failures.push(`exactly 2-3 hooks may name the label (bpd / quiet bpd / fp); you have ${labelCount}. The rest must tag a behavior, not a diagnosis.`);
            }
        }
        if (candidate) {
            const hooks = cleanHooks(candidate?.hooks);
            if (hooks.length < 10) failures.push(`"hooks" must be an array of ~20 alternate slide-1 hooks (got ${hooks.length} usable)`);
        }

        if (failures.length === 0) {
            parsed = candidate;
            break;
        }

        console.warn(`[The Script] Validation failed (attempt ${attempt + 1}):`, failures.join(' | '));
        // Feed the failure back verbatim, "your slide 4 is 47 words" fixes faster than
        // any amount of prompt wording ever will.
        messages.push({ role: 'assistant', content: rawText || '(unparseable response)' });
        messages.push({
            role: 'user',
            content: `Your attempt failed these checks:\n${failures.map(f => `- ${f}`).join('\n')}\nRewrite the FULL slideshow fixing every one. Valid JSON only.`
        });
    }

    if (!parsed) throw new Error('The Script: generation failed validation after 3 attempts');

    const rawSlides: any[] = parsed.slides;
    const cleanText = (v: any) => stripAiDashes(s(v).replace(/\n{3,}/g, '\n\n'));

    const slides = TS_ROLE_ORDER.map((role, i) => {
        let text = cleanText(rawSlides[i]?.text);
        if (role === 'bridge') {
            text = text.replace(/\{\{\s*app\s*\}\}/i, bridge);
        }
        return { n: i + 1, role, text };
    });

    return {
        slides,
        hooks: cleanHooks(parsed?.hooks),
        scenario: { id: scenarioId, label: TS_SCENARIOS[scenarioId].label },
        pov: povId,
        tone: toneId,
        language,
        bridge,
        title: stripAiDashes(buildTitle(parsed?.title, slides[0]?.text || '')),
        hashtags: buildHashtags(parsed?.hashtags, language),
        caption: stripAiDashes(s(parsed?.caption)),
        pinned_comment: stripAiDashes(s(parsed?.pinned_comment))
    };
}
