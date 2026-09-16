// One factory, one call per app. The DBT-Mind call at the bottom keeps its original ids,
// storage key and endpoint; bfrb-slides.js calls it again for BFRB Ally.
window.createMemeSlides = (cfg) => {
    const storageKey = cfg.storageKey;
    const $ = (id) => document.getElementById(`${cfg.prefix}-${id}`);
    const settingNames = cfg.settingNames;
    let previousTopics = [];
    let slides = [];
    // TikTok metadata: never rendered on a slide, but part of the draft.
    let meta = { title: '', description: '', hashtags: [], sound: null };
    let soundShown = [];
    let soundAudio = null;
    let soundBusy = false;
    let soundCategory = '';
    let busy = false;
    const status = (message) => { $('status').textContent = message; };
    const settings = () => Object.fromEntries(settingNames.map((name) => [name, $(name).value]));
    const artwork = new MemeCanvasEditor(() => save(), cfg.canvas);
    function save() {
        try { localStorage.setItem(storageKey, JSON.stringify({ ...settings(), slides, meta, previousTopics, autoArt: $('auto-art').checked, artwork: artwork.serialize() })); }
        catch { status('Your draft is open, but browser storage is unavailable. Export it to keep a copy.'); }
    }
    function rememberTopic(topic) {
        if (typeof topic === 'string' && topic.trim()) previousTopics = [...new Set([...previousTopics, topic.trim()])].slice(-50);
    }
    // --- TikTok sound picker ---------------------------------------------------------------
    // The meme pool is a different profile from the slideshow one: library music rather than
    // moody indie. Choosing by ear is the point, so the card exists to make listening one click.
    const soundCount = (value) => {
        const n = Number(value) || 0;
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
        return n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(n);
    };
    function stopSound() {
        if (soundAudio) { soundAudio.pause(); soundAudio = null; }
        $('sound-list').querySelectorAll('.ss-sound-play').forEach((button) => {
            button.textContent = '▶';
            button.dataset.playing = 'false';
        });
    }
    function toggleSound(sound, button) {
        const wasPlaying = soundAudio && soundAudio.dataset.soundId === sound.id && !soundAudio.paused;
        stopSound();
        if (wasPlaying) return;
        // An <audio> element cannot set request headers, so the key rides in the query string.
        const apiKey = (localStorage.getItem('TIKTOK_API_KEY') || localStorage.getItem('TIKTOK_API_PASSWORD') || '').trim();
        const audio = new Audio(`${API_BASE}/ss-sounds/audio?id=${encodeURIComponent(sound.id)}${apiKey ? `&key=${encodeURIComponent(apiKey)}` : ''}`);
        audio.dataset.soundId = sound.id;
        audio.addEventListener('ended', stopSound);
        audio.addEventListener('error', () => { stopSound(); status('Dieser Sound lässt sich nicht abspielen. Wähle einen anderen.'); });
        soundAudio = audio;
        button.textContent = '❚❚';
        button.dataset.playing = 'true';
        audio.play().catch(() => { stopSound(); status('Wiedergabe blockiert. Klicke die Seite einmal an und versuche es erneut.'); });
    }
    // Chips rather than a dropdown: five short labels, one tap to switch. A category with
    // nothing in it is shown disabled instead of hidden, so the set stays in the same place.
    function renderSoundFilters(categories) {
        const row = $('sound-filters');
        if (!row || !categories) return;
        row.replaceChildren();
        const all = [{ id: '', label: 'Alle', hint: 'alle passenden Sounds', count: null }, ...categories];
        for (const entry of all) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'ss-sound-chip';
            chip.textContent = entry.count === null ? entry.label : `${entry.label} ${entry.count}`;
            chip.title = entry.hint || '';
            chip.setAttribute('aria-pressed', String(soundCategory === entry.id));
            chip.disabled = entry.count === 0;
            chip.addEventListener('click', () => {
                soundCategory = soundCategory === entry.id ? '' : entry.id;
                soundShown = [];
                loadSounds().catch(() => {});
            });
            row.append(chip);
        }
    }
    function renderSounds(sounds) {
        const list = $('sound-list');
        if (!list) return;
        soundShown = sounds || [];
        list.replaceChildren();
        // Keep a chosen sound on screen even when it is not in the current draw, otherwise
        // refreshing looks like the selection was lost.
        const cards = [...soundShown];
        if (meta.sound && !cards.some((s) => s.id === meta.sound.id)) cards.unshift(meta.sound);
        for (const sound of cards) {
            const selected = meta.sound?.id === sound.id;
            const card = document.createElement('div');
            card.className = 'ss-sound-card';
            card.dataset.selected = String(selected);
            card.setAttribute('role', 'button');
            card.setAttribute('aria-pressed', String(selected));
            card.tabIndex = 0;

            const play = document.createElement('button');
            play.type = 'button';
            play.className = 'ss-sound-play';
            play.textContent = '▶';
            play.setAttribute('aria-label', `${sound.title} anhören`);
            play.addEventListener('click', (event) => { event.stopPropagation(); toggleSound(sound, play); });

            const main = document.createElement('div');
            main.className = 'ss-sound-main';
            const title = document.createElement('div');
            title.className = 'ss-sound-title';
            title.textContent = sound.title;
            const line = document.createElement('div');
            line.className = 'ss-sound-meta';
            line.textContent = [sound.artist, sound.duration ? `${sound.duration}s` : ''].filter(Boolean).join(' · ');
            const sub = document.createElement('div');
            sub.className = 'ss-sound-meta ss-sound-sub';
            sub.textContent = sound.plays ? `${soundCount(sound.plays)} Videos` : '';
            main.append(title, line);
            if (sub.textContent) main.append(sub);

            const check = document.createElement('span');
            check.className = 'ss-sound-check';
            check.textContent = selected ? '✓' : '';

            const pick = () => {
                meta.sound = { id: sound.id, title: sound.title, artist: sound.artist, link: sound.link };
                renderSounds(soundShown);
                save();
            };
            card.append(play, main, check);
            card.addEventListener('click', pick);
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(); }
            });
            list.append(card);
        }
    }
    async function loadSounds(refresh = false) {
        if (soundBusy || !$('sound-list')) return;
        soundBusy = true;
        stopSound();
        $('sound-refresh').disabled = true;
        $('sound-status').textContent = refresh ? 'Suche neue Sounds…' : 'Sounds werden geladen…';
        try {
            // Excluding what is on screen is what makes "Andere Vorschläge" show something new.
            const query = new URLSearchParams({ count: '3', flow: 'meme' });
            if (soundCategory) query.set('category', soundCategory);
            const exclude = soundShown.map((s) => s.id).join(',');
            if (exclude) query.set('exclude', exclude);
            if (refresh) query.set('refresh', '1');
            const response = await fetch(`${API_BASE}/ss-sounds?${query}`, { headers: getApiAuthHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Fehler ${response.status}`);
            renderSoundFilters(data.categories);
            renderSounds(data.sounds || []);
            const active = (data.categories || []).find((c) => c.id === soundCategory);
            $('sound-status').textContent = (data.sounds || []).length
                ? (active
                    ? `${active.count} Sounds in "${active.label}" · ${active.hint}.`
                    : `${data.poolSize} Sounds im Pool · instrumental, 40-70s, in Deutschland nutzbar.`)
                : 'Keine weiteren Sounds in dieser Kategorie. Wähle eine andere oder "Alle".';
        } catch (error) {
            $('sound-status').textContent = `Sounds konnten nicht geladen werden: ${error.message}`;
        } finally {
            soundBusy = false;
            $('sound-refresh').disabled = false;
        }
    }

    // Metadata is post copy, never slide copy, so it lives outside the slide cards.
    function renderMeta() {
        $('meta-group').hidden = !slides.length;
        // The canvas writes the zip, so it needs the current title, description and sound.
        artwork.metadata = meta;
        renderSounds(soundShown);
        const fields = [['title', meta.title], ['description', meta.description], ['hashtags', meta.hashtags.join(' ')]];
        for (const [id, value] of fields) if ($(id).value !== value) $(id).value = value;
    }
    function render() {
        renderMeta();
        artwork.setSlides(slides);
        $('slides').replaceChildren();
        slides.forEach((slide, index) => {
            const card = document.createElement('article');
            card.className = 'meme-card';
            const title = document.createElement('h3');
            title.textContent = `Slide ${index + 1} · ${slide.role === 'hook' ? 'Cover' : slide.role === 'cta' ? 'App CTA' : `Point ${index}`}`;
            card.append(title);
            const fields = [['headline', 'Headline'], ['body', slide.role === 'hook' ? 'Subtitle' : 'Explanation']];
            if (slide.role === 'point') fields.push(['leftLabel', 'Left image caption'], ['rightLabel', 'Right image caption']);
            const grid = document.createElement('div');
            grid.className = 'meme-fields';
            fields.forEach(([key, labelText]) => {
                const label = document.createElement('label');
                label.className = key === 'headline' || key === 'body' ? 'meme-wide' : '';
                label.textContent = labelText;
                const input = document.createElement('textarea');
                input.className = 'prompt-textarea';
                input.rows = key === 'body' ? 3 : 2;
                input.value = slide[key];
                input.id = `meme-slide-${index}-${key}`;
                label.htmlFor = input.id;
                const count = document.createElement('small');
                const updateCount = () => { count.textContent = `${input.value.trim().split(/\s+/).filter(Boolean).length} words`; };
                updateCount();
                input.addEventListener('input', () => { slide[key] = input.value; updateCount(); artwork.updateText(); save(); });
                label.append(input, count);
                grid.append(label);
            });
            card.append(grid);
            $('slides').append(card);
        });
        $('copy').disabled = $('export').disabled = slides.length === 0;
    }
    function isDraft(value) {
        return Array.isArray(value) && value.length === 7 && value.every((slide, i) =>
            slide && slide.role === (i === 0 ? 'hook' : i === 6 ? 'cta' : 'point') &&
            ['headline', 'body', 'leftLabel', 'rightLabel'].every((field) => typeof slide[field] === 'string'));
    }
    try {
        const draft = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (draft) {
            if (typeof draft.autoArt === 'boolean') $('auto-art').checked = draft.autoArt;
            previousTopics = Array.isArray(draft.previousTopics) ? draft.previousTopics.filter((topic) => typeof topic === 'string').slice(-50) : [];
            settingNames.forEach((name) => {
                if (typeof draft[name] === 'string' && ($(name).tagName !== 'SELECT' || [...$(name).options].some((option) => option.value === draft[name]))) $(name).value = draft[name];
            });
            if (cfg.migrateCats && $('theme').value.trim().toLowerCase() === 'cats') $('theme').value = 'bpd cat';
            if (isDraft(draft.slides)) {
                slides = draft.slides;
                meta = {
                    title: typeof draft.meta?.title === 'string' ? draft.meta.title : '',
                    description: typeof draft.meta?.description === 'string' ? draft.meta.description : '',
                    hashtags: Array.isArray(draft.meta?.hashtags) ? draft.meta.hashtags.filter((tag) => typeof tag === 'string') : [],
                    sound: draft.meta?.sound && typeof draft.meta.sound.id === 'string' ? draft.meta.sound : null,
                };
                artwork.restore(draft.artwork);
                if (cfg.migrateCats && slides[0].body.trim() === '(explained by cats)') slides[0].body = '(explained by bpd cat)';
                rememberTopic(slides[0].headline); render(); status('Saved draft restored. Edits save automatically in this browser.'); save();
            }
        }
    } catch { status('The saved draft could not be loaded. You can start a new one.'); }
    for (const id of ['title', 'description']) {
        $(id).addEventListener('input', () => { meta[id] = $(id).value; save(); });
    }
    $('hashtags').addEventListener('input', () => {
        meta.hashtags = $('hashtags').value.split(/\s+/).filter(Boolean);
        save();
    });
    $('sound-refresh').addEventListener('click', () => loadSounds(false).catch(() => {}));
    // Suggestions are available from the start: choosing a sound does not depend on a draft.
    loadSounds().catch(() => {});
    $('copy-meta').addEventListener('click', async () => {
        const text = [meta.description, meta.hashtags.join(' ')].filter(Boolean).join('\n\n');
        try { await navigator.clipboard.writeText(text); status('Description and hashtags copied.'); }
        catch { status('Clipboard access is unavailable. Copy the fields manually.'); }
    });
    settingNames.forEach((name) => $(name).addEventListener('input', save));
    $('auto-art').addEventListener('change', save);
    $('generate').addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        $('generate').disabled = $('example').disabled = true;
        settingNames.forEach((name) => { $(name).disabled = true; });
        $('generate').textContent = 'Generating…';
        // Keep the current draft available until a valid replacement has arrived.
        $('slides').querySelectorAll('textarea').forEach((input) => { input.disabled = true; });
        status('Choosing a fresh topic and writing seven slides. This can take a couple of minutes.');
        try {
            const response = await fetch(`${API_BASE}${cfg.endpoint}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
                body: JSON.stringify({ ...settings(), previousTopics }), signal: AbortSignal.timeout(330000),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Generation failed (${response.status}).`);
            if (!isDraft(data.slides)) throw new Error('The response did not contain the expected seven slides.');
            slides = data.slides;
            meta = {
                title: typeof data.title === 'string' ? data.title : '',
                description: typeof data.description === 'string' ? data.description : '',
                hashtags: Array.isArray(data.hashtags) ? data.hashtags.filter((tag) => typeof tag === 'string') : [],
                // The sound is the user's pick, not generated copy, and the picker is available
                // before a post exists. Clearing it here silently threw away a choice made a
                // minute earlier, which only showed up as a missing URL in the export.
                sound: meta.sound,
            };

            artwork.setSlides(slides, true);
            rememberTopic(slides[0].headline);
            render();
            status('Seven slides ready. Edit any field below. Edits save automatically in this browser.');
            save();
            if ($('auto-art').checked) {
                status('Slide text saved. Choosing matching cats and stickers…');
                await artwork.autoArrange();
                status('Slide text saved. Image selection status is shown in the editor.');
            }
        } catch (error) {
            status(`${error.name === 'TimeoutError' ? 'Generation timed out. Please retry.' : error.message} Your existing draft has been kept.`);
        } finally {
            busy = false;
            $('generate').disabled = $('example').disabled = false;
            settingNames.forEach((name) => { $(name).disabled = false; });
            $('generate').textContent = 'Generate slide text';
            $('slides').querySelectorAll('textarea').forEach((input) => { input.disabled = false; });
        }
    });
    if (cfg.example) $('example').addEventListener('click', () => {
        const point = (headline, body, leftLabel, rightLabel) => ({ role: 'point', headline, body, leftLabel, rightLabel });
        slides = [
            { role: 'hook', headline: '5 things DBT teaches that sound wrong at first', body: '(explained by bpd cat)', leftLabel: '', rightLabel: '' },
            point('1. You can accept something you hate', "Accepting what happened means starting from what's actually here. You can still hate it, disagree with it, and want it to change.", "so i'm supposed to like this?", 'i hate this. what now?'),
            point("2. Feeling guilty doesn't prove you did something wrong", "Saying no can feel awful, especially when you're used to saying yes. Before apologizing, check what you actually did.", 'i feel bad. i must be bad.', 'i literally just said no.'),
            point('3. Calling yourself lazy leaves out useful information', '“I opened the task, got overwhelmed, and closed it” gives you something specific to work on. “I’m useless” skips all those details.', 'my entire personality is the problem', 'okay. where did i get stuck?'),
            point("4. You don't have to pick one truth", 'You can love someone and need space. You can be doing better and have a terrible day. Both can be happening.', 'which one is it then', 'apparently both'),
            point("5. A skill can help while you're still upset", "You paused. You made one less impulsive choice. You're still crying. That doesn't erase the part where you did something differently.", 'still crying. skill failed.', 'still crying. took the pause.'),
            { role: 'cta', headline: 'okay but how do i actually practice this', body: 'DBT-Mind walks you through DBT skills step by step.\n\nthe cat requires instructions', leftLabel: '', rightLabel: '' },
        ];
        $('theme').value = 'bpd cat'; $('language').value = 'en'; $('notes').value = '';
        artwork.setSlides(slides, true);
        rememberTopic(slides[0].headline); render(); status('Approved example loaded. All text is editable.'); save();
    });
    $('copy').addEventListener('click', async () => {
        const soundLine = meta.sound
            ? `SOUND\n\n${[meta.sound.title, meta.sound.artist].filter(Boolean).join(' - ')}\n${meta.sound.link}`
            : '';
        const text = [slides.map((slide, index) => [`SLIDE ${index + 1}`, slide.headline, slide.body,
            ...(slide.role === 'point' ? [`Left: ${slide.leftLabel}`, `Right: ${slide.rightLabel}`] : [])].join('\n\n')).join('\n\n---\n\n'),
            ...(meta.title ? [`TITLE\n\n${meta.title}`] : []),
            ...(meta.description ? [`DESCRIPTION (paste in front of the hashtags)\n\n${meta.description}`] : []),
            ...(meta.hashtags.length ? [`HASHTAGS\n\n${meta.hashtags.join(' ')}`] : []),
            ...(soundLine ? [soundLine] : [])].join('\n\n---\n\n');
        try { await navigator.clipboard.writeText(text); status('All seven slides and the TikTok metadata copied.'); }
        catch { status('Clipboard access is unavailable. Use Export JSON to save the text.'); }
    });
    $('export').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify({ format: cfg.exportName, version: 1, ...settings(), topic: slides[0]?.headline || '', slides, meta, artwork: artwork.serialize() }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `${cfg.exportName}.json`;
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        status('Draft exported as JSON.');
    });
};

createMemeSlides({
    prefix: 'meme', storageKey: 'dbt-meme-slides-v1', endpoint: '/generate-meme-slideshow',
    settingNames: ['theme', 'notes', 'language', 'model'], exportName: 'meme-slides',
    migrateCats: true, example: true,
});
