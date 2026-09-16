(() => {
    'use strict';
    const W = 1080, H = 1350;
    // Everything that differs between apps. The defaults are the DBT-Mind meme flow; BFRB Ally
    // passes its own element prefix, gauges and closing slide.
    const DEFAULTS = {
        prefix: 'meme-art', artwork: 'meme-artwork', panel: '#panel-meme', filePrefix: 'meme-slide',
        low: 'assets/meme-slides/bpd_level_low.png',
        high: 'assets/meme-slides/bpd_level_high.png',
        gaugeLabel: 'BPD',
        // The closing slide is one finished image, identical in every post: heading, app card and cats are baked in.
        cta: 'assets/meme-slides/cta_slide.png',
    };
    const FONT = '"Meme TikTok", "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
    const radians = (degrees) => degrees * Math.PI / 180;
    const id = () => crypto.randomUUID();
    const validSrc = (src) => typeof src === 'string' && /^assets\/(?:meme|bfrb)-slides\//.test(src) && !src.includes('..');

    // Canvas exports carry no EXIF, but browsers differ in which ancillary PNG chunks they emit
    // (sRGB, pHYs, gAMA, and in principle tEXt/tIME). Keeping only the chunks needed to decode the
    // image makes every download byte-identical in intent regardless of the browser.
    const KEPT_CHUNKS = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
    async function stripMetadata(blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (bytes.length < 8 || signature.some((byte, i) => bytes[i] !== byte)) return blob;
        const view = new DataView(bytes.buffer), parts = [bytes.subarray(0, 8)];
        let offset = 8;
        while (offset + 8 <= bytes.length) {
            const length = view.getUint32(offset);
            const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
            const end = offset + 12 + length;
            if (end > bytes.length) return blob; // Truncated file: hand back the original untouched.
            if (KEPT_CHUNKS.has(type)) parts.push(bytes.subarray(offset, end));
            offset = end;
            if (type === 'IEND') break;
        }
        return new Blob(parts, { type: 'image/png' });
    }
    function localPoint(point, object) {
        const a = -radians(object.angle || 0), dx = point.x - object.x, dy = point.y - object.y;
        return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
    }
    function contains(point, object) {
        const p = localPoint(point, object);
        return Math.abs(p.x) <= object.w / 2 && Math.abs(p.y) <= object.h / 2;
    }
    function wrap(ctx, text, width) {
        const lines = [];
        for (const paragraph of text.split('\n')) {
            let line = '';
            for (const word of paragraph.split(/\s+/).filter(Boolean)) {
                // Split even a pasted unbroken word so exports cannot overflow.
                if (ctx.measureText(word).width > width) {
                    if (line) { lines.push(line); line = ''; }
                    for (const char of word) {
                        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
                        line += char;
                    }
                } else if (line && ctx.measureText(`${line} ${word}`).width > width) {
                    lines.push(line); line = word;
                } else line = line ? `${line} ${word}` : word;
            }
            lines.push(line);
        }
        return lines;
    }
    function textBlock(ctx, key, text, x, top, width, fontSize, maxHeight, weight) {
        let size = fontSize, lines;
        do {
            ctx.font = `${weight} ${size}px ${FONT}`;
            lines = wrap(ctx, text, width);
            if (lines.length * size * 1.12 <= maxHeight || size <= 12) break;
            size--;
        } while (size > 0);
        const h = lines.length * size * 1.12;
        return { id: key, kind: 'text', text, lines, x, y: top + h / 2, w: width, h, size, weight, angle: 0 };
    }
    function layout(ctx, slide) {
        if (slide.role === 'cta') return { texts: [], gaugeY: 0 };
        const hook = slide.role === 'hook';
        const headline = textBlock(ctx, 'headline', slide.headline, W / 2, hook ? 130 : 60, 980, hook ? 96 : 76, hook ? 330 : 190, 800);
        const body = textBlock(ctx, 'body', slide.body, W / 2, headline.y + headline.h / 2 + 28, 960, hook ? 52 : 49, hook ? 190 : 270, 600);
        const gaugeY = Math.max(hook ? 730 : 550, body.y + body.h / 2 + 145);
        const texts = [headline, body];
        if (!hook) {
            texts.push(textBlock(ctx, 'leftLabel', slide.leftLabel, 270, gaugeY + 120, 450, 56, 145, 800));
            texts.push(textBlock(ctx, 'rightLabel', slide.rightLabel, 810, gaugeY + 120, 450, 56, 145, 800));
        }
        return { texts, gaugeY };
    }

    class MemeCanvasEditor {
        constructor(onChange, options = {}) {
            this.onChange = onChange;
            this.cfg = { ...DEFAULTS, ...options };
            this.$ = (name) => document.getElementById(`${this.cfg.prefix}-${name}`);
            this.canvas = this.$('canvas'); this.ctx = this.canvas.getContext('2d');
            this.slides = []; this.scenes = []; this.index = 0; this.selected = null;
            this.images = new Map(); this.pending = new Map(); this.errors = new Set(); this.drag = null;
            this.exporting = false; this.fontsReady = false;
            // Post metadata lives in meme-slides.js; it is handed over so the zip can carry
            // the same tiktok_info.txt the slideshow export writes.
            this.metadata = null;
            this.aiBusy = false;
            this.ready = Promise.all([
                document.fonts.load('600 49px "Meme TikTok"'),
                document.fonts.load('800 76px "Meme TikTok"'),
            ]).then(() => { this.fontsReady = true; this.draw(); }).catch(() => this.message('The font could not load. Reload before exporting.'));
            this.bind(); this.loadLibrary();
        }
        message(text) { this.$('status').textContent = text; }
        scene() { return this.scenes[this.index]; }
        save() { this.onChange(); }
        serialize() { return { version: 1, index: this.index, scenes: this.scenes }; }
        restore(saved) {
            if (saved?.version !== 1 || !Array.isArray(saved.scenes)) return;
            this.index = clamp(Number(saved.index) || 0, 0, 5);
            this.scenes = saved.scenes.slice(0, 6).map((scene) => ({
                offsets: Object.fromEntries(Object.entries(scene?.offsets || {}).filter(([key, val]) =>
                    ['headline', 'body', 'leftLabel', 'rightLabel'].includes(key) && Number.isFinite(val?.x) && Number.isFinite(val?.y))),
                images: (Array.isArray(scene?.images) ? scene.images : []).filter((o) =>
                    o && validSrc(o.src) && ['x', 'y', 'w', 'h', 'angle'].every((key) => Number.isFinite(o[key])) && o.w > 0 && o.h > 0)
                    .map((o) => ({ ...o, id: String(o.id || id()), kind: 'image', name: String(o.name || 'Image') })),
            }));
        }
        setSlides(slides, reset = false) {
            this.slides = slides;
            if (reset) { this.scenes = []; this.selected = null; this.index = 0; }
            this.index = clamp(this.index, 0, Math.max(0, this.slides.length - 1));
            for (let i = 0; i < this.slides.length; i++) {
                if (!this.scenes[i]) { this.scenes[i] = { offsets: {}, images: [] }; this.defaultGauges(i); this.defaultTemplate(i); }
                // Migrate existing cover layouts while preserving manually placed cats.
                if (this.slides[i].role === 'hook') {
                    this.scenes[i].images = this.scenes[i].images.filter((image) => !image.gauge && image.src !== this.cfg.high && image.src !== this.cfg.low);
                }
                // Drafts saved before the CTA slide existed carry no app artwork yet.
                if (this.slides[i].role === 'cta' && this.scenes[i].images[0]?.src !== this.cfg.cta) this.defaultTemplate(i);
                for (const image of this.scenes[i].images) this.loadImage(image.src).catch(() => {});
            }
            document.getElementById(this.cfg.artwork).hidden = !this.slides.length;
            this.$('nav').replaceChildren();
            this.slides.forEach((slide, i) => {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary';
                button.textContent = i === 0 ? '1 · Cover' : this.slides[i].role === 'cta' ? `${i + 1} · App` : `${i + 1} · Point ${i}`;
                button.setAttribute('aria-pressed', String(i === this.index));
                button.addEventListener('click', () => {
                    this.index = i; this.selected = null; this.setSlides(this.slides); this.save();
                });
                this.$('nav').append(button);
            });
            this.refresh();
        }
        updateText() { this.refresh(); }
        defaultGauges(index = this.index) {
            if (this.slides[index]?.role !== 'point') return;
            const scene = this.scenes[index], y = layout(this.ctx, this.slides[index]).gaugeY;
            scene.images = scene.images.filter((image) => !image.gauge);
            for (const [x, src, name] of [[270, this.cfg.high, `${this.cfg.gaugeLabel} high`], [810, this.cfg.low, `${this.cfg.gaugeLabel} low`]]) {
                scene.images.push({ id: id(), kind: 'image', gauge: true, name, src, x, y, w: 290, h: 210, angle: 0,
                    home: { x, y, w: 290, h: 210, angle: 0 } });
                this.loadImage(src).catch(() => {});
            }
        }
        defaultTemplate(index = this.index) {
            if (this.slides[index]?.role !== 'cta') return;
            const scene = this.scenes[index];
            scene.images = scene.images.filter((image) => !image.template);
            const home = { x: W / 2, y: H / 2, w: W, h: H, angle: 0 };
            scene.images.unshift({ id: id(), kind: 'image', template: true, name: 'App slide', src: this.cfg.cta, ...home, home });
            this.loadImage(this.cfg.cta).catch(() => {});
        }
        loadImage(src) {
            if (this.images.has(src)) return Promise.resolve(this.images.get(src));
            if (this.pending.has(src)) return this.pending.get(src);
            const promise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => { this.images.set(src, image); this.errors.delete(src); this.draw(); resolve(image); };
                image.onerror = () => { this.errors.add(src); this.message('An image could not load. Check the asset files and reload before exporting.'); reject(new Error('Image failed to load')); };
                image.src = src;
            }).finally(() => this.pending.delete(src));
            this.pending.set(src, promise); return promise;
        }
        objects(index = this.index) {
            const slide = this.slides[index], scene = this.scenes[index];
            if (!slide || !scene) return [];
            // Untouched gauges follow the automatic layout as copy/font metrics change.
            // Once moved manually, their saved position takes precedence.
            for (const image of scene.images) {
                if (image.gauge && image.home && image.y === image.home.y) {
                    image.y = image.home.y = layout(this.ctx, slide).gaugeY;
                }
            }
            return [...scene.images, ...layout(this.ctx, slide).texts.map((text) => ({ ...text,
                x: text.x + (scene.offsets[text.id]?.x || 0), y: text.y + (scene.offsets[text.id]?.y || 0) }))];
        }
        object() { return this.objects().find((o) => o.id === this.selected); }
        draw(ctx = this.ctx, index = this.index, selection = true) {
            ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
            if (!this.slides[index]) return;
            if (this.slides[index].role === 'point') {
                ctx.beginPath(); ctx.moveTo(W / 2, layout(ctx, this.slides[index]).gaugeY - 100);
                ctx.lineTo(W / 2, H - 36); ctx.strokeStyle = '#000000'; ctx.lineWidth = 4; ctx.stroke();
            }
            for (const object of this.objects(index)) {
                ctx.save(); ctx.translate(object.x, object.y); ctx.rotate(radians(object.angle));
                if (object.kind === 'text') {
                    ctx.fillStyle = '#000000'; ctx.font = `${object.weight} ${object.size}px ${FONT}`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    object.lines.forEach((line, i) => ctx.fillText(line, 0, -object.h / 2 + object.size * 1.12 * (i + .5)));
                } else {
                    const image = this.images.get(object.src);
                    if (image) {
                        const ratio = Math.min(object.w / image.naturalWidth, object.h / image.naturalHeight);
                        const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio;
                        ctx.drawImage(image, -w / 2, -h / 2, w, h);
                    }
                }
                if (selection && object.id === this.selected) {
                    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]);
                    ctx.strokeRect(-object.w / 2, -object.h / 2, object.w, object.h); ctx.setLineDash([]);
                    if (object.kind === 'image') {
                        ctx.beginPath(); ctx.moveTo(0, -object.h / 2); ctx.lineTo(0, -object.h / 2 - 45); ctx.stroke();
                        ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(0, -object.h / 2 - 45, 13, 0, Math.PI * 2); ctx.fill();
                        ctx.fillRect(object.w / 2 - 12, object.h / 2 - 12, 24, 24);
                    }
                }
                ctx.restore();
            }
        }
        refresh() {
            const select = this.$('selection'); select.replaceChildren(new Option('Select text or an image', ''));
            for (const o of this.objects()) select.add(new Option(o.kind === 'text' ? ({ headline: 'Headline', body: 'Explanation / subtitle', leftLabel: 'Left caption', rightLabel: 'Right caption' })[o.id] : o.name, o.id));
            if (!this.object()) this.selected = null;
            select.value = this.selected || ''; this.controls(); this.draw();
        }
        controls() {
            const comparison = this.slides[this.index]?.role === 'point';
            this.$('arrange-slide').disabled = this.aiBusy || this.slides[this.index]?.role === 'cta';
            for (const name of ['gauges', 'swap']) {
                this.$(name).hidden = !comparison;
                this.$(name).disabled = !comparison;
            }
            const o = this.object(), isImage = o?.kind === 'image';
            const asset = this.assetFor(o);
            this.$('alternatives').disabled = !asset || this.aiBusy;
            this.$('label-panel').hidden = !asset;
            if (asset && this.labelAssetId !== asset.id) {
                this.$('suggestions').replaceChildren();
                this.labelAssetId = asset.id;
                this.$('label-edit').value = asset.override || '';
                this.$('label-description').textContent = asset.labels ? [asset.labels.description, asset.labels.emotion, asset.labels.meaning, asset.labels.tags.join(', ')].join(' · ') : 'Not analyzed yet. Use Analyze new assets.';
            }
            if (!asset) this.labelAssetId = null;
            for (const field of ['x', 'y']) { this.$(field).disabled = !o; this.$(field).value = o ? Math.round(o[field]) : ''; }
            for (const field of ['size', 'angle', 'front', 'back', 'remove']) this.$(field).disabled = !isImage;
            this.$('size').value = isImage ? o.w : 300; this.$('angle').value = isImage ? o.angle : 0;
            this.$('angle-value').textContent = `${isImage ? Math.round(o.angle) : 0}°`;
            this.$('reset-one').disabled = !o;
        }
        move(o, x, y) {
            if (o.kind === 'image') { o.x = x; o.y = y; o.ai = false; }
            else {
                const initial = layout(this.ctx, this.slides[this.index]).texts.find((t) => t.id === o.id);
                this.scene().offsets[o.id] = { x: x - initial.x, y: y - initial.y };
            }
        }
        point(event) {
            const rect = this.canvas.getBoundingClientRect();
            return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
        }
        bind() {
            this.$('selection').addEventListener('change', () => { this.selected = this.$('selection').value; this.controls(); this.draw(); });
            this.canvas.addEventListener('pointerdown', (event) => {
                if (this.exporting || this.aiBusy || event.button !== 0 || !this.scene()) return;
                const p = this.point(event), selected = this.object(); let mode = 'move', o;
                if (selected?.kind === 'image') {
                    const q = localPoint(p, selected);
                    const tolerance = 24 * W / this.canvas.getBoundingClientRect().width;
                    if (Math.hypot(q.x, q.y + selected.h / 2 + 45) < tolerance) { o = selected; mode = 'rotate'; }
                    else if (Math.hypot(q.x - selected.w / 2, q.y - selected.h / 2) < tolerance) { o = selected; mode = 'resize'; }
                }
                if (!o) o = this.objects().reverse().find((item) => contains(p, item));
                this.selected = o?.id || null; this.refresh(); this.canvas.focus();
                if (!o) return;
                this.drag = { mode, object: o, pointer: event.pointerId, start: p, x: o.x, y: o.y, w: o.w, h: o.h,
                    angle: o.angle, startAngle: Math.atan2(p.y - o.y, p.x - o.x) };
                this.canvas.setPointerCapture(event.pointerId); event.preventDefault();
            });
            this.canvas.addEventListener('pointermove', (event) => {
                const d = this.drag; if (!d || event.pointerId !== d.pointer) return;
                const p = this.point(event), o = d.object;
                if (d.mode === 'move') this.move(o, clamp(d.x + p.x - d.start.x, -W, W * 2), clamp(d.y + p.y - d.start.y, -H, H * 2));
                if (d.mode === 'rotate') { o.ai = false; o.angle = ((d.angle + (Math.atan2(p.y - d.y, p.x - d.x) - d.startAngle) * 180 / Math.PI + 540) % 360) - 180; }
                if (d.mode === 'resize') {
                    o.ai = false;
                    const scale = Math.hypot(p.x - d.x, p.y - d.y) / Math.max(1, Math.hypot(d.start.x - d.x, d.start.y - d.y));
                    o.w = clamp(d.w * scale, 60, 1400); o.h = d.h * o.w / d.w;
                }
                this.controls(); this.draw();
            });
            const end = () => { if (this.drag) { this.drag = null; this.save(); } };
            this.canvas.addEventListener('pointerup', end); this.canvas.addEventListener('pointercancel', end);
            this.canvas.addEventListener('lostpointercapture', end);
            this.canvas.addEventListener('keydown', (event) => {
                const o = this.object(); if (!o) return;
                const step = event.shiftKey ? 10 : 1;
                const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
                if (delta) { event.preventDefault(); this.move(o, o.x + delta[0], o.y + delta[1]); this.controls(); this.draw(); this.save(); }
                if ((event.key === 'Delete' || event.key === 'Backspace') && o.kind === 'image') { event.preventDefault(); this.remove(); }
            });
            for (const field of ['x', 'y', 'size', 'angle']) this.$(field).addEventListener('input', () => {
                const o = this.object(), raw = this.$(field).value, value = Number(raw); if (!o || raw === '' || !Number.isFinite(value)) return;
                if (field === 'x' || field === 'y') this.move(o, field === 'x' ? clamp(value, -W, W * 2) : o.x, field === 'y' ? clamp(value, -H, H * 2) : o.y);
                if (field === 'size' && o.kind === 'image') { o.ai = false; const w = clamp(value, 60, 1400); o.h *= w / o.w; o.w = w; }
                if (field === 'angle' && o.kind === 'image') { o.ai = false; o.angle = value; this.$('angle-value').textContent = `${value}°`; }
                this.draw(); this.save();
            });
            this.$('reset-one').addEventListener('click', () => {
                const o = this.object(); if (!o) return;
                if (o.kind === 'text') delete this.scene().offsets[o.id];
                else if (o.home) Object.assign(o, o.home);
                this.refresh(); this.save();
            });
            this.$('reset-text').addEventListener('click', () => { if (this.scene()) this.scene().offsets = {}; this.refresh(); this.save(); });
            this.$('remove').addEventListener('click', () => this.remove());
            for (const field of ['front', 'back']) this.$(field).addEventListener('click', () => {
                const o = this.object(); if (o?.kind !== 'image') return;
                o.ai = false;
                const list = this.scene().images, index = list.indexOf(o), target = clamp(index + (field === 'front' ? 1 : -1), 0, list.length - 1);
                [list[index], list[target]] = [list[target], list[index]]; this.refresh(); this.save();
            });
            this.$('gauges').addEventListener('click', () => { if (!this.scene()) return; this.defaultGauges(); this.refresh(); this.save(); });
            this.$('swap').addEventListener('click', () => {
                if (!this.scene() || this.slides[this.index]?.role !== 'point') return;
                for (const o of this.scene().images.filter((o) => o.gauge)) { const { high, low, gaugeLabel } = this.cfg; o.src = o.src === high ? low : high; o.name = `${gaugeLabel} ${o.src === high ? 'high' : 'low'}`; }
                this.refresh(); this.save();
            });
            this.$('search').addEventListener('input', () => this.renderLibrary());
            this.$('png').addEventListener('click', () => this.download(false));
            this.$('zip').addEventListener('click', () => this.download(true));
            this.$('analyze').addEventListener('click', () => this.analyzeAssets().catch((error) => this.message(error.message)));
            this.$('arrange').addEventListener('click', () => this.autoArrange());
            this.$('arrange-slide').addEventListener('click', () => this.autoArrange(this.index));
            this.$('alternatives').addEventListener('click', () => this.suggestAlternatives());
            this.$('label-save').addEventListener('click', async () => {
                const asset = this.assetFor(this.object()); if (!asset) return;
                try {
                    const updated = await this.api('/meme-assets/labels', { id: asset.id, override: this.$('label-edit').value });
                    Object.assign(asset, updated); this.renderLibrary(); this.message('Label corrections saved. AI will use these for future choices.');
                } catch (error) { this.message(error.message); }
            });
        }
        remove() {
            const o = this.object(); if (o?.kind !== 'image') return;
            this.scene().images = this.scene().images.filter((item) => item.id !== o.id); this.selected = null; this.refresh(); this.save();
        }
        async loadLibrary() {
            try {
                const data = await this.api('/meme-assets'); this.library = data.cats.filter((cat) => validSrc(cat.src)); this.renderLibrary();
                this.message(`${this.library.length} assets · ${data.pending} awaiting AI labels.`);
            } catch {
                try { const response = await fetch('assets/meme-slides/library.json'); const data = await response.json(); this.library = data.cats.filter((cat) => validSrc(cat.src)); this.renderLibrary(); }
                catch { this.message('Cat library could not load. Reload to try again.'); }
            }
        }
        renderLibrary() {
            const query = this.$('search').value.trim().toLowerCase(), list = this.$('library'); list.replaceChildren();
            for (const cat of (this.library || []).filter((cat) => [cat.name, cat.override, cat.labels?.description, cat.labels?.meaning, cat.labels?.emotion, ...(cat.labels?.tags || [])].join(' ').toLowerCase().includes(query))) {
                const button = document.createElement('button'); button.type = 'button'; button.title = cat.name;
                button.disabled = this.aiBusy;
                button.setAttribute('aria-label', `Add ${cat.name}`);
                const image = document.createElement('img'); image.src = cat.src; image.alt = cat.name; image.loading = 'lazy';
                button.append(image); button.addEventListener('click', async () => {
                    if (!this.scene() || this.exporting || this.aiBusy) return;
                    const index = this.index;
                    try {
                        const asset = await this.loadImage(cat.src);
                        const w = Math.min(430, 520 * asset.naturalWidth / asset.naturalHeight), h = w * asset.naturalHeight / asset.naturalWidth;
                        const count = this.scenes[index].images.filter((o) => !o.gauge).length;
                        const x = count % 2 ? 810 : 270, y = H - h / 2 - 20;
                        const object = { id: id(), assetId: cat.id, kind: 'image', name: cat.name, src: cat.src, x, y, w, h, angle: 0, home: { x, y, w, h, angle: 0 } };
                        this.scenes[index].images.push(object);
                        if (index === this.index) this.selected = object.id;
                        this.refresh(); this.save(); this.message('Cat added. Drag to move, resize, or rotate.');
                    } catch {
                        // The library on screen can outlive its files after assets are removed.
                        this.message('That image is gone from the library. Refreshing the list…');
                        this.errors.delete(cat.src); this.images.delete(cat.src);
                        await this.loadLibrary();
                    }
                }); list.append(button);
            }
            if (!list.children.length) list.textContent = 'No cats match your search.';
        }
        assetFor(object) {
            if (object?.kind !== 'image' || object.gauge || object.template) return null;
            return (this.library || []).find((a) => a.id === object.assetId || a.src === object.src || a.name === object.name);
        }
        async api(route, body) {
            const response = await fetch(`${API_BASE}${route}`, { method: body === undefined ? 'GET' : 'POST',
                headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(180000) });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Asset request failed.'); return data;
        }
        async analyzeAssets() {
            if (this.labeling) return this.labeling;
            this.$('analyze').disabled = true;
            this.labeling = (async () => {
                this.message('Scanning and labeling new or changed images…');
                await this.api('/meme-assets/analyze', {});
                for (let tries = 0; tries < 300; tries++) {
                    const data = await this.api('/meme-assets');
                    this.library = data.cats.filter((cat) => validSrc(cat.src)); this.renderLibrary();
                    this.message(`AI labels: ${data.cats.length - data.pending}/${data.cats.length} ready${data.progress.failed ? ` · ${data.progress.failed} failed, retry analysis to retry them` : ''}.`);
                    if (!data.progress.running) { this.labelAssetId = null; if (!this.aiBusy) this.controls(); return data; }
                    await new Promise((resolve) => setTimeout(resolve, 2500));
                }
                throw new Error('Analysis is still running. Use Analyze new assets to check progress.');
            })().finally(() => { this.labeling = null; this.$('analyze').disabled = false; });
            return this.labeling;
        }
        placement(asset, slot, index) {
            const hook = this.slides[index].role === 'hook', objects = this.objects(index);
            const protectedBottom = Math.max(...objects.filter((o) => o.kind === 'text' || o.gauge).map((o) => o.y + o.h / 2), 0) + 28;
            const regionHeight = H - 28 - protectedBottom;
            if (regionHeight < 100) throw new Error('Make room below the text or reset its position before arranging images.');
            const accent = slot.startsWith('accent');
            const top = protectedBottom + (hook && !accent ? regionHeight * .28 : 0);
            const boxH = hook ? regionHeight * (accent ? .24 : .72) : regionHeight;
            const boxW = accent ? 250 : 460;
            const x = slot === 'left' || slot === 'accentLeft' ? 270 : 810;
            const y = top + boxH / 2;
            const ratio = asset.width / asset.height, angle = hook ? (x < 540 ? -3 : 3) : 0;
            const a = Math.abs(radians(angle));
            const h = Math.min(boxH / (Math.cos(a) + ratio * Math.sin(a)), boxW / (ratio * Math.cos(a) + Math.sin(a)));
            const w = h * ratio;
            return { id: id(), assetId: asset.id, kind: 'image', name: asset.name, src: asset.src, ai: true, slot,
                x, y, w, h, angle, home: { x, y, w, h, angle } };
        }
        // Every cat the post already uses, minus the AI picks on the slides being redrawn.
        // The model gets this list so one image is never reused across a post.
        usedAssetIds(regenerating = []) {
            const redrawn = new Set(regenerating), ids = new Set();
            this.scenes.forEach((scene, index) => {
                for (const object of scene?.images || []) {
                    if (!object.assetId || (redrawn.has(index) && object.ai)) continue;
                    ids.add(object.assetId);
                }
            });
            return [...ids];
        }
        // Pass a slide index to re-image just that slide; omit it for the whole carousel.
        async autoArrange(only = null) {
            if (this.aiBusy || this.exporting || !this.slides.length) return;
            // The closing slide is fixed artwork, so the model never arranges it.
            const targets = this.slides.map((slide, index) => index).filter((index) =>
                this.slides[index].role !== 'cta' && (only === null || index === only));
            if (!targets.length) return this.message('The app slide is fixed artwork. Choose another slide.');
            this.aiBusy = true;
            const controls = [...document.querySelectorAll(['button', 'input', 'select', 'textarea'].map((tag) => `${this.cfg.panel} ${tag}`).join(', '))].map((element) => [element, element.disabled]);
            controls.forEach(([element]) => { element.disabled = true; });
            const signature = JSON.stringify(this.slides), scenesBefore = this.scenes;
            try {
                await this.analyzeAssets(); await this.ready;
                this.message(only === null ? 'Choosing visual jokes for the whole carousel…' : `Choosing images for slide ${only + 1}…`);
                const data = await this.api('/meme-assets/select', { slides: targets.map((index) => this.slides[index]),
                    alreadyUsed: this.usedAssetIds(targets) });
                if (signature !== JSON.stringify(this.slides) || scenesBefore !== this.scenes) throw new Error('The draft changed while choosing images. Arrange again for the current text.');
                this.library = data.library; this.renderLibrary();
                const staged = [];
                let skipped = 0;
                for (const choice of data.slides) {
                    const index = targets[choice.index];
                    const keep = this.scenes[index].images.filter((o) => !o.ai);
                    const additions = [];
                    for (const pick of choice.assets) {
                        const asset = this.library.find((a) => a.id === pick.id); if (!asset) throw new Error('An asset is missing. Retry analysis.');
                        await this.loadImage(asset.src);
                        const object = { ...this.placement(asset, pick.slot, index), reason: pick.reason };
                        // Keep manually arranged artwork intact; do not place AI cats over it.
                        const conflicts = keep.some((o) => !o.gauge && Math.abs(o.x - object.x) < (o.w + object.w) / 2 && Math.abs(o.y - object.y) < (o.h + object.h) / 2);
                        if (conflicts) skipped++; else additions.push(object);
                    }
                    staged[index] = [...keep, ...additions];
                }
                if (signature !== JSON.stringify(this.slides) || scenesBefore !== this.scenes) throw new Error('Draft changed. Arrange again.');
                staged.forEach((images, index) => { if (images) this.scenes[index].images = images; });
                this.selected = null; this.refresh(); this.save();
                this.message(`${only === null ? 'AI images placed' : `Slide ${only + 1} re-imaged`}. All objects remain editable.${skipped ? ` ${skipped} placements skipped to preserve your manual images.` : ''}`);
            } catch (error) { this.message(`${error.message} Existing artwork was kept.`); }
            finally { this.aiBusy = false; controls.forEach(([element, disabled]) => { element.disabled = disabled; }); this.renderLibrary(); this.controls(); }
        }
        async suggestAlternatives() {
            const object = this.object(), asset = this.assetFor(object); if (!asset || this.aiBusy) return;
            const index = this.index;
            this.$('alternatives').disabled = true; this.message('Finding alternative reactions…');
            try {
                const side = object.slot || (object.x < W / 2 ? 'left' : 'right');
                const data = await this.api('/meme-assets/select', { slides: [this.slides[index]], alternative: { id: asset.id, side },
                    alreadyUsed: this.usedAssetIds() });
                if (this.index !== index || this.selected !== object.id) return;
                const list = this.$('suggestions'); list.replaceChildren();
                for (const pick of data.alternatives) {
                    const replacement = data.library.find((a) => a.id === pick.id); if (!replacement) continue;
                    const button = document.createElement('button'); button.type = 'button';
                    const image = document.createElement('img'); image.src = replacement.src; image.alt = replacement.name;
                    const text = document.createElement('span'); text.textContent = pick.reason; button.append(image, text);
                    button.addEventListener('click', async () => {
                        if (!this.scenes[index]?.images.includes(object)) return;
                        try {
                            await this.loadImage(replacement.src);
                            const scale = Math.min(object.w / replacement.width, object.h / replacement.height);
                            Object.assign(object, { ai: false, assetId: replacement.id, src: replacement.src, name: replacement.name, w: replacement.width * scale, h: replacement.height * scale, reason: pick.reason });
                            object.home = { x: object.x, y: object.y, w: object.w, h: object.h, angle: object.angle };
                            this.library = data.library; this.labelAssetId = null; this.refresh(); this.save(); list.replaceChildren(); this.message('Image replaced. Position and rotation preserved.');
                        } catch { this.message('Alternative could not load. Existing image kept.'); }
                    }); list.append(button);
                }
                this.message('Choose an alternative below.');
            } catch (error) { this.message(error.message); }
            finally { this.controls(); }
        }
        async png(index) {
            await this.ready;
            if (!this.fontsReady) throw new Error('Wait for the font to load, then retry.');
            await Promise.all(this.scenes[index].images.map((o) => this.loadImage(o.src)));
            const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
            this.draw(canvas.getContext('2d'), index, false);
            const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG export failed')), 'image/png'));
            return stripMetadata(blob);
        }
        // Everything needed when the post actually goes up, in one file next to the slides.
        infoFile() {
            const meta = this.metadata;
            if (!meta) return '';
            const hashtags = (meta.hashtags || []).join(' ');
            const lines = [];
            if (meta.title) lines.push(`TITLE (paste this as the post text):
${meta.title}`);
            if (meta.description || hashtags) {
                lines.push(`DESCRIPTION + HASHTAGS TOGETHER:
${[meta.description, hashtags].filter(Boolean).join(' ')}`);
            }
            if (meta.sound) {
                lines.push(`SOUND:
${[meta.sound.title, meta.sound.artist].filter(Boolean).join(' - ')}
${meta.sound.link}`);
            }
            return lines.join('\n\n');
        }
        async download(all) {
            if (this.exporting || !this.slides.length) return;
            this.exporting = true;
            const controls = [...document.querySelectorAll(['button', 'input', 'select', 'textarea'].map((tag) => `${this.cfg.panel} ${tag}`).join(', '))]
                .map((element) => [element, element.disabled]);
            controls.forEach(([element]) => { element.disabled = true; });
            this.message('Rendering full-resolution images…');
            try {
                let blob, filename;
                if (all) {
                    if (!window.JSZip) throw new Error('ZIP library did not load. Download individual PNGs or reload.');
                    const zip = new JSZip();
                    // A fixed timestamp keeps the zip from recording when the post was made.
                    const date = new Date('2000-01-01T00:00:00Z');
                    for (let i = 0; i < this.slides.length; i++) zip.file(`${this.cfg.filePrefix}-${i + 1}.png`, await this.png(i), { date });
                    const info = this.infoFile();
                    if (info) zip.file('tiktok_info.txt', info, { date });
                    blob = await zip.generateAsync({ type: 'blob' }); filename = `${this.cfg.filePrefix}s.zip`;
                } else { blob = await this.png(this.index); filename = `${this.cfg.filePrefix}-${this.index + 1}.png`; }
                const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename;
                document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                this.message(all
                    ? `${this.slides.length} slides exported at 1080 × 1350${this.infoFile() ? ' with tiktok_info.txt' : ''}.`
                    : 'PNG exported at 1080 × 1350.');
            } catch (error) { this.message(error.message || 'Export failed. Please retry.'); }
            finally { this.exporting = false; controls.forEach(([element, disabled]) => { element.disabled = disabled; }); }
        }
    }
    window.MemeCanvasEditor = MemeCanvasEditor;
})();
