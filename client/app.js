const state = {
    currentService: 'dbt',
    currentFormat: 'relatable',
    currentTopic: 'favorite_person',
    currentDbtSlideType: 'weird_hack_v2',
    selectedDbtHookImage: 'default',
    useStoryAiFlow: false,
    includeBranding: true,
    slides: [],
    currentSlideIndex: 0,
    characterAnchor: [], // Array of dataUrl strings for SYP
    imagePrompts: [],
    dbtCarouselText: null,
    generatedImages: [],
    lhFormatTextOnly: false,
    tsBgMode: 'paper',
    tsBgImage: null,
    isDragging: false,
    isResizing: false,
    isResizingHorizontal: false,
    dragStartIndex: -1,
    dragTarget: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOffset: { x: 0, y: 0 },
    resizeStartScale: 1.5,
    resizeStartDistance: 0,
    resizeStartWidth: 120,
    isResizingLeft: false,
    selectedRefIndices: [],
    customImages: [],
    useStaticSlide1: false,
    staticSlides: {},
    characterAnchorDbt: [],  // Array of dataUrl strings
    ssLibraryExpanded: false,
    ssStepPhotoSets: [],
};

function normalizeApiBase(base) {
    return String(base || '').trim().replace(/\/+$/, '');
}

function resolveApiBase() {
    const PRODUCTION_API_BASE = 'https://tiktokhookfinder-production.up.railway.app';
    const fromQuery = new URLSearchParams(window.location.search).get('apiBase');
    const fromStorage = localStorage.getItem('TIKTOK_API_BASE');
    const fromWindow = window.__API_BASE__;
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    // On non-local hosts an explicit ?apiBase= wins and is remembered, so later plain
    // visits keep working (remote-access tunnels). Persisted values that point at a
    // local address are still discarded — those only ever break a live deployment.
    if (!isLocalHost) {
        const queryOverride = normalizeApiBase(fromQuery);
        if (queryOverride) {
            localStorage.setItem('TIKTOK_API_BASE', queryOverride);
            return queryOverride;
        }
        const storedOverride = normalizeApiBase(fromStorage);
        if (storedOverride && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(storedOverride)) {
            return storedOverride;
        }
        if (fromStorage) localStorage.removeItem('TIKTOK_API_BASE');
        return PRODUCTION_API_BASE;
    }

    const configured = fromQuery || fromStorage || fromWindow;
    if (configured) {
        const normalized = normalizeApiBase(configured);
        if (normalized) {
            localStorage.setItem('TIKTOK_API_BASE', normalized);
            return normalized;
        }
    }

    return 'http://localhost:3001';
}

const API_BASE = resolveApiBase();

// Allow passing the API key via ?apiKey= once; it persists in localStorage after that.
(function persistApiKeyFromQuery() {
    const key = new URLSearchParams(window.location.search).get('apiKey');
    if (key) localStorage.setItem('TIKTOK_API_KEY', key.trim());
})();

const dbtHookImageOptions = {
    default: {
        label: 'Default Slide 1',
        filename: null
    },
    hook_image_elevator: {
        label: 'Elevator',
        filename: 'hook_image_elevator.png'
    },
    hook_image_tattoomirror: {
        label: 'Tattoo Mirror',
        filename: 'hook_image_tattoomirror.png'
    },
    hook_image_person_cat: {
        label: 'Person + Cat',
        filename: 'hook_image_person_cat.png'
    },
    hook_image_waist_straps: {
        label: 'Waist Straps',
        filename: 'hook_image_waist_straps.png'
    },
    hook_image_tattoo_car: {
        label: 'Tattoo Car',
        filename: 'hook_image_tattoo_car.png'
    },
    hook_image_bathroom: {
        label: 'Bathroom',
        filename: 'hook_image_bathroom.png'
    },
    hook_image_brown_hair_car: {
        label: 'Brown Hair Car',
        filename: 'hook_image_brown_hair_car.png'
    },
    hook_image_asian: {
        label: 'Asian',
        filename: 'hook_image_asian.png'
    },
    hook_image_baddie_tat_car: {
        label: 'Baddie Tat Car',
        filename: 'hook_image_baddie_tat_car.png',
        flows: ['permission_v1']
    },
    hook_image_purple_hair: {
        label: 'Purple Hair',
        filename: 'hook_image_purple_hair.png',
        flows: ['permission_v1']
    },
    hook_image_short_hair_nack_tat: {
        label: 'Short Hair Neck Tat',
        filename: 'hook_image_short_hair_nack_tat.png',
        flows: ['permission_v1']
    },
    hook_image_side_view_car: {
        label: 'Side View Car',
        filename: 'hook_image_side_view_car.png',
        flows: ['permission_v1']
    }
};

const dbtCharacterTemplates = {
    hannahbpd: {
        label: 'hannahbpd',
        staticSlidesByFlow: {
            weird_hack: {
                0: 'slide1.png',
                5: 'assets/dbt-templates/cta_slide_template.jpg'
            },
            weird_hack_v2: {
                0: 'slide1.png'
            },
            vent_now_style: {
            },
            permission_v1: {
            },
            three_tips: {
                5: 'assets/dbt-templates/cta_slide_template.jpg'
            },
            i_say_they_say: {
            }
        }
    },
    kendra: {
        label: 'Kendra',
        staticSlidesByFlow: {
            weird_hack: {
                0: 'assets/dbt-templates/weidhackv2/custom-image-1775651626440.png',
                5: 'assets/dbt-templates/cta_slide_template.jpg'
            },
            weird_hack_v2: {
                0: 'assets/dbt-templates/weidhackv2/custom-image-1775651626440.png'
            },
            vent_now_style: {
            },
            permission_v1: {
                0: 'assets/dbt-templates/weidhackv2/custom-image-1775651626440.png'
            },
            three_tips: {
                5: 'assets/dbt-templates/cta_slide_template.jpg'
            },
            i_say_they_say: {
            }
        }
    }
};

function getApiAuthHeaders() {
    const fromStorage = localStorage.getItem('TIKTOK_API_KEY') || localStorage.getItem('TIKTOK_API_PASSWORD');
    const fromWindow = window.__API_KEY__ || window.__API_PASSWORD__;
    const apiKey = (fromStorage || fromWindow || '').trim();
    if (!apiKey) return {};
    return {
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
    };
}

// localStorage is per-origin, so serving the client on a new port (3000 vs 8080) silently loses
// the key and every call comes back 401. Ask for it once instead of failing opaquely.
function promptForApiKey() {
    const entered = window.prompt(
        'API key required.\n\nThis browser origin has no key stored (keys are saved per port).\nPaste your API key to save it here:',
        ''
    );
    const key = (entered || '').trim();
    if (!key) return false;
    localStorage.setItem('TIKTOK_API_KEY', key);
    return true;
}

// Wrapping fetch once beats threading retry logic through ~20 call sites: any API request that
// comes back 401 asks for the key and replays itself with it.
(function installAuthRetry() {
    const nativeFetch = window.fetch.bind(window);
    let prompting = false;
    let badKeyPrompted = false;

    window.fetch = async (input, init = {}) => {
        const response = await nativeFetch(input, init);
        const url = typeof input === 'string' ? input : (input?.url || '');
        if (response.status !== 401 || !url.startsWith(API_BASE)) return response;

        // Headers may arrive as a plain object or a Headers instance — normalise before merging.
        const replay = () => {
            const headers = new Headers(init.headers || {});
            Object.entries(getApiAuthHeaders()).forEach(([name, value]) => headers.set(name, value));
            return nativeFetch(input, { ...init, headers });
        };

        const storedKey = getApiAuthHeaders()['X-API-Key'];
        const sentKey = new Headers(init.headers || {}).get('X-API-Key');
        // A sibling request that was already in flight may have collected the key in the
        // meantime — replay with it instead of asking the user a second time.
        if (storedKey && storedKey !== sentKey) return replay();

        // Otherwise the stored key is the one that just failed, so it's wrong: ask again, but
        // only once per page load so a bad key can't turn into a prompt storm.
        if (prompting || (storedKey && badKeyPrompted)) return response;
        prompting = true;
        const gotKey = promptForApiKey();
        prompting = false;
        if (storedKey) badKeyPrompted = true;
        return gotKey ? replay() : response;
    };
})();

const parseDataUrl = (dataUrl) => {
    if (!dataUrl) return null;
    if (typeof dataUrl === 'object') return dataUrl; // Already parsed
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return { data: dataUrl }; // Assume raw base64 if not data URL
    return {
        mimeType: matches[1],
        data: matches[2]
    };
};

function isIFeelFlowActive() {
    return state.currentService === 'dbt'
        && (elements.flowSelect?.value || state.currentDbtSlideType) === 'i_say_they_say';
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function applyIFeelPhonePhotoPostProcessing(imageUrl) {
    if (!imageUrl || !isIFeelFlowActive()) return imageUrl;

    const img = await loadImageElement(imageUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return imageUrl;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageUrl;

    const rotationDeg = (1.5 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1);
    const rotationRad = rotationDeg * (Math.PI / 180);
    const scaleBoost = 1.05 + Math.random() * 0.03;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotationRad);
    ctx.scale(scaleBoost, scaleBoost);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    const warmRed = 8 + Math.floor(Math.random() * 10);
    const warmGreen = 3 + Math.floor(Math.random() * 8);
    const coolBlueCut = 4 + Math.floor(Math.random() * 8);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.min(255, pixels[i] + warmRed);
        pixels[i + 1] = Math.min(255, pixels[i + 1] + warmGreen);
        pixels[i + 2] = Math.max(0, pixels[i + 2] - coolBlueCut);
    }
    ctx.putImageData(imageData, 0, 0);

    const brightenLeft = Math.random() < 0.5;
    const lightStrength = 0.12 + Math.random() * 0.05;
    const shadowStrength = 0.05 + Math.random() * 0.04;
    const lightGradient = ctx.createLinearGradient(
        brightenLeft ? 0 : width,
        0,
        brightenLeft ? width : 0,
        0
    );
    lightGradient.addColorStop(0, `rgba(255, 235, 200, ${lightStrength.toFixed(3)})`);
    lightGradient.addColorStop(0.6, 'rgba(255, 240, 220, 0.025)');
    lightGradient.addColorStop(1, `rgba(60, 35, 20, ${shadowStrength.toFixed(3)})`);
    ctx.fillStyle = lightGradient;
    ctx.fillRect(0, 0, width, height);

    const glareWidth = width * (0.12 + Math.random() * 0.1);
    const glareX = width * (0.18 + Math.random() * 0.56);
    const glareRotation = (-0.22 + Math.random() * 0.44);
    ctx.save();
    ctx.translate(glareX, height / 2);
    ctx.rotate(glareRotation);
    const glareGradient = ctx.createLinearGradient(-glareWidth / 2, 0, glareWidth / 2, 0);
    glareGradient.addColorStop(0, 'rgba(255,255,255,0)');
    glareGradient.addColorStop(0.5, `rgba(255,248,235,${(0.06 + Math.random() * 0.05).toFixed(3)})`);
    glareGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glareGradient;
    ctx.fillRect(-glareWidth / 2, -height * 0.6, glareWidth, height * 1.2);
    ctx.restore();

    const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * (0.38 + Math.random() * 0.04),
        width / 2,
        height / 2,
        Math.max(width, height) * 0.78
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.72, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(25, 18, 12, ${(0.18 + Math.random() * 0.08).toFixed(3)})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const cornerGlow = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9
    );
    cornerGlow.addColorStop(0, 'rgba(255,240,220,0)');
    cornerGlow.addColorStop(1, `rgba(120, 90, 55, ${(0.04 + Math.random() * 0.03).toFixed(3)})`);
    ctx.fillStyle = cornerGlow;
    ctx.fillRect(0, 0, width, height);

    const quality = 0.72 + Math.random() * 0.06;
    return canvas.toDataURL('image/jpeg', quality);
}

async function maybePostProcessIFeelImage(imageUrl) {
    if (!isIFeelFlowActive()) return imageUrl;
    try {
        return await applyIFeelPhonePhotoPostProcessing(imageUrl);
    } catch (error) {
        console.warn('I feel image post-processing failed, using original image.', error);
        return imageUrl;
    }
}

// ==========================================
// ELEMENTS CACHE
// ==========================================
const elements = {
    nativeGenFormat: document.getElementById('native-gen-format'),
    nativeGenTopic: document.getElementById('native-gen-topic'),
    nativeGenTopicDbt: document.getElementById('native-gen-topic_dbt'),
    dbtSlideTypeSelect: document.getElementById('dbt-slide-type-select'),
    dbtModelSelect: document.getElementById('dbt-model-select'),
    dbtLanguageSelect: document.getElementById('dbt-language-select'),
    dbtTextStyleSelect: document.getElementById('dbt-text-style-select'),
    dbtTextOnlyMode: document.getElementById('dbt-text-only-mode'),
    dbtStoryAiFlow: document.getElementById('dbt-story-ai-flow'),
    dbtStoryAiFlowToggle: document.getElementById('dbt-story-ai-flow-toggle'),
    dbtStoryAiFlowPanel: document.getElementById('dbt-story-ai-flow-panel'),
    dbtStoryAiSlide1UploadBtn: document.getElementById('dbt-story-ai-slide1-upload-btn'),
    dbtStoryAiSlide1FileInput: document.getElementById('dbt-story-ai-slide1-file-input'),
    dbtStoryAiSlide1Preview: document.getElementById('dbt-story-ai-slide1-preview'),
    artStyleSelect: document.getElementById('art-style-select'),
    generateNativeSlidesBtn: document.getElementById('generate-native-slides-btn'),
    lhTopicSelect: document.getElementById('lh-topic-select'),
    lhFormatSelect: document.getElementById('lh-format-select'),
    lhThemeInput: document.getElementById('lh-theme-input'),
    lhLegacyGenerateBtn: document.getElementById('lh-legacy-generate-btn'),
    lhFunnelOutput: document.getElementById('lh-funnel-output'),
    lhCaptionText: document.getElementById('lh-caption-text'),
    lhPinnedText: document.getElementById('lh-pinned-text'),
    lhCopyCaptionBtn: document.getElementById('lh-copy-caption-btn'),
    lhCopyPinnedBtn: document.getElementById('lh-copy-pinned-btn'),
    lhTextOnlyMode: document.getElementById('lh-text-only-mode'),
    lhMockMode: document.getElementById('lh-mock-mode'),
    lhGenerateBtn: document.getElementById('lh-generate-btn'),
    lhRegenStickersBtn: document.getElementById('lh-regen-stickers-btn'),
    lhMockStickersBtn: document.getElementById('lh-mock-stickers-btn'),
    lhRegenAllStickersBtn: document.getElementById('lh-regen-all-stickers-btn'),
    lhGenerateMetadataBtn: document.getElementById('lh-generate-metadata-btn'),
    lhMetadataOutput: document.getElementById('lh-metadata-output'),
    lhMetadataTitle: document.getElementById('lh-metadata-title'),
    lhMetadataHashtags: document.getElementById('lh-metadata-hashtags'),
    lhMetadataDesc: document.getElementById('lh-metadata-desc'),
    lhCopyMetadataBtn: document.getElementById('lh-copy-metadata-btn'),
    lhDownloadAllBtn: document.getElementById('lh-download-all-btn'),
    ssThemeInput: document.getElementById('ss-theme-input'),
    ssFormatSelect: document.getElementById('ss-format-select'),
    ssArchetypeSelect: document.getElementById('ss-archetype-select'),
    ssArchetypeGroup: document.getElementById('ss-archetype-group'),
    ssTerritorySelect: document.getElementById('ss-territory-select'),
    ssHookSelect: document.getElementById('ss-hook-select'),
    ssHookGroup: document.getElementById('ss-hook-group'),
    ssTerritoryGroup: document.getElementById('ss-territory-group'),
    ssModelSelect: document.getElementById('ss-model-select'),
    ssTopicSeedTools: document.getElementById('ss-topic-seed-tools'),
    ssGenerateTopicSeedsBtn: document.getElementById('ss-generate-topic-seeds-btn'),
    ssTopicSeedSelect: document.getElementById('ss-topic-seed-select'),
    ssTopicSeedList: document.getElementById('ss-topic-seed-list'),
    ssTopicSeedStatus: document.getElementById('ss-topic-seed-status'),
    ssFormatHint: document.getElementById('ss-format-hint'),
    ssGenerationHint: document.getElementById('ss-generation-hint'),
    ssOpenLegacyBtn: document.getElementById('ss-open-legacy-btn'),
    ssGenerateBtn: document.getElementById('ss-generate-btn'),
    ssSlidesOutput: document.getElementById('ss-slides-output'),
    ssSlidesList: document.getElementById('ss-slides-list'),
    ssSlidesEmpty: document.getElementById('ss-slides-empty'),
    ssCopyAllBtn: document.getElementById('ss-copy-all-btn'),
    ssFunnelOutput: document.getElementById('ss-funnel-output'),
    ssFunnelEmpty: document.getElementById('ss-funnel-empty'),
    ssTitleText: document.getElementById('ss-title-text'),
    ssHashtagsText: document.getElementById('ss-hashtags-text'),
    ssCopyTitleBtn: document.getElementById('ss-copy-title-btn'),
    ssDownloadAllBtn: document.getElementById('ss-download-all-btn'),
    ssCaptionText: document.getElementById('ss-caption-text'),
    ssDescriptionText: document.getElementById('ss-description-text'),
    ssSoundList: document.getElementById('ss-sound-list'),
    ssSoundStatus: document.getElementById('ss-sound-status'),
    ssSoundRefresh: document.getElementById('ss-sound-refresh'),
    ssPinnedText: document.getElementById('ss-pinned-text'),
    ssCopyCaptionBtn: document.getElementById('ss-copy-caption-btn'),
    ssLibrarySelect: document.getElementById('ss-library-select'),
    ssHookLibrarySelect: document.getElementById('ss-hook-library-select'),
    ssLibraryGrid: document.getElementById('ss-library-grid'),
    ssLibraryMoreBtn: document.getElementById('ss-library-more-btn'),
    ssPhotoPickerStatus: document.getElementById('ss-photo-picker-status'),
    ssFillPhotosBtn: document.getElementById('ss-fill-photos-btn'),
    ssClearPhotosBtn: document.getElementById('ss-clear-photos-btn'),
    ssCopyPinnedBtn: document.getElementById('ss-copy-pinned-btn'),
    ssExportResSelect: document.getElementById('ss-export-res-select'),
    floatingDownloadBtn: document.getElementById('floating-download-btn'),
    ssLanguageSelect: document.getElementById('ss-language-select'),
    tsScenarioSelect: document.getElementById('ts-scenario-select'),
    tsPovSelect: document.getElementById('ts-pov-select'),
    tsToneSelect: document.getElementById('ts-tone-select'),
    tsLanguageSelect: document.getElementById('ts-language-select'),
    tsPaperSelect: document.getElementById('ts-paper-select'),
    tsBgModeSelect: document.getElementById('ts-bg-mode-select'),
    tsBgPhotoControls: document.getElementById('ts-bg-photo-controls'),
    tsBgUploadBtn: document.getElementById('ts-bg-upload-btn'),
    tsBgFileInput: document.getElementById('ts-bg-file-input'),
    tsBgPreviewWrap: document.getElementById('ts-bg-preview-wrap'),
    tsBgPreview: document.getElementById('ts-bg-preview'),
    tsBgClearBtn: document.getElementById('ts-bg-clear-btn'),
    tsThemeInput: document.getElementById('ts-theme-input'),
    tsGenerateBtn: document.getElementById('ts-generate-btn'),
    tsSlidesOutput: document.getElementById('ts-slides-output'),
    tsSlidesList: document.getElementById('ts-slides-list'),
    tsSlidesEmpty: document.getElementById('ts-slides-empty'),
    tsHooksOutput: document.getElementById('ts-hooks-output'),
    tsHooksList: document.getElementById('ts-hooks-list'),
    tsHooksEmpty: document.getElementById('ts-hooks-empty'),
    tsCopyAllBtn: document.getElementById('ts-copy-all-btn'),
    tsFunnelOutput: document.getElementById('ts-funnel-output'),
    tsFunnelEmpty: document.getElementById('ts-funnel-empty'),
    tsTitleText: document.getElementById('ts-title-text'),
    tsHashtagsText: document.getElementById('ts-hashtags-text'),
    tsCaptionText: document.getElementById('ts-caption-text'),
    tsPinnedText: document.getElementById('ts-pinned-text'),
    tsCopyTitleBtn: document.getElementById('ts-copy-title-btn'),
    tsCopyCaptionBtn: document.getElementById('ts-copy-caption-btn'),
    tsCopyPinnedBtn: document.getElementById('ts-copy-pinned-btn'),
    tsDownloadAllBtn: document.getElementById('ts-download-all-btn'),
    ssBatchAccount: document.getElementById('ss-batch-account'),
    ssBatchCount: document.getElementById('ss-batch-count'),
    ssBatchGenerateBtn: document.getElementById('ss-batch-generate-btn'),
    ssBatchResults: document.getElementById('ss-batch-results'),
    compatibilityWarning: document.getElementById('compatibility-warning'),
    dbtPromptEngineeringStep: document.getElementById('step-2'),
    slideTextInput: document.getElementById('slide-text-input'),
    slidesContainer: document.getElementById('slides-container'),
    slideCounter: document.getElementById('slide-counter'),
    renderCanvas: document.getElementById('render-canvas'),
    serviceSwitcher: document.querySelector('.service-switcher'),
    servicePanels: document.querySelectorAll('.service-panel'),
    viralComboBtns: document.querySelectorAll('.viral-combo-btn'),
    characterPreset: document.getElementById('character-preset'),
    characterPresetStep1: document.getElementById('character-preset-step1'),
    dbtHookImageSelect: document.getElementById('dbt-hook-image-select'),
    dbtHookImageSelectStep1: document.getElementById('dbt-hook-image-select-step1'),
    generateImagePromptsBtn: document.getElementById('generate-image-prompts-btn'),
    generateAiImagesBtn: document.getElementById('generate-ai-images'),
    downloadAllBtn: document.getElementById('download-all'),
    downloadCurrentBtn: document.getElementById('download-current'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    fontSizeInput: document.getElementById('font-size'),
    textColorInput: document.getElementById('text-color'),
    bgColorInput: document.getElementById('bg-color'),
    textFontFamilySelect: document.getElementById('text-font-family'),
    textOutlineToggle: document.getElementById('text-outline-toggle'),
    darkOverlayInput: document.getElementById('dark-overlay'),
    imagePromptsContainer: document.getElementById('image-prompts-container'),
    generatedImagesContainer: document.getElementById('generated-images-container'),
    promptsLoading: document.getElementById('prompts-loading'),
    imagePromptsSection: document.getElementById('image-prompts-section'),
    hookOptions: document.getElementById('hook-options'),
    hookList: document.getElementById('hook-list'),
    quickImproveHookBtn: document.getElementById('quick-improve-hook'),
    parseSlidesBtn: document.getElementById('parse-slides'),
    aiImagesProgress: document.getElementById('ai-images-progress'),
    aiImagesProgressFill: document.getElementById('ai-images-progress-fill'),
    aiImagesProgressText: document.getElementById('ai-images-progress-text'),
    uploadAnchorBtn: document.getElementById('upload-anchor-btn'),
    anchorFileInput: document.getElementById('anchor-file-input'),
    anchorImgPreview: document.getElementById('anchor-img-preview'),
    characterAnchorPreview: document.getElementById('character-anchor-preview'),
    clearAnchorBtn: document.getElementById('clear-anchor-btn'),
    metadataOutput: document.getElementById('metadata-output'),
    metadataTitle: document.getElementById('metadata-title'),
    metadataDesc: document.getElementById('metadata-desc'),
    generateMetadataBtn: document.getElementById('generate-metadata-btn'),
    copyMetadataBtn: document.getElementById('copy-metadata-btn'),
    hookContextStatus: document.getElementById('hook-context-status'),
    dbtCarouselTopicInput: document.getElementById('dbt-carousel-topic-input'),
    dbtCarouselAngleInput: document.getElementById('dbt-carousel-angle-input'),
    dbtCarouselAudienceInput: document.getElementById('dbt-carousel-audience-input'),
    dbtCarouselToneInput: document.getElementById('dbt-carousel-tone-input'),
    dbtCarouselSlideCountInput: document.getElementById('dbt-carousel-slide-count-input'),
    dbtCarouselAllowEmojis: document.getElementById('dbt-carousel-allow-emojis'),
    dbtCarouselSlidesInput: document.getElementById('dbt-carousel-slides-input'),
    dbtCarouselHandleInput: document.getElementById('dbt-carousel-handle-input'),
    dbtCarouselCopyMode: document.getElementById('dbt-carousel-copy-mode'),
    dbtCarouselPaletteInput: document.getElementById('dbt-carousel-palette-input'),
    dbtCarouselCharacterInput: document.getElementById('dbt-carousel-character-input'),
    generateDbtCarouselTextBtn: document.getElementById('generate-dbt-carousel-text-btn'),
    dbtCarouselTextOutput: document.getElementById('dbt-carousel-text-output'),
    dbtCarouselJsonOutput: document.getElementById('dbt-carousel-json-output'),
    dbtCarouselPreviewOutput: document.getElementById('dbt-carousel-preview-output'),
    copyDbtCarouselJsonBtn: document.getElementById('copy-dbt-carousel-json-btn'),
    copyDbtCarouselPreviewBtn: document.getElementById('copy-dbt-carousel-preview-btn'),
    useDbtCarouselTextBtn: document.getElementById('use-dbt-carousel-text-btn'),
    generateDbtCarouselPromptsBtn: document.getElementById('generate-dbt-carousel-prompts-btn'),
    copyAllDbtCarouselPromptsBtn: document.getElementById('copy-all-dbt-carousel-prompts-btn'),
    dbtCarouselWarnings: document.getElementById('dbt-carousel-warnings'),
    dbtCarouselPromptsSection: document.getElementById('dbt-carousel-prompts-section'),
    dbtCarouselPromptsContainer: document.getElementById('dbt-carousel-prompts-container'),

    // Stickman Prompt Studio
    stickmanSeriesTitle: document.getElementById('stickman-series-title'),
    generateStickmanTopicsBtn: document.getElementById('generate-stickman-topics-btn'),
    stickmanPreviousTopics: document.getElementById('stickman-previous-topics'),
    stickmanModelSelect: document.getElementById('stickman-model-select'),
    stickmanTopicResults: document.getElementById('stickman-topic-results'),
    stickmanPartLabel: document.getElementById('stickman-part-label'),
    stickmanSlideCount: document.getElementById('stickman-slide-count'),
    stickmanSlideContent: document.getElementById('stickman-slide-content'),
    stickmanExtraDirection: document.getElementById('stickman-extra-direction'),
    generateStickmanPromptsBtn: document.getElementById('generate-stickman-prompts-btn'),
    copyAllStickmanPromptsBtn: document.getElementById('copy-all-stickman-prompts-btn'),
    stickmanOutputSection: document.getElementById('stickman-output-section'),
    stickmanPromptsContainer: document.getElementById('stickman-prompts-container'),

    // SYP Elements
    nativeGenProfileSyp: document.getElementById('native-gen-profile_syp'),
    nativeGenTopicSyp: document.getElementById('native-gen-topic_syp'),
    generateNativeSlidesBtnSyp: document.getElementById('generate-native-slides-btn_syp'),
    slideTextInputSyp: document.getElementById('slide-text-input_syp'),
    quickImproveHookBtnSyp: document.getElementById('quick-improve-hook_syp'),
    parseSlidesBtnSyp: document.getElementById('parse-slides_syp'),
    generateImagePromptsBtnSyp: document.getElementById('generate-image-prompts-btn_syp'),
    generateAiImagesBtnSyp: document.getElementById('generate-ai-images_syp'),
    metadataOutputSyp: document.getElementById('metadata-output_syp'),
    metadataTitleSyp: document.getElementById('metadata-title_syp'),
    metadataDescSyp: document.getElementById('metadata-desc_syp'),
    generateMetadataBtnSyp: document.getElementById('generate-metadata-btn_syp'),
    copyMetadataBtnSyp: document.getElementById('copy-metadata-btn_syp'),
    characterPresetSyp: document.getElementById('character-preset_syp'),
    uploadAnchorBtnSyp: document.getElementById('upload-anchor-btn_syp'),
    anchorFileInputSyp: document.getElementById('anchor-file-input_syp'),
    aiImagesProgressSyp: document.getElementById('ai-images-progress_syp'),
    aiImagesProgressFillSyp: document.getElementById('ai-images-progress-fill_syp'),
    aiImagesProgressTextSyp: document.getElementById('ai-images-progress-text_syp'),
    generatedImagesContainerSyp: document.getElementById('generated-images-container_syp'),
    parseImagesToSlidesBtn: document.getElementById('parse-images-to-slides'),
    parseImagesToSlidesBtnSyp: document.getElementById('parse-images-to-slides_syp'),
    parsingToolsContainer: document.getElementById('parsing-tools-container'),
    parsingToolsContainerSyp: document.getElementById('parsing-tools-container_syp'),
    fontSizeInputSyp: document.getElementById('font-size_syp'),
    textColorInputSyp: document.getElementById('text-color_syp'),
    bgColorInputSyp: document.getElementById('bg-color_syp'),
    textFontFamilySelectSyp: document.getElementById('text-font-family_syp'),
    textOutlineToggleSyp: document.getElementById('text-outline-toggle_syp'),
    darkOverlayInputSyp: document.getElementById('dark-overlay_syp'),
    textWidthInput: document.getElementById('text-width'),
    textWidthInputSyp: document.getElementById('text-width_syp'),
    imagePromptsContainerSyp: document.getElementById('image-prompts-container_syp'),
    imagePromptsSectionSyp: document.getElementById('image-prompts-section_syp'),
    promptsLoadingSyp: document.getElementById('prompts-loading_syp'),
    hookOptionsSyp: document.getElementById('hook-options_syp'),
    hookListSyp: document.getElementById('hook-list_syp'),
    hookContextStatusSyp: document.getElementById('hook-context-status_syp'),
    downloadAllBtnSyp: document.getElementById('download-all_syp'),
    downloadCurrentBtnSyp: document.getElementById('download-current_syp'),

    // SYP Reference Display (multi)
    anchorReferenceDisplaySyp: document.getElementById('anchor-reference-display_syp'),
    anchorRefGallerySypStep3: document.getElementById('anchor-ref-gallery_syp_step3'),
    clearAnchorRefBtnSyp: document.getElementById('clear-anchor-ref-btn_syp'),

    // SYP Step 2 Multi-Ref
    anchorReferenceDisplaySypStep2: document.getElementById('anchor-reference-display_syp_step2'),
    anchorRefGallerySypStep2: document.getElementById('anchor-ref-gallery_syp'),
    clearAnchorRefBtnSypStep2: document.getElementById('clear-anchor-ref-btn_syp_step2'),

    quickImproveAppMentionBtn: document.getElementById('quick-improve-app-mention'),
    appMentionOptions: document.getElementById('app-mention-options'),
    appMentionList: document.getElementById('app-mention-list'),

    // Custom Prompts
    customPromptInput: document.getElementById('custom-prompt-input'),
    generateCustomImageBtn: document.getElementById('generate-custom-image-btn'),
    customResolutionSelect: document.getElementById('custom-resolution-select'),
    customPromptInputSyp: document.getElementById('custom-prompt-input_syp'),
    generateCustomImageBtnSyp: document.getElementById('generate-custom-image-btn_syp'),
    customResolutionSelectSyp: document.getElementById('custom-resolution-select_syp'),
    uploadAnchorBtnSypCustom: document.getElementById('upload-anchor-btn_syp_custom'),
    anchorFileInputSypCustom: document.getElementById('anchor-file-input_syp_custom'),
    aspectRatioSelectDbt: document.getElementById('aspect-ratio-select_dbt'),
    aspectRatioSelectSyp: document.getElementById('aspect-ratio-select_syp'),
    slideBuilderPanel: document.getElementById('slide-builder-panel'),
    slideCountInput: document.getElementById('slide-count-input'),
    createSlideCountBtn: document.getElementById('create-slide-count-btn'),
    slideBuilderList: document.getElementById('slide-builder-list'),
    selectedSlideEditor: document.getElementById('selected-slide-editor'),
    selectedSlideLabel: document.getElementById('selected-slide-label'),
    selectedSlideTextInput: document.getElementById('selected-slide-text-input'),
    selectedSlideFontSizeInput: document.getElementById('selected-slide-font-size'),
    previewTextFontFamilySelect: document.getElementById('preview-text-font-family'),
    previewTextColorInput: document.getElementById('preview-text-color'),
    previewBgColorInput: document.getElementById('preview-bg-color'),
    previewTextOutlineToggle: document.getElementById('preview-text-outline-toggle'),
    addSlideBtn: document.getElementById('add-slide-btn'),
    uploadSlideImageBtn: document.getElementById('upload-slide-image-btn'),
    clearSlideImageBtn: document.getElementById('clear-slide-image-btn'),
    slideImageFileInput: document.getElementById('slide-image-file-input'),

    flowSelect: document.getElementById('flow-select'),

    // DBT Step 3 Upload Refs (multi)
    uploadAnchorBtnDbt: document.getElementById('upload-anchor-btn_dbt'),
    anchorFileInputDbt: document.getElementById('anchor-file-input_dbt'),
    clearAnchorRefBtnDbt: document.getElementById('clear-anchor-ref-btn_dbt'),
    anchorReferenceDisplayDbt: document.getElementById('anchor-reference-display_dbt'),
    anchorRefGalleryDbt: document.getElementById('anchor-ref-gallery_dbt'),
};

const dbtHookImagePickerInstances = [];

// ==========================================
// DBT FRAMEWORK CONFIGURATION
// ==========================================
const dbtFramework = {
    formats: {
        relatable: {
            name: 'Relatable/Emotional',
            percentage: '50%',
            purpose: 'Emotional connection & "me too" moments',
            appMention: 'App slide on 6',
            hookStyle: 'relatable-emotional',
            slideCount: 7
        },
        pov: {
            name: 'POV',
            percentage: '20%',
            purpose: 'Immersive experience & relatability',
            appMention: 'App slide on 6',
            hookStyle: 'pov',
            slideCount: 7
        },
        tips: {
            name: 'Tips/Hacks',
            percentage: '30%',
            purpose: 'Practical value & solution-focused',
            appMention: 'App slide on 6',
            hookStyle: 'tips',
            slideCount: 7
        }
    },
    topics: {
        favorite_person: {
            name: 'Favorite Person (FP)',
            artStyle: 'Warm, cozy, emotional lighting',
            tone: 'Understanding & validating',
            painPoints: ['obsession', 'anxiety', 'attachment', 'overthinking']
        },
        splitting: {
            name: 'Splitting',
            artStyle: 'Dramatic contrast, duality imagery',
            tone: 'Empathetic & non-judgmental',
            painPoints: ['black and white thinking', 'relationship cycles', 'self-hatred']
        },
        quiet_bpd: {
            name: 'Quiet BPD',
            artStyle: 'Subdued, internal struggle visuals',
            tone: 'Introspective & validating',
            painPoints: ['invisible pain', 'masking', 'internalized emotions']
        },
        fear_of_abandonment: {
            name: 'Fear of Abandonment',
            artStyle: 'Lonely but hopeful aesthetic',
            tone: 'Comforting & reassuring',
            painPoints: ['rejection sensitivity', 'clinginess', 'anxiety']
        },
        identity_disturbance: {
            name: 'Identity Disturbance',
            artStyle: 'Abstract, mirror/reflection motifs',
            tone: 'Identity-exploring & grounding',
            painPoints: ['who am I', 'chameleon behavior', 'emptiness']
        }
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function updateSlideCounter() {
    elements.slideCounter.textContent = `${state.slides.length} slide${state.slides.length !== 1 ? 's' : ''}`;
}

function getActiveSlideTextInput() {
    return state.currentService === 'syp' ? elements.slideTextInputSyp : elements.slideTextInput;
}

function syncActiveSlidesTextarea() {
    const textInput = getActiveSlideTextInput();
    if (!textInput) return;
    textInput.value = state.slides.map((slide, index) => formatSlideForTextarea(slide, index)).join('\n');
}

function updateSlideBuilderSelectionState() {
    if (!elements.slideBuilderList) return;
    elements.slideBuilderList.querySelectorAll('.slide-builder-row').forEach((row, i) => {
        row.classList.toggle('is-selected', i === state.currentSlideIndex);
    });
}

function setCurrentSlideIndex(index) {
    if (!state.slides.length) {
        state.currentSlideIndex = 0;
        updateSelectedSlideEditor();
        return;
    }

    const safeIndex = Math.max(0, Math.min(index, state.slides.length - 1));
    state.currentSlideIndex = safeIndex;

    if (state.currentService === 'ss' && elements.ssPhotoPickerStatus) {
        const hasPhoto = !!state.slides[safeIndex]?.image;
        elements.ssPhotoPickerStatus.textContent = `Slide ${safeIndex + 1} selected${hasPhoto ? ' · photo ready' : ' · choose a photo'}`;
    }

    document.querySelectorAll('.slide-editor').forEach((card, i) => {
        card.classList.toggle('selected', i === safeIndex);
    });

    updateSlideBuilderSelectionState();
    updateSelectedSlideEditor();
}

function createSlide({ text = 'Add your slide text here', image = null, index = state.slides.length } = {}) {
    const dualVoice = parseDualVoiceSlideText(text);
    const slide = {
        text,
        outsideText: dualVoice?.outsideText || null,
        insideText: dualVoice?.insideText || null,
        image,
        id: Date.now() + Math.floor(Math.random() * 1000) + index,
        position: getDefaultSlidePosition(index),
        scale: 1.5,
        maxWidth: 120,
        fontSize: null
    };
    return dualVoice ? ensureDualVoicePositions(slide) : slide;
}

function shiftStaticSlides(startIndex, delta) {
    if (!state.staticSlides) return;

    const shifted = {};
    Object.entries(state.staticSlides).forEach(([idxStr, value]) => {
        let idx = parseInt(idxStr, 10);
        if (Number.isNaN(idx)) return;

        if (delta > 0 && idx >= startIndex) {
            idx += delta;
        } else if (delta < 0) {
            if (idx === startIndex) return;
            if (idx > startIndex) idx += delta;
        }

        shifted[idx] = value;
    });

    state.staticSlides = shifted;
}

function insertNewSlide(afterIndex = state.slides.length - 1, overrides = {}) {
    const insertAt = Math.max(0, Math.min(afterIndex + 1, state.slides.length));
    const slide = createSlide({ ...overrides, index: insertAt });
    shiftStaticSlides(insertAt, 1);
    state.slides.splice(insertAt, 0, slide);
    state.generatedImages.splice(insertAt, 0, slide.image || null);

    if (state.selectedRefIndices.length > 0) {
        state.selectedRefIndices = state.selectedRefIndices.map((idx) => (idx >= insertAt ? idx + 1 : idx));
    }

    syncActiveSlidesTextarea();
    renderSlidesPreview();
    setCurrentSlideIndex(insertAt);
    showNotification(`Slide ${insertAt + 1} added`, 'success');
}

function buildSlidesToCount(count) {
    const normalizedCount = Math.max(1, Math.min(20, parseInt(count, 10) || 1));
    const oldSlides = [...state.slides];
    const oldGeneratedImages = [...state.generatedImages];

    state.slides = Array.from({ length: normalizedCount }, (_, index) => {
        const existing = oldSlides[index];
        if (existing) {
            return {
                ...existing,
                position: existing.position || getDefaultSlidePosition(index),
                scale: existing.scale || 1.5,
                maxWidth: existing.maxWidth || 120,
                fontSize: existing.fontSize || null
            };
        }
        return createSlide({ index });
    });

    state.generatedImages = Array.from({ length: normalizedCount }, (_, index) => oldGeneratedImages[index] || null);
    state.selectedRefIndices = state.selectedRefIndices.filter((idx) => idx < normalizedCount);

    if (elements.slideCountInput) {
        elements.slideCountInput.value = String(normalizedCount);
    }

    syncActiveSlidesTextarea();
    renderSlideBuilderList();
    renderSlidesPreview();
    setCurrentSlideIndex(Math.min(state.currentSlideIndex, normalizedCount - 1));
    showNotification(`${normalizedCount} slides ready to edit`, 'success');
}

function renderSlideBuilderList() {
    const container = elements.slideBuilderList;
    if (!container) return;

    container.innerHTML = '';

    if (!state.slides.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 12px 0;">
                <p>No slides configured yet</p>
                <span>Choose a slide count to start building your carousel.</span>
            </div>
        `;
        return;
    }

    state.slides.forEach((slide, index) => {
        const row = document.createElement('div');
        row.className = `slide-builder-row ${state.currentSlideIndex === index ? 'is-selected' : ''}`;
        row.dataset.index = index;
        const imageSrc = getStaticSlideImage(index) || slide.image || state.generatedImages[index] || '';

        row.innerHTML = `
            <div class="slide-builder-main">
                <label for="slide-builder-text-${index}">Slide ${index + 1} text</label>
                <textarea id="slide-builder-text-${index}" class="slide-builder-textarea" data-index="${index}" placeholder="Write slide ${index + 1} text here...">${escapeHtml(slide.text || '')}</textarea>
            </div>
            <div class="slide-builder-side">
                <div class="slide-builder-preview ${imageSrc ? '' : 'is-empty'}">
                    ${imageSrc ? `<img src="${imageSrc}" alt="Slide ${index + 1} image">` : '<span>No image yet</span>'}
                </div>
                <div class="slide-builder-actions">
                    <button class="btn btn-secondary btn-sm slide-builder-upload-btn" data-index="${index}" type="button">Upload Image</button>
                    <button class="btn btn-warning btn-sm slide-builder-clear-btn" data-index="${index}" type="button">Remove Image</button>
                    <input type="file" class="slide-builder-file-input" data-index="${index}" accept="image/*" hidden>
                </div>
            </div>
        `;

        container.appendChild(row);
    });

    container.querySelectorAll('.slide-builder-row').forEach((row) => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.slide-builder-textarea, .slide-builder-upload-btn, .slide-builder-clear-btn')) {
                return;
            }

            const index = parseInt(row.dataset.index, 10);
            setCurrentSlideIndex(index);
        });
    });

    container.querySelectorAll('.slide-builder-textarea').forEach((textarea) => {
        textarea.addEventListener('focus', (e) => {
            setCurrentSlideIndex(parseInt(e.target.dataset.index, 10));
        });

        textarea.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            const slide = state.slides[index];
            if (!slide) return;

            slide.text = e.target.value;
            const dualVoice = parseDualVoiceSlideText(slide.text);
            slide.outsideText = dualVoice?.outsideText || null;
            slide.insideText = dualVoice?.insideText || null;
            if (dualVoice) ensureDualVoicePositions(slide);

            syncActiveSlidesTextarea();
            renderSlidesPreview();
            if (index === state.currentSlideIndex) {
                updateSelectedSlideEditor();
            }
        });
    });

    container.querySelectorAll('.slide-builder-upload-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            setCurrentSlideIndex(index);
            const input = container.querySelector(`.slide-builder-file-input[data-index="${index}"]`);
            input?.click();
        });
    });

    container.querySelectorAll('.slide-builder-file-input').forEach((input) => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            const file = e.target.files?.[0];
            if (!file) return;
            setCurrentSlideIndex(index);
            handleFileUpload([file]);
            e.target.value = '';
            renderSlideBuilderList();
        });
    });

    container.querySelectorAll('.slide-builder-clear-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            setCurrentSlideIndex(index);
            clearCurrentSlideImage();
            renderSlideBuilderList();
        });
    });
}

function updateSelectedSlideEditor() {
    if (!elements.selectedSlideTextInput || !elements.selectedSlideLabel) return;

    const slide = state.slides[state.currentSlideIndex];
    const hasSlide = !!slide;
    const globalFontSize = parseInt(elements.fontSizeInput?.value || '26', 10) || 26;
    const selectedSlideFontSizeValue = document.getElementById('selected-slide-font-size-value');

    elements.selectedSlideTextInput.disabled = !hasSlide;
    if (elements.selectedSlideFontSizeInput) {
        elements.selectedSlideFontSizeInput.disabled = !hasSlide;
    }
    if (elements.uploadSlideImageBtn) elements.uploadSlideImageBtn.disabled = !hasSlide;
    if (elements.clearSlideImageBtn) elements.clearSlideImageBtn.disabled = !hasSlide;

    if (!hasSlide) {
        elements.selectedSlideLabel.textContent = 'No slide selected';
        elements.selectedSlideTextInput.value = '';
        if (elements.selectedSlideFontSizeInput) {
            elements.selectedSlideFontSizeInput.value = String(globalFontSize);
        }
        if (selectedSlideFontSizeValue) {
            selectedSlideFontSizeValue.textContent = 'Auto';
        }
        if (elements.clearSlideImageBtn) elements.clearSlideImageBtn.textContent = 'Remove Image';
        return;
    }

    const staticLabel = isStaticSlide(state.currentSlideIndex) ? ' • template image active' : '';
    const designLabel = slide.lhDesign
        ? ` • ${slide.lhDesign.format}/${slide.lhDesign.role} (editing "${getLhDesignPrimaryField(slide.lhDesign) || 'text'}")`
        : '';
    elements.selectedSlideLabel.textContent = `Slide ${state.currentSlideIndex + 1}${staticLabel}${designLabel}`;
    if (document.activeElement !== elements.selectedSlideTextInput) {
        // For parody slides show only the editable field, not the joined summary.
        const designField = slide.lhDesign ? getLhDesignPrimaryField(slide.lhDesign) : null;
        elements.selectedSlideTextInput.value = designField
            ? (slide.lhDesign[designField] || '')
            : (slide.text || '');
    }
    const sharedFontSize = state.slides.find((item) => item?.fontSize)?.fontSize || globalFontSize;
    if (elements.selectedSlideFontSizeInput) {
        elements.selectedSlideFontSizeInput.value = String(sharedFontSize);
    }
    if (selectedSlideFontSizeValue) {
        selectedSlideFontSizeValue.textContent = `${sharedFontSize}px`;
    }
    if (elements.clearSlideImageBtn) {
        elements.clearSlideImageBtn.textContent = slide.image || isStaticSlide(state.currentSlideIndex)
            ? 'Remove Image'
            : 'No Image';
    }
}

function getDefaultSlidePosition(index) {
    // Slide 1: centered in lower half. Legacy weird_hack keeps Slide 6 slightly lower.
    if (index === 0) return { x: 50, y: 72 };
    if (
        index === 5 &&
        state.currentService === 'dbt' &&
        state.currentDbtSlideType !== 'weird_hack_v2' &&
        state.currentDbtSlideType !== 'permission_v1'
    ) {
        return { x: 50, y: 78 };
    }
    return { x: 50, y: 50 };
}

function getDefaultDualVoicePosition(voice) {
    if (voice === 'outside') return { x: 50, y: 22 };
    return { x: 50, y: 74 };
}

function getSelectedDbtCharacter() {
    return elements.characterPresetStep1?.value || elements.characterPreset?.value || 'hannahbpd';
}

function setSelectedDbtCharacterValue(character) {
    if (elements.characterPreset) {
        elements.characterPreset.value = character;
    }
    if (elements.characterPresetStep1) {
        elements.characterPresetStep1.value = character;
    }
}

function setSelectedDbtHookImageValue(hookImage) {
    if (elements.dbtHookImageSelect) {
        elements.dbtHookImageSelect.value = hookImage;
    }
    if (elements.dbtHookImageSelectStep1) {
        elements.dbtHookImageSelectStep1.value = hookImage;
    }
    syncDbtHookImagePickerUI();
}

function getAvailableDbtSlideTypes() {
    return ['weird_hack_v2', 'vent_now_style', 'permission_v1', 'story_telling_bf', 'story_telling_gf', 'story_telling_gf_v2', 'little_habits'];
}

function getSelectedDbtSlideType() {
    if (state.currentService === 'lh') return 'little_habits';
    const slideType = elements.dbtSlideTypeSelect?.value;
    return getAvailableDbtSlideTypes().includes(slideType) ? slideType : 'weird_hack_v2';
}

function isVentNowStyleFlow(slideType = state.currentDbtSlideType) {
    return state.currentService === 'dbt' && slideType === 'vent_now_style';
}

function isLittleHabitsFlow(slideType = state.currentDbtSlideType) {
    if (state.currentService === 'lh') return true;
    return state.currentService === 'dbt' && slideType === 'little_habits';
}

function isSsFlow() {
    return state.currentService === 'ss';
}

function isTheScriptFlow() {
    return state.currentService === 'the_script';
}

const VENT_NOW_TEXT_DEFAULTS = {
    textStyle: 'tiktok_caption',
    textColor: '#fdfbba',
    boxColor: '#ffffff',
    outlineEnabled: false
};

function getActiveTextStyle() {
    if (state.currentService !== 'dbt') return 'boxed';
    return elements.dbtTextStyleSelect?.value || 'boxed';
}

function setTextOverlayControls({ textStyle, textColor, boxColor, outlineEnabled } = {}) {
    if (textStyle && elements.dbtTextStyleSelect) {
        elements.dbtTextStyleSelect.value = textStyle;
    }
    if (textColor) {
        if (elements.textColorInput) elements.textColorInput.value = textColor;
        if (elements.textColorInputSyp) elements.textColorInputSyp.value = textColor;
        if (elements.previewTextColorInput) elements.previewTextColorInput.value = textColor;
    }
    if (boxColor) {
        if (elements.bgColorInput) elements.bgColorInput.value = boxColor;
        if (elements.bgColorInputSyp) elements.bgColorInputSyp.value = boxColor;
        if (elements.previewBgColorInput) elements.previewBgColorInput.value = boxColor;
    }
    if (typeof outlineEnabled === 'boolean') {
        if (elements.textOutlineToggle) elements.textOutlineToggle.checked = outlineEnabled;
        if (elements.textOutlineToggleSyp) elements.textOutlineToggleSyp.checked = outlineEnabled;
        if (elements.previewTextOutlineToggle) elements.previewTextOutlineToggle.checked = outlineEnabled;
    }
}

function applyVentNowTextDefaults() {
    setTextOverlayControls(VENT_NOW_TEXT_DEFAULTS);
}

function syncTextColorForTextStyle(textStyle = getActiveTextStyle()) {
    if (!elements.textColorInput) return;
    if (isVentNowStyleFlow()) {
        applyVentNowTextDefaults();
        return;
    }
    if (textStyle === 'tiktok_caption' && elements.textColorInput.value.toLowerCase() === '#000000') {
        elements.textColorInput.value = '#ffffff';
        if (elements.textColorInputSyp) elements.textColorInputSyp.value = '#ffffff';
    } else if (textStyle !== 'tiktok_caption' && elements.textColorInput.value.toLowerCase() === '#ffffff') {
        elements.textColorInput.value = '#000000';
        if (elements.textColorInputSyp) elements.textColorInputSyp.value = '#000000';
    }
    syncPreviewTextStyleControlsFromLegacy();
}

function syncPreviewTextStyleControlsFromLegacy() {
    if (elements.previewTextColorInput && elements.textColorInput) {
        elements.previewTextColorInput.value = elements.textColorInput.value;
    }
    if (elements.previewBgColorInput && elements.bgColorInput) {
        elements.previewBgColorInput.value = elements.bgColorInput.value;
    }
    if (elements.previewTextFontFamilySelect && elements.textFontFamilySelect) {
        elements.previewTextFontFamilySelect.value = elements.textFontFamilySelect.value;
    }
    if (elements.previewTextOutlineToggle && elements.textOutlineToggle) {
        elements.previewTextOutlineToggle.checked = elements.textOutlineToggle.checked;
    }
}

function syncLegacyTextStyleControlsFromPreview() {
    if (elements.previewTextColorInput) {
        if (elements.textColorInput) elements.textColorInput.value = elements.previewTextColorInput.value;
        if (elements.textColorInputSyp) elements.textColorInputSyp.value = elements.previewTextColorInput.value;
    }
    if (elements.previewBgColorInput) {
        if (elements.bgColorInput) elements.bgColorInput.value = elements.previewBgColorInput.value;
        if (elements.bgColorInputSyp) elements.bgColorInputSyp.value = elements.previewBgColorInput.value;
    }
    if (elements.previewTextFontFamilySelect) {
        if (elements.textFontFamilySelect) elements.textFontFamilySelect.value = elements.previewTextFontFamilySelect.value;
        if (elements.textFontFamilySelectSyp) elements.textFontFamilySelectSyp.value = elements.previewTextFontFamilySelect.value;
    }
    if (elements.previewTextOutlineToggle) {
        if (elements.textOutlineToggle) elements.textOutlineToggle.checked = elements.previewTextOutlineToggle.checked;
        if (elements.textOutlineToggleSyp) elements.textOutlineToggleSyp.checked = elements.previewTextOutlineToggle.checked;
    }
}

function getTextOverlayStyleSettings() {
    const isSyp = state.currentService === 'syp';
    const textColorEl = elements.previewTextColorInput || (isSyp ? (elements.textColorInputSyp || elements.textColorInput) : elements.textColorInput);
    const bgColorEl = elements.previewBgColorInput || (isSyp ? (elements.bgColorInputSyp || elements.bgColorInput) : elements.bgColorInput);
    const fontFamilyEl = elements.previewTextFontFamilySelect || (isSyp ? (elements.textFontFamilySelectSyp || elements.textFontFamilySelect) : elements.textFontFamilySelect);
    const outlineEl = elements.previewTextOutlineToggle || (isSyp ? (elements.textOutlineToggleSyp || elements.textOutlineToggle) : elements.textOutlineToggle);

    const fontFamily = fontFamilyEl?.value || 'TikTok Sans';
    const fontStack = `"${fontFamily}", ${fontFamily === 'TikTok Sans' ? 'Arial, sans-serif' : '"TikTok Sans", Arial, sans-serif'}`;

    return {
        textColor: textColorEl?.value || '#000000',
        boxColor: bgColorEl?.value || '#ffffff',
        fontFamily,
        fontStack,
        outlineEnabled: outlineEl?.checked !== false
    };
}

function buildTextOverlayCssVars() {
    const style = getTextOverlayStyleSettings();
    const outlineWidth = style.outlineEnabled ? '2px' : '0px';
    const outlineColor = style.outlineEnabled ? 'rgba(0, 0, 0, 0.95)' : 'transparent';
    const textShadow = style.outlineEnabled ? '0 2px 4px rgba(0, 0, 0, 0.25)' : 'none';
    return [
        `--overlay-text-color: ${style.textColor}`,
        `--overlay-box-color: ${style.boxColor}`,
        `--overlay-font-family: ${style.fontStack}`,
        `--overlay-outline-width: ${outlineWidth}`,
        `--overlay-outline-color: ${outlineColor}`,
        `--overlay-text-shadow: ${textShadow}`
    ].join('; ');
}

function getCurrentDarkOverlayOpacity() {
    const source = state.currentService === 'syp'
        ? (elements.darkOverlayInputSyp || elements.darkOverlayInput)
        : (elements.darkOverlayInput || elements.darkOverlayInputSyp);
    const value = parseInt(source?.value || '0', 10);
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(80, value)) / 100;
}

function normalizeSlidePosition(slide, index) {
    if (!slide?.position) return;
    if (
        state.currentService === 'dbt' &&
        state.currentDbtSlideType === 'weird_hack_v2' &&
        index === 5 &&
        slide.position.x === 50 &&
        slide.position.y === 78
    ) {
        slide.position = { x: 50, y: 50 };
    }
}

function shouldApplyDarkOverlayToSlide(slideIndex) {
    if (!Number.isInteger(slideIndex)) return false;
    if (isLittleHabitsFlow()) return false;
    if (
        state.currentService === 'dbt' &&
        (state.currentDbtSlideType === 'weird_hack_v2' || state.currentDbtSlideType === 'permission_v1')
    ) {
        if (state.currentDbtSlideType === 'permission_v1') {
            return slideIndex >= 1 && slideIndex <= 6;
        }
        return slideIndex >= 1 && slideIndex <= 7;
    }
    return slideIndex >= 1 && slideIndex <= 4;
}

function isDbtStoryTellingFlow(slideType = getSelectedDbtSlideType()) {
    return slideType === 'story_telling_bf' || slideType === 'story_telling_gf' || slideType === 'story_telling_gf_v2';
}

function isDbtStoryAiFlowActive(slideType = state.currentDbtSlideType) {
    return state.currentService === 'dbt'
        && isDbtStoryTellingFlow(slideType)
        && !!elements.dbtStoryAiFlow?.checked;
}

function ensureSlideExists(index) {
    while (state.slides.length <= index) {
        state.slides.push(createSlide({ index: state.slides.length, text: '' }));
    }
    return state.slides[index];
}

function syncStoryAiFlowControls(slideType = getSelectedDbtSlideType()) {
    const isStoryFlow = isDbtStoryTellingFlow(slideType);
    const isAiFlow = isDbtStoryAiFlowActive(slideType);

    if (elements.dbtStoryAiFlowToggle) {
        elements.dbtStoryAiFlowToggle.style.display = isStoryFlow ? 'flex' : 'none';
    }
    if (elements.dbtStoryAiFlowPanel) {
        elements.dbtStoryAiFlowPanel.style.display = isAiFlow ? 'block' : 'none';
    }
    if (elements.dbtPromptEngineeringStep) {
        elements.dbtPromptEngineeringStep.style.display = isStoryFlow ? 'none' : '';
    }

    renderStoryAiSlide1Preview();
}

function renderStoryAiSlide1Preview() {
    if (!elements.dbtStoryAiSlide1Preview) return;
    const image = state.slides?.[0]?.image || state.generatedImages?.[0] || null;
    if (typeof image === 'string' && image.startsWith('data:image/')) {
        elements.dbtStoryAiSlide1Preview.classList.remove('is-empty');
        elements.dbtStoryAiSlide1Preview.innerHTML = `<img src="${image}" alt="Slide 1 couple reference">`;
    } else {
        elements.dbtStoryAiSlide1Preview.classList.add('is-empty');
        elements.dbtStoryAiSlide1Preview.innerHTML = '<span>No Slide 1 couple image set</span>';
    }
}

function setStoryAiSlide1Image(dataUrl) {
    ensureSlideExists(0);
    state.useStaticSlide1 = false;
    if (state.staticSlides) delete state.staticSlides[0];
    setSlideImage(0, dataUrl, { overrideStatic: true });
    setCurrentSlideIndex(0);
    renderStoryAiSlide1Preview();
    renderSlideBuilderList();
    renderSlidesPreview();
}

function doesDbtSlideTypeUseViralTopic(slideType = getSelectedDbtSlideType()) {
    return !isDbtStoryTellingFlow(slideType)
        && slideType !== 'weird_hack_v2'
        && slideType !== 'permission_v1'
        && slideType !== 'vent_now_style';
}

function getDbtGenerateButtonLabel(slideType = getSelectedDbtSlideType()) {
    if (slideType === 'story_telling_bf') return 'Generate Story Telling BF (Opus)';
    if (slideType === 'story_telling_gf') return 'Generate Story Telling GF (Opus)';
    if (slideType === 'story_telling_gf_v2') return 'Generate Story Telling GF v2 (Opus)';
    if (slideType === 'weird_hack_v2') return 'Generate Weird Therapist Hacks V2 (Opus)';
    if (slideType === 'vent_now_style') return 'Generate Vent Now Style (Sonnet)';
    if (slideType === 'little_habits') return 'Generate Little Habits (Sonnet)';
    if (slideType === 'permission_v1') return 'Generate Permission V1 (Opus)';
    return 'Generate Weird Therapist Hacks V2 (Opus)';
}

function setDarkOverlayInputs(value) {
    const normalizedValue = String(Math.max(0, Math.min(80, parseInt(value, 10) || 0)));
    const display = document.getElementById('dark-overlay-value');
    const sypDisplay = document.getElementById('dark-overlay-value_syp');

    if (elements.darkOverlayInput) elements.darkOverlayInput.value = normalizedValue;
    if (elements.darkOverlayInputSyp) elements.darkOverlayInputSyp.value = normalizedValue;
    if (display) display.textContent = normalizedValue + '%';
    if (sypDisplay) sypDisplay.textContent = normalizedValue + '%';
}

function syncDbtDarkOverlayDefault(slideType = getSelectedDbtSlideType()) {
    const defaultOverlayValue = slideType === 'weird_hack_v2' ? 60 : 0;
    setDarkOverlayInputs(defaultOverlayValue);
}

function syncDbtTopicUI(slideType = getSelectedDbtSlideType()) {
    const topicSelect = elements.nativeGenTopicDbt;
    const topicGroup = topicSelect?.closest('.input-group');
    const usesViralTopic = doesDbtSlideTypeUseViralTopic(slideType);

    if (topicSelect) {
        topicSelect.disabled = !usesViralTopic;
    }

    if (topicGroup) {
        topicGroup.style.display = usesViralTopic ? '' : 'none';
    }
}

function syncDbtSlideTypeUI() {
    const slideType = getSelectedDbtSlideType();
    state.currentDbtSlideType = slideType;
    syncDbtTopicUI(slideType);
    syncDbtDarkOverlayDefault(slideType);
    if (slideType === 'vent_now_style') {
        applyVentNowTextDefaults();
    }
    state.useStoryAiFlow = isDbtStoryAiFlowActive(slideType);

    if (elements.generateNativeSlidesBtn) {
        elements.generateNativeSlidesBtn.innerHTML = `<span>${getDbtGenerateButtonLabel(slideType)}</span>`;
    }

    if (elements.flowSelect) {
        elements.flowSelect.value = slideType;
    }

    syncStoryAiFlowControls(slideType);
}

function getDbtCharacterTemplate(character = getSelectedDbtCharacter()) {
    return dbtCharacterTemplates[character] || dbtCharacterTemplates.hannahbpd;
}

function supportsCustomDbtHookImage(character = getSelectedDbtCharacter()) {
    return character === 'hannahbpd';
}

function getSelectedDbtHookImageConfig() {
    return dbtHookImageOptions[state.selectedDbtHookImage] || dbtHookImageOptions.default;
}

function getCurrentDbtHookImageFlow() {
    const flow = elements.flowSelect?.value || state.currentDbtSlideType;
    return getAvailableDbtSlideTypes().includes(flow) ? flow : 'weird_hack_v2';
}

function getAvailableDbtHookImageEntries(flow = getCurrentDbtHookImageFlow(), character = getSelectedDbtCharacter()) {
    if (flow === 'permission_v1') {
        return Object.entries(dbtHookImageOptions).filter(([, option]) => {
            if (character === 'hannahbpd' && !Array.isArray(option.flows)) return true;
            return Array.isArray(option.flows) && option.flows.includes('permission_v1');
        });
    }

    return Object.entries(dbtHookImageOptions).filter(([, option]) => {
        return !Array.isArray(option.flows) || option.flows.includes(flow);
    });
}

function getDbtHookImageDefaultPreview(character = getSelectedDbtCharacter()) {
    const template = getDbtCharacterTemplate(character);
    const flow = getCurrentDbtHookImageFlow();
    const flowSlides = template.staticSlidesByFlow?.[flow] || template.staticSlidesByFlow?.weird_hack_v2 || {};
    const slide1 = flowSlides[0];

    if (!slide1) return null;
    if (slide1.startsWith('assets/')) return slide1;
    return `assets/dbt-templates/${character}/${slide1}`;
}

function getDbtHookImagePreviewSrc(optionKey, character = getSelectedDbtCharacter()) {
    if (optionKey === 'default') {
        return getDbtHookImageDefaultPreview(character);
    }

    const option = dbtHookImageOptions[optionKey];
    if (!option?.filename) return null;
    return `assets/dbt-templates/${character}/${option.filename}`;
}

function getDbtSlide1ImageOverride(character = getSelectedDbtCharacter()) {
    if (!supportsCustomDbtHookImage(character)) return null;

    const hookImage = getSelectedDbtHookImageConfig();
    if (!hookImage?.filename) return null;

    return `assets/dbt-templates/${character}/${hookImage.filename}`;
}

function syncDbtHookImageControl() {
    const character = getSelectedDbtCharacter();
    const supported = supportsCustomDbtHookImage(character);
    const availableHookImages = new Set(getAvailableDbtHookImageEntries(getCurrentDbtHookImageFlow(), character).map(([value]) => value));

    populateDbtHookImageSelectOptions();

    if (elements.dbtHookImageSelect) {
        elements.dbtHookImageSelect.disabled = !supported;
    }
    if (elements.dbtHookImageSelectStep1) {
        elements.dbtHookImageSelectStep1.disabled = !supported;
    }

    if (!supported) {
        setSelectedDbtHookImageValue('default');
    } else if (availableHookImages.has(state.selectedDbtHookImage)) {
        setSelectedDbtHookImageValue(state.selectedDbtHookImage);
    } else {
        setSelectedDbtHookImageValue('default');
    }

    syncDbtHookImagePickerUI();
}

function populateDbtHookImageSelectOptions() {
    const availableOptions = getAvailableDbtHookImageEntries(getCurrentDbtHookImageFlow(), getSelectedDbtCharacter());

    [elements.dbtHookImageSelect, elements.dbtHookImageSelectStep1].forEach((selectEl) => {
        if (!selectEl) return;

        const previousValue = selectEl.value;
        selectEl.innerHTML = '';

        availableOptions.forEach(([value, option]) => {
            const optionEl = document.createElement('option');
            optionEl.value = value;
            optionEl.textContent = option.label;
            selectEl.appendChild(optionEl);
        });

        const fallbackValue = availableOptions.some(([value]) => value === previousValue) ? previousValue : 'default';
        selectEl.value = fallbackValue;
    });

    dbtHookImagePickerInstances.forEach((instance) => renderDbtHookImagePickerOptions(instance));
}

function closeAllDbtHookImageMenus(exceptSelectId = null) {
    dbtHookImagePickerInstances.forEach(({ selectEl, wrapperEl, menuEl, buttonEl }) => {
        if (exceptSelectId && selectEl.id === exceptSelectId) return;
        wrapperEl.classList.remove('open');
        buttonEl.setAttribute('aria-expanded', 'false');
        menuEl.hidden = true;
    });
}

function openDbtHookImageMenu(instance) {
    closeAllDbtHookImageMenus(instance.selectEl.id);
    instance.wrapperEl.classList.add('open');
    instance.buttonEl.setAttribute('aria-expanded', 'true');
    instance.menuEl.hidden = false;
}

function closeDbtHookImageMenu(instance) {
    instance.wrapperEl.classList.remove('open');
    instance.buttonEl.setAttribute('aria-expanded', 'false');
    instance.menuEl.hidden = true;
}

function syncDbtHookImagePickerUI() {
    const character = getSelectedDbtCharacter();
    const supported = supportsCustomDbtHookImage(character);

    dbtHookImagePickerInstances.forEach(({ selectEl, wrapperEl, buttonEl, labelEl, thumbEl, menuEl }) => {
        const selectedValue = dbtHookImageOptions[selectEl.value] ? selectEl.value : 'default';
        const selectedConfig = dbtHookImageOptions[selectedValue] || dbtHookImageOptions.default;
        const previewSrc = getDbtHookImagePreviewSrc(selectedValue, character);

        wrapperEl.classList.toggle('disabled', !supported);
        buttonEl.disabled = !supported;
        buttonEl.title = supported ? '' : 'Only available for hannahbpd';
        labelEl.textContent = selectedConfig.label;
        thumbEl.innerHTML = previewSrc
            ? `<img src="${previewSrc}" alt="${selectedConfig.label} preview">`
            : '<span class="hook-image-picker-placeholder">Default</span>';

        menuEl.querySelectorAll('.hook-image-picker-option').forEach((optionEl) => {
            const isSelected = optionEl.dataset.value === selectedValue;
            optionEl.classList.toggle('selected', isSelected);
            optionEl.setAttribute('aria-selected', String(isSelected));

            const optionThumbEl = optionEl.querySelector('.hook-image-picker-option-thumb');
            const optionPreviewSrc = getDbtHookImagePreviewSrc(optionEl.dataset.value, character);
            optionThumbEl.innerHTML = optionPreviewSrc
                ? `<img src="${optionPreviewSrc}" alt="">`
                : '<span class="hook-image-picker-placeholder">Default</span>';
        });
    });
}

function renderDbtHookImagePickerOptions(instance) {
    const { selectEl, menuEl } = instance;
    menuEl.innerHTML = '';

    getAvailableDbtHookImageEntries(getCurrentDbtHookImageFlow(), getSelectedDbtCharacter()).forEach(([value, option]) => {
        const optionEl = document.createElement('button');
        optionEl.type = 'button';
        optionEl.className = 'hook-image-picker-option';
        optionEl.dataset.value = value;
        optionEl.setAttribute('role', 'option');

        const optionThumbEl = document.createElement('span');
        optionThumbEl.className = 'hook-image-picker-option-thumb';

        const optionLabelEl = document.createElement('span');
        optionLabelEl.className = 'hook-image-picker-option-label';
        optionLabelEl.textContent = option.label;

        optionEl.appendChild(optionThumbEl);
        optionEl.appendChild(optionLabelEl);

        optionEl.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            selectEl.value = value;
            closeAllDbtHookImageMenus();
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        });

        menuEl.appendChild(optionEl);
    });
}

function initializeDbtHookImagePicker(selectEl) {
    if (!selectEl || selectEl.dataset.previewPickerInitialized === 'true') return;

    selectEl.dataset.previewPickerInitialized = 'true';
    selectEl.classList.add('hook-image-select-native');

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'hook-image-picker';
    wrapperEl.dataset.selectId = selectEl.id;

    const buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.className = 'hook-image-picker-button';
    buttonEl.setAttribute('aria-haspopup', 'listbox');
    buttonEl.setAttribute('aria-expanded', 'false');

    const thumbEl = document.createElement('span');
    thumbEl.className = 'hook-image-picker-thumb';

    const labelEl = document.createElement('span');
    labelEl.className = 'hook-image-picker-label';

    const chevronEl = document.createElement('span');
    chevronEl.className = 'hook-image-picker-chevron';
    chevronEl.innerHTML = '&#9662;';

    buttonEl.appendChild(thumbEl);
    buttonEl.appendChild(labelEl);
    buttonEl.appendChild(chevronEl);

    const menuEl = document.createElement('div');
    menuEl.className = 'hook-image-picker-menu';
    menuEl.setAttribute('role', 'listbox');
    menuEl.hidden = true;

    const instance = {
        selectEl,
        wrapperEl,
        buttonEl,
        labelEl,
        thumbEl,
        menuEl
    };

    renderDbtHookImagePickerOptions(instance);

    buttonEl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (buttonEl.disabled) return;

        if (menuEl.hidden) {
            openDbtHookImageMenu(instance);
        } else {
            closeDbtHookImageMenu(instance);
        }
    });

    buttonEl.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDbtHookImageMenu(instance);
            buttonEl.blur();
        }
    });

    wrapperEl.addEventListener('focusout', (event) => {
        if (!wrapperEl.contains(event.relatedTarget)) {
            closeDbtHookImageMenu(instance);
        }
    });

    wrapperEl.appendChild(buttonEl);
    wrapperEl.appendChild(menuEl);
    selectEl.insertAdjacentElement('afterend', wrapperEl);

    dbtHookImagePickerInstances.push(instance);
}

function initializeDbtHookImagePickers() {
    populateDbtHookImageSelectOptions();
    initializeDbtHookImagePicker(elements.dbtHookImageSelectStep1);
    initializeDbtHookImagePicker(elements.dbtHookImageSelect);
    syncDbtHookImagePickerUI();
}

function getDefaultDbtStaticSlide(index, character = getSelectedDbtCharacter()) {
    const template = getDbtCharacterTemplate(character);
    const flow = getCurrentDbtHookImageFlow();
    const flowSlides = template.staticSlidesByFlow?.[flow] || template.staticSlidesByFlow?.weird_hack_v2 || {};
    if (index === 0) {
        const slide1Override = getDbtSlide1ImageOverride(character);
        if (slide1Override) return slide1Override;
    }
    return flowSlides[index] || null;
}

function getStaticSlideFallback(index) {
    return getDefaultDbtStaticSlide(index, 'hannahbpd');
}

function getStaticSlideNoticeLabel(index) {
    if (state.currentService !== 'dbt') return 'this setup';
    if (state.currentDbtSlideType === 'vent_now_style') {
        return index === 0 ? 'Vent Now hook/person folder' : 'Vent Now beach folder';
    }
    return getDbtCharacterTemplate().label;
}

function buildStaticImageMarkup(index, imagePath) {
    const fallbackImage = getStaticSlideFallback(index);
    const fallbackAttr = fallbackImage && fallbackImage !== imagePath
        ? ` onerror="this.onerror=null;this.src='${fallbackImage}'"`
        : '';

    return `<img src="${imagePath}" alt="Slide ${index + 1} Static"${fallbackAttr}>`;
}

function syncDbtStaticSlides(slideCount = state.slides.length) {
    if (state.currentService !== 'dbt') return;
    if (state.currentDbtSlideType === 'vent_now_style') return;
    if (state.currentDbtSlideType === 'little_habits') {
        state.staticSlides = {};
        return;
    }
    Object.entries(state.staticSlides || {}).forEach(([idx, value]) => {
        if (typeof value === 'string' && value.includes('assets/dbt-templates/vent-now/')) {
            delete state.staticSlides[idx];
        }
    });
    const shouldUseStaticSlide1 = state.useStaticSlide1 || state.currentDbtSlideType === 'permission_v1';

    if (slideCount >= 6) {
        const slide6Image = getDefaultDbtStaticSlide(5);
        if (slide6Image) {
            state.staticSlides[5] = slide6Image;
        } else {
            delete state.staticSlides[5];
        }
    } else {
        delete state.staticSlides[5];
    }

    if (shouldUseStaticSlide1) {
        const shouldPreserveExistingSlide1 =
            state.currentDbtSlideType === 'three_tips' &&
            typeof state.staticSlides?.[0] === 'string' &&
            state.staticSlides[0].includes('/three_tips/slide1_ref_');
        const slide1Image = shouldPreserveExistingSlide1
            ? state.staticSlides[0]
            : getDefaultDbtStaticSlide(0);
        if (slide1Image) {
            state.staticSlides[0] = slide1Image;
        }
    } else {
        delete state.staticSlides[0];
    }
}

function normalizeStaticSlides(staticSlides, useStaticSlide1) {
    const normalized = {};

    if (staticSlides && typeof staticSlides === 'object') {
        Object.entries(staticSlides).forEach(([key, value]) => {
            const idx = parseInt(key, 10);
            if (!Number.isNaN(idx) && value) {
                const zeroBased = idx > 0 ? idx - 1 : idx;
                normalized[zeroBased] = value;
            }
        });
    }

    if (useStaticSlide1) {
        normalized[0] = normalized[0] || getDefaultDbtStaticSlide(0) || 'slide1.png';
    }

    return normalized;
}

function isStaticSlide(index) {
    return !!(state.staticSlides && state.staticSlides[index]);
}

function getStaticSlideImage(index) {
    return state.staticSlides ? state.staticSlides[index] : null;
}

function setSlideImage(index, imageUrl, options = {}) {
    if (!state.slides[index]) return;
    if (options.overrideStatic && state.staticSlides && state.staticSlides[index]) {
        delete state.staticSlides[index];
    }
    if (isStaticSlide(index) && !options.force) return;
    state.slides[index].image = imageUrl;
    if (options.syncGenerated !== false) {
        state.generatedImages[index] = imageUrl;
    }
    if (index === 0) {
        renderStoryAiSlide1Preview();
    }
}

function applyStaticSlides() {
    if (!state.staticSlides) return;
    Object.entries(state.staticSlides).forEach(([idxStr, filename]) => {
        const idx = parseInt(idxStr, 10);
        if (Number.isNaN(idx)) return;
        state.generatedImages[idx] = filename;
        setSlideImage(idx, filename, { force: true });
    });
}

let ventNowAssetManifestPromise = null;

async function loadVentNowAssetManifest() {
    if (!ventNowAssetManifestPromise) {
        ventNowAssetManifestPromise = fetch('assets/dbt-templates/vent-now/manifest.json')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Vent Now image manifest failed to load (${response.status})`);
                }
                return response.json();
            })
            .then((manifest) => ({
                hook: Array.isArray(manifest?.hook) ? manifest.hook.filter(Boolean) : [],
                beach: Array.isArray(manifest?.beach) ? manifest.beach.filter(Boolean) : []
            }));
    }
    return ventNowAssetManifestPromise;
}

function pickRandomAsset(items, used = new Set()) {
    if (!Array.isArray(items) || items.length === 0) return null;
    const available = items.filter((item) => !used.has(item));
    const pool = available.length > 0 ? available : items;
    const selected = pool[Math.floor(Math.random() * pool.length)] || pool[0];
    if (selected) used.add(selected);
    return selected || null;
}

async function assignVentNowStaticSlides(slideCount = state.slides.length) {
    const manifest = await loadVentNowAssetManifest();
    const staticSlides = {};
    const usedBeach = new Set();

    if (slideCount > 0) {
        const slide1Image = pickRandomAsset(manifest.hook);
        if (slide1Image) staticSlides[0] = slide1Image;
    }

    for (let index = 1; index < slideCount; index++) {
        const beachImage = pickRandomAsset(manifest.beach, usedBeach);
        if (beachImage) staticSlides[index] = beachImage;
    }

    state.staticSlides = staticSlides;
    state.useStaticSlide1 = false;
    state.imagePrompts = Array.from({ length: slideCount }, () => null);
    applyStaticSlides();
    renderImagePrompts();
    initializeImageGenerationGrid();
    renderGeneratedImages();
    renderSlidesPreview();
}

function buildImagePromptsArray(imagePrompts, slideCount) {
    const prompts = Array.from({ length: slideCount }, () => null);

    if (imagePrompts && typeof imagePrompts === 'object') {
        Object.entries(imagePrompts).forEach(([key, value]) => {
            if (!key.startsWith('image')) return;
            const idx = parseInt(key.replace('image', ''), 10);
            if (Number.isNaN(idx)) return;
            prompts[idx - 1] = value;
        });
    }

    return prompts;
}

/**
 * Ensures slides are parsed from the active textarea if state.slides is empty.
 * Returns true if slides exist or were successfully parsed.
 */
function ensureSlidesParsed(options = {}) {
    const { forceFromText = false, notify = true } = options;
    if (!forceFromText && state.slides && state.slides.length > 0) return true;

    const isSyp = state.currentService === 'syp';
    const textInput = isSyp ? elements.slideTextInputSyp : elements.slideTextInput;

    if (textInput && textInput.value.trim()) {
        const text = textInput.value.trim();
        const previousSlides = state.slides || [];
        const parsed = parseSlidesFromText(text).map((slide, index) => ({
            ...slide,
            id: Date.now() + index,
            position: getDefaultSlidePosition(index),
            scale: 1.5,
            maxWidth: 120,
            fontSize: null,
            image: (state.generatedImages && state.generatedImages[index]) || null,
            stickers: previousSlides[index]?.stickers || undefined,
            lhTextOffsets: previousSlides[index]?.lhTextOffsets || undefined
        }));

        if (parsed.length > 0) {
            state.slides = parsed.map(slide => ({
                ...slide,
                scale: slide.scale || 1.5,
                maxWidth: slide.maxWidth || 120,
                fontSize: slide.fontSize || null
            }));
            syncDbtStaticSlides();
            applyStaticSlides();
            renderSlideBuilderList();
            renderSlidesPreview();
            if (notify) {
                showNotification(`Using ${state.slides.length} slides from text box`, 'success');
            }
            return true;
        }
    }

    return false;
}

function parseSlidesFromText(text) {
    // Regex to detect "Slide X:" pattern (case insensitive, supporting - or :)
    const slideRegex = /(?:^|[\r\n]+)Slide\s*\d+\s*[:\-]\s*/i;

    // If exact slide markers are found, use them as delimiters
    if (slideRegex.test(text)) {
        // Split and filter out empty sections
        // We use a global regex for splitting
        const parts = text.split(/(?:^|[\r\n]+)Slide\s*\d+\s*[:\-]\s*/gi);
        const slides = [];
        let counter = 0;

        parts.forEach(part => {
            const cleaned = part.trim();
            if (cleaned) {
                const dualVoice = parseDualVoiceSlideText(cleaned);
                const slide = {
                    text: cleaned,
                    outsideText: dualVoice?.outsideText || null,
                    insideText: dualVoice?.insideText || null,
                    image: null,
                    id: Date.now() + counter++,
                    position: getDefaultSlidePosition(slides.length),
                    scale: 1.5,
                    maxWidth: 120,
                    fontSize: null
                };
                slides.push(dualVoice ? ensureDualVoicePositions(slide) : slide);
            }
        });

        // If we successfully parsed slides, return them
        if (slides.length > 0) return slides;
    }

    // Fallback: Split by newline (old behavior) for manual input without Slide headers
    const lines = text.split('\n').filter(line => line.trim());
    const slides = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const cleanedText = line.replace(/^Slide\s*\d*[:\-]?\s*/i, '').trim();
            const dualVoice = parseDualVoiceSlideText(cleanedText);
            const slide = {
                text: cleanedText,
                outsideText: dualVoice?.outsideText || null,
                insideText: dualVoice?.insideText || null,
                image: null,
                id: Date.now() + i,
                position: getDefaultSlidePosition(i),
                scale: 1.5,
                maxWidth: 120,
                fontSize: null
            };
            slides.push(dualVoice ? ensureDualVoicePositions(slide) : slide);
        }
    }

    return slides;
}

// ==========================================
// DBT CAROUSEL IMAGE PROMPT GENERATOR
// ==========================================
const DBT_CAROUSEL_DEFAULTS = {
    handle: '@dbt_mind',
    palette: `Brand accent / character hair / tiny decorative accents: #FF9E69
BPD color: #D85A5A
ADHD color: #0E6473
Main text: #1F1F1F
Background: warm ivory / soft off-white`,
    characterStyle: `A small iconic doodle character with:
- small rounded white marshmallow-like body
- oversized rounded head shape
- fluffy wavy hair in #FF9E69, shaped like soft cloud petals
- tiny black dot eyes
- small worried or thoughtful mouth
- soft pink cheeks
- minimal rounded hands and feet
- gentle vulnerable expression
- clean polished hand-drawn vector illustration
- smooth outlines
- cute but not childish
- no animal features
- no fantasy pet feeling
- no horns, ears, tail, wings, costume, or mascot-like gimmick`
};

function normalizeQuote(text) {
    return String(text || '').trim();
}

function normalizeDbtCarouselTakeaway(text) {
    return normalizeQuote(text)
        .replace(/\bat the same$/i, 'at the same time');
}

function quotedVisibleText(text) {
    return `"${normalizeQuote(text).replace(/"/g, '\\"')}"`;
}

function splitSlideHeadlineAndSubtitle(text, slideNumber, topic) {
    const cleaned = String(text || '').trim();
    if (!cleaned) return { headline: '', subtitle: '' };

    const separators = [
        /\s+\u2014\s+/,
        /\s+\u2013\s+/,
        /\s+-\s+/,
        /\s+--\s+/,
        /\s*:\s+/
    ];

    for (const separator of separators) {
        const parts = cleaned.split(separator);
        if (parts.length >= 2) {
            return {
                headline: parts.shift().trim(),
                subtitle: parts.join(' - ').trim()
            };
        }
    }

    if (slideNumber === 1 && topic && cleaned.toLowerCase() !== topic.toLowerCase()) {
        return { headline: cleaned, subtitle: `A simple visual guide to ${topic}` };
    }

    return { headline: cleaned, subtitle: '' };
}

function parseDbtCarouselSlides(rawSlides, topic) {
    if (
        state.dbtCarouselText &&
        Array.isArray(state.dbtCarouselText.slides) &&
        String(rawSlides || '').trim() === String(state.dbtCarouselText.preview || '').trim()
    ) {
        return state.dbtCarouselText.slides.map((slide, index) => ({
            slideNumber: index + 1,
            originalText: `${slide.headline || ''}${slide.subtitle ? ` - ${slide.subtitle}` : ''}`.trim(),
            headline: slide.headline || '',
            subtitle: slide.subtitle || '',
            takeaway: normalizeDbtCarouselTakeaway(slide.takeaway || (index === 0 ? '' : buildDefaultDbtCarouselTakeaway(slide.headline))),
            bubbleText: slide.bubbleText || { left: [], right: [] },
            visualNotes: slide.visualNotes || ''
        }));
    }

    const parsedSlides = parseSlidesFromText(rawSlides);
    return parsedSlides.map((slide, index) => {
        const slideNumber = index + 1;
        const split = splitSlideHeadlineAndSubtitle(slide.text, slideNumber, topic);
        return {
            slideNumber,
            originalText: slide.text,
            headline: split.headline,
            subtitle: split.subtitle,
            takeaway: slideNumber === 1 ? '' : normalizeDbtCarouselTakeaway(buildDefaultDbtCarouselTakeaway(split.headline)),
            bubbleText: { left: [], right: [] },
            visualNotes: ''
        };
    });
}

function buildDefaultDbtCarouselTakeaway(headline) {
    const clean = String(headline || '').trim();
    if (!clean) return 'Different needs deserve different support.';
    return clean.length > 72 ? `${clean.slice(0, 69).trim()}...` : clean;
}

function detectComparisonConcepts(topic, slideText = '') {
    const candidates = [topic, slideText].map(value => String(value || '').trim()).filter(Boolean);
    for (const candidate of candidates) {
        const comparisonSource = candidate
            .replace(/^Slide\s*\d+\s*[:\-]?\s*/i, '')
            .split(/\s[-\u2013\u2014]\s|\s*:\s+/)[0]
            .trim();
        const match = comparisonSource.match(/^(.{2,32}?)\s+(?:vs\.?|versus|and)\s+(.{2,32}?)$/i);
        if (!match) continue;

        const left = match[1].trim();
        const right = match[2].trim();
        if (!left || !right || left.split(/\s+/).length > 4 || right.split(/\s+/).length > 4) continue;
        return { leftConcept: left, rightConcept: right };
    }
    return null;
}

function findLongDbtCarouselText(slides) {
    const warnings = [];
    slides.forEach(slide => {
        if (!slide.headline) {
            warnings.push(`Slide ${slide.slideNumber} needs a headline.`);
            return;
        }
        if (slide.headline.length > 54) {
            warnings.push(`Slide ${slide.slideNumber} headline may be too long for mobile. Try: "${suggestShortText(slide.headline, 7)}"`);
        }
        if (slide.subtitle && slide.subtitle.length > 92) {
            warnings.push(`Slide ${slide.slideNumber} subtitle may be too long for mobile. Try: "${suggestShortText(slide.subtitle, 11)}"`);
        }
        if (slide.takeaway && slide.takeaway.length > 82) {
            warnings.push(`Slide ${slide.slideNumber} takeaway may be too long. Try: "${suggestShortText(slide.takeaway, 9)}"`);
        }
    });
    return warnings;
}

function suggestShortText(text, maxWords) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return String(text || '').trim();
    return `${words.slice(0, maxWords).join(' ')}...`;
}

function buildVisibleTextBlock(items) {
    const uniqueItems = items
        .map(item => normalizeQuote(item))
        .filter(Boolean)
        .filter((item, index, all) => all.indexOf(item) === index);

    return uniqueItems.map(item => `- ${quotedVisibleText(item)}`).join('\n');
}

function buildExactHeadlineInstruction(headline) {
    const cleanHeadline = normalizeQuote(headline);
    if (!cleanHeadline) return '';

    const words = cleanHeadline.split(/\s+/).filter(Boolean);
    const splitIndex = Math.max(1, Math.floor(words.length / 2));
    const linePlan = words.length >= 5
        ? `Recommended line breaks: ${quotedVisibleText(words.slice(0, splitIndex).join(' '))} on line 1 and ${quotedVisibleText(words.slice(splitIndex).join(' '))} on line 2.`
        : 'Use one or two balanced lines only if needed for fit.';

    return `CRITICAL HEADLINE TEXT LOCK: The main headline must read exactly ${quotedVisibleText(cleanHeadline)}. Include every word in that exact order. Do not shorten it, paraphrase it, drop the final word, or replace it with a similar phrase. ${linePlan}`;
}

const STICKMAN_STYLE_SYSTEM = `DBT-Mind visual identity: calm, warm, supportive, and therapeutic. The illustration itself must feel like a DBT-Mind asset, not a generic cartoon or social-media template. Use a clean pure white background, exact color #FFFFFF. Do not use a cream, ivory, beige, yellow, or paper-colored overall background. Avoid visible paper grain across the canvas. Use dark charcoal ink/text (#192126) instead of harsh pure black wherever possible. Use only the DBT-Mind warm accent family: muted terracotta (#D9967C) for the primary emotional accent, warm golden brown (#D4A574), peach (#E6A85C), taupe/beige (#B8956A / #C8A882), and sage (#9CAF88 / #A8B5A0). Keep accents soft, matte, localized, and sparingly applied. Do not use neon colors, saturated purple, cool blue, or lavender.

Typography is a core part of the visual identity. Use a playful fixed handwritten display font similar to Patrick Hand SC or Comic Neue, with tall rounded letterforms, friendly curves, slightly irregular proportions, soft marker weight, and consistent repeated shapes. It must look like one deliberate playful font was used across the whole series, not a generic sans-serif, bold poster font, condensed font, formal typeface, or clean corporate UI font. Keep the exact supplied wording legible and do not stylize it into a logo. Do not add quotation marks unless they are present in the supplied text.

Character reference instruction: an image reference will be attached to this prompt showing the approved orange-haired Stickman mascot and multiple example poses. Use the attached image as the primary character-design reference. Match its recognizable terracotta-orange hair, rounded cream capsule body, simple face, body proportions, line quality, hand and foot shapes, and cute expressive visual language. Create a new pose and scene appropriate to the slide, but keep the mascot clearly consistent with the attached character sheet. Do not replace it with a generic human stick figure, realistic person, animal, or unrelated mascot. Do not copy the reference sheet layout or reproduce all of its example drawings; use it only to maintain character continuity.

The attached sheet is also a pose and emotion library. Actively use its variety across the slideshow: pointing or raising one hand for emphasis, hands close to the body for shrinking or people-pleasing, holding a heart for attachment, wiping tears for overwhelm, covering the face for shame, holding a phone for distraction, wearing headphones for avoidance, holding a small object for comfort, making a confused pose with question marks, celebrating cautiously, or showing two mascots together when the text is relational. Choose the variation that best communicates the exact slide text. Do not reuse the same neutral standing pose on every slide. Use a different meaningful gesture, prop, or emotional variation on each slide when appropriate.

The recurring character is neutral and slightly feminine through posture only. Use the orange-haired mascot’s established design, warm dark charcoal linework, simple expressive facial features, gentle asymmetry, and a very subtle warm-gray or beige grounding shadow. No additional text, hair redesign, clothing-heavy styling, eyelashes, breasts, realistic anatomy, or animal features. Keep the composition borderless, spacious, gentle, non-clinical, and easy to read on a phone.`;

function getStickmanPromptLines() {
    const lines = String(elements.stickmanSlideContent?.value || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const slides = [];
    for (let index = 0; index < lines.length; index += 1) {
        const headlineMatch = lines[index].match(/^\s*(?:slide\s*\d+|\d+)[\s:.)-]+(.+)$/i);
        const headline = (headlineMatch ? headlineMatch[1] : lines[index]).trim();
        const next = lines[index + 1];
        const hasSupportingLine = !!next && !/^\s*(?:slide\s*\d+|\d+)[\s:.)-]+/i.test(next);
        slides.push({ headline, supportingLine: hasSupportingLine ? next : '' });
        if (hasSupportingLine) index += 1;
    }
    return slides;
}

function buildStickmanPrompt({ index, title, partLabel, content, extraDirection }) {
    const isCover = index === 0;
    const visibleText = isCover
        ? `the exact generated hook text: ${title}`
        : `the exact generated headline: ${content?.headline || `A gentle visual reflection on ${title.toLowerCase()}`} and the exact generated supporting line: ${content?.supportingLine || ''}`;
    const composition = isCover
        ? 'Use a strong centered cover layout: place the supplied hook as a centered text block on the exact vertical center axis, using two or three spacious lines. Center every line to the same axis. Place the full-body mascot in the lower third. Do not add any subtitle or part label.'
        : 'Use a clean centered editorial layout: place the exact headline and supporting line as one centered text block on the exact vertical center axis in the upper half. Center every line to the same axis with equal left and right breathing room. Place the orange-haired mascot in the lower half acting out the emotional idea.';
    const visualDirection = isCover
        ? 'Add exactly three small symbols around the character: a broken heart outline in muted terracotta, a tiny charcoal spiral, and a delicate sage four-petal flower. Keep them quiet and hand-drawn, not decorative clutter.'
        : 'Add only one or two small visual metaphors that directly support the slide idea, such as a thought cloud, phone, paper boat, doorway, tangled thread, or empty chair. Keep symbols icon-like and free of extra words.';
    const variationDirection = isCover
        ? 'Use a calm introductory mascot variation from the attached sheet, such as a soft smile, one raised hand, or a small flower accent. Keep the cover pose simple and welcoming.'
        : `Use a distinct mascot variation from the attached reference sheet that acts out this slide’s emotional meaning. Prefer a specific gesture or prop over a generic standing pose. Possible directions include: hands held close to the body for shrinking or people-pleasing, wiping tears or holding a tissue for overwhelm, covering the face for shame, holding a heart for attachment, holding a phone or wearing headphones for avoidance, making a confused pose with small question marks, using a comforting object, pointing to emphasize a realization, or showing two mascots together for a relational idea. Choose only the variation that fits the supplied text, and do not repeat the same pose used on another slide.`;

    return `Create an original vertical 9:16 illustrated DBT-Mind carousel image. This is ${isCover ? 'the cover slide' : `slide ${index + 1}`} of a calm mental-health education series.

${STICKMAN_STYLE_SYSTEM}

VISIBLE TEXT RULE: The only text allowed anywhere in the image is the generated text specified below. Do not add a part label, “part 2”, a series label, a brand label, quotation marks, captions, labels, usernames, signatures, logos, or any other words. Do not infer missing text from the format. Preserve the supplied wording exactly, including capitalization and punctuation.

${visibleText}.

${composition}

Character direction: use the attached Stickman character sheet as the visual reference and show the full body of the same mascot with visible feet. Draw a new pose in the reference character’s proportions and line quality. Make the character subtly feminine through posture only: gentle hip shift, one shoulder slightly lower, softly tilted head, and expressive curved limbs. Add only a small terracotta scarf-like line, warm beige shadow, or sage accent mark if an accent is needed; keep the body itself simple and neutral. The emotion should be communicated through body language, not detailed facial features.

Mascot variation for this slide: ${variationDirection}

${visualDirection}

${extraDirection ? `Additional creative direction from the user: ${extraDirection}` : ''}

Keep the art warm, non-clinical, emotionally validating, slightly quirky, and polished. It should feel like a clean DBT-Mind poster: grounded, human, quiet, and safe. Use pure white negative space, warm charcoal linework, soft matte DBT-Mind accents, and only small localized peach or terracotta organic shapes where they help the composition. Maintain generous whitespace and avoid visual clutter.

No logos, platform names, app interfaces, watermarks, borders, extra characters, realistic humans, stock photography, 3D rendering, medical imagery, cream or beige canvas backgrounds, paper grain across the canvas, neon colors, purple/lavender accents, cool blue accents, harsh black poster typography, copied reference-sheet layout, or duplicate pose grids.`.trim();
}

function renderStickmanPrompts(prompts) {
    const container = elements.stickmanPromptsContainer;
    if (!container) return;

    container.innerHTML = prompts.map((prompt, index) => `
        <div class="image-prompt-card stickman-prompt-card">
            <div class="prompt-header">
                <span class="prompt-number">${index === 0 ? 'Cover' : `Slide ${index + 1}`} Image Prompt</span>
                <button class="btn btn-sm btn-secondary copy-stickman-prompt-btn" data-index="${index}" type="button">Copy prompt</button>
            </div>
            <textarea class="prompt-textarea stickman-prompt-textarea" data-index="${index}" readonly>${escapeHtml(prompt)}</textarea>
        </div>
    `).join('');

    container.querySelectorAll('.copy-stickman-prompt-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const index = Number(button.dataset.index);
            await navigator.clipboard.writeText(prompts[index]);
            showNotification(`${index === 0 ? 'Cover' : `Slide ${index + 1}`} prompt copied!`, 'success');
        });
    });
}

function renderStickmanTopicResults(topics) {
    const container = elements.stickmanTopicResults;
    if (!container) return;
    const carousel = topics;
    container.innerHTML = `
        <div class="stickman-generated-carousel">
            <label class="stickman-edit-label" for="stickman-generated-hook-input">Hook text</label>
            <textarea id="stickman-generated-hook-input" class="text-input stickman-generated-edit-textarea">${escapeHtml(carousel.hook)}</textarea>
            ${carousel.slides.map(slide => `<div class="stickman-generated-slide stickman-generated-slide-edit"><span>${slide.number}</span><div><label class="stickman-edit-label">Headline</label><textarea class="text-input stickman-slide-headline-input">${escapeHtml(slide.headline)}</textarea><label class="stickman-edit-label">Supporting line</label><textarea class="text-input stickman-slide-supporting-input">${escapeHtml(slide.supportingLine)}</textarea></div></div>`).join('')}
            <label class="stickman-edit-label" for="stickman-generated-share-input">Share trigger</label>
            <textarea id="stickman-generated-share-input" class="text-input stickman-generated-edit-textarea">${escapeHtml(carousel.shareTrigger)}</textarea>
            <button class="btn btn-primary full-width" id="use-stickman-carousel-btn" type="button">Use edited text for image prompts</button>
        </div>
    `;
    container.style.display = '';
    container.querySelector('#use-stickman-carousel-btn')?.addEventListener('click', () => {
        const hook = container.querySelector('#stickman-generated-hook-input')?.value.trim() || carousel.hook;
        const headlines = Array.from(container.querySelectorAll('.stickman-slide-headline-input'));
        const supportingLines = Array.from(container.querySelectorAll('.stickman-slide-supporting-input'));
        if (elements.stickmanSeriesTitle) elements.stickmanSeriesTitle.value = hook;
        if (elements.stickmanPartLabel) elements.stickmanPartLabel.value = '';
        if (elements.stickmanSlideContent) elements.stickmanSlideContent.value = carousel.slides
            .map((slide, index) => `${slide.number}. ${(headlines[index]?.value || slide.headline).trim()}\n${(supportingLines[index]?.value || slide.supportingLine).trim()}`)
            .join('\n');
        if (elements.stickmanSlideCount) elements.stickmanSlideCount.value = '6';
        showNotification('Slideshow text added to the image prompt workflow.', 'success');
    });
}

async function generateStickmanTopics() {
    const button = elements.generateStickmanTopicsBtn;
    if (button) {
        button.disabled = true;
        button.textContent = 'Generating slideshow text...';
    }
    try {
        const historyKey = 'dbtMindStickmanTopicHistory';
        let recentHistory = [];
        try {
            recentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        } catch (_) {
            recentHistory = [];
        }
        const angleSeeds = [
            'relatable emotional experience involving reassurance, attachment, or fear of abandonment',
            'relatable emotional experience involving emotional exhaustion, shutdown, or coming down after intensity',
            'relatable interpersonal experience involving boundaries, conflict, or people pleasing',
            'surprising DBT reframe about distress tolerance, mindfulness, or emotional regulation',
            'mildly controversial myth-busting idea about BPD behavior that avoids stigma',
            'educational but surprising explanation of why a BPD pattern can feel automatic'
        ];
        const angleSeed = angleSeeds[recentHistory.length % angleSeeds.length];
        const manualPrevious = String(elements.stickmanPreviousTopics?.value || '').trim();
        const previousTopics = [
            ...recentHistory.map(item => item.hook || item),
            manualPrevious
        ].filter(Boolean).join('\n');
        const response = await fetch(`${API_BASE}/generate-stickman-topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
            body: JSON.stringify({
                model: elements.stickmanModelSelect?.value || 'claude-sonnet-4-6',
                previousTopics,
                angleSeed,
                noveltySeed: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
            })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
        const data = await response.json();
        if (!data.carousel || !Array.isArray(data.carousel.slides) || data.carousel.slides.length !== 5) throw new Error('Invalid slideshow response');
        renderStickmanTopicResults(data.carousel);
        recentHistory = [
            { hook: data.carousel.hook, angle: data.carousel.angle, createdAt: new Date().toISOString() },
            ...recentHistory
        ].slice(0, 12);
        localStorage.setItem(historyKey, JSON.stringify(recentHistory));
        showNotification('Created a full 5-slide BPD slideshow concept', 'success');
    } catch (error) {
        console.error('Error generating Stickman topics:', error);
        const errorMessage = String(error.message || 'unknown error');
        const friendlyMessage = errorMessage.includes('Kimi HTTP 401')
            ? 'Kimi rejected the key. Make sure this is a Kimi Code key, use the Kimi Code model, and restart the server.'
            : `Failed to generate slideshow text: ${errorMessage}`;
        showNotification(friendlyMessage, 'error');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Generate full slideshow text';
        }
    }
}

function generateStickmanPrompts() {
    const title = String(elements.stickmanSeriesTitle?.value || '5 SIGNS YOU LOST YOURSELF').trim();
    const partLabel = String(elements.stickmanPartLabel?.value || '').trim();
    const count = Math.max(1, parseInt(elements.stickmanSlideCount?.value, 10) || 5);
    const lines = getStickmanPromptLines();
    const extraDirection = String(elements.stickmanExtraDirection?.value || '').trim();
    const prompts = Array.from({ length: count }, (_, index) => buildStickmanPrompt({
        index,
        title,
        partLabel,
        content: index === 0
            ? { headline: '', supportingLine: '' }
            : (lines[index - 1] || { headline: '', supportingLine: '' }),
        extraDirection
    }));

    renderStickmanPrompts(prompts);
    if (elements.stickmanOutputSection) elements.stickmanOutputSection.style.display = '';
    showNotification(`Created ${prompts.length} Stickman image prompts`, 'success');
}

function buildDbtCarouselPromptInput() {
    const topic = normalizeQuote(elements.dbtCarouselTopicInput?.value || '');
    const rawSlides = normalizeQuote(elements.dbtCarouselSlidesInput?.value || elements.slideTextInput?.value || '');
    const handle = normalizeQuote(elements.dbtCarouselHandleInput?.value || DBT_CAROUSEL_DEFAULTS.handle);
    const palette = normalizeQuote(elements.dbtCarouselPaletteInput?.value || DBT_CAROUSEL_DEFAULTS.palette);
    const characterStyle = normalizeQuote(elements.dbtCarouselCharacterInput?.value || DBT_CAROUSEL_DEFAULTS.characterStyle);
    const compact = elements.dbtCarouselCopyMode?.value === 'compact';

    return {
        topic,
        handle,
        palette,
        characterStyle,
        compact,
        slides: parseDbtCarouselSlides(rawSlides, topic)
    };
}

function buildDbtCarouselPrompts(input) {
    return input.slides.map(slide => {
        const comparison = detectComparisonConcepts(input.topic, slide.originalText);
        return slide.slideNumber === 1
            ? buildDbtCarouselCoverPrompt(slide, input, comparison)
            : buildDbtCarouselEducationPrompt(slide, input, comparison);
    });
}

function buildDbtCarouselCoverPrompt(slide, input, comparison) {
    const headline = slide.headline || input.topic || 'mental health guide';
    const subtitle = slide.subtitle || `A simple visual guide to ${input.topic || headline}`;
    const exactHeadlineInstruction = buildExactHeadlineInstruction(headline);
    const leftBubbles = slide.bubbleText?.left || [];
    const rightBubbles = slide.bubbleText?.right || [];
    const visibleText = buildVisibleTextBlock([
        headline,
        subtitle,
        ...leftBubbles,
        ...rightBubbles,
        comparison?.leftConcept,
        comparison?.rightConcept,
        input.handle
    ]);
    const bubbleInstruction = [...leftBubbles, ...rightBubbles].length
        ? `Use only these short bubble or label phrases where helpful: ${[...leftBubbles, ...rightBubbles].map(quotedVisibleText).join(', ')}.`
        : 'Use icon-only thought bubbles or labels unless a listed visible text item requires words.';
    const visualNotesInstruction = slide.visualNotes ? `Specific visual note: ${slide.visualNotes}.` : '';
    const comparisonInstruction = comparison
        ? `If the topic compares two concepts, use a clean two-sided comparison layout. Left side represents ${comparison.leftConcept} using #D85A5A. Right side represents ${comparison.rightConcept} using #0E6473. Use clean rounded pill labels that say exactly ${quotedVisibleText(comparison.leftConcept)} and ${quotedVisibleText(comparison.rightConcept)}.`
        : 'Use one strong central hook visual with the recurring doodle character in a cozy expressive pose, holding a soft pillow, phone, mug, blanket, or another small comfort object that fits the topic, plus simple icon-only thought bubbles.';
    const livelyIconInstruction = 'Add a few small colorful hand-drawn icon vignettes around the character only when they help the slide. Usually 2-4 is enough; use fewer or none if the layout needs breathing room. Keep them simple, readable, and emotionally specific, like phone, heart, message, reminder, calendar, shield, timer, or thought icons. Use #FF9E69, #D85A5A, and #0E6473 as accent colors where helpful. These icons should add warmth and story, not clutter, and must not introduce extra text.';

    if (input.compact) {
        return `Create a vertical 3:4 TikTok carousel cover image for a DBT / mental health app.

Main headline at the top:
${quotedVisibleText(headline)}
${exactHeadlineInstruction}

Subtitle below:
${quotedVisibleText(subtitle)}

Style: minimal clean hand-drawn mental health explainer style, warm ivory background, lots of whitespace, playful but professional, premium DBT / wellness app brand feeling.

Color palette:
${input.palette}

Character style:
${input.characterStyle}

Composition: top 30% headline and subtitle; small divider with a thin line, tiny #FF9E69 heart, and another thin line; middle 50% main hook visual with a cozy character pose and optional colorful icons; bottom 20% labels and handle. ${comparisonInstruction} ${livelyIconInstruction} ${bubbleInstruction} ${visualNotesInstruction}

Visible text, and only this text:
${visibleText}

Text must be perfectly spelled, crisp, and mobile-readable. Avoid too much text, clutter, tiny unreadable text, and chaotic layout. No watermark. No extra text.

Avoid futuristic UI, glassmorphism, 3D brain, medical/hospital look, realistic humans, stock-photo look, old orange mascot, fantasy pet, animal character, cluttered background, messy details, misspelled words, and overdesigned SaaS dashboard look.`;
    }

    return `Create a vertical 3:4 TikTok carousel cover image for a DBT / mental health app.

Main headline at the top:
${quotedVisibleText(headline)}
${exactHeadlineInstruction}

Subtitle below:
${quotedVisibleText(subtitle)}

Overall style:
Minimal clean hand-drawn mental health explainer style, inspired by viral TikTok psychoeducation carousel posts. Warm white / soft ivory background, lots of negative space, playful but professional. The design should feel emotionally validating, relatable, calm, clean, premium, and highly saveable.

Typography:
Use large playful hand-drawn rounded lettering for the headline. Use the brand color palette intelligently. If the topic compares two conditions or concepts, color the left concept with #D85A5A and the right concept with #0E6473. Use dark charcoal #1F1F1F for connecting words like "vs". Subtitle should be smaller, simple, handwritten-style, dark charcoal, centered, and very readable. All text must be perfectly spelled and crisp.

Color palette:
${input.palette}

Composition:
Top 30% contains headline and subtitle. Place a small minimal divider below the subtitle: a thin horizontal line, a tiny heart in #FF9E69 in the center, and another thin horizontal line. Middle 50% contains the main comparison visual or hook visual. Bottom 20% contains clean rounded label pills and the handle.

Characters:
${comparison ? 'Use two versions of the same small iconic doodle character.' : 'Use one small iconic doodle character as the central hook.'}
Character details:
${input.characterStyle}

Visual content:
Use the slide topic to create a clear emotional contrast. ${comparisonInstruction} ${livelyIconInstruction} ${bubbleInstruction} ${visualNotesInstruction} Use simple relatable props, body language, and minimal comparison elements. The character should feel like a small lived-in moment, not a static mascot pose. Keep the scene minimal, visually distinct from the education slides, and easy to understand at phone size.

Visible text, and only this text:
${visibleText}

Footer:
At the bottom center, place ${quotedVisibleText(input.handle)}. Move the handle slightly above the very bottom so it will not be covered by TikTok UI. Tiny subtle #FF9E69 accent marks around the handle are allowed, but keep them minimal and clean.

Final text instruction:
Spell all visible text exactly as listed above. Do not add any extra words, captions, bubble text, labels, signatures, or UI text. Keep mobile readability as the top priority.

Mood:
Soft, emotionally validating, clear, relatable, save-worthy, educational, "finally explained."

Avoid:
No futuristic UI. No glassmorphism. No 3D brain. No medical/hospital look. No realistic humans. No stock-photo look. No old orange mascot. No fantasy pet. No animal character. No cluttered background. No messy details. No tiny unreadable text. No extra text. No watermark. No misspelled words. No chaotic layout. No overloaded layout. No overdesigned SaaS dashboard look.`;
}

function buildDbtCarouselEducationPrompt(slide, input, comparison) {
    const headline = slide.headline;
    const subtitle = slide.subtitle || '';
    const takeaway = normalizeDbtCarouselTakeaway(slide.takeaway || buildDefaultDbtCarouselTakeaway(headline));
    const exactHeadlineInstruction = buildExactHeadlineInstruction(headline);
    const leftBubbles = slide.bubbleText?.left || [];
    const rightBubbles = slide.bubbleText?.right || [];
    const visibleText = buildVisibleTextBlock([headline, subtitle, ...leftBubbles, ...rightBubbles, takeaway, input.handle]);
    const bubbleInstruction = [...leftBubbles, ...rightBubbles].length
        ? `Use only these short bubble or label phrases where helpful: ${[...leftBubbles, ...rightBubbles].map(quotedVisibleText).join(', ')}.`
        : 'Use icon-only thought bubbles or labels unless a listed visible text item requires words.';
    const visualNotesInstruction = slide.visualNotes ? `Specific visual note: ${slide.visualNotes}.` : '';
    const visualInstruction = comparison
        ? `Use a calm simple comparison layout only if needed by this slide. Keep the same character centered between two minimal concept elements connected to ${comparison.leftConcept} and ${comparison.rightConcept}.`
        : 'Use one centered recurring DBT-Mind doodle character in a cozy expressive pose, holding a soft pillow, phone, mug, blanket, or another small comfort object that fits the slide. Add a few icon-only thought bubbles, simple labels without extra text, arrows, or small mental-health explainer icons.';
    const livelyIconInstruction = 'Add a few small colorful hand-drawn icon vignettes around the character only when they help the slide, using the slide bubble ideas as inspiration. Usually 2-4 is enough; use fewer or none if the layout needs breathing room. Keep them simple, readable, and emotionally specific, like phone, heart, message, reminder, calendar, shield, timer, or thought icons. Use #FF9E69, #D85A5A, and #0E6473 as accent colors where helpful. These icons should add warmth and story, not clutter, and must not introduce extra text.';
    const headingAccentInstruction = 'Required heading accents: place matching #FF9E69 hand-drawn sparkle marks on both the left and right side of the main headline, like three short radiating orange strokes on each side. These are decorative marks only, not text, and must appear on every education slide.';

    if (input.compact) {
        return `Create a vertical 3:4 TikTok carousel educational slide for a DBT / mental health app.

Main headline at the top:
${quotedVisibleText(headline)}
${exactHeadlineInstruction}

Subtitle below:
${subtitle ? quotedVisibleText(subtitle) : '"Keep this area visually quiet if no subtitle is needed."'}

Style: minimal clean hand-drawn mental health explainer style, warm ivory / soft off-white background, playful but professional, lots of negative space, consistent with the first slide.

Color palette:
${input.palette}

Character style:
${input.characterStyle}

Composition: top 25-30% headline and subtitle; middle 50-55% one centered cozy character scene or simple comparison; bottom 15-20% one rounded takeaway box and the handle. ${headingAccentInstruction} ${visualInstruction} ${livelyIconInstruction} ${bubbleInstruction} ${visualNotesInstruction}

Takeaway box:
${quotedVisibleText(takeaway)}

Visible text, and only this text:
${visibleText}

Text must be perfectly spelled, crisp, and mobile-readable. Avoid too much text, clutter, tiny unreadable text, and chaotic layout. No watermark. No extra text.

Avoid futuristic UI, glassmorphism, 3D brain, realistic human faces, medical/hospital visuals, stock-photo look, old orange mascot, fantasy pet, animal character, clutter, messy details, misspelled words, and overloaded layout.`;
    }

    return `Create a vertical 3:4 TikTok carousel educational slide for a DBT / mental health app.

Main headline at the top:
${quotedVisibleText(headline)}
${exactHeadlineInstruction}

Subtitle below:
${subtitle ? quotedVisibleText(subtitle) : 'No subtitle text if the layout needs more breathing room.'}

Overall style:
Minimal clean hand-drawn mental health explainer style. Warm ivory / soft off-white background. Playful but professional. Lots of negative space. Highly readable on mobile. Consistent with the first slide of the carousel while still visually distinct enough to feel like its own educational beat.

Typography:
Use large playful hand-drawn rounded lettering for the headline. Headline should be dark charcoal #1F1F1F unless the slide needs a tiny #FF9E69 emphasis accent. Subtitle should be smaller, simple, handwritten-style, dark charcoal, centered, and easy to read. All text must be perfectly spelled and crisp.

Heading accents:
${headingAccentInstruction}

Color palette:
${input.palette}

Composition:
Top 25-30% contains headline and subtitle. Middle 50-55% contains one centered cozy doodle character scene or a simple comparison layout with extra life and emotion. Bottom 15-20% contains one clear takeaway box and the handle.

Character:
Use the same recurring DBT-Mind doodle character:
${input.characterStyle}

Visual system:
${visualInstruction}
${livelyIconInstruction}
${bubbleInstruction}
${visualNotesInstruction}
Use #FF9E69 for brand accent, character hair, heart divider, footer accents, and selected emphasis. Use #D85A5A for BPD-related or emotional-threat elements. Use #0E6473 for ADHD-related or attention-regulation elements. Use #1F1F1F for main text. Keep bubbles very short or icon-only. Do not add unrequested visible text.

Takeaway box:
At the lower part of the slide, include one rounded soft box with the main takeaway:
${quotedVisibleText(takeaway)}
The takeaway box should be simple, light, clean, and not overloaded. Use #FF9E69 only as a small accent or emphasis inside the box if needed.

Visible text, and only this text:
${visibleText}

Footer:
At the bottom center, place ${quotedVisibleText(input.handle)}. Move the handle slightly above the bottom to avoid TikTok UI. Tiny #FF9E69 accent marks around the handle are allowed, but keep them subtle.

Final text instruction:
Spell all visible text exactly as listed above. Do not add any extra words, captions, bubble text, labels, signatures, or UI text. Keep mobile readability as the top priority.

Mood:
Educational, warm, validating, simple, save-worthy, "finally explained."

Avoid:
No futuristic UI. No glassmorphism. No 3D brain. No realistic human faces. No medical/hospital visuals. No stock-photo look. No old orange mascot. No fantasy pet. No animal character. No clutter. No tiny unreadable text. No extra text. No watermark. No misspelled words. No chaotic layout. No overloaded layout. No overdesigned SaaS dashboard look.`;
}

function renderDbtCarouselWarnings(warnings) {
    const warningsEl = elements.dbtCarouselWarnings;
    if (!warningsEl) return;

    if (!warnings.length) {
        warningsEl.style.display = 'none';
        warningsEl.innerHTML = '';
        return;
    }

    warningsEl.innerHTML = warnings.map(warning => `<div>${escapeHtml(warning)}</div>`).join('');
    warningsEl.style.display = 'block';
}

function renderDbtCarouselPrompts(prompts) {
    const container = elements.dbtCarouselPromptsContainer;
    const section = elements.dbtCarouselPromptsSection;
    if (!container || !section) return;

    container.innerHTML = '';
    prompts.forEach((prompt, index) => {
        const copyablePrompt = `## Slide ${index + 1} Image Prompt\n\n${prompt}`;
        const promptEl = document.createElement('div');
        promptEl.className = 'image-prompt-card dbt-carousel-prompt-card';
        promptEl.innerHTML = `
            <div class="prompt-header">
                <span class="prompt-number">Slide ${index + 1} Image Prompt</span>
                <div class="prompt-actions" style="display: flex; gap: 4px;">
                    <button class="btn btn-sm btn-secondary copy-dbt-carousel-prompt-btn" data-index="${index}">Copy Prompt</button>
                </div>
            </div>
            <textarea class="prompt-textarea dbt-carousel-prompt-textarea" data-index="${index}" readonly>${escapeHtml(copyablePrompt)}</textarea>
        `;
        container.appendChild(promptEl);
    });

    section.style.display = 'block';

    container.querySelectorAll('.copy-dbt-carousel-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            const textarea = container.querySelector(`.dbt-carousel-prompt-textarea[data-index="${index}"]`);
            navigator.clipboard.writeText(textarea.value);
            showNotification(`Slide ${index + 1} prompt copied!`, 'success');
        });
    });
}

function getAllDbtCarouselPromptText() {
    const textareas = Array.from(document.querySelectorAll('.dbt-carousel-prompt-textarea'));
    return textareas.map((textarea) => textarea.value.trim()).join('\n\n');
}

function formatDbtCarouselPreviewFromStructured(carousel) {
    if (!carousel || !Array.isArray(carousel.slides)) return '';
    return carousel.slides.map(slide => {
        const headline = String(slide.headline || '').trim();
        const subtitle = String(slide.subtitle || '').trim();
        return `Slide ${slide.slideNumber}: ${headline}${subtitle ? ` - ${subtitle}` : ''}`;
    }).join('\n');
}

function renderDbtCarouselTextOutput(carousel, preview) {
    state.dbtCarouselText = {
        ...carousel,
        preview
    };

    if (elements.dbtCarouselTextOutput) {
        elements.dbtCarouselTextOutput.style.display = 'block';
    }
    if (elements.dbtCarouselJsonOutput) {
        const { preview: _preview, ...jsonCarousel } = carousel;
        elements.dbtCarouselJsonOutput.textContent = JSON.stringify(jsonCarousel, null, 2);
    }
    if (elements.dbtCarouselPreviewOutput) {
        elements.dbtCarouselPreviewOutput.value = preview;
    }
}

async function generateDbtCarouselText() {
    const topic = normalizeQuote(elements.dbtCarouselTopicInput?.value || '');
    if (!topic) {
        showNotification('Please enter a carousel topic first.', 'error');
        return;
    }

    const slideCount = Math.max(1, Math.min(8, parseInt(elements.dbtCarouselSlideCountInput?.value || '8', 10) || 8));
    if (elements.dbtCarouselSlideCountInput) {
        elements.dbtCarouselSlideCountInput.value = String(slideCount);
    }

    const genBtn = elements.generateDbtCarouselTextBtn;
    if (genBtn) {
        genBtn.disabled = true;
        genBtn.innerHTML = '<span>Generating carousel text...</span>';
    }

    try {
        const response = await fetch(`${API_BASE}/generate-dbt-carousel-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                topic,
                angle: normalizeQuote(elements.dbtCarouselAngleInput?.value || ''),
                targetAudience: normalizeQuote(elements.dbtCarouselAudienceInput?.value || ''),
                tone: normalizeQuote(elements.dbtCarouselToneInput?.value || ''),
                slideCount,
                allowEmojis: !!elements.dbtCarouselAllowEmojis?.checked
            })
        });

        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 300)}`);
        }

        const data = await response.json();
        const carousel = data.carousel;
        if (!carousel || !Array.isArray(carousel.slides)) {
            throw new Error('Invalid carousel response');
        }

        const preview = data.preview || carousel.preview || formatDbtCarouselPreviewFromStructured(carousel);
        renderDbtCarouselTextOutput(carousel, preview);
        showNotification(`Generated ${carousel.slides.length} carousel slides`, 'success');
    } catch (error) {
        console.error('Error generating DBT carousel text:', error);
        showNotification(`Failed to generate carousel text: ${error.message || 'unknown error'}`, 'error');
    } finally {
        if (genBtn) {
            genBtn.disabled = false;
            genBtn.innerHTML = '<span>Generate Carousel Text</span>';
        }
    }
}

function generateDbtCarouselPrompts() {
    const input = buildDbtCarouselPromptInput();

    if (!input.topic) {
        showNotification('Please enter a carousel topic first.', 'error');
        return;
    }

    if (!input.slides.length) {
        showNotification('Please paste at least one slide.', 'error');
        return;
    }

    const warnings = findLongDbtCarouselText(input.slides);
    renderDbtCarouselWarnings(warnings);
    const prompts = buildDbtCarouselPrompts(input);
    renderDbtCarouselPrompts(prompts);
    showNotification(`Created ${prompts.length} DBT image prompts`, 'success');
}

// ==========================================
// COMPATIBILITY CHECK
// ==========================================
function checkFormatTopicCompatibility() {
    const formatSelect = elements.nativeGenFormat;
    const topicSelect = elements.nativeGenTopic;
    const warningDiv = elements.compatibilityWarning;

    if (!formatSelect || !topicSelect || !warningDiv) return;

    const format = formatSelect.value;
    const topic = topicSelect.value;

    const warningText = warningDiv.querySelector('.warning-text');
    const warningSuggestion = warningDiv.querySelector('.warning-suggestion');

    const formatInfo = dbtFramework.formats[format];
    const topicInfo = dbtFramework.topics[topic];

    // Show format/topic info
    warningDiv.style.display = 'flex';
    warningDiv.className = 'compatibility-warning success';
    warningDiv.querySelector('.warning-icon').textContent = '✨';
    warningText.textContent = `${formatInfo.name} + ${topicInfo.name}`;
    const selectedArtStyleName = elements.artStyleSelect ? elements.artStyleSelect.options[elements.artStyleSelect.selectedIndex].text : topicInfo.artStyle;
    warningSuggestion.innerHTML = `${formatInfo.purpose} | Art: ${selectedArtStyleName} | ${formatInfo.appMention}`;

    // Auto-hide after 4 seconds
    setTimeout(() => {
        if (warningDiv.classList.contains('success')) {
            warningDiv.style.display = 'none';
        }
    }, 4000);
}

// ==========================================
// NATIVE SLIDES GENERATION
// ==========================================
async function generateNativeSlides() {
    const includeBranding = true;
    const isLh = state.currentService === 'lh';
    const slideType = getSelectedDbtSlideType();
    const textOnlyMode = isLh
        ? !!elements.lhTextOnlyMode?.checked
        : !!elements.dbtTextOnlyMode?.checked;
    const preservedStoryAiSlide1Image = isDbtStoryAiFlowActive(slideType)
        ? (state.slides?.[0]?.image || state.generatedImages?.[0] || null)
        : null;
    const topic = doesDbtSlideTypeUseViralTopic(slideType)
        ? (isLh ? (elements.lhTopicSelect?.value || 'random') : (elements.nativeGenTopicDbt?.value || 'random'))
        : undefined;
    const genBtn = isLh ? elements.lhGenerateBtn : elements.generateNativeSlidesBtn;
    const genBtnLabel = isLh
        ? '✨ Generate Little Habits Carousel'
        : getDbtGenerateButtonLabel(slideType);

    state.includeBranding = includeBranding;
    state.currentDbtSlideType = slideType;
    if (isLh) state.lhFormatTextOnly = false;

    if (genBtn) {
        genBtn.disabled = true;
        genBtn.innerHTML = '<span>⏳ Generating...</span>';
    }

    try {
        const response = await fetch(`${API_BASE}/generate-native-slides`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                service: 'dbt',
                includeBranding,
                artStyle: elements.artStyleSelect?.value || 'symbolic',
                topic,
                slideType,
                language: elements.dbtLanguageSelect?.value || 'en',
                model: elements.dbtModelSelect?.value || 'claude-sonnet-4-6'
            })
        });

        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 300)}`);
        }

        const data = await response.json();

        if (data.slides && Array.isArray(data.slides)) {
            // Updated to use server-provided formatting (Slide X: text)
            elements.slideTextInput.value = data.slides.join('\n');

            showNotification(`Generated ${data.slides.length} slides! Click 'Parse & Apply' to preview.`, 'success');

            // Force-parse newly generated text so follow-up automation always uses fresh slides.
            const parsedFreshSlides = ensureSlidesParsed({ forceFromText: true, notify: false });
            if (!parsedFreshSlides) {
                throw new Error('Could not parse generated slides');
            }
            if (preservedStoryAiSlide1Image) {
                setSlideImage(0, preservedStoryAiSlide1Image, { overrideStatic: true });
            }

            if (Array.isArray(data.hook_options) && data.hook_options.length > 0) {
                renderHookOptions(data.hook_options, {
                    isSyp: false,
                    styleExamples: data.hook_style_examples,
                    styleInfluences: data.hook_style_influences
                });
            }

            if (textOnlyMode) {
                showNotification('Text-only mode is active: skipped metadata, prompts, and image generation.', 'info');
                return;
            }

            if (slideType === 'vent_now_style') {
                await assignVentNowStaticSlides(state.slides.length);
                const metadataResult = await Promise.allSettled([
                    generateMetadata({ skipEnsureSlides: true, suppressSuccessNotification: true })
                ]);
                const metadataFailed = metadataResult.some((result) => result.status === 'rejected');
                showNotification(
                    metadataFailed
                        ? 'Vent Now images applied. Metadata generation failed.'
                        : 'Vent Now images applied from static folders.',
                    metadataFailed ? 'error' : 'success'
                );
                return;
            }

            if (slideType === 'little_habits') {
                attachLittleHabitsStickerSpecs(data.sticker_prompts);
                // Step 1 never auto-generates real stickers (that costs money) — it only
                // fills free mocks when mock mode is on. Real stickers are an explicit
                // Step 2 action via the "Generate missing / Regenerate ALL" buttons.
                const useMockStickers = !!elements.lhMockMode?.checked;
                if (useMockStickers) {
                    fillLittleHabitsMockStickers();
                }
                renderSlidesPreview();
                const littleHabitsResults = await Promise.allSettled([
                    generateMetadata({ skipEnsureSlides: true, suppressSuccessNotification: true })
                ]);
                const littleHabitsFailed = littleHabitsResults.some((result) => result.status === 'rejected');
                showNotification(
                    littleHabitsFailed
                        ? 'Little Habits slides ready. Metadata generation had issues.'
                        : useMockStickers
                            ? 'Little Habits slides ready with free mock stickers. Use the Step 2 buttons when you want real ones.'
                            : 'Little Habits slides ready. Use the Step 2 buttons to generate stickers.',
                    littleHabitsFailed ? 'error' : 'success'
                );
                return;
            }

            const metadataPromise = generateMetadata({ skipEnsureSlides: true, suppressSuccessNotification: true });
            const promptsPromise = generateImagePromptsFromSlides(state.slides, {
                autoGenerateImageIndices: slideType === 'three_tips'
                    ? [0, 1, 2, 3, 4]
                    : slideType === 'i_say_they_say'
                        ? state.slides.map((_, index) => index)
                        : slideType === 'weird_hack_v2' || slideType === 'permission_v1'
                            ? state.slides
                                .map((_, index) => index)
                                .filter(index => index >= 1)
                            : isDbtStoryAiFlowActive(slideType)
                                ? state.slides
                                    .map((_, index) => index)
                                    .filter(index => index >= 1 && index <= 6)
                            : [1, 2, 3, 4]
            });
            await Promise.allSettled([metadataPromise, promptsPromise]);

            // Update context status
            if (elements.hookContextStatus) {
                elements.hookContextStatus.style.display = 'flex';
                elements.hookContextStatus.querySelector('.status-text').textContent =
                    `Using ${state.slides.length} slides for context`;
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating slides:', error);
        showNotification(`Failed to generate slides: ${error.message || 'unknown error'}`, 'error');
    } finally {
        if (genBtn) {
            genBtn.disabled = false;
            setTimeout(syncDbtSlideTypeUI, 0);
            genBtn.innerHTML = `<span>${genBtnLabel}</span>`;
        }
    }
}

// ==========================================
// IMAGE PROMPTS GENERATION
// ==========================================
const DBT_STORY_AI_COUPLE_SETTINGS = [
    'sitting close together on a living room couch during a quiet evening, one person leaning into the other, casual apartment background',
    'walking barefoot near the shoreline at the beach, photographed from behind from a few meters away, soft natural light',
    'sharing a small restaurant table by a window, candid mid-conversation moment, warm ambient dinner lighting',
    'standing side by side in a grocery store aisle, slightly awkward candid everyday date energy, phone-camera snapshot feel',
    'making coffee together in a small kitchen, messy counter, relaxed morning light, one face partially turned away',
    'seen as distant silhouettes holding hands during a sunset walk, recognizable body shapes and styling from the reference, wide candid framing'
];

function buildDbtStoryAiCouplePrompt(slideIndex, slideText = '') {
    const setting = DBT_STORY_AI_COUPLE_SETTINGS[(slideIndex - 2) % DBT_STORY_AI_COUPLE_SETTINGS.length];
    const textContext = String(slideText || '').trim();
    const shouldBeSelfie = slideIndex === 2 || slideIndex === 6;

    return [
        'Create a candid vertical 9:16 iPhone-style photo of the same couple from the reference image.',
        `Scene: ${setting}.`,
        shouldBeSelfie
            ? 'Camera/framing: make this a real casual couple selfie, taken by one partner at arm length, both people in frame, slightly imperfect crop, natural phone-camera distortion, one arm or hand may be partly visible holding the phone.'
            : 'Camera/framing: make this feel like a candid photo someone nearby could have taken, not a polished photoshoot.',
        'Preserve the couple identity from the reference: same apparent ages, faces when visible, hair, skin tone, body type, and overall style.',
        'Do not copy the exact outfits from the reference by default. Dress them in natural casual clothing that fits the new setting, weather, and time of day.',
        'Only keep the same outfits if this image clearly feels like the same outing or location as the reference, such as another photo from the same beach/date/trip.',
        'Make it feel like a real Pinterest relationship photo, spontaneous and unposed, medium quality, natural imperfect lighting.',
        'It is valid if one or both people are seen from behind, as silhouettes, partially turned away, or from far away, as long as they still read as the same couple.',
        'Use a normal believable couple setting only; no fantasy, no studio shoot, no influencer posing, no readable text, no logos, no extra people.',
        textContext ? `Emotional context for the slide: "${textContext}"` : ''
    ].filter(Boolean).join(' ');
}

function buildDbtStoryAiImagePrompts(slidesToUse) {
    return slidesToUse.map((slide, index) => {
        const slideNumber = index + 1;
        if (slideNumber < 2 || slideNumber > 7) return null;
        return buildDbtStoryAiCouplePrompt(slideNumber, slide?.text || slide || '');
    });
}

function getStoryAiSlide1ReferenceImage() {
    const slide1Image = state.slides?.[0]?.image || state.generatedImages?.[0] || null;
    if (typeof slide1Image === 'string' && !slide1Image.startsWith('data:image/')) {
        return null;
    }
    return parseDataUrl(slide1Image);
}

async function generateImagePrompts() {
    if (!ensureSlidesParsed()) {
        showNotification('Please provide slide text first (paste it or generate it)!', 'error');
        return;
    }

    generateImagePromptsFromSlides(state.slides);
}

async function generateImagePromptsFromSlides(slidesToUse, options = {}) {
    const { autoGenerateImageIndices = null } = options;
    const isSyp = state.currentService === 'syp';
    const characterPresetEl = isSyp ? elements.characterPresetSyp : elements.characterPreset;
    const character = characterPresetEl?.value || (isSyp ? 'luna' : 'hannahbpd');
    const promptsLoadingEl = isSyp ? elements.promptsLoadingSyp || elements.promptsLoading : elements.promptsLoading;
    const promptsSectionEl = isSyp ? elements.imagePromptsSectionSyp || elements.imagePromptsSection : elements.imagePromptsSection;
    const genBtn = isSyp ? elements.generateImagePromptsBtnSyp : elements.generateImagePromptsBtn;

    if (genBtn) genBtn.disabled = true;
    if (promptsLoadingEl) promptsLoadingEl.style.display = 'block';
    if (promptsSectionEl) promptsSectionEl.style.display = 'none';

    if (isVentNowStyleFlow()) {
        try {
            await assignVentNowStaticSlides(slidesToUse.length);
            showNotification('Vent Now static images randomized.', 'success');
        } catch (error) {
            console.error('Error assigning Vent Now static images:', error);
            showNotification('Failed to assign Vent Now static images.', 'error');
        } finally {
            if (genBtn) genBtn.disabled = false;
            if (promptsLoadingEl) promptsLoadingEl.style.display = 'none';
        }
        return;
    }

    if (isLittleHabitsFlow()) {
        try {
            await generateLittleHabitsStickers();
        } finally {
            if (genBtn) genBtn.disabled = false;
            if (promptsLoadingEl) promptsLoadingEl.style.display = 'none';
        }
        return;
    }

    if (isDbtStoryAiFlowActive()) {
        try {
            state.useStaticSlide1 = false;
            state.staticSlides = {};
            state.imagePrompts = buildDbtStoryAiImagePrompts(slidesToUse);

            renderImagePrompts();
            initializeImageGenerationGrid();
            renderSlidesPreview();
            showNotification('Story AI flow prompts ready for slides 2-7.', 'success');

            if (Array.isArray(autoGenerateImageIndices) && autoGenerateImageIndices.length > 0) {
                await generateAiImages({
                    indices: autoGenerateImageIndices.filter(index => index >= 1 && index <= 6),
                    suppressSuccessNotification: true
                });
            }
        } catch (error) {
            console.error('Error generating story AI prompts:', error);
            showNotification('Failed to create story AI prompts.', 'error');
        } finally {
            if (genBtn) genBtn.disabled = false;
            if (promptsLoadingEl) promptsLoadingEl.style.display = 'none';
        }
        return;
    }

    let brandingMode = 'full';
    if (isSyp) {
        const selectedMode = document.querySelector('input[name="syp-branding-mode"]:checked');
        if (selectedMode) brandingMode = selectedMode.value;
    }

    try {
        const response = await fetch(`${API_BASE}/generate-image-prompts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                slides: slidesToUse.map(s => s.text),
                character,
                character_id: character,
                format: state.currentFormat,
                topic: isVentNowStyleFlow() ? 'autonomous Vent Now topic' : state.currentTopic,
                service: state.currentService,
                brandingMode,
                artStyle: elements.artStyleSelect?.value || 'symbolic',
                flow: elements.flowSelect?.value || 'standard'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.image_prompts || data.prompts) {
            state.useStaticSlide1 = data.useStaticSlide1 || false;
            state.staticSlides = normalizeStaticSlides(data.staticSlides, state.useStaticSlide1);
            syncDbtStaticSlides(slidesToUse.length);

            if (data.image_prompts && typeof data.image_prompts === 'object') {
                state.imagePrompts = buildImagePromptsArray(data.image_prompts, slidesToUse.length);
            } else if (Array.isArray(data.prompts)) {
                state.imagePrompts = data.prompts.slice(0, slidesToUse.length);
            } else {
                state.imagePrompts = [];
            }

            applyStaticSlides();
            renderImagePrompts();
            initializeImageGenerationGrid(); // Initialize the slots in Step 3
            renderSlidesPreview(); // Update preview immediately
            showNotification('Image prompts generated!', 'success');

            if (Array.isArray(autoGenerateImageIndices) && autoGenerateImageIndices.length > 0) {
                await generateAiImages({
                    indices: autoGenerateImageIndices,
                    suppressSuccessNotification: true
                });
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating prompts:', error);
        showNotification('Failed to generate prompts. Please try again.', 'error');
    } finally {
        if (genBtn) genBtn.disabled = false;
        if (promptsLoadingEl) promptsLoadingEl.style.display = 'none';
    }
}

function renderImagePrompts() {
    const isSyp = state.currentService === 'syp';
    const container = isSyp ? elements.imagePromptsContainerSyp || elements.imagePromptsContainer : elements.imagePromptsContainer;
    const section = isSyp ? elements.imagePromptsSectionSyp || elements.imagePromptsSection : elements.imagePromptsSection;

    if (!container) return;
    container.innerHTML = '';

    state.slides.forEach((slide, index) => {
        const staticImage = getStaticSlideImage(index);
        if (staticImage) {
            const staticEl = document.createElement('div');
            staticEl.className = 'image-prompt-card static-prompt';
            const staticPrompt = state.imagePrompts[index] || '';
            staticEl.innerHTML = `
                <div class="prompt-header">
                    <span class="prompt-number">Slide ${index + 1} (Static)</span>
                </div>
                <div class="static-image-notice" style="padding: 10px; color: var(--text-muted); font-style: italic;">
                    Slide ${index + 1} uses a static image for ${getStaticSlideNoticeLabel(index)} (${staticImage}). No AI prompt needed.
                </div>
                ${staticPrompt ? `<textarea class="prompt-textarea static-prompt-textarea" data-index="${index}" readonly>${staticPrompt}</textarea>` : ''}
            `;
            container.appendChild(staticEl);
            return;
        }

        const promptEl = document.createElement('div');
        promptEl.className = 'image-prompt-card';
        promptEl.innerHTML = `
            <div class="prompt-header">
                <span class="prompt-number">Slide ${index + 1}</span>
                <div class="prompt-actions" style="display: flex; gap: 4px;">
                    <button class="btn btn-sm btn-secondary copy-prompt-btn" data-index="${index}">📋 Copy</button>
                    <button class="btn btn-sm btn-primary save-prompt-btn" data-index="${index}" style="display: none;">💾 Save</button>
                </div>
            </div>
            <textarea class="prompt-textarea" data-index="${index}">${state.imagePrompts[index] || ''}</textarea>
        `;
        container.appendChild(promptEl);
    });

    if (section) section.style.display = 'block';

    // Add copy handlers
    container.querySelectorAll('.copy-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const textarea = container.querySelector(`.prompt-textarea[data-index="${index}"]`);
            navigator.clipboard.writeText(textarea.value);
            showNotification('Prompt copied!', 'success');
        });
    });

    // Add save handlers and change detection
    container.querySelectorAll('.prompt-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const index = e.target.dataset.index;
            const saveBtn = container.querySelector(`.save-prompt-btn[data-index="${index}"]`);
            if (saveBtn) saveBtn.style.display = 'inline-block';
        });
    });

    container.querySelectorAll('.save-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const textarea = container.querySelector(`.prompt-textarea[data-index="${index}"]`);
            state.imagePrompts[index] = textarea.value;
            e.currentTarget.style.display = 'none';
            showNotification(`Slide ${index + 1} prompt updated!`, 'success');
        });
    });
}

// ==========================================
// AI IMAGE GENERATION
// ==========================================
async function generateAiImages(options = {}) {
    let { indices = null, suppressSuccessNotification = false } = options;
    if (isLittleHabitsFlow()) {
        await generateLittleHabitsStickers({ onlyMissing: false });
        return;
    }
    if (isVentNowStyleFlow()) {
        try {
            await assignVentNowStaticSlides(state.slides.length);
            if (!suppressSuccessNotification) {
                showNotification('Vent Now static images randomized.', 'success');
            }
        } catch (error) {
            console.error('Error assigning Vent Now static images:', error);
            showNotification('Failed to assign Vent Now static images.', 'error');
        }
        return;
    }

    if (isDbtStoryAiFlowActive() && state.imagePrompts.length === 0 && state.slides.length > 0) {
        state.imagePrompts = buildDbtStoryAiImagePrompts(state.slides);
        renderImagePrompts();
        initializeImageGenerationGrid();
    }

    if (state.imagePrompts.length === 0) {
        showNotification('Please generate image prompts first!', 'error');
        return;
    }

    const isSyp = state.currentService === 'syp';
    const genBtn = isSyp ? elements.generateAiImagesBtnSyp : elements.generateAiImagesBtn;
    const progressEl = isSyp ? elements.aiImagesProgressSyp : elements.aiImagesProgress;
    const containerEl = isSyp ? elements.generatedImagesContainerSyp : elements.generatedImagesContainer;
    const characterPresetEl = isSyp ? elements.characterPresetSyp : elements.characterPreset;

    if (genBtn) genBtn.disabled = true;
    if (progressEl) progressEl.style.display = 'block';
    if (containerEl) containerEl.style.display = 'none';

    try {
        if (isDbtStoryAiFlowActive()) {
            const slide1Reference = getStoryAiSlide1ReferenceImage();
            if (!slide1Reference?.data) {
                showNotification('Upload or set the Slide 1 couple image before using Story AI flow.', 'error');
                return;
            }

            const storyAiIndices = [1, 2, 3, 4, 5, 6].filter(i => i < state.imagePrompts.length);
            indices = Array.isArray(indices)
                ? indices.filter(i => storyAiIndices.includes(i))
                : storyAiIndices;
        }

        const allowedIndices = Array.isArray(indices)
            ? [...new Set(indices.filter(i => Number.isInteger(i) && i >= 0 && i < state.imagePrompts.length))]
            : null;

        const imagePromptsPayload = state.imagePrompts.reduce((acc, prompt, i) => {
            if (!prompt) return acc;
            if (allowedIndices && !allowedIndices.includes(i)) return acc;
            acc[`image${i + 1}`] = prompt;
            return acc;
        }, {});

        if (Object.keys(imagePromptsPayload).length === 0) {
            showNotification('No valid image prompts for the selected slides.', 'error');
            return;
        }

        const referenceImages = isDbtStoryAiFlowActive()
            ? [getStoryAiSlide1ReferenceImage()].filter(Boolean)
            : getServiceReferenceImages(isSyp);

        const response = await fetch(`${API_BASE}/generate-ai-images`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                imagePrompts: imagePromptsPayload,
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                aspectRatio: (isSyp ? elements.aspectRatioSelectSyp : elements.aspectRatioSelectDbt)?.value || '9:16',
                character_id: characterPresetEl?.value || 'luna',
                service: state.currentService,
                flow: elements.flowSelect?.value || 'standard',
                storyAiFlow: isDbtStoryAiFlowActive(),
                brandingMode: isSyp ? (document.querySelector('input[name="syp-branding-mode"]:checked')?.value || 'full') : 'none'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.images && Array.isArray(data.images)) {
            // Assign images to slides based on slideIndex
            for (const item of data.images) {
                if (item.success && item.image) {
                    const originalImageUrl = `data:${item.image.mime_type || 'image/png'};base64,${item.image.data}`;
                    const idx = item.slideIndex;
                    const imageUrl = await maybePostProcessIFeelImage(originalImageUrl);
                    state.generatedImages[idx] = imageUrl;
                    setSlideImage(idx, imageUrl, { overrideStatic: true });
                }
            }

            applyStaticSlides();

            renderGeneratedImages();
            renderSlidesPreview();
            if (!suppressSuccessNotification) {
                showNotification('Images generated successfully!', 'success');
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating images:', error);
        showNotification(`Failed to generate images: ${error?.message || 'unknown network error'}`, 'error');
    } finally {
        if (genBtn) genBtn.disabled = false;
        if (progressEl) progressEl.style.display = 'none';
    }
}

async function generateCustomImage() {
    const isSyp = state.currentService === 'syp';
    const inputEl = isSyp ? elements.customPromptInputSyp : elements.customPromptInput;
    const resolutionEl = isSyp ? elements.customResolutionSelectSyp : elements.customResolutionSelect;
    const prompt = inputEl ? inputEl.value.trim() : '';

    if (!prompt) {
        showNotification('Please enter a custom prompt first!', 'error');
        return;
    }

    // Capture state for this specific generation
    const tempId = Date.now();
    const ratioEl = isSyp ? elements.aspectRatioSelectSyp : elements.aspectRatioSelectDbt;
    const selectedRatio = ratioEl ? ratioEl.value : '9:16';
    const selectedResolution = resolutionEl ? resolutionEl.value : '1K';

    // Clear input immediately so user can type next prompt
    if (inputEl) inputEl.value = '';

    // Add loading placeholder to state
    state.customImages.unshift({
        id: tempId,
        prompt: prompt,
        aspectRatio: selectedRatio,
        resolution: selectedResolution,
        status: 'loading',
        timestamp: new Date().toLocaleTimeString()
    });

    renderGeneratedImages();
    showNotification('Generation started!', 'info');

    try {
        const referenceImages = getServiceReferenceImages(isSyp);

        const response = await fetch(`${API_BASE}/generate-custom-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                prompt: prompt,
                aspectRatio: selectedRatio,
                imageSize: selectedResolution,
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                service: state.currentService
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.success && data.image) {
            const originalImageUrl = `data:${data.image.mime_type || 'image/png'};base64,${data.image.data}`;
            const imageUrl = await maybePostProcessIFeelImage(originalImageUrl);

            // Update the placeholder in state
            const index = state.customImages.findIndex(ci => ci.id === tempId);
            if (index !== -1) {
                state.customImages[index] = {
                    id: tempId,
                    url: imageUrl,
                    prompt: prompt,
                    aspectRatio: selectedRatio,
                    resolution: selectedResolution,
                    timestamp: new Date().toLocaleTimeString(),
                    status: 'done'
                };
            }

            renderGeneratedImages();
            showNotification('Custom image generated!', 'success');
        } else {
            throw new Error(data.error || 'Generation failed');
        }
    } catch (error) {
        console.error('Error generating custom image:', error);
        showNotification(`Failed to generate: ${error?.message || 'unknown network error'}`, 'error');
        // Update placeholder to show error or remove it
        const index = state.customImages.findIndex(ci => ci.id === tempId);
        if (index !== -1) {
            state.customImages[index].status = 'error';
            state.customImages[index].error = error?.message || 'unknown network error';
            renderGeneratedImages();
        }
    }
}

function initializeImageGenerationGrid() {
    const isSyp = state.currentService === 'syp';
    const container = isSyp ? elements.generatedImagesContainerSyp : elements.generatedImagesContainer;
    const stepId = isSyp ? 'step-3_syp' : 'step-3';

    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'grid';

    state.slides.forEach((slide, index) => {
        const staticImage = getStaticSlideImage(index);
        const prompt = state.imagePrompts[index];
        const item = document.createElement('div');
        item.className = 'generated-image-item';
        item.dataset.index = index;

        if (staticImage) {
            item.innerHTML = `
                <span class="slide-label">Slide ${index + 1} (Static)</span>
                <img src="${staticImage}" alt="Slide ${index + 1} Static">
                <div class="static-notice" style="padding: 5px; font-size: 0.7rem; color: var(--text-muted);">
                    Static asset used for Slide ${index + 1}
                </div>
            `;
        } else {
            item.classList.add('generated-image-pending');
            item.innerHTML = `
                <span class="slide-label">Slide ${index + 1}</span>
                <div style="text-align: center; padding: 20px;">
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px;">Prompt Ready</p>
                    <button class="btn-gen-slide generate-single-btn" data-index="${index}" ${prompt ? '' : 'disabled'}>✨ Generate Image</button>
                </div>
                <div class="ref-selection">
                    <input type="checkbox" class="ref-checkbox" data-index="${index}" id="ref-check-${index}" ${state.selectedRefIndices.includes(index) ? 'checked' : ''}>
                    <label for="ref-check-${index}" class="ref-label">Use as Ref</label>
                </div>
            `;
        }
        container.appendChild(item);
    });

    // Add ref checkbox handlers
    container.querySelectorAll('.ref-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (e.target.checked) {
                if (!state.selectedRefIndices.includes(index)) {
                    state.selectedRefIndices.push(index);
                }
            } else {
                state.selectedRefIndices = state.selectedRefIndices.filter(i => i !== index);
            }
            console.log("Selected reference indices:", state.selectedRefIndices);
        });
    });

    // Add handlers for individual generation
    container.querySelectorAll('.generate-single-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.generate-single-btn');
            const index = parseInt(btnEl.dataset.index);
            generateSingleImage(index, btnEl);
        });
    });

    // Make sure the section is visible
    const stepSection = document.getElementById(stepId);
    if (stepSection) stepSection.style.display = 'block';

    updateParsingToolsVisibility();
}

async function generateSingleImage(index, btnEl) {
    if (isStaticSlide(index)) return;
    const prompt = state.imagePrompts[index];
    if (!prompt) return;

    const slideIndexToUse = index;
    const originalText = btnEl.innerHTML;

    try {
        btnEl.disabled = true;
        btnEl.innerHTML = '<span>⏳...</span>';

        const cardEl = btnEl.closest('.generated-image-item');
        if (!cardEl) {
            console.error("Card element not found for index", index);
            throw new Error("UI consistency error: Card not found");
        }

        const isSyp = state.currentService === 'syp';
        const characterPresetEl = isSyp ? elements.characterPresetSyp : elements.characterPreset;

        let referenceImages = [];
        if (isDbtStoryAiFlowActive()) {
            const slide1Reference = getStoryAiSlide1ReferenceImage();
            if (!slide1Reference?.data) {
                showNotification('Upload or set the Slide 1 couple image before regenerating Story AI images.', 'error');
                btnEl.disabled = false;
                btnEl.innerHTML = originalText;
                return;
            }
            referenceImages = [slide1Reference];
        } else {
            referenceImages = getServiceReferenceImages(isSyp);

            state.selectedRefIndices.forEach(refIdx => {
                if (state.generatedImages[refIdx]) {
                    const parsed = parseDataUrl(state.generatedImages[refIdx]);
                    if (parsed) referenceImages.push(parsed);
                }
            });
        }

        const brandingMode = isSyp ? (document.querySelector('input[name="syp-branding-mode"]:checked')?.value || 'full') : 'none';

        const response = await fetch(`${API_BASE}/generate-image-with-refs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                prompt: prompt,
                referenceImages: referenceImages,
                slideIndex: slideIndexToUse,
                service: state.currentService,
                flow: elements.flowSelect?.value || 'standard',
                aspectRatio: (isSyp ? elements.aspectRatioSelectSyp : elements.aspectRatioSelectDbt)?.value || '9:16',
                character_id: characterPresetEl?.value || 'luna',
                storyAiFlow: isDbtStoryAiFlowActive(),
                brandingMode: brandingMode
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.success && data.image) {
            const originalImageUrl = `data:${data.image.mime_type || data.image.mimeType || 'image/png'};base64,${data.image.data}`;
            const imageUrl = await maybePostProcessIFeelImage(originalImageUrl);
            state.generatedImages[slideIndexToUse] = imageUrl;

            // Assign to state.slides
            setSlideImage(slideIndexToUse, imageUrl, { overrideStatic: true });

            // Replace card content with image
            cardEl.classList.remove('generated-image-pending');
            cardEl.innerHTML = `
                <span class="slide-label">Slide ${slideIndexToUse + 1}</span>
                <img src="${imageUrl}" alt="Generated image ${slideIndexToUse + 1}">
                <div class="image-actions">
                    <button class="btn btn-sm btn-secondary use-image-btn added" data-index="${index}">✓ Added</button>
                    <button class="btn btn-sm btn-fire regen-btn" data-index="${index}">🔄 Regen</button>
                </div>
                <div class="ref-selection">
                    <input type="checkbox" class="ref-checkbox" data-index="${index}" id="ref-check-${index}" ${state.selectedRefIndices.includes(index) ? 'checked' : ''}>
                    <label for="ref-check-${index}" class="ref-label">Use as Ref</label>
                </div>
            `;

            // Add handler for ref checkbox
            const refCheck = cardEl.querySelector('.ref-checkbox');
            refCheck.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (e.target.checked) {
                    if (!state.selectedRefIndices.includes(idx)) {
                        state.selectedRefIndices.push(idx);
                    }
                } else {
                    state.selectedRefIndices = state.selectedRefIndices.filter(i => i !== idx);
                }
            });

            // Re-add handlers for the new content
            const useBtn = cardEl.querySelector('.use-image-btn');
            useBtn.addEventListener('click', () => {
                useBtn.classList.add('added');
                useBtn.textContent = '✓ Added';
                if (state.slides[index]) {
                    setSlideImage(index, imageUrl, { overrideStatic: true });
                    renderSlidesPreview();
                    showNotification(`Image assigned to slide ${index + 1}`, 'success');
                } else {
                    showNotification(`Image selected! Click 'Parse & Apply' to create slides.`, 'info');
                }
            });

            cardEl.querySelector('.regen-btn').addEventListener('click', (e) => {
                generateSingleImage(index, e.target.closest('.regen-btn'));
            });

            renderSlidesPreview();
            updateParsingToolsVisibility();
            showNotification(`Slide ${index + 1} image ready!`, 'success');
        } else {
            throw new Error(data.error || 'Generation failed');
        }
    } catch (error) {
        console.error('Error generating single image:', error);
        showNotification('Failed to generate image: ' + error.message, 'error');
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
    }
}

async function regenerateCustomImage(id) {
    const imgObj = state.customImages.find(ci => ci.id === id);
    if (!imgObj || !imgObj.prompt) {
        showNotification('No prompt stored for this image – cannot regenerate.', 'error');
        return;
    }

    const prompt = imgObj.prompt;
    const isSyp = state.currentService === 'syp';

    // Mark as loading
    imgObj.status = 'loading';
    imgObj.url = null;
    renderGeneratedImages();
    showNotification('Regenerating image…', 'info');

    try {
        const referenceImages = getServiceReferenceImages(isSyp);

        const response = await fetch(`${API_BASE}/generate-custom-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                prompt,
                aspectRatio: imgObj.aspectRatio || '9:16',
                imageSize: imgObj.resolution || '1K',
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                service: state.currentService
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.success && data.image) {
            const originalImageUrl = `data:${data.image.mime_type || 'image/png'};base64,${data.image.data}`;
            const imageUrl = await maybePostProcessIFeelImage(originalImageUrl);
            const idx = state.customImages.findIndex(ci => ci.id === id);
            if (idx !== -1) {
                state.customImages[idx] = {
                    id,
                    url: imageUrl,
                    prompt,
                    aspectRatio: imgObj.aspectRatio || '9:16',
                    resolution: imgObj.resolution || '1K',
                    timestamp: new Date().toLocaleTimeString(),
                    status: 'done'
                };
            }
            renderGeneratedImages();
            showNotification('Image regenerated!', 'success');
        } else {
            throw new Error(data.error || 'Generation failed');
        }
    } catch (error) {
        console.error('Error regenerating custom image:', error);
        showNotification(`Regeneration failed: ${error?.message || 'unknown network error'}`, 'error');
        const idx = state.customImages.findIndex(ci => ci.id === id);
        if (idx !== -1) {
            state.customImages[idx].status = 'error';
            state.customImages[idx].error = error?.message || 'unknown network error';
            renderGeneratedImages();
        }
    }
}

function renderGeneratedImages() {
    const isSyp = state.currentService === 'syp';
    const container = isSyp ? elements.generatedImagesContainerSyp : elements.generatedImagesContainer;
    const stepId = isSyp ? 'step-generate-images-syp' : 'step-generate-images';

    if (!container) return;
    container.innerHTML = '';

    // 1. Render Custom Images first
    state.customImages.forEach((imgObj) => {
        const item = document.createElement('div');
        item.className = 'generated-image-item custom-image-item';
        item.dataset.customId = imgObj.id;

        if (imgObj.status === 'loading') {
            item.innerHTML = `
                <span class="slide-label">⏳ Generating...</span>
                <div class="custom-loading-state">
                    <div class="spinner"></div>
                </div>
                <div class="custom-prompt-preview">${imgObj.prompt}${imgObj.resolution ? ` • ${imgObj.resolution}` : ''}</div>
            `;
            container.appendChild(item);
            return;
        }

        if (imgObj.status === 'error') {
            item.innerHTML = `
                <span class="slide-label">❌ Failed</span>
                <div class="custom-error-state">
                    ${imgObj.error || 'Error'}
                </div>
                <div class="custom-image-toolbar">
                    ${imgObj.prompt ? '<button class="btn btn-sm btn-secondary regen-custom-btn">🔄 Retry</button>' : ''}
                    <button class="btn btn-sm btn-fire delete-custom-btn">🗑️</button>
                </div>
            `;
            if (imgObj.prompt && item.querySelector('.regen-custom-btn')) {
                item.querySelector('.regen-custom-btn').addEventListener('click', () => regenerateCustomImage(imgObj.id));
            }
            item.querySelector('.delete-custom-btn').addEventListener('click', () => {
                state.customImages = state.customImages.filter(ci => ci.id !== imgObj.id);
                renderGeneratedImages();
            });
            container.appendChild(item);
            return;
        }

        item.innerHTML = `
            <span class="slide-label">Custom - ${imgObj.timestamp}${imgObj.resolution ? ` • ${imgObj.resolution}` : ''}</span>
            <img src="${imgObj.url}" alt="Custom image">
            <div class="custom-image-toolbar">
                <button class="btn btn-sm btn-secondary use-custom-btn">Use</button>
                <button class="btn btn-sm btn-secondary regen-custom-btn">🔄</button>
                <button class="btn btn-sm btn-fire download-custom-btn">💾</button>
                <button class="btn btn-sm btn-fire delete-custom-btn">🗑️</button>
            </div>
        `;

        // Add custom handlers
        item.querySelector('.use-custom-btn').addEventListener('click', () => {
            if (state.slides[state.currentSlideIndex]) {
                setSlideImage(state.currentSlideIndex, imgObj.url, { overrideStatic: true });
                renderSlidesPreview();
                showNotification(`Image assigned to slide ${state.currentSlideIndex + 1}`, 'success');
            } else {
                showNotification('No active slide to assign image to.', 'error');
            }
        });

        item.querySelector('.regen-custom-btn').addEventListener('click', () => {
            regenerateCustomImage(imgObj.id);
        });

        item.querySelector('.download-custom-btn').addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = imgObj.url;
            link.download = `custom-image-${imgObj.id}.png`;
            link.click();
        });

        item.querySelector('.delete-custom-btn').addEventListener('click', () => {
            state.customImages = state.customImages.filter(ci => ci.id !== imgObj.id);
            renderGeneratedImages();
            showNotification('Custom image deleted', 'success');
        });

        container.appendChild(item);
    });

    // 2. Render Carousel Images
    state.slides.forEach((slide, index) => {
        const staticImage = getStaticSlideImage(index);
        const imgUrl = staticImage || state.generatedImages[index];
        const prompt = state.imagePrompts[index];

        const item = document.createElement('div');
        item.className = 'generated-image-item';

        if (staticImage) {
            item.innerHTML = `
                <span class="slide-label">Slide ${index + 1} (Static)</span>
                <img src="${staticImage}" alt="Slide ${index + 1} Static">
                <div class="static-notice" style="padding: 5px; font-size: 0.7rem; color: var(--text-muted);">
                    Static asset used for Slide ${index + 1}
                </div>
            `;
        } else if (!imgUrl) {
            item.classList.add('generated-image-pending');
            item.innerHTML = `
                <span class="slide-label">Slide ${index + 1}</span>
                <div style="text-align: center; padding: 20px;">
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px;">Prompt Ready</p>
                    <button class="btn-gen-slide generate-single-btn" data-index="${index}" ${prompt ? '' : 'disabled'}>✨ Generate Image</button>
                </div>
            `;
        } else {
            item.innerHTML = `
                <span class="slide-label">Slide ${index + 1}</span>
                <img src="${imgUrl}" alt="Generated image ${index + 1}">
                <div class="image-actions">
                    <button class="btn btn-sm btn-secondary use-image-btn added" data-index="${index}">✓ Added</button>
                    <button class="btn btn-sm btn-fire regen-btn" data-index="${index}">🔄 Regen</button>
                </div>
            `;
        }

        if (!staticImage) {
            item.innerHTML += `
                <div class="ref-selection">
                    <input type="checkbox" class="ref-checkbox" data-index="${index}" id="ref-check-${index}" ${state.selectedRefIndices.includes(index) ? 'checked' : ''}>
                    <label for="ref-check-${index}" class="ref-label">Use as Ref</label>
                </div>
            `;
        }
        container.appendChild(item);
    });

    container.style.display = 'grid';

    // Add ref checkbox handlers
    container.querySelectorAll('.ref-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (e.target.checked) {
                if (!state.selectedRefIndices.includes(index)) {
                    state.selectedRefIndices.push(index);
                }
            } else {
                state.selectedRefIndices = state.selectedRefIndices.filter(i => i !== index);
            }
        });
    });

    // Add use image handlers
    container.querySelectorAll('.use-image-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.use-image-btn');
            const index = parseInt(btnEl.dataset.index);

            // Always provide visual feedback
            btnEl.classList.add('added');
            btnEl.textContent = '✓ Added';

            if (state.slides[index]) {
                setSlideImage(index, state.generatedImages[index], { overrideStatic: true });
                renderSlidesPreview();
                showNotification(`Image assigned to slide ${index + 1}`, 'success');
            } else {
                showNotification(`Image selected! Click 'Parse & Apply' to create slides.`, 'info');
            }
        });
    });

    // Add individual generation handlers
    container.querySelectorAll('.generate-single-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.generate-single-btn');
            const index = parseInt(btnEl.dataset.index);
            generateSingleImage(index, btnEl);
        });
    });

    // Add regen handlers
    container.querySelectorAll('.regen-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.regen-btn');
            const index = parseInt(btnEl.dataset.index);
            generateSingleImage(index, btnEl);
        });
    });

    // Ensure section is visible
    const section = document.getElementById(stepId);
    if (section) section.style.display = 'block';

    updateParsingToolsVisibility();
}

function updateParsingToolsVisibility() {
    const isSyp = state.currentService === 'syp';
    const parsingTools = isSyp ? elements.parsingToolsContainerSyp : elements.parsingToolsContainer;

    if (parsingTools) {
        // Show if we have at least one generated image OR if we have image prompts (ready to be parsed)
        // User wants it to appear when at least one image was generated.
        const hasImages = state.generatedImages.some(img => img !== null);
        parsingTools.style.display = hasImages ? 'block' : 'none';

        console.log(`[UI] Parsing tools visibility updated. hasImages: ${hasImages}, display: ${parsingTools.style.display}`);
    }
}

function splitTextBlocks(text) {
    return String(text || '')
        .split(/\n\s*\n+/)
        .map(part => part.trim())
        .filter(Boolean);
}

function parseDualVoiceSlideText(text) {
    const match = String(text || '').match(/^OUTSIDE:\s*([\s\S]*?)\n+\s*INSIDE:\s*([\s\S]*)$/i);
    if (!match) return null;

    const outsideText = String(match[1] || '').trim();
    const insideText = String(match[2] || '').trim();
    if (!outsideText || !insideText) return null;

    return { outsideText, insideText };
}

function ensureDualVoicePositions(slide) {
    if (!slide) return slide;
    if (!slide.outsidePosition) slide.outsidePosition = getDefaultDualVoicePosition('outside');
    if (!slide.insidePosition) slide.insidePosition = getDefaultDualVoicePosition('inside');
    return slide;
}

function isDualVoiceFlowSlide(slide) {
    return state.currentService === 'dbt'
        && state.currentDbtSlideType === 'i_say_they_say'
        && !!slide?.outsideText
        && !!slide?.insideText;
}

function formatSlideForTextarea(slide, index) {
    const dualVoice = slide?.outsideText && slide?.insideText
        ? `OUTSIDE: ${slide.outsideText}\nINSIDE: ${slide.insideText}`
        : (slide?.text || '');
    return `Slide ${index + 1}: ${dualVoice}`;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildTextBlocksPreviewHtml(text, baseFontSize) {
    const textStyle = getActiveTextStyle();
    const textOverlayStyle = getTextOverlayStyleSettings();
    const boxClass = textStyle === 'tiktok_caption' ? 'text-box text-box--tiktok' : 'text-box';
    const spanClass = textStyle === 'tiktok_caption'
        ? `text-content-span text-content-span--tiktok${textOverlayStyle.outlineEnabled ? '' : ' text-content-span--no-outline'}`
        : 'text-content-span';
    const blocks = splitTextBlocks(text);
    if (blocks.length === 0) return '';

    return blocks.map(block => `
        <div class="${boxClass}" style="font-size: ${baseFontSize}px; width: 100%;" data-base-font-size="${baseFontSize}">
            <span class="${spanClass}">${escapeHtml(block).replace(/\n/g, '<br>')}</span>
        </div>
    `).join('');
}

function buildDualVoicePreviewHtml(slide, baseFontSize) {
    const outsidePosition = slide.outsidePosition || getDefaultDualVoicePosition('outside');
    const insidePosition = slide.insidePosition || getDefaultDualVoicePosition('inside');
    return `
        <div class="dual-voice-block dual-voice-outside draggable-text-block" data-voice="outside" style="position: absolute; top: ${outsidePosition.y}%; left: ${outsidePosition.x}%; transform: translate(-50%, -50%); width: 82%;">
            ${buildTextBlocksPreviewHtml(slide.outsideText, baseFontSize)}
        </div>
        <div class="dual-voice-block dual-voice-inside draggable-text-block" data-voice="inside" style="position: absolute; top: ${insidePosition.y}%; left: ${insidePosition.x}%; transform: translate(-50%, -50%); width: 88%;">
            ${buildTextBlocksPreviewHtml(slide.insideText, baseFontSize)}
        </div>
    `;
}

// ==========================================
// SLIDES RENDERING
// ==========================================
function renderSlidesPreview() {
    elements.slidesContainer.innerHTML = '';

    // The floating download button mirrors slide availability — no scrolling to find it.
    if (elements.floatingDownloadBtn) {
        elements.floatingDownloadBtn.style.display = state.slides.length > 0 ? 'flex' : 'none';
    }

    if (state.slides.length === 0) {
        elements.slidesContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🖼️</span>
                <p>No slides yet</p>
                <span>Upload images and add text to get started</span>
            </div>
        `;
        return;
    }

    state.slides.forEach((slide, index) => {
        const slideEl = document.createElement('div');
        slideEl.className = `slide-editor ${state.currentSlideIndex === index ? 'selected' : ''}`;
        slideEl.dataset.index = index;

        // Ensure position exists
        if (!slide.position) slide.position = { x: 50, y: 50 };
        normalizeSlidePosition(slide, index);
        if (!slide.maxWidth) slide.maxWidth = 120; // Default width set to 120%

        // Get the intended font size for final render (1080x1920 canvas)
        const baseFontSize = slide.fontSize || parseInt(elements.fontSizeInput.value) || 28;

        // Default scale of 1.5 matches requested look
        const slideScale = slide.scale || 1.5;
        const previewScaleFactor = 0.35 * slideScale; // Scale down the entire text overlay
        const slideMaxWidth = slide.maxWidth || elements.textWidthInput?.value || 120;
        const isDualVoice = isDualVoiceFlowSlide(slide);
        if (isDualVoice) ensureDualVoicePositions(slide);

        if (isTheScriptFlow() && slide.ts) {
            // The Script: notes-app paper slides OR one photo across all slides — light,
            // anti-stigma backgrounds either way. Script quotes render handwritten.
            const tsUsePhoto = state.tsBgMode === 'photo' && !!state.tsBgImage;
            const tsTint = TS_PAPER_TINTS[slide.ts.tint] || TS_PAPER_TINTS.cream;
            const tsBadge = `Slide ${slide.ts.n} · ${TS_ROLE_LABELS[slide.ts.role] || slide.ts.role}`;
            const tsBgStyle = tsUsePhoto
                ? `background-image: url(${state.tsBgImage}); background-size: cover; background-position: center;`
                : `background: ${tsTint.bg};`;
            slideEl.innerHTML = `
                <div class="slide-number">${index + 1}</div>
                <div class="slide-preview ts-slide-preview" style="position: relative; width: 100%; height: 100%; ${tsBgStyle}">
                    <div class="ts-overlay-text${tsUsePhoto ? ' ts-overlay-photo' : ''}">${tsOverlayParasHtml(slide, index)}</div>
                    <div class="ss-role-badge">${tsBadge}</div>
                </div>
                <div class="slide-actions">
                    <button class="btn btn-sm btn-secondary edit-slide-btn" data-index="${index}">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger delete-slide-btn" data-index="${index}">🗑️</button>
                    <button class="btn btn-sm btn-success download-slide-btn" data-index="${index}" title="Download this slide">💾</button>
                </div>
            `;
            elements.slidesContainer.appendChild(slideEl);
            return;
        }

        if (isSsFlow() && slide.ss) {
            // Aesthetic photo slideshow: moody photo behind, white TikTok-font text on
            // top. The whole text block is freely draggable and scalable; headline and
            // body can additionally be nudged individually (per-paragraph offsets).
            const ssImage = slide.image
                ? `<img src="${slide.image}" alt="Slide ${index + 1}">`
                : `<div class="ss-photo-placeholder">
                       <span class="ss-photo-icon">🖼️</span>
                       <span class="ss-photo-query">${escapeHtml(slide.ss.imageQuery || 'photo')}</span>
                   </div>`;
            const ssBadge = `Slide ${slide.ss.n} · ${SS_ROLE_LABELS[slide.ss.role] || slide.ss.role}${slide.ss.skill ? ` (${escapeHtml(slide.ss.skill)})` : ''}`;
            const ssPos = slide.position || { x: 50, y: 50 };
            const ssScale = slide.ssTextScale || 1;
            const isSelected = state.currentSlideIndex === index;
            slideEl.innerHTML = `
                <div class="slide-number">${index + 1}</div>
                <div class="slide-preview ss-slide-preview" style="position: relative; width: 100%; height: 100%;">
                    ${ssImage}
                    <div class="ss-overlay-text ${isSelected ? 'selected' : ''}" data-ss-overlay="${index}"
                         style="left: ${ssPos.x}%; top: ${ssPos.y}%; transform: translate(-50%, -50%) scale(${ssScale});">
                        ${ssOverlayParasHtml(slide.text)}
                        ${isSelected ? `
                            <div class="ss-resize-handle" title="Drag to resize text"></div>
                            <div class="scale-indicator">${Math.round(ssScale * 100)}%</div>
                        ` : ''}
                    </div>
                    <div class="ss-role-badge">${ssBadge}</div>
                </div>
                <div class="slide-actions">
                    <button class="btn btn-sm btn-secondary edit-slide-btn" data-index="${index}">✏️ Edit</button>
                    <button class="btn btn-sm btn-secondary ss-upload-btn" data-index="${index}" title="Upload your own photo for this slide">🖼️</button>
                    ${slide.ss.role === 'hook' ? `<button class="btn btn-sm btn-secondary ss-shuffle-hook-btn" data-index="${index}" title="New random hook photo">🎲</button>` : ''}
                    <button class="btn btn-sm btn-danger delete-slide-btn" data-index="${index}">🗑️</button>
                    <button class="btn btn-sm btn-success download-slide-btn" data-index="${index}" title="Download this slide">💾</button>
                </div>
            `;
            elements.slidesContainer.appendChild(slideEl);
            return;
        }

        if (isLittleHabitsFlow()) {
            if (state.lhFormatTextOnly || slide.lhFormatTextOnly || slide.lhDesign) {
                const plainText = escapeHtml(String(slide.text || '')).replace(/\n/g, '<br>');
                slideEl.innerHTML = `
                    <div class="slide-number">${index + 1}</div>
                    <div class="slide-preview lh-slide-preview lh-format-text-preview" style="position: relative; width: 100%; height: 100%;">
                        <div class="lh-format-text-copy">${plainText}</div>
                    </div>
                    <div class="slide-actions">
                        <button class="btn btn-sm btn-secondary edit-slide-btn" data-index="${index}">âœï¸ Edit</button>
                        <button class="btn btn-sm btn-danger delete-slide-btn" data-index="${index}">ðŸ—‘ï¸</button>
                        <button class="btn btn-sm btn-success download-slide-btn" data-index="${index}" title="Download this slide">ðŸ’¾</button>
                    </div>
                `;
                elements.slidesContainer.appendChild(slideEl);
                return;
            }
            let lhParsed = parseLittleHabitsText(slide.text || '');
            if (index === 0) lhParsed = enforceLhHookSandwich(lhParsed);
            const lhHeadlineHtml = lhParsed.headlineSpans
                .map(span => `<span class="lh-span lh-${span.style}">${escapeHtml(span.text).replace(/\n/g, '<br>')}</span>`)
                .join('');
            // Anchors match the canvas renderer's block-center ratios so preview == export.
            const lhHeadlineOffset = getLhTextOffset(slide, 'headline');
            const lhCaptionOffset = getLhTextOffset(slide, 'caption');
            const lhHeadlineTop = getLhHeadlineCenterPct(index) + lhHeadlineOffset.dy;
            const lhHeadlineLeft = 50 + lhHeadlineOffset.dx;
            const lhCaptionTop = getLhCaptionCenterPct(index) + lhCaptionOffset.dy;
            const lhCaptionLeft = 50 + lhCaptionOffset.dx;
            const lhStickersHtml = (Array.isArray(slide.stickers) ? slide.stickers : [])
                .map((st, stickerIndex) => {
                    if (!st.image) return '';
                    const anchor = getLhSlotAnchor(st.slot);
                    const rotation = st.rotation ?? getLhStickerRotation(stickerIndex);
                    const widthPct = getLhStickerBaseWidthPct(st.slot) * (st.scale || 1);
                    const isSelected = state.lhSelectedSticker
                        && state.lhSelectedSticker.slideIndex === index
                        && state.lhSelectedSticker.stickerIndex === stickerIndex;
                    return `<div class="lh-sticker-wrap${isSelected ? ' lh-sticker-wrap--selected' : ''}" data-slide-index="${index}" data-sticker-index="${stickerIndex}" style="left: ${anchor.x + (st.dx || 0)}%; top: ${anchor.y + (st.dy || 0)}%; width: ${widthPct}%; transform: translate(-50%, -50%) rotate(${rotation}deg);">
                        <img class="lh-sticker" src="${st.image}" alt="sticker" draggable="false">
                        ${isSelected ? `
                            <div class="lh-handle lh-rotate-handle" title="Drag to tilt">⟳</div>
                            <div class="lh-handle lh-resize-handle" title="Drag to resize">⤢</div>
                        ` : ''}
                    </div>`;
                })
                .join('');
            const lhSlotOptions = Object.keys(LH_SLOT_ANCHORS)
                .map(slot => `<option value="${slot}">`)
                .join('');
            const lhChipsHtml = (Array.isArray(slide.stickers) ? slide.stickers : [])
                .map((st, stickerIndex) => `
                    <div class="lh-sticker-chip" title="${escapeHtml(st.prompt)}">
                        <input class="lh-sticker-slot" list="lh-slot-list" value="${escapeHtml(st.slot)}" data-slide-index="${index}" data-sticker-index="${stickerIndex}">
                        <span class="lh-chip-icon" title="Size">⤢</span>
                        <input class="lh-sticker-size" type="range" min="0.5" max="2" step="0.05" value="${st.scale || 1}" data-slide-index="${index}" data-sticker-index="${stickerIndex}">
                        <span class="lh-chip-icon" title="Tilt">⟳</span>
                        <input class="lh-sticker-rotation" type="range" min="-180" max="180" step="1" value="${st.rotation ?? getLhStickerRotation(stickerIndex)}" data-slide-index="${index}" data-sticker-index="${stickerIndex}">
                        <button class="btn btn-sm btn-secondary lh-sticker-regen" data-slide-index="${index}" data-sticker-index="${stickerIndex}" title="Regenerate sticker">🔄</button>
                        <button class="btn btn-sm btn-danger lh-sticker-delete" data-slide-index="${index}" data-sticker-index="${stickerIndex}" title="Remove sticker">🗑️</button>
                    </div>`)
                .join('');

            const lhPreviewInner = slide.lhDesign
                ? `<img class="lh-design-thumb" data-slide-index="${index}" alt="design preview" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`
                : `${lhStickersHtml}
                    <div class="lh-headline${index === 0 ? ' lh-headline--hook' : ''}" data-slide-index="${index}" data-lh-text="headline" style="left: ${lhHeadlineLeft}%; top: ${lhHeadlineTop}%;">${lhHeadlineHtml}</div>
                    ${lhParsed.caption && index !== 0 ? `<div class="lh-caption" data-slide-index="${index}" data-lh-text="caption" style="left: ${lhCaptionLeft}%; top: ${lhCaptionTop}%;">${escapeHtml(lhParsed.caption)}</div>` : ''}`;

            slideEl.innerHTML = `
                <div class="slide-number">${index + 1}</div>
                <div class="slide-preview lh-slide-preview" style="position: relative; width: 100%; height: 100%;">
                    <div class="lh-slide-bg"></div>
                    ${lhPreviewInner}
                </div>
                <div class="lh-sticker-list">
                    <datalist id="lh-slot-list">${lhSlotOptions}</datalist>
                    ${lhChipsHtml}
                    <div class="lh-sticker-chip lh-sticker-add-row">
                        <input class="lh-sticker-new-prompt" data-slide-index="${index}" placeholder="add sticker (e.g. cozy blanket)">
                        <button class="btn btn-sm btn-success lh-sticker-add" data-slide-index="${index}" title="Add sticker">＋</button>
                    </div>
                </div>
                <div class="slide-actions">
                    <button class="btn btn-sm btn-secondary edit-slide-btn" data-index="${index}">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger delete-slide-btn" data-index="${index}">🗑️</button>
                    <button class="btn btn-sm btn-success download-slide-btn" data-index="${index}" title="Download this slide">💾</button>
                </div>
            `;
            elements.slidesContainer.appendChild(slideEl);
            return;
        }

        const staticImage = getStaticSlideImage(index);
        const overlayOpacity = shouldApplyDarkOverlayToSlide(index) ? getCurrentDarkOverlayOpacity() : 0;
        const slideImageMarkup = staticImage
            ? buildStaticImageMarkup(index, staticImage)
            : (slide.image ? `<img src="${slide.image}" alt="Slide ${index + 1}">` : '<div class="no-image">No Image</div>');
        const imageOverlayMarkup = overlayOpacity > 0
            ? `<div class="slide-image-dark-overlay" style="opacity: ${overlayOpacity};"></div>`
            : '';

        const overlayStyleVars = buildTextOverlayCssVars();
        const overlayStyle = isDualVoice
            ? `left: 50%; top: 50%; width: 100%; height: 100%; transform: translate(-50%, -50%) scale(${previewScaleFactor}); transform-origin: center center; ${overlayStyleVars}`
            : `left: ${slide.position.x}%; top: ${slide.position.y}%; width: ${slideMaxWidth}%; transform: translate(-50%, -50%) scale(${previewScaleFactor}); transform-origin: center center; ${overlayStyleVars}`;
        const textStyleClass = getActiveTextStyle() === 'tiktok_caption'
            ? 'text-overlay--tiktok'
            : 'text-overlay--boxed';
        const outlineStateClass = getTextOverlayStyleSettings().outlineEnabled
            ? 'text-overlay--outline-on'
            : 'text-overlay--outline-off';

        const previewHtml = isDualVoice
            ? buildDualVoicePreviewHtml(slide, baseFontSize)
            : `<div class="text-block-stack">${buildTextBlocksPreviewHtml(slide.text || '', baseFontSize)}</div>`;

        slideEl.innerHTML = `
            <div class="slide-number">${index + 1}</div>
            <div class="slide-preview" style="position: relative; width: 100%; height: 100%;">
                ${slideImageMarkup}
                ${imageOverlayMarkup}
                <div class="text-overlay ${textStyleClass} ${outlineStateClass} ${state.currentSlideIndex === index ? 'selected' : ''}" style="${overlayStyle}" data-scale="${slideScale}">
                    ${previewHtml}
                    ${state.currentSlideIndex === index ? `
                        <div class="resize-handle corner" title="Drag to resize text"></div>
                        <div class="resize-handle width-handle" title="Drag to change width"></div>
                        <div class="resize-handle width-handle-left" title="Drag to change width"></div>
                        <div class="scale-indicator" style="background: ${slideScale > 1.5 ? 'var(--error)' : 'rgba(0,0,0,0.8)'}">${Math.round(slideScale * 100)}%</div>
                    ` : ''}
                </div>
            </div>
            <div class="slide-actions">
                <button class="btn btn-sm btn-secondary edit-slide-btn" data-index="${index}">✏️ Edit</button>
                <button class="btn btn-sm btn-warning reset-scale-btn" data-index="${index}" title="Reset text size/width">🔄 Reset</button>
                <button class="btn btn-sm btn-danger delete-slide-btn" data-index="${index}">🗑️</button>
                <button class="btn btn-sm btn-success download-slide-btn" data-index="${index}" title="Download this slide">💾</button>
            </div>
        `;
        elements.slidesContainer.appendChild(slideEl);
    });

    updateSlideCounter();
    updateSelectedSlideEditor();
    initDragHandlers(); // Re-bind drag handlers
    scheduleLhDesignThumbs();
    if (isSsFlow()) {
        requestAnimationFrame(syncSsPreviewMetrics);
        document.fonts?.ready.then(syncSsPreviewMetrics).catch(() => {});
    }
}

// Design-format slides (slide.lhDesign) are canvas-rendered; fill their preview
// thumbnails asynchronously after the DOM is in place.
function scheduleLhDesignThumbs() {
    document.querySelectorAll('img.lh-design-thumb').forEach((img) => {
        const idx = parseInt(img.dataset.slideIndex, 10);
        const slide = state.slides[idx];
        if (!slide?.lhDesign) return;
        const canvas = document.createElement('canvas');
        renderLhDesignSlideToCanvas(slide, canvas, idx)
            .then(() => { img.src = canvas.toDataURL('image/png'); })
            .catch(() => {});
    });
}

// ==========================================
// LITTLE HABITS (STICKER STYLE) MODULE
// ==========================================
const LH_SLOT_ANCHORS = {
    'corner-top-left': { x: 16, y: 11 },
    'corner-top-right': { x: 84, y: 11 },
    'top-left': { x: 20, y: 40 },
    'top-right': { x: 80, y: 40 },
    'mid-left': { x: 18, y: 53 },
    'center': { x: 50, y: 52 },
    'mid-right': { x: 82, y: 53 },
    'bottom-left': { x: 22, y: 64 },
    'bottom-center': { x: 50, y: 66 },
    'bottom-right': { x: 78, y: 64 },
    'outro-center': { x: 50, y: 62 },
    'edge-top-left': { x: 5, y: 9 },
    'edge-top-right': { x: 95, y: 9 },
    'edge-bottom-left': { x: 6, y: 74 },
    'edge-bottom-right': { x: 94, y: 74 }
};

function getLhSlotAnchor(slot) {
    return LH_SLOT_ANCHORS[slot] || LH_SLOT_ANCHORS['center'];
}

// Default block-center positions (% of slide height), shared by preview and canvas.
function getLhHeadlineCenterPct(slideIndex) {
    return slideIndex === 0 ? 42 : slideIndex === 6 ? 30 : 17.5;
}

function getLhCaptionCenterPct(slideIndex) {
    return slideIndex === 6 ? 44 : 78;
}

// Per-slide drag offsets for headline/caption, in % of slide size.
function getLhTextOffset(slide, kind) {
    const offset = slide?.lhTextOffsets?.[kind];
    return { dx: offset?.dx || 0, dy: offset?.dy || 0 };
}

function setLhTextOffset(slide, kind, dx, dy) {
    if (!slide.lhTextOffsets) slide.lhTextOffsets = {};
    slide.lhTextOffsets[kind] = { dx, dy };
}

function getLhStickerBaseWidthPct(slot) {
    if (slot === 'outro-center') return 52;
    if (slot && slot.startsWith('edge-')) return 48;
    if (slot === 'corner-top-left' || slot === 'corner-top-right') return 24;
    if (slot === 'center' || slot === 'bottom-center') return 38;
    return 31;
}

function getLhStickerRotation(stickerIndex) {
    return ((stickerIndex * 37) % 9) - 4;
}

let lhFontsPromise = null;
function ensureLittleHabitsFontsLoaded() {
    if (!lhFontsPromise && document.fonts?.load) {
        lhFontsPromise = Promise.all([
            document.fonts.load('400 40px "Gloria Hallelujah"'),
            document.fonts.load('500 40px "Quicksand"'),
            document.fonts.load('700 40px "Quicksand"')
        ]).catch(() => {});
    }
    return lhFontsPromise || Promise.resolve();
}

function parseLhSpans(text) {
    const spans = [];
    const source = String(text || '');
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
        if (match.index > last) {
            spans.push({ text: source.slice(last, match.index), style: 'normal' });
        }
        const token = match[0];
        if (token.startsWith('**')) {
            spans.push({ text: token.slice(2, -2), style: 'bold' });
        } else {
            spans.push({ text: token.slice(1, -1), style: 'playful' });
        }
        last = match.index + token.length;
    }
    if (last < source.length) {
        spans.push({ text: source.slice(last), style: 'normal' });
    }
    return spans.filter(s => s.text.length > 0);
}

function parseLittleHabitsText(text) {
    const source = String(text || '');
    const separatorIndex = source.indexOf(';;');
    const headline = separatorIndex >= 0 ? source.slice(0, separatorIndex).trim() : source.trim();
    const caption = separatorIndex >= 0 ? source.slice(separatorIndex + 2).trim() : '';
    return { headlineSpans: parseLhSpans(headline), caption };
}

// The hook slide always uses the playful/serious/playful font sandwich, no matter
// what markup the model emitted: first line playful, middle line(s) serious, last
// line playful.
function enforceLhHookSandwich(parsed) {
    const plain = parsed.headlineSpans.map(span => span.text).join('');
    let lines = plain.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 1) {
        const match = lines[0].match(/^(little things)\s+(you can do daily to)\s+(.+)$/i);
        if (match) lines = [match[1], match[2], match[3]];
    }
    if (lines.length < 2) return parsed;
    const headlineSpans = lines.map((line, lineIndex) => ({
        text: (lineIndex > 0 ? '\n' : '') + line,
        style: lineIndex === 0 || lineIndex === lines.length - 1 ? 'playful' : 'normal'
    }));
    return { headlineSpans, caption: parsed.caption };
}

function createLhSticker(spec) {
    return {
        id: Date.now() + Math.floor(Math.random() * 100000),
        prompt: String(spec?.prompt || spec?.description || '').trim(),
        slot: LH_SLOT_ANCHORS[spec?.slot] ? spec.slot : 'center',
        image: null,
        dx: 0,
        dy: 0,
        scale: 1,
        rotation: null
    };
}

function attachLittleHabitsStickerSpecs(stickerPrompts) {
    if (!Array.isArray(stickerPrompts)) return;
    state.slides.forEach((slide, index) => {
        const specs = stickerPrompts[index];
        if (!Array.isArray(specs) || specs.length === 0) {
            slide.stickers = [];
            return;
        }
        const previous = Array.isArray(slide.stickers) ? slide.stickers : [];
        slide.stickers = specs.map((spec) => {
            const reusable = previous.find(st => st.prompt === (spec.description || spec.prompt) && st.image);
            if (reusable) return reusable;
            return createLhSticker({ prompt: spec.description || spec.prompt, slot: spec.slot });
        });
    });
}

async function generateLittleHabitsStickers(options = {}) {
    const { onlyMissing = true, singleJob = null } = options;

    const jobs = [];
    if (singleJob) {
        jobs.push(singleJob);
    } else {
        state.slides.forEach((slide, slideIndex) => {
            (slide.stickers || []).forEach((st, stickerIndex) => {
                if (!st.prompt) return;
                if (onlyMissing && st.image) return;
                jobs.push({ slideIndex, stickerIndex, prompt: st.prompt, slot: st.slot });
            });
        });
    }

    if (jobs.length === 0) {
        renderSlidesPreview();
        return;
    }

    showNotification(`Generating ${jobs.length} sticker${jobs.length > 1 ? 's' : ''}...`, 'info');

    try {
        const response = await fetch(`${API_BASE}/generate-stickers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                stickers: jobs.map(job => ({
                    prompt: job.prompt,
                    slot: job.slot,
                    slideIndex: job.slideIndex
                }))
            })
        });

        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 200)}`);
        }

        const data = await response.json();
        const results = Array.isArray(data.results) ? data.results : [];
        let successCount = 0;
        let failCount = 0;

        results.forEach((result, resultIndex) => {
            const job = jobs[resultIndex];
            if (!job) return;
            const slide = state.slides[job.slideIndex];
            const sticker = slide?.stickers?.[job.stickerIndex];
            if (!sticker) return;
            if (result.success && result.image?.data) {
                sticker.image = `data:${result.image.mime_type || result.image.mimeType || 'image/png'};base64,${result.image.data}`;
                successCount++;
            } else {
                failCount++;
            }
        });

        renderSlidesPreview();

        if (failCount > 0) {
            showNotification(`${successCount} sticker(s) generated, ${failCount} failed. Use the 🔄 button on a sticker to retry.`, 'error');
        } else {
            showNotification(`${successCount} sticker(s) generated!`, 'success');
        }
    } catch (error) {
        console.error('Error generating stickers:', error);
        showNotification(`Sticker generation failed: ${error.message || 'unknown error'}`, 'error');
    }
}

// ==========================================
// LH PARODY FORMAT GENERATION (vector formats, no image cost)
// ==========================================
const LH_FORMAT_IDS = ['yelp', 'closefriends', 'imessage', 'grwm', 'dating', 'screentime'];

// Which lhDesign field the slide-text editor writes to, per role.
function getLhDesignPrimaryField(design) {
    if (!design) return null;
    for (const key of ['text', 'body', 'caption', 'status', 'big', 'sub', 'title']) {
        if (typeof design[key] === 'string') return key;
    }
    return null;
}

function lhDesignToText(design) {
    if (!design) return '';
    return ['title', 'name', 'day', 'exhibit', 'num', 'step', 'section', 'label', 'big', 'text', 'body', 'caption', 'status', 'sub', 'fine', 'warn', 'callout', 'note', 'signature']
        .map((k) => design[k])
        .filter((v) => typeof v === 'string' && v.trim())
        .join(' — ');
}

async function generateLhFormatCarousel() {
    const selected = elements.lhFormatSelect?.value || 'random';
    const format = selected === 'random'
        ? LH_FORMAT_IDS[Math.floor(Math.random() * LH_FORMAT_IDS.length)]
        : selected;
    const theme = elements.lhThemeInput?.value?.trim() || '';
    const btn = elements.lhGenerateBtn;
    const originalLabel = btn?.innerHTML;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Writing the carousel...</span>';
    }

    try {
        const response = await fetch(`${API_BASE}/generate-lh-format`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
            body: JSON.stringify({ format, theme })
        });
        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 200)}`);
        }
        const data = await response.json();
        const slideTexts = Array.isArray(data.slides)
            ? data.slides.map(text => String(text || '').trim())
            : [];
        if (slideTexts.length === 0) throw new Error('No slide text returned');

        state.currentDbtSlideType = 'little_habits';
        state.lhFormatTextOnly = true;
        state.lhSelectedSticker = null;
        state.slides = slideTexts.map((text, index) => ({
            text,
            image: null,
            id: Date.now() + index,
            position: { x: 50, y: 50 },
            scale: 1.5,
            maxWidth: 120,
            fontSize: null,
            stickers: [],
            lhFormatTextOnly: true
        }));
        state.generatedImages = [];

        if (elements.slideTextInput) {
            elements.slideTextInput.value = state.slides
                .map((s, i) => `Slide ${i + 1}: ${s.text}`)
                .join('\n');
        }

        renderSlideBuilderList();
        renderSlidesPreview();
        setCurrentSlideIndex(0);

        // The off-slide funnel is where conversions happen: caption creates the
        // treasure hunt, the pinned comment answers it.
        state.lhCaption = data.caption || '';
        state.lhPinnedComment = data.pinned_comment || '';
        if (elements.lhFunnelOutput && (state.lhCaption || state.lhPinnedComment)) {
            elements.lhFunnelOutput.style.display = 'block';
            if (elements.lhCaptionText) elements.lhCaptionText.textContent = state.lhCaption;
            if (elements.lhPinnedText) elements.lhPinnedText.textContent = state.lhPinnedComment;
        }

        showNotification(`"${format}" carousel ready — ${state.slides.length} slides, no image cost.`, 'success');

        try {
            await generateMetadata({ skipEnsureSlides: true, suppressSuccessNotification: true });
        } catch (metaError) {
            console.error('Metadata generation failed:', metaError);
        }
    } catch (error) {
        console.error('LH format generation failed:', error);
        showNotification(`Generation failed: ${error.message || 'unknown error'}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalLabel || '<span>✨ Generate Carousel</span>';
        }
    }
}

// ==========================================
// SLIDESHOWS (ss) — aesthetic photo slideshow copy
// ==========================================
const SS_ROLE_LABELS = { hook: 'HOOK', skill: 'STEP', bridge: 'BRIDGE · sets up the app slide', cta: 'STEP · app named in text', close: 'CLOSING · hopeful outro' };

// Export resolution: 1080x1920 is TikTok's exact native photo size, so nothing gets
// rescaled server-side (their downscaler is what makes text look washed). 2160x3840 is
// kept as an option for archiving/other platforms.
function ssExportDims() {
    const native = elements.ssExportResSelect?.value !== '2160x3840';
    const width = native ? 1080 : 2160;
    return { width, height: (width / 9) * 16, scale: width / 1080 };
}

// Persist the last generated slideshow so a page reload (e.g. live-server auto-reload
// after a code change) restores it instead of forcing a regeneration. Photos are NOT
// persisted (too large for localStorage) — re-fill them with one click after a reload.
const SS_LAST_GENERATION_KEY = 'ss_last_generation';

function saveSsGeneration(data) {
    try {
        localStorage.setItem(SS_LAST_GENERATION_KEY, JSON.stringify({
            slides: data.slides,
            variety: data.variety,
            save_trigger: data.save_trigger,
            title: data.title,
            hashtags: data.hashtags,
            caption: data.caption,
            description: data.description,
            sound: data.sound,
            pinned_comment: data.pinned_comment,
            language: data.language,
            savedAt: Date.now()
        }));
    } catch (e) {
        console.warn('Could not persist SS generation:', e);
    }
}

function restoreSsGeneration() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(SS_LAST_GENERATION_KEY) || 'null');
    } catch { /* corrupted entry — ignore */ }
    if (!saved || !Array.isArray(saved.slides) || saved.slides.length === 0) return;

    renderSsSlides(saved.slides);

    state.ssCaption = saved.caption || '';
    state.ssDescription = saved.description || '';
    state.ssSound = saved.sound || null;
    state.ssPinnedComment = saved.pinned_comment || '';
    state.ssTitle = saved.title || '';
    state.ssHashtags = Array.isArray(saved.hashtags) ? saved.hashtags : [];
    if (elements.ssFunnelOutput && (state.ssCaption || state.ssPinnedComment || state.ssTitle)) {
        elements.ssFunnelOutput.style.display = 'block';
        if (elements.ssFunnelEmpty) elements.ssFunnelEmpty.style.display = 'none';
        if (elements.ssTitleText) elements.ssTitleText.textContent = state.ssTitle;
        if (elements.ssHashtagsText) elements.ssHashtagsText.textContent = state.ssHashtags.join(' ');
        if (elements.ssCaptionText) elements.ssCaptionText.textContent = state.ssCaption;
        if (elements.ssDescriptionText) elements.ssDescriptionText.textContent = state.ssDescription;
        renderSsSounds([]);
        loadSsSounds().catch(() => {});
        if (elements.ssPinnedText) elements.ssPinnedText.textContent = state.ssPinnedComment;
    }
    if (elements.ssDownloadAllBtn) elements.ssDownloadAllBtn.style.display = 'block';
}

function ssSlideText(slide) {
    return slide.text || '';
}

function renderSsSlides(slides) {
    state.ssSlides = slides;
    if (!elements.ssSlidesList) return;

    elements.ssSlidesList.innerHTML = '';
    slides.forEach((slide) => {
        const card = document.createElement('div');
        card.className = 'ss-slide-card';

        const head = document.createElement('div');
        head.className = 'ss-slide-card-head';

        const badge = document.createElement('span');
        badge.className = `ss-slide-badge ss-slide-badge-${slide.role}`;
        badge.textContent = `Slide ${slide.n} · ${SS_ROLE_LABELS[slide.role] || slide.role}`;
        if (slide.skill) badge.textContent += ` (${slide.skill})`;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn ss-btn-secondary btn-sm';
        copyBtn.textContent = '📋 Copy';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(ssSlideText(slide))
                .then(() => showNotification(`Slide ${slide.n} copied!`, 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });

        head.appendChild(badge);
        head.appendChild(copyBtn);

        const text = document.createElement('div');
        text.className = 'ss-slide-text';
        text.textContent = ssSlideText(slide);

        const query = document.createElement('div');
        query.className = 'ss-slide-query';
        query.textContent = `🔍 Pinterest: ${slide.image_query}`;

        card.appendChild(head);
        card.appendChild(text);
        card.appendChild(query);
        elements.ssSlidesList.appendChild(card);
    });

    if (elements.ssSlidesOutput) elements.ssSlidesOutput.style.display = 'block';
    if (elements.ssSlidesEmpty) elements.ssSlidesEmpty.style.display = 'none';

    // Mirror the copy into the shared preview panel so the slides can be seen as
    // TikTok will show them. Images get dropped onto these same slides later.
    state.slides = slides.map((slide, index) => ({
        text: ssSlideText(slide),
        image: null,
        id: Date.now() + index,
        position: { x: 50, y: 50 },
        scale: 1.5,
        maxWidth: 120,
        fontSize: null,
        ssTextScale: 1,
        stickers: [],
        ss: {
            n: slide.n,
            role: slide.role,
            skill: slide.skill || '',
            imageQuery: slide.image_query || ''
        }
    }));
    state.generatedImages = [];
    renderSlidesPreview();
    setCurrentSlideIndex(0);
    setSsWorkflowSection('ss-slides-section');
}

function setSsWorkflowSection(sectionId) {
    const requested = document.getElementById(sectionId);
    const section = requested?.classList.contains('ss-workflow-section') ? requested : document.getElementById('ss-create-section');
    document.querySelectorAll('#panel-ss .ss-workflow-tab').forEach((tab) => {
        const active = tab.dataset.ssSection === section.id;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('#panel-ss .ss-workflow-section').forEach((item) => {
        item.classList.toggle('is-active', item === section || item.classList.contains('ss-photo-section') && section.id === 'ss-slides-section');
    });
}


// Export: photo (or dark placeholder) with centered white TikTok-font text on top.
// Blank lines in the copy are the headline/body break — render them as separate paragraphs
// so the gap survives, instead of collapsing into one wall of text.
function ssTextParas(text) {
    return String(text || '')
        .split(/\n{2,}/)
        .map(para => para.trim())
        .filter(Boolean);
}

function ssOverlayParasHtml(text) {
    return ssTextParas(text)
        .map((para) => `<div class="ss-overlay-para">${escapeHtml(para).replace(/\n/g, '<br>')}</div>`)
        .join('');
}

// The slideshow uses a 1080px logical design grid, then exports at 2x. Keep the
// editable DOM preview on that same logical scale by deriving its metrics from the
// actual preview card width instead of from the browser viewport.
function syncSsPreviewMetrics() {
    // The SS slideshow shares the Selected Slide text controls (color, outline, font).
    // Default is white text with the hard black TikTok outline; turning the outline off
    // and picking a dark color gives the flat native-editor look of the reference posts.
    const textStyle = getTextOverlayStyleSettings();
    document.querySelectorAll('.ss-slide-preview').forEach((preview) => {
        const overlay = preview.querySelector('.ss-overlay-text');
        if (!overlay) return;

        const width = preview.getBoundingClientRect().width;
        if (!width) return;

        const ratio = width / 1080;
        overlay.style.fontSize = `${49 * ratio}px`;
        overlay.style.setProperty('--ss-text-color', textStyle.textColor);
        overlay.style.setProperty('--ss-font-family', textStyle.fontStack);
        overlay.style.setProperty('--ss-outline-width', textStyle.outlineEnabled ? `${Math.max(6, 49 * 0.17) * ratio}px` : '0px');
        overlay.style.setProperty('--ss-outline-color', textStyle.outlineEnabled ? 'rgba(0, 0, 0, 0.96)' : 'transparent');
        overlay.style.setProperty('--ss-shadow-blur', textStyle.outlineEnabled ? `${49 * 0.08 * ratio}px` : '0px');
        overlay.style.setProperty('--ss-shadow-offset', textStyle.outlineEnabled ? `${49 * 0.05 * ratio}px` : '0px');
    });
}

async function renderSsSlideToCanvas(slide, canvas) {
    // Render at the chosen export resolution (default TikTok-native 1080x1920 so the
    // uploader never rescales the text).
    const { width, height, scale: exportScale } = ssExportDims();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const textStyle = getTextOverlayStyleSettings();
    if (document.fonts?.load) {
        await document.fonts.load(`700 120px "${textStyle.fontFamily}"`).catch(() => {});
    }

    if (slide.image) {
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { drawImageCover(ctx, img, width, height); resolve(); };
            img.onerror = () => resolve();
            img.src = slide.image;
        });
    } else {
        const grad = ctx.createLinearGradient(0, 0, width * 0.5, height);
        grad.addColorStop(0, '#23262f');
        grad.addColorStop(0.55, '#171a21');
        grad.addColorStop(1, '#0f1116');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    const scale = slide.ssTextScale || 1;
    // Base size matches the Storytelling GF v2 default (26px input x 1.26 x 1.5 scale = ~49px).
    const size = 49 * exportScale * scale;
    // Same TikTok caption treatment as the Storytelling GF v2 format: bold, tight leading.
    const lineHeight = size * 1.08;
    const maxWidth = width * 0.84;
    ctx.font = `700 ${size}px ${textStyle.fontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Wrap each paragraph separately so its drag offset can be applied to just its own lines.
    const paras = ssTextParas(slide.text).map((para) => {
        const wrapped = [];
        para.split('\n').forEach((rawLine) => {
            let current = '';
            rawLine.split(/\s+/).filter(Boolean).forEach((word) => {
                const test = current ? `${current} ${word}` : word;
                if (ctx.measureText(test).width > maxWidth && current) {
                    wrapped.push(current);
                    current = word;
                } else {
                    current = test;
                }
            });
            if (current) wrapped.push(current);
        });
        return wrapped;
    });

    const paraGap = lineHeight * 0.9;
    const blockHeight = paras.reduce((sum, p) => sum + p.length * lineHeight, 0)
        + Math.max(0, paras.length - 1) * paraGap
        - lineHeight;
    // The block centers on the dragged position.
    const blockCenterX = ((slide.position?.x ?? 50) / 100) * width;
    let cursorY = ((slide.position?.y ?? 50) / 100) * height - blockHeight / 2;

    paras.forEach((paraLines) => {
        paraLines.forEach((line) => {
            const x = blockCenterX;
            const y = cursorY;
            // Hard black outline under the fill — TikTok's native caption treatment, and the
            // only thing that keeps light text legible over a bright photo. Skipped when the
            // outline toggle is off (flat native-editor look, e.g. dark text on a bright sky).
            if (textStyle.outlineEnabled) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = size * 0.08;
                ctx.shadowOffsetY = size * 0.05;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.miterLimit = 2;
                ctx.lineWidth = Math.max(6, size * 0.17);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.96)';
                ctx.strokeText(line, x, y);
                ctx.restore();
            }

            ctx.fillStyle = textStyle.textColor;
            ctx.fillText(line, x, y);
            cursorY += lineHeight;
        });
        cursorY += paraGap;
    });
}

// ==========================================
// SS PHOTO LIBRARY (folders of photos on disk, served by the API)
// ==========================================
function ssLibraryFileUrl(setId, name) {
    // <img> can't send auth headers, so the key rides along as a query param.
    const key = (localStorage.getItem('TIKTOK_API_KEY') || localStorage.getItem('TIKTOK_API_PASSWORD') || '').trim();
    const keyParam = key ? `&key=${encodeURIComponent(key)}` : '';
    return `${API_BASE}/image-library/file?set=${encodeURIComponent(setId)}&name=${encodeURIComponent(name)}${keyParam}`;
}

// Fetched as a data URL so the export canvas is never cross-origin tainted.
async function ssFetchImageAsDataUrl(setId, name) {
    const res = await fetch(ssLibraryFileUrl(setId, name), { headers: { ...getApiAuthHeaders() } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function loadSsLibrarySets() {
    if (!elements.ssLibrarySelect) return;
    try {
        const res = await fetch(`${API_BASE}/image-library`, { headers: { ...getApiAuthHeaders() } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const sets = Array.isArray(data.sets) ? data.sets : [];
        if (sets.length === 0) {
            elements.ssLibrarySelect.innerHTML = '<option value="">No photo folders found</option>';
            return;
        }
        const stepSets = sets.filter(s => /(?:^|[\\/])(pink|green)$/i.test(s.id));
        state.ssStepPhotoSets = stepSets;
        const options = stepSets
            .map(s => `<option value="${escapeHtml(s.id)}">${/^.*[\\/]pink$/i.test(s.id) ? 'Pink skies' : 'Green fields'} (${s.count})</option>`)
            .join('');
        elements.ssLibrarySelect.innerHTML = '<option value="__random-pink-green__">Randomize one theme per post</option>' + options;
        if (elements.ssHookLibrarySelect) {
            const hookOptions = sets
            .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.label)} (${s.count})</option>`)
            .join('');
            elements.ssHookLibrarySelect.innerHTML = hookOptions;
        }

        // Step photos are Pink or Green only. Slide 1 remains a dedicated hook image.
        elements.ssLibrarySelect.value = '__random-pink-green__';
        const hook = sets.find(s => /hook/i.test(s.id));
        if (hook && elements.ssHookLibrarySelect) elements.ssHookLibrarySelect.value = hook.id;

        await Promise.all([loadSsLibraryImages(), loadSsHookImages()]);
    } catch (error) {
        console.error('Photo library load failed:', error);
        elements.ssLibrarySelect.innerHTML = '<option value="">Library unavailable</option>';
    }
}

async function loadSsLibraryImages() {
    let setId = elements.ssLibrarySelect?.value;
    if (setId === '__random-pink-green__') {
        const choices = state.ssStepPhotoSets || [];
        setId = choices[Math.floor(Math.random() * choices.length)]?.id || '';
    }
    if (!setId || !elements.ssLibraryGrid) return;
    elements.ssLibraryGrid.innerHTML = '<div class="ss-hint">Loading photos…</div>';
    try {
        const res = await fetch(`${API_BASE}/image-library/images?set=${encodeURIComponent(setId)}`, {
            headers: { ...getApiAuthHeaders() }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        state.ssLibrarySet = setId;
        state.ssLibraryImages = Array.isArray(data.images) ? data.images : [];
        state.ssLibraryExpanded = false;
        renderSsLibraryGrid();
    } catch (error) {
        console.error('Photo list failed:', error);
        elements.ssLibraryGrid.innerHTML = '<div class="ss-hint">Could not load photos.</div>';
    }
}

async function loadSsHookImages() {
    const setId = elements.ssHookLibrarySelect?.value;
    if (!setId) return;
    try {
        const res = await fetch(`${API_BASE}/image-library/images?set=${encodeURIComponent(setId)}`, {
            headers: { ...getApiAuthHeaders() }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        state.ssHookSet = setId;
        state.ssHookImages = Array.isArray(data.images) ? data.images : [];
    } catch (error) {
        console.error('Hook photo list failed:', error);
        state.ssHookImages = [];
    }
}

// EVERY slide gets the same photo treatment, including the app step. If the app
// slide looked different from the rest, viewers would spot the ad instantly.
function ssPhotoTargetIndices() {
    return state.slides
        .map((slide, index) => ({ slide, index }))
        .filter(({ slide }) => slide?.ss)
        .map(({ index }) => index);
}

async function ssFillRandomPhotos() {
    let setId = elements.ssLibrarySelect?.value || state.ssLibrarySet;
    if (setId === '__random-pink-green__') {
        const choices = state.ssStepPhotoSets || [];
        setId = choices[Math.floor(Math.random() * choices.length)]?.id || '';
    }
    let pool = setId === state.ssLibrarySet ? (state.ssLibraryImages || []) : [];
    const targets = ssPhotoTargetIndices();
    if (!setId) {
        showNotification('Pick a photo folder first.', 'error');
        return;
    }
    if (targets.length === 0) {
        showNotification('Generate a slideshow first.', 'error');
        return;
    }

    const btn = elements.ssFillPhotosBtn;
    if (btn) btn.disabled = true;
    try {
        if (pool.length === 0) {
            const res = await fetch(`${API_BASE}/image-library/images?set=${encodeURIComponent(setId)}`, {
                headers: { ...getApiAuthHeaders() }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            pool = Array.isArray(data.images) ? data.images : [];
        }
        if (pool.length === 0) throw new Error('The selected Pink/Green folder has no images.');
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const hookPool = state.ssHookImages || [];
        let stepCursor = 0;
        for (const index of targets) {
            const slide = state.slides[index];
            // Slide 1 pulls a random photo from the dedicated hook folder.
            if (slide.ss.role === 'hook' && state.ssHookSet && hookPool.length > 0) {
                const pick = hookPool[Math.floor(Math.random() * hookPool.length)];
                slide.image = await ssFetchImageAsDataUrl(state.ssHookSet, pick);
                continue;
            }
            slide.image = await ssFetchImageAsDataUrl(setId, shuffled[stepCursor % shuffled.length]);
            stepCursor++;
        }
        renderSlidesPreview();
        setSsWorkflowSection('ss-slides-section');
        const themeLabel = /pink$/i.test(setId) ? 'Pink skies' : 'Green fields';
        if (elements.ssPhotoPickerStatus) elements.ssPhotoPickerStatus.textContent = `${targets.length} slides filled with ${themeLabel} — one theme kept across this post`;
        showNotification(`${targets.length} photos added.`, 'success');
    } catch (error) {
        console.error('Fill photos failed:', error);
        showNotification(`Could not load photos: ${error.message || 'unknown error'}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Simple format: every generated slide text is stored so the next run can be told to
// never repeat one word for word. Same topic with different wording stays allowed.
const SS_SIMPLE_HISTORY_KEY = 'ss_simple_slide_history';
const SS_SIMPLE_HISTORY_MAX = 800; // ~100 posts worth of slide texts

function loadSsSimpleHistory() {
    try {
        const list = JSON.parse(localStorage.getItem(SS_SIMPLE_HISTORY_KEY) || '[]');
        return Array.isArray(list) ? list.filter((t) => typeof t === 'string' && t.trim()) : [];
    } catch { return []; }
}

function saveSsSimpleHistory(slides) {
    try {
        const newTexts = (Array.isArray(slides) ? slides : [])
            .map((slide) => String(slide?.text || '').trim())
            .filter(Boolean);
        if (!newTexts.length) return;
        const merged = [...loadSsSimpleHistory(), ...newTexts].slice(-SS_SIMPLE_HISTORY_MAX);
        localStorage.setItem(SS_SIMPLE_HISTORY_KEY, JSON.stringify(merged));
    } catch { /* ignore storage limits */ }
}

// Re-pick only the hook photo (slide 1) from the hook folder — the rest of the post
// stays untouched. Avoids re-filling every slide just to swap the cover image.
async function ssShuffleHookPhoto(index) {
    const slide = state.slides[index];
    if (!slide?.ss || slide.ss.role !== 'hook') return;
    const pool = state.ssHookImages || [];
    if (!state.ssHookSet || pool.length === 0) {
        showNotification('No hook photos loaded — pick a hook folder in the photo library.', 'error');
        return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    try {
        slide.image = await ssFetchImageAsDataUrl(state.ssHookSet, pick);
        renderSlidesPreview();
        setCurrentSlideIndex(index);
        showNotification('New hook photo added.', 'success');
    } catch (error) {
        showNotification(`Could not load hook photo: ${error.message || 'unknown error'}`, 'error');
    }
}

async function generateSsSlideshow(format = 'current') {
    const legacy = format === 'legacy';
    const simple = format === 'simple';
    const dbt = format === 'dbt';
    const hacks = format === 'hacks';
    // Simple + dbt share the listicle skeleton and one slide-text history, so no slide
    // ever repeats word for word across either format. The hacks flow shares that history.
    const listicle = simple || dbt;
    const remembersHistory = listicle || hacks;
    const theme = elements.ssThemeInput?.value?.trim() || '';
    const language = elements.ssLanguageSelect?.value === 'de' ? 'de' : 'en';
    const model = elements.ssModelSelect?.value || 'claude-fable-5';
    const topicSeed = elements.ssTopicSeedSelect?.value?.trim() || '';
    if (legacy && !topicSeed) {
        showNotification('Choose a topic seed before generating the legacy slideshow.', 'error');
        return;
    }
    if (legacy && topicSeed) {
        try {
            const used = JSON.parse(localStorage.getItem('ss_used_topic_seeds') || '[]');
            if (!used.includes(topicSeed)) localStorage.setItem('ss_used_topic_seeds', JSON.stringify([...used, topicSeed].slice(-200)));
        } catch { /* ignore storage limits */ }
    }
    const btn = legacy ? elements.ssOpenLegacyBtn : elements.ssGenerateBtn;
    const originalLabel = btn?.innerHTML;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳ Writing the ${legacy ? 'legacy ' : simple ? 'simple ' : dbt ? 'dbt ' : hacks ? 'weird hacks ' : format === 'meme' ? 'everyday ' : ''}slideshow...</span>`;
    }

    try {
        const response = await fetch(`${API_BASE}/generate-ss-slideshow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
            body: JSON.stringify({
                theme, language, format, model, topicSeed,
                // Only the picker that applies to this format is sent; the rest stay on rotation.
                ...(format === 'current' ? { archetype: elements.ssArchetypeSelect?.value || 'random' } : {}),
                ...(format === 'simple' ? { territory: elements.ssTerritorySelect?.value || 'random', hook: elements.ssHookSelect?.value || 'random' } : {}),
                ...(remembersHistory ? { previousTexts: loadSsSimpleHistory() } : {})
            })
        });
        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 200)}`);
        }
        const data = await response.json();
        const slides = Array.isArray(data.slides) ? data.slides : [];
        if (slides.length === 0) throw new Error('No slides returned');

        if (remembersHistory) saveSsSimpleHistory(slides);
        saveSsGeneration(data);
        renderSsSlides(slides);
        // Jump straight to the rendered preview so the result is visible without scrolling.
        elements.slidesContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (legacy && elements.ssTopicSeedStatus && data.topic_seed) {
            elements.ssTopicSeedStatus.textContent = `Generated from topic: ${data.topic_seed}`;
        }

        state.ssCaption = data.caption || '';
        state.ssDescription = data.description || '';
        state.ssSound = null;
        state.ssPinnedComment = data.pinned_comment || '';
        state.ssTitle = data.title || '';
        state.ssHashtags = Array.isArray(data.hashtags) ? data.hashtags : [];
        if (elements.ssFunnelOutput && (state.ssCaption || state.ssPinnedComment || state.ssTitle)) {
            elements.ssFunnelOutput.style.display = 'block';
            if (elements.ssFunnelEmpty) elements.ssFunnelEmpty.style.display = 'none';
            if (elements.ssTitleText) elements.ssTitleText.textContent = state.ssTitle;
            if (elements.ssHashtagsText) elements.ssHashtagsText.textContent = state.ssHashtags.join(' ');
            if (elements.ssCaptionText) elements.ssCaptionText.textContent = state.ssCaption;
        if (elements.ssDescriptionText) elements.ssDescriptionText.textContent = state.ssDescription;
        renderSsSounds([]);
        loadSsSounds().catch(() => {});
            if (elements.ssPinnedText) elements.ssPinnedText.textContent = state.ssPinnedComment;
        }
        if (elements.ssDownloadAllBtn) elements.ssDownloadAllBtn.style.display = 'block';

        showNotification(`${legacy ? 'Legacy slideshow' : simple ? 'Simple slideshow' : dbt ? 'DBT slideshow' : hacks ? 'Weird hacks slideshow' : 'Slideshow'} ready — ${slides.length} slides.`, 'success');
    } catch (error) {
        console.error('SS slideshow generation failed:', error);
        showNotification(`Generation failed: ${error.message || 'unknown error'}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalLabel || `<span>${legacy ? 'Generate legacy 6-slide slideshow' : '✨ Generate Slideshow Copy'}</span>`;
        }
    }
}

// --- TikTok sound picker (slideshow flow) -------------------------------------------------
// Suggestions come from the accounts whose carousels define this format, so the sound is
// already proven under this kind of post. Previewing matters more than any ranking: the user
// decides by ear, so the card exists to make listening one click.
let ssSoundAudio = null;
let ssSoundShown = [];
let ssSoundBusy = false;

function ssSoundStopPlayback() {
    if (ssSoundAudio) { ssSoundAudio.pause(); ssSoundAudio = null; }
    document.querySelectorAll('.ss-sound-play').forEach((button) => {
        button.textContent = '▶';
        button.dataset.playing = 'false';
    });
}

function ssSoundToggle(sound, button) {
    const wasPlaying = ssSoundAudio && ssSoundAudio.dataset.soundId === sound.id && !ssSoundAudio.paused;
    ssSoundStopPlayback();
    if (wasPlaying) return;
    // An <audio> element cannot set request headers, so the key rides in the query string
    // the same way the photo-library thumbnails already do.
    const apiKey = (localStorage.getItem('TIKTOK_API_KEY') || localStorage.getItem('TIKTOK_API_PASSWORD') || '').trim();
    const src = `${API_BASE}/ss-sounds/audio?id=${encodeURIComponent(sound.id)}${apiKey ? `&key=${encodeURIComponent(apiKey)}` : ''}`;
    const audio = new Audio(src);
    audio.dataset.soundId = sound.id;
    audio.addEventListener('ended', ssSoundStopPlayback);
    audio.addEventListener('error', () => {
        ssSoundStopPlayback();
        if (elements.ssSoundStatus) elements.ssSoundStatus.textContent = 'Dieser Sound lässt sich nicht abspielen. Wähle einen anderen oder lade neue Vorschläge.';
    });
    ssSoundAudio = audio;
    button.textContent = '❚❚';
    button.dataset.playing = 'true';
    audio.play().catch(() => {
        ssSoundStopPlayback();
        if (elements.ssSoundStatus) elements.ssSoundStatus.textContent = 'Wiedergabe blockiert. Klicke die Seite einmal an und versuche es erneut.';
    });
}

function ssSoundSelect(sound) {
    // Storing the whole object keeps the export self-contained: title, artist and the URL
    // that gets pasted when the post goes up.
    state.ssSound = { id: sound.id, title: sound.title, artist: sound.artist, link: sound.link };
    renderSsSounds(ssSoundShown);
    saveSsGeneration({
        slides: state.slides, variety: state.ssVariety, save_trigger: state.ssSaveTrigger,
        title: state.ssTitle, hashtags: state.ssHashtags, caption: state.ssCaption,
        description: state.ssDescription, sound: state.ssSound, pinned_comment: state.ssPinnedComment,
        language: state.ssLanguage,
    });
}

// Views are shown compactly: "155k" reads at a glance where "154.898" wraps the row.
function ssSoundCount(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
}

function renderSsSounds(sounds) {
    const list = elements.ssSoundList;
    if (!list) return;
    ssSoundShown = sounds || [];
    list.replaceChildren();
    // A previously chosen sound stays visible even when it is not in the current draw,
    // otherwise refreshing would silently look like the selection was lost.
    const cards = [...ssSoundShown];
    if (state.ssSound && !cards.some((s) => s.id === state.ssSound.id)) cards.unshift(state.ssSound);

    for (const sound of cards) {
        const selected = state.ssSound?.id === sound.id;
        // The whole row selects. In a 260px column a separate button left the title and
        // metadata about 40px of space, which wrapped them one word per line.
        const card = document.createElement('div');
        card.className = 'ss-sound-card';
        card.dataset.selected = String(selected);
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', String(selected));
        card.tabIndex = 0;
        card.title = selected ? 'Ausgewählt' : 'Als Sound für diesen Post auswählen';

        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'ss-sound-play';
        play.textContent = '▶';
        play.setAttribute('aria-label', `${sound.title} anhören`);
        play.addEventListener('click', (event) => { event.stopPropagation(); ssSoundToggle(sound, play); });

        const main = document.createElement('div');
        main.className = 'ss-sound-main';
        const title = document.createElement('div');
        title.className = 'ss-sound-title';
        title.textContent = sound.title;
        // Two short lines beat one truncated one: at this width "Artist - 60s - 831k Views -
        // @handle" loses its tail to an ellipsis, and the handle is the trust signal.
        const meta = document.createElement('div');
        meta.className = 'ss-sound-meta';
        meta.textContent = [sound.artist, sound.duration ? `${sound.duration}s` : ''].filter(Boolean).join(' · ');
        const sub = document.createElement('div');
        sub.className = 'ss-sound-meta ss-sound-sub';
        sub.textContent = sound.plays ? `${ssSoundCount(sound.plays)} Views` : '';
        if (sound.via) {
            const via = document.createElement('span');
            via.className = 'ss-sound-via';
            via.textContent = sub.textContent ? ` · ${sound.via}` : sound.via;
            sub.append(via);
        }
        main.append(title, meta);
        if (sub.textContent) main.append(sub);

        const check = document.createElement('span');
        check.className = 'ss-sound-check';
        check.textContent = selected ? '✓' : '';

        card.append(play, main, check);
        card.addEventListener('click', () => ssSoundSelect(sound));
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ssSoundSelect(sound); }
        });
        list.append(card);
    }
}

async function loadSsSounds(refresh = false) {
    if (ssSoundBusy || !elements.ssSoundList) return;
    ssSoundBusy = true;
    ssSoundStopPlayback();
    if (elements.ssSoundRefresh) elements.ssSoundRefresh.disabled = true;
    if (elements.ssSoundStatus) elements.ssSoundStatus.textContent = refresh ? 'Suche neue Sounds…' : 'Sounds werden geladen…';
    try {
        // Excluding what is on screen is what makes "Andere Vorschläge" show something new.
        const exclude = ssSoundShown.map((s) => s.id).join(',');
        const query = new URLSearchParams({ count: '3' });
        if (exclude) query.set('exclude', exclude);
        if (refresh) query.set('refresh', '1');
        const response = await fetch(`${API_BASE}/ss-sounds?${query}`, { headers: getApiAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Fehler ${response.status}`);
        renderSsSounds(data.sounds || []);
        if (elements.ssSoundStatus) {
            elements.ssSoundStatus.textContent = (data.sounds || []).length
                ? `${data.poolSize} Sounds im Pool · aus den Referenz-Accounts und eigenen Scrapes.`
                : 'Keine Sounds gefunden. Versuche es mit "Andere Vorschläge" erneut.';
        }
    } catch (error) {
        if (elements.ssSoundStatus) elements.ssSoundStatus.textContent = `Sounds konnten nicht geladen werden: ${error.message}`;
    } finally {
        ssSoundBusy = false;
        if (elements.ssSoundRefresh) elements.ssSoundRefresh.disabled = false;
    }
}

function syncSsFormatChoice() {
    const format = elements.ssFormatSelect?.value || 'current';
    const legacy = format === 'legacy';
    const simple = format === 'simple';
    const dbt = format === 'dbt';
    const hacks = format === 'hacks';
    if (elements.ssTopicSeedTools) elements.ssTopicSeedTools.style.display = legacy ? 'block' : 'none';
    // The archetype pool belongs to the current flow; the territory pool to the listicle formats.
    if (elements.ssArchetypeGroup) elements.ssArchetypeGroup.style.display = format === 'current' ? 'block' : 'none';
    if (elements.ssTerritoryGroup) elements.ssTerritoryGroup.style.display = simple ? 'block' : 'none';
    if (elements.ssHookGroup) elements.ssHookGroup.style.display = simple ? 'block' : 'none';
    // The weird-hacks copy is the most judgement-heavy format on the account (the
    // weirdness test, the plain-language mechanism line), so it defaults to Opus 5.
    if (hacks && elements.ssModelSelect && elements.ssModelSelect.value !== 'claude-opus-5') {
        elements.ssModelSelect.value = 'claude-opus-5';
    }
    if (elements.ssFormatHint) {
        elements.ssFormatHint.textContent = hacks
            ? 'Weird hacks format: a face-cam hook, 3–5 oddly specific therapist hacks (each with a plain-language "why it works"), a bridge slide, the app-screenshot slide, and a hopeful closing slide. 6–9 slides, written by Opus 5.'
            : legacy
            ? 'Legacy format: 6 slides with a face hook, five atmospheric photos, numbered points 1–5, and a woven app mention. This matches the older folder-1 post.'
            : simple
                ? 'Simple format: numbered confessional listicles ("N things I didn\'t know were BPD symptoms", "quirks that turned out to be BPD", ...) — 1 hook, 5–7 short confessionals, and a bonus app tip as the last slide. Easiest copy to read.'
                : dbt
                    ? 'DBT format: the post-diagnosis learnings listicle ("N things I learned in DBT that I use every day") — 1 hook, 5–7 honest before/after learnings, and a bonus app tip as the last slide.'
                    : format === 'meme'
                ? 'Everyday format: the meme-slides topic engine (objects, places, small decisions) written as a normal UGC slideshow. Same 6 slides and photo queries as Current, no mascot and no reaction-image captions.'
                : 'Current format: 1 hook plus 5 numbered value slides. Photos are selected in the Slides step.';
    }
    if (elements.ssGenerationHint) {
        elements.ssGenerationHint.textContent = hacks
            ? 'Hook shape and situation rotate per run, and every hack is checked against the weirdness test plus a banned-jargon list (cortisol, prefrontal cortex, nervous system) before the copy comes back.'
            : legacy
            ? 'The older copy structure is restored: hook tilt, longer reflective bodies, points 1–5, and the app mention on point 4.'
            : (simple || dbt)
                ? 'Every generated slide text is remembered and never repeated word for word. The same topic with different wording (e.g. 6 vs 7 things) is fine.'
                : 'Hook archetype and topic domain rotate automatically, so consecutive posts never land on the same format.';
    }
    if (elements.ssGenerateBtn) elements.ssGenerateBtn.style.display = legacy ? 'none' : 'block';
    if (elements.ssOpenLegacyBtn) elements.ssOpenLegacyBtn.style.display = legacy ? 'block' : 'none';
}

async function generateSsTopicSeeds() {
    const btn = elements.ssGenerateTopicSeedsBtn;
    const original = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Generating topic ideas...'; }
    if (elements.ssTopicSeedStatus) elements.ssTopicSeedStatus.textContent = 'Generating 30 fresh topic seeds...';
    try {
        // Exclude everything: seeds already used for slideshows AND every seed from
        // earlier batches, so a new batch never re-serves the same 30 topics.
        let usedSeeds = [];
        let seenSeeds = [];
        let poolSeeds = [];
        try { usedSeeds = JSON.parse(localStorage.getItem('ss_used_topic_seeds') || '[]'); } catch { usedSeeds = []; }
        try { seenSeeds = JSON.parse(localStorage.getItem('ss_seen_topic_seeds') || '[]'); } catch { seenSeeds = []; }
        // The last shown batch (this key existed before the seen-history did).
        try { poolSeeds = JSON.parse(localStorage.getItem('ss_topic_seed_pool') || '[]'); } catch { poolSeeds = []; }
        const response = await fetch(`${API_BASE}/generate-ss-topic-seeds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
            body: JSON.stringify({ model: elements.ssModelSelect?.value || 'claude-fable-5', usedSeeds: [...usedSeeds, ...seenSeeds, ...poolSeeds] })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
        const data = await response.json();
        const seeds = Array.isArray(data.seeds) ? data.seeds : [];
        if (!elements.ssTopicSeedSelect || !seeds.length) throw new Error('No topic seeds returned');
        // EASY-tier seeds carry an [easy] marker — badge them in the UI, but the clean
        // text (without the marker) is what gets stored, selected and sent to generation.
        const cleanSeed = (seed) => String(seed).replace(/\s*\[easy\]\s*$/i, '').trim();
        const isEasySeed = (seed) => /\s*\[easy\]\s*$/i.test(String(seed));
        elements.ssTopicSeedSelect.innerHTML = '<option value="">Choose a topic seed</option>' + seeds
            .map((seed, index) => `<option value="${escapeHtml(cleanSeed(seed))}">${String(index + 1).padStart(2, '0')} · ${escapeHtml(cleanSeed(seed))}${isEasySeed(seed) ? ' · EASY' : ''}</option>`)
            .join('');
        elements.ssTopicSeedSelect.disabled = false;
        if (elements.ssTopicSeedList) {
            elements.ssTopicSeedList.innerHTML = seeds.map((seed, index) => `
                <button type="button" class="ss-topic-seed-item${isEasySeed(seed) ? ' is-easy' : ''}" data-seed-index="${index}">
                    <span class="ss-topic-seed-number">${String(index + 1).padStart(2, '0')}</span>
                    <span>${escapeHtml(cleanSeed(seed))}${isEasySeed(seed) ? '<span class="ss-topic-seed-easy">EASY</span>' : ''}</span>
                </button>`).join('');
            elements.ssTopicSeedList.querySelectorAll('.ss-topic-seed-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const index = Number(item.dataset.seedIndex);
                    const seed = cleanSeed(seeds[index] || '');
                    elements.ssTopicSeedSelect.value = seed;
                    elements.ssTopicSeedList.querySelectorAll('.ss-topic-seed-item').forEach((candidate) => candidate.classList.remove('is-selected'));
                    item.classList.add('is-selected');
                    if (elements.ssTopicSeedStatus) elements.ssTopicSeedStatus.textContent = `Selected topic ${String(index + 1).padStart(2, '0')}${isEasySeed(seeds[index]) ? ' (EASY tier)' : ''}. Generate the legacy slideshow when ready.`;
                });
            });
        }
        try { localStorage.setItem('ss_topic_seed_pool', JSON.stringify(seeds)); } catch { /* ignore storage limits */ }
        // Remember every seed ever shown so future batches must avoid them.
        try {
            const seen = JSON.parse(localStorage.getItem('ss_seen_topic_seeds') || '[]');
            const merged = [...new Set([...seen, ...seeds.map(cleanSeed)])].slice(-300);
            localStorage.setItem('ss_seen_topic_seeds', JSON.stringify(merged));
        } catch { /* ignore storage limits */ }
        if (elements.ssTopicSeedStatus) elements.ssTopicSeedStatus.textContent = `${seeds.length} topic seeds ready. Choose one before generating the slideshow.`;
    } catch (error) {
        console.error('Topic seed generation failed:', error);
        if (elements.ssTopicSeedStatus) elements.ssTopicSeedStatus.textContent = `Could not generate topic seeds: ${error.message || 'unknown error'}`;
        showNotification('Could not generate topic seeds.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = original || 'Generate 30 topic ideas'; }
    }
}

const LH_MOCK_COLORS = ['#ffd6e0', '#d6ecff', '#fff3c4', '#d9f2df', '#e8defc', '#ffe4cc', '#d4f0f0'];

// ==========================================
// THE SCRIPT (9-slide word-for-word scripts)
// ==========================================

// Notes-app paper backgrounds: light, warm, "artifact you screenshot" energy — deliberately
// the opposite of the dark moody look (which reads as stigma in this niche). One tint per
// carousel so the set is coherent; the account rotates tints across posts.
const TS_PAPER_TINTS = {
    cream: { bg: '#f6f1e7', grain: 'rgba(96, 82, 58, 0.05)', text: '#2c2822', accent: '#7a6c55' },
    sage: { bg: '#edf1e8', grain: 'rgba(70, 92, 66, 0.05)', text: '#26301f', accent: '#647a58' },
    blush: { bg: '#f6ece8', grain: 'rgba(110, 74, 64, 0.05)', text: '#332523', accent: '#8a6a5e' },
    lavender: { bg: '#efedf3', grain: 'rgba(84, 76, 110, 0.05)', text: '#292635', accent: '#6f668c' }
};
const TS_PAPER_TINT_IDS = Object.keys(TS_PAPER_TINTS);

// Script slides arrive as: label: "quoted line" [bracket note]. Splitting the three parts
// lets the quote render handwritten (Gloria Hallelujah) — the "copied from my notes" look.
function tsScriptSegments(text) {
    const m = String(text || '').match(/^([\s\S]*?)"([\s\S]+?)"\s*(\[[\s\S]*\])?\s*$/);
    if (!m) return null;
    return [
        { text: (m[1] || '').trim(), style: 'label' },
        { text: `"${(m[2] || '').trim()}"`, style: 'quote' },
        m[3] ? { text: m[3].trim(), style: 'note' } : null
    ].filter(seg => seg && seg.text);
}

// Ordered render blocks for one slide: {text, style} — one font per block so wrapping stays
// simple and preview/canvas share the same segmentation.
function tsTextBlocks(slide) {
    const role = slide?.ts?.role;
    if (role === 'script') {
        const segs = tsScriptSegments(slide.text);
        if (segs) return segs;
    }
    return ssTextParas(slide.text).map(para => ({
        text: para,
        style: role === 'hook' ? 'hook' : 'body'
    }));
}

// Each Script text block keeps its own nudge in % of the slide. This mirrors the
// Little Habits text controls and keeps the interactive preview/export coordinate
// systems identical.
function getTsTextOffset(slide, blockIndex) {
    const offset = slide?.tsTextOffsets?.[blockIndex];
    return { dx: offset?.dx || 0, dy: offset?.dy || 0 };
}

function renderSsLibraryGrid() {
    if (!elements.ssLibraryGrid) return;
    const images = state.ssLibraryImages || [];
    const visibleImages = state.ssLibraryExpanded ? images : images.slice(0, 12);
    elements.ssLibraryGrid.innerHTML = visibleImages
        .map(name => `<button class="ss-library-thumb-wrap" type="button" title="Use ${escapeHtml(name)}"><img class="ss-library-thumb" loading="lazy" data-name="${escapeHtml(name)}" src="${ssLibraryFileUrl(state.ssLibrarySet, name)}" alt="${escapeHtml(name)}"></button>`)
        .join('') || '<div class="ss-hint">No photos in this folder.</div>';
    if (elements.ssLibraryMoreBtn) {
        const hasMore = images.length > 12;
        elements.ssLibraryMoreBtn.style.display = hasMore ? 'block' : 'none';
        elements.ssLibraryMoreBtn.textContent = state.ssLibraryExpanded ? 'Show fewer photos' : `Show all ${images.length} photos`;
    }
}

function setTsTextOffset(slide, blockIndex, dx, dy) {
    if (!slide.tsTextOffsets) slide.tsTextOffsets = {};
    slide.tsTextOffsets[blockIndex] = { dx, dy };
}

function tsOverlayParasHtml(slide, slideIndex) {
    return tsTextBlocks(slide)
        .map((block, blockIndex) => {
            const { dx, dy } = getTsTextOffset(slide, blockIndex);
            return `<div class="ts-para ts-para-${block.style}" data-ts-text="${blockIndex}" data-slide-index="${slideIndex}" style="left:${dx}%; top:${dy}%" title="Drag to move · double-click to reset">${escapeHtml(block.text).replace(/\n/g, '<br>')}</div>`;
        })
        .join('');
}

async function renderTheScriptSlideToCanvas(slide, canvas) {
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const usePhoto = state.tsBgMode === 'photo' && !!state.tsBgImage;
    const tint = TS_PAPER_TINTS[slide?.ts?.tint] || TS_PAPER_TINTS.cream;
    if (document.fonts?.load) {
        await Promise.all([
            document.fonts.load('600 60px "TikTok Sans"'),
            document.fonts.load('700 60px "TikTok Sans"')
        ]).catch(() => {});
    }

    if (usePhoto) {
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { drawImageCover(ctx, img, width, height); resolve(); };
            img.onerror = () => resolve();
            img.src = state.tsBgImage;
        });
    } else {
        // Paper: flat tint + fine grain so it reads as a photographed note, not a flat UI card.
        ctx.fillStyle = tint.bg;
        ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < 3200; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? tint.grain : 'rgba(255,255,255,0.05)';
            ctx.fillRect(Math.random() * width, Math.random() * height, 1.6, 1.6);
        }
        // Soft edge shading, like a page photographed on a desk.
        const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.75);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(60,50,35,0.08)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
    }

    // Photo mode: TikTok-native caption look (white fill, hard black outline, centered).
    // Paper mode: notes page (charcoal ink, left-aligned).
    const styleFor = usePhoto ? {
        hook: { font: '700 70px "TikTok Sans", sans-serif', lineHeight: 70 * 1.35, gap: 0 },
        body: { font: '600 56px "TikTok Sans", sans-serif', lineHeight: 56 * 1.45, gap: 0 },
        label: { font: '700 50px "TikTok Sans", sans-serif', lineHeight: 50 * 1.35, gap: 0 },
        quote: { font: '600 62px "TikTok Sans", sans-serif', lineHeight: 62 * 1.45, gap: 28 },
        note: { font: '600 48px "TikTok Sans", sans-serif', lineHeight: 48 * 1.45, gap: 32 }
    } : {
        hook: { font: '700 66px "TikTok Sans", sans-serif', color: tint.text, lineHeight: 66 * 1.4, gap: 0 },
        body: { font: '500 54px "TikTok Sans", sans-serif', color: tint.text, lineHeight: 54 * 1.5, gap: 0 },
        label: { font: '700 48px "TikTok Sans", sans-serif', color: tint.accent, lineHeight: 48 * 1.4, gap: 0 },
        quote: { font: '600 58px "TikTok Sans", sans-serif', color: tint.text, lineHeight: 58 * 1.5, gap: 26 },
        note: { font: '500 46px "TikTok Sans", sans-serif', color: tint.accent, lineHeight: 46 * 1.5, gap: 30 }
    };

    const maxWidth = width * (usePhoto ? 0.84 : 0.78);
    const blocks = tsTextBlocks(slide).map(block => {
        const st = styleFor[block.style] || styleFor.body;
        ctx.font = st.font;
        const lines = [];
        block.text.split('\n').forEach(rawLine => {
            let current = '';
            rawLine.split(/\s+/).filter(Boolean).forEach(word => {
                const test = current ? `${current} ${word}` : word;
                if (ctx.measureText(test).width > maxWidth && current) {
                    lines.push(current);
                    current = word;
                } else {
                    current = test;
                }
            });
            if (current) lines.push(current);
        });
        return { lines, st };
    });

    const totalHeight = blocks.reduce((sum, b, i) =>
        sum + b.lines.length * b.st.lineHeight + (i > 0 ? (b.st.gap || b.st.lineHeight * 0.55) : 0), 0);
    let cursorY = height / 2 - totalHeight / 2;

    ctx.textAlign = usePhoto ? 'center' : 'left';
    ctx.textBaseline = 'top';
    const baseX = usePhoto ? width / 2 : width * 0.11;
    blocks.forEach((b, i) => {
        if (i > 0) cursorY += b.st.gap || b.st.lineHeight * 0.55;
        const { dx, dy } = getTsTextOffset(slide, i);
        const x = baseX + (dx / 100) * width;
        const blockY = cursorY + (dy / 100) * height;
        ctx.font = b.st.font;
        b.lines.forEach(line => {
            if (usePhoto) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 16;
                ctx.shadowOffsetY = 2;
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.lineWidth = 7;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(line, x, blockY);
                ctx.restore();
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = b.st.color;
            }
            ctx.fillText(line, x, blockY);
            cursorY += b.st.lineHeight;
        });
    });
}

const TS_ROLE_LABELS = {
    hook: 'HOOK',
    scene: 'THE SCENE',
    trap: 'THE TRAP',
    script: 'SCRIPT',
    why: 'THE WHY',
    fallback: 'THE 2AM VERSION',
    bridge: 'BRIDGE · app named'
};

function syncTsBgControls() {
    const isPhoto = state.tsBgMode === 'photo';
    if (elements.tsBgPhotoControls) elements.tsBgPhotoControls.style.display = isPhoto ? 'block' : 'none';
    if (elements.tsBgPreviewWrap) elements.tsBgPreviewWrap.style.display = state.tsBgImage ? 'block' : 'none';
    if (elements.tsBgPreview && state.tsBgImage) elements.tsBgPreview.src = state.tsBgImage;
}

function renderTsHooks(hooks) {
    state.tsHooks = Array.isArray(hooks) ? hooks : [];
    if (!elements.tsHooksList) return;

    elements.tsHooksList.innerHTML = '';
    const currentHook = state.tsSlides?.[0]?.text || '';

    state.tsHooks.forEach((hook, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'ts-hook-card' + (hook === currentHook ? ' ts-hook-card--active' : '');
        card.textContent = hook;
        card.addEventListener('click', () => applyTsHook(index));
        elements.tsHooksList.appendChild(card);
    });

    if (elements.tsHooksOutput) elements.tsHooksOutput.style.display = 'block';
    if (elements.tsHooksEmpty) elements.tsHooksEmpty.style.display = 'none';
}

// Swap the chosen hook into slide 1 everywhere it lives: the copy card, the preview
// canvas source, and the zip export all read from these two structures.
function applyTsHook(index) {
    const hook = state.tsHooks?.[index];
    if (!hook || !state.tsSlides?.length) return;

    state.tsSlides[0].text = hook;
    if (state.slides[0]) state.slides[0].text = hook;

    renderTheScriptSlides(state.tsSlides);
    renderTsHooks(state.tsHooks);
    showNotification('Slide 1 hook swapped', 'success');
}

function renderTheScriptSlides(slides) {
    state.tsSlides = slides;
    if (!elements.tsSlidesList) return;

    // One paper tint per carousel, chosen at generate time (or re-rolled from the dropdown).
    const tintId = state.tsPaperTint || 'cream';
    slides.forEach(slide => { slide.tint = tintId; });

    elements.tsSlidesList.innerHTML = '';
    slides.forEach((slide) => {
        const card = document.createElement('div');
        card.className = 'ts-slide-card';

        const head = document.createElement('div');
        head.className = 'ts-slide-card-head';

        const badge = document.createElement('span');
        badge.className = `ts-slide-badge ts-slide-badge-${slide.role}`;
        badge.textContent = `Slide ${slide.n} · ${TS_ROLE_LABELS[slide.role] || slide.role}`;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn ts-btn-secondary btn-sm';
        copyBtn.textContent = '📋 Copy';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(slide.text)
                .then(() => showNotification(`Slide ${slide.n} copied!`, 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });

        head.appendChild(badge);
        head.appendChild(copyBtn);

        const text = document.createElement('div');
        text.className = 'ts-slide-text';
        text.textContent = slide.text;

        card.appendChild(head);
        card.appendChild(text);
        elements.tsSlidesList.appendChild(card);
    });

    if (elements.tsSlidesOutput) elements.tsSlidesOutput.style.display = 'block';
    if (elements.tsSlidesEmpty) elements.tsSlidesEmpty.style.display = 'none';

    // Mirror into the shared preview panel — same dark canvas + centered white text as ss,
    // but text-only (no photo library): the copy IS the content in this format.
    state.slides = slides.map((slide, index) => ({
        text: slide.text,
        image: null,
        id: Date.now() + index,
        position: { x: 50, y: 50 },
        scale: 1.5,
        maxWidth: 120,
        fontSize: null,
        stickers: [],
        ts: {
            n: slide.n,
            role: slide.role,
            tint: slide.tint || 'cream'
        },
        tsTextOffsets: slide.tsTextOffsets || {}
    }));
    state.generatedImages = [];
    renderSlidesPreview();
    setCurrentSlideIndex(0);
}

async function generateTheScriptSlideshow() {
    const scenario = elements.tsScenarioSelect?.value || 'random';
    const pov = elements.tsPovSelect?.value || 'random';
    const tone = elements.tsToneSelect?.value || 'random';
    const theme = elements.tsThemeInput?.value?.trim() || '';
    const language = elements.tsLanguageSelect?.value || 'en';
    const btn = elements.tsGenerateBtn;
    const originalLabel = btn?.innerHTML;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Writing the scripts...</span>';
    }

    try {
        const response = await fetch(`${API_BASE}/generate-the-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
            body: JSON.stringify({ scenario, pov, tone, theme, language })
        });
        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 200)}`);
        }
        const data = await response.json();
        const slides = Array.isArray(data.slides) ? data.slides : [];
        if (slides.length === 0) throw new Error('No slides returned');

        const requestedTint = elements.tsPaperSelect?.value || 'random';
        state.tsPaperTint = requestedTint !== 'random' && TS_PAPER_TINTS[requestedTint]
            ? requestedTint
            : TS_PAPER_TINT_IDS[Math.floor(Math.random() * TS_PAPER_TINT_IDS.length)];

        renderTheScriptSlides(slides);
        renderTsHooks(data.hooks || []);

        state.tsCaption = data.caption || '';
        state.tsPinnedComment = data.pinned_comment || '';
        state.tsTitle = data.title || '';
        state.tsHashtags = Array.isArray(data.hashtags) ? data.hashtags : [];
        if (elements.tsFunnelOutput && (state.tsCaption || state.tsPinnedComment || state.tsTitle)) {
            elements.tsFunnelOutput.style.display = 'block';
            if (elements.tsFunnelEmpty) elements.tsFunnelEmpty.style.display = 'none';
            if (elements.tsTitleText) elements.tsTitleText.textContent = state.tsTitle;
            if (elements.tsHashtagsText) elements.tsHashtagsText.textContent = state.tsHashtags.join(' ');
            if (elements.tsCaptionText) elements.tsCaptionText.textContent = state.tsCaption;
            if (elements.tsPinnedText) elements.tsPinnedText.textContent = state.tsPinnedComment;
        }
        if (elements.tsDownloadAllBtn) elements.tsDownloadAllBtn.style.display = 'block';

        showNotification(`The Script ready — ${slides.length} slides · ${data.scenario?.label || 'scenario'} · ${data.pov || ''} · ${data.tone || ''}.`, 'success');
    } catch (error) {
        console.error('The Script generation failed:', error);
        showNotification(`Generation failed: ${error.message || 'unknown error'}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalLabel || '<span>✨ Generate The Script</span>';
        }
    }
}

async function generateSsBatch() {
    const account = elements.ssBatchAccount?.value?.trim() || 'default';
    const count = parseInt(elements.ssBatchCount?.value || '5', 10);
    const theme = elements.ssThemeInput?.value?.trim() || '';
    const btn = elements.ssBatchGenerateBtn;
    const originalLabel = btn?.innerHTML;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Generating batch (2-5 min)...</span>';
    }

    try {
        const response = await fetch(`${API_BASE}/generate-ss-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
            body: JSON.stringify({ count, account, theme })
        });
        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 200)}`);
        }
        const data = await response.json();

        if (elements.ssBatchResults) {
            elements.ssBatchResults.innerHTML = '';
            const head = document.createElement('div');
            head.className = 'ss-label';
            head.textContent = `${data.generated} bundles ready${data.failed ? ` (${data.failed} failed)` : ''}`;
            elements.ssBatchResults.appendChild(head);

            (data.bundles || []).forEach((b) => {
                const card = document.createElement('div');
                card.className = 'ss-slide-card';
                const title = document.createElement('div');
                title.className = 'ss-slide-text';
                title.style.marginBottom = '4px';
                title.textContent = `post-${String(b.post).padStart(2, '0')} · ${b.format} · CTA ${b.cta_position}`;
                const hook = document.createElement('div');
                hook.className = 'ss-slide-query';
                hook.textContent = `"${b.hook}"`;
                const path = document.createElement('div');
                path.className = 'ss-slide-query';
                path.style.wordBreak = 'break-all';
                path.textContent = b.bundle;
                card.appendChild(title);
                card.appendChild(hook);
                card.appendChild(path);
                elements.ssBatchResults.appendChild(card);
            });
            elements.ssBatchResults.style.display = 'block';
        }

        showNotification(`Batch done: ${data.generated} bundles in Queue${data.failed ? `, ${data.failed} failed` : ''}.`, data.failed ? 'error' : 'success');
    } catch (error) {
        console.error('SS batch generation failed:', error);
        showNotification(`Batch failed: ${error.message || 'unknown error'}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalLabel || '<span>⚡ Generate Batch</span>';
        }
    }
}
const LH_MOCK_EMOJIS = ['🧸', '🕯️', '🍵', '🧊', '🌈', '☁️', '🪴', '🎧', '💛', '🫧', '🍓', '🌙', '🧘', '📓'];

function createLhMockStickerImage(prompt) {
    const hash = [...String(prompt || 'mock')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const color = LH_MOCK_COLORS[hash % LH_MOCK_COLORS.length];
    const emoji = LH_MOCK_EMOJIS[hash % LH_MOCK_EMOJIS.length];

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(256, 256, 200, 184, ((hash % 7) - 3) * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '190px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 256, 268);

    return canvas.toDataURL('image/png');
}

function fillLittleHabitsMockStickers() {
    let filled = 0;
    state.slides.forEach((slide) => {
        (slide.stickers || []).forEach((sticker) => {
            if (!sticker.prompt) return;
            sticker.image = createLhMockStickerImage(sticker.prompt);
            filled++;
        });
    });

    if (filled === 0) {
        showNotification('No sticker slots to fill. Generate slides first.', 'error');
        return;
    }

    renderSlidesPreview();
    showNotification(`${filled} mock sticker(s) filled in for free.`, 'success');
}

function drawLhStickerOnCanvas(ctx, sticker, stickerIndex, width, height) {
    return new Promise((resolve) => {
        if (!sticker?.image) {
            resolve();
            return;
        }
        const img = new Image();
        img.onload = () => {
            const anchor = getLhSlotAnchor(sticker.slot);
            const baseWidthPx = (getLhStickerBaseWidthPct(sticker.slot) / 100) * width;
            const drawWidth = baseWidthPx * (sticker.scale || 1);
            const aspect = (img.naturalHeight || 1) / (img.naturalWidth || 1);
            const drawHeight = drawWidth * aspect;
            const cx = ((anchor.x + (sticker.dx || 0)) / 100) * width;
            const cy = ((anchor.y + (sticker.dy || 0)) / 100) * height;
            const rotationDeg = sticker.rotation ?? getLhStickerRotation(stickerIndex);
            const rotation = (rotationDeg * Math.PI) / 180;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
            resolve();
        };
        img.onerror = () => resolve();
        img.src = sticker.image;
    });
}

function lhFontFor(style, size, playfulScale = 1.08) {
    if (style === 'playful') {
        return `400 ${Math.round(size * playfulScale)}px "Gloria Hallelujah", "Quicksand", cursive`;
    }
    if (style === 'bold') {
        return `700 ${size}px "Quicksand", "TikTok Sans", sans-serif`;
    }
    return `500 ${size}px "Quicksand", "TikTok Sans", sans-serif`;
}

function lhTokenizeWords(spans) {
    const words = [];
    spans.forEach((span) => {
        String(span.text).split('\n').forEach((segment, segmentIndex) => {
            const parts = segment.split(/\s+/).filter(Boolean);
            parts.forEach((part, partIndex) => {
                words.push({
                    text: part,
                    style: span.style,
                    breakBefore: segmentIndex > 0 && partIndex === 0
                });
            });
        });
    });
    return words;
}

function lhWrapWords(ctx, words, size, maxWidth, playfulScale = 1.08) {
    ctx.font = lhFontFor('normal', size);
    const spaceWidth = ctx.measureText(' ').width;
    const lines = [];
    let currentLine = [];
    let currentWidth = 0;

    const wordWidth = (word) => {
        ctx.font = lhFontFor(word.style, size, playfulScale);
        return ctx.measureText(word.text).width;
    };

    words.forEach((word) => {
        const wWidth = wordWidth(word);
        const addedWidth = currentLine.length === 0 ? wWidth : currentWidth + spaceWidth + wWidth;
        if (currentLine.length > 0 && (word.breakBefore || addedWidth > maxWidth)) {
            lines.push({ words: currentLine, width: currentWidth });
            currentLine = [word];
            currentWidth = wWidth;
        } else {
            currentLine.push(word);
            currentWidth = addedWidth;
        }
    });
    if (currentLine.length > 0) {
        lines.push({ words: currentLine, width: currentWidth });
    }
    return { lines, spaceWidth };
}

function drawLhHeadline(ctx, spans, width, height, slideIndex, offset = { dx: 0, dy: 0 }) {
    const words = lhTokenizeWords(spans);
    if (words.length === 0) return;

    const maxWidth = width * 0.86;
    // Hook slide: playful lines noticeably bigger than the serious middle line,
    // with airier line spacing (matches the polar-bear template).
    const playfulScale = slideIndex === 0 ? 1.3 : 1.08;
    const baseSize = slideIndex === 0 ? 92 : slideIndex === 6 ? 96 : 104;
    let size = baseSize;
    let wrapped = lhWrapWords(ctx, words, size, maxWidth, playfulScale);
    const maxLines = slideIndex === 0 ? 4 : 3;
    if (wrapped.lines.length > maxLines) {
        size = Math.max(56, Math.round(size * (maxLines / wrapped.lines.length)));
        wrapped = lhWrapWords(ctx, words, size, maxWidth, playfulScale);
    }

    const lineHeight = size * (slideIndex === 0 ? 1.75 : 1.45);
    const blockHeight = wrapped.lines.length * lineHeight;
    const centerY = height * ((getLhHeadlineCenterPct(slideIndex) + offset.dy) / 100);
    const offsetXPx = (offset.dx / 100) * width;
    let lineY = centerY - blockHeight / 2 + lineHeight / 2;

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a1a';

    wrapped.lines.forEach((line) => {
        let cursorX = (width - line.width) / 2 + offsetXPx;
        line.words.forEach((word, wordIndex) => {
            ctx.font = lhFontFor(word.style, size, playfulScale);
            ctx.textAlign = 'left';
            ctx.fillText(word.text, cursorX, lineY);
            cursorX += ctx.measureText(word.text).width;
            if (wordIndex < line.words.length - 1) {
                cursorX += wrapped.spaceWidth;
            }
        });
        lineY += lineHeight;
    });
}

function drawLhCaption(ctx, caption, width, height, slideIndex, offset = { dx: 0, dy: 0 }) {
    if (!caption || slideIndex === 0) return; // hook slide has no caption
    const size = 60;
    const maxWidth = width * 0.78;
    const words = lhTokenizeWords([{ text: caption, style: 'normal' }]);
    const wrapped = lhWrapWords(ctx, words, size, maxWidth);
    const lineHeight = size * 1.35;
    const blockHeight = wrapped.lines.length * lineHeight;
    const centerY = height * ((getLhCaptionCenterPct(slideIndex) + offset.dy) / 100);
    const centerX = width / 2 + (offset.dx / 100) * width;
    let lineY = centerY - blockHeight / 2 + lineHeight / 2;

    ctx.font = lhFontFor('normal', size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a1a';

    wrapped.lines.forEach((line) => {
        ctx.fillText(line.words.map(w => w.text).join(' '), centerX, lineY);
        lineY += lineHeight;
    });
}

// ==========================================
// LH PARODY FORMAT DESIGN SYSTEM (v1)
// Universal rules: paper #FDFBF7, ink #2B2B2B, one accent per carousel,
// wobbly hand-drawn skeleton shapes, sans = machine / handwritten = human.
// ==========================================
const LH_D = {
    ink: '#2e2a26',          // warm near-black, never pure black
    pencil: '#6e6a64',
    paper: '#fbf6ec',
    softGray: '#8d857b',
    shadow: 'rgba(46,42,38,0.14)',
    penRed: '#c94f4f',
    penBlue: '#4a5fa5'
};

// TikTok covers the bottom band (caption/username) and the right rail (like/comment/share).
// Nothing that must be read may live outside this box.
const LH_SAFE = { top: 175, bottom: 1500, left: 90, right: 940 };

// ---- procedural paper: grain tile + uneven light + vignette (drawn once per slide) ----
let lhNoiseTile = null;
function lhGetNoiseTile() {
    if (lhNoiseTile) return lhNoiseTile;
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const rand = lhMulberry(20260727);
    for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
            const v = 120 + Math.floor(rand() * 135);
            const a = Math.floor(rand() * 26);
            for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
                const i = ((y + oy) * size + (x + ox)) * 4;
                img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = a;
            }
        }
    }
    g.putImageData(img, 0, 0);
    lhNoiseTile = c;
    return c;
}

function lhPaperTexture(ctx, W, H, seed = 7) {
    const rand = lhMulberry(seed);
    // uneven desk light
    [['#e8dfc8', 0.030], ['#c9cfd8', 0.022]].forEach(([col, alpha], gi) => {
        const gx = W * (0.2 + rand() * 0.6);
        const gy = H * (0.15 + rand() * 0.7);
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * (0.7 + rand() * 0.4));
        grad.addColorStop(0, col);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    });
    // grain
    ctx.save();
    ctx.globalAlpha = 0.05;
    const pattern = ctx.createPattern(lhGetNoiseTile(), 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // fibers
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#8a8177';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 44; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const a = rand() * Math.PI;
        const len = 3 + rand() * 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
    }
    ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, 'rgba(46,42,38,0)');
    vg.addColorStop(1, 'rgba(46,42,38,0.05)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
}

function lhMulberry(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function lhRoundRectPts(x, y, w, h, r) {
    const pts = [];
    const edge = (x1, y1, x2, y2) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        const n = Math.max(2, Math.round(len / 70));
        for (let i = 0; i <= n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
    };
    const arc = (cx, cy, a0, a1) => {
        for (let i = 1; i <= 3; i++) {
            const a = a0 + (a1 - a0) * i / 4;
            pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
    };
    edge(x + r, y, x + w - r, y); arc(x + w - r, y + r, -Math.PI / 2, 0);
    edge(x + w, y + r, x + w, y + h - r); arc(x + w - r, y + h - r, 0, Math.PI / 2);
    edge(x + w - r, y + h, x + r, y + h); arc(x + r, y + h - r, Math.PI / 2, Math.PI);
    edge(x, y + h - r, x, y + r); arc(x + r, y + r, Math.PI, 1.5 * Math.PI);
    return pts;
}

function lhHandPath(ctx, pts, rand, wob, close) {
    const j = pts.map(([px, py]) => [px + (rand() * 2 - 1) * wob, py + (rand() * 2 - 1) * wob]);
    ctx.beginPath();
    ctx.moveTo(j[0][0], j[0][1]);
    for (let i = 1; i < j.length; i++) {
        const [x1, y1] = j[i - 1];
        const [x2, y2] = j[i];
        ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
    }
    if (close) ctx.closePath();
}

function lhCard(ctx, x, y, w, h, r, opts = {}) {
    const { fill = '#ffffff', stroke = LH_D.ink, lw = 5, seed = 1, wob = 2.5, shadow = null, rot } = opts;
    const jr = lhMulberry(seed + 991);
    // Nothing a human places is at exactly 0°, and no two corners are the same radius.
    const angle = rot != null ? rot : (jr() * 2 - 1) * 0.010;
    const radii = [r, r, r, r].map((base) => base * (0.78 + jr() * 0.5));
    const pts = lhRoundRectPtsVaried(x, y, w, h, radii);
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    if (shadow) {
        ctx.save();
        ctx.translate(3, 9);
        lhHandPath(ctx, pts, lhMulberry(seed + 7), wob, true);
        ctx.fillStyle = shadow;
        ctx.filter = 'blur(6px)';
        ctx.fill();
        ctx.restore();
    }
    lhHandPath(ctx, pts, lhMulberry(seed), wob, true);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        // two-pass ink: a wide faint bleed under a normal-weight line
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = lw * 1.6;
        ctx.stroke();
        ctx.restore();
        ctx.lineWidth = lw * (0.9 + jr() * 0.3);
        ctx.stroke();
        // Only large drawn shapes get pen artefacts — on small icons they read as defects.
        if (w > 280 && h > 220) {
            lhInkPools(ctx, pts, stroke, lw, seed + 41);
            lhInkSkips(ctx, pts, lw, seed + 77);
        }
    }
    ctx.restore();
}

// Pen deposits extra ink where it slows to change direction.
function lhInkPools(ctx, pts, color, baseW, seed) {
    const rand = lhMulberry(seed);
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 2; i < pts.length; i++) {
        const [x0, y0] = pts[i - 2], [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
        const a1 = Math.atan2(y1 - y0, x1 - x0);
        const a2 = Math.atan2(y2 - y1, x2 - x1);
        let da = Math.abs(a2 - a1);
        if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > 0.45 && rand() > 0.35) {
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(x1, y1, baseW * (0.42 + rand() * 0.22), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// A real fineliner skips: tiny dry gaps along long runs.
function lhInkSkips(ctx, pts, baseW, seed) {
    const rand = lhMulberry(seed);
    const count = 1 + Math.floor(rand() * 2);
    ctx.save();
    ctx.strokeStyle = LH_D.paper;
    ctx.globalAlpha = 0.8;   // a thinning, not a hole
    ctx.lineCap = 'butt';
    for (let k = 0; k < count; k++) {
        const i = 1 + Math.floor(rand() * (pts.length - 2));
        const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
        const t = 0.3 + rand() * 0.4;
        const gap = 1.5 + rand() * 1.8;
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
        ctx.lineWidth = baseW * 1.5;
        ctx.beginPath();
        ctx.moveTo(px - ux * gap / 2, py - uy * gap / 2);
        ctx.lineTo(px + ux * gap / 2, py + uy * gap / 2);
        ctx.stroke();
    }
    ctx.restore();
}

// A loopy scribble in the margin, like someone coaxing a dry pen back to life.
function lhPenScribble(ctx, x, y, w, color, seed) {
    const rand = lhMulberry(seed);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
        const cx = x + (k + 0.5) * (w / 5);
        const dir = k % 2 === 0 ? -1 : 1;
        ctx.quadraticCurveTo(cx, y + dir * (24 + rand() * 18), x + (k + 1) * (w / 5), y + (rand() * 8 - 4));
    }
    ctx.stroke();
    ctx.restore();
}

function lhHashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// Handwriting is never twice the same: jitter every glyph so repeated words differ.
function lhFillTextJitter(ctx, text, x, y, align, seed, size) {
    const rand = lhMulberry(seed);
    const handFont = ctx.font;
    const px = size || parseInt((handFont.match(/(\d+)px/) || [0, 40])[1], 10);
    // The product name is the one word that must survive a squint: set it in the
    // clean sans, unjittered, so it can't be misread and mis-googled.
    const brandFont = lhSans(700, Math.round(px * 0.9));
    const segs = [];
    let last = 0;
    const re = /dbt[-\s]?mind/ig;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) segs.push({ t: text.slice(last, m.index), brand: false });
        segs.push({ t: 'DBT-Mind', brand: true });
        last = m.index + m[0].length;
    }
    if (last < text.length) segs.push({ t: text.slice(last), brand: false });

    let total = 0;
    for (const s of segs) {
        ctx.font = s.brand ? brandFont : handFont;
        total += ctx.measureText(s.t).width;
    }
    let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const baseline = ctx.textBaseline;
    for (const s of segs) {
        ctx.font = s.brand ? brandFont : handFont;
        if (s.brand) {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = baseline;
            ctx.fillText(s.t, cursor, y);
            ctx.restore();
            cursor += ctx.measureText(s.t).width;
            continue;
        }
        for (const ch of s.t) {
            const cw = ctx.measureText(ch).width;
            if (ch !== ' ') {
                ctx.save();
                ctx.translate(cursor + cw / 2, y + (rand() * 3 - 1.5));
                ctx.rotate((rand() * 4 - 2) * Math.PI / 180);
                const sc = 0.96 + rand() * 0.08;
                ctx.scale(sc, sc);
                ctx.textAlign = 'center';
                ctx.textBaseline = baseline;
                ctx.fillText(ch, 0, 0);
                ctx.restore();
            }
            cursor += cw;
        }
    }
    ctx.font = handFont;
}

function lhRoundRectPtsVaried(x, y, w, h, radii) {
    const [r0, r1, r2, r3] = radii;
    const pts = [];
    const edge = (x1, y1, x2, y2) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        const n = Math.max(2, Math.round(len / 70));
        for (let i = 0; i <= n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
    };
    const arc = (cx, cy, rr, a0, a1) => {
        for (let i = 1; i <= 3; i++) {
            const a = a0 + (a1 - a0) * i / 4;
            pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
        }
    };
    edge(x + r0, y, x + w - r1, y); arc(x + w - r1, y + r1, r1, -Math.PI / 2, 0);
    edge(x + w, y + r1, x + w, y + h - r2); arc(x + w - r2, y + h - r2, r2, 0, Math.PI / 2);
    edge(x + w - r2, y + h, x + r3, y + h); arc(x + r3, y + h - r3, r3, Math.PI / 2, Math.PI);
    edge(x, y + h - r3, x, y + r0); arc(x + r0, y + r0, r0, Math.PI, 1.5 * Math.PI);
    return pts;
}

// Washi tape — the overlap workhorse. Straddles a card corner so elements touch.
function lhTape(ctx, x, y, len, color, angleDeg, seed = 300) {
    const rand = lhMulberry(seed);
    const h = 26 + rand() * 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    // torn notches at both ends
    ctx.moveTo(-len / 2, -h / 2);
    ctx.lineTo(len / 2, -h / 2 + (rand() * 4 - 2));
    ctx.lineTo(len / 2 - 6, 0);
    ctx.lineTo(len / 2, h / 2 + (rand() * 4 - 2));
    ctx.lineTo(-len / 2, h / 2);
    ctx.lineTo(-len / 2 + 6, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * (len / 6), -h / 2);
        ctx.lineTo(i * (len / 6), h / 2);
        ctx.stroke();
    }
    ctx.restore();
}

// Highlighter swipe behind text
function lhHighlight(ctx, x, y, w, h, color, seed = 400) {
    const rand = lhMulberry(seed);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.32;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rand() * 2 - 1) * 0.025);
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 8, -h / 2 + rand() * 4);
    ctx.lineTo(w / 2 + 8, -h / 2 - rand() * 4);
    ctx.lineTo(w / 2 + 2, h / 2 + rand() * 3);
    ctx.lineTo(-w / 2 - 2, h / 2 - rand() * 3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function lhStarPath(ctx, cx, cy, R) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? R : R * 0.45;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

// Hand-stamped stars: each tilts, drifts and varies in size, and the row sags slightly.
function lhStarRow(ctx, x, y, filled, size, color, align = 'center', count = 5, seed = 55) {
    const rand = lhMulberry(seed);
    const gap = size * 2.35;
    const x0 = align === 'center' ? x - (count - 1) * gap / 2 : x + size;
    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0;
        const sag = Math.sin(t * Math.PI) * 3;
        const s = size * (0.94 + rand() * 0.14);
        const cx = x0 + i * gap + (rand() * 6 - 3);
        const cy = y + sag + (rand() * 8 - 4);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rand() * 16 - 8) * Math.PI / 180);
        if (i < filled) {
            // marker fill: two passes, second offset, so overlaps darken like layered ink
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.55;
            lhStarPath(ctx, 0, 0, s); ctx.fill();
            ctx.translate(1.5, -1);
            lhStarPath(ctx, 0, 0, s * 0.99); ctx.fill();
            ctx.translate(-1.5, 1);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.fillStyle = '#ece5da';
            lhStarPath(ctx, 0, 0, s); ctx.fill();
        }
        lhStarPath(ctx, 0, 0, s);
        ctx.strokeStyle = LH_D.ink;
        ctx.lineWidth = Math.max(3, s * 0.1) * (0.85 + rand() * 0.35);
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
    }
}

function lhStamp(ctx, cx, cy, r, lines, color, angle, seed = 3) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.88;
    for (const rr of [r, r * 0.84]) {
        const pts = [];
        for (let i = 0; i <= 44; i++) {
            const a = i / 44 * 2 * Math.PI;
            pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
        }
        lhHandPath(ctx, pts, lhMulberry(seed + rr), 3, true);
        ctx.strokeStyle = color;
        ctx.lineWidth = rr === r ? 8 : 4;
        ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((ln, i) => {
        ctx.font = `700 ${ln.size}px "Quicksand", sans-serif`;
        ctx.fillText(ln.text, 0, (i - (lines.length - 1) / 2) * (ln.size * 1.2));
    });
    ctx.globalAlpha = 1;
    ctx.restore();
}

function lhBlob(ctx, cx, cy, r, color, seed) {
    const rand = lhMulberry(seed);
    const pts = [];
    for (let i = 0; i < 14; i++) {
        const a = i / 14 * 2 * Math.PI;
        const rr = r * (0.82 + rand() * 0.36);
        pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    lhHandPath(ctx, pts, lhMulberry(seed + 1), 4, true);
    ctx.fillStyle = color;
    ctx.fill();
}

function lhCheckbox(ctx, x, y, s, checked, seed) {
    lhCard(ctx, x, y, s, s, 9, { fill: '#ffffff', lw: 4, seed });
    if (checked) {
        ctx.strokeStyle = '#4a9b6e';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.2, y + s * 0.55);
        ctx.lineTo(x + s * 0.42, y + s * 0.8);
        ctx.lineTo(x + s * 0.88, y + s * 0.08);
        ctx.stroke();
    }
}

function lhAnnotCircle(ctx, cx, cy, rx, ry, color, seed) {
    const rand = lhMulberry(seed || 11);
    const pts = [];
    for (let i = 0; i <= 30; i++) {
        const a = i / 30 * 2 * Math.PI;
        pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    lhHandPath(ctx, pts, rand, 4, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function lhScribbleOut(ctx, x, y, w, h, color, seed) {
    const rand = lhMulberry(seed || 17);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        ctx.moveTo(x + rand() * w * 0.15, y + rand() * h);
        for (let i = 1; i <= 5; i++) {
            ctx.lineTo(x + (i / 5) * w * (0.85 + rand() * 0.15), y + rand() * h);
        }
        ctx.stroke();
    }
}

function lhFace(ctx, cx, cy, r, seed = 5) {
    ctx.fillStyle = LH_D.ink;
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = Math.max(3, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.15, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
}

function lhWrapPlain(ctx, text, font, maxWidth) {
    ctx.font = font;
    const lines = [];
    // Explicit newlines are hard breaks (paragraphs); wrapping only happens within a paragraph.
    for (const seg of String(text || '').split('\n')) {
        const words = seg.split(/\s+/).filter(Boolean);
        if (!words.length) { lines.push(''); continue; }
        let cur = '';
        for (const w of words) {
            const t = cur ? cur + ' ' + w : w;
            if (ctx.measureText(t).width > maxWidth && cur) { lines.push(cur); cur = w; }
            else cur = t;
        }
        if (cur) lines.push(cur);
    }
    while (lines.length && lines[0] === '') lines.shift();
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
}

function lhText(ctx, text, x, y, font, opts = {}) {
    const { color = LH_D.ink, align = 'center', maxWidth = 900, lineHeight = 1.35, baseline = 'alphabetic' } = opts;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    const size = parseInt((font.match(/(\d+)px/) || [0, 40])[1], 10);
    const lines = lhWrapPlain(ctx, text, font, maxWidth);
    const hand = /Gloria/.test(font);
    lines.forEach((ln, i) => {
        const ly = y + i * size * lineHeight;
        if (hand) lhFillTextJitter(ctx, ln, x, ly, align, lhHashStr(ln) + i, size);
        else ctx.fillText(ln, x, ly);
    });
    return lines.length * size * lineHeight;
}

const lhSans = (w, s) => `${w} ${s}px "Quicksand", sans-serif`;
const lhHand = (s) => `400 ${s}px "Gloria Hallelujah", cursive`;

// Draw text shrunk to fit a fixed band. AI copy length varies, so any slot that
// receives model output must be able to give ground instead of overflowing.
function lhTextFitted(ctx, text, x, topY, maxWidth, maxHeight, mkFont, maxSize, minSize, opts = {}) {
    const { lineHeight = 1.45, align = 'center', color = LH_D.ink, vCenter = true } = opts;
    let size = maxSize;
    let lines = lhWrapPlain(ctx, text, mkFont(size), maxWidth);
    while (size > minSize && lines.length * size * lineHeight > maxHeight) {
        size -= 2;
        lines = lhWrapPlain(ctx, text, mkFont(size), maxWidth);
    }
    const blockH = lines.length * size * lineHeight;
    const startY = vCenter ? topY + Math.max(0, (maxHeight - blockH) / 2) + size * 0.9 : topY + size * 0.9;
    const fontStr = mkFont(size);
    ctx.font = fontStr;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    const hand = /Gloria/.test(fontStr);
    lines.forEach((ln, i) => {
        const ly = startY + i * size * lineHeight;
        if (hand) lhFillTextJitter(ctx, ln, x, ly, align, lhHashStr(ln) + i, size);
        else ctx.fillText(ln, x, ly);
    });
    return blockH;
}

// ---- Vector mascot: ONE recurring actor, drawn with primitives (no image generation).
// Design-system rule 4: the mascot must interact with the UI, never just decorate.
function lhPaw(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = Math.max(2.5, r * 0.32);
    ctx.stroke();
}

function lhLimb(ctx, x1, y1, cx, cy, x2, y2, lw) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.stroke();
}

// The mascot is a physical die-cut sticker: white scissor-cut border + a shadow that
// implies it is stuck onto the page. Highest-impact craft signal since he's on every slide.
function lhMascot(ctx, x, y, s, pose = 'wave', opts = {}) {
    if (opts.sticker === false) {
        lhMascotDraw(ctx, x, y, s, pose, opts);
        return;
    }
    const size = Math.ceil(3 * s);
    const art = document.createElement('canvas');
    art.width = size; art.height = size;
    lhMascotDraw(art.getContext('2d'), size / 2, size / 2, s, pose, opts);

    const sil = document.createElement('canvas');
    sil.width = size; sil.height = size;
    const sctx = sil.getContext('2d');
    sctx.drawImage(art, 0, 0);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, size, size);

    const rand = lhMulberry((opts.seed || 1) + 777);
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    // shadow: the sticker sits a millimetre above the paper
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.filter = 'blur(5px)';
    ctx.drawImage(sil, 4, 7);
    ctx.restore();
    // dilate the silhouette unevenly — scissors are not a vector offset
    const base = Math.max(4, s * 0.05);
    for (let k = 0; k < 22; k++) {
        const a = (k / 22) * Math.PI * 2;
        const r = base * (0.7 + rand() * 0.7);
        ctx.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.drawImage(art, 0, 0);
    ctx.restore();
}

function lhMascotDraw(ctx, x, y, s, pose = 'wave', opts = {}) {
    const { fill = '#f7e3cd', seed = 91, flip = false, accent = '#e79a92' } = opts;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    const lw = Math.max(3, s * 0.05);

    // ears
    [-0.33, 0.33].forEach((ox, ei) => {
        const er = s * 0.19;
        const pts = [];
        for (let k = 0; k <= 18; k++) {
            const a = k / 18 * Math.PI * 2;
            pts.push([ox * s + er * Math.cos(a), -s * 0.46 + er * Math.sin(a)]);
        }
        lhHandPath(ctx, pts, lhMulberry(seed + 11 + ei), s * 0.012, true);
        ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = lw; ctx.stroke();
    });

    // body
    const bp = [];
    for (let k = 0; k <= 26; k++) {
        const a = k / 26 * Math.PI * 2;
        const rr = s * (0.5 + 0.028 * Math.sin(a * 3));
        bp.push([rr * Math.cos(a), rr * Math.sin(a) * 1.1]);
    }
    lhHandPath(ctx, bp, lhMulberry(seed + 1), s * 0.014, true);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = lw; ctx.stroke();

    // arms + props
    const armLw = lw * 1.15;
    if (pose === 'wave') {
        lhLimb(ctx, -s * 0.4, s * 0.02, -s * 0.62, s * 0.2, -s * 0.56, s * 0.34, armLw);
        lhPaw(ctx, -s * 0.56, s * 0.36, s * 0.1, fill);
        lhLimb(ctx, s * 0.4, s * 0.02, s * 0.7, -s * 0.2, s * 0.66, -s * 0.42, armLw);
        lhPaw(ctx, s * 0.66, -s * 0.46, s * 0.11, fill);
    } else if (pose === 'grip') {
        lhLimb(ctx, -s * 0.38, s * 0.05, -s * 0.6, s * 0.3, -s * 0.44, s * 0.5, armLw);
        lhPaw(ctx, -s * 0.44, s * 0.52, s * 0.11, fill);
        lhLimb(ctx, s * 0.38, s * 0.05, s * 0.6, s * 0.3, s * 0.44, s * 0.5, armLw);
        lhPaw(ctx, s * 0.44, s * 0.52, s * 0.11, fill);
    } else if (pose === 'shrug') {
        lhLimb(ctx, -s * 0.4, s * 0.05, -s * 0.72, -s * 0.12, -s * 0.64, -s * 0.36, armLw);
        lhPaw(ctx, -s * 0.64, -s * 0.4, s * 0.1, fill);
        lhLimb(ctx, s * 0.4, s * 0.05, s * 0.72, -s * 0.12, s * 0.64, -s * 0.36, armLw);
        lhPaw(ctx, s * 0.64, -s * 0.4, s * 0.1, fill);
    } else if (pose === 'sip' || pose === 'pen') {
        lhLimb(ctx, -s * 0.38, s * 0.05, -s * 0.58, s * 0.28, -s * 0.5, s * 0.44, armLw);
        lhPaw(ctx, -s * 0.5, s * 0.46, s * 0.1, fill);
        lhLimb(ctx, s * 0.38, s * 0.06, s * 0.64, s * 0.16, s * 0.6, s * 0.3, armLw);
        lhPaw(ctx, s * 0.62, s * 0.32, s * 0.11, fill);
        if (pose === 'sip') {
            lhCard(ctx, s * 0.54, s * 0.2, s * 0.32, s * 0.3, s * 0.06, { fill: '#ffffff', seed: seed + 5, lw: lw * 0.8, wob: 1.2 });
            ctx.beginPath();
            ctx.arc(s * 0.9, s * 0.35, s * 0.09, -Math.PI / 2, Math.PI / 2);
            ctx.strokeStyle = LH_D.ink; ctx.lineWidth = lw * 0.8; ctx.stroke();
        } else {
            ctx.save();
            ctx.translate(s * 0.62, s * 0.32);
            ctx.rotate(-0.7);
            lhCard(ctx, -s * 0.03, -s * 0.42, s * 0.07, s * 0.5, s * 0.03, { fill: accent, seed: seed + 6, lw: lw * 0.7, wob: 0.8 });
            ctx.restore();
        }
    }

    // face
    const eyeY = -s * 0.12;
    if (pose === 'sleep') {
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = lw * 0.85; ctx.lineCap = 'round';
        [-1, 1].forEach((sgn) => {
            ctx.beginPath();
            ctx.arc(sgn * s * 0.19, eyeY, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
        });
        ctx.fillStyle = LH_D.softGray;
        ctx.font = lhSans(700, s * 0.2);
        ctx.textAlign = 'left';
        ctx.fillText('z', s * 0.5, -s * 0.4);
        ctx.font = lhSans(700, s * 0.14);
        ctx.fillText('z', s * 0.68, -s * 0.55);
    } else {
        ctx.fillStyle = LH_D.ink;
        [-1, 1].forEach((sgn) => {
            ctx.beginPath();
            ctx.ellipse(sgn * s * 0.19, eyeY, s * 0.055, s * 0.065, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    // blush
    ctx.fillStyle = 'rgba(231,154,146,0.45)';
    [-1, 1].forEach((sgn) => {
        ctx.beginPath();
        ctx.ellipse(sgn * s * 0.33, s * 0.02, s * 0.08, s * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    // mouth
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = lw * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (pose === 'stare') {
        ctx.moveTo(-s * 0.1, s * 0.08);
        ctx.lineTo(s * 0.1, s * 0.08);
    } else {
        ctx.arc(0, s * 0.02, s * 0.13, 0.18 * Math.PI, 0.82 * Math.PI);
    }
    ctx.stroke();
    ctx.restore();
}

// Jittery cloud character (plays "Anxiety" in the dating format)
function lhCloudChar(ctx, x, y, s, seed = 200) {
    ctx.save();
    ctx.translate(x, y);
    const pts = [];
    for (let k = 0; k <= 22; k++) {
        const a = k / 22 * Math.PI * 2;
        const rr = s * (0.46 + 0.1 * Math.sin(a * 4) + 0.05 * Math.cos(a * 7));
        pts.push([rr * Math.cos(a) * 1.15, rr * Math.sin(a) * 0.82]);
    }
    lhHandPath(ctx, pts, lhMulberry(seed), s * 0.02, true);
    ctx.fillStyle = '#e3ecfb'; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = Math.max(3, s * 0.05); ctx.stroke();
    // big anxious eyes
    [-1, 1].forEach((sgn) => {
        ctx.beginPath();
        ctx.arc(sgn * s * 0.2, -s * 0.04, s * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = Math.max(2.5, s * 0.035); ctx.stroke();
        ctx.beginPath();
        ctx.arc(sgn * s * 0.2, -s * 0.01, s * 0.065, 0, Math.PI * 2);
        ctx.fillStyle = LH_D.ink; ctx.fill();
    });
    // wobbly worried mouth
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = Math.max(2.5, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.22);
    ctx.quadraticCurveTo(-s * 0.04, s * 0.15, 0, s * 0.22);
    ctx.quadraticCurveTo(s * 0.04, s * 0.29, s * 0.12, s * 0.22);
    ctx.stroke();
    // jitter lines
    ctx.lineWidth = Math.max(2, s * 0.028);
    [-1, 1].forEach((sgn) => {
        for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(sgn * (s * 0.62 + k * s * 0.09), -s * 0.2 + k * s * 0.16);
            ctx.lineTo(sgn * (s * 0.72 + k * s * 0.09), -s * 0.2 + k * s * 0.16);
            ctx.stroke();
        }
    });
    ctx.restore();
}

function lhPawCursor(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.3);
    lhPaw(ctx, 0, 0, s * 0.42, '#f7e3cd');
    for (let k = 0; k < 3; k++) {
        lhPaw(ctx, (k - 1) * s * 0.32, -s * 0.5, s * 0.15, '#f7e3cd');
    }
    ctx.restore();
}

function lhPill(ctx, x, y, text, opts = {}) {
    const { size = 38, padX = 34, h = 78, fill = '#ffffff', stroke = LH_D.ink, seed = 300, color = LH_D.ink } = opts;
    ctx.font = lhSans(600, size);
    const w = ctx.measureText(text).width + padX * 2;
    lhCard(ctx, x, y, w, h, h / 2, { fill, stroke, seed, lw: 4, wob: 1.6 });
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, y + h / 2);
    return w;
}

function lhConfetti(ctx, cx, cy, spread, colors, seed, n = 30) {
    const rand = lhMulberry(seed);
    for (let k = 0; k < n; k++) {
        const a = rand() * Math.PI * 2;
        const r = spread * (0.35 + rand() * 0.65);
        ctx.save();
        ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
        ctx.rotate(rand() * Math.PI);
        ctx.fillStyle = colors[k % colors.length];
        ctx.fillRect(-9, -4, 18, 8);
        ctx.restore();
    }
}

function lhBurst(ctx, cx, cy, r, color, n = 16) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
    }
}

function lhHeartPath(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.45);
    ctx.bezierCurveTo(cx - s, cy - s * 0.2, cx - s * 0.5, cy - s * 0.9, cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.9, cx + s, cy - s * 0.2, cx, cy + s * 0.45);
    ctx.closePath();
}

function lhRouteAt(pts, t) {
    const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
    const lt = t * (pts.length - 1) - seg;
    const [x1, y1] = pts[seg];
    const [x2, y2] = pts[seg + 1];
    return { x: x1 + (x2 - x1) * lt, y: y1 + (y2 - y1) * lt, angle: Math.atan2(y2 - y1, x2 - x1) };
}

function lhCarIcon(ctx, x, y, s, color, backwards = false) {
    ctx.save();
    ctx.translate(x, y);
    if (backwards) ctx.scale(-1, 1);
    lhCard(ctx, -s * 0.6, -s * 0.34, s * 1.2, s * 0.6, s * 0.2, { fill: color, seed: 410, lw: 4, wob: 1.4 });
    lhCard(ctx, -s * 0.3, -s * 0.62, s * 0.72, s * 0.36, s * 0.14, { fill: '#ffffff', seed: 411, lw: 4, wob: 1.2 });
    [-0.32, 0.36].forEach((ox, wi) => {
        ctx.beginPath();
        ctx.arc(ox * s, s * 0.28, s * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = LH_D.ink; ctx.fill();
    });
    ctx.restore();
}

function lhMapPin(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.5);
    ctx.bezierCurveTo(-s * 0.75, -s * 0.28, -s * 0.5, -s, 0, -s);
    ctx.bezierCurveTo(s * 0.5, -s, s * 0.75, -s * 0.28, 0, s * 0.5);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -s * 0.4, s * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = LH_D.paper; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
}

function lhThumbsUp(ctx, x, y, s, color = '#e8a860') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.12);
    lhCard(ctx, -s * 0.55, -s * 0.05, s * 0.42, s * 0.75, s * 0.12, { fill: color, seed: 601, lw: 3.5, wob: 1 });
    const pts = lhRoundRectPts(-s * 0.1, -s * 0.28, s * 0.72, s * 0.98, s * 0.2);
    lhHandPath(ctx, pts, lhMulberry(602), 1.4, true);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 3.5; ctx.stroke();
    // thumb
    lhCard(ctx, -s * 0.06, -s * 0.62, s * 0.3, s * 0.42, s * 0.14, { fill: color, seed: 603, lw: 3.5, wob: 1 });
    ctx.restore();
}

function lhRing(ctx, cx, cy, r, pct, color, lw = 46) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ece5da';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.min(pct, 1) * Math.PI * 2);
    ctx.stroke();
    if (pct > 1) {
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, r + lw * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.min(pct - 1, 1) * Math.PI * 2);
        ctx.stroke();
        // overflow drips
        [[-0.35, 1], [0.15, 1.3], [0.55, 0.8]].forEach(([ox, len], di) => {
            const dx = cx + ox * r;
            const dy = cy + Math.sqrt(Math.max(0, r * r - (ox * r) * (ox * r))) + lw * 0.4;
            ctx.strokeStyle = color;
            ctx.lineWidth = lw * 0.42;
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx, dy + 90 * len);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(dx, dy + 90 * len + 14, lw * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
        });
    }
    ctx.fillStyle = LH_D.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = lhSans(700, r * 0.62);
    ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy);
}

function lhDoodleIcon(ctx, x, y, s, kind) {
    ctx.save();
    ctx.translate(x, y);
    const lw = Math.max(3, s * 0.09);
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = lw;
    if (kind === 'phone') {
        lhCard(ctx, -s * 0.32, -s * 0.5, s * 0.64, s, s * 0.16, { fill: '#dfe7f2', seed: 610, lw, wob: 1 });
        ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.38); ctx.lineTo(s * 0.12, -s * 0.38); ctx.stroke();
    } else if (kind === 'moon') {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.46, 0.42 * Math.PI, 1.62 * Math.PI);
        ctx.arc(s * 0.18, 0, s * 0.42, 1.5 * Math.PI, 0.5 * Math.PI, true);
        ctx.closePath();
        ctx.fillStyle = '#f5e6b8'; ctx.fill(); ctx.stroke();
    } else if (kind === 'cloud') {
        lhBlob(ctx, 0, 0, s * 0.48, '#dfe7f2', 611);
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = lw * 0.8;
        [-1, 1].forEach(sg => { ctx.beginPath(); ctx.arc(sg * s * 0.14, -s * 0.04, s * 0.05, 0, Math.PI * 2); ctx.fillStyle = LH_D.ink; ctx.fill(); });
        ctx.beginPath(); ctx.arc(0, s * 0.14, s * 0.1, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    } else if (kind === 'heart') {
        lhHeartPath(ctx, 0, 0, s * 0.5);
        ctx.fillStyle = '#efa0a8'; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
}

function lhArrowTo(ctx, x1, y1, x2, y2, color, seed = 620) {
    const rand = lhMulberry(seed);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const mx = (x1 + x2) / 2 + (rand() * 60 - 30);
    const my = (y1 + y2) / 2 - 60;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
    const a = Math.atan2(y2 - my, x2 - mx);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 30 * Math.cos(a - 0.45), y2 - 30 * Math.sin(a - 0.45));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 30 * Math.cos(a + 0.45), y2 - 30 * Math.sin(a + 0.45));
    ctx.stroke();
}

function lhViewfinder(ctx, W, H, tilt = 0, seed = 630) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(tilt);
    ctx.translate(-W / 2, -H / 2);
    const m = 70, len = 190;
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    const corners = [
        [m, m, 1, 1], [W - m, m, -1, 1],
        [m, H - m, 1, -1], [W - m, H - m, -1, -1]
    ];
    corners.forEach(([cx, cy, sx, sy], ci) => {
        const rand = lhMulberry(seed + ci);
        ctx.beginPath();
        ctx.moveTo(cx + sx * len + (rand() * 8 - 4), cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * len + (rand() * 8 - 4));
        ctx.stroke();
    });
    ctx.restore();
}

function lhLadybug(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fillStyle = '#d6584f'; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = Math.max(2.5, s * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s * 0.72, s * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = LH_D.ink; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s); ctx.stroke();
    ctx.fillStyle = LH_D.ink;
    [[-0.45, 0.1], [0.45, 0.15], [-0.3, 0.6], [0.32, 0.58]].forEach(([ox, oy]) => {
        ctx.beginPath(); ctx.arc(ox * s, oy * s, s * 0.17, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
}

function lhBinoculars(ctx, x, y, s, seed = 640) {
    ctx.save();
    ctx.translate(x, y);
    [-1, 1].forEach((sg, bi) => {
        lhCard(ctx, sg * s * 0.62 - s * 0.42, -s * 0.5, s * 0.84, s * 1.15, s * 0.36, { fill: '#cbd8e8', seed: seed + bi, lw: 7 });
        ctx.beginPath();
        ctx.arc(sg * s * 0.62, -s * 0.2, s * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#eef4fb'; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 6; ctx.stroke();
        // eye peeking in the lens
        ctx.beginPath(); ctx.arc(sg * s * 0.62, -s * 0.18, s * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = LH_D.ink; ctx.fill();
    });
    lhCard(ctx, -s * 0.25, -s * 0.2, s * 0.5, s * 0.3, s * 0.1, { fill: '#cbd8e8', seed: seed + 5, lw: 6 });
    ctx.restore();
}

function lhNoSign(ctx, cx, cy, r, color = '#d6584f') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.7);
    ctx.stroke();
}

function lhDotted(ctx, pts, color = LH_D.ink, lw = 5) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.setLineDash([3, 16]);
    ctx.beginPath();
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
    ctx.setLineDash([]);
}

function lhNumBadge(ctx, x, y, r, n, color) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = LH_D.ink;
    ctx.font = lhSans(700, r * 1.1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), x, y + 2);
}

function lhBlobPerson(ctx, x, y, s, opts = {}) {
    const { seed = 650, missingArm = false, taped = false, wobble = 0 } = opts;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wobble);
    const lw = Math.max(4, s * 0.055);
    // body
    const bp = [];
    for (let k = 0; k <= 24; k++) {
        const a = k / 24 * Math.PI * 2;
        bp.push([s * 0.42 * Math.cos(a), s * 0.56 * Math.sin(a) + s * 0.3]);
    }
    lhHandPath(ctx, bp, lhMulberry(seed), s * 0.012, true);
    ctx.fillStyle = '#f2e7d8'; ctx.fill();
    ctx.strokeStyle = LH_D.ink; ctx.lineWidth = lw; ctx.stroke();
    // head
    ctx.beginPath(); ctx.arc(0, -s * 0.52, s * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#f2e7d8'; ctx.fill(); ctx.stroke();
    // limbs
    ctx.lineCap = 'round';
    ctx.lineWidth = lw * 1.5;
    if (!missingArm) { ctx.beginPath(); ctx.moveTo(-s * 0.36, s * 0.16); ctx.lineTo(-s * 0.72, s * 0.44); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(s * 0.36, s * 0.16); ctx.lineTo(s * 0.72, s * 0.44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.84); ctx.lineTo(-s * 0.28, s * 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.84); ctx.lineTo(s * 0.28, s * 1.2); ctx.stroke();
    if (taped) {
        [[-s * 0.1, s * 0.1, -0.5], [s * 0.15, s * 0.5, 0.4]].forEach(([tx, ty, ta], ti) => {
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(ta);
            ctx.globalAlpha = 0.75;
            lhCard(ctx, -s * 0.3, -s * 0.07, s * 0.6, s * 0.14, s * 0.02, { fill: '#f7e9b8', seed: seed + 20 + ti, lw: 3, wob: 1 });
            ctx.restore();
        });
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}

function lhAllenKey(ctx, x, y, s, angle = 0.3) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#9aa3ad';
    ctx.lineWidth = s * 0.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.35);
    ctx.lineTo(-s * 0.5, s * 0.35);
    ctx.lineTo(s * 0.45, s * 0.35);
    ctx.stroke();
    ctx.strokeStyle = LH_D.ink;
    ctx.lineWidth = s * 0.05;
    ctx.stroke();
    ctx.restore();
}

function lhAppIconTile(ctx, x, y, s, kind, opts = {}) {
    const { glow = false, fill = '#e8dcc8', seed = 660 } = opts;
    ctx.save();
    if (glow) {
        ctx.shadowColor = 'rgba(120,190,160,0.95)';
        ctx.shadowBlur = 55;
    }
    lhCard(ctx, x, y, s, s, s * 0.24, { fill, seed, lw: 5, wob: 1.6 });
    ctx.restore();
    const cx = x + s / 2, cy = y + s / 2;
    if (kind === 'brain') {
        lhBlob(ctx, cx, cy - s * 0.06, s * 0.28, '#f0b8c0', seed + 1);
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy + s * 0.22, s * 0.2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy + s * 0.22); ctx.lineTo(cx + s * 0.2, cy + s * 0.22);
        ctx.moveTo(cx, cy + s * 0.02); ctx.lineTo(cx, cy + s * 0.42); ctx.stroke();
    } else if (kind === 'heart') {
        lhHeartPath(ctx, cx, cy, s * 0.32);
        ctx.fillStyle = '#7fbf9a'; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();
    } else {
        lhBlob(ctx, cx, cy, s * 0.3, '#cbd8e8', seed + 2);
    }
}

// Per-slide composition rhythm: leans, drifts, scale and a punch-in beat, so a
// 7-slide carousel never reads as one template repeated. Deterministic per index.
function lhRhythm(i) {
    const rand = lhMulberry(4200 + i * 37);
    const side = i % 2 === 0 ? 1 : -1;          // alternate lean, never twice the same way
    const punch = (i === 2 || i === 5);          // the "punch-in" beats
    const calm = i === 4;                        // the app slide: calmest layout of the seven
    const scale = calm ? 1.0 : punch ? 1.1 : 0.92 + rand() * 0.08;
    return {
        scale,
        starScale: punch ? 1.45 : 1,
        rot: calm ? (rand() * 0.006 - 0.003) : side * (0.012 + rand() * 0.014),
        cardDx: calm ? side * 8 : side * (28 + rand() * 26),
        cardDy: punch ? -30 : Math.round(rand() * 40 - 20),
        titleDx: calm ? 0 : -side * (20 + rand() * 28),
        tapeX: 0.08 + rand() * 0.55,
        tapeLen: Math.round(rand() * 70),
        tapeAngle: (rand() * 50 - 25),                 // full ±25°, not always the same lean
        tapePlace: ['top', 'left', 'bottom', 'top'][i % 4]
    };
}

// Place tape on whichever edge this slide's rhythm chose, always straddling the edge.
function lhTapeOnCard(ctx, cx, cy, cw, chh, r, color, seed) {
    const len = 150 + r.tapeLen;
    if (r.tapePlace === 'left') {
        lhTape(ctx, cx + 4, cy + chh * (0.2 + (r.tapeX % 0.4)), len, color, 74 + r.tapeAngle * 0.4, seed);
    } else if (r.tapePlace === 'bottom') {
        lhTape(ctx, cx + cw - 110, cy + chh - 4, len, color, r.tapeAngle - 12, seed);
    } else {
        lhTape(ctx, cx + r.tapeX * cw, cy + 6, len, color, r.tapeAngle, seed);
    }
}

// ---- Format renderers ----
const LH_FORMAT_RENDERERS = {
    yelp(ctx, d, i, W, H) {
        const accent = d.accent || '#f08a7e';
        if (d.role === 'hook') {
            // The hook gets the same off-axis treatment as the content slides:
            // title leans left, subtitle is tucked under it at a different angle
            // like an afterthought, and the star row is the loudest element.
            ctx.save();
            ctx.translate(W / 2, 620);
            ctx.rotate(-0.017);
            ctx.translate(-W / 2, -620);
            lhTextFitted(ctx, d.title, W / 2 - 34, 300, 930, 500, lhHand, 122, 66, { lineHeight: 1.4 });
            ctx.restore();

            ctx.save();
            ctx.translate(W / 2, 880);
            ctx.rotate(0.035);
            ctx.translate(-W / 2, -880);
            lhText(ctx, d.sub, W / 2 + 40, 890, lhSans(600, 48), { maxWidth: 880, color: LH_D.softGray });
            ctx.restore();

            lhStarRow(ctx, W / 2 + 14, 1105, 5, 86, accent, 'center', 5, 15);
            lhMascot(ctx, 140, 1420, 320, 'pen', { seed: 15 });
            return;
        }
        // Per-slide rhythm: cards lean and drift so no two slides share a layout,
        // and the title sits on a different axis than the card it belongs to.
        const r = lhRhythm(i);
        lhTextFitted(ctx, d.name, W / 2 + r.titleDx, 250, 880, 170, (sz) => lhSans(700, sz), 74, 44, { lineHeight: 1.22 });
        const cw = Math.round(880 * r.scale);
        const chh = Math.round(940 * r.scale);
        const cx = Math.round((W - cw) / 2 + r.cardDx);
        const cy = Math.round(470 + r.cardDy);
        // The app slide must be pixel-identical in skeleton to every other slide.
        // A coloured outline here would frame the ad. Only the in-world stamp marks it.
        lhCard(ctx, cx, cy, cw, chh, 44, {
            seed: 20 + i, shadow: LH_D.shadow, lw: 6, stroke: LH_D.ink, rot: r.rot
        });
        lhTapeOnCard(ctx, cx, cy, cw, chh, r, accent, 21 + i);
        const pad = Math.round(70 * r.scale);
        // avatar = the critic mascot (same actor in every review)
        ctx.save();
        ctx.beginPath(); ctx.arc(cx + pad + 60, cy + 130, 66, 0, Math.PI * 2);
        ctx.fillStyle = '#fdf2e6'; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();
        ctx.clip();
        lhMascot(ctx, cx + pad + 60, cy + 150, 105, d.avatarPose || 'stare', { seed: 18, sticker: false });
        ctx.restore();
        lhText(ctx, d.reviewer, cx + pad + 160, cy + 120, lhSans(700, 40), { align: 'left', maxWidth: cw - pad - 220 });
        lhText(ctx, d.reviewerSub || 'local guide · 999 reviews', cx + pad + 160, cy + 175, lhSans(500, 32), { align: 'left', color: LH_D.softGray });
        lhStarRow(ctx, cx + pad + 20, cy + 300, d.stars, 44 * r.starScale, accent, 'left', 5, 40 + i);
        lhTextFitted(ctx, d.text, cx + pad + 20, cy + 370, cw - pad * 2 - 40, chh - 500, lhHand, 54, 32, { align: 'left', lineHeight: 1.55, vCenter: false });
        lhThumbsUp(ctx, cx + pad + 42, cy + chh - 78, 46);
        lhText(ctx, `helpful (${d.helpful})`, cx + pad + 90, cy + chh - 60, lhSans(600, 38), { align: 'left', color: LH_D.softGray });
        if (d.isApp) {
            // straddles the top-right corner: physical stamp, and it covers no text
            // Stamps name things in real life — so the stamp carries the brand too.
            // Second exposure, fully in-format, in the most legible type on the slide.
            lhStamp(ctx, cx + cw - 96, cy + 74, 90, [
                { text: 'STAFF PICK', size: 21 },
                { text: 'DBT-MIND', size: 26 }
            ], accent, 0.26, 31);
        }
        if (d.signature) {
            lhText(ctx, d.signature, W / 2 + r.titleDx, Math.min(1470, cy + chh + 110), lhHand(42), { color: LH_D.softGray });
        }
    },

    wrapped(ctx, d, i, W, H) {
        const accent = d.accent || '#cdb7f0';
        if (d.role === 'hook') {
            lhBlob(ctx, W * 0.38, H * 0.42, 430, '#e6d9f7', 41);
            lhBlob(ctx, W * 0.66, H * 0.56, 380, '#fbdfd0', 42);
            ctx.save();
            ctx.translate(W / 2, 0); ctx.rotate(-0.04);
            lhTextFitted(ctx, d.title, 0, 420, 950, 500, lhHand, 150, 62, { lineHeight: 1.3 });
            ctx.restore();
            lhText(ctx, d.sub, W / 2, 1050, lhSans(700, 54), { maxWidth: 940 });
            lhMascot(ctx, W / 2 - 40, 1320, 240, 'wave', { seed: 44 });
            return;
        }
        if (d.role === 'share') {
            lhCard(ctx, W / 2 - 370, 620, 740, 640, 48, { seed: 55, shadow: LH_D.shadow, lw: 6 });
            lhText(ctx, d.title, W / 2, 800, lhSans(700, 62), { maxWidth: 620 });
            // "yes" pill scribbled out
            lhCard(ctx, W / 2 - 280, 900, 240, 100, 50, { seed: 56, lw: 5 });
            lhText(ctx, 'share', W / 2 - 160, 965, lhSans(600, 42), {});
            lhScribbleOut(ctx, W / 2 - 290, 905, 260, 90, '#d96a5e', 57);
            // "absolutely not" pill circled
            lhCard(ctx, W / 2 + 30, 900, 280, 100, 50, { seed: 58, lw: 5 });
            lhText(ctx, 'absolutely not', W / 2 + 170, 963, lhSans(600, 36), {});
            lhAnnotCircle(ctx, W / 2 + 170, 950, 190, 85, '#d96a5e', 59);
            lhText(ctx, d.signature, W / 2, 1400, lhHand(44), { color: LH_D.softGray });
            return;
        }
        // stat slide
        lhBlob(ctx, W / 2, 880, 430, accent, 60 + i);
        if (d.label) lhText(ctx, d.label, W / 2, 520, lhSans(700, 48), { color: LH_D.softGray });
        ctx.save();
        ctx.translate(W / 2, 920); ctx.rotate(-0.06);
        let bigSize = 220;
        ctx.font = lhSans(700, bigSize);
        while (ctx.measureText(d.big).width > 860 && bigSize > 90) {
            bigSize -= 10;
            ctx.font = lhSans(700, bigSize);
        }
        ctx.fillStyle = LH_D.ink;
        ctx.textAlign = 'center';
        ctx.fillText(d.big, 0, 0);
        ctx.restore();
        // Keep the caption above the mascot's lower-right sticker zone. Wrapped captions
        // vary in length, so the old band could grow down into the mascot and hide its
        // final lines on longer model responses.
        lhTextFitted(ctx, d.caption, W / 2, 980, 780, 260, lhHand, 56, 34, { lineHeight: 1.5 });
        if (d.mascot !== false) lhMascot(ctx, 790, 1380, 170, d.pose || 'shrug', { seed: 66 + i });
    },

    complaint(ctx, d, i, W, H) {
        const stampRed = '#d96a5e';
        const resolvedGreen = '#4a9b6e';
        // clipboard paper (persistent skeleton)
        lhCard(ctx, 90, 300, 900, 1220, 36, { seed: 70, shadow: LH_D.shadow, lw: 6 });
        // clip
        lhCard(ctx, W / 2 - 130, 240, 260, 110, 34, { fill: '#f5d67b', seed: 71, lw: 6 });
        ctx.fillStyle = LH_D.paper;
        ctx.beginPath(); ctx.arc(W / 2, 295, 26, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();

        if (d.role === 'hook') {
            lhStamp(ctx, W / 2, 700, 250, [{ text: 'FORMAL', size: 64 }, { text: 'COMPLAINT', size: 64 }], stampRed, -0.14, 72);
            lhText(ctx, 'filed by: your phone', W / 2, 1120, lhSans(600, 52), {});
            lhText(ctx, 'against: you', W / 2, 1200, lhSans(600, 52), {});
            lhText(ctx, d.sub, W / 2, 1330, lhHand(44), { color: LH_D.softGray, maxWidth: 700 });
            return;
        }
        if (d.role === 'outro') {
            lhStamp(ctx, W / 2, 740, 250, [{ text: 'RESOLVED', size: 58 }, { text: '(ish)', size: 44 }], resolvedGreen, 0.12, 73);
            lhText(ctx, d.text, W / 2, 1130, lhHand(54), { maxWidth: 700, lineHeight: 1.6 });
            lhText(ctx, d.signature, W / 2, 1430, lhSans(500, 38), { color: LH_D.softGray });
            return;
        }
        // item slide
        lhText(ctx, d.num, 170, 450, lhSans(700, 42), { align: 'left', color: LH_D.softGray });
        lhTextFitted(ctx, d.text, 170, 540, 740, 640, lhHand, 56, 34, { align: 'left', lineHeight: 1.6, vCenter: false });
        // dotted separator
        ctx.strokeStyle = LH_D.softGray;
        ctx.lineWidth = 4;
        ctx.setLineDash([2, 18]);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(170, 1280); ctx.lineTo(910, 1280); ctx.stroke();
        ctx.setLineDash([]);
        // checkbox row
        const options = d.options || ['noted', 'denied', "it's complicated"];
        const checkedIdx = d.checkedIndex ?? 0;
        options.forEach((label, oi) => {
            const bx = 170 + oi * 260;
            lhCheckbox(ctx, bx, 1350, 54, oi === checkedIdx, 74 + oi + i * 3);
            lhText(ctx, label, bx + 74, 1392, lhSans(600, 34), { align: 'left' });
        });
        if (d.withdrawn) {
            lhStamp(ctx, 790, 1100, 130, [{ text: 'WITHDRAWN', size: 32 }], resolvedGreen, 0.2, 79);
        }
        if (d.mascot !== false) lhMascot(ctx, 820, 1400, 140, d.pose || 'grip', { seed: 80 + i, flip: true });
    },

    // Terms & Conditions — scroll bar descends per slide (fake motion), red pen annotations
    tc(ctx, d, i, W, H) {
        const accent = d.accent || '#8fb6a0';
        const red = '#d96a5e';
        // Paper height follows the content so a short clause doesn't float on a huge page.
        let paperH = 1450;
        if (d.role === 'clause') {
            const lines = lhWrapPlain(ctx, d.text, lhHand(56), 700).length;
            paperH = 420 + lines * 92 + (d.fine ? 170 : 60);
        }
        const paperTop = d.role === 'clause' ? 420 : 250;
        lhCard(ctx, 80, paperTop, 900, paperH, 34, { seed: 110, shadow: LH_D.shadow, lw: 6 });
        // scroll track + thumb (position = d.progress 0..1)
        const trackTop = paperTop + 70;
        const trackH = paperH - 140;
        lhCard(ctx, 942, trackTop, 24, trackH, 12, { fill: '#ece5da', stroke: null, seed: 111, wob: 1 });
        const thumbH = Math.max(120, trackH * 0.19);
        lhCard(ctx, 938, trackTop + (trackH - thumbH) * (d.progress ?? 0), 32, thumbH, 16, { fill: accent, seed: 112, wob: 1.2, lw: 3 });

        if (d.role === 'hook') {
            lhText(ctx, 'TERMS &', 530, 470, lhSans(700, 78), {});
            lhText(ctx, 'CONDITIONS', 530, 570, lhSans(700, 78), {});
            lhText(ctx, d.sub, 530, 700, lhHand(46), { maxWidth: 720, lineHeight: 1.5, color: LH_D.softGray });
            ctx.strokeStyle = '#ded5c8'; ctx.lineWidth = 9; ctx.lineCap = 'round';
            for (let k = 0; k < 11; k++) {
                const yy = 830 + k * 48;
                ctx.beginPath(); ctx.moveTo(150, yy); ctx.lineTo(150 + (k % 3 === 2 ? 400 : 690), yy); ctx.stroke();
            }
            lhCard(ctx, 310, 1440, 440, 128, 64, { fill: '#e8e1d6', seed: 113, lw: 5 });
            lhText(ctx, 'I AGREE', 530, 1523, lhSans(700, 50), { color: '#a79e91' });
            lhMascot(ctx, 800, 1300, 150, 'pen', { seed: 114, flip: true });
            return;
        }
        if (d.role === 'outro') {
            lhConfetti(ctx, 530, 860, 400, [accent, '#f2c9a0', '#e8a0a8', '#c9b6e8'], 118);
            lhCard(ctx, 310, 800, 440, 128, 64, { fill: accent, seed: 115, lw: 6 });
            lhText(ctx, 'I AGREE', 530, 883, lhSans(700, 50), { color: '#ffffff' });
            lhText(ctx, d.text, 530, 1080, lhHand(54), { maxWidth: 700, lineHeight: 1.6 });
            lhMascot(ctx, 500, 1330, 190, 'wave', { seed: 119 });
            lhText(ctx, d.signature, 530, 1460, lhSans(500, 36), { color: LH_D.softGray });
            return;
        }
        lhText(ctx, d.num, 150, paperTop + 130, lhSans(700, 44), { align: 'left', color: LH_D.softGray });
        const clauseTop = paperTop + 260;
        const clauseH = lhTextFitted(ctx, d.text, 150, clauseTop - 46, 700, 560, lhHand, 56, 36, { align: 'left', lineHeight: 1.65, vCenter: false });
        if (d.annotateLine != null) {
            // circle the Nth rendered line of the clause
            lhAnnotCircle(ctx, 500, clauseTop + d.annotateLine * 92 - 14, 330, 62, red, 120 + i);
        }
        if (d.fine) lhText(ctx, d.fine, 150, clauseTop + clauseH + 70, lhSans(500, 34), { align: 'left', maxWidth: 700, color: LH_D.softGray });
        lhMascot(ctx, 810, Math.min(1400, paperTop + paperH + 110), 150, d.pose || 'pen', { seed: 121 + i, flip: true });
    },

    // Dating profile card — sections reveal per slide, tilted swipe card, ✕/♥ buttons
    dating(ctx, d, i, W, H) {
        const accent = d.accent || '#ef8f9c';
        if (d.role === 'match') {
            lhBurst(ctx, W / 2, 780, 430, '#f4c9a0');
            lhText(ctx, "IT'S A MATCH", W / 2, 380, lhSans(700, 82), {});
            ctx.save();
            ctx.translate(W / 2 - 190, 780);
            ctx.beginPath(); ctx.arc(0, 0, 165, 0, Math.PI * 2);
            ctx.fillStyle = '#fdf2e6'; ctx.fill();
            ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 6; ctx.stroke();
            ctx.restore();
            lhMascot(ctx, W / 2 - 190, 790, 210, 'wave', { seed: 140 });
            ctx.save();
            ctx.translate(W / 2 + 190, 780);
            ctx.beginPath(); ctx.arc(0, 0, 165, 0, Math.PI * 2);
            ctx.fillStyle = '#eaf1fd'; ctx.fill();
            ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 6; ctx.stroke();
            ctx.restore();
            lhCloudChar(ctx, W / 2 + 190, 780, 200, 141);
            lhText(ctx, d.text, W / 2, 1120, lhHand(50), { maxWidth: 800, lineHeight: 1.55 });
            lhCard(ctx, W / 2 - 330, 1260, 300, 110, 55, { seed: 142, lw: 5 });
            lhText(ctx, 'keep swiping', W / 2 - 180, 1330, lhSans(600, 36), {});
            lhScribbleOut(ctx, W / 2 - 340, 1265, 320, 100, '#d96a5e', 143);
            lhCard(ctx, W / 2 + 30, 1260, 320, 110, 55, { fill: accent, seed: 144, lw: 5 });
            lhText(ctx, 'third option', W / 2 + 190, 1330, lhSans(600, 38), { color: '#ffffff' });
            lhText(ctx, d.signature, W / 2, 1450, lhHand(42), { color: LH_D.softGray });
            return;
        }

        ctx.save();
        ctx.translate(W / 2, 900); ctx.rotate(-0.04); ctx.translate(-W / 2, -900);
        lhCard(ctx, 85, 250, 890, 1110, 48, { seed: 150, shadow: LH_D.shadow, lw: 6 });
        lhCard(ctx, 130, 350, 820, 560, 38, { fill: '#eaf1fd', seed: 151, lw: 5 });
        lhCloudChar(ctx, 540, 630, 330, 152 + i);
        lhText(ctx, d.name || 'Anxiety, 24/7', 170, 1010, lhSans(700, 62), { align: 'left' });
        lhText(ctx, d.meta || '0 ft away · always has been', 170, 1070, lhSans(500, 36), { align: 'left', color: LH_D.softGray });
        if (d.section) {
            lhText(ctx, d.section, 170, 1170, lhSans(700, 34), { align: 'left', color: accent });
        }
        if (d.pills) {
            let px = 170;
            let py = 1210;
            d.pills.forEach((p, pi) => {
                ctx.font = lhSans(600, 34);
                const w = ctx.measureText(p).width + 60;
                if (px + w > 950) { px = 170; py += 96; }
                lhPill(ctx, px, py, p, { size: 34, padX: 30, h: 74, seed: 160 + pi + i * 5, fill: pi === d.appPill ? accent : '#ffffff', color: pi === d.appPill ? '#ffffff' : LH_D.ink });
                px += w + 18;
            });
        } else if (d.body) {
            lhTextFitted(ctx, d.body, 170, 1210, 700, 260, lhHand, 50, 32, { align: 'left', lineHeight: 1.55, vCenter: false });
        }
        ctx.restore();

        // action buttons (outside the tilt)
        ctx.save();
        ctx.translate(W / 2 - 175, 1440);
        ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = '#8d857b'; ctx.lineWidth = 11; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(30, 30); ctx.moveTo(30, -30); ctx.lineTo(-30, 30); ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(W / 2 + 155, 1440);
        ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 6; ctx.stroke();
        lhHeartPath(ctx, 0, 6, 52);
        ctx.fillStyle = accent; ctx.fill();
        ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();
        ctx.restore();
        if (d.pawOn === 'like') lhPawCursor(ctx, W / 2 + 225, 1520, 80);
        if (d.pawOn === 'nope') lhPawCursor(ctx, W / 2 - 105, 1520, 80);
    },

    // Delivery tracking — car advances along the route each slide, tracker fills
    delivery(ctx, d, i, W, H) {
        const accent = d.accent || '#f0b752';
        // map
        ctx.fillStyle = '#e9f2e4';
        ctx.fillRect(0, 150, W, 880);
        ctx.strokeStyle = '#d5e3cd'; ctx.lineWidth = 26; ctx.lineCap = 'round';
        [[40, 420, 1040, 350], [120, 700, 980, 780], [300, 170, 360, 1020], [760, 170, 700, 1020]].forEach(([x1, y1, x2, y2]) => {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        });
        const trees = [[150, 300], [520, 260], [880, 480], [220, 900], [640, 940], [960, 820], [430, 560]];
        trees.forEach(([tx, ty], ti) => {
            lhBlob(ctx, tx, ty, 34, '#b9d3ae', 500 + ti);
        });
        const route = [[120, 960], [300, 880], [420, 700], [640, 620], [700, 430], [880, 330]];
        ctx.strokeStyle = LH_D.ink;
        ctx.lineWidth = 7;
        ctx.setLineDash([4, 22]);
        ctx.beginPath();
        route.forEach(([rx, ry], ri) => ri === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry));
        ctx.stroke();
        ctx.setLineDash([]);
        lhMapPin(ctx, 880, 300, 86, d.delivered ? '#4a9b6e' : accent);
        lhText(ctx, d.destLabel || 'you', 880, 250, lhSans(700, 34), { color: LH_D.ink });
        const pos = lhRouteAt(route, Math.max(0, Math.min(1, d.progress ?? 0)));
        if (!d.delivered) {
            lhCarIcon(ctx, pos.x, pos.y, 92, accent, !!d.backwards);
            lhMascot(ctx, pos.x + 6, pos.y - 58, 62, 'stare', { seed: 520 + i, sticker: false });
        } else {
            lhCard(ctx, 800, 330, 150, 130, 22, { fill: '#dfe7f2', seed: 521, lw: 5 });
            lhBlob(ctx, 875, 372, 52, '#c3cede', 522);
            lhText(ctx, 'left at door', 875, 500, lhSans(600, 32), { color: LH_D.softGray });
        }

        // status card — kept fully above TikTok's caption band
        lhCard(ctx, 55, 1020, 900, 500, 46, { seed: 530, shadow: LH_D.shadow, lw: 6 });
        lhTape(ctx, 120, 1030, 150, accent, -18, 531);
        lhText(ctx, d.orderLine || 'ORDER #047', 105, 1105, lhSans(600, 34), { align: 'left', maxWidth: 640, color: LH_D.softGray });
        lhTextFitted(ctx, d.title, 105, 1130, d.delayed ? 600 : 800, 96, (sz) => lhSans(700, sz), 52, 32, { align: 'left', lineHeight: 1.2 });
        // 4-step tracker
        const steps = ['confirmed', 'preparing', 'picked up', 'arriving'];
        const filled = d.step ?? 0;
        const sx = 120;
        const gap = 232;
        for (let k = 0; k < 4; k++) {
            const cx = sx + k * gap;
            if (k < 3) {
                ctx.strokeStyle = k < filled ? accent : '#e4ddd2';
                ctx.lineWidth = 12;
                ctx.beginPath(); ctx.moveTo(cx + 32, 1275); ctx.lineTo(cx + gap - 32, 1275); ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(cx, 1275, 28, 0, Math.PI * 2);
            ctx.fillStyle = k <= filled ? accent : '#ffffff';
            ctx.fill();
            ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();
            lhText(ctx, steps[k], cx, 1345, lhSans(600, 26), { color: k <= filled ? LH_D.ink : LH_D.softGray });
        }
        lhTextFitted(ctx, d.status, 505, 1370, 800, 130, lhHand, 42, 26, { lineHeight: 1.35 });
        if (d.delayed) lhStamp(ctx, 840, 1150, 98, [{ text: 'DELAYED', size: 24 }], LH_D.penRed, -0.18, 540);
        if (d.signature) lhText(ctx, d.signature, 505, 1470, lhSans(500, 32), { color: LH_D.softGray });
    },

    // App Store listing — header shrinks to a mini-bar (scroll illusion), app slide is a rival listing that glows
    appstore(ctx, d, i, W, H) {
        const accent = d.accent || '#8fbfa4';
        if (d.role === 'hook') {
            lhAppIconTile(ctx, 90, 300, 300, 'brain', { seed: 700 });
            lhText(ctx, 'Overthinking™', 430, 400, lhSans(700, 66), { align: 'left', maxWidth: 560 });
            lhText(ctx, 'developer: your brain', 430, 470, lhSans(500, 38), { align: 'left', color: LH_D.softGray });
            lhStarRow(ctx, 430, 560, 5, 32, '#e8a860', 'left');
            lhText(ctx, '4.8 · 8 billion ratings', 620, 575, lhSans(500, 34), { align: 'left', color: LH_D.softGray });
            lhCard(ctx, 90, 700, 340, 120, 60, { fill: '#ded5c8', seed: 701, lw: 5 });
            lhText(ctx, 'GET', 260, 778, lhSans(700, 54), { color: '#8d857b' });
            lhText(ctx, d.sub, 540, 960, lhHand(52), { maxWidth: 860, lineHeight: 1.55 });
            lhMascot(ctx, 480, 1300, 260, 'shrug', { seed: 702 });
            return;
        }
        // mini header (sells the scroll)
        lhAppIconTile(ctx, 90, 240, 110, d.miniIcon || 'brain', { seed: 705 });
        lhText(ctx, d.miniName || 'Overthinking™', 230, 305, lhSans(700, 40), { align: 'left', maxWidth: 520 });
        lhText(ctx, d.miniDev || 'your brain', 230, 350, lhSans(500, 30), { align: 'left', color: LH_D.softGray });

        if (d.role === 'rival') {
            lhText(ctx, 'CUSTOMERS ALSO DOWNLOADED', 540, 520, lhSans(700, 38), { color: LH_D.softGray });
            lhAppIconTile(ctx, 90, 600, 260, 'heart', { glow: true, fill: '#e4f2e8', seed: 706 });
            lhText(ctx, 'DBT-Mind', 400, 690, lhSans(700, 62), { align: 'left', maxWidth: 580 });
            lhText(ctx, 'holds the chaos · free', 400, 755, lhSans(500, 38), { align: 'left', color: LH_D.softGray });
            ctx.save();
            ctx.shadowColor = 'rgba(120,190,160,0.9)';
            ctx.shadowBlur = 40;
            lhCard(ctx, 400, 800, 300, 110, 55, { fill: accent, seed: 707, lw: 5 });
            ctx.restore();
            lhText(ctx, 'GET', 550, 872, lhSans(700, 50), { color: '#ffffff' });
            lhCard(ctx, 80, 1010, 920, 480, 40, { seed: 708, shadow: LH_D.shadow, lw: 6 });
            lhStarRow(ctx, 150, 1110, 5, 38, '#e8a860', 'left');
            lhTextFitted(ctx, d.text, 140, 1170, 800, 290, lhHand, 50, 30, { align: 'left', lineHeight: 1.5, vCenter: false });
            lhMascot(ctx, 800, 1400, 180, 'sip', { seed: 709, flip: true });
            return;
        }
        if (d.role === 'outro') {
            lhText(ctx, 'YOU MIGHT ALSO LIKE', 540, 560, lhSans(700, 44), { color: LH_D.softGray });
            lhAppIconTile(ctx, 130, 660, 280, 'blob', { seed: 710 });
            lhText(ctx, 'Spiraling', 270, 1010, lhSans(600, 40), {});
            lhScribbleOut(ctx, 130, 670, 280, 270, '#d96a5e', 711);
            lhAppIconTile(ctx, 660, 660, 280, 'heart', { fill: '#e4f2e8', seed: 712 });
            lhText(ctx, 'DBT-Mind', 800, 1010, lhSans(600, 40), {});
            lhAnnotCircle(ctx, 800, 800, 190, 190, '#d96a5e', 713);
            lhText(ctx, d.text, 540, 1200, lhHand(52), { maxWidth: 820, lineHeight: 1.55 });
            lhMascot(ctx, 500, 1360, 230, 'wave', { seed: 714 });
            return;
        }
        // feature card / review card
        lhCard(ctx, 80, 480, 900, d.role === 'feature' ? 560 : 620, 42, { seed: 720 + i, shadow: LH_D.shadow, lw: 6 });
        lhTape(ctx, 155, 486, 150, accent, -16, 721 + i);
        if (d.role === 'feature') {
            lhText(ctx, d.label || "WHAT'S NEW", 140, 590, lhSans(700, 40), { align: 'left', color: accent });
            lhText(ctx, d.version || 'version 3am.0', 140, 660, lhSans(500, 36), { align: 'left', maxWidth: 820, color: LH_D.softGray });
            lhTextFitted(ctx, d.text, 140, 720, 800, 280, lhHand, 54, 34, { align: 'left', lineHeight: 1.55, vCenter: false });
        } else {
            ctx.save();
            ctx.beginPath(); ctx.arc(200, 600, 62, 0, Math.PI * 2);
            ctx.fillStyle = '#fdf2e6'; ctx.fill();
            ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 5; ctx.stroke();
            ctx.clip();
            lhMascot(ctx, 200, 620, 100, d.avatarPose || 'stare', { seed: 730, sticker: false });
            ctx.restore();
            lhText(ctx, d.reviewer || 'anonymous_2am', 290, 590, lhSans(700, 38), { align: 'left', maxWidth: 650 });
            lhStarRow(ctx, 290, 645, d.stars ?? 5, 30, '#e8a860', 'left');
            lhTextFitted(ctx, d.text, 140, 730, 800, 330, lhHand, 54, 34, { align: 'left', lineHeight: 1.55, vCenter: false });
        }
        lhMascot(ctx, 800, 1270, 180, d.pose || 'shrug', { seed: 740 + i, flip: true });
    },

    // Screen Time report — bars + overflowing ring, accountant mascot escalates
    screentime(ctx, d, i, W, H) {
        const accent = d.accent || '#8fa8d8';
        if (d.role === 'hook') {
            lhText(ctx, 'WEEKLY REPORT', W / 2, 380, lhSans(700, 64), {});
            lhText(ctx, d.sub, W / 2, 470, lhHand(52), { color: LH_D.softGray });
            lhRing(ctx, W / 2, 880, 250, d.pct ?? 1.34, accent, 52);
            lhMascot(ctx, W / 2 - 30, 1300, 220, 'stare', { seed: 800 });
            lhTextFitted(ctx, d.note || 'your phone did the math. it is not happy', W / 2, 1620, 820, 180, lhHand, 44, 30, { color: LH_D.softGray, lineHeight: 1.4 });
            return;
        }
        if (d.role === 'outro') {
            lhRing(ctx, W / 2, 780, 210, d.pct ?? 0.02, '#7fbf9a', 46);
            lhText(ctx, d.text, W / 2, 1120, lhHand(54), { maxWidth: 800, lineHeight: 1.6 });
            lhMascot(ctx, W / 2 - 50, 1330, 230, 'wave', { seed: 801 });
            lhText(ctx, d.signature, W / 2, 1460, lhSans(500, 36), { color: LH_D.softGray });
            return;
        }
        lhTextFitted(ctx, d.day, W / 2, 330, 900, 110, (sz) => lhSans(700, sz), 58, 36, { lineHeight: 1.2 });
        const bars = d.bars || [];
        const baseY = 1240;
        const bw = 150;
        const gap = 62;
        const total = bars.length;
        const startX = W / 2 - (total * bw + (total - 1) * gap) / 2;
        const maxVal = Math.max(...bars.map(b => b.v), 1);
        // Bars top out at y=680 so the callout band (470–650) always stays clear.
        const BAR_MIN_H = 120;
        const BAR_MAX_EXTRA = 440;
        bars.forEach((b, bi) => {
            const h = BAR_MIN_H + (b.v / maxVal) * BAR_MAX_EXTRA;
            const x = startX + bi * (bw + gap);
            const isApp = bi === d.appBar;
            lhCard(ctx, x, baseY - h, bw, h, 34, {
                fill: isApp ? '#e4f2e8' : (b.color || accent),
                seed: 810 + bi + i * 7,
                lw: isApp ? 7 : 5,
                stroke: isApp ? '#e0a92f' : LH_D.ink
            });
            if (isApp) lhStarRow(ctx, x + bw / 2, baseY - h - 52, 1, 30, '#e0a92f', 'center', 1);
            lhDoodleIcon(ctx, x + bw / 2, baseY + 78, 84, b.icon || 'phone');
            lhText(ctx, b.label, x + bw / 2, baseY + 190, lhSans(600, 30), { maxWidth: bw + gap, color: LH_D.softGray });
        });
        // callout: points at the app bar when there is one, else the tallest bar.
        // Text lives in a fixed band under the day title so it never collides with it.
        if (bars.length) {
            const targetIdx = d.appBar != null
                ? d.appBar
                : bars.reduce((acc, b, bi) => (b.v > bars[acc].v ? bi : acc), 0);
            const tx = startX + targetIdx * (bw + gap) + bw / 2;
            const th = BAR_MIN_H + (bars[targetIdx].v / maxVal) * BAR_MAX_EXTRA;
            // Callout sits directly above its bar so the arrow drops straight down
            // and never crosses a neighbouring bar.
            const calloutX = Math.max(250, Math.min(W - 250, tx));
            lhTextFitted(ctx, d.callout, calloutX, 460, 460, 170, lhHand, 46, 30, { lineHeight: 1.4 });
            lhArrowTo(ctx, calloutX, 655, tx, baseY - th - 60, LH_D.ink, 830 + i);
        }
        lhMascot(ctx, 810, 1400, 170, d.pose || 'stare', { seed: 840 + i, flip: true });
    },

    // Nature documentary — viewfinder brackets + REC ladybug; mascot IS the subject
    naturedoc(ctx, d, i, W, H) {
        const accent = d.accent || '#c2b07f';
        lhViewfinder(ctx, W, H, d.role === 'outro' ? 0.035 : 0, 630 + i);
        lhLadybug(ctx, W - 150, 150, 26);
        lhText(ctx, 'REC', W - 250, 165, lhSans(700, 38), { color: '#d6584f' });

        if (d.role === 'hook') {
            lhTextFitted(ctx, d.title, W / 2, 380, 860, 500, lhHand, 116, 56, { lineHeight: 1.38 });
            lhText(ctx, d.sub, W / 2, 980, lhSans(600, 50), { maxWidth: 860, color: LH_D.softGray });
            lhBinoculars(ctx, W / 2 - 40, 1380, 230, 645);
            return;
        }
        if (d.role === 'outro') {
            lhText(ctx, d.text, W / 2, 620, lhHand(66), { maxWidth: 820, lineHeight: 1.5 });
            lhMascot(ctx, W / 2 - 30, 1080, 380, 'wave', { seed: 660 });
            lhText(ctx, d.signature, W / 2, 1450, lhSans(500, 38), { color: LH_D.softGray });
            return;
        }
        lhTextFitted(ctx, d.exhibit, W / 2, 300, 860, 110, (sz) => lhSans(700, sz), 44, 30, { color: LH_D.softGray, lineHeight: 1.25 });
        lhTextFitted(ctx, d.text, W / 2, 520, 820, 330, lhHand, 60, 38, { lineHeight: 1.55 });
        // habitat band
        lhBlob(ctx, W / 2 - 30, 1220, 380, '#eef1e4', 670 + i);
        lhMascot(ctx, W / 2 - 30, 1200, 290, d.pose || 'sleep', { seed: 675 + i });
        if (d.subjectLabel) {
            lhArrowTo(ctx, 250, 1000, W / 2 - 150, 1200, LH_D.ink, 680 + i);
            lhText(ctx, d.subjectLabel, 230, 960, lhSans(700, 36), { maxWidth: 340, color: LH_D.ink });
        }
    },

    // Flat-pack assembly manual — numbered diagram steps, missing parts, Allen key
    ikea(ctx, d, i, W, H) {
        const accent = d.accent || '#7fa8c9';
        const paperBlue = '#e8f0f7';
        const paperYellow = '#f5e6b8';
        const paperGreen = '#d6eadf';

        const manualHeader = (section, detail) => {
            ctx.fillStyle = '#f1e9de';
            ctx.fillRect(0, 120, W, 176);
            ctx.fillStyle = LH_D.ink;
            ctx.fillRect(74, 154, 260, 76);
            lhText(ctx, 'ASSEMBLY MANUAL', 204, 205, lhSans(700, 30), { color: '#ffffff' });
            ctx.fillStyle = paperYellow;
            ctx.fillRect(74, 244, 260, 13);
            lhText(ctx, section, 1002, 190, lhSans(700, 34), { align: 'right', color: LH_D.ink });
            lhText(ctx, detail, 1002, 242, lhSans(500, 28), { align: 'right', color: LH_D.softGray });
            ctx.strokeStyle = '#d5cabd';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(74, 296); ctx.lineTo(1006, 296); ctx.stroke();
        };

        const progress = (active) => {
            const y = 345;
            ctx.strokeStyle = '#d6cec3';
            ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(160, y); ctx.lineTo(920, y); ctx.stroke();
            for (let k = 0; k < 5; k++) {
                const x = 160 + k * 190;
                ctx.fillStyle = k <= active ? accent : '#ffffff';
                ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = LH_D.ink; ctx.lineWidth = 4; ctx.stroke();
                lhText(ctx, `0${k + 1}`, x, y + 62, lhSans(700, 24), { color: k <= active ? LH_D.ink : LH_D.softGray });
            }
        };

        const instructionNote = (x, y, w, h, label, text, fill, seed) => {
            lhCard(ctx, x, y, w, h, 24, { fill, stroke: '#cfc4b8', seed, lw: 4, shadow: 'rgba(46,42,38,0.08)' });
            ctx.fillStyle = LH_D.ink;
            ctx.fillRect(x, y, 14, h);
            lhText(ctx, label, x + 42, y + 54, lhSans(700, 28), { align: 'left', color: LH_D.softGray });
            lhTextFitted(ctx, text, x + 42, y + 76, w - 76, h - 92, lhHand, 42, 28, { align: 'left', lineHeight: 1.35, vCenter: false });
        };

        if (d.role === 'hook') {
            manualHeader('COVER / 00', 'BPD SERIES · FLAT-PACK EDITION');
            lhCard(ctx, 72, 370, 936, 430, 34, { fill: paperBlue, stroke: '#789bb8', seed: 894, lw: 6, shadow: LH_D.shadow });
            lhText(ctx, 'MODEL: FUNCTIONAL HUMAN-ish', 112, 430, lhSans(700, 28), { align: 'left', color: '#557895' });
            lhTextFitted(ctx, d.title || 'IKEA instructions but for overthinking', W / 2, 470, 820, 230, (sz) => lhSans(700, sz), 82, 44, { lineHeight: 1.18 });
            lhText(ctx, d.sub, W / 2, 748, lhHand(42), { color: LH_D.softGray, maxWidth: 800 });

            lhCard(ctx, 72, 860, 936, 620, 34, { fill: '#fffdf8', stroke: '#d4c9bb', seed: 895, lw: 5 });
            lhText(ctx, 'CONTENTS OF THIS BOX', 118, 930, lhSans(700, 30), { align: 'left', color: LH_D.softGray });
            lhPill(ctx, 118, 982, 'one (1) person', { size: 30, h: 70, fill: '#ffffff', seed: 896 });
            lhPill(ctx, 118, 1075, 'several missing parts', { size: 30, h: 70, fill: paperYellow, seed: 897 });
            lhPill(ctx, 118, 1168, 'zero clear instructions', { size: 30, h: 70, fill: '#f2e7d8', seed: 898 });
            lhBlobPerson(ctx, 620, 1190, 280, { missingArm: true, seed: 900 });
            lhDotted(ctx, [[500, 1150], [395, 1210]]);
            lhCard(ctx, 250, 1190, 210, 64, 18, { fill: '#f2e7d8', seed: 901, lw: 4 });
            lhText(ctx, 'arm (1×)', 355, 1232, lhSans(600, 30), {});
            lhAllenKey(ctx, 825, 1350, 120, 0.4);
            lhText(ctx, 'tool included. emotional support not included.', W / 2, 1570, lhSans(500, 28), { color: LH_D.softGray });
            lhMascot(ctx, 875, 1660, 145, 'shrug', { seed: 902 });
            return;
        }
        if (d.role === 'exploded') {
            manualHeader('PARTS / 06', 'CHECK BEFORE STARTING');
            lhText(ctx, 'PARTS LIST', 110, 410, lhSans(700, 64), { align: 'left' });
            lhText(ctx, 'somehow all of these are required', 110, 468, lhHand(38), { align: 'left', color: LH_D.softGray });
            lhCard(ctx, 70, 520, 940, 1030, 34, { fill: '#fffdf8', stroke: '#d4c9bb', seed: 910, lw: 5, shadow: LH_D.shadow });
            lhBlobPerson(ctx, W / 2, 1020, 270, { seed: 911 });
            const parts = d.parts || [];
            const positions = [
                [120, 590], [760, 590], [100, 820], [790, 820],
                [100, 1060], [790, 1060], [150, 1300], [740, 1300]
            ];
            parts.forEach((p, pi) => {
                const [px, py] = positions[pi] || positions[positions.length - 1];
                const targetX = px < W / 2 ? W / 2 - 150 : W / 2 + 150;
                lhDotted(ctx, [[targetX, 1000], [px + (px < W / 2 ? 180 : 0), py + 54]], '#a79e91', 4);
                lhCard(ctx, px, py, 230, 138, 22, { fill: pi === 4 ? paperGreen : '#ffffff', seed: 912 + pi, lw: 4 });
                lhNumBadge(ctx, px + 36, py + 38, 27, pi + 1, accent);
                lhTextFitted(ctx, p, px + 76, py + 18, 140, 94, (sz) => lhSans(600, sz), 26, 20, { align: 'left', lineHeight: 1.15, vCenter: true });
            });
            lhText(ctx, d.text, W / 2, 1640, lhHand(46), { maxWidth: 850, lineHeight: 1.5 });
            lhText(ctx, 'if a part is left over, call it character development.', W / 2, 1780, lhSans(500, 28), { color: LH_D.softGray });
            return;
        }
        if (d.role === 'outro') {
            manualHeader('FINAL CHECK / 07', 'CONGRATULATIONS, PROBABLY');
            lhStamp(ctx, W / 2, 520, 205, [{ text: 'ASSEMBLY', size: 52 }, { text: 'COMPLETE', size: 58 }], '#4a9b6e', -0.08, 920);
            lhCard(ctx, 70, 700, 940, 720, 34, { fill: '#fffdf8', stroke: '#d4c9bb', seed: 921, lw: 5, shadow: LH_D.shadow });
            lhBlobPerson(ctx, W / 2, 940, 310, { taped: true, wobble: 0.06, seed: 922 });
            lhCard(ctx, 120, 1270, 840, 100, 20, { fill: paperGreen, stroke: '#9bb9a4', seed: 923, lw: 4 });
            lhCheckbox(ctx, 155, 1292, 54, true, 924);
            lhText(ctx, 'all parts attached with questionable confidence', 240, 1340, lhSans(500, 30), { align: 'left' });
            instructionNote(100, 1510, 670, 190, 'FINAL NOTE', d.text, paperYellow, 925);
            lhMascot(ctx, 865, 1570, 145, 'wave', { seed: 926 });
            lhText(ctx, d.signature, W / 2, 1780, lhSans(500, 34), { color: LH_D.softGray });
            return;
        }
        // step slide
        const stepNumber = d.stepNum ?? (i + 1);
        manualHeader(`STEP 0${stepNumber} / 05`, d.notIncluded ? 'PART NOT INCLUDED' : 'INSTALL WITH CARE');
        progress(stepNumber - 1);
        lhCard(ctx, 70, 400, 940, 690, 34, { fill: paperBlue, stroke: '#789bb8', seed: 930 + i, lw: 5, shadow: LH_D.shadow });
        lhText(ctx, 'FOLLOW THE DIAGRAM', 112, 470, lhSans(700, 28), { align: 'left', color: '#557895' });
        lhNumBadge(ctx, 150, 610, 42, stepNumber, accent);
        lhBlobPerson(ctx, W / 2 - 80, 810, 280, { missingArm: !!d.missingArm, seed: 931 + i });
        if (d.partLabel) {
            const px = 820;
            const py = 615;
            lhDotted(ctx, [[W / 2 + 40, 760], [px - 120, py + 35]]);
            lhCard(ctx, 690, 525, 270, 390, 28, { fill: '#fffdf8', stroke: '#cfc4b8', seed: 940 + i, lw: 4 });
            lhText(ctx, d.notIncluded ? 'NOT IN BOX' : 'PART REQUIRED', px, 590, lhSans(700, 24), { color: d.notIncluded ? '#c95c55' : '#557895' });
            lhBlob(ctx, px, py + 105, 82, d.notIncluded ? '#ece5da' : '#cfe3d4', 941 + i);
            if (d.notIncluded) lhNoSign(ctx, px, py + 105, 92);
            lhTextFitted(ctx, d.partLabel, px, py + 210, 220, 110, (sz) => lhSans(600, sz), 34, 24, { lineHeight: 1.2 });
        }
        instructionNote(90, 1190, 900, 270, d.notIncluded ? 'WARNING' : 'INSTALLATION NOTE', d.warn, d.notIncluded ? '#f8e2dd' : paperYellow, 950 + i);
        lhAllenKey(ctx, 170, 1580, 115, -0.3);
        lhText(ctx, 'TOOL 01', 125, 1690, lhSans(600, 24), { align: 'left', color: LH_D.softGray });
        lhMascot(ctx, 850, 1570, 145, d.pose || 'shrug', { seed: 951 + i, flip: true });
        lhText(ctx, `PART ${stepNumber} OF 04`, W / 2, 1810, lhSans(500, 28), { color: LH_D.softGray });
    }
};

async function renderLhDesignSlideToCanvas(slide, canvas, slideIndex) {
    await ensureLittleHabitsFontsLoaded();
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = LH_D.paper;
    ctx.fillRect(0, 0, width, height);

    const design = slide.lhDesign || {};
    const renderer = LH_FORMAT_RENDERERS[design.format];
    if (renderer) {
        // page-warp: as if photographed almost, but not quite, flat
        const warp = lhMulberry(1000 + slideIndex);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((warp() * 2 - 1) * 0.0045);
        ctx.scale(1.002, 1.002);
        ctx.translate(-width / 2, -height / 2);
        renderer(ctx, design, slideIndex, width, height);
        ctx.restore();
    }
    if (slideIndex === 3) {
        lhPenScribble(ctx, 130, 1455, 190, LH_D.penBlue, 909);
    }
    lhPaperTexture(ctx, width, height, 7 + slideIndex * 13);

    const stickers = Array.isArray(slide.stickers) ? slide.stickers : [];
    for (let i = 0; i < stickers.length; i++) {
        await drawLhStickerOnCanvas(ctx, stickers[i], i, width, height);
    }
}

async function renderLittleHabitsSlideToCanvas(slide, canvas, slideIndex) {
    if (state.lhFormatTextOnly || slide?.lhFormatTextOnly || slide?.lhDesign) {
        await ensureLittleHabitsFontsLoaded();
        const ctx = canvas.getContext('2d');
        const width = 1080;
        const height = 1920;
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const text = String(slide?.text || '').trim();
        let fontSize = slideIndex === 0 ? 82 : 72;
        const maxWidth = width * 0.82;
        const maxHeight = height * 0.62;
        let lines = lhWrapPlain(ctx, text, lhSans(600, fontSize), maxWidth);
        while (fontSize > 42 && lines.length * fontSize * 1.35 > maxHeight) {
            fontSize -= 2;
            lines = lhWrapPlain(ctx, text, lhSans(600, fontSize), maxWidth);
        }
        ctx.font = lhSans(600, fontSize);
        ctx.fillStyle = '#171717';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lineHeight = fontSize * 1.35;
        const startY = height * 0.5 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, lineIndex) => {
            ctx.fillText(line, width / 2, startY + lineIndex * lineHeight);
        });
        return;
    }
    await ensureLittleHabitsFontsLoaded();

    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const stickers = Array.isArray(slide.stickers) ? slide.stickers : [];
    for (let i = 0; i < stickers.length; i++) {
        await drawLhStickerOnCanvas(ctx, stickers[i], i, width, height);
    }

    let parsed = parseLittleHabitsText(slide.text);
    if (slideIndex === 0) parsed = enforceLhHookSandwich(parsed);
    drawLhHeadline(ctx, parsed.headlineSpans, width, height, slideIndex, getLhTextOffset(slide, 'headline'));
    drawLhCaption(ctx, parsed.caption, width, height, slideIndex, getLhTextOffset(slide, 'caption'));
}

// ==========================================
// CANVAS RENDERING
// ==========================================
function drawImageCover(ctx, img, targetWidth, targetHeight) {
    const sourceWidth = img.naturalWidth || img.width;
    const sourceHeight = img.naturalHeight || img.height;
    if (!sourceWidth || !sourceHeight) {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        return;
    }

    const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const dx = (targetWidth - drawWidth) / 2;
    const dy = (targetHeight - drawHeight) / 2;

    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function renderSlideToCanvas(slide, canvas) {
    const slideIndex = state.slides.indexOf(slide);
    if (isLittleHabitsFlow()) {
        return renderLittleHabitsSlideToCanvas(slide, canvas, slideIndex);
    }
    if (isTheScriptFlow() && slide?.ts) {
        return renderTheScriptSlideToCanvas(slide, canvas);
    }
    if (isSsFlow() && slide?.ss) {
        return renderSsSlideToCanvas(slide, canvas);
    }
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    const darkOverlayOpacity = shouldApplyDarkOverlayToSlide(slideIndex) ? getCurrentDarkOverlayOpacity() : 0;

    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = elements.bgColorInput.value;
    ctx.fillRect(0, 0, width, height);

    // Draw image if exists
    const staticImage = slideIndex >= 0 ? getStaticSlideImage(slideIndex) : null;
    let imgToDraw = staticImage || slide.image;

    if (imgToDraw) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                drawImageCover(ctx, img, width, height);
                if (darkOverlayOpacity > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${darkOverlayOpacity})`;
                    ctx.fillRect(0, 0, width, height);
                }
                drawTextOverlay(ctx, slide, width, height, slide.position, slide.scale, slide.maxWidth);
                resolve();
            };
            img.onerror = () => {
                const fallbackImage = staticImage ? getStaticSlideFallback(slideIndex) : null;
                if (fallbackImage && fallbackImage !== imgToDraw) {
                    img.onerror = () => {
                        if (darkOverlayOpacity > 0) {
                            ctx.fillStyle = `rgba(0, 0, 0, ${darkOverlayOpacity})`;
                            ctx.fillRect(0, 0, width, height);
                        }
                        drawTextOverlay(ctx, slide, width, height, slide.position, slide.scale, slide.maxWidth);
                        resolve();
                    };
                    img.src = fallbackImage;
                    return;
                }

                if (darkOverlayOpacity > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${darkOverlayOpacity})`;
                    ctx.fillRect(0, 0, width, height);
                }
                drawTextOverlay(ctx, slide, width, height, slide.position, slide.scale, slide.maxWidth);
                resolve();
            };
            img.src = imgToDraw;
        });
    } else {
        if (darkOverlayOpacity > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${darkOverlayOpacity})`;
            ctx.fillRect(0, 0, width, height);
        }
        drawTextOverlay(ctx, slide, width, height, slide.position, slide.scale, slide.maxWidth);
        return Promise.resolve();
    }
}

function drawTextOverlay(ctx, slideOrText, width, height, position = { x: 50, y: 50 }, scale = 1.5, maxWidthPercent = 120) {
    const slide = typeof slideOrText === 'object' && slideOrText !== null
        ? slideOrText
        : null;
    const text = slide ? slide.text : slideOrText;
    if (!text) return;

    // Scaling font size for 1080x1920 canvas
    // The user's input (16-48px) is meant for the preview which is ~300px wide.
    // So for 1080px canvas, we need to scale it accordingly (approx 3.6x)
    // Also apply the slide-specific scale factor (Capped at 1.5 as requested)
    const baseFontSize = slide?.fontSize || parseInt(elements.fontSizeInput.value) || 28;
    const scaleFactor = scale || 1.5;

    // The font size in the final canvas must match the visual proportion in the preview.
    // Preview font size = base * 0.35 * scale. 
    // Canvas is 3.6x larger than preview (1080 / 300).
    // So canvasFontSize = base * 3.6 * 0.35 * scale = base * 1.26 * scale.
    const canvasFontSize = baseFontSize * 1.26 * scaleFactor;
    const overlayTextStyle = getTextOverlayStyleSettings();

    ctx.font = `bold ${canvasFontSize}px ${overlayTextStyle.fontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = (position.x / 100) * width;
    const textY = (position.y / 100) * height;

    // Width logic: Match the preview's visual coverage.
    // Preview physical coverage = (maxWidthPercent/100) * 0.35 * scale.
    const visualCoverageRatio = (maxWidthPercent / 100) * 0.35 * scaleFactor;
    const maxWidth = width * visualCoverageRatio;
    const textStyle = getActiveTextStyle();
    const isTikTokCaptionStyle = textStyle === 'tiktok_caption';
    const lineHeight = canvasFontSize * (isTikTokCaptionStyle ? 1.08 : 1.25);
    const paddingX = canvasFontSize * 0.45;
    const paddingY = canvasFontSize * 0.18;
    const cornerRadius = canvasFontSize * 0.25;
    const blockGap = lineHeight * (isTikTokCaptionStyle ? 0.7 : 0.55);
    const blocks = splitTextBlocks(text);
    const dualVoice = state.currentService === 'dbt'
        && state.currentDbtSlideType === 'i_say_they_say'
        ? (slide?.outsideText && slide?.insideText
            ? { outsideText: slide.outsideText, insideText: slide.insideText }
            : parseDualVoiceSlideText(text))
        : null;

    const wrapBlockToLines = (blockText) => {
        const forcedLines = String(blockText || '').split('\n').map(s => s.trim()).filter(Boolean);
        const wrapped = [];
        forcedLines.forEach((line) => {
            const words = line.split(/\s+/).filter(Boolean);
            if (words.length === 0) return;
            let currentLine = words[0];
            for (let i = 1; i < words.length; i++) {
                const testLine = `${currentLine} ${words[i]}`;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth) {
                    wrapped.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }
            wrapped.push(currentLine);
        });
        return wrapped;
    };

    const drawTextBlob = (lines, centerY, centerX = textX) => {
        if (!lines || lines.length === 0) return;
        const blockHeight = lines.length * lineHeight;

        if (isTikTokCaptionStyle) {
            ctx.save();
            ctx.strokeStyle = overlayTextStyle.outlineEnabled ? 'rgba(0, 0, 0, 0.96)' : 'transparent';
            ctx.fillStyle = overlayTextStyle.textColor;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.miterLimit = 2;
            ctx.lineWidth = overlayTextStyle.outlineEnabled ? Math.max(6, canvasFontSize * 0.17) : 0;

            let startYForText = centerY - (blockHeight / 2) + (lineHeight / 2);
            if (overlayTextStyle.outlineEnabled) {
                lines.forEach((line) => {
                    ctx.strokeText(line, centerX, startYForText);
                    startYForText += lineHeight;
                });
            }

            ctx.shadowColor = overlayTextStyle.outlineEnabled ? 'rgba(0, 0, 0, 0.3)' : 'transparent';
            ctx.shadowBlur = overlayTextStyle.outlineEnabled ? canvasFontSize * 0.08 : 0;
            ctx.shadowOffsetY = overlayTextStyle.outlineEnabled ? canvasFontSize * 0.05 : 0;

            startYForText = centerY - (blockHeight / 2) + (lineHeight / 2);
            lines.forEach((line) => {
                ctx.fillText(line, centerX, startYForText);
                startYForText += lineHeight;
            });
            ctx.restore();
            return;
        }

        const rects = [];
        let currentYForRect = centerY - (blockHeight / 2);

        lines.forEach((line) => {
            const metrics = ctx.measureText(line);
            const lineWidth = metrics.width;
            const lineCenterY = currentYForRect + (lineHeight / 2);

            rects.push({
                x: centerX - (lineWidth / 2) - paddingX,
                y: lineCenterY - (canvasFontSize / 2) - paddingY,
                w: lineWidth + (paddingX * 2),
                h: canvasFontSize + (paddingY * 2)
            });
            currentYForRect += lineHeight;
        });

        ctx.fillStyle = overlayTextStyle.boxColor;
        ctx.beginPath();

        if (rects.length > 0) {
            ctx.moveTo(rects[0].x + cornerRadius, rects[0].y);
            for (let i = 0; i < rects.length; i++) {
                const r = rects[i];
                const next = rects[i + 1];

                ctx.lineTo(r.x + r.w - cornerRadius, r.y);
                ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + cornerRadius, cornerRadius);

                if (next) {
                    ctx.lineTo(r.x + r.w, next.y - cornerRadius);
                    ctx.arcTo(r.x + r.w, next.y, next.x + next.w, next.y, cornerRadius);
                } else {
                    ctx.lineTo(r.x + r.w, r.y + r.h - cornerRadius);
                    ctx.arcTo(r.x + r.w, r.y + r.h, r.x + r.w - cornerRadius, r.y + r.h, cornerRadius);
                }
            }

            for (let i = rects.length - 1; i >= 0; i--) {
                const r = rects[i];
                const prev = rects[i - 1];

                ctx.lineTo(r.x + cornerRadius, r.y + r.h);
                ctx.arcTo(r.x, r.y + r.h, r.x, r.y + r.h - cornerRadius, cornerRadius);

                if (prev) {
                    ctx.lineTo(r.x, prev.y + prev.h + cornerRadius);
                    ctx.arcTo(r.x, prev.y + prev.h, prev.x, prev.y + prev.h, cornerRadius);
                } else {
                    ctx.lineTo(r.x, r.y + cornerRadius);
                    ctx.arcTo(r.x, r.y, r.x + cornerRadius, r.y, cornerRadius);
                }
            }
        }

        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = overlayTextStyle.textColor;
        let startYForText = centerY - (blockHeight / 2) + (lineHeight / 2);
        lines.forEach((line) => {
            ctx.fillText(line, centerX, startYForText);
            startYForText += lineHeight;
        });
    };

    if (dualVoice) {
        const outsideLines = wrapBlockToLines(dualVoice.outsideText);
        const insideLines = wrapBlockToLines(dualVoice.insideText);
        const outsidePosition = slide?.outsidePosition || getDefaultDualVoicePosition('outside');
        const insidePosition = slide?.insidePosition || getDefaultDualVoicePosition('inside');
        if (outsideLines.length > 0) {
            drawTextBlob(outsideLines, (outsidePosition.y / 100) * height, (outsidePosition.x / 100) * width);
        }
        if (insideLines.length > 0) {
            drawTextBlob(insideLines, (insidePosition.y / 100) * height, (insidePosition.x / 100) * width);
        }
        return;
    }

    const blockLines = blocks.map(block => wrapBlockToLines(block)).filter(lines => lines.length > 0);
    if (blockLines.length === 0) return;

    const blockHeights = blockLines.map(lines => lines.length * lineHeight);
    const totalHeight = blockHeights.reduce((a, b) => a + b, 0) + (blockGap * (blockLines.length - 1));

    let currentTop = textY - (totalHeight / 2);
    blockLines.forEach((lines, idx) => {
        const blockHeight = blockHeights[idx];
        const centerY = currentTop + (blockHeight / 2);
        drawTextBlob(lines, centerY);
        currentTop += blockHeight + blockGap;
    });
}

// ==========================================
// DOWNLOAD FUNCTIONALITY
// ==========================================
function normalizeMetadataHashtags(value) {
    const raw = Array.isArray(value)
        ? value
        : (String(value || '').match(/#[a-z0-9_]+/ig) || []);
    const seen = new Set();
    return raw
        .map((tag) => String(tag || '').trim().toLowerCase().replace(/^#*/, '#'))
        .filter((tag) => /^#[a-z0-9_]{2,}$/.test(tag) && !seen.has(tag) && seen.add(tag));
}

async function downloadAllSlides() {
    if (!ensureSlidesParsed()) {
        showNotification('No slides to download!', 'error');
        return;
    }

    const zip = new JSZip();
    const canvas = elements.renderCanvas;

    for (let i = 0; i < state.slides.length; i++) {
        await renderSlideToCanvas(state.slides[i], canvas);
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        zip.file(`slide_${i + 1}.png`, base64Data, { base64: true });
    }

    // The Script flow: same funnel copy treatment as ss, plus a plain-text dump of the
    // slides so the lines can be pasted straight into TikTok text boxes.
    if (isTheScriptFlow()) {
        const hashtags = (state.tsHashtags || []).join(' ');
        const lines = [];
        if (state.tsTitle) lines.push(`TITLE (max 8 words — paste this as the post text):\n${state.tsTitle}`);
        if (hashtags) lines.push(`HASHTAGS:\n${hashtags}`);
        if (state.tsTitle || hashtags) lines.push(`TITLE + HASHTAGS TOGETHER:\n${[state.tsTitle, hashtags].filter(Boolean).join(' ')}`);
        if (state.tsPinnedComment) lines.push(`PINNED COMMENT (post this yourself, immediately):\n${state.tsPinnedComment}`);
        if (state.tsCaption) lines.push(`ALTERNATIVE LONGER CAPTION:\n${state.tsCaption}`);
        if (lines.length) zip.file('tiktok_info.txt', lines.join('\n\n'));

        const slideTexts = (state.tsSlides || []).map(slide => `Slide ${slide.n} (${slide.role}):\n${slide.text}`);
        if (slideTexts.length) zip.file('slide_texts.txt', slideTexts.join('\n\n'));

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'the_script.zip';
        link.click();
        showNotification(`Downloaded ${state.slides.length} slides + tiktok_info.txt`, 'success');
        return;
    }

    // The slideshow flow has its own funnel copy: title, hashtags, caption and the pinned
    // comment all need to be at hand when the post actually goes up.
    if (isSsFlow()) {
        const hashtags = (state.ssHashtags || []).join(' ');
        const lines = [];
        if (state.ssTitle) lines.push(`TITLE (max 8 words — paste this as the post text):\n${state.ssTitle}`);
        if (state.ssDescription || hashtags) lines.push(`DESCRIPTION + HASHTAGS TOGETHER:\n${[state.ssDescription, hashtags].filter(Boolean).join(' ')}`);
        if (state.ssSound) lines.push(`SOUND:\n${[state.ssSound.title, state.ssSound.artist].filter(Boolean).join(' - ')}\n${state.ssSound.link}`);
        if (lines.length) zip.file('tiktok_info.txt', lines.join('\n\n'));

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'slideshow.zip';
        link.click();
        showNotification(`Downloaded ${state.slides.length} slides + tiktok_info.txt`, 'success');
        return;
    }

    if (isLittleHabitsFlow()) {
        const title = String(state.lhTitle || elements.lhMetadataTitle?.textContent || '').trim();
        const hashtags = normalizeMetadataHashtags(
            state.lhHashtags?.length ? state.lhHashtags : elements.lhMetadataHashtags?.textContent
        );
        const description = String(elements.lhMetadataDesc?.textContent || '').trim();
        const lines = [];

        if (title) lines.push(`TITLE (max 8 words — paste this as the post text):\n${title}`);
        if (hashtags.length) lines.push(`HASHTAGS:\n${hashtags.join(' ')}`);
        if (title || hashtags.length) {
            lines.push(`TITLE + HASHTAGS TOGETHER:\n${[title, hashtags.join(' ')].filter(Boolean).join(' ')}`);
        }
        if (description) lines.push(`DESCRIPTION / CAPTION:\n${description}`);
        if (state.lhPinnedComment) {
            lines.push(`PINNED COMMENT (post this yourself, immediately):\n${state.lhPinnedComment}`);
        }
        if (state.lhCaption) lines.push(`ALTERNATIVE CAPTION:\n${state.lhCaption}`);
        if (lines.length) zip.file('tiktok_info.txt', lines.join('\n\n'));

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'little_habits.zip';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 0);
        showNotification(`Downloaded ${state.slides.length} slides + TikTok title/hashtags`, 'success');
        return;
    }

    // Include TikTok Title & Description if they exist
    const isSyp = state.currentService === 'syp';
    const isLh = state.currentService === 'lh';
    const title = isLh
        ? elements.lhMetadataTitle?.textContent
        : isSyp ? elements.metadataTitleSyp?.textContent : elements.metadataTitle?.textContent;
    const desc = isLh
        ? elements.lhMetadataDesc?.textContent
        : isSyp ? elements.metadataDescSyp?.textContent : elements.metadataDesc?.textContent;

    if (title || desc) {
        let metadataText = "";
        if (title) metadataText += `TITLE:\n${title}\n\n`;
        if (desc) metadataText += `DESCRIPTION:\n${desc}\n`;
        zip.file('tiktok_info.txt', metadataText);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'slides.zip';
    link.click();

    showNotification('All slides downloaded!', 'success');
}

async function downloadCurrentSlide() {
    if (!ensureSlidesParsed()) {
        showNotification('No slides to download!', 'error');
        return;
    }

    await downloadSlideByIndex(state.currentSlideIndex);
}

async function downloadSlideByIndex(index) {
    if (!state.slides[index]) {
        showNotification('Slide not found!', 'error');
        return;
    }

    const canvas = elements.renderCanvas;
    await renderSlideToCanvas(state.slides[index], canvas);

    const link = document.createElement('a');
    link.download = `slide_${index + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showNotification(`Slide ${index + 1} downloaded!`, 'success');
}

// ==========================================
// FILE UPLOAD
// ==========================================
function handleFileUpload(files) {
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageIndex = state.slides.length > 0 ? state.currentSlideIndex + index : index;

            if (!state.slides[imageIndex]) {
                while (state.slides.length <= imageIndex) {
                    state.slides.push(createSlide({ index: state.slides.length }));
                }
            }

            if (state.slides[imageIndex]) {
                setSlideImage(imageIndex, e.target.result, { overrideStatic: true });
            }

            if (index === files.length - 1) {
                syncActiveSlidesTextarea();
                renderSlideBuilderList();
                renderSlidesPreview();
                setCurrentSlideIndex(imageIndex);
            }
        };
        reader.readAsDataURL(file);
    });

    showNotification(`${files.length} image(s) uploaded`, 'success');
}

function clearCurrentSlideImage() {
    const slide = state.slides[state.currentSlideIndex];
    if (!slide) return;

    if (state.staticSlides && state.staticSlides[state.currentSlideIndex]) {
        delete state.staticSlides[state.currentSlideIndex];
    }

    slide.image = null;
    state.generatedImages[state.currentSlideIndex] = null;
    renderSlideBuilderList();
    renderSlidesPreview();
    setCurrentSlideIndex(state.currentSlideIndex);
    showNotification(`Removed image from slide ${state.currentSlideIndex + 1}`, 'success');
}

function handleSelectedSlideTextInput(event) {
    const slide = state.slides[state.currentSlideIndex];
    if (!slide) return;

    const newText = event.target.value;

    // Parody-format slides: the editor writes the slide's primary copy field,
    // and the canvas re-renders from the design spec.
    if (slide.lhDesign) {
        const field = getLhDesignPrimaryField(slide.lhDesign);
        if (field) slide.lhDesign[field] = newText;
        slide.text = newText;
        renderSlidesPreview();
        return;
    }

    slide.text = newText;

    const dualVoice = parseDualVoiceSlideText(newText);
    slide.outsideText = dualVoice?.outsideText || null;
    slide.insideText = dualVoice?.insideText || null;
    if (dualVoice) {
        ensureDualVoicePositions(slide);
    }

    syncActiveSlidesTextarea();
    const builderTextarea = document.querySelector(`.slide-builder-textarea[data-index="${state.currentSlideIndex}"]`);
    if (builderTextarea && document.activeElement !== builderTextarea) {
        builderTextarea.value = newText;
    }
    renderSlidesPreview();
    setCurrentSlideIndex(state.currentSlideIndex);
}

function handleSelectedSlideFontSizeInput(event) {
    const nextFontSize = parseInt(event.target.value, 10);
    if (Number.isNaN(nextFontSize)) return;

    state.slides.forEach((slide) => {
        slide.fontSize = nextFontSize;
    });
    if (elements.fontSizeInput) {
        elements.fontSizeInput.value = String(nextFontSize);
    }
    if (elements.fontSizeInputSyp) {
        elements.fontSizeInputSyp.value = String(nextFontSize);
    }
    const valueDisplay = document.getElementById('font-size-value');
    const sypValueDisplay = document.getElementById('font-size-value_syp');
    if (valueDisplay) valueDisplay.textContent = nextFontSize + 'px';
    if (sypValueDisplay) sypValueDisplay.textContent = nextFontSize + 'px';
    renderSlidesPreview();
    updateSelectedSlideEditor();
}

// ==========================================
// CHARACTER ANCHOR
// ==========================================

// Helper: collect all reference images for the current service
function getServiceReferenceImages(isSyp) {
    const referenceImages = [];
    const sourceArray = isSyp ? state.characterAnchor : state.characterAnchorDbt;

    // Both support multiple refs now
    for (const dataUrl of sourceArray) {
        const parsed = parseDataUrl(dataUrl);
        if (parsed) referenceImages.push(parsed);
    }
    return referenceImages;
}

function handleAnchorUpload(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Please upload an image file', 'error');
        return;
    }

    const isSyp = state.currentService === 'syp';
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (isSyp) {
            // SYP: push to array
            state.characterAnchor.push(dataUrl);
            renderSypRefGallery();
            saveSypRefsToLocalStorage();
        } else {
            // DBT: push to array
            state.characterAnchorDbt.push(dataUrl);
            renderDbtRefGallery();
            saveDbtRefsToLocalStorage();
        }
        showNotification('Reference image uploaded!', 'success');
    };
    reader.readAsDataURL(file);
}

function clearCharacterAnchor() {
    const isSyp = state.currentService === 'syp';
    if (isSyp) {
        state.characterAnchor = [];
        renderSypRefGallery();
        localStorage.removeItem('characterAnchor_syp');
    } else {
        state.characterAnchorDbt = [];
        renderDbtRefGallery();
        localStorage.removeItem('characterAnchor_dbt');
    }
    showNotification('All references cleared', 'info');
}

function removeRef(index, service) {
    if (service === 'syp') {
        state.characterAnchor.splice(index, 1);
        renderSypRefGallery();
        saveSypRefsToLocalStorage();
    } else {
        state.characterAnchorDbt.splice(index, 1);
        renderDbtRefGallery();
        saveDbtRefsToLocalStorage();
    }
    showNotification('Reference removed', 'info');
}

function renderDbtRefGallery() {
    const gallery = elements.anchorRefGalleryDbt;
    const wrapper = elements.anchorReferenceDisplayDbt;
    if (!gallery || !wrapper) return;

    gallery.innerHTML = '';

    if (state.characterAnchorDbt.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = 'block';

    state.characterAnchorDbt.forEach((dataUrl, idx) => {
        const thumb = document.createElement('div');
        thumb.style.cssText = 'position: relative; width: 48px; height: 48px; flex-shrink: 0;';
        thumb.innerHTML = `
            <img src="${dataUrl}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">
            <button class="ref-remove-btn" data-idx="${idx}" style="position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; background: #ff4444; color: white; border: none; font-size: 10px; line-height: 16px; text-align: center; cursor: pointer; padding: 0;">×</button>
        `;
        thumb.querySelector('.ref-remove-btn').addEventListener('click', () => removeRef(idx, 'dbt'));
        gallery.appendChild(thumb);
    });
}

function renderSypRefGallery() {
    // SYP can have gallery in Step 2 AND Step 3
    const galleries = [elements.anchorRefGallerySypStep2, elements.anchorRefGallerySypStep3];
    const wrappers = [elements.anchorReferenceDisplaySypStep2, elements.anchorReferenceDisplaySyp];

    galleries.forEach((gallery, i) => {
        if (!gallery) return;
        gallery.innerHTML = '';
        const wrapper = wrappers[i];

        if (state.characterAnchor.length === 0) {
            if (wrapper) wrapper.style.display = 'none';
            return;
        }

        if (wrapper) wrapper.style.display = 'block';

        state.characterAnchor.forEach((dataUrl, idx) => {
            const thumb = document.createElement('div');
            thumb.style.cssText = 'position: relative; width: 48px; height: 48px; flex-shrink: 1;';
            thumb.innerHTML = `
                <img src="${dataUrl}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">
                <button class="ref-remove-btn" data-idx="${idx}" style="position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; background: #ff4444; color: white; border: none; font-size: 10px; line-height: 16px; text-align: center; cursor: pointer; padding: 0;">×</button>
            `;
            thumb.querySelector('.ref-remove-btn').addEventListener('click', () => removeRef(idx, 'syp'));
            gallery.appendChild(thumb);
        });
    });
}

function saveDbtRefsToLocalStorage() {
    try {
        localStorage.setItem('characterAnchor_dbt', JSON.stringify(state.characterAnchorDbt));
    } catch (err) {
        console.warn('Could not save DBT refs to localStorage (likely size limit)', err);
    }
}

function saveSypRefsToLocalStorage() {
    try {
        localStorage.setItem('characterAnchor_syp', JSON.stringify(state.characterAnchor));
    } catch (err) {
        console.warn('Could not save SYP refs to localStorage (likely size limit)', err);
    }
}

function loadSavedRefs() {
    const savedSypRaw = localStorage.getItem('characterAnchor_syp');
    const savedDbtRaw = localStorage.getItem('characterAnchor_dbt');

    if (savedSypRaw) {
        try {
            const parsed = JSON.parse(savedSypRaw);
            if (Array.isArray(parsed)) {
                state.characterAnchor = parsed;
            } else if (typeof parsed === 'string') {
                state.characterAnchor = [parsed];
            }
        } catch {
            state.characterAnchor = [savedSypRaw];
        }
        renderSypRefGallery();
    }

    if (savedDbtRaw) {
        try {
            const parsed = JSON.parse(savedDbtRaw);
            if (Array.isArray(parsed)) {
                state.characterAnchorDbt = parsed;
            } else if (typeof parsed === 'string') {
                state.characterAnchorDbt = [parsed];
            }
        } catch {
            state.characterAnchorDbt = [savedDbtRaw];
        }
        renderDbtRefGallery();
    }
}

// ==========================================
// HOOK IMPROVEMENT
// ==========================================
function renderHookOptions(hooks, options = {}) {
    const isSyp = !!options.isSyp;
    const styleExamples = Array.isArray(options.styleExamples) ? options.styleExamples : [];
    const styleInfluences = Array.isArray(options.styleInfluences) ? options.styleInfluences : [];
    const hookListEl = isSyp ? elements.hookListSyp || elements.hookList : elements.hookList;
    const hookOptionsEl = isSyp ? elements.hookOptionsSyp || elements.hookOptions : elements.hookOptions;
    const textInput = isSyp ? elements.slideTextInputSyp : elements.slideTextInput;

    if (!hookListEl || !hookOptionsEl || !Array.isArray(hooks)) return;

    hookListEl.innerHTML = '';
    hookListEl.style.maxHeight = hooks.length > 6 ? '320px' : '';
    hookListEl.style.overflowY = hooks.length > 6 ? 'auto' : '';
    hooks.slice(0, 20).forEach((hook, index) => {
        const hookEl = document.createElement('div');
        hookEl.className = 'hook-option';
        const influence = styleInfluences[index]
            ? `<div class="hook-style-influence" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px;">${styleInfluences[index]}</div>`
            : '';
        hookEl.innerHTML = `
            <div class="hook-text">${hook}</div>
            ${influence}
            <button class="btn btn-sm btn-primary use-hook-btn" data-index="${index}">Use</button>
        `;
        hookListEl.appendChild(hookEl);
    });

    hookOptionsEl.style.display = 'block';

    const previousDebugEl = hookOptionsEl.querySelector('.hook-style-examples');
    if (previousDebugEl) previousDebugEl.remove();

    if (styleExamples.length > 0) {
        const debugEl = document.createElement('details');
        debugEl.className = 'hook-style-examples';
        debugEl.style.marginTop = '10px';
        debugEl.style.fontSize = '0.78rem';
        debugEl.style.color = 'var(--text-muted)';

        const summaryEl = document.createElement('summary');
        summaryEl.textContent = `hooks.db style references used (${styleExamples.length})`;
        summaryEl.style.cursor = 'pointer';
        debugEl.appendChild(summaryEl);

        const listEl = document.createElement('ol');
        listEl.style.margin = '8px 0 0 18px';
        listEl.style.padding = '0';
        styleExamples.slice(0, 12).forEach(example => {
            const itemEl = document.createElement('li');
            itemEl.textContent = String(example || '').toLowerCase();
            itemEl.style.marginBottom = '4px';
            listEl.appendChild(itemEl);
        });

        debugEl.appendChild(listEl);
        hookOptionsEl.appendChild(debugEl);
    }

    hookListEl.querySelectorAll('.use-hook-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const selectedHook = hooks[index];

            if (textInput) {
                const lines = textInput.value.split('\n');
                let replaced = false;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().startsWith('slide 1')) {
                        lines[i] = `Slide 1: ${selectedHook}`;
                        replaced = true;
                        break;
                    }
                }
                if (!replaced && lines.length > 0) lines[0] = `Slide 1: ${selectedHook}`;
                textInput.value = lines.join('\n');
            }

            if (state.slides.length > 0 && state.slides[0]) {
                state.slides[0].text = selectedHook;
                renderSlidesPreview();
            }

            hookOptionsEl.style.display = 'none';
            showNotification('Hook updated!', 'success');
        });
    });
}

async function improveHooks() {
    const isSyp = state.currentService === 'syp';

    // Auto-parse if slides are empty but text exists
    if (state.slides.length === 0) {
        const textInput = isSyp ? elements.slideTextInputSyp : elements.slideTextInput;
        if (textInput && textInput.value.trim()) {
            const tempSlides = parseSlidesFromText(textInput.value).map((slide, index) => ({
                ...slide,
                id: Date.now() + index
            }));
            console.log(`Auto-parsed ${tempSlides.length} temporary slides for hook improvement`);
            improveHooksFromSlides(tempSlides);
            return;
        }
    }

    if (state.slides.length === 0) {
        showNotification('Please generate or parse slides first!', 'error');
        return;
    }

    improveHooksFromSlides(state.slides);
}

async function improveHooksFromSlides(slidesToUse) {
    const isSyp = state.currentService === 'syp';
    // const isSyp = state.currentService === 'syp'; // Already declared above
    const genBtn = isSyp ? elements.quickImproveHookBtnSyp : elements.quickImproveHookBtn;
    if (genBtn) {
        genBtn.disabled = true;
        genBtn.textContent = '⏳ Improving...';
    }

    try {
        const response = await fetch(`${API_BASE}/improve-hooks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                slides: slidesToUse.map(s => s.text),
                format: state.currentFormat,
                topic: isVentNowStyleFlow() ? 'autonomous Vent Now topic' : state.currentTopic,
                service: state.currentService,
                slideType: state.currentService === 'dbt' ? state.currentDbtSlideType : undefined,
                language: state.currentService === 'dbt' ? (elements.dbtLanguageSelect?.value || 'en') : undefined
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.hooks && Array.isArray(data.hooks)) {
            renderHookOptions(data.hooks, {
                isSyp,
                styleExamples: data.hook_style_examples,
                styleInfluences: data.hook_style_influences
            });
        }
    } catch (error) {
        console.error('Error improving hooks:', error);
        showNotification('Failed to improve hooks. Please try again.', 'error');
    } finally {
        if (genBtn) {
            genBtn.disabled = false;
            genBtn.textContent = '🔥 Better Hooks';
        }
    }
}

// ==========================================
// APP MENTION IMPROVEMENT
// ==========================================
async function improveAppMention() {
    const isSyp = state.currentService === 'syp';
    if (isSyp) {
        showNotification('App mention improvement is currently only for DBT-Mind', 'info');
        return;
    }

    if (state.slides.length === 0) {
        const textInput = elements.slideTextInput;
        if (textInput && textInput.value.trim()) {
            const tempSlides = parseSlidesFromText(textInput.value).map((slide, index) => ({
                ...slide,
                id: Date.now() + index
            }));
            improveAppMentionFromSlides(tempSlides);
            return;
        }
    }

    if (state.slides.length === 0) {
        showNotification('Please generate or parse slides first!', 'error');
        return;
    }

    improveAppMentionFromSlides(state.slides);
}

async function improveAppMentionFromSlides(slidesToUse) {
    const genBtn = elements.quickImproveAppMentionBtn;
    const listEl = elements.appMentionList;
    const optionsEl = elements.appMentionOptions;

    if (genBtn) {
        genBtn.disabled = true;
        genBtn.textContent = '⏳ Improving...';
    }

    try {
        const response = await fetch(`${API_BASE}/improve-app-mention`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                slides: slidesToUse.map(s => s.text),
                service: state.currentService
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.mentions && Array.isArray(data.mentions)) {
            listEl.innerHTML = '';
            data.mentions.forEach((mention, index) => {
                const mentionEl = document.createElement('div');
                mentionEl.className = 'hook-option';
                mentionEl.innerHTML = `
                    <div class="hook-text">${mention}</div>
                    <button class="btn btn-sm btn-primary use-mention-btn" data-index="${index}">Use</button>
                `;
                listEl.appendChild(mentionEl);
            });

            optionsEl.style.display = 'block';

            // Add click handlers
            listEl.querySelectorAll('.use-mention-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    const selectedMention = data.mentions[index];

                    // Update text area directly
                    const textInput = elements.slideTextInput;
                    if (textInput) {
                        const lines = textInput.value.split('\n');
                        // Smart replacement for "dbt app" or Slide 6
                        let replaced = false;

                        // Try to find a line that already mentions "dbt app" or is Slide 6
                        for (let i = 0; i < lines.length; i++) {
                            const lowerLine = lines[i].toLowerCase();
                            if (lowerLine.includes('dbt app') || lowerLine.startsWith('slide 6')) {
                                // Keep the Slide X: prefix if it exists
                                const prefixMatch = lines[i].match(/^(Slide\s*\d+\s*[:\-]\s*)/i);
                                const prefix = prefixMatch ? prefixMatch[1] : `Slide ${i + 1}: `;
                                lines[i] = `${prefix}${selectedMention}`;
                                replaced = true;

                                // Update state if slides are parsed
                                if (state.slides[i]) {
                                    state.slides[i].text = selectedMention;
                                }
                                break;
                            }
                        }

                        // If no clear target found, append or replace last slide
                        if (!replaced && lines.length > 0) {
                            const lastIdx = lines.length - 1;
                            const prefixMatch = lines[lastIdx].match(/^(Slide\s*\d+\s*[:\-]\s*)/i);
                            const prefix = prefixMatch ? prefixMatch[1] : `Slide ${lines.length}: `;
                            lines[lastIdx] = `${prefix}${selectedMention}`;

                            if (state.slides[lastIdx]) {
                                state.slides[lastIdx].text = selectedMention;
                            }
                        }

                        textInput.value = lines.join('\n');
                        renderSlidesPreview();
                    }

                    optionsEl.style.display = 'none';
                    showNotification('App mention updated!', 'success');
                });
            });
        }
    } catch (error) {
        console.error('Error improving app mention:', error);
        showNotification('Failed to improve app mention. Please try again.', 'error');
    } finally {
        if (genBtn) {
            genBtn.disabled = false;
            genBtn.textContent = '🧠 Better App Mention';
        }
    }
}

// ==========================================
// METADATA GENERATION
// ==========================================
async function generateMetadata(options = {}) {
    const { skipEnsureSlides = false, suppressSuccessNotification = false } = options;

    if (!skipEnsureSlides && !ensureSlidesParsed()) {
        showNotification('Please provide slide text first (paste it or generate it)!', 'error');
        return;
    }

    const isSyp = state.currentService === 'syp';
    const isLh = state.currentService === 'lh';
    const genBtn = isLh ? elements.lhGenerateMetadataBtn : isSyp ? elements.generateMetadataBtnSyp : elements.generateMetadataBtn;
    const titleEl = isLh ? elements.lhMetadataTitle : isSyp ? elements.metadataTitleSyp : elements.metadataTitle;
    const descEl = isLh ? elements.lhMetadataDesc : isSyp ? elements.metadataDescSyp : elements.metadataDesc;
    const outputEl = isLh ? elements.lhMetadataOutput : isSyp ? elements.metadataOutputSyp : elements.metadataOutput;

    if (genBtn) {
        genBtn.disabled = true;
        genBtn.innerHTML = '<span>⏳ Generating...</span>';
    }

    try {
        let brandingMode = 'full';
        if (isSyp) {
            const selectedMode = document.querySelector('input[name="syp-branding-mode"]:checked');
            if (selectedMode) brandingMode = selectedMode.value;
        }

        const response = await fetch(`${API_BASE}/generate-metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({
                slides_text: isLittleHabitsFlow()
                    ? state.slides.map(s => {
                        const parsed = parseLittleHabitsText(s.text);
                        const headline = parsed.headlineSpans.map(span => span.text).join(' ');
                        return parsed.caption ? `${headline} - ${parsed.caption}` : headline;
                    }).join('\n')
                    : state.slides.map(s => s.text).join('\n'),
                format: state.currentFormat,
                topic: isVentNowStyleFlow() ? 'autonomous Vent Now topic' : state.currentTopic,
                slide1Hook: state.slides[0]?.text || '',
                service: state.currentService,
                slideType: state.currentDbtSlideType,
                includeBranding: state.includeBranding,
                brandingMode: brandingMode,
                language: state.currentService === 'dbt' ? (elements.dbtLanguageSelect?.value || 'en') : undefined
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.title && data.description) {
            if (isLh) {
                state.lhTitle = String(data.title || '').trim();
                state.lhHashtags = normalizeMetadataHashtags(data.hashtags?.length ? data.hashtags : data.description);
                if (elements.lhMetadataHashtags) {
                    elements.lhMetadataHashtags.textContent = state.lhHashtags.join(' ');
                }
            }
            if (titleEl) titleEl.textContent = data.title;
            if (descEl) descEl.textContent = data.description;
            if (outputEl) outputEl.style.display = 'block';
            if (!suppressSuccessNotification) {
                showNotification('Metadata generated!', 'success');
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating metadata:', error);
        showNotification('Failed to generate metadata. Please try again.', 'error');
    } finally {
        if (genBtn) {
            genBtn.disabled = false;
            genBtn.innerHTML = isLh
                ? '<span>📱 Generate TikTok Title &amp; Desc</span>'
                : '<span>📱 Generate TikTok Title & Desc (Opus)</span>';
        }
    }
}

function copyMetadata() {
    const isSyp = state.currentService === 'syp';
    const isLh = state.currentService === 'lh';
    const titleEl = isLh ? elements.lhMetadataTitle : isSyp ? elements.metadataTitleSyp : elements.metadataTitle;
    const descEl = isLh ? elements.lhMetadataDesc : isSyp ? elements.metadataDescSyp : elements.metadataDesc;

    const title = titleEl?.textContent || '';
    const description = descEl?.textContent || '';
    const fullText = isLh
        ? [
            title && `TITLE (max 8 words):\n${title}`,
            state.lhHashtags?.length && `HASHTAGS:\n${state.lhHashtags.join(' ')}`,
            description && `DESCRIPTION:\n${description}`
        ].filter(Boolean).join('\n\n')
        : `${title}\n\n${description}`;

    navigator.clipboard.writeText(fullText).then(() => {
        showNotification('Metadata copied!', 'success');
    }).catch(() => {
        showNotification('Failed to copy metadata', 'error');
    });
}

// ==========================================
// SERVICE SWITCHING
// ==========================================
function switchService(service) {
    state.currentService = service;
    state.staticSlides = {};
    state.useStaticSlide1 = false;
    if (service === 'lh') {
        state.currentDbtSlideType = 'little_habits';
    }
    document.body.dataset.service = service;

    // Load the photo folders the first time the Slideshows tab is opened.
    if (service === 'ss' && !state.ssLibraryLoaded) {
        state.ssLibraryLoaded = true;
        loadSsLibrarySets();
    }

    // SS slides read the shared text controls (color, outline, font). Their default look
    // is white text + hard black TikTok outline, so seed those values when the tab opens —
    // but never clobber a style the user deliberately set this session.
    if (service === 'ss' && !state.textStyleCustomized) {
        setTextOverlayControls({ textColor: '#ffffff', outlineEnabled: true });
    }

    // Restore the last generated slideshow when opening the Slideshows tab — survives
    // page reloads (live-server auto-reload on code changes), so no regeneration needed.
    if (service === 'ss' && !state.slides.some((slide) => slide?.ss)) {
        restoreSsGeneration();
    }

    if (elements.selectedSlideTextInput) {
        elements.selectedSlideTextInput.placeholder = service === 'lh'
            ? 'Slide text. Markup: *playful font*  **bold**  ;; bottom caption'
            : 'Write your slide text here. For dual voice slides, use:\nOUTSIDE: ...\nINSIDE: ...';
    }

    // Update buttons
    document.querySelectorAll('.service-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.service === service);
    });

    // Update panels
    elements.servicePanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${service}`);
    });

    syncDbtStaticSlides();
    syncDbtHookImageControl();
    syncStoryAiFlowControls();
    applyStaticSlides();
    renderSlideBuilderList();
    renderSlidesPreview();
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
    window.addEventListener('resize', syncSsPreviewMetrics);
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.hook-image-picker')) {
            closeAllDbtHookImageMenus();
        }
    });

    // Service switcher
    document.querySelectorAll('.service-btn').forEach(btn => {
        btn.addEventListener('click', () => switchService(btn.dataset.service));
    });

    // Format and topic selectors
    if (elements.nativeGenFormat) {
        elements.nativeGenFormat.addEventListener('change', () => {
            state.currentFormat = elements.nativeGenFormat.value;
            checkFormatTopicCompatibility();
        });
    }

    if (elements.nativeGenTopic) {
        elements.nativeGenTopic.addEventListener('change', () => {
            state.currentTopic = elements.nativeGenTopic.value;
            checkFormatTopicCompatibility();
        });
    }

    // Viral combo buttons
    if (elements.viralComboBtns) {
        elements.viralComboBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                const topic = btn.dataset.topic;

                if (elements.nativeGenFormat) {
                    elements.nativeGenFormat.value = format;
                    state.currentFormat = format;
                }

                if (elements.nativeGenTopic) {
                    elements.nativeGenTopic.value = topic;
                    state.currentTopic = topic;
                }

                checkFormatTopicCompatibility();
                showNotification(`Selected: ${dbtFramework.formats[format].name} + ${dbtFramework.topics[topic].name}`, 'success');
            });
        });
    }

    // Generate native slides
    if (elements.generateNativeSlidesBtn) {
        elements.generateNativeSlidesBtn.addEventListener('click', generateNativeSlides);
    }

    if (elements.dbtSlideTypeSelect) {
        elements.dbtSlideTypeSelect.addEventListener('change', () => {
            syncDbtSlideTypeUI();
            syncDbtHookImageControl();
            syncDbtStaticSlides();
            applyStaticSlides();
            renderSlidesPreview();
            showNotification(`DBT slide type set to ${elements.dbtSlideTypeSelect.options[elements.dbtSlideTypeSelect.selectedIndex].text}`, 'success');
        });
    }

    if (elements.dbtStoryAiFlow) {
        elements.dbtStoryAiFlow.addEventListener('change', () => {
            state.useStoryAiFlow = isDbtStoryAiFlowActive();
            syncStoryAiFlowControls();
            if (state.useStoryAiFlow && state.slides.length > 0) {
                state.useStaticSlide1 = false;
                state.staticSlides = {};
                applyStaticSlides();
                renderSlidesPreview();
            }
            showNotification(state.useStoryAiFlow ? 'Story AI flow enabled.' : 'Story AI flow disabled.', 'success');
        });
    }

    if (elements.dbtStoryAiSlide1UploadBtn) {
        elements.dbtStoryAiSlide1UploadBtn.addEventListener('click', () => {
            elements.dbtStoryAiSlide1FileInput?.click();
        });
    }

    if (elements.dbtStoryAiSlide1FileInput) {
        elements.dbtStoryAiSlide1FileInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showNotification('Please upload an image file', 'error');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setStoryAiSlide1Image(loadEvent.target.result);
                showNotification('Slide 1 couple image set.', 'success');
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        });
    }

    if (elements.dbtTextStyleSelect) {
        elements.dbtTextStyleSelect.addEventListener('change', () => {
            syncTextColorForTextStyle(elements.dbtTextStyleSelect.value);
            renderSlidesPreview();
            showNotification(`DBT text styling set to ${elements.dbtTextStyleSelect.options[elements.dbtTextStyleSelect.selectedIndex].text}`, 'success');
        });
    }

    // Generate image prompts
    if (elements.generateImagePromptsBtn) {
        elements.generateImagePromptsBtn.addEventListener('click', generateImagePrompts);
    }

    if (elements.generateDbtCarouselTextBtn) {
        elements.generateDbtCarouselTextBtn.addEventListener('click', generateDbtCarouselText);
    }

    if (elements.copyDbtCarouselJsonBtn) {
        elements.copyDbtCarouselJsonBtn.addEventListener('click', () => {
            const jsonText = elements.dbtCarouselJsonOutput?.textContent || '';
            if (!jsonText.trim()) {
                showNotification('Generate carousel text first.', 'error');
                return;
            }
            navigator.clipboard.writeText(jsonText);
            showNotification('Carousel JSON copied!', 'success');
        });
    }

    if (elements.copyDbtCarouselPreviewBtn) {
        elements.copyDbtCarouselPreviewBtn.addEventListener('click', () => {
            const previewText = elements.dbtCarouselPreviewOutput?.value || '';
            if (!previewText.trim()) {
                showNotification('Generate carousel text first.', 'error');
                return;
            }
            navigator.clipboard.writeText(previewText);
            showNotification('Carousel preview copied!', 'success');
        });
    }

    if (elements.useDbtCarouselTextBtn) {
        elements.useDbtCarouselTextBtn.addEventListener('click', () => {
            const previewText = elements.dbtCarouselPreviewOutput?.value || '';
            if (!previewText.trim()) {
                showNotification('Generate carousel text first.', 'error');
                return;
            }
            if (elements.dbtCarouselSlidesInput) {
                elements.dbtCarouselSlidesInput.value = previewText;
            }
            showNotification('Slide text is ready for image prompts.', 'success');
        });
    }

    if (elements.generateDbtCarouselPromptsBtn) {
        elements.generateDbtCarouselPromptsBtn.addEventListener('click', generateDbtCarouselPrompts);
    }

    if (elements.generateStickmanPromptsBtn) {
        elements.generateStickmanPromptsBtn.addEventListener('click', generateStickmanPrompts);
    }

    if (elements.generateStickmanTopicsBtn) {
        elements.generateStickmanTopicsBtn.addEventListener('click', generateStickmanTopics);
    }

    if (elements.copyAllStickmanPromptsBtn) {
        elements.copyAllStickmanPromptsBtn.addEventListener('click', async () => {
            const prompts = Array.from(document.querySelectorAll('.stickman-prompt-textarea'))
                .map(textarea => textarea.value.trim())
                .filter(Boolean);
            if (!prompts.length) return;
            await navigator.clipboard.writeText(prompts.map((prompt, index) => `## ${index === 0 ? 'Cover' : `Slide ${index + 1}`} Image Prompt\n\n${prompt}`).join('\n\n'));
            showNotification('All Stickman prompts copied!', 'success');
        });
    }

    if (elements.copyAllDbtCarouselPromptsBtn) {
        elements.copyAllDbtCarouselPromptsBtn.addEventListener('click', () => {
            const allPrompts = getAllDbtCarouselPromptText();
            if (!allPrompts) {
                showNotification('Generate DBT image prompts first.', 'error');
                return;
            }
            navigator.clipboard.writeText(allPrompts);
            showNotification('All DBT image prompts copied!', 'success');
        });
    }

    // Generate AI images
    if (elements.generateAiImagesBtn) {
        elements.generateAiImagesBtn.addEventListener('click', generateAiImages);
    }

    // Download buttons
    if (elements.downloadAllBtn) {
        elements.downloadAllBtn.addEventListener('click', downloadAllSlides);
    }

    if (elements.downloadCurrentBtn) {
        elements.downloadCurrentBtn.addEventListener('click', downloadCurrentSlide);
    }

    // File upload
    if (elements.dropzone) {
        elements.dropzone.addEventListener('click', () => elements.fileInput.click());
        elements.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.dropzone.classList.add('drag-over');
        });
        elements.dropzone.addEventListener('dragleave', () => {
            elements.dropzone.classList.remove('drag-over');
        });
        elements.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.dropzone.classList.remove('drag-over');
            handleFileUpload(e.dataTransfer.files);
        });
    }

    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
        });
    }

    if (elements.createSlideCountBtn) {
        elements.createSlideCountBtn.addEventListener('click', () => {
            buildSlidesToCount(elements.slideCountInput?.value || 1);
        });
    }

    if (elements.slideCountInput) {
        elements.slideCountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buildSlidesToCount(elements.slideCountInput?.value || 1);
            }
        });
    }

    if (elements.addSlideBtn) {
        elements.addSlideBtn.addEventListener('click', () => {
            if (!state.slides.length) {
                insertNewSlide(-1);
                return;
            }
            insertNewSlide(state.currentSlideIndex);
        });
    }

    if (elements.uploadSlideImageBtn) {
        elements.uploadSlideImageBtn.addEventListener('click', () => elements.slideImageFileInput?.click());
    }

    if (elements.slideImageFileInput) {
        elements.slideImageFileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files || []);
            e.target.value = '';
        });
    }

    if (elements.clearSlideImageBtn) {
        elements.clearSlideImageBtn.addEventListener('click', clearCurrentSlideImage);
    }

    if (elements.selectedSlideTextInput) {
        elements.selectedSlideTextInput.addEventListener('input', handleSelectedSlideTextInput);
    }

    if (elements.selectedSlideFontSizeInput) {
        elements.selectedSlideFontSizeInput.addEventListener('input', handleSelectedSlideFontSizeInput);
    }

    // Anchor upload
    if (elements.uploadAnchorBtn) {
        elements.uploadAnchorBtn.addEventListener('click', () => elements.anchorFileInput.click());
    }

    if (elements.anchorFileInput) {
        elements.anchorFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                handleAnchorUpload(e.target.files[0]);
            }
        });
    }

    if (elements.clearAnchorBtn) {
        elements.clearAnchorBtn.addEventListener('click', clearCharacterAnchor);
    }

    // Style controls
    if (elements.fontSizeInput) {
        elements.fontSizeInput.addEventListener('input', (e) => {
            const nextFontSize = parseInt(e.target.value, 10);
            const valueDisplay = document.getElementById('font-size-value');
            const sypValueDisplay = document.getElementById('font-size-value_syp');
            if (valueDisplay) valueDisplay.textContent = e.target.value + 'px';
            if (sypValueDisplay) sypValueDisplay.textContent = e.target.value + 'px';
            // Sync with SYP slider
            if (elements.fontSizeInputSyp) {
                elements.fontSizeInputSyp.value = e.target.value;
            }
            if (!Number.isNaN(nextFontSize)) {
                state.slides.forEach((slide) => {
                    slide.fontSize = nextFontSize;
                });
            }
            renderSlidesPreview();
            updateSelectedSlideEditor();
        });
    }

    if (elements.textColorInput) {
        elements.textColorInput.addEventListener('input', (e) => {
            state.textStyleCustomized = true;
            if (elements.textColorInputSyp) elements.textColorInputSyp.value = e.target.value;
            if (elements.previewTextColorInput) elements.previewTextColorInput.value = e.target.value;
            renderSlidesPreview();
        });
    }

    if (elements.bgColorInput) {
        elements.bgColorInput.addEventListener('input', (e) => {
            if (elements.bgColorInputSyp) elements.bgColorInputSyp.value = e.target.value;
            if (elements.previewBgColorInput) elements.previewBgColorInput.value = e.target.value;
            renderSlidesPreview();
        });
    }

    if (elements.textFontFamilySelect) {
        elements.textFontFamilySelect.addEventListener('change', (e) => {
            state.textStyleCustomized = true;
            if (elements.textFontFamilySelectSyp) elements.textFontFamilySelectSyp.value = e.target.value;
            if (elements.previewTextFontFamilySelect) elements.previewTextFontFamilySelect.value = e.target.value;
            renderSlidesPreview();
        });
    }

    if (elements.textOutlineToggle) {
        elements.textOutlineToggle.addEventListener('change', (e) => {
            state.textStyleCustomized = true;
            if (elements.textOutlineToggleSyp) elements.textOutlineToggleSyp.checked = e.target.checked;
            if (elements.previewTextOutlineToggle) elements.previewTextOutlineToggle.checked = e.target.checked;
            renderSlidesPreview();
        });
    }

    if (elements.previewTextColorInput) {
        elements.previewTextColorInput.addEventListener('input', () => {
            state.textStyleCustomized = true;
            syncLegacyTextStyleControlsFromPreview();
            renderSlidesPreview();
        });
    }

    if (elements.previewBgColorInput) {
        elements.previewBgColorInput.addEventListener('input', () => {
            syncLegacyTextStyleControlsFromPreview();
            renderSlidesPreview();
        });
    }

    if (elements.previewTextFontFamilySelect) {
        elements.previewTextFontFamilySelect.addEventListener('change', () => {
            state.textStyleCustomized = true;
            syncLegacyTextStyleControlsFromPreview();
            renderSlidesPreview();
        });
    }

    if (elements.previewTextOutlineToggle) {
        elements.previewTextOutlineToggle.addEventListener('change', () => {
            state.textStyleCustomized = true;
            syncLegacyTextStyleControlsFromPreview();
            renderSlidesPreview();
        });
    }

    // One-click text color presets (soft yellow / pure dark) under the outline toggle.
    document.querySelectorAll('.preview-color-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            if (!color) return;
            state.textStyleCustomized = true;
            setTextOverlayControls({ textColor: color });
            renderSlidesPreview();
        });
    });

    // SYP Style controls - sync with main controls
    if (elements.fontSizeInputSyp) {
        elements.fontSizeInputSyp.addEventListener('input', (e) => {
            const nextFontSize = parseInt(e.target.value, 10);
            // Sync with main slider
            if (elements.fontSizeInput) {
                elements.fontSizeInput.value = e.target.value;
            }
            const valueDisplay = document.getElementById('font-size-value_syp');
            const mainValueDisplay = document.getElementById('font-size-value');
            if (valueDisplay) valueDisplay.textContent = e.target.value + 'px';
            if (mainValueDisplay) mainValueDisplay.textContent = e.target.value + 'px';
            if (!Number.isNaN(nextFontSize)) {
                state.slides.forEach((slide) => {
                    slide.fontSize = nextFontSize;
                });
            }
            renderSlidesPreview();
            updateSelectedSlideEditor();
        });
    }

    if (elements.textColorInputSyp) {
        elements.textColorInputSyp.addEventListener('input', (e) => {
            state.textStyleCustomized = true;
            if (elements.textColorInput) elements.textColorInput.value = e.target.value;
            if (elements.previewTextColorInput) elements.previewTextColorInput.value = e.target.value;
            renderSlidesPreview();
        });
    }

    if (elements.bgColorInputSyp) {
        elements.bgColorInputSyp.addEventListener('input', (e) => {
            if (elements.bgColorInput) elements.bgColorInput.value = e.target.value;
            if (elements.previewBgColorInput) elements.previewBgColorInput.value = e.target.value;
            renderSlidesPreview();
        });
    }

    if (elements.textFontFamilySelectSyp) {
        elements.textFontFamilySelectSyp.addEventListener('change', (e) => {
            if (elements.textFontFamilySelect) elements.textFontFamilySelect.value = e.target.value;
            if (elements.previewTextFontFamilySelect) elements.previewTextFontFamilySelect.value = e.target.value;
            renderSlidesPreview();
        });
    }

    if (elements.textOutlineToggleSyp) {
        elements.textOutlineToggleSyp.addEventListener('change', (e) => {
            state.textStyleCustomized = true;
            if (elements.textOutlineToggle) elements.textOutlineToggle.checked = e.target.checked;
            if (elements.previewTextOutlineToggle) elements.previewTextOutlineToggle.checked = e.target.checked;
            renderSlidesPreview();
        });
    }

    if (elements.textWidthInput) {
        elements.textWidthInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const display = document.getElementById('text-width-value');
            const sypDisplay = document.getElementById('text-width-value_syp');
            if (display) display.textContent = val + '%';
            if (sypDisplay) sypDisplay.textContent = val + '%';
            if (elements.textWidthInputSyp) elements.textWidthInputSyp.value = val;

            // Apply to all slides that don't have a custom width yet, or just update state
            state.slides.forEach(s => s.maxWidth = parseInt(val));
            renderSlidesPreview();
        });
    }

    if (elements.textWidthInputSyp) {
        elements.textWidthInputSyp.addEventListener('input', (e) => {
            const val = e.target.value;
            const display = document.getElementById('text-width-value');
            const sypDisplay = document.getElementById('text-width-value_syp');
            if (display) display.textContent = val + '%';
            if (sypDisplay) sypDisplay.textContent = val + '%';
            if (elements.textWidthInput) elements.textWidthInput.value = val;

            state.slides.forEach(s => s.maxWidth = parseInt(val));
            renderSlidesPreview();
        });
    }

    if (elements.darkOverlayInput) {
        elements.darkOverlayInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const display = document.getElementById('dark-overlay-value');
            const sypDisplay = document.getElementById('dark-overlay-value_syp');
            if (display) display.textContent = val + '%';
            if (sypDisplay) sypDisplay.textContent = val + '%';
            if (elements.darkOverlayInputSyp) elements.darkOverlayInputSyp.value = val;
            renderSlidesPreview();
        });
    }

    if (elements.darkOverlayInputSyp) {
        elements.darkOverlayInputSyp.addEventListener('input', (e) => {
            const val = e.target.value;
            const display = document.getElementById('dark-overlay-value');
            const sypDisplay = document.getElementById('dark-overlay-value_syp');
            if (display) display.textContent = val + '%';
            if (sypDisplay) sypDisplay.textContent = val + '%';
            if (elements.darkOverlayInput) elements.darkOverlayInput.value = val;
            renderSlidesPreview();
        });
    }

    // Parse slides
    if (elements.parseSlidesBtn) {
        elements.parseSlidesBtn.addEventListener('click', async () => {
            const text = elements.slideTextInput.value;
            state.slides = parseSlidesFromText(text).map((slide, index) => ({
                ...slide,
                id: Date.now() + index,
                image: state.generatedImages[index] || null, // Attach generated image if available
                position: getDefaultSlidePosition(index),
                scale: 1.5,
                maxWidth: 120,
                fontSize: null
            }));
            syncDbtStaticSlides();
            applyStaticSlides();
            if (isVentNowStyleFlow()) {
                try {
                    await assignVentNowStaticSlides(state.slides.length);
                } catch (error) {
                    console.error('Error assigning Vent Now static images:', error);
                    showNotification('Failed to assign Vent Now static images.', 'error');
                }
            }
            renderSlidesPreview();

            if (elements.hookContextStatus) {
                elements.hookContextStatus.style.display = 'flex';
                elements.hookContextStatus.querySelector('.status-text').textContent =
                    `Using ${state.slides.length} slides for context`;
            }

            showNotification(`Parsed ${state.slides.length} slides`, 'success');
        });
    }

    if (elements.characterPreset) {
        elements.characterPreset.addEventListener('change', () => {
            setSelectedDbtCharacterValue(elements.characterPreset.value || 'hannahbpd');
            syncDbtHookImageControl();
            syncDbtStaticSlides();
            applyStaticSlides();
            renderImagePrompts();
            renderSlidesPreview();
            showNotification(`DBT character switched to ${getDbtCharacterTemplate().label}`, 'success');
        });
    }

    if (elements.characterPresetStep1) {
        elements.characterPresetStep1.addEventListener('change', () => {
            setSelectedDbtCharacterValue(elements.characterPresetStep1.value || 'hannahbpd');
            syncDbtHookImageControl();
            syncDbtStaticSlides();
            applyStaticSlides();
            renderImagePrompts();
            renderSlidesPreview();
            showNotification(`DBT character switched to ${getDbtCharacterTemplate().label}`, 'success');
        });
    }

    if (elements.dbtHookImageSelect) {
        elements.dbtHookImageSelect.addEventListener('change', () => {
            state.selectedDbtHookImage = elements.dbtHookImageSelect.value || 'default';
            setSelectedDbtHookImageValue(state.selectedDbtHookImage);
            syncDbtStaticSlides();
            applyStaticSlides();
            renderSlidesPreview();

            const hookImageLabel = getSelectedDbtHookImageConfig().label;
            showNotification(`Slide 1 hook image set to ${hookImageLabel}`, 'success');
        });
    }

    if (elements.dbtHookImageSelectStep1) {
        elements.dbtHookImageSelectStep1.addEventListener('change', () => {
            state.selectedDbtHookImage = elements.dbtHookImageSelectStep1.value || 'default';
            setSelectedDbtHookImageValue(state.selectedDbtHookImage);
            syncDbtStaticSlides();
            applyStaticSlides();
            renderSlidesPreview();

            const hookImageLabel = getSelectedDbtHookImageConfig().label;
            showNotification(`Slide 1 hook image set to ${hookImageLabel}`, 'success');
        });
    }

    if (elements.flowSelect) {
        elements.flowSelect.addEventListener('change', () => {
            state.currentDbtSlideType = getAvailableDbtSlideTypes().includes(elements.flowSelect.value)
                ? elements.flowSelect.value
                : 'weird_hack_v2';
            if (elements.dbtSlideTypeSelect) {
                elements.dbtSlideTypeSelect.value = state.currentDbtSlideType;
            }
            syncDbtSlideTypeUI();
            syncDbtHookImageControl();
            syncDbtStaticSlides();
            applyStaticSlides();
            renderImagePrompts();
            renderSlidesPreview();
        });
    }

    // Quick improve hook
    if (elements.quickImproveHookBtn) {
        elements.quickImproveHookBtn.addEventListener('click', improveHooks);
    }

    if (elements.quickImproveAppMentionBtn) {
        elements.quickImproveAppMentionBtn.addEventListener('click', improveAppMention);
    }

    // Metadata
    if (elements.generateMetadataBtn) {
        elements.generateMetadataBtn.addEventListener('click', generateMetadata);
    }

    if (elements.copyMetadataBtn) {
        elements.copyMetadataBtn.addEventListener('click', copyMetadata);
    }

    // Slides container - edit, delete, and download individual slides
    elements.slidesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-slide-btn')) {
            const index = parseInt(e.target.dataset.index);
            shiftStaticSlides(index, -1);
            state.slides.splice(index, 1);
            state.generatedImages.splice(index, 1);
            state.selectedRefIndices = state.selectedRefIndices
                .filter((idx) => idx !== index)
                .map((idx) => (idx > index ? idx - 1 : idx));
            syncActiveSlidesTextarea();
            renderSlideBuilderList();
            renderSlidesPreview();
            setCurrentSlideIndex(Math.max(0, index - 1));
            showNotification('Slide deleted', 'info');
        }

        if (e.target.classList.contains('edit-slide-btn')) {
            const index = parseInt(e.target.dataset.index);
            setCurrentSlideIndex(index);
            elements.selectedSlideTextInput?.focus();
            elements.selectedSlideTextInput?.select();
        }

        if (e.target.classList.contains('reset-scale-btn')) {
            const index = parseInt(e.target.dataset.index);
            state.slides[index].scale = 1.5;
            state.slides[index].maxWidth = 120;
            renderSlidesPreview();
            showNotification(`Reset text to default size`, 'success');
        }

        if (e.target.classList.contains('download-slide-btn')) {
            const index = parseInt(e.target.dataset.index);
            downloadSlideByIndex(index);
        }

        // SS: per-slide custom photo upload (select that slide, then open the file picker)
        const ssUploadBtn = e.target.closest('.ss-upload-btn');
        if (ssUploadBtn) {
            setCurrentSlideIndex(parseInt(ssUploadBtn.dataset.index, 10));
            elements.slideImageFileInput?.click();
        }

        // SS: shuffle only the hook photo from the hook folder
        const ssShuffleBtn = e.target.closest('.ss-shuffle-hook-btn');
        if (ssShuffleBtn) {
            ssShuffleHookPhoto(parseInt(ssShuffleBtn.dataset.index, 10));
        }
    });

    // Little Habits sticker controls
    elements.slidesContainer.addEventListener('click', (e) => {
        const regenBtn = e.target.closest('.lh-sticker-regen');
        if (regenBtn) {
            const slideIndex = parseInt(regenBtn.dataset.slideIndex, 10);
            const stickerIndex = parseInt(regenBtn.dataset.stickerIndex, 10);
            const sticker = state.slides[slideIndex]?.stickers?.[stickerIndex];
            if (sticker?.prompt) {
                generateLittleHabitsStickers({
                    singleJob: { slideIndex, stickerIndex, prompt: sticker.prompt, slot: sticker.slot }
                });
            }
            return;
        }

        const deleteBtn = e.target.closest('.lh-sticker-delete');
        if (deleteBtn) {
            const slideIndex = parseInt(deleteBtn.dataset.slideIndex, 10);
            const stickerIndex = parseInt(deleteBtn.dataset.stickerIndex, 10);
            state.slides[slideIndex]?.stickers?.splice(stickerIndex, 1);
            state.lhSelectedSticker = null;
            renderSlidesPreview();
            return;
        }

        const addBtn = e.target.closest('.lh-sticker-add');
        if (addBtn) {
            const slideIndex = parseInt(addBtn.dataset.slideIndex, 10);
            const input = elements.slidesContainer.querySelector(`.lh-sticker-new-prompt[data-slide-index="${slideIndex}"]`);
            const prompt = input?.value.trim();
            const slide = state.slides[slideIndex];
            if (!prompt || !slide) return;
            if (!Array.isArray(slide.stickers)) slide.stickers = [];
            const newSticker = createLhSticker({ prompt, slot: 'center' });
            slide.stickers.push(newSticker);
            if (elements.lhMockMode?.checked) {
                newSticker.image = createLhMockStickerImage(prompt);
                renderSlidesPreview();
            } else {
                generateLittleHabitsStickers({
                    singleJob: { slideIndex, stickerIndex: slide.stickers.length - 1, prompt, slot: 'center' }
                });
            }
        }
    });

    elements.slidesContainer.addEventListener('input', (e) => {
        if (!e.target.classList.contains('lh-sticker-size') && !e.target.classList.contains('lh-sticker-rotation')) return;
        const slideIndex = parseInt(e.target.dataset.slideIndex, 10);
        const stickerIndex = parseInt(e.target.dataset.stickerIndex, 10);
        const sticker = state.slides[slideIndex]?.stickers?.[stickerIndex];
        if (!sticker) return;
        const wrap = elements.slidesContainer.querySelector(`.lh-sticker-wrap[data-slide-index="${slideIndex}"][data-sticker-index="${stickerIndex}"]`);
        if (e.target.classList.contains('lh-sticker-size')) {
            sticker.scale = parseFloat(e.target.value) || 1;
            if (wrap) {
                wrap.style.width = `${getLhStickerBaseWidthPct(sticker.slot) * sticker.scale}%`;
            }
        } else {
            sticker.rotation = parseFloat(e.target.value) || 0;
            if (wrap) {
                wrap.style.transform = `translate(-50%, -50%) rotate(${sticker.rotation}deg)`;
            }
        }
    });

    elements.slidesContainer.addEventListener('change', (e) => {
        if (!e.target.classList.contains('lh-sticker-slot')) return;
        const slideIndex = parseInt(e.target.dataset.slideIndex, 10);
        const stickerIndex = parseInt(e.target.dataset.stickerIndex, 10);
        const sticker = state.slides[slideIndex]?.stickers?.[stickerIndex];
        if (!sticker) return;
        const slot = e.target.value.trim().toLowerCase();
        sticker.slot = LH_SLOT_ANCHORS[slot] ? slot : 'center';
        sticker.dx = 0;
        sticker.dy = 0;
        renderSlidesPreview();
    });

    // Little Habits sticker manipulation: drag to move, handles to tilt/resize (click selects)
    elements.slidesContainer.addEventListener('mousedown', (e) => {
        const wrap = e.target.closest('.lh-sticker-wrap');
        if (!wrap) return;
        const slideIndex = parseInt(wrap.dataset.slideIndex, 10);
        const stickerIndex = parseInt(wrap.dataset.stickerIndex, 10);
        const sticker = state.slides[slideIndex]?.stickers?.[stickerIndex];
        const previewEl = wrap.closest('.slide-preview');
        if (!sticker || !previewEl) return;

        e.preventDefault();
        const rect = previewEl.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const centerX = wrapRect.left + wrapRect.width / 2;
        const centerY = wrapRect.top + wrapRect.height / 2;
        const mode = e.target.closest('.lh-rotate-handle')
            ? 'rotate'
            : e.target.closest('.lh-resize-handle')
                ? 'resize'
                : 'move';
        const startX = e.clientX;
        const startY = e.clientY;
        const startDx = sticker.dx || 0;
        const startDy = sticker.dy || 0;
        const startScale = sticker.scale || 1;
        const startRotation = sticker.rotation ?? getLhStickerRotation(stickerIndex);
        const startPointerAngle = Math.atan2(startY - centerY, startX - centerX);
        const startDist = Math.max(10, Math.hypot(startX - centerX, startY - centerY));
        let moved = false;

        const onMove = (moveEvent) => {
            if (Math.abs(moveEvent.clientX - startX) > 2 || Math.abs(moveEvent.clientY - startY) > 2) {
                moved = true;
            }

            if (mode === 'move') {
                const deltaXPct = ((moveEvent.clientX - startX) / rect.width) * 100;
                const deltaYPct = ((moveEvent.clientY - startY) / rect.height) * 100;
                sticker.dx = Math.max(-60, Math.min(60, startDx + deltaXPct));
                sticker.dy = Math.max(-60, Math.min(60, startDy + deltaYPct));
                const anchor = getLhSlotAnchor(sticker.slot);
                wrap.style.left = `${anchor.x + sticker.dx}%`;
                wrap.style.top = `${anchor.y + sticker.dy}%`;
            } else if (mode === 'rotate') {
                const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
                const deltaDeg = ((angle - startPointerAngle) * 180) / Math.PI;
                let nextRotation = Math.round(startRotation + deltaDeg);
                if (nextRotation > 180) nextRotation -= 360;
                if (nextRotation < -180) nextRotation += 360;
                sticker.rotation = nextRotation;
                wrap.style.transform = `translate(-50%, -50%) rotate(${sticker.rotation}deg)`;
            } else {
                const dist = Math.max(10, Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY));
                sticker.scale = Math.max(0.3, Math.min(3, startScale * (dist / startDist)));
                wrap.style.width = `${getLhStickerBaseWidthPct(sticker.slot) * sticker.scale}%`;
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            state.isDragging = true;
            setTimeout(() => { state.isDragging = false; }, 0);
            if (moved) {
                renderSlidesPreview();
            } else if (mode === 'move') {
                const alreadySelected = state.lhSelectedSticker
                    && state.lhSelectedSticker.slideIndex === slideIndex
                    && state.lhSelectedSticker.stickerIndex === stickerIndex;
                state.lhSelectedSticker = alreadySelected ? null : { slideIndex, stickerIndex };
                renderSlidesPreview();
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // Little Habits text dragging: headline and caption can be moved freely per slide
    elements.slidesContainer.addEventListener('mousedown', (e) => {
        const textEl = e.target.closest('[data-lh-text]');
        if (!textEl) return;
        const slideIndex = parseInt(textEl.dataset.slideIndex, 10);
        const kind = textEl.dataset.lhText;
        const slide = state.slides[slideIndex];
        const previewEl = textEl.closest('.slide-preview');
        if (!slide || !previewEl) return;

        e.preventDefault();
        const rect = previewEl.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startOffset = getLhTextOffset(slide, kind);
        const baseTop = kind === 'headline' ? getLhHeadlineCenterPct(slideIndex) : getLhCaptionCenterPct(slideIndex);
        let moved = false;

        const onMove = (moveEvent) => {
            const deltaXPct = ((moveEvent.clientX - startX) / rect.width) * 100;
            const deltaYPct = ((moveEvent.clientY - startY) / rect.height) * 100;
            if (Math.abs(moveEvent.clientX - startX) > 2 || Math.abs(moveEvent.clientY - startY) > 2) {
                moved = true;
            }
            const dx = Math.max(-40, Math.min(40, startOffset.dx + deltaXPct));
            const dy = Math.max(-70, Math.min(70, startOffset.dy + deltaYPct));
            setLhTextOffset(slide, kind, dx, dy);
            textEl.style.left = `${50 + dx}%`;
            textEl.style.top = `${baseTop + dy}%`;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (moved) {
                state.isDragging = true;
                setTimeout(() => { state.isDragging = false; }, 0);
                renderSlidesPreview();
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // The Script text dragging: every rendered text block can be moved independently
    // with the same slide-relative offsets used by the canvas export. Pointer events
    // keep this working with mouse, pen, and touch input.
    elements.slidesContainer.addEventListener('pointerdown', (e) => {
        const paraEl = e.target.closest('[data-ts-text]');
        if (!paraEl || e.button !== 0) return;

        const slideIndex = parseInt(paraEl.dataset.slideIndex, 10);
        const blockIndex = parseInt(paraEl.dataset.tsText, 10);
        const slide = state.slides[slideIndex];
        const previewEl = paraEl.closest('.ts-slide-preview');
        if (!slide || !previewEl) return;

        e.preventDefault();
        state.currentSlideIndex = slideIndex;
        document.querySelectorAll('.slide-editor').forEach((card, i) => {
            card.classList.toggle('selected', i === slideIndex);
        });

        const rect = previewEl.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startOffset = getTsTextOffset(slide, blockIndex);
        const pointerId = e.pointerId;
        let moved = false;

        paraEl.classList.add('is-dragging');
        paraEl.setPointerCapture?.(pointerId);

        const updateOffset = (dx, dy) => {
            setTsTextOffset(slide, blockIndex, dx, dy);
            const tsSlide = state.tsSlides?.[slideIndex];
            if (tsSlide && tsSlide !== slide) setTsTextOffset(tsSlide, blockIndex, dx, dy);
            paraEl.style.left = `${dx}%`;
            paraEl.style.top = `${dy}%`;
        };

        const onMove = (moveEvent) => {
            if (moveEvent.pointerId !== pointerId) return;
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) moved = true;

            const dx = Math.max(-60, Math.min(60, startOffset.dx + (deltaX / rect.width) * 100));
            const dy = Math.max(-70, Math.min(70, startOffset.dy + (deltaY / rect.height) * 100));
            updateOffset(dx, dy);
        };

        const cleanup = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onCancel);
            paraEl.classList.remove('is-dragging');
            try { paraEl.releasePointerCapture?.(pointerId); } catch (_) { /* already released */ }
        };

        const onUp = (upEvent) => {
            if (upEvent.pointerId !== pointerId) return;
            cleanup();
            if (moved) {
                state.isDragging = true;
                setTimeout(() => { state.isDragging = false; }, 0);
                renderSlidesPreview();
            }
        };

        const onCancel = (cancelEvent) => {
            if (cancelEvent.pointerId !== pointerId) return;
            cleanup();
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
    });

    // Double-click a Script text block to restore its natural position.
    elements.slidesContainer.addEventListener('dblclick', (e) => {
        const paraEl = e.target.closest('[data-ts-text]');
        if (!paraEl) return;
        const slideIndex = parseInt(paraEl.dataset.slideIndex, 10);
        const blockIndex = parseInt(paraEl.dataset.tsText, 10);
        const slide = state.slides[slideIndex];
        if (!slide) return;
        setTsTextOffset(slide, blockIndex, 0, 0);
        const tsSlide = state.tsSlides?.[slideIndex];
        if (tsSlide && tsSlide !== slide) setTsTextOffset(tsSlide, blockIndex, 0, 0);
        renderSlidesPreview();
    });

    // Slideshow text: drag anywhere on the text to move the whole block, resize it via
    // the corner handle. Same interaction model as the main editor (Storytelling GF v2).
    elements.slidesContainer.addEventListener('mousedown', (e) => {
        const overlayEl = e.target.closest('.ss-overlay-text');
        if (!overlayEl) return;
        const slideIndex = parseInt(overlayEl.dataset.ssOverlay, 10);
        const slide = state.slides[slideIndex];
        const previewEl = overlayEl.closest('.slide-preview');
        if (!slide || !previewEl) return;

        const rect = previewEl.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        e.preventDefault();

        // Corner handle — scale the whole text block
        if (e.target.closest('.ss-resize-handle')) {
            const overlayRect = overlayEl.getBoundingClientRect();
            const centerX = overlayRect.left + overlayRect.width / 2;
            const centerY = overlayRect.top + overlayRect.height / 2;
            const startDistance = Math.max(1, Math.hypot(startX - centerX, startY - centerY));
            const startScale = slide.ssTextScale || 1;
            const indicator = overlayEl.querySelector('.scale-indicator');

            const onMove = (moveEvent) => {
                moved = true;
                const currentDistance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
                const newScale = Math.max(0.5, Math.min(2, startScale * (currentDistance / startDistance)));
                slide.ssTextScale = newScale;
                overlayEl.style.transform = `translate(-50%, -50%) scale(${newScale})`;
                if (indicator) indicator.textContent = `${Math.round(newScale * 100)}%`;
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (moved) {
                    state.isDragging = true;
                    setTimeout(() => { state.isDragging = false; }, 0);
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            return;
        }

        // Anywhere else on the text — move the whole block freely
        const startPos = slide.position || { x: 50, y: 50 };
        overlayEl.classList.add('is-dragging');
        const onMove = (moveEvent) => {
            if (Math.abs(moveEvent.clientX - startX) > 2 || Math.abs(moveEvent.clientY - startY) > 2) {
                moved = true;
            }
            const deltaXPct = ((moveEvent.clientX - startX) / rect.width) * 100;
            const deltaYPct = ((moveEvent.clientY - startY) / rect.height) * 100;
            const newX = Math.max(10, Math.min(90, startPos.x + deltaXPct));
            const newY = Math.max(10, Math.min(90, startPos.y + deltaYPct));
            slide.position = { x: newX, y: newY };
            overlayEl.style.left = `${newX}%`;
            overlayEl.style.top = `${newY}%`;
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            overlayEl.classList.remove('is-dragging');
            if (moved) {
                state.isDragging = true;
                setTimeout(() => { state.isDragging = false; }, 0);
            }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // Double-click the text block to reset its position and size.
    elements.slidesContainer.addEventListener('dblclick', (e) => {
        const overlayEl = e.target.closest('.ss-overlay-text');
        if (!overlayEl) return;
        const slide = state.slides[parseInt(overlayEl.dataset.ssOverlay, 10)];
        if (!slide) return;
        slide.position = { x: 50, y: 50 };
        slide.ssTextScale = 1;
        overlayEl.style.left = '50%';
        overlayEl.style.top = '50%';
        overlayEl.style.transform = 'translate(-50%, -50%) scale(1)';
        const indicator = overlayEl.querySelector('.scale-indicator');
        if (indicator) indicator.textContent = '100%';
    });

    // Clicking empty slide area deselects the active sticker
    elements.slidesContainer.addEventListener('click', (e) => {
        if (!state.lhSelectedSticker) return;
        if (state.isDragging) return;
        if (e.target.closest('.lh-sticker-wrap')) return;
        if (!e.target.closest('.lh-slide-preview')) return;
        state.lhSelectedSticker = null;
        renderSlidesPreview();
    });

    // Select slide on click (if not dragging)
    elements.slidesContainer.addEventListener('click', (e) => {
        if (state.isDragging) return;

        const slideCard = e.target.closest('.slide-editor');
        if (slideCard && !e.target.closest('.slide-actions')) {
            const index = parseInt(slideCard.dataset.index);
            setCurrentSlideIndex(index);
        }
    });

    // Global drag move and end listeners
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    // Little Habits Listeners
    if (elements.lhGenerateBtn) {
        elements.lhGenerateBtn.addEventListener('click', generateLhFormatCarousel);
    }

    if (elements.lhLegacyGenerateBtn) {
        elements.lhLegacyGenerateBtn.addEventListener('click', generateNativeSlides);
    }

    if (elements.lhCopyCaptionBtn) {
        elements.lhCopyCaptionBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(state.lhCaption || '');
            showNotification('Caption copied', 'success');
        });
    }

    if (elements.lhCopyPinnedBtn) {
        elements.lhCopyPinnedBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(state.lhPinnedComment || '');
            showNotification('Pinned comment copied', 'success');
        });
    }

    if (elements.lhTopicSelect) {
        elements.lhTopicSelect.addEventListener('change', () => {
            state.currentTopic = elements.lhTopicSelect.value;
        });
    }

    if (elements.lhRegenStickersBtn) {
        elements.lhRegenStickersBtn.addEventListener('click', () => generateLittleHabitsStickers());
    }

    if (elements.lhMockStickersBtn) {
        elements.lhMockStickersBtn.addEventListener('click', fillLittleHabitsMockStickers);
    }

    if (elements.lhRegenAllStickersBtn) {
        elements.lhRegenAllStickersBtn.addEventListener('click', () => generateLittleHabitsStickers({ onlyMissing: false }));
    }

    if (elements.lhGenerateMetadataBtn) {
        elements.lhGenerateMetadataBtn.addEventListener('click', generateMetadata);
    }

    if (elements.lhCopyMetadataBtn) {
        elements.lhCopyMetadataBtn.addEventListener('click', copyMetadata);
    }

    if (elements.lhDownloadAllBtn) {
        elements.lhDownloadAllBtn.addEventListener('click', downloadAllSlides);
    }

    if (elements.ssDownloadAllBtn) {
        elements.ssDownloadAllBtn.addEventListener('click', downloadAllSlides);
    }

    if (elements.floatingDownloadBtn) {
        elements.floatingDownloadBtn.addEventListener('click', downloadAllSlides);
    }

    if (elements.ssCopyTitleBtn) {
        elements.ssCopyTitleBtn.addEventListener('click', () => {
            const text = [state.ssTitle, (state.ssHashtags || []).join(' ')].filter(Boolean).join(' ');
            navigator.clipboard.writeText(text)
                .then(() => showNotification('Title + hashtags copied!', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    // Slideshows (ss) Listeners
    document.querySelectorAll('#panel-ss .ss-workflow-tab').forEach((tab) => {
        tab.addEventListener('click', () => setSsWorkflowSection(tab.dataset.ssSection));
    });

    if (elements.ssSoundRefresh) {
        elements.ssSoundRefresh.addEventListener('click', () => loadSsSounds(false).catch(() => {}));
    }
    if (elements.ssFormatSelect) {
        elements.ssFormatSelect.addEventListener('change', syncSsFormatChoice);
        syncSsFormatChoice();
    }

    if (elements.ssOpenLegacyBtn) {
        elements.ssOpenLegacyBtn.addEventListener('click', () => {
            generateSsSlideshow('legacy');
        });
    }

    if (elements.ssGenerateTopicSeedsBtn) {
        elements.ssGenerateTopicSeedsBtn.addEventListener('click', generateSsTopicSeeds);
    }

    if (elements.ssGenerateBtn) {
        elements.ssGenerateBtn.addEventListener('click', () => {
            generateSsSlideshow(elements.ssFormatSelect?.value || 'current');
        });
    }

    if (elements.ssCopyAllBtn) {
        elements.ssCopyAllBtn.addEventListener('click', () => {
            const parts = (state.ssSlides || []).map(slide => `Slide ${slide.n}:\n${slide.text}`);
            if (state.ssCaption) parts.push(`Caption:\n${state.ssCaption}`);
            if (state.ssPinnedComment) parts.push(`Pinned comment:\n${state.ssPinnedComment}`);
            navigator.clipboard.writeText(parts.join('\n\n'))
                .then(() => showNotification('All slide texts copied!', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    // The Script (ts) Listeners
    if (elements.tsGenerateBtn) {
        elements.tsGenerateBtn.addEventListener('click', generateTheScriptSlideshow);
    }

    if (elements.tsPaperSelect) {
        elements.tsPaperSelect.addEventListener('change', () => {
            if (!state.tsSlides?.length) return;
            const requested = elements.tsPaperSelect.value || 'random';
            state.tsPaperTint = requested !== 'random' && TS_PAPER_TINTS[requested]
                ? requested
                : TS_PAPER_TINT_IDS[Math.floor(Math.random() * TS_PAPER_TINT_IDS.length)];
            renderTheScriptSlides(state.tsSlides);
        });
    }

    // Background mode: notes paper (default) or one photo on every slide. Switching to
    // photo without an image yet opens the picker directly.
    if (elements.tsBgModeSelect) {
        elements.tsBgModeSelect.addEventListener('change', () => {
            const mode = elements.tsBgModeSelect.value === 'photo' ? 'photo' : 'paper';
            state.tsBgMode = mode;
            syncTsBgControls();
            if (mode === 'photo' && !state.tsBgImage) {
                elements.tsBgFileInput?.click();
            }
            renderSlidesPreview();
        });
    }

    if (elements.tsBgUploadBtn) {
        elements.tsBgUploadBtn.addEventListener('click', () => elements.tsBgFileInput?.click());
    }

    if (elements.tsBgFileInput) {
        elements.tsBgFileInput.addEventListener('change', () => {
            const file = elements.tsBgFileInput.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                state.tsBgImage = reader.result;
                state.tsBgMode = 'photo';
                if (elements.tsBgModeSelect) elements.tsBgModeSelect.value = 'photo';
                syncTsBgControls();
                renderSlidesPreview();
                showNotification('Background photo applied to all slides', 'success');
            };
            reader.onerror = () => showNotification('Failed to read photo', 'error');
            reader.readAsDataURL(file);
            elements.tsBgFileInput.value = '';
        });
    }

    if (elements.tsBgClearBtn) {
        elements.tsBgClearBtn.addEventListener('click', () => {
            state.tsBgImage = null;
            state.tsBgMode = 'paper';
            if (elements.tsBgModeSelect) elements.tsBgModeSelect.value = 'paper';
            syncTsBgControls();
            renderSlidesPreview();
        });
    }

    if (elements.tsDownloadAllBtn) {
        elements.tsDownloadAllBtn.addEventListener('click', downloadAllSlides);
    }

    if (elements.tsCopyAllBtn) {
        elements.tsCopyAllBtn.addEventListener('click', () => {
            const parts = (state.tsSlides || []).map(slide => `Slide ${slide.n} (${slide.role}):\n${slide.text}`);
            if (state.tsCaption) parts.push(`Caption:\n${state.tsCaption}`);
            if (state.tsPinnedComment) parts.push(`Pinned comment:\n${state.tsPinnedComment}`);
            navigator.clipboard.writeText(parts.join('\n\n'))
                .then(() => showNotification('All slide texts copied!', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    if (elements.tsCopyTitleBtn) {
        elements.tsCopyTitleBtn.addEventListener('click', () => {
            const text = [state.tsTitle, (state.tsHashtags || []).join(' ')].filter(Boolean).join(' ');
            navigator.clipboard.writeText(text)
                .then(() => showNotification('Title + hashtags copied!', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    if (elements.tsCopyCaptionBtn) {
        elements.tsCopyCaptionBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(state.tsCaption || '')
                .then(() => showNotification('Caption copied!', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    if (elements.tsCopyPinnedBtn) {
        elements.tsCopyPinnedBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(state.tsPinnedComment || '')
                .then(() => showNotification('Pinned comment copied!', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    if (elements.ssLibrarySelect) {
        elements.ssLibrarySelect.addEventListener('change', loadSsLibraryImages);
    }

    if (elements.ssHookLibrarySelect) {
        elements.ssHookLibrarySelect.addEventListener('change', loadSsHookImages);
    }

    if (elements.ssFillPhotosBtn) {
        elements.ssFillPhotosBtn.addEventListener('click', ssFillRandomPhotos);
    }

    if (elements.ssClearPhotosBtn) {
        elements.ssClearPhotosBtn.addEventListener('click', () => {
            state.slides.forEach(slide => { if (slide?.ss) slide.image = null; });
            renderSlidesPreview();
            showNotification('Photos cleared', 'info');
        });
    }

    if (elements.ssLibraryGrid) {
        elements.ssLibraryGrid.addEventListener('click', async (e) => {
            const thumb = e.target.closest('.ss-library-thumb');
            if (!thumb) return;
            const slide = state.slides[state.currentSlideIndex];
            if (!slide?.ss) {
                showNotification('Select a slide first.', 'error');
                return;
            }
            try {
                slide.image = await ssFetchImageAsDataUrl(state.ssLibrarySet, thumb.dataset.name);
                renderSlidesPreview();
                if (elements.ssPhotoPickerStatus) elements.ssPhotoPickerStatus.textContent = `Photo applied to slide ${state.currentSlideIndex + 1}`;
                showNotification(`Photo added to slide ${state.currentSlideIndex + 1}`, 'success');
            } catch (error) {
                showNotification(`Could not load photo: ${error.message}`, 'error');
            }
        });
    }

    if (elements.ssLibraryMoreBtn) {
        elements.ssLibraryMoreBtn.addEventListener('click', () => {
            state.ssLibraryExpanded = !state.ssLibraryExpanded;
            renderSsLibraryGrid();
        });
    }

    if (elements.ssCopyCaptionBtn) {
        elements.ssCopyCaptionBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(state.ssCaption || '')
                .then(() => showNotification('Caption copied', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    if (elements.ssCopyPinnedBtn) {
        elements.ssCopyPinnedBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(state.ssPinnedComment || '')
                .then(() => showNotification('Pinned comment copied', 'success'))
                .catch(() => showNotification('Failed to copy', 'error'));
        });
    }

    if (elements.ssBatchGenerateBtn) {
        elements.ssBatchGenerateBtn.addEventListener('click', generateSsBatch);
    }

    // SYP Listeners
    if (elements.generateNativeSlidesBtnSyp) {
        elements.generateNativeSlidesBtnSyp.addEventListener('click', generateNativeSlidesSyp);
    }

    if (elements.quickImproveHookBtnSyp) {
        elements.quickImproveHookBtnSyp.addEventListener('click', improveHooks);
    }

    // Missing SYP Listeners
    if (elements.generateImagePromptsBtnSyp) {
        elements.generateImagePromptsBtnSyp.addEventListener('click', generateImagePrompts);
    }

    if (elements.generateAiImagesBtnSyp) {
        elements.generateAiImagesBtnSyp.addEventListener('click', generateAiImages);
    }

    if (elements.parseSlidesBtnSyp) {
        elements.parseSlidesBtnSyp.addEventListener('click', () => {
            const text = elements.slideTextInputSyp.value;
            state.slides = parseSlidesFromText(text).map((slide, index) => ({
                ...slide,
                id: Date.now() + index,
                image: state.generatedImages[index] || null, // Attach generated image
                position: getDefaultSlidePosition(index),
                scale: 1.5,
                maxWidth: 120,
                fontSize: null
            }));
            renderSlideBuilderList();
            renderSlidesPreview();
            showNotification(`Parsed ${state.slides.length} SYP slides`, 'success');
        });
    }

    if (elements.uploadAnchorBtnSyp) {
        elements.uploadAnchorBtnSyp.addEventListener('click', () => elements.anchorFileInputSyp.click());
    }

    if (elements.anchorFileInputSyp) {
        elements.anchorFileInputSyp.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                handleAnchorUpload(e.target.files[0]);
            }
        });
    }

    if (elements.generateMetadataBtnSyp) {
        elements.generateMetadataBtnSyp.addEventListener('click', generateMetadata);
    }

    if (elements.copyMetadataBtnSyp) {
        elements.copyMetadataBtnSyp.addEventListener('click', copyMetadata);
    }

    if (elements.downloadAllBtnSyp) {
        elements.downloadAllBtnSyp.addEventListener('click', downloadAllSlides);
    }

    if (elements.downloadCurrentBtnSyp) {
        elements.downloadCurrentBtnSyp.addEventListener('click', downloadCurrentSlide);
    }

    if (elements.clearAnchorRefBtnSyp) {
        elements.clearAnchorRefBtnSyp.addEventListener('click', clearCharacterAnchor);
    }

    if (elements.parseImagesToSlidesBtn) {
        elements.parseImagesToSlidesBtn.addEventListener('click', parseImagesToSlides);
    }

    if (elements.parseImagesToSlidesBtnSyp) {
        elements.parseImagesToSlidesBtnSyp.addEventListener('click', parseImagesToSlides);
    }

    if (elements.generateCustomImageBtn) {
        elements.generateCustomImageBtn.addEventListener('click', generateCustomImage);
    }

    if (elements.generateCustomImageBtnSyp) {
        elements.generateCustomImageBtnSyp.addEventListener('click', generateCustomImage);
    }

    // DBT Reference Upload
    if (elements.uploadAnchorBtnDbt) {
        elements.uploadAnchorBtnDbt.addEventListener('click', () => elements.anchorFileInputDbt.click());
    }

    if (elements.anchorFileInputDbt) {
        elements.anchorFileInputDbt.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                Array.from(e.target.files).forEach(file => {
                    handleAnchorUpload(file);
                });
            }
        });
    }

    if (elements.clearAnchorRefBtnDbt) {
        elements.clearAnchorRefBtnDbt.addEventListener('click', clearCharacterAnchor);
    }

    // SYP Reference Upload (Step 2, Step 3 Custom)
    if (elements.anchorFileInputSyp) {
        elements.anchorFileInputSyp.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                Array.from(e.target.files).forEach(file => handleAnchorUpload(file));
            }
        });
    }

    if (elements.uploadAnchorBtnSypCustom) {
        elements.uploadAnchorBtnSypCustom.addEventListener('click', () => elements.anchorFileInputSypCustom.click());
    }

    if (elements.anchorFileInputSypCustom) {
        elements.anchorFileInputSypCustom.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                Array.from(e.target.files).forEach(file => handleAnchorUpload(file));
            }
        });
    }

    if (elements.clearAnchorRefBtnSypStep2) {
        elements.clearAnchorRefBtnSypStep2.addEventListener('click', clearCharacterAnchor);
    }
}

function initDragHandlers() {
    const overlays = document.querySelectorAll('.text-overlay');
    overlays.forEach(overlay => {
        overlay.addEventListener('mousedown', handleDragStart);
    });

    const voiceBlocks = document.querySelectorAll('.draggable-text-block');
    voiceBlocks.forEach(block => {
        block.addEventListener('mousedown', handleDragStart);
    });

    // Bind resize handlers to resize handles
    const resizeHandles = document.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', handleResizeStart);
    });
}

function handleDragStart(e) {
    // Don't drag if clicking the resize handle
    if (e.target.classList.contains('resize-handle')) return;

    const voiceBlock = e.target.closest('.draggable-text-block');
    if (voiceBlock) {
        const slideEditor = voiceBlock.closest('.slide-editor');
        if (!slideEditor) return;

        const index = parseInt(slideEditor.dataset.index);
        const slide = state.slides[index];
        const voice = voiceBlock.dataset.voice;
        if (!slide || (voice !== 'outside' && voice !== 'inside')) return;

        ensureDualVoicePositions(slide);

        state.isDragging = true;
        state.dragStartIndex = index;
        state.dragTarget = voice;
        state.currentSlideIndex = index;

        document.querySelectorAll('.slide-editor').forEach((card, i) => {
            card.classList.toggle('selected', i === index);
        });

        state.dragStartX = e.clientX;
        state.dragStartY = e.clientY;
        state.dragOffset = {
            x: slide[voice === 'outside' ? 'outsidePosition' : 'insidePosition'].x,
            y: slide[voice === 'outside' ? 'outsidePosition' : 'insidePosition'].y
        };

        e.preventDefault();
        e.stopPropagation();
        return;
    }

    const overlay = e.target.closest('.text-overlay');
    if (!overlay) return;

    const slideEditor = overlay.closest('.slide-editor');
    if (!slideEditor) return;

    const index = parseInt(slideEditor.dataset.index);

    state.isDragging = true;
    state.dragStartIndex = index;
    state.dragTarget = 'main';
    state.currentSlideIndex = index;

    // Highlight selected slide
    document.querySelectorAll('.slide-editor').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });

    const rect = slideEditor.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;

    state.dragOffset = {
        x: parseFloat(overlay.style.left) || 50,
        y: parseFloat(overlay.style.top) || 50
    };

    e.preventDefault();
}

function handleResizeStart(e) {
    e.stopPropagation(); // Prevent drag start

    const handle = e.target;
    const overlay = handle.closest('.text-overlay');
    if (!overlay) return;

    const slideEditor = overlay.closest('.slide-editor');
    if (!slideEditor) return;

    const index = parseInt(slideEditor.dataset.index);

    state.dragStartIndex = index;
    state.currentSlideIndex = index;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;

    if (handle.classList.contains('width-handle') || handle.classList.contains('width-handle-left')) {
        state.isResizingHorizontal = true;
        state.isResizingLeft = handle.classList.contains('width-handle-left');
        state.isResizing = false;
        state.resizeStartWidth = state.slides[index].maxWidth || 85;
    } else {
        state.isResizing = true;
        state.isResizingHorizontal = false;

        // Get current scale from data attribute or state
        const currentScale = state.slides[index].scale || 1.15;
        state.resizeStartScale = currentScale;

        // Calculate initial distance from center of overlay
        const overlayRect = overlay.getBoundingClientRect();
        const centerX = overlayRect.left + overlayRect.width / 2;
        const centerY = overlayRect.top + overlayRect.height / 2;
        state.resizeStartDistance = Math.sqrt(
            Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        );
    }

    e.preventDefault();
}

function handleDrag(e) {
    if (state.isDragging && state.dragStartIndex !== -1) {
        const slideEditor = document.querySelector(`.slide-editor[data-index="${state.dragStartIndex}"]`);
        if (!slideEditor) return;

        const rect = slideEditor.querySelector('.slide-preview').getBoundingClientRect();

        const deltaX = e.clientX - state.dragStartX;
        const deltaY = e.clientY - state.dragStartY;

        const deltaXPercent = (deltaX / rect.width) * 100;
        const deltaYPercent = (deltaY / rect.height) * 100;

        let newX = state.dragOffset.x + deltaXPercent;
        let newY = state.dragOffset.y + deltaYPercent;

        // Constrain to bounds
        newX = Math.max(10, Math.min(90, newX));
        newY = Math.max(10, Math.min(90, newY));

        if (state.dragTarget === 'outside' || state.dragTarget === 'inside') {
            const selector = `.draggable-text-block[data-voice="${state.dragTarget}"]`;
            const block = slideEditor.querySelector(selector);
            if (block) {
                block.style.left = `${newX}%`;
                block.style.top = `${newY}%`;
            }

            const positionKey = state.dragTarget === 'outside' ? 'outsidePosition' : 'insidePosition';
            state.slides[state.dragStartIndex][positionKey] = { x: newX, y: newY };
        } else {
            // Update UI immediately
            const overlay = slideEditor.querySelector('.text-overlay');
            overlay.style.left = `${newX}%`;
            overlay.style.top = `${newY}%`;

            // Update state
            state.slides[state.dragStartIndex].position = { x: newX, y: newY };
        }
    }

    if (state.isResizing && state.dragStartIndex !== -1) {
        const slideEditor = document.querySelector(`.slide-editor[data-index="${state.dragStartIndex}"]`);
        if (!slideEditor) return;

        const overlay = slideEditor.querySelector('.text-overlay');
        const overlayRect = overlay.getBoundingClientRect();

        // Calculate current distance from center
        const centerX = overlayRect.left + overlayRect.width / 2;
        const centerY = overlayRect.top + overlayRect.height / 2;
        const currentDistance = Math.sqrt(
            Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        );

        // Calculate scale based on distance change
        const scaleChange = currentDistance / state.resizeStartDistance;
        let newScale = state.resizeStartScale * scaleChange;

        // Constrain scale between 0.3 and 1.5 (Max 1.5 as requested)
        newScale = Math.max(0.3, Math.min(1.5, newScale));

        // Update UI
        const baseFontSize = parseInt(elements.fontSizeInput.value) || 28;
        const previewScaleFactor = 0.35 * newScale;
        overlay.style.transform = `translate(-50%, -50%) scale(${previewScaleFactor})`;
        overlay.setAttribute('data-scale', newScale);

        // Update scale indicator
        const scaleIndicator = overlay.querySelector('.scale-indicator');
        if (scaleIndicator) {
            scaleIndicator.textContent = `${Math.round(newScale * 100)}%`;
        }

        // Update state
        state.slides[state.dragStartIndex].scale = newScale;
    }

    if (state.isResizingHorizontal && state.dragStartIndex !== -1) {
        const slideEditor = document.querySelector(`.slide-editor[data-index="${state.dragStartIndex}"]`);
        if (!slideEditor) return;

        const rect = slideEditor.querySelector('.slide-preview').getBoundingClientRect();
        const deltaX = e.clientX - state.dragStartX;

        // If resizing from the left handle, moving left (negative deltaX) should INCREASE width
        const multiplier = state.isResizingLeft ? -2 : 2;
        const deltaXPercent = (deltaX / rect.width) * 100 * multiplier;

        let newWidth = state.resizeStartWidth + deltaXPercent;
        newWidth = Math.max(20, Math.min(300, newWidth)); // Increased limit to 300% to allow for scaling

        const overlay = slideEditor.querySelector('.text-overlay');
        if (overlay) {
            overlay.style.width = `${newWidth}%`;
        }
        state.slides[state.dragStartIndex].maxWidth = newWidth;
    }
}

function handleDragEnd() {
    if (state.isDragging) {
        state.isDragging = false;
    }
    if (state.isResizing) {
        state.isResizing = false;
    }
    if (state.isResizingHorizontal) {
        state.isResizingHorizontal = false;
        state.isResizingLeft = false;
    }
    state.dragStartIndex = -1;
    state.dragTarget = null;
}

function parseImagesToSlides() {
    const isSyp = state.currentService === 'syp';
    const textInput = isSyp ? elements.slideTextInputSyp : elements.slideTextInput;

    const text = textInput.value;
    if (!text.trim()) {
        showNotification('Please provide slide text first', 'error');
        return;
    }

    // Capture current slides to potentially preserve images and positions
    const oldSlides = [...state.slides];

    state.slides = parseSlidesFromText(text).map((slide, index) => {
        // Priority: 1. New generated image, 2. Existing image on this slide index
        const image = state.generatedImages[index] || (oldSlides[index] ? oldSlides[index].image : null);
        const position = oldSlides[index] ? oldSlides[index].position : getDefaultSlidePosition(index);
        const scale = oldSlides[index] && oldSlides[index].scale ? Math.min(1.5, oldSlides[index].scale) : 1.5;
        const maxWidth = oldSlides[index] && oldSlides[index].maxWidth ? oldSlides[index].maxWidth : 120;
        const fontSize = oldSlides[index] && oldSlides[index].fontSize ? oldSlides[index].fontSize : null;

        return {
            ...slide,
            id: Date.now() + index,
            image: image,
            position: position,
            scale: scale,
            maxWidth: maxWidth,
            fontSize: fontSize
        };
    });

    syncDbtStaticSlides();
    applyStaticSlides();
    renderSlideBuilderList();
    renderSlidesPreview();
    setCurrentSlideIndex(Math.min(state.currentSlideIndex, Math.max(0, state.slides.length - 1)));
    const count = state.generatedImages.filter(img => img).length;
    showNotification(`Applied ${count} images to preview`, 'success');

    // Scroll to preview
    elements.slidesContainer.scrollIntoView({ behavior: 'smooth' });
}

// SYP GENERATION WRAPPERS
async function generateNativeSlidesSyp() {
    const profile = elements.nativeGenProfileSyp.value;
    const topic = elements.nativeGenTopicSyp.value;
    const brandingMode = document.querySelector('input[name="syp-branding-mode"]:checked')?.value || 'full';

    elements.generateNativeSlidesBtnSyp.disabled = true;
    elements.generateNativeSlidesBtnSyp.innerHTML = '<span>⏳ Generating...</span>';

    try {
        const response = await fetch(`${API_BASE}/generate-native-slides`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getApiAuthHeaders()
            },
            body: JSON.stringify({ profile, topic, service: 'syp', brandingMode })
        });

        if (!response.ok) {
            const raw = await response.text();
            throw new Error(`HTTP ${response.status}: ${raw.substring(0, 300)}`);
        }
        const data = await response.json();

        if (data.slides && Array.isArray(data.slides)) {
            // Updated to use server-provided formatting (Slide X: text)
            elements.slideTextInputSyp.value = data.slides.join('\n');

            showNotification(`Generated ${data.slides.length} SYP slides! Click 'Parse & Apply' to preview.`, 'success');
        }
    } catch (error) {
        console.error('Error generating SYP slides:', error);
        showNotification('Failed to generate SYP slides.', 'error');
    } finally {
        elements.generateNativeSlidesBtnSyp.disabled = false;
        elements.generateNativeSlidesBtnSyp.innerHTML = '<span>🔥 Generate Story Dump (Opus)</span>';
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    initializeDbtHookImagePickers();
    initEventListeners();

    // Initialize with default values
    if (elements.nativeGenFormat) {
        state.currentFormat = elements.nativeGenFormat.value;
    }
    if (elements.nativeGenTopic) {
        state.currentTopic = elements.nativeGenTopic.value;
    }
    if (elements.dbtSlideTypeSelect) {
        state.currentDbtSlideType = elements.dbtSlideTypeSelect.value;
        syncDbtSlideTypeUI();
    }
    syncTextColorForTextStyle();
    syncPreviewTextStyleControlsFromLegacy();
    if (elements.characterPresetStep1 || elements.characterPreset) {
        setSelectedDbtCharacterValue(getSelectedDbtCharacter());
    }
    if (elements.dbtHookImageSelect || elements.dbtHookImageSelectStep1) {
        state.selectedDbtHookImage = elements.dbtHookImageSelectStep1?.value
            || elements.dbtHookImageSelect?.value
            || 'default';
        syncDbtHookImageControl();
    }
    state.includeBranding = true;

    console.log('App initialized');
    loadSavedRefs();
    renderSlideBuilderList();
    updateSelectedSlideEditor();
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
