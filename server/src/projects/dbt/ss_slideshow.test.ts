import { afterEach, expect, test } from 'bun:test';
import { buildDescription, generateSsSlideshow, SS_ARCHETYPES, SS_EVERYDAY_AXES } from './ss_slideshow';

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
