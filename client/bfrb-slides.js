// BFRB Ally meme carousels: the same editor as Meme Slides, with its own prompt, draft,
// gauges and closing slide. The cat library and sound pool are shared.
createMemeSlides({
    prefix: 'bfrb', storageKey: 'bfrb-meme-slides-v1', endpoint: '/generate-bfrb-meme-slideshow',
    settingNames: ['theme', 'notes', 'model'], exportName: 'bfrb-meme-slides',
    migrateCats: false, example: false,
    canvas: {
        prefix: 'bfrb-art', artwork: 'bfrb-artwork', panel: '#panel-bfrb', filePrefix: 'bfrb-slide',
        low: 'assets/bfrb-slides/urge_level_low.png',
        high: 'assets/bfrb-slides/urge_level_high.png',
        gaugeLabel: 'Urge',
        cta: 'assets/bfrb-slides/cta_slide.png',
    },
});
