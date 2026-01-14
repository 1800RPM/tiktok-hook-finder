import { Database } from "bun:sqlite";
import { writeFileSync } from "fs";
import path from "path";

const db = new Database("data/hooks.db");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export interface TrendSnapshot {
    slang: string[];
    formatting_rules: string[];
    emotional_triggers: string[];
    last_updated: string;
}

export class HookBrain {
    private snapshotPath: string;

    constructor() {
        this.snapshotPath = path.join(process.cwd(), "data", "trends_snapshot.json");
    }

    async analyzeCurrentTrends(): Promise<TrendSnapshot | null> {
        if (!ANTHROPIC_API_KEY) {
            console.error("ANTHROPIC_API_KEY missing for trend analysis");
            return null;
        }

        console.log("🧠 Brain is analyzing top performing hooks for Gen-Z trends...");

        // Get top 50 hooks by view count to stay on top of what's viral
        const topHooks = db.query(`
            SELECT hook_text, archetype, view_count 
            FROM viral_hooks 
            ORDER BY view_count DESC 
            LIMIT 50
        `).all() as any[];

        if (topHooks.length === 0) {
            console.warn("No hooks found in DB to analyze.");
            return null;
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1000,
                    messages: [{
                        role: 'user',
                        content: `You are a Gen-Z TikTok culture analyst. I will give you a list of viral TikTok hooks (top performers).
                        Analyze them and extract the core stylistic DNA that appeals to the 20-35 demographic.
                        
                        Hooks:
                        ${topHooks.map(h => `- [${h.archetype}] ${h.hook_text}`).join('\n')}
                        
                        Return a JSON object with:
                        1. "slang": List of 10 keywords/keywords found or related to these (e.g., POV, lowkey, era, BPD). Focus on psychological and relatable terms, not just internet slang.
                        2. "formatting_rules": 5 rules for how these should look. CRITICAL: DO NOT include "emojis" or "hashtags" in the rules. Examples: "all lowercase", "no periods", "use of specific phrase structures".
                        3. "emotional_triggers": 5 core psychological reasons why these work (e.g., "validating old trauma", "calling out toxic behavior").
                        
                        Return ONLY the raw JSON object.`

                    }]
                })
            });

            const data = await response.json() as any;
            const resultText = data.content?.[0]?.text;

            if (!resultText) throw new Error("No analysis result from AI");

            const analysis = JSON.parse(resultText);
            const snapshot: TrendSnapshot = {
                ...analysis,
                last_updated: new Date().toISOString()
            };

            // Save for API usage
            writeFileSync(this.snapshotPath, JSON.stringify(snapshot, null, 2));
            console.log("✅ Trend snapshot updated successfully.");
            return snapshot;

        } catch (error) {
            console.error("Trend analysis failed:", error);
            return null;
        }
    }

    static getSnapshot(): TrendSnapshot | null {
        try {
            const snapshotPath = path.join(process.cwd(), "data", "trends_snapshot.json");
            const content = require("fs").readFileSync(snapshotPath, "utf8");
            return JSON.parse(content);
        } catch (e) {
            return null;
        }
    }
}

// If run directly, perform analysis
if (import.meta.main) {
    const brain = new HookBrain();
    brain.analyzeCurrentTrends();
}
