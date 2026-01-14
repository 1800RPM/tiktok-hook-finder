import hooks from './viral_hooks.json';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topic, archetype = 'The Warning / Signs' } = req.body;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

    // Get some examples for few-shot learning
    const examples = hooks
        .filter(h => h.archetype === archetype)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

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
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: `You are a viral TikTok marketing expert. 
          Generate 3 VIRAL SLIDESHOW HOOKS (headlines) for the topic: "${topic}"
          
          Use the following marketing archetype: ${archetype}
          
          Inspiration from viral hooks:
          ${examples.map(e => `- ${e.hook_text}`).join('\n')}
          
          Output format: JSON array of strings only. No other text.`
                }]
            })
        });

        const data = await response.json();
        const resultText = data.content[0].text;
        res.status(200).json({ hooks: JSON.parse(resultText) });
    } catch (error) {
        res.status(500).json({ error: 'Generation failed' });
    }
}
