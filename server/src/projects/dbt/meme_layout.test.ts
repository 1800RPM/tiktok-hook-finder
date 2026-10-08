import { expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import vm from 'vm';
const scope: any = { window: {}, crypto };
vm.runInNewContext(readFileSync(new URL('../../../../client/meme-canvas.js', import.meta.url), 'utf8'), scope);
function editor(role: string, bottom = 750) {
    const instance = Object.create(scope.window.MemeCanvasEditor.prototype);
    instance.slides = [{ role }];
    instance.objects = () => [{ kind: 'text', y: bottom - 50, h: 100 }];
    return instance;
}
test('placement fits visible aspect ratios below protected content and within its column', () => {
    for (const role of ['hook', 'point']) for (const ratio of [.1, .7, 1, 2, 8]) {
        for (const slot of role === 'hook' ? ['left', 'right', 'accentLeft', 'accentRight'] : ['left', 'right']) {
            const o = editor(role).placement({ id: 'a', width: ratio * 100, height: 100 }, slot, 0);
            const a = Math.abs(o.angle * Math.PI / 180);
            const w = o.w * Math.cos(a) + o.h * Math.sin(a);
            const h = o.h * Math.cos(a) + o.w * Math.sin(a);
            expect(o.y - h / 2).toBeGreaterThanOrEqual(778 - .001);
            expect(o.y + h / 2).toBeLessThanOrEqual(1322 + .001);
            expect(o.x - w / 2).toBeGreaterThanOrEqual(slot.toLowerCase().includes('left') ? 0 : 540);
            expect(o.x + w / 2).toBeLessThanOrEqual(slot.toLowerCase().includes('left') ? 540 : 1080);
            expect(o.w / o.h).toBeCloseTo(ratio);
        }
    }
});
test('insufficient space fails before replacing current artwork', () => {
    expect(() => editor('point', 1300).placement({ width: 200, height: 400 }, 'left', 0)).toThrow('Make room');
});
