import { Database } from "bun:sqlite";

const db = new Database("data/hooks.db", { create: true });

// Initialize schema
db.query(`
  CREATE TABLE IF NOT EXISTS viral_hooks (
    id TEXT PRIMARY KEY,
    hook_text TEXT NOT NULL,
    video_url TEXT,
    view_count INTEGER,
    like_count INTEGER,
    share_count INTEGER,
    comment_count INTEGER,
    niche TEXT,
    content_type TEXT, -- 'video' or 'slideshow'
    is_ocr INTEGER DEFAULT 0, -- 1 if text was extracted via OCR
    transcription TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`).run();

export default db;
export const insertHook = db.prepare(`
  INSERT OR IGNORE INTO viral_hooks (
    id, hook_text, video_url, view_count, like_count, share_count, comment_count, niche, content_type, is_ocr, transcription
  ) VALUES (
    $id, $hook_text, $video_url, $view_count, $like_count, $share_count, $comment_count, $niche, $content_type, $is_ocr, $transcription
  );
`);
