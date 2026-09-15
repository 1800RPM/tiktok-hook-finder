import { afterEach, expect, test } from 'bun:test';
import { buildDescription, buildTitle, generateSsSlideshow, SS_ARCHETYPES, SS_EVERYDAY_AXES } from './ss_slideshow';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Captures the system prompt the current flow sends, without reaching the provider.
async function systemPromptFor(archetype: string) {
    let system = '';
    globalThis.fetch = (async (_url: any, init: any) => {
        system = JSON.parse(init.body).system;
        return Response.json({ content: [{ type: 'text', text: '{}' }] });
    }) as typeof fetch;
    await generateSsSlideshow({ archetype, domain: 'daily_life', ANTHROPIC_API_KEY: 'test' }).catch(() => {});
    return system;
}

test('the everyday archetype swaps the therapy domain for a framing axis', async () => {
    expect(SS_ARCHETYPES.everyday.label).toBe('Everyday things');
    const system = await systemPromptFor('everyday');
    expect(system).toContain('FRAMING AXIS');
    expect(system).not.toContain('TOPIC DOMAIN');
    expect(SS_EVERYDAY_AXES.some((axis) => system.includes(axis.spec))).toBe(true);
});

test('the seven original archetypes still use the topic domain', async () => {
    const system = await systemPromptFor('confession');
    expect(system).toContain('TOPIC DOMAIN');
    expect(system).not.toContain('FRAMING AXIS');
});

test('the simple flow can land on the everyday territory with a drawn axis', async () => {
    const seen = new Set<string>();
    let everydayPrompts = 0;
    // The territory rotates randomly, so sample until the new one comes up.
    for (let run = 0; run < 60; run++) {
        let system = '';
        globalThis.fetch = (async (_url: any, init: any) => {
            system = JSON.parse(init.body).system;
            return Response.json({ content: [{ type: 'text', text: '{}' }] });
        }) as typeof fetch;
        await generateSsSlideshow({ format: 'simple', ANTHROPIC_API_KEY: 'test' }).catch(() => {});
        if (!system.includes('Everyday objects and places')) continue;
        everydayPrompts++;
        const axis = SS_EVERYDAY_AXES.find((option) => system.includes(option.spec));
        expect(axis).toBeDefined();
        seen.add(axis!.label);
    }
    expect(everydayPrompts).toBeGreaterThan(0);
    expect(seen.size).toBeGreaterThan(1); // a different axis per post, not one fixed corner
});

test('a chosen territory overrides the rotation, an unknown one falls back to it', async () => {
    const promptFor = async (territory: string) => {
        let system = '';
        globalThis.fetch = (async (_url: any, init: any) => {
            system = JSON.parse(init.body).system;
            return Response.json({ content: [{ type: 'text', text: '{}' }] });
        }) as typeof fetch;
        await generateSsSlideshow({ format: 'simple', territory, ANTHROPIC_API_KEY: 'test' }).catch(() => {});
        return system;
    };
    for (let run = 0; run < 8; run++) {
        expect(await promptFor('Everyday objects and places')).toContain('Everyday objects and places');
    }
    // A label from another format's pool must not break generation.
    expect(await promptFor('Not a real territory')).toContain("THIS POST'S ASSIGNED TERRITORY");
});

test('a chosen hook shape overrides the rotation', async () => {
    let system = '';
    globalThis.fetch = (async (_url: any, init: any) => {
        system = JSON.parse(init.body).system;
        return Response.json({ content: [{ type: 'text', text: '{}' }] });
    }) as typeof fetch;
    for (let run = 0; run < 8; run++) {
        await generateSsSlideshow({ format: 'simple', hook: 'Object reveal', ANTHROPIC_API_KEY: 'test' }).catch(() => {});
        expect(system).toContain('Object reveal');
        expect(system).not.toContain('Diagnosis reveal');
    }
});

test('everyday posts appear in the simple rotation as a matched hook and territory', async () => {
    let system = '';
    globalThis.fetch = (async (_url: any, init: any) => {
        system = JSON.parse(init.body).system;
        return Response.json({ content: [{ type: 'text', text: '{}' }] });
    }) as typeof fetch;
    let everyday = 0, other = 0;
    for (let run = 0; run < 300; run++) {
        await generateSsSlideshow({ format: 'simple', ANTHROPIC_API_KEY: 'test' }).catch(() => {});
        const hasTerritory = system.includes('Everyday objects and places');
        const hasHook = system.includes('Object reveal');
        // Never one half without the other: that mismatch is what made it invisible before.
        expect(hasTerritory).toBe(hasHook);
        if (hasTerritory) everyday++; else other++;
    }
    expect(everyday).toBeGreaterThan(5);   // it actually shows up
    expect(other).toBeGreaterThan(everyday); // and does not take over the rotation
});

test('the meme format keeps the 6-slide contract but swaps in the everyday topic engine', async () => {
    const axes = new Set<string>();
    let system = '';
    globalThis.fetch = (async (_url: any, init: any) => {
        system = JSON.parse(init.body).system;
        return Response.json({ content: [{ type: 'text', text: '{}' }] });
    }) as typeof fetch;
    for (let run = 0; run < 40; run++) {
        await generateSsSlideshow({ format: 'meme', ANTHROPIC_API_KEY: 'test' }).catch(() => {});
        // The topic engine replaces the archetype/domain pairing entirely.
        expect(system).toContain("THIS POST'S TOPIC");
        expect(system).not.toContain("THIS POST'S ASSIGNED COMBINATION");
        // UGC, not the meme format: no mascot, no reaction captions.
        expect(system).toContain('explained by bpd cat');   // named only to ban it
        expect(system).toContain('No mascot and no character');
        // Output contract is unchanged, so the rest of the pipeline still works.
        expect(system).toContain('{"role": "hook"|"skill"|"cta"');
        expect(system).toContain('image_query');
        const axis = SS_EVERYDAY_AXES.find((option) => system.includes(option.spec));
        expect(axis).toBeDefined();
        axes.add(axis!.label);
    }
    expect(axes.size).toBeGreaterThan(3); // the axis rotates per post
});

test('the description is clamped to two plain sentences', () => {
    expect(buildDescription('Small things that make BPD days harder. Five of them, from my own week. And a third one that should go.'))
        .toBe('Small things that make BPD days harder. Five of them, from my own week.');
    expect(buildDescription('what i keep in my bag 🖤 and why it helps ✨ #bpd #dbt'))
        .toBe('what i keep in my bag and why it helps');
    expect(buildDescription('')).toBe('');
    expect(buildDescription(undefined)).toBe('');
});

test('every generated format gets repeat protection from previous slide texts', async () => {
    const seen: string[] = [];
    globalThis.fetch = (async (_url: any, init: any) => {
        seen.push(JSON.parse(init.body).messages[0].content);
        return Response.json({ content: [{ type: 'text', text: '{}' }] });
    }) as typeof fetch;
    // The current and everyday flows had no repeat protection at all, which let them
    // produce the same topic twice in a row.
    for (const format of ['current', 'meme', 'simple']) {
        seen.length = 0;
        await generateSsSlideshow({
            format, previousTexts: ['5 chores that get stuck with BPD'], ANTHROPIC_API_KEY: 'test',
        }).catch(() => {});
        expect(seen[0]).toContain('ALREADY USED SLIDE TEXTS');
        expect(seen[0]).toContain('5 chores that get stuck with BPD');
    }
});

test('titles are cut at a real ending, never mid-phrase', () => {
    const hook = [{ text: 'fallback headline' }];
    // The cap alone produced "what your bag is doing to your nervous".
    expect(buildTitle('what your bag is doing to your nervous system', hook))
        .toBe('what your bag is doing');
    expect(buildTitle('why your routine keeps falling apart, and what helped', hook))
        .toBe('why your routine keeps falling apart');
    // Titles already within the cap are never touched.
    expect(buildTitle('errands that feel impossible with bpd', hook))
        .toBe('errands that feel impossible with bpd');
    // German titles get the same treatment.
    expect(buildTitle('was dein rucksack mit deinen schlechten tagen zu tun', hook))
        .toBe('was dein rucksack mit deinen schlechten tagen');
    expect(buildTitle('', hook)).toBe('fallback headline');
});

test('every flow returns the same metadata shape, legacy included', async () => {
    const fields = ['title', 'hashtags', 'description', 'caption', 'pinned_comment'];
    const legacyText = [
        'COVER: 5 things nobody tells you about DBT',
        'a tag line',
        '',
        '01 the first one', 'body text here',
        '02 the second one', 'body text here',
        '03 the third one', 'body text here',
        '04 the fourth one', 'body text here',
        '05 the fifth one', 'body text here',
        '',
        'DESCRIPTION: the laundry chair has been a fixture since march. turns out deciding was the part that broke.',
    ].join('\n');
    globalThis.fetch = (async () => Response.json({ content: [{ type: 'text', text: legacyText }] })) as typeof fetch;
    const result: any = await generateSsSlideshow({
        format: 'legacy', topicSeed: 'chores', ANTHROPIC_API_KEY: 'test',
    });
    for (const field of fields) expect(result).toHaveProperty(field);
    // Legacy answers in plain text, so its description has to be parsed back out.
    expect(result.description).toBe('the laundry chair has been a fixture since march. turns out deciding was the part that broke.');
    // ...and must not be left hanging on the final slide.
    expect(result.slides[result.slides.length - 1].text).not.toContain('DESCRIPTION');
});
