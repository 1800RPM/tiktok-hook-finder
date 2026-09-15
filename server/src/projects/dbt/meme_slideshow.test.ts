import { afterEach, expect, test } from 'bun:test';
import { MEME_PROMISES, generateMemeSlideshow, validateMemeSlides } from './meme_slideshow';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const draft = () => ({ slides: Array.from({ length: 7 }, (_, i) => ({
    role: i === 0 ? 'hook' : i === 6 ? 'cta' : 'point',
    headline: i === 0 ? '5 overlooked DBT lessons' : `${i}. A useful lesson`,
    body: 'A short explanation.', leftLabel: i > 0 && i < 6 ? 'First thought' : '',
    rightLabel: i > 0 && i < 6 ? 'Another option' : '',
})) });

test('rejects missing points, misordered roles, missing labels, and oversized copy', () => {
    expect(() => validateMemeSlides({ slides: draft().slides.slice(1) })).toThrow();
    const wrongRole = draft(); wrongRole.slides[2]!.role = 'cta';
    expect(() => validateMemeSlides(wrongRole)).toThrow();
    const missingLabel = draft(); missingLabel.slides[3]!.rightLabel = '';
    expect(() => validateMemeSlides(missingLabel)).toThrow();
    const longCopy = draft(); longCopy.slides[1]!.body = 'word '.repeat(46);
    expect(() => validateMemeSlides(longCopy)).toThrow();
    expect(validateMemeSlides(draft())).toHaveLength(7);
});

test('repairs malformed provider output and preserves requested topic and language', async () => {
    const requests: any[] = [];
    globalThis.fetch = (async (_url, init) => {
        requests.push(JSON.parse(init!.body as string));
        return Response.json({ content: [{ type: 'text', text: requests.length === 1 ? '{bad json' : JSON.stringify(draft()) }] });
    }) as typeof fetch;
    const result = await generateMemeSlideshow({ topic: 'My custom topic', language: 'de', theme: 'frogs', ANTHROPIC_API_KEY: 'test' });
    expect(result.slides).toHaveLength(7);
    expect(requests).toHaveLength(2);
    const input = JSON.parse(requests[0].messages[0].content);
    expect(input.direction).toBe('My custom topic');
    expect(input.characterTheme).toBe('frogs');
    expect(input.language).toContain('German');
    expect(requests[1].messages.at(-1).content).toContain('Fix the JSON');
});

test('requires BPD or DBT in the headline itself, case-insensitively', () => {
    for (const headline of ['5 habits for easier bpd mornings', '5 DBT habits for evenings']) {
        const value = draft(); value.slides[0]!.headline = headline;
        expect(validateMemeSlides(value)[0]!.headline).toBe(headline);
    }
    for (const headline of ['5 evening habits making tomorrow harder', '5 dbtips for evenings']) {
        const value = draft(); value.slides[0]!.headline = headline;
        value.slides[0]!.body = '(explained by BPD cat using DBT)';
        expect(() => validateMemeSlides(value)).toThrow('headline must include');
    }
});

test('repairs a generated hook that omits the niche word', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
        const value = draft();
        value.slides[0]!.headline = ++calls === 1 ? '5 habits for easier mornings' : '5 habits for easier BPD mornings';
        return Response.json({ content: [{ type: 'text', text: JSON.stringify(value) }] });
    }) as typeof fetch;
    const result = await generateMemeSlideshow({ ANTHROPIC_API_KEY: 'test' });
    expect(calls).toBe(2);
    expect(result.slides[0]!.headline).toBe('5 habits for easier BPD mornings');
});

test('generates without a supplied topic and retries a recent topic', async () => {
    const requests: any[] = [];
    globalThis.fetch = (async (_url, init) => {
        requests.push(JSON.parse(init!.body as string));
        const result = draft();
        if (requests.length > 1) result.slides[0]!.headline = '5 ways DBT changes how you handle boredom';
        return Response.json({ content: [{ type: 'text', text: JSON.stringify(result) }] });
    }) as typeof fetch;
    const result = await generateMemeSlideshow({ previousTopics: ['5 overlooked DBT lessons'], ANTHROPIC_API_KEY: 'test' });
    expect(result.slides[0]!.headline).toContain('boredom');
    expect(requests).toHaveLength(2);
    const input = JSON.parse(requests[0].messages[0].content);
    expect(input.direction).toBe('');
    expect(input.task).toContain('Invent a fresh creative topic');
    expect(input.recentTopicsToAvoid).toEqual(['5 overlooked DBT lessons']);
    expect(requests[1].messages.at(-1).content).toContain('different subject');
});

test('stops after one repair and reports provider failures without leaking content', async () => {
    let count = 0;
    globalThis.fetch = (async () => { count++; return Response.json({ content: [{ type: 'text', text: '{}' }] }); }) as typeof fetch;
    await expect(generateMemeSlideshow({ topic: 'Test', ANTHROPIC_API_KEY: 'test' })).rejects.toThrow('Generation failed twice');
    expect(count).toBe(2);
    globalThis.fetch = (async () => new Response('private provider details', { status: 429 })) as typeof fetch;
    await expect(generateMemeSlideshow({ topic: 'Test', ANTHROPIC_API_KEY: 'test' })).rejects.toThrow('429');
});

test('rewrites em and en dashes instead of failing the whole draft', () => {
    const emDash = draft(); emDash.slides[2]!.body = 'Something small before you leave — even a few bites — keeps the edge off.';
    expect(validateMemeSlides(emDash)[2]!.body).toBe('Something small before you leave, even a few bites, keeps the edge off.');
    const enDash = draft(); enDash.slides[4]!.leftLabel = 'quick – easy';
    expect(validateMemeSlides(enDash)[4]!.leftLabel).toBe('quick, easy');
    const trailing = draft(); trailing.slides[3]!.body = 'It helps — a lot.';
    expect(validateMemeSlides(trailing)[3]!.body).toBe('It helps, a lot.');
    const hyphen = draft(); hyphen.slides[3]!.body = 'A well-timed snack is fine.';
    expect(validateMemeSlides(hyphen)[3]!.body).toBe('A well-timed snack is fine.');
});

test('a script is never paired with an object axis, and every promise is self-directed', async () => {
    const seen: string[] = [];
    globalThis.fetch = (async (_url: any, init: any) => {
        seen.push(JSON.parse(init.body).messages[0].content);
        return Response.json({ content: [{ type: 'text', text: '{}' }] });
    }) as typeof fetch;
    // A script needs a situation to speak into, not an object to point at.
    for (let run = 0; run < 12; run++) {
        seen.length = 0;
        await generateMemeSlideshow({ promise: 'A SCRIPT', ANTHROPIC_API_KEY: 'test' }).catch(() => {});
        const body = JSON.parse(seen[0]!);
        expect(body.assignedPromise).toBe('A SCRIPT');
        expect(body.assignedAxis).not.toContain('a physical object or place');
    }
    // The cat only works when the viewer sees themselves in it, so a partner-facing promise
    // does not belong in this format. That audience lives in the slideshow for_partners
    // archetype instead.
    expect(MEME_PROMISES).not.toContain('FOR SOMEONE WHO LOVES THEM');
    for (let run = 0; run < 20; run++) {
        seen.length = 0;
        await generateMemeSlideshow({ ANTHROPIC_API_KEY: 'test' }).catch(() => {});
        expect(MEME_PROMISES).toContain(JSON.parse(seen[0]!).assignedPromise);
    }
});
