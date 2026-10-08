// "Endo-Hacks" photo slideshows for the German Endumi account: the weird-hacks skeleton of the
// DBT flow (face-cam hook + proof bracket, 5-7 numbered hacks, one of them the app hack mid-list,
// nothing after the last hack), written in German TikTok Denglisch. The hacks are credited to the
// account owner's gynaecologist because they really come from her; when the tab passes a list of
// those tips, the hacks are taken from it so the credit stays true.
import { buildDescription, buildTitle, extractJsonObject, firstTextBlock, normalizeSsSlideText } from '../dbt/ss_slideshow';
import { buildEndoHashtags } from './endo_meme_slideshow';
import { logClaudeUsage } from '../../claude_usage';

const s = (v: any, fallback = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;

// Hook shapes in the Denglisch of German TikTok: "Weird" and "Hacks" stay English, the rest is
// German. All name the gyn and the felt moment, never a diagnosis.
const HOOKS: Array<{ label: string; spec: string }> = [
    { label: 'Gyn gave me', spec: '"Weird Endo-Hacks, die mir meine Gyn für [der gefühlte Moment] gegeben hat". Example of the shape: "Weird Endo-Hacks, die mir meine Gyn für Tag 1 gegeben hat".' },
    { label: 'Crazy effektiv', spec: '"Crazy effektive Endo-Hacks von meiner Gyn, wenn [der gefühlte Moment]". Example of the shape: "Crazy effektive Endo-Hacks von meiner Gyn, wenn gar nichts mehr geht".' },
    { label: 'Bei Endo-Schmerzen', spec: '"Weird Hacks von meiner Gyn bei Endo-Schmerzen" plus at most a short time or place ("im Büro", "nachts"). The shortest shape.' },
    { label: 'Früher gebraucht', spec: '"Endo-Hacks von meiner Frauenärztin, die ich viel früher gebraucht hätte". The situation then lives only in the hacks.' },
    { label: 'Hat mir gezeigt', spec: '"Weird Endo-Tricks, die mir meine Gyn gezeigt hat, für [der gefühlte Moment]".' },
];

// Proof brackets under the hook, German versions of the proven English ones.
const BRACKETS = ['(die mir echt geholfen haben)', '(und sie helfen wirklich)', '(die tatsächlich Sinn ergeben)', '(die meinen Alltag leichter machen)'];

// Broad, felt situations. Broad on purpose: "Tag 1" makes every viewer with endo think "that's
// me", one narrow scene shrinks the audience to people living exactly that moment.
const TERRITORIES: Array<{ label: string; spec: string }> = [
    { label: 'Tag 1', spec: 'the worst day of the period. Say it like: "für Tag 1", "wenn Tag 1 mich komplett umhaut".' },
    { label: 'Unsichtbare Schmerzen', spec: 'pain nobody sees and everyone underestimates. Say it like: "wenn keiner sieht, wie weh es tut", "für Schmerzen, die keiner ernst nimmt".' },
    { label: 'Endobelly', spec: 'the bloated belly, clothes that suddenly do not fit. Say it like: "für den Endobelly", "wenn mein Bauch auf einmal aussieht wie im fünften Monat".' },
    { label: 'Arbeit mit Endo', spec: 'getting through work, uni or school with pain. Say it like: "für Arbeitstage mit Endo", "wenn ich trotz Schmerzen funktionieren muss".' },
    { label: 'Nächte', spec: 'nights when the pain keeps you awake. Use a night word in the hook. Say it like: "für Nächte, in denen ich vor Schmerzen nicht schlafen kann".' },
    { label: 'Erschöpfung', spec: 'the endo fatigue, being exhausted for no visible reason. Say it like: "wenn ich einfach nur noch müde bin", "für die Endo-Erschöpfung".' },
    { label: 'Nicht ernst genommen', spec: 'being told "das ist doch normal". Hacks here are about being heard, notes, preparation, never about doctors being bad. Say it like: "wenn mir keiner glaubt", "damit ich beim nächsten Termin ernst genommen werde".' },
    { label: 'Planen um den Zyklus', spec: 'planning life around the bad days. Say it like: "damit Endo nicht meinen ganzen Monat bestimmt", "für Wochen, in denen ich weiß, dass es kommt".' },
];

// How the app hack introduces Endumi. One is assigned per post so the line never repeats.
const APP_ANGLES: Array<{ label: string; spec: string }> = [
    { label: 'Gyn wollte Notizen', spec: 'the gyn asked for a record of the pain, the narrator keeps it in Endumi now. Rhythm: "meine Gyn wollte wissen, wann es genau weh tut, seitdem trag ich es in Endumi ein, drei Taps".' },
    { label: 'Selbst gefunden', spec: 'the narrator went looking after another "das ist normal". Rhythm: "nach dem dritten Arzt hab ich angefangen alles in Endumi aufzuschreiben".' },
    { label: 'Einfach Gewohnheit', spec: 'no origin story, just what the narrator does. Rhythm: "der Eintrag in Endumi dauert keine dreißig Sekunden, also mach ich ihn auch an schlechten Tagen".' },
    { label: 'Feature zuerst', spec: 'lead with what it does in THIS moment, the app name at the end of the line. Rhythm: "meine Fragen sortiert, die wichtigste zuerst, das macht die Terminvorbereitung in Endumi".' },
];

const FEATURES = `ENDUMI, real features only (pick ONE that fits the hack): a diary entry in three taps and
under thirty seconds; the Endo-Akte with treatments, appointments, results and applications in
one place; the Vorgeschichte as a one or two page PDF for a new practice, an endometriosis
centre or Reha; appointment preparation with your questions sorted, the most important first;
Mein Muster with up to twelve cycles stacked day by day; free Relief audios for bad moments
(calm breathing, a body scan, a twenty-minute heat timer, one for lying awake at night).
Never invent a feature, a price, a rating or a result.`;

const SAFETY = `SAFETY (hard rules, a health app's account):
- Never medication, painkillers, hormones, the pill, dosages, supplements, diets, surgery or
  any treatment. No "nimm vorher", no product names. The hacks are everyday comfort,
  organisation and communication moves only: heat, positions, clothes, planning, notes,
  preparing appointments, telling people, resting.
- No diagnosis, no "das ist ein Zeichen für", no promise that anything cures or stops endo, no
  guaranteed outcome ("hilft immer", "garantiert").
- Doctors are never the villains. The gyn is the helpful person in this post.
- Nothing that could be dangerous: no extreme heat on skin, nothing about not seeing a doctor.`;

const VOICE = `LANGUAGE: German TikTok Denglisch. Du-form, lowercase-leaning, texting rhythm, like a
27-year-old who has had endo for years. English TikTok words that Germans really use are fine
and expected in the hook ("weird", "Hacks", "crazy", "Endobelly"), the bodies are plain German.
No Ratgeber tone, no "liebe Endo-Kriegerinnen", no medical jargon, no motivational slogans.
No dashes anywhere (no em dash, en dash or double hyphen). No emoji or hashtags in slides.`;

const BANNED_WORDS = ['ibuprofen', 'paracetamol', 'schmerzmittel', 'tablette', 'medikament', 'hormon', 'pille', 'dosis', ' mg ', 'operation', 'heilt', 'heilung', 'garantiert', 'nahrungsergänzung', 'magnesium'];

type Plan = { hackCount: number; appPosition: number; numberStyle: '.' | ')' };

function buildPrompt(hook: { label: string; spec: string }, territory: { label: string; spec: string }, angle: { label: string; spec: string }, bracket: string, plan: Plan, gynTips: string[]) {
    const n = (i: number) => `${i}${plan.numberStyle}`;
    const tipBlock = gynTips.length
        ? `THE GYN'S REAL TIPS (the hacks come from this list, because the hook credits the gyn and
that has to stay true): take ${plan.hackCount - 1} of them that fit the assigned situation and
write each as a hack. You may phrase them in your own words and add the plain "why", but never
add a tip that is not on the list:
${gynTips.map((tip) => `- ${tip}`).join('\n')}`
        : `The hacks are small, practical everyday moves of the kind a gynaecologist tells a patient in
passing. Keep them modest and safe; they must be true for most people with endo.`;
    return `You write German photo slideshows for the TikTok account of Endumi, an endometriosis app.

THIS FORMAT: the WEIRD HACKS carousel. A selfie hook slide, then a numbered list of hacks the
narrator's gyn gave her. One hack is the narrator's own habit with the Endumi app, sitting in the
list like any other hack. Nothing comes after the last hack: no summary, no outro.

THIS POST'S HOOK SHAPE (do not drift from it):
- ${hook.label}: ${hook.spec}

THIS POST'S SITUATION (every hack is for THIS moment):
- ${territory.label}: ${territory.spec}

${tipBlock}

THE WEIRDNESS TEST: each hack is something the viewer would never have guessed and could do
today: an object, a place, a time or a sentence in it. "Wärmflasche benutzen", "ausruhen",
"viel trinken", "Tee trinken" and "auf deinen Körper hören" are what every account posts, so
they fail. Heat is allowed when the hack is oddly specific about it.

THE THREE-BEAT BODY (every hack): 1. what you literally do, one sentence. 2. why it helps, one
plain sentence. 3. optional dry aside ("klingt albern. hilft trotzdem."). Under 40 words.

STRUCTURE, ${plan.hackCount + 1} slides in this order:
1. HOOK (role "hook"). "headline": the assigned hook shape, sentence case, 6 to 16 words, must
   contain "Endo" and "Hacks" or "Tricks" and credit "meine Gyn", "meiner Gyn", "mein Gyn",
   "meinem Gyn" or "meine Frauenärztin". The situation is broad and written the way it feels.
   "body": exactly this proof bracket and nothing else: ${bracket}
2. HACKS: exactly ${plan.hackCount}, numbered ${n(1)} to ${n(plan.hackCount)}. Every "headline" starts with the
   number, then "${plan.numberStyle}", then a space, then the plain name of the hack (max 8 words). Role
   "skill", EXCEPT hack ${n(plan.appPosition)}, which is the APP HACK.
3. THE APP HACK (role "cta", hack number ${plan.appPosition}, mid-list, not an ad break). Same shape
   as the others: a numbered headline naming the move in plain words, never the app name, then
   the three-beat body: what the narrator does in Endumi in THIS situation (ONE real feature),
   why it helps, optional aside. First person. Never "download", "Link in Bio", "check", price,
   "kostenlos" or any ad word. Assigned app angle: ${angle.label}: ${angle.spec} The rhythm is a
   shape, not copy.
   The last slide is simply hack ${plan.hackCount}.

${FEATURES}

${VOICE}

${SAFETY}

VARIATION RULE: no slide may repeat an earlier slide word for word (see ALREADY USED in the
user message).

OUTPUT: valid JSON only:
{"slides": [{"role": "hook"|"skill"|"cta", "headline": "...", "body": "...", "image_query": "..."}, ...],
 "title": "...", "hashtags": ["...", 5], "caption": "...", "description": "...", "pinned_comment": "...", "save_trigger": "..."}
No line breaks inside headline or body. image_query: an English Pinterest search for a soft,
warm, cosy photo that fits the slide (e.g. "cozy bed hot water bottle warm light"); the hook's
query describes a close-up selfie in bed or on the sofa.
TITLE: max 8 words, lowercase German, e.g. "weird endo hacks von meiner gyn für tag 1".
HASHTAGS: exactly 5 German endo tags (#endometriose #endo #periodenschmerzen ...).
CAPTION: 3 to 5 short lowercase lines, first person; one line mentions Endumi the way the app hack did.
DESCRIPTION: exactly two lowercase sentences in first person, no app, no question, no hashtags.
PINNED_COMMENT: the friendly answer to "welche app?", naming Endumi once, no link.`;
}

function validate(candidate: any, previousTexts: string[], plan: Plan): string[] {
    const failures: string[] = [];
    const slides: any[] = Array.isArray(candidate?.slides) ? candidate.slides : [];
    if (slides.length !== plan.hackCount + 1) return [`The post must be 1 hook + exactly ${plan.hackCount} hacks (got ${slides.length} slides).`];
    const text = (slide: any) => `${s(slide?.headline)} ${s(slide?.body)}`;
    const hook = s(slides[0]?.headline), hookLower = hook.toLowerCase();
    if (!/\bendo/i.test(hook)) failures.push('The hook headline must contain "Endo".');
    if (!/\b(hacks|tricks)\b/i.test(hook) && !/-(hacks|tricks)\b/i.test(hook)) failures.push('The hook headline must say "Hacks" or "Tricks".');
    if (!/\b(gyn|frauenärztin|frauenarzt)\b/i.test(hookLower)) failures.push('The hook must credit the gyn: "meine Gyn", "meiner Gyn" or "meine Frauenärztin".');
    const hookWords = hook.split(/\s+/).filter(Boolean).length;
    if (hookWords < 6 || hookWords > 16) failures.push(`The hook headline is ${hookWords} words. Keep it between 6 and 16.`);
    if (!/^\s*\([^)]*\)\s*$/.test(s(slides[0]?.body))) failures.push('The hook body must be only the proof bracket in round brackets.');
    const mark = plan.numberStyle === '.' ? '\\.' : '\\)';
    for (let i = 1; i <= plan.hackCount; i++) {
        const headline = s(slides[i]?.headline), body = s(slides[i]?.body);
        if (!new RegExp(`^\\s*${i}${mark}\\s`).test(headline)) failures.push(`Hack ${i} must start with "${i}${plan.numberStyle} " (got "${headline.slice(0, 50)}").`);
        if (headline.split(/\s+/).length > 10) failures.push(`Hack ${i} headline is too long (max 8 words after the number).`);
        const words = body.split(/\s+/).filter(Boolean).length;
        if (!words) failures.push(`Hack ${i} has an empty body.`);
        if (words > 45) failures.push(`Hack ${i} body is ${words} words. Keep it under 40.`);
        if (/endumi/i.test(headline)) failures.push(`Hack ${i} names the app in its headline. The headline names the move; the app goes in the body.`);
    }
    const all = slides.map(text).join(' ');
    const allLower = ` ${all.toLowerCase()} `;
    const banned = BANNED_WORDS.filter((word) => allLower.includes(word));
    if (banned.length) failures.push(`No medication, treatment or cure words in this format: ${banned.join(', ')}. Replace those hacks with everyday comfort or organisation moves.`);
    if (/[—–]|--/.test(all)) failures.push('No dashes anywhere. Use periods and commas.');
    if (s(slides[plan.appPosition]?.role) !== 'cta') failures.push(`Hack ${plan.appPosition} must be the app hack with role "cta".`);
    if (!/endumi/i.test(text(slides[plan.appPosition]))) failures.push(`Hack ${plan.appPosition} (the app hack) must name Endumi once, in first person.`);
    if (slides.some((slide, i) => i !== plan.appPosition && /endumi/i.test(text(slide)))) failures.push(`Endumi is named only in hack ${plan.appPosition}.`);
    if (/kostenlos|gratis|\bfree\b|abo\b/i.test(text(slides[plan.appPosition]))) failures.push('The app hack must not mention price.');
    if (previousTexts.length) {
        const used = new Set(previousTexts.map(normalizeSsSlideText));
        const repeats = slides.map((slide) => [s(slide?.headline), s(slide?.body)].filter(Boolean).join('\n\n')).filter((t) => used.has(normalizeSsSlideText(t)));
        if (repeats.length) failures.push(`${repeats.length} slide(s) repeat earlier posts word for word. Rewrite them.`);
    }
    return failures;
}

export async function generateEndoHacksSlideshow(params: { model?: string; previousTexts?: string[]; gynTips?: string[]; effort?: 'low' | 'medium' | 'high'; ANTHROPIC_API_KEY: string }) {
    const model = ['claude-sonnet-5-5', 'claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-4-6'].includes(params.model || '') ? params.model! : 'claude-sonnet-5-5';
    const sonnet55 = model === 'claude-sonnet-5-5';
    const thinks = sonnet55 || model === 'claude-fable-5' || model === 'claude-opus-5';
    const gynTips = (params.gynTips || []).map((tip) => String(tip).trim()).filter(Boolean).slice(0, 60);
    const hackCount = 5 + Math.floor(Math.random() * 3);
    // Not first (the list has not earned it yet) and not last (ending on the app reads like an ad).
    const plan: Plan = { hackCount, appPosition: 3 + Math.floor(Math.random() * (hackCount - 3)), numberStyle: Math.random() < 0.5 ? '.' : ')' };
    const hook = pick(HOOKS), territory = pick(TERRITORIES), angle = pick(APP_ANGLES), bracket = pick(BRACKETS);
    const previousTexts = (params.previousTexts || []).filter((t) => typeof t === 'string' && t.trim()).slice(-250);
    console.log(`[Endo Hacks] hook: ${hook.label} · situation: ${territory.label} · app: ${angle.label} · ${plan.hackCount} hacks, app at ${plan.appPosition}${gynTips.length ? ` · ${gynTips.length} gyn tips` : ''}`);
    const system = buildPrompt(hook, territory, angle, bracket, plan, gynTips);
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{
        role: 'user',
        content: `Write the slideshow now.${previousTexts.length ? `\n\nALREADY USED (never repeat any of these slides word for word):\n${previousTexts.slice(-120).map((t) => `- ${t.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n')}` : ''}`,
    }];
    let parsed: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', signal: AbortSignal.timeout(170000),
            headers: {
                'x-api-key': params.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json',
                'anthropic-beta': sonnet55 ? 'server-side-fallback-2026-07-01' : 'server-side-fallback-2026-06-01',
            },
            body: JSON.stringify({
                model, max_tokens: thinks ? 16000 : 6000, system, messages,
                // Medium measured at ~40% of high's output tokens with copy of the same standard.
                ...(params.effort || sonnet55 ? { output_config: { effort: params.effort || 'medium' } } : {}),
                ...(sonnet55 ? { fallbacks: 'default' } : model === 'claude-fable-5' || model === 'claude-opus-5' ? { fallbacks: [{ model: 'claude-opus-4-8' }] } : {}),
            }),
        });
        if (!response.ok) {
            const err = await response.text();
            if (response.status === 529 || err.includes('overloaded')) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
            throw new Error(`Anthropic API error ${response.status}`);
        }
        const data = await response.json() as any;
        logClaudeUsage('Endo slideshows · hacks', data, attempt);
        if (data.stop_reason === 'refusal') throw new Error('Anthropic declined this request. Try again.');
        const raw = firstTextBlock(data);
        let candidate: any;
        try { candidate = extractJsonObject(raw); } catch { candidate = null; }
        const failures = candidate ? validate(candidate, previousTexts, plan) : ['The response was not valid JSON. Return only the JSON object.'];
        if (!failures.length) { parsed = candidate; break; }
        console.warn(`[Endo Hacks] check failed (attempt ${attempt + 1}):`, failures.join(' | '));
        if (attempt === 2) throw new Error(`Generation failed three times. Last reasons: ${failures.join(' ')}`);
        messages.push({ role: 'assistant', content: raw || '(empty)' }, { role: 'user', content: `Rewrite the FULL slideshow. Fix every issue:\n${failures.map((f) => `- ${f}`).join('\n')}\nReturn valid JSON only.` });
    }
    if (!parsed) throw new Error('Generation failed.');
    // The proof bracket is fixed copy; pin it even if the model paraphrased it.
    parsed.slides[0].body = bracket;
    const slides = parsed.slides.slice(0, plan.hackCount + 1).map((slide: any, index: number) => {
        const headline = s(slide?.headline).replace(/\s*\n\s*/g, ' ');
        const body = s(slide?.body).replace(/\s*\n\s*/g, ' ');
        const role = index === 0 ? 'hook' : index === plan.appPosition ? 'cta' : 'skill';
        return { n: index + 1, role, headline, text: [headline, body].filter(Boolean).join('\n\n'), image_query: s(slide?.image_query) };
    });
    return {
        slides,
        topic_seed: '',
        variety: { archetype: { id: 'endo_hacks_hook', label: hook.label }, domain: { id: 'endo_hacks_situation', label: `${territory.label} · app angle: ${angle.label}` } },
        save_trigger: s(parsed.save_trigger),
        title: buildTitle(parsed.title, slides),
        hashtags: buildEndoHashtags(parsed.hashtags),
        caption: s(parsed.caption),
        description: buildDescription(parsed.description),
        pinned_comment: s(parsed.pinned_comment),
        language: 'de',
    };
}
