// Endumi meme carousels (German): the same editor as Meme Slides, with its own prompt, draft,
// pain gauges and closing slide. The cat library and sound pool are shared.
createMemeSlides({
    prefix: 'endo', storageKey: 'endo-meme-slides-v1', endpoint: '/generate-endo-meme-slideshow',
    settingNames: ['theme', 'notes', 'model', 'cta'], exportName: 'endo-meme-slides',
    migrateCats: false, example: false,
    canvas: {
        prefix: 'endo-art', artwork: 'endo-artwork', panel: '#panel-endo', filePrefix: 'endo-slide',
        low: 'assets/endo-slides/pain_level_low.png',
        high: 'assets/endo-slides/pain_level_high.png',
        gaugeLabel: 'Schmerz',
        cta: 'assets/endo-slides/cta_slide.png',
    },
});
