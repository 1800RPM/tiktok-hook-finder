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

        // Fetch top 200 performing hooks (instead of 150) to get a broader trend
        const topHooks = db.query(`
            SELECT hook_text, archetype, view_count 
            FROM viral_hooks 
            ORDER BY view_count DESC 
            LIMIT 200
        `).all() as any[];


        if (topHooks.length === 0) {
            console.log("⚠️ No hooks found in DB to analyze.");
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
                        content: `You are a viral TikTok cultural anthropologist and content strategist. 
                        I have a database of viral TikTok hooks. Your goal is to analyze them and extract "balanced" trends for high-conversion slideshow hooks.
                        
                        TARGET TONE: "Subtle Gen-Z / Contemporary Professional". 
                        - Authentic and native to TikTok.
                        - Relatable but slightly intellectual.
                        - AVOID: "Brain rot" slang, excessive Gen-Z emojis, or cringey memes.
                        - FAVOR: Native structures (lowercase starting, personal realizations, vulnerable truth-telling).

                        HOOK DATA (Top 200):
                        ${topHooks.map(h => `- ${h.hook_text}`).join('\n')}

                        
                        Return a JSON object with:
                        1. "slang": List of 10 keywords/phrases that feel "native" but not "unprofessional" (e.g., "personal era", "protection mechanism", "realization").
                        2. "formatting_rules": 5 rules for high-conversion aesthetics. DO NOT include "emojis" or "hashtags". focus on sentence structure and capitalization.
                        3. "emotional_triggers": 5 core psychological triggers found in these high-performing hooks.
                        
                        Return ONLY the raw JSON object.`

                    }]
                })
            });

            const data = await response.json() as any;
            let resultText = data.content?.[0]?.text;

            if (!resultText) throw new Error("No analysis result from AI");

            // Clean up potentially non-JSON text from Claude's response
            const jsonStart = resultText.indexOf('{');
            const jsonEnd = resultText.lastIndexOf('}') + 1;
            if (jsonStart !== -1 && jsonEnd !== 0) {
                resultText = resultText.substring(jsonStart, jsonEnd);
            }

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
