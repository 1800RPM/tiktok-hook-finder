const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function extractTextFromImage(imageUrl: string): Promise<string> {
    if (!ANTHROPIC_API_KEY) {
        console.warn("ANTHROPIC_API_KEY not found. Returning mock text.");
        return "MOCK_SLIDESHOW_HOOK";
    }

    try {
        console.log(`[OCR] Fetching image: ${imageUrl.substring(0, 100)}...`);
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
            console.error(`[OCR] Failed to fetch image: ${imgResponse.status} ${imgResponse.statusText}`);
            return "";
        }

        const buffer = await imgResponse.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

        console.log(`[OCR] Requesting Claude Vision analysis (Model: claude-3-haiku-20240307)...`);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: contentType,
                                    data: base64Image
                                }
                            },
                            {
                                type: 'text',
                                text: 'Extract ONLY the main headline/hook text from this image. Do not include emojis, captions, or any other metadata. Just the text accurately as it appears. If there is no text, return "NO_TEXT".'
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json() as any;

        if (data.error) {
            console.error("[OCR] Anthropic API Error:", JSON.stringify(data.error, null, 2));
            return "";
        }

        const text = data.content?.[0]?.text?.trim() || "";
        console.log(`[OCR] Success! Extracted: "${text}"`);
        return text;
    } catch (error) {
        console.error("[OCR] Unexpected Error:", error);
        return "";
    }
}
