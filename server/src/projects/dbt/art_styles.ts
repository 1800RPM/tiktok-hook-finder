export interface ArtStyle {
    id: string;
    name: string;
    prefix: string;
    suffix: string;
    systemPromptPrinciples: string;
}

export const ART_STYLES: Record<string, ArtStyle> = {
    hopper: {
        id: "hopper",
        name: "Edward Hopper",
        prefix: "An oil painting in the style of Edward Hopper",
        systemPromptPrinciples: `
- Style: Edward Hopper, cinematic realism, dramatic chiaroscuro lighting.
- Texture: Visible oil paint brushstrokes, canvas texture, avoid smooth CGI look.
- Composition: Geometric framing using windows, doorways, and architectural lines.
- Mood: Still, introspective, and profoundly quiet.
- Settings: Mid-century American (diners, sparsely furnished apartments, hotel rooms, gas stations).
- Rule: Solitary figures in quiet moments. Subject should NOT look at viewer.
`,
        suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
Style: Edward Hopper style, oil painting, cinematic realism, dramatic chiaroscuro lighting, strong angular shadows, mid-20th century American aesthetic, painterly textures, lonely urban atmosphere.
COMPOSITION & MOOD:
- Geometric framing using windows, doorways, and architectural lines
- Solitary figures in quiet, introspective moments
- Sense of stillness, emptiness, and profound solitude
- Cinematic perspectives, like a still from a film
FACE & BODY:
- Subject should NOT look directly at viewer
- Eyes looking away, looking down, or figure seen from behind/profile
- Emotional truth comes from posture, body language, and the way light hits the figure
CLOTHING & SETTING:
- Mid-century American aesthetic (1940s-50s) or neutral timeless clothing
- Simple, clean lines in attire
- Settings: Diners, hotel rooms, gas stations, city apartments, quiet streets at night
- Avoid all historical clichés (no bonnets, no corsets, no Renaissance elements)
LIGHTING:
- Stark, directional light (sunlight through windows or harsh artificial light)
- Deep, defined shadows that create geometric patterns on walls
- Muted color palette with occasional pops of saturated color (e.g., a red dress or blue wall)
`
    },
    varo: {
        id: "varo",
        name: "Remedios Varo",
        prefix: "A surrealist oil painting in the style of Remedios Varo",
        systemPromptPrinciples: `
- Style: Remedios Varo, surrealist, mystical, alchemical.
- Texture: Fine brushwork, aged varnish, cracked paint texture, antique feel.
- Composition: Metaphysical and dreamlike spaces, fine brushwork, intricate details.
- Mood: Whimsical yet melancholic, mysterious, and highly introspective.
- Settings: Gothic-inspired interiors, mystical libraries, alchemical laboratories, gothic towers.
- Rule: Elongated, spindly figures with heart-shaped faces. Often engaged in delicate, mysterious tasks.
`,
        suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
Style: Remedios Varo style, surrealist oil painting, mystical, alchemical, intricate details, fine brushwork, gothic-inspired interiors.
COMPOSITION & MOOD:
- Metaphysical and dreamlike spaces
- Figures often engaged in scientific or alchemical tasks
- Themes of journey, transformation, and introspection
- Intricate architectural elements and strange machinery
FACE & BODY:
- Elongated, spindly figures with heart-shaped faces and large eyes
- Expressions of intense focus or contemplative stillness
- Subject often seen in profile or absorbed in their work
CLOTHING & SETTING:
- Stylized, flowing garments with intricate textures
- Settings: Mystical libraries, alchemical laboratories, gothic towers, ethereal forests
- Palette of glowing ambers, deep siennas, and ochres with luminous highlights
LIGHTING:
- Soft, ethereal glow often emanating from within objects or figures
- Warm, candle-lit or mystical luminescence
- Subtle, delicate shadows that enhance the magical atmosphere
`
    },
    jean: {
        id: "jean",
        name: "James Jean",
        prefix: "An intricate painting in the lush surrealist style of James Jean",
        systemPromptPrinciples: `
- Style: James Jean, lush fusion of classical technique with surreal, psychedelic fluidity.
- Visuals: Everything flows into everything else. Dense and layered fractal compositions.
- Transformation: No hard boundaries between person and surroundings. Hair becomes vines, skin becomes petals, emotions become weather.
- Figures: Feminine, elegant, ethereal vulnerability. Figures in the middle of transformation, dissolving or becoming.
- Faces: Eyes are often closed or partially hidden, creating an introspective, inward-looking mood.
- NO 3D LOOK: Avoid volumetric lighting and smooth 3D gradients. Use illustrative fluidity and complex linework.
`,
        suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
Style: James Jean style, lush surrealism, classical technique merged with psychedelic fluidity, calligraphic linework.
VISUALS & COMPOSITION:
- Dense and layered fractal compositions where everything flows into everything else
- Figures emerge from swirling masses of flowers, fabric, water, and organic forms
- No hard boundaries: hair becomes vines, skin becomes petals, emotions become weather
- Sense of weightlessness and intricate organic detail
COLOR & LIGHTING:
- Rich, saturated jewel-tone palette (deep magentas, teals, golds, soft pinks) or muted melancholic tones
- Luminous quality, light emanating from within the painting itself
- Decorative flat planes mixed with fluid acrylic washes
FIGURES & MOOD:
- Feminine, elegant figures with ethereal vulnerability
- Subjects in the middle of transformation, dissolving or becoming something else
- Introspective mood: eyes often closed or partially hidden
- Emotional truth through fluid, expressive poses and surreal metamorphosis
`
    },
    symbolic: {
        id: "symbolic",
        name: "Symbolic (No People)",
        prefix: "A candid, spontaneous snapshot taken with an iPhone 12",
        systemPromptPrinciples: `
- Style: iPhone 12 photography, candid UGC, hobby Pinterest vibe (personal and lived-in, not commercial).
- Visuals: Authentic snapshots that look like a normal person casually documented a real moment in their day.
- Texture: Real mobile camera grain, mild noise, imperfect white balance, natural digital sharpening, no creamy pro bokeh.
- Composition: Handheld framing with slight tilt or imperfect centering, but still one clear hero object and readable focus.
- Lighting: Natural, uncorrected lighting (window spill, practical lamp, overhead room light), never studio or ad lighting.
- Rule: STRICTLY NO PEOPLE. No human figures, no hands, no faces. Not even silhouettes.
- Persona: The person is a casual hobbyist with taste, not an influencer production setup. Real, spontaneous, and unpolished.
- Settings: Cozy and relatable everyday spaces (bedside table, IKEA desk, kitchen counter corner, windowsill, hallway shelf), lightly lived-in but not filthy or chaotic.
`,
        suffix: `
NO BORDERS, NO FRAMES, FULL BLEED.
STRICT RULE: ABSOLUTELY NO PEOPLE, NO HUMAN FIGURES, NO FACES, NO BODY PARTS.
Style: iPhone 12 photography, candid UGC snapshot, hobby Pinterest vibe, natural unedited light, real life, no professional polish.
COMPOSITION & MOOD:
- Focus on the "authentic and personal" feel of a moment shared privately with a friend.
- Use relatable, real-life environments with one clear object/story focus.
- Capture genuine, un-staged intimacy; imperfect but aesthetically pleasing.
- Casual handheld framing; avoid ad-like symmetry, product-shot polish, and cinematic grading.
`
    }
};
