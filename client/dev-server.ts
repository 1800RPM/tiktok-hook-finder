// Dev server for the client: static files + live reload.
// Serves client/ on :3000, injects a tiny reload script into HTML responses, and
// tells every open tab to reload whenever a file under client/ changes. Any code
// edit is visible in the browser instantly, no manual refresh.

import { watch, readdirSync, statSync } from "fs";
import path from "path";

const ROOT = import.meta.dir;
const PORT = 3000;
const sockets = new Set<any>();

// A forced reload throws away whatever the user was in the middle of: the slide they had
// scrolled to, a sound playing, an unsaved field. While someone is editing the client the page
// would reload every few seconds, so a stylesheet is swapped in place and anything else offers
// a button instead of taking the decision away.
const RELOAD_SNIPPET = `<script>
(() => {
  function swapStyles() {
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      const url = new URL(link.href, location.href);
      url.searchParams.set("v", Date.now());
      link.href = url.pathname + url.search;
    }
  }
  function offerReload() {
    if (document.getElementById("__reload-bar")) return;
    const bar = document.createElement("div");
    bar.id = "__reload-bar";
    bar.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;" +
      "display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;font:500 13px system-ui,sans-serif;" +
      "background:#171a21;color:#f5f5f7;border:1px solid rgba(255,255,255,.14);box-shadow:0 8px 24px rgba(0,0,0,.45)";
    const text = document.createElement("span");
    text.textContent = "Neue Version verfügbar";
    const button = document.createElement("button");
    button.textContent = "Neu laden";
    button.style.cssText = "cursor:pointer;border:0;border-radius:8px;padding:5px 11px;font:600 12px system-ui,sans-serif;background:#34d399;color:#06281d";
    button.onclick = () => location.reload();
    const dismiss = document.createElement("button");
    dismiss.textContent = "✕";
    dismiss.title = "Ausblenden";
    dismiss.style.cssText = "cursor:pointer;border:0;background:transparent;color:inherit;opacity:.5;font-size:13px";
    dismiss.onclick = () => bar.remove();
    bar.append(text, button, dismiss);
    document.body.append(bar);
  }
  function connect() {
    const ws = new WebSocket("ws://" + location.host + "/__livereload");
    ws.onmessage = (e) => {
      let files = [];
      try { files = JSON.parse(e.data).files || []; } catch { files = []; }
      // Styles can be applied without losing anything, so they never interrupt.
      if (files.length && files.every((f) => f.endsWith(".css"))) swapStyles();
      else offerReload();
    };
    ws.onclose = () => setTimeout(connect, 1000);
  }
  connect();
})();
</script>`;

const MIME: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".md": "text/markdown; charset=utf-8",
};

Bun.serve({
    port: PORT,
    async fetch(req, server) {
        const url = new URL(req.url);

        if (url.pathname === "/__livereload") {
            if (server.upgrade(req)) return undefined as any;
            return new Response("websocket only", { status: 400 });
        }

        let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
        if (url.pathname === "/" || url.pathname.endsWith("/")) filePath = path.join(filePath, "index.html");
        if (!filePath.startsWith(ROOT)) return new Response("forbidden", { status: 403 });

        const file = Bun.file(filePath);
        if (!(await file.exists())) return new Response("not found", { status: 404 });

        const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
        if (type.startsWith("text/html")) {
            let html = await file.text();
            html = html.replace("</body>", `${RELOAD_SNIPPET}\n</body>`);
            return new Response(html, { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
        }
        return new Response(file, { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
    },
    websocket: {
        open(ws) { sockets.add(ws); },
        close(ws) { sockets.delete(ws); },
        message() { /* reload channel is server -> client only */ },
    },
});

// Notify all open tabs on any client file change (debounced, one message per edit burst).
// The changed filenames travel with the message so the page can decide whether it needs a
// reload at all: a stylesheet is swapped in place, everything else only offers a button.
let timer: ReturnType<typeof setTimeout> | null = null;
let changed = new Set<string>();
function generatedMemeAsset(file: string) {
    const relative = file.replaceAll('\\', '/');
    return relative === 'assets/meme-slides/library.json' || relative.startsWith('assets/meme-slides/indexed/');
}
function notify(file?: string) {
    if (file) changed.add(file.replaceAll('\\', '/'));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        const payload = JSON.stringify({ files: [...changed] });
        changed = new Set();
        for (const ws of sockets) {
            try { ws.send(payload); } catch { /* socket already gone */ }
        }
    }, 150);
}

try {
    watch(ROOT, { recursive: true }, (_event, filename) => {
        if (filename && generatedMemeAsset(String(filename))) return;
        notify(filename ? String(filename) : undefined);
    });
    console.log("[live-reload] watching client/ via fs.watch");
} catch {
    // Fallback for environments without recursive watch: poll mtimes.
    let last = 0;
    const scan = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, entry.name);
            if (generatedMemeAsset(path.relative(ROOT, p))) continue;
            if (entry.isDirectory()) scan(p);
            else {
                const m = statSync(p).mtimeMs;
                if (m > last) last = m;
            }
        }
    };
    scan(ROOT);
    setInterval(() => {
        const prev = last;
        scan(ROOT);
        if (last !== prev) notify();
    }, 500);
    console.log("[live-reload] watching client/ via mtime polling");
}

console.log(`Client dev server with live reload on http://localhost:${PORT}`);
