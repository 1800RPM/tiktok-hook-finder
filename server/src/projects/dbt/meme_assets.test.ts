import { expect, test } from 'bun:test';
import { parseAssetJson, validateLabels, validateSelection } from './meme_assets';

test('accepts JSON with a model preamble or code fence', () => {
    expect(parseAssetJson('Looking at the images.\n```json\n{"alternatives":[]}\n```')).toEqual({ alternatives: [] });
    expect(() => parseAssetJson('No JSON')).toThrow();
});

test('label schema rejects missing meanings and invalid roles', () => {
    const labels = { description: 'Cat giving a thumbs up', emotion: 'Sad but willing', meaning: 'Doing it while upset', tags: ['acceptance'], role: 'character' };
    expect(validateLabels(labels).meaning).toBe('Doing it while upset');
    expect(() => validateLabels({ ...labels, meaning: '' })).toThrow();
    expect(() => validateLabels({ ...labels, role: 'gauge' })).toThrow();
});
test('selection accepts only known IDs, correct slide indices and unique slots', () => {
    const available = new Set(['a', 'b', 'c']);
    const result = { slides: [{ index: 0, assets: [{ id: 'a', slot: 'left', reason: 'First reaction' }, { id: 'b', slot: 'right', reason: 'Second reaction' }] }] };
    expect(validateSelection(result, available, ['hook'], false).slides).toHaveLength(1);
    expect(() => validateSelection(result, new Set(['a']), ['hook'], false)).toThrow();
    expect(() => validateSelection(result, available, ['hook', 'point'], false)).toThrow();
    const duplicate = structuredClone(result); duplicate.slides[0]!.assets[1]!.slot = 'left';
    expect(() => validateSelection(duplicate, available, ['hook'], false)).toThrow();
    const wrongIndex = structuredClone(result); wrongIndex.slides[0]!.index = 3;
    expect(() => validateSelection(wrongIndex, available, ['hook'], false)).toThrow();
});
test('alternatives cannot reference missing or excluded assets', () => {
    expect(validateSelection({ alternatives: [{ id: 'b', reason: 'A calmer expression' }] }, new Set(['b']), ['hook'], true).alternatives).toHaveLength(1);
    expect(() => validateSelection({ alternatives: [{ id: 'a', reason: 'Same asset' }] }, new Set(['b']), ['hook'], true)).toThrow();
});
test('the same image cannot appear twice in one post', () => {
    const available = new Set(['a', 'b', 'c']);
    const repeatedInSlide = { slides: [{ index: 0, assets: [{ id: 'a', slot: 'left', reason: 'x' }, { id: 'a', slot: 'right', reason: 'y' }] }] };
    expect(() => validateSelection(repeatedInSlide, available, ['point'], false)).toThrow(/twice/);
    const repeatedAcrossSlides = { slides: [
        { index: 0, assets: [{ id: 'a', slot: 'left', reason: 'x' }, { id: 'b', slot: 'right', reason: 'y' }] },
        { index: 1, assets: [{ id: 'c', slot: 'left', reason: 'x' }, { id: 'a', slot: 'right', reason: 'y' }] }] };
    expect(() => validateSelection(repeatedAcrossSlides, available, ['hook', 'point'], false)).toThrow(/twice/);
});
