const state = {
    currentService: 'dbt',
    currentFormat: 'relatable',
    currentTopic: 'favorite_person',
    currentDbtSlideType: 'weird_hack',
    selectedDbtHookImage: 'default',
    includeBranding: true,
    slides: [],
    currentSlideIndex: 0,
    characterAnchor: [], // Array of dataUrl strings for SYP
    imagePrompts: [],
    generatedImages: [],
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

    // Production safety: do not trust persisted API base overrides on non-local hosts.
    // This prevents stale localhost values from breaking live deployments.
    if (!isLocalHost) {
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
            permission_v1: {
            },
            three_tips: {
                5: 'assets/dbt-templates/cta_slide_template.jpg'
            },
            i_say_they_say: {
            }
        }
    },
    brendabpd: {
        label: 'brendabpd (iPhone)',
        staticSlidesByFlow: {
            weird_hack: {
                0: 'assets/dbt-templates/brendabpd/slide1.png',
                5: 'assets/dbt-templates/cta_slide_template.jpg'
            },
            weird_hack_v2: {
                0: 'assets/dbt-templates/brendabpd/slide1.png'
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
            permission_v1: {
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
    dbtTextStyleSelect: document.getElementById('dbt-text-style-select'),
    dbtTextOnlyMode: document.getElementById('dbt-text-only-mode'),
    artStyleSelect: document.getElementById('art-style-select'),
    generateNativeSlidesBtn: document.getElementById('generate-native-slides-btn'),
    compatibilityWarning: document.getElementById('compatibility-warning'),
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
        maxWidth: 120
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
                maxWidth: existing.maxWidth || 120
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

    elements.selectedSlideTextInput.disabled = !hasSlide;
    if (elements.uploadSlideImageBtn) elements.uploadSlideImageBtn.disabled = !hasSlide;
    if (elements.clearSlideImageBtn) elements.clearSlideImageBtn.disabled = !hasSlide;

    if (!hasSlide) {
        elements.selectedSlideLabel.textContent = 'No slide selected';
        elements.selectedSlideTextInput.value = '';
        if (elements.clearSlideImageBtn) elements.clearSlideImageBtn.textContent = 'Remove Image';
        return;
    }

    const staticLabel = isStaticSlide(state.currentSlideIndex) ? ' • template image active' : '';
    elements.selectedSlideLabel.textContent = `Slide ${state.currentSlideIndex + 1}${staticLabel}`;
    if (document.activeElement !== elements.selectedSlideTextInput) {
        elements.selectedSlideTextInput.value = slide.text || '';
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

function getSelectedDbtSlideType() {
    return elements.dbtSlideTypeSelect?.value || 'weird_hack';
}

function getActiveTextStyle() {
    if (state.currentService !== 'dbt') return 'boxed';
    return elements.dbtTextStyleSelect?.value || 'boxed';
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
    if (
        state.currentService === 'dbt' &&
        (state.currentDbtSlideType === 'weird_hack_v2' || state.currentDbtSlideType === 'permission_v1')
    ) {
        return slideIndex >= 1 && slideIndex <= 7;
    }
    return slideIndex >= 1 && slideIndex <= 4;
}

function isDbtStoryTellingFlow(slideType = getSelectedDbtSlideType()) {
    return slideType === 'story_telling_bf' || slideType === 'story_telling_gf';
}

function doesDbtSlideTypeUseViralTopic(slideType = getSelectedDbtSlideType()) {
    return !isDbtStoryTellingFlow(slideType) && slideType !== 'weird_hack_v2' && slideType !== 'permission_v1';
}

function getDbtGenerateButtonLabel(slideType = getSelectedDbtSlideType()) {
    if (slideType === 'three_tips') return 'Generate 3 Tips (Opus)';
    if (slideType === 'story_telling_bf') return 'Generate Story Telling BF (Opus)';
    if (slideType === 'story_telling_gf') return 'Generate Story Telling GF (Opus)';
    if (slideType === 'i_say_they_say') return 'Generate I Say/They Say (Opus)';
    if (slideType === 'weird_hack_v2') return 'Generate Weird Therapist Hacks V2 (Opus)';
    if (slideType === 'permission_v1') return 'Generate Permission V1 (Opus)';
    return 'Generate Weird Therapist Hacks (Opus)';
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

    if (elements.generateNativeSlidesBtn) {
        elements.generateNativeSlidesBtn.innerHTML = `<span>${getDbtGenerateButtonLabel(slideType)}</span>`;
    }

    if (elements.flowSelect) {
        elements.flowSelect.value = slideType;
    }
}

function getDbtCharacterTemplate(character = getSelectedDbtCharacter()) {
    return dbtCharacterTemplates[character] || dbtCharacterTemplates.hannahbpd;
}

function supportsCustomDbtHookImage(character = getSelectedDbtCharacter()) {
    return ['hannahbpd', 'brendabpd'].includes(character);
}

function getSelectedDbtHookImageConfig() {
    return dbtHookImageOptions[state.selectedDbtHookImage] || dbtHookImageOptions.default;
}

function getDbtHookImageDefaultPreview(character = getSelectedDbtCharacter()) {
    const template = getDbtCharacterTemplate(character);
    const flow = state.currentDbtSlideType || 'weird_hack';
    const flowSlides = template.staticSlidesByFlow?.[flow] || template.staticSlidesByFlow?.weird_hack || {};
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
    if (elements.dbtHookImageSelect) {
        elements.dbtHookImageSelect.disabled = !supported;
    }
    if (elements.dbtHookImageSelectStep1) {
        elements.dbtHookImageSelectStep1.disabled = !supported;
    }

    if (!supported) {
        setSelectedDbtHookImageValue('default');
    } else if (dbtHookImageOptions[state.selectedDbtHookImage]) {
        setSelectedDbtHookImageValue(state.selectedDbtHookImage);
    } else {
        setSelectedDbtHookImageValue('default');
    }

    syncDbtHookImagePickerUI();
}

function populateDbtHookImageSelectOptions() {
    [elements.dbtHookImageSelect, elements.dbtHookImageSelectStep1].forEach((selectEl) => {
        if (!selectEl) return;

        const previousValue = selectEl.value;
        selectEl.innerHTML = '';

        Object.entries(dbtHookImageOptions).forEach(([value, option]) => {
            const optionEl = document.createElement('option');
            optionEl.value = value;
            optionEl.textContent = option.label;
            selectEl.appendChild(optionEl);
        });

        selectEl.value = dbtHookImageOptions[previousValue] ? previousValue : 'default';
    });
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
        buttonEl.title = supported ? '' : 'Only available for hannahbpd and brendabpd';
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

    Object.entries(dbtHookImageOptions).forEach(([value, option]) => {
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

    const instance = {
        selectEl,
        wrapperEl,
        buttonEl,
        labelEl,
        thumbEl,
        menuEl
    };

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
    const flow = state.currentDbtSlideType || 'weird_hack';
    const flowSlides = template.staticSlidesByFlow?.[flow] || template.staticSlidesByFlow?.weird_hack || {};
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

    if (state.useStaticSlide1) {
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
        const parsed = parseSlidesFromText(text).map((slide, index) => ({
            ...slide,
            id: Date.now() + index,
            position: getDefaultSlidePosition(index),
            scale: 1.5,
            image: (state.generatedImages && state.generatedImages[index]) || null
        }));

        if (parsed.length > 0) {
            state.slides = parsed.map(slide => ({
                ...slide,
                scale: slide.scale || 1.5,
                maxWidth: slide.maxWidth || 120
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
                    position: getDefaultSlidePosition(slides.length)
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
                maxWidth: 120
            };
            slides.push(dualVoice ? ensureDualVoicePositions(slide) : slide);
        }
    }

    return slides;
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
    const slideType = getSelectedDbtSlideType();
    const textOnlyMode = !!elements.dbtTextOnlyMode?.checked;
    const topic = doesDbtSlideTypeUseViralTopic(slideType)
        ? (elements.nativeGenTopicDbt?.value || 'random')
        : undefined;

    state.includeBranding = includeBranding;
    state.currentDbtSlideType = slideType;

    elements.generateNativeSlidesBtn.disabled = true;
    elements.generateNativeSlidesBtn.innerHTML = '<span>⏳ Generating...</span>';

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
                slideType
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

            if (textOnlyMode) {
                showNotification('Text-only mode is active: skipped metadata, prompts, and image generation.', 'info');
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
        elements.generateNativeSlidesBtn.disabled = false;
        setTimeout(syncDbtSlideTypeUI, 0);
        elements.generateNativeSlidesBtn.innerHTML = `<span>${getDbtGenerateButtonLabel(state.currentDbtSlideType)}</span>`;
    }
}

// ==========================================
// IMAGE PROMPTS GENERATION
// ==========================================
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
                topic: state.currentTopic,
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
    const { indices = null, suppressSuccessNotification = false } = options;
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

        const referenceImages = getServiceReferenceImages(isSyp);

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

        const referenceImages = getServiceReferenceImages(isSyp);

        state.selectedRefIndices.forEach(refIdx => {
            if (state.generatedImages[refIdx]) {
                const parsed = parseDataUrl(state.generatedImages[refIdx]);
                if (parsed) referenceImages.push(parsed);
            }
        });

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
    const boxClass = textStyle === 'tiktok_caption' ? 'text-box text-box--tiktok' : 'text-box';
    const spanClass = textStyle === 'tiktok_caption'
        ? 'text-content-span text-content-span--tiktok'
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
        const baseFontSize = parseInt(elements.fontSizeInput.value) || 28;

        // Default scale of 1.5 matches requested look
        const slideScale = slide.scale || 1.5;
        const previewScaleFactor = 0.35 * slideScale; // Scale down the entire text overlay
        const slideMaxWidth = slide.maxWidth || elements.textWidthInput?.value || 120;
        const isDualVoice = isDualVoiceFlowSlide(slide);
        if (isDualVoice) ensureDualVoicePositions(slide);

        const staticImage = getStaticSlideImage(index);
        const overlayOpacity = shouldApplyDarkOverlayToSlide(index) ? getCurrentDarkOverlayOpacity() : 0;
        const slideImageMarkup = staticImage
            ? buildStaticImageMarkup(index, staticImage)
            : (slide.image ? `<img src="${slide.image}" alt="Slide ${index + 1}">` : '<div class="no-image">No Image</div>');
        const imageOverlayMarkup = overlayOpacity > 0
            ? `<div class="slide-image-dark-overlay" style="opacity: ${overlayOpacity};"></div>`
            : '';

        const overlayStyle = isDualVoice
            ? `left: 50%; top: 50%; width: 100%; height: 100%; transform: translate(-50%, -50%) scale(${previewScaleFactor}); transform-origin: center center;`
            : `left: ${slide.position.x}%; top: ${slide.position.y}%; width: ${slideMaxWidth}%; transform: translate(-50%, -50%) scale(${previewScaleFactor}); transform-origin: center center;`;
        const textStyleClass = getActiveTextStyle() === 'tiktok_caption'
            ? 'text-overlay--tiktok'
            : 'text-overlay--boxed';

        const previewHtml = isDualVoice
            ? buildDualVoicePreviewHtml(slide, baseFontSize)
            : `<div class="text-block-stack">${buildTextBlocksPreviewHtml(slide.text || '', baseFontSize)}</div>`;

        slideEl.innerHTML = `
            <div class="slide-number">${index + 1}</div>
            <div class="slide-preview" style="position: relative; width: 100%; height: 100%;">
                ${slideImageMarkup}
                ${imageOverlayMarkup}
                <div class="text-overlay ${textStyleClass} ${state.currentSlideIndex === index ? 'selected' : ''}" style="${overlayStyle}" data-scale="${slideScale}">
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
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    const slideIndex = state.slides.indexOf(slide);
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
    const baseFontSize = parseInt(elements.fontSizeInput.value) || 28;
    const scaleFactor = scale || 1.5;

    // The font size in the final canvas must match the visual proportion in the preview.
    // Preview font size = base * 0.35 * scale. 
    // Canvas is 3.6x larger than preview (1080 / 300).
    // So canvasFontSize = base * 3.6 * 0.35 * scale = base * 1.26 * scale.
    const canvasFontSize = baseFontSize * 1.26 * scaleFactor;

    ctx.font = `bold ${canvasFontSize}px "TikTok Sans", Arial, sans-serif`;
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
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.96)';
            ctx.fillStyle = '#ffffff';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.miterLimit = 2;
            ctx.lineWidth = Math.max(6, canvasFontSize * 0.17);

            let startYForText = centerY - (blockHeight / 2) + (lineHeight / 2);
            lines.forEach((line) => {
                ctx.strokeText(line, centerX, startYForText);
                startYForText += lineHeight;
            });

            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = canvasFontSize * 0.08;
            ctx.shadowOffsetY = canvasFontSize * 0.05;

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

        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
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

        ctx.fillStyle = '#000000';
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

    // Include TikTok Title & Description if they exist
    const isSyp = state.currentService === 'syp';
    const title = isSyp ? elements.metadataTitleSyp?.textContent : elements.metadataTitle?.textContent;
    const desc = isSyp ? elements.metadataDescSyp?.textContent : elements.metadataDesc?.textContent;

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
    const hookListEl = isSyp ? elements.hookListSyp || elements.hookList : elements.hookList;
    const hookOptionsEl = isSyp ? elements.hookOptionsSyp || elements.hookOptions : elements.hookOptions;

    if (genBtn) {
        genBtn.disabled = true;
        genBtn.textContent = '⏳ Improving...';
    }

    try {
        const response = await fetch(`${API_BASE}/improve-hooks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                slides: slidesToUse.map(s => s.text),
                format: state.currentFormat,
                topic: state.currentTopic,
                service: state.currentService,
                slideType: state.currentService === 'dbt' ? state.currentDbtSlideType : undefined
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.hooks && Array.isArray(data.hooks)) {
            hookListEl.innerHTML = '';
            data.hooks.forEach((hook, index) => {
                const hookEl = document.createElement('div');
                hookEl.className = 'hook-option';
                hookEl.innerHTML = `
                    <div class="hook-text">${hook}</div>
                    <button class="btn btn-sm btn-primary use-hook-btn" data-index="${index}">Use</button>
                `;
                hookListEl.appendChild(hookEl);
            });

            hookOptionsEl.style.display = 'block';

            // Add click handlers
            hookListEl.querySelectorAll('.use-hook-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    const selectedHook = data.hooks[index];

                    // Update text area directly
                    const textInput = isSyp ? elements.slideTextInputSyp : elements.slideTextInput;
                    if (textInput) {
                        const lines = textInput.value.split('\n');
                        // Smart replacement for Slide 1
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

                    // IF slides are already parsed, update them too
                    if (state.slides.length > 0 && state.slides[0]) {
                        state.slides[0].text = selectedHook;
                        renderSlidesPreview();
                    }

                    hookOptionsEl.style.display = 'none';
                    showNotification('Hook updated!', 'success');
                });
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
    const genBtn = isSyp ? elements.generateMetadataBtnSyp : elements.generateMetadataBtn;
    const titleEl = isSyp ? elements.metadataTitleSyp : elements.metadataTitle;
    const descEl = isSyp ? elements.metadataDescSyp : elements.metadataDesc;
    const outputEl = isSyp ? elements.metadataOutputSyp : elements.metadataOutput;

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
                slides_text: state.slides.map(s => s.text).join('\n'),
                format: state.currentFormat,
                topic: state.currentTopic,
                service: state.currentService,
                slideType: state.currentDbtSlideType,
                includeBranding: state.includeBranding,
                brandingMode: brandingMode
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.title && data.description) {
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
            genBtn.innerHTML = '<span>📱 Generate TikTok Title & Desc (Opus)</span>';
        }
    }
}

function copyMetadata() {
    const isSyp = state.currentService === 'syp';
    const titleEl = isSyp ? elements.metadataTitleSyp : elements.metadataTitle;
    const descEl = isSyp ? elements.metadataDescSyp : elements.metadataDesc;

    const title = titleEl?.textContent || '';
    const description = descEl?.textContent || '';
    const fullText = `${title}\n\n${description}`;

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
    applyStaticSlides();
    renderSlideBuilderList();
    renderSlidesPreview();
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
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
            syncDbtStaticSlides();
            applyStaticSlides();
            renderSlidesPreview();
            showNotification(`DBT slide type set to ${elements.dbtSlideTypeSelect.options[elements.dbtSlideTypeSelect.selectedIndex].text}`, 'success');
        });
    }

    if (elements.dbtTextStyleSelect) {
        elements.dbtTextStyleSelect.addEventListener('change', () => {
            renderSlidesPreview();
            showNotification(`DBT text styling set to ${elements.dbtTextStyleSelect.options[elements.dbtTextStyleSelect.selectedIndex].text}`, 'success');
        });
    }

    // Generate image prompts
    if (elements.generateImagePromptsBtn) {
        elements.generateImagePromptsBtn.addEventListener('click', generateImagePrompts);
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
            const valueDisplay = document.getElementById('font-size-value');
            const sypValueDisplay = document.getElementById('font-size-value_syp');
            if (valueDisplay) valueDisplay.textContent = e.target.value + 'px';
            if (sypValueDisplay) sypValueDisplay.textContent = e.target.value + 'px';
            // Sync with SYP slider
            if (elements.fontSizeInputSyp) {
                elements.fontSizeInputSyp.value = e.target.value;
            }
            renderSlidesPreview();
        });
    }

    if (elements.textColorInput) {
        elements.textColorInput.addEventListener('input', renderSlidesPreview);
    }

    if (elements.bgColorInput) {
        elements.bgColorInput.addEventListener('input', renderSlidesPreview);
    }

    // SYP Style controls - sync with main controls
    if (elements.fontSizeInputSyp) {
        elements.fontSizeInputSyp.addEventListener('input', (e) => {
            // Sync with main slider
            if (elements.fontSizeInput) {
                elements.fontSizeInput.value = e.target.value;
            }
            const valueDisplay = document.getElementById('font-size-value_syp');
            const mainValueDisplay = document.getElementById('font-size-value');
            if (valueDisplay) valueDisplay.textContent = e.target.value + 'px';
            if (mainValueDisplay) mainValueDisplay.textContent = e.target.value + 'px';
            renderSlidesPreview();
        });
    }

    if (elements.textColorInputSyp) {
        elements.textColorInputSyp.addEventListener('input', (e) => {
            if (elements.textColorInput) elements.textColorInput.value = e.target.value;
            renderSlidesPreview();
        });
    }

    if (elements.bgColorInputSyp) {
        elements.bgColorInputSyp.addEventListener('input', (e) => {
            if (elements.bgColorInput) elements.bgColorInput.value = e.target.value;
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
        elements.parseSlidesBtn.addEventListener('click', () => {
            const text = elements.slideTextInput.value;
            state.slides = parseSlidesFromText(text).map((slide, index) => ({
                ...slide,
                id: Date.now() + index,
                image: state.generatedImages[index] || null, // Attach generated image if available
                position: getDefaultSlidePosition(index),
                scale: 1.5,
                maxWidth: 120
            }));
            syncDbtStaticSlides();
            applyStaticSlides();
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
                maxWidth: 120
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

        return {
            ...slide,
            id: Date.now() + index,
            image: image,
            position: position,
            scale: scale,
            maxWidth: maxWidth
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
