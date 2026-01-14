import { readFileSync } from 'fs';
import path from 'path';

// Fix for Vercel serverless functions with ESM
const hooksPath = path.join(process.cwd(), 'api', 'viral_hooks.json');
const hooks = JSON.parse(readFileSync(hooksPath, 'utf8'));

export default function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { niche, archetype, limit = 10 } = req.query;

    let results = hooks;

    if (niche) {
        results = results.filter(h => h.niche.toLowerCase().includes(niche.toLowerCase()));
    }

    if (archetype) {
        results = results.filter(h => h.archetype === archetype);
    }

    // Sort by view count descending
    results.sort((a, b) => b.view_count - a.view_count);

    res.status(200).json(results.slice(0, limit));
}

