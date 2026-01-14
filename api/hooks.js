import hooks from './viral_hooks.json';

export default function handler(req, res) {
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
