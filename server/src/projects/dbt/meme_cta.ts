// Where a meme carousel's app CTA lives. "slide" is the original closing app slide (seven
// slides). "native" drops that slide and lets the app come up once, mid-list, inside the body of
// one point (six slides): a closing ad slide on every post can cost reach, a passing mention
// inside real advice reads like the rest of the post. "none" is six slides with no app at all,
// pure value posts mixed in so the account does not read as an ad channel. Shared by the DBT-Mind, BFRB Ally and
// Endumi meme flows, which only differ in the app, its features and the example sentence.
import type { MemeSlide } from './meme_slideshow';

export type MemeCtaMode = 'slide' | 'native' | 'none';
export const memeCtaMode = (value: unknown): MemeCtaMode => (value === 'native' || value === 'none' ? value : 'slide');

// The app sits in point 3 or 4: never first (the post has not earned it yet) and never last
// (ending on the app reads like the ad slide it replaces).
export const pickNativePoint = () => (Math.random() < 0.5 ? 3 : 4);

export const slideCount = (mode: MemeCtaMode) => (mode === 'slide' ? 7 : 6);
export const slideCountWord = (mode: MemeCtaMode) => (mode === 'slide' ? 'seven' : 'six');
export const roleAt = (index: number, mode: MemeCtaMode): MemeSlide['role'] =>
    index === 0 ? 'hook' : mode === 'slide' && index === 6 ? 'cta' : 'point';
export const structureError = (mode: MemeCtaMode) =>
    mode === 'slide' ? 'Expected a cover, five points, and a CTA.' : 'Expected a cover and five points, with no app slide.';

type NativeCta = { app: string; features: string; example: string; point: number };

// Rewrites the prompt's structure block: six slides instead of seven, and the "7. role cta" line
// becomes the rule for the mention inside one point, or the rule that no app appears at all.
export function applyCtaMode(prompt: string, mode: MemeCtaMode, native: NativeCta) {
    if (mode === 'slide') return prompt;
    const ctaLine = prompt.split('\n').find((line) => line.startsWith('7. role cta:'));
    if (!ctaLine || !prompt.includes('Structure: exactly SEVEN slides')) throw new Error('Meme prompt structure changed; update applyCtaMode.');
    const rule = mode === 'none'
        ? `NO APP IN THIS POST (it has no closing app slide and ends on point 5): ${native.app} and every other app are never mentioned, not in any slide, caption, title or description. No "there's an app for that", no hint at a tool to download. The post is pure value from the character, nothing else.`
        : `NATIVE APP MENTION (this post has no closing app slide, it ends on point 5): ${native.app} comes up exactly once, inside the BODY of point ${native.point}, the way someone mentions a tool in passing in the middle of real advice. It must never read like an ad. Point ${native.point}'s action is one the app actually helps with, through ONE real feature: ${native.features} The headline names the action in plain words and never names the app. In the body, the app name sits inside the practical advice, for example: "${native.example}" Never use "download", "link in bio", "check out", "try", "game changer", prices, ratings, endorsements, promises or first-person usage claims. The two captions stay a funny contrast pair like every other point. The hook, every other point, the title and the description never mention ${native.app} or any app.`;
    return prompt.replace('Structure: exactly SEVEN slides', 'Structure: exactly SIX slides').replace(ctaLine, rule);
}

// A "none" post must not slip the app in anywhere.
export function checkNoMention(slides: MemeSlide[], native: { app: string; pattern: RegExp }) {
    const index = slides.findIndex((slide) => native.pattern.test([slide.headline, slide.body, slide.leftLabel, slide.rightLabel].join(' ')));
    if (index >= 0) throw new Error(`Slide ${index + 1} mentions ${native.app}, but this post has no app CTA. Remove the app and keep the advice.`);
}

// The mention has to be where it was asked for, once, and nowhere else.
export function checkNativeMention(slides: MemeSlide[], native: { app: string; pattern: RegExp; point: number }) {
    const mentions = (text: string) => native.pattern.test(text);
    const target = slides[native.point];
    if (!target || !mentions(target.body)) {
        throw new Error(`Point ${native.point} must mention ${native.app} once inside its body, as a passing tip in the advice. Rewrite that body and keep the rest.`);
    }
    if (mentions(target.headline) || mentions(target.leftLabel) || mentions(target.rightLabel)) {
        throw new Error(`Point ${native.point} names ${native.app} outside its body. Only the body may mention the app; the headline names the action.`);
    }
    const elsewhere = slides.findIndex((slide, index) => index !== native.point && mentions([slide.headline, slide.body, slide.leftLabel, slide.rightLabel].join(' ')));
    if (elsewhere >= 0) throw new Error(`Slide ${elsewhere + 1} mentions ${native.app}. The app appears only in point ${native.point}.`);
}
