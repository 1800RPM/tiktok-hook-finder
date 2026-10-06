// Batch tab: generate N posts for one TikTok account, review them one by one, and send the
// approved ones through post-bridge straight into TikTok's drafts. Both formats render in the
// browser (fonts, canvas and the photo library already live here), so the server only uploads
// PNGs and calls post-bridge.
//
// Slideshow posts reuse the Slideshows tab: its generator endpoint, its photo folders (the
// hook folder chosen there, pink/green step themes) and renderSsSlideToCanvas. Meme posts
// reuse the Meme Slides tab: its endpoint and settings, plus a headless MemeCanvasEditor for
// the AI image arrangement, so the meme draft open in that tab is never touched.
(() => {
    'use strict';
    const STORE_KEY = 'batch_posts_v1';
    // Every batch post is written by one model, whatever the Slideshows and Meme Slides tabs
    // use for single posts. Sonnet 5.5 costs about 40% of Opus 5 per post.
    const BATCH_MODEL = 'claude-sonnet-5-5';
    const FORMATS = [
        { id: 'ss:hacks', label: 'Slideshow · Weird hacks', kind: 'ss', format: 'hacks' },
        { id: 'ss:current', label: 'Slideshow · Current', kind: 'ss', format: 'current' },
        { id: 'ss:simple', label: 'Slideshow · Simple listicle', kind: 'ss', format: 'simple' },
        { id: 'ss:dbt', label: 'Slideshow · DBT listicle', kind: 'ss', format: 'dbt' },
        { id: 'ss:meme', label: 'Slideshow · Everyday', kind: 'ss', format: 'meme' },
        { id: 'meme', label: 'Meme Slides · bpd cat', kind: 'meme' },
    ];
    const STATUS_LABEL = { queued: 'Queued', generating: 'Writing', ready: 'To review', failed: 'Failed', approved: 'Approved', rejected: 'Rejected', sending: 'Sending', sent: 'Sent as draft' };

    const $ = (id) => document.getElementById(`batch-${id}`);
    let posts = load();
    let channels = [];
    let currentId = null;
    let currentSlide = 0;
    let running = false;
    const previews = new Map();      // post id -> array of image URLs, rebuilt on demand
    const imageCache = new Map();    // "set|name" -> data URL
    const listCache = new Map();     // set -> filenames
    let memeEditor = null;
    let editorLock = Promise.resolve();

    function load() {
        try {
            const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
            // A reload mid-generation leaves posts that will never finish.
            return Array.isArray(list) ? list.map((p) => (['queued', 'generating', 'sending'].includes(p.status) ? { ...p, status: p.status === 'sending' ? 'approved' : 'failed', error: p.status === 'sending' ? '' : 'Interrupted by a page reload.' } : p)) : [];
        } catch { return []; }
    }
    function save() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(posts)); }
        catch { notify('Browser storage is full. Clear sent or rejected posts.', 'error'); }
    }
    const notify = (text, type = 'info') => (typeof showNotification === 'function' ? showNotification(text, type) : console.log(text));
    const post = (id) => posts.find((p) => p.id === id);
    const reviewable = () => posts.filter((p) => ['ready', 'approved', 'rejected', 'sent', 'failed'].includes(p.status));
    const channelName = (id) => channels.find((c) => c.id === id)?.name || 'Unknown account';
    const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);

    async function api(route, options = {}) {
        const response = await fetch(`${API_BASE}${route}`, { ...options, headers: { ...(options.headers || {}), ...getApiAuthHeaders() } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
        return data;
    }
    async function imageData(set, name) {
        const key = `${set}|${name}`;
        if (!imageCache.has(key)) imageCache.set(key, await ssFetchImageAsDataUrl(set, name));
        return imageCache.get(key);
    }
    async function folderImages(set) {
        if (!listCache.has(set)) listCache.set(set, (await api(`/image-library/images?set=${encodeURIComponent(set)}`)).images || []);
        return listCache.get(set);
    }

    // The headless editor is shared, so every load/arrange/render on it runs one at a time.
    function withEditor(task) {
        const run = editorLock.then(async () => {
            memeEditor ??= new MemeCanvasEditor(() => {}, { prefix: 'batch-meme-art', artwork: 'batch-meme-artwork', panel: '#batch-no-panel', headless: true });
            return task(memeEditor);
        });
        editorLock = run.catch(() => {});
        return run;
    }
    function loadIntoEditor(editor, p) {
        editor.scenes = JSON.parse(JSON.stringify(p.scenes || []));
        editor.index = 0;
        editor.setSlides(p.slides);
    }

    // ---- Generation ---------------------------------------------------------------------------
    async function ensureSsLibrary() {
        if (!state.ssLibraryLoaded) { state.ssLibraryLoaded = true; await loadSsLibrarySets(); }
        if (!state.ssHookImages?.length) await loadSsHookImages();
        if (!state.ssStepPhotoSets?.length) throw new Error('No pink/green photo folders found. Open the Slideshows tab once to check the photo library.');
        if (!state.ssHookImages?.length) throw new Error('The hook photo folder is empty. Pick one in Slideshows → Photo library.');
    }

    async function generateSs(p, formatDef, language, batchTexts) {
        await ensureSsLibrary();
        const model = BATCH_MODEL;
        const data = await api('/generate-ss-slideshow', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: '', language, format: formatDef.format, model, previousTexts: [...loadSsSimpleHistory(), ...batchTexts] }),
        });
        const slides = Array.isArray(data.slides) ? data.slides : [];
        if (!slides.length) throw new Error('The generator returned no slides.');
        saveSsSimpleHistory(slides);
        batchTexts.push(...slides.map((s) => String(s.text || '')));
        // One pink or green theme per post, like the Slideshows tab, and the hook folder chosen there.
        const stepSet = state.ssStepPhotoSets[Math.floor(Math.random() * state.ssStepPhotoSets.length)].id;
        const steps = shuffle(await folderImages(stepSet));
        if (!steps.length) throw new Error('The step photo folder is empty.');
        const hookSet = state.ssHookSet, hooks = state.ssHookImages;
        Object.assign(p, {
            title: data.title || '', description: data.description || '', hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
            caption: data.caption || '', pinned: data.pinned_comment || '', stepSet, hookSet,
            // Starts from the Slideshows tab's style, then lives with the post.
            textStyle: currentTabStyle(),
            slides: slides.map((s, i) => ({
                text: String(s.text || ''), position: { x: 50, y: 50 }, ssTextScale: 1,
                ss: { n: s.n || i + 1, role: s.role, skill: s.skill || '' },
                imageRef: s.role === 'hook'
                    ? { set: hookSet, name: hooks[Math.floor(Math.random() * hooks.length)] }
                    : { set: stepSet, name: steps[i % steps.length] },
            })),
        });
    }

    async function generateMeme(p, language, batchTopics) {
        const tab = window.dbtMemeSlides;
        if (!tab) throw new Error('The Meme Slides tab did not load.');
        const settings = { ...tab.settings(), language, model: BATCH_MODEL };
        const data = await api(tab.endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...settings, previousTopics: [...tab.previousTopics(), ...batchTopics].slice(-50) }),
        });
        if (!Array.isArray(data.slides) || data.slides.length !== 7) throw new Error('The meme generator did not return seven slides.');
        batchTopics.push(data.slides[0].headline);
        tab.rememberTopic(data.slides[0].headline);
        Object.assign(p, { title: data.title || '', description: data.description || '', hashtags: Array.isArray(data.hashtags) ? data.hashtags : [], slides: data.slides });
        await withEditor(async (editor) => {
            editor.setSlides(p.slides, true);
            const ok = await editor.autoArrange();
            p.scenes = editor.serialize().scenes;
            if (!ok) p.warning = `Images were not placed: ${editor.$('status').textContent} Use "New images" in the review.`;
        });
    }

    async function startBatch() {
        if (running) return;
        const channelId = $('account').value, formatDef = FORMATS.find((f) => f.id === $('format').value);
        const count = Number($('count').value), language = $('language').value;
        if (!channelId) return notify('Pick a TikTok account first.', 'error');
        running = true; syncControls();
        const fresh = Array.from({ length: count }, () => ({
            id: crypto.randomUUID(), kind: formatDef.kind, formatId: formatDef.id, formatLabel: formatDef.label,
            channelId, language, status: 'queued', createdAt: Date.now(), slides: [],
        }));
        posts = [...posts, ...fresh]; save(); renderAll();
        const batchTexts = [], batchTopics = [];
        let cursor = 0;
        // Two at a time: fast enough for 10 posts, and each one still sees the texts and topics
        // of the posts finished before it, so the batch does not repeat itself.
        const worker = async () => {
            while (cursor < fresh.length) {
                const p = fresh[cursor++];
                p.status = 'generating'; save(); renderAll();
                try {
                    if (p.kind === 'ss') await generateSs(p, formatDef, language, batchTexts);
                    else await generateMeme(p, language, batchTopics);
                    p.status = 'ready';
                } catch (error) { p.status = 'failed'; p.error = error.message || 'Generation failed.'; }
                save(); renderAll();
            }
        };
        await Promise.all([worker(), worker()]);
        running = false; syncControls();
        const done = fresh.filter((p) => p.status === 'ready').length;
        notify(`${done} of ${count} posts ready to review.`, done ? 'success' : 'error');
        if (!currentId || !post(currentId)) openPost(fresh.find((p) => p.status === 'ready')?.id);
    }

    // ---- Rendering ----------------------------------------------------------------------------
    // Each post carries its own text style (font, colour, outline). The Slideshows tab keeps one
    // global style in its preview controls, which is what renderSsSlideToCanvas reads, so a
    // render swaps the post's style into those controls and puts the tab's own back afterwards.
    const SS_DEFAULT_STYLE = { fontFamily: 'TikTok Sans', textColor: '#ffffff', outlineEnabled: true };
    function currentTabStyle() {
        if (!state.textStyleCustomized) return { ...SS_DEFAULT_STYLE };
        const s = getTextOverlayStyleSettings();
        return { fontFamily: s.fontFamily, textColor: s.textColor, outlineEnabled: s.outlineEnabled };
    }
    const styleOf = (p) => ({ ...SS_DEFAULT_STYLE, ...(p.textStyle || {}) });
    async function withTextStyle(style, task) {
        const font = elements.previewTextFontFamilySelect, color = elements.previewTextColorInput, outline = elements.previewTextOutlineToggle;
        const saved = { font: font?.value, color: color?.value, outline: outline?.checked };
        if (font) font.value = style.fontFamily;
        if (color) color.value = style.textColor;
        if (outline) outline.checked = style.outlineEnabled;
        try { return await task(); }
        finally {
            if (font) font.value = saved.font;
            if (color) color.value = saved.color;
            if (outline) outline.checked = saved.outline;
        }
    }
    async function renderSsSlide(p, slide, type = 'image/jpeg') {
        slide.image = slide.imageRef ? await imageData(slide.imageRef.set, slide.imageRef.name) : null;
        // Batch posts always carry their text on the image; the native-text option is for the
        // Slideshows tab's manual export.
        const toggle = elements.ssNativeTextToggle, wasNative = Boolean(toggle?.checked);
        if (toggle) toggle.checked = false;
        try {
            const canvas = document.createElement('canvas');
            await withTextStyle(styleOf(p), () => renderSsSlideToCanvas(slide, canvas));
            return type === 'image/png'
                ? await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png'))
                : canvas.toDataURL('image/jpeg', 0.82);
        } finally { if (toggle) toggle.checked = wasNative; delete slide.image; }
    }
    // Same metrics as syncSsPreviewMetrics, but from the post's style instead of the tab's.
    function styleOverlay(frame, overlay, style) {
        const ratio = (frame.getBoundingClientRect().width || 380) / 1080;
        const fontStack = `"${style.fontFamily}", ${style.fontFamily === 'TikTok Sans' ? 'Arial, sans-serif' : '"TikTok Sans", Arial, sans-serif'}`;
        overlay.style.fontSize = `${49 * ratio}px`;
        overlay.style.setProperty('--ss-text-color', style.textColor);
        overlay.style.setProperty('--ss-font-family', fontStack);
        overlay.style.setProperty('--ss-outline-width', style.outlineEnabled ? `${Math.max(6, 49 * 0.17) * ratio}px` : '0px');
        overlay.style.setProperty('--ss-outline-color', style.outlineEnabled ? 'rgba(0, 0, 0, 0.96)' : 'transparent');
        overlay.style.setProperty('--ss-shadow-blur', style.outlineEnabled ? `${49 * 0.08 * ratio}px` : '0px');
        overlay.style.setProperty('--ss-shadow-offset', style.outlineEnabled ? `${49 * 0.05 * ratio}px` : '0px');
    }
    async function renderPreview(p, index) {
        if (p.kind === 'ss') return renderSsSlide(p, p.slides[index]);
        const blob = await withEditor(async (editor) => { loadIntoEditor(editor, p); return editor.png(index); });
        return URL.createObjectURL(blob);
    }
    async function ensurePreviews(p, only = null) {
        const list = previews.get(p.id) || [];
        previews.set(p.id, list);
        const indices = only === null ? p.slides.map((_, i) => i).filter((i) => !list[i]) : [only];
        for (const i of indices) {
            if (list[i]?.startsWith('blob:')) URL.revokeObjectURL(list[i]);
            try { list[i] = await renderPreview(p, i); } catch (error) { list[i] = ''; console.error('[Batch] preview', error); }
            if (p.id === currentId) renderStage();
        }
    }

    // ---- Review -------------------------------------------------------------------------------
    function openPost(id) {
        currentId = id || null; currentSlide = 0;
        renderAll();
        const p = post(currentId);
        if (p?.slides?.length) ensurePreviews(p);
    }
    function step(delta) {
        const list = reviewable();
        if (!list.length) return;
        const at = list.findIndex((p) => p.id === currentId);
        openPost(list[(at + delta + list.length) % list.length].id);
    }
    function decide(status) {
        const p = post(currentId);
        if (!p || !['ready', 'approved', 'rejected'].includes(p.status)) return;
        p.status = p.status === status ? 'ready' : status;
        save();
        // Move on to the next post still waiting for a decision.
        const next = reviewable().find((q) => q.status === 'ready' && q.id !== p.id);
        if (p.status !== 'ready' && next) openPost(next.id); else renderAll();
    }

    let rerenderTimer = null;
    function scheduleRerender(p, index) {
        clearTimeout(rerenderTimer);
        rerenderTimer = setTimeout(() => ensurePreviews(p, index), 350);
    }

    async function newImage() {
        const p = post(currentId); if (!p) return;
        const button = $('new-image'); button.disabled = true;
        try {
            if (p.kind === 'ss') {
                const slide = p.slides[currentSlide];
                const isHook = slide.ss.role === 'hook';
                const set = isHook ? (p.hookSet || state.ssHookSet) : p.stepSet;
                const options = (await folderImages(set)).filter((name) => name !== slide.imageRef?.name);
                if (!options.length) throw new Error('No other photo in this folder.');
                slide.imageRef = { set, name: options[Math.floor(Math.random() * options.length)] };
            } else {
                if (p.slides[currentSlide].role === 'cta') throw new Error('The app slide is fixed artwork.');
                await withEditor(async (editor) => {
                    loadIntoEditor(editor, p);
                    const ok = await editor.autoArrange(currentSlide);
                    if (!ok) throw new Error(editor.$('status').textContent || 'Image selection failed.');
                    p.scenes = editor.serialize().scenes;
                });
                delete p.warning;
            }
            save(); await ensurePreviews(p, currentSlide);
        } catch (error) { notify(error.message, 'error'); }
        finally { button.disabled = false; }
    }

    // ---- Sending ------------------------------------------------------------------------------
    async function sendApproved() {
        const queue = posts.filter((p) => p.status === 'approved');
        if (!queue.length) return notify('Approve at least one post first.', 'error');
        const status = await api('/publish/status').catch(() => ({}));
        if (!status.storage) return notify('Image hosting is not set up: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server/.env and restart the server.', 'error');
        $('send').disabled = true;
        let sent = 0;
        for (const p of queue) {
            p.status = 'sending'; save(); renderAll();
            try {
                const folder = `batch/${new Date().toISOString().slice(0, 10)}/${p.id}`;
                const urls = [];
                for (let i = 0; i < p.slides.length; i++) {
                    const blob = p.kind === 'ss'
                        ? await renderSsSlide(p, p.slides[i], 'image/png')
                        : await withEditor(async (editor) => { loadIntoEditor(editor, p); return editor.png(i); });
                    const { url } = await api(`/publish/upload?path=${encodeURIComponent(`${folder}/slide-${i + 1}.png`)}`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob });
                    urls.push(url);
                }
                // The title travels in its own TikTok field, so the caption is description + tags.
                const text = [p.description, (p.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
                const { post: draft } = await api('/publish/draft', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channelId: p.channelId, text: text || p.title || ' ', title: p.title, imageUrls: urls }),
                });
                Object.assign(p, { status: 'sent', draftId: draft.id, sentAt: Date.now() }); delete p.error;
                sent++;
            } catch (error) { p.status = 'approved'; p.error = `Not sent: ${error.message}`; }
            save(); renderAll();
        }
        $('send').disabled = false;
        notify(`${sent} of ${queue.length} posts sent as drafts.`, sent === queue.length ? 'success' : 'error');
    }

    function clearFinished() {
        const before = posts.length;
        posts = posts.filter((p) => !['sent', 'rejected', 'failed'].includes(p.status));
        for (const id of [...previews.keys()]) if (!post(id)) previews.delete(id);
        if (!post(currentId)) currentId = null;
        save(); renderAll();
        notify(`${before - posts.length} posts cleared.`, 'info');
    }

    // ---- Views --------------------------------------------------------------------------------
    function el(tag, props = {}, children = []) {
        const node = Object.assign(document.createElement(tag), props);
        node.append(...children);
        return node;
    }
    function syncControls() {
        $('generate').disabled = running || !channels.length;
        $('generate').textContent = running ? 'Generating…' : 'Generate batch';
        const approved = posts.filter((p) => p.status === 'approved').length;
        $('send').disabled = !approved || running;
        $('send').textContent = approved ? `Send ${approved} as drafts` : 'Send as drafts';
    }
    function renderQueue() {
        const counts = posts.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {});
        $('summary').textContent = posts.length
            ? [['ready', 'to review'], ['approved', 'approved'], ['sent', 'sent'], ['rejected', 'rejected'], ['failed', 'failed'], ['generating', 'writing'], ['queued', 'queued']]
                .filter(([k]) => counts[k]).map(([k, label]) => `${counts[k]} ${label}`).join(' / ')
            : '';
        const list = $('queue'); list.replaceChildren();
        if (!posts.length) {
            list.append(el('p', { className: 'batch-empty', textContent: 'No posts yet. Pick an account, a format and a count, then generate.' }));
            return;
        }
        posts.forEach((p, i) => {
            const item = el('button', { type: 'button', className: `batch-chip is-${p.status}${p.id === currentId ? ' is-current' : ''}`, title: p.error || p.formatLabel });
            item.disabled = ['queued', 'generating'].includes(p.status);
            item.append(el('span', { className: 'batch-chip-n', textContent: String(i + 1) }),
                el('span', { className: 'batch-chip-text', textContent: p.slides?.[0] ? (p.kind === 'ss' ? p.slides[0].text.split('\n')[0] : p.slides[0].headline) : p.formatLabel }),
                el('span', { className: 'batch-chip-status', textContent: STATUS_LABEL[p.status] || p.status }));
            item.addEventListener('click', () => openPost(p.id));
            // The remove button sits beside the chip, not inside it: a button cannot hold a button.
            const remove = el('button', { type: 'button', className: 'batch-chip-remove', textContent: '×', title: 'Remove this post' });
            remove.setAttribute('aria-label', `Remove post ${i + 1}`);
            remove.disabled = p.status === 'sending';
            remove.addEventListener('click', (event) => { event.stopPropagation(); removePost(p.id); });
            list.append(el('div', { className: 'batch-chip-row' }, [item, remove]));
        });
    }
    // Drops the post from the queue only. A post already sent stays in TikTok's inbox.
    function removePost(id) {
        const index = posts.findIndex((p) => p.id === id);
        if (index < 0) return;
        for (const url of previews.get(id) || []) if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
        previews.delete(id);
        posts.splice(index, 1);
        save();
        if (currentId === id) {
            const list = reviewable();
            openPost((list.find((p) => p.status === 'ready') || list[Math.min(index, list.length - 1)])?.id);
        } else renderAll();
    }
    function field(labelText, value, onInput, rows = 2) {
        const input = el('textarea', { className: 'prompt-textarea', rows, value: value || '' });
        input.addEventListener('input', () => onInput(input.value));
        return el('label', { className: 'batch-field' }, [el('span', { textContent: labelText }), input]);
    }
    // Slideshow slides are reviewed on a live layer like the Slideshows tab: the photo with the
    // text as draggable DOM on top, so moving and resizing needs no re-render. The strip keeps
    // the canvas renders, which are what actually gets uploaded.
    let stageKey = '';
    function renderSsStage(p) {
        const stage = $('stage'), slide = p.slides[currentSlide];
        const key = `${p.id}|${currentSlide}|${slide.imageRef?.set}|${slide.imageRef?.name}`;
        if (key === stageKey && stage.querySelector('.batch-ss-stage')) return;
        stageKey = key;
        // Not .ss-slide-preview: the tab's own metrics sync would restyle this layer with its style.
        const frame = el('div', { className: 'batch-ss-stage' });
        const overlay = el('div', { className: 'ss-overlay-text selected', title: 'Drag to move. Double-click to reset.' });
        overlay.innerHTML = ssOverlayParasHtml(slide.text);
        placeOverlay(overlay, slide);
        frame.append(overlay);
        stage.replaceChildren(frame);
        styleOverlay(frame, overlay, styleOf(p));
        if (slide.imageRef) {
            imageData(slide.imageRef.set, slide.imageRef.name).then((src) => {
                if (stageKey !== key) return;
                frame.prepend(el('img', { src, alt: `Photo for slide ${currentSlide + 1}` }));
            }).catch(() => notify('This photo could not load. Pick another one.', 'error'));
        }
        overlay.addEventListener('pointerdown', (event) => {
            if (['sent', 'sending'].includes(p.status) || event.button !== 0) return;
            const rect = frame.getBoundingClientRect(), start = { x: event.clientX, y: event.clientY }, from = { ...(slide.position || { x: 50, y: 50 }) };
            overlay.setPointerCapture(event.pointerId);
            const move = (e) => {
                slide.position = {
                    x: Math.max(0, Math.min(100, from.x + (e.clientX - start.x) / rect.width * 100)),
                    y: Math.max(0, Math.min(100, from.y + (e.clientY - start.y) / rect.height * 100)),
                };
                placeOverlay(overlay, slide);
            };
            const end = () => {
                overlay.removeEventListener('pointermove', move);
                save(); ensurePreviews(p, currentSlide);
            };
            overlay.addEventListener('pointermove', move);
            overlay.addEventListener('pointerup', end, { once: true });
            overlay.addEventListener('pointercancel', end, { once: true });
            event.preventDefault();
        });
        overlay.addEventListener('dblclick', () => {
            slide.position = { x: 50, y: 50 }; slide.ssTextScale = 1;
            placeOverlay(overlay, slide); save(); renderReview(); ensurePreviews(p, currentSlide);
        });
    }
    function placeOverlay(overlay, slide) {
        const pos = slide.position || { x: 50, y: 50 };
        overlay.style.left = `${pos.x}%`; overlay.style.top = `${pos.y}%`;
        overlay.style.transform = `translate(-50%, -50%) scale(${slide.ssTextScale || 1})`;
    }
    function refreshSsOverlay() {
        const p = post(currentId), overlay = $('stage').querySelector('.batch-ss-stage .ss-overlay-text');
        if (!p || p.kind !== 'ss' || !overlay) return;
        const slide = p.slides[currentSlide];
        overlay.innerHTML = ssOverlayParasHtml(slide.text);
        placeOverlay(overlay, slide);
    }

    function renderStage() {
        const p = post(currentId);
        const stage = $('stage'), strip = $('strip');
        if (!p || !p.slides?.length) {
            stageKey = '';
            stage.replaceChildren(el('p', { className: 'batch-empty', textContent: p?.status === 'failed' ? `This post failed: ${p.error}` : 'Select a post on the left to review it.' }));
            strip.replaceChildren();
            return;
        }
        const urls = previews.get(p.id) || [];
        const url = urls[currentSlide];
        if (p.kind === 'ss') renderSsStage(p);
        else {
            stageKey = '';
            stage.replaceChildren(url
                ? el('img', { src: url, alt: `Slide ${currentSlide + 1} of post`, className: 'batch-stage-img is-meme' })
                : el('div', { className: 'batch-stage-skeleton is-meme', textContent: url === '' ? 'Preview failed' : 'Rendering…' }));
        }
        strip.replaceChildren(...p.slides.map((_, i) => {
            const b = el('button', { type: 'button', className: `batch-thumb${i === currentSlide ? ' is-current' : ''}`, title: `Slide ${i + 1}` });
            b.setAttribute('aria-label', `Show slide ${i + 1}`);
            if (urls[i]) b.append(el('img', { src: urls[i], alt: '' })); else b.textContent = String(i + 1);
            b.addEventListener('click', () => { currentSlide = i; renderReview(); });
            return b;
        }));
    }
    function renderReview() {
        renderStage();
        const p = post(currentId), panel = $('editor');
        panel.replaceChildren();
        const list = reviewable();
        $('position').textContent = p ? `Post ${list.findIndex((q) => q.id === p.id) + 1} of ${list.length}` : '';
        if (!p || !p.slides?.length) return;
        const locked = ['sent', 'sending'].includes(p.status);
        const slide = p.slides[currentSlide];
        panel.append(el('div', { className: 'batch-editor-head' }, [
            el('strong', { textContent: `${channelName(p.channelId)} · ${p.formatLabel}` }),
            el('span', { className: `batch-badge is-${p.status}`, textContent: STATUS_LABEL[p.status] }),
        ]));
        if (p.warning) panel.append(el('p', { className: 'batch-warning', textContent: p.warning }));
        if (p.error && p.status !== 'failed') panel.append(el('p', { className: 'batch-warning', textContent: p.error }));
        panel.append(el('h3', { className: 'batch-subhead', textContent: `Slide ${currentSlide + 1} of ${p.slides.length}` }));
        if (p.kind === 'ss') {
            panel.append(field('Slide text (blank line between headline and body)', slide.text, (v) => { slide.text = v; save(); refreshSsOverlay(); scheduleRerender(p, currentSlide); }, 6));
            const size = el('input', { type: 'range', min: '50', max: '170', step: '5', value: String(Math.round((slide.ssTextScale || 1) * 100)) });
            const sizeValue = el('span', { className: 'batch-range-value', textContent: `${size.value}%` });
            size.addEventListener('input', () => {
                slide.ssTextScale = Number(size.value) / 100; sizeValue.textContent = `${size.value}%`;
                refreshSsOverlay(); save(); scheduleRerender(p, currentSlide);
            });
            size.disabled = locked;
            panel.append(el('label', { className: 'batch-field batch-range' }, [el('span', { textContent: 'Text size' }), el('div', {}, [size, sizeValue])]),
                el('p', { className: 'batch-hint', textContent: 'Drag the text on the slide to move it. Double-click it to reset position and size.' }));
            if (slide.ss.role === 'hook') panel.append(hookPicker(p, slide, locked));
        } else {
            const keys = [['headline', 'Headline'], ['body', slide.role === 'hook' ? 'Subtitle' : 'Explanation']];
            if (slide.role === 'point') keys.push(['leftLabel', 'Left caption'], ['rightLabel', 'Right caption']);
            for (const [key, labelText] of keys) panel.append(field(labelText, slide[key], (v) => { slide[key] = v; save(); scheduleRerender(p, currentSlide); }, key === 'body' ? 3 : 2));
        }
        const imageButton = el('button', { type: 'button', id: 'batch-new-image', className: 'btn btn-secondary', textContent: p.kind === 'ss' ? 'New photo' : 'New images' });
        imageButton.disabled = locked || (p.kind === 'meme' && slide.role === 'cta');
        imageButton.addEventListener('click', () => newImage());
        panel.append(imageButton);
        panel.append(el('h3', { className: 'batch-subhead', textContent: 'Post details' }));
        if (p.kind === 'ss' && state.ssStepPhotoSets?.length) {
            const theme = el('select', { className: 'select-input' });
            theme.append(...state.ssStepPhotoSets.map((s) => new Option(/pink$/i.test(s.id) ? 'Pink skies' : 'Green fields', s.id)));
            theme.value = p.stepSet;
            theme.disabled = locked;
            theme.addEventListener('change', () => changeTheme(p, theme.value));
            panel.append(el('label', { className: 'batch-field' }, [el('span', { textContent: 'Photo theme for slides 2 onwards' }), theme]));
        }
        if (p.kind === 'ss') panel.append(textStylePicker(p, locked));
        panel.append(field('Title', p.title, (v) => { p.title = v; save(); }, 1));
        panel.append(field('Description', p.description, (v) => { p.description = v; save(); }, 3));
        panel.append(field('Hashtags', (p.hashtags || []).join(' '), (v) => { p.hashtags = v.split(/\s+/).filter(Boolean); save(); }, 1));
        const approve = el('button', { type: 'button', className: 'btn btn-primary', textContent: p.status === 'approved' ? 'Approved (A)' : 'Approve (A)' });
        const reject = el('button', { type: 'button', className: 'btn btn-secondary', textContent: p.status === 'rejected' ? 'Rejected (X)' : 'Reject (X)' });
        approve.disabled = reject.disabled = locked || p.status === 'failed';
        approve.addEventListener('click', () => decide('approved'));
        reject.addEventListener('click', () => decide('rejected'));
        panel.append(el('div', { className: 'batch-decide' }, [approve, reject]));
        panel.querySelectorAll('textarea').forEach((t) => { t.disabled = locked; });
    }
    // Slide 1 can take any photo from any hook folder, like the Slideshows tab's picker.
    let hookSets = null;
    async function hookFolders() {
        hookSets ??= ((await api('/image-library')).sets || []).filter((s) => /hook/i.test(s.id));
        return hookSets;
    }
    function hookPicker(p, slide, locked) {
        const wrap = el('div', { className: 'batch-hook-picker' });
        const select = el('select', { className: 'select-input' });
        const grid = el('div', { className: 'ss-library-grid batch-hook-grid' });
        const more = el('button', { type: 'button', className: 'btn ss-btn-quiet btn-sm', hidden: true });
        let expanded = false;
        const folderName = (id) => { const name = String(id).split(/[\\/]/).pop() || id; return name.charAt(0).toUpperCase() + name.slice(1); };
        async function fill() {
            const set = select.value;
            const names = await folderImages(set);
            const visible = expanded ? names : names.slice(0, 12);
            grid.replaceChildren(...visible.map((name) => {
                const button = el('button', { type: 'button', className: `ss-library-thumb-wrap${slide.imageRef?.set === set && slide.imageRef?.name === name ? ' is-selected' : ''}`, title: 'Use this photo on slide 1' });
                button.disabled = locked;
                button.append(el('img', { className: 'ss-library-thumb', loading: 'lazy', src: ssLibraryFileUrl(set, name), alt: `Hook photo ${name}` }));
                button.addEventListener('click', () => {
                    slide.imageRef = { set, name }; p.hookSet = set; save();
                    grid.querySelectorAll('.is-selected').forEach((b) => b.classList.remove('is-selected'));
                    button.classList.add('is-selected');
                    renderStage(); ensurePreviews(p, currentSlide);
                });
                return button;
            }));
            if (!names.length) grid.append(el('p', { className: 'batch-hint', textContent: 'No photos in this folder.' }));
            more.hidden = names.length <= 12;
            more.textContent = expanded ? 'Show fewer' : `Show all ${names.length}`;
        }
        hookFolders().then((sets) => {
            select.append(...sets.map((s) => new Option(`${folderName(s.id)} (${s.count})`, s.id)));
            select.value = slide.imageRef?.set && sets.some((s) => s.id === slide.imageRef.set) ? slide.imageRef.set : sets[0]?.id || '';
            if (select.value) fill().catch(() => {});
        }).catch(() => grid.append(el('p', { className: 'batch-hint', textContent: 'Hook folders could not load.' })));
        select.disabled = locked;
        select.addEventListener('change', () => { expanded = false; fill().catch(() => {}); });
        more.addEventListener('click', () => { expanded = !expanded; fill().catch(() => {}); });
        wrap.append(el('label', { className: 'batch-field' }, [el('span', { textContent: 'Hook photo folder' }), select]), grid, more);
        return wrap;
    }
    // Font, colour and outline for every slide of this post, with the Slideshows tab's font list.
    function textStylePicker(p, locked) {
        const style = styleOf(p);
        const font = el('select', { className: 'select-input' });
        const fonts = [...(elements.previewTextFontFamilySelect?.options || [])].map((o) => o.value);
        font.append(...(fonts.length ? fonts : ['TikTok Sans']).map((name) => new Option(name, name)));
        font.value = style.fontFamily;
        const color = el('input', { type: 'color', value: style.textColor, className: 'batch-color' });
        color.setAttribute('aria-label', 'Text colour');
        const outline = el('input', { type: 'checkbox', checked: style.outlineEnabled });
        let timer = null;
        const apply = () => {
            p.textStyle = { fontFamily: font.value, textColor: color.value, outlineEnabled: outline.checked };
            save();
            const frame = $('stage').querySelector('.batch-ss-stage'), overlay = frame?.querySelector('.ss-overlay-text');
            if (frame && overlay) styleOverlay(frame, overlay, p.textStyle);
            // Every slide changes, so the strip re-renders once the picking has settled.
            clearTimeout(timer);
            timer = setTimeout(() => { previews.set(p.id, []); ensurePreviews(p); }, 400);
        };
        for (const input of [font, color, outline]) { input.disabled = locked; input.addEventListener('input', apply); input.addEventListener('change', apply); }
        return el('div', { className: 'batch-field' }, [
            el('span', { textContent: 'Text style for all slides' }),
            el('div', { className: 'batch-style-row' }, [
                font,
                color,
                el('label', { className: 'batch-check' }, [outline, el('span', { textContent: 'Outline' })]),
            ]),
        ]);
    }
    async function changeTheme(p, set) {
        try {
            const steps = shuffle(await folderImages(set));
            if (!steps.length) throw new Error('That photo folder is empty.');
            p.stepSet = set;
            p.slides.forEach((slide, i) => { if (slide.ss.role !== 'hook') slide.imageRef = { set, name: steps[i % steps.length] }; });
            save();
            previews.set(p.id, []);
            renderStage(); await ensurePreviews(p);
        } catch (error) { notify(error.message, 'error'); }
    }
    function renderChannels() {
        const select = $('account');
        const previous = select.value || localStorage.getItem('batch_channel') || '';
        const tiktok = channels.filter((c) => c.service === 'tiktok').sort((a, b) => a.name.localeCompare(b.name));
        select.replaceChildren(...(tiktok.length
            ? tiktok.map((c) => new Option(`${c.name}${c.needsReconnect ? ' (reconnect in post-bridge)' : ''}`, c.id))
            : [new Option('No TikTok accounts found', '')]));
        if (tiktok.some((c) => c.id === previous)) select.value = previous;
    }
    function renderAll() { renderQueue(); renderReview(); syncControls(); }

    async function init() {
        if (init.done) return;
        init.done = true;
        $('format').replaceChildren(...FORMATS.map((f) => new Option(f.label, f.id)));
        try { const savedFormat = localStorage.getItem('batch_format'); if (FORMATS.some((f) => f.id === savedFormat)) $('format').value = savedFormat; } catch { /* storage blocked */ }
        $('format').addEventListener('change', () => { try { localStorage.setItem('batch_format', $('format').value); } catch { /* storage blocked */ } });
        $('account').addEventListener('change', () => { try { localStorage.setItem('batch_channel', $('account').value); } catch { /* storage blocked */ } });
        $('generate').addEventListener('click', startBatch);
        $('send').addEventListener('click', sendApproved);
        $('clear').addEventListener('click', clearFinished);
        $('prev').addEventListener('click', () => step(-1));
        $('next').addEventListener('click', () => step(1));
        document.addEventListener('keydown', (event) => {
            if (document.body.dataset.service !== 'batch' || event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
            if (event.key === 'ArrowRight') step(1);
            else if (event.key === 'ArrowLeft') step(-1);
            else if (event.key === 'ArrowDown') { const p = post(currentId); if (p) { currentSlide = Math.min(p.slides.length - 1, currentSlide + 1); renderReview(); } }
            else if (event.key === 'ArrowUp') { if (post(currentId)) { currentSlide = Math.max(0, currentSlide - 1); renderReview(); } }
            else if (event.key.toLowerCase() === 'a') decide('approved');
            else if (event.key.toLowerCase() === 'x') decide('rejected');
            else return;
            event.preventDefault();
        });
        renderAll();
        $('connection').textContent = 'Loading TikTok accounts…';
        try {
            const result = await api('/publish/channels');
            channels = result.channels || [];
            const status = await api('/publish/status');
            const count = channels.filter((c) => c.service === 'tiktok').length;
            $('connection').textContent = [
                count ? `${count} TikTok account${count === 1 ? '' : 's'} connected via post-bridge.` : 'No TikTok accounts connected in post-bridge.',
                status.storage ? '' : 'Sending needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env.',
            ].filter(Boolean).join(' ');
        } catch (error) { $('connection').textContent = `Accounts could not load: ${error.message}`; }
        renderChannels(); syncControls();
        if (!currentId) openPost(reviewable().find((p) => p.status === 'ready')?.id || reviewable()[0]?.id);
    }

    document.querySelectorAll('.service-btn[data-service="batch"]').forEach((button) => button.addEventListener('click', () => init()));
    if (document.body.dataset.service === 'batch') init();
})();
