const state = {
    currentService: 'dbt',
    currentFormat: 'relatable',
    currentTopic: 'favorite_person',
    includeBranding: true,
    slides: [],
    currentSlideIndex: 0,
    characterAnchor: null,
    imagePrompts: [],
    generatedImages: [],
    isDragging: false,
    isResizing: false,
    isResizingHorizontal: false,
    dragStartIndex: -1,
    dragStartX: 0,
    dragStartY: 0,
    dragOffset: { x: 0, y: 0 },
    resizeStartScale: 1.5,
    resizeStartDistance: 0,
    resizeStartWidth: 120,
    isResizingLeft: false,
    selectedRefIndices: []
};

const API_BASE = 'http://localhost:3001';

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

// ==========================================
// ELEMENTS CACHE
// ==========================================
const elements = {
    nativeGenFormat: document.getElementById('native-gen-format'),
    nativeGenTopic: document.getElementById('native-gen-topic'),
    includeBrandingDbt: document.getElementById('include-branding_dbt'),
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
    generateImagePromptsBtn: document.getElementById('generate-image-prompts-btn'),
    generateAiImagesBtn: document.getElementById('generate-ai-images'),
    downloadAllBtn: document.getElementById('download-all'),
    downloadCurrentBtn: document.getElementById('download-current'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    fontSizeInput: document.getElementById('font-size'),
    textColorInput: document.getElementById('text-color'),
    bgColorInput: document.getElementById('bg-color'),
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
    textWidthInput: document.getElementById('text-width'),
    textWidthInputSyp: document.getElementById('text-width_syp'),
    imagePromptsContainerSyp: document.getElementById('image-prompts-container_syp'),
    imagePromptsSectionSyp: document.getElementById('image-prompts-section_syp'),
    promptsLoadingSyp: document.getElementById('prompts-loading_syp'),
    hookOptionsSyp: document.getElementById('hook-options_syp'),
    hookListSyp: document.getElementById('hook-list_syp'),
    hookContextStatusSyp: document.getElementById('hook-context-status_syp'),
    anchorReferenceDisplaySyp: document.getElementById('anchor-reference-display_syp'),
    anchorReferenceImgSyp: document.getElementById('anchor-reference-img_syp'),
    clearAnchorRefBtnSyp: document.getElementById('clear-anchor-ref-btn_syp'),
    downloadAllBtnSyp: document.getElementById('download-all_syp'),
    downloadCurrentBtnSyp: document.getElementById('download-current_syp'),
};

// ==========================================
// DBT FRAMEWORK CONFIGURATION
// ==========================================
const dbtFramework = {
    formats: {
        relatable: {
            name: 'Relatable/Emotional',
            percentage: '50%',
            purpose: 'Emotional connection & "me too" moments',
            appMention: 'Natural mention in last slide',
            hookStyle: 'relatable-emotional',
            slideCount: 5
        },
        pov: {
            name: 'POV',
            percentage: '20%',
            purpose: 'Immersive experience & relatability',
            appMention: 'Subtle integration in slide 4-5',
            hookStyle: 'pov',
            slideCount: 5
        },
        tips: {
            name: 'Tips/Hacks',
            percentage: '30%',
            purpose: 'Practical value & solution-focused',
            appMention: 'Present app as the solution',
            hookStyle: 'tips',
            slideCount: 5
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
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function updateSlideCounter() {
    elements.slideCounter.textContent = `${state.slides.length} slide${state.slides.length !== 1 ? 's' : ''}`;
}

/**
 * Ensures slides are parsed from the active textarea if state.slides is empty.
 * Returns true if slides exist or were successfully parsed.
 */
function ensureSlidesParsed() {
    if (state.slides && state.slides.length > 0) return true;

    const isSyp = state.currentService === 'syp';
    const textInput = isSyp ? elements.slideTextInputSyp : elements.slideTextInput;

    if (textInput && textInput.value.trim()) {
        const text = textInput.value.trim();
        const parsed = parseSlidesFromText(text).map((slide, index) => ({
            ...slide,
            id: Date.now() + index,
            position: { x: 50, y: 50 },
            scale: 2.5,
            image: (state.generatedImages && state.generatedImages[index]) || null
        }));

        if (parsed.length > 0) {
            state.slides = parsed.map(slide => ({
                ...slide,
                scale: slide.scale || 1.5,
                maxWidth: slide.maxWidth || 120
            }));
            renderSlidesPreview();
            showNotification(`Using ${state.slides.length} slides from text box`, 'success');
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
                slides.push({
                    text: cleaned,
                    image: null,
                    id: Date.now() + counter++,
                    position: { x: 50, y: 50 }
                });
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
            slides.push({
                text: line.replace(/^Slide\s*\d*[:\-]?\s*/i, '').trim(),
                image: null,
                id: Date.now() + i,
                position: { x: 50, y: 50 },
                scale: 1.5,
                maxWidth: 120
            });
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
    warningSuggestion.innerHTML = `${formatInfo.purpose} | Art: ${topicInfo.artStyle} | ${formatInfo.appMention}`;

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
    const format = elements.nativeGenFormat.value;
    const topic = elements.nativeGenTopic.value;
    const includeBranding = elements.includeBrandingDbt.checked;

    state.currentFormat = format;
    state.currentTopic = topic;
    state.includeBranding = includeBranding;

    elements.generateNativeSlidesBtn.disabled = true;
    elements.generateNativeSlidesBtn.innerHTML = '<span>⏳ Generating...</span>';

    try {
        const response = await fetch(`${API_BASE}/generate-native-slides`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                format,
                topic,
                service: 'dbt',
                includeBranding
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.slides && Array.isArray(data.slides)) {
            // Updated to use server-provided formatting (Slide X: text)
            elements.slideTextInput.value = data.slides.join('\n');

            showNotification(`Generated ${data.slides.length} slides! Click 'Parse & Apply' to preview.`, 'success');

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
        showNotification('Failed to generate slides. Please try again.', 'error');
    } finally {
        elements.generateNativeSlidesBtn.disabled = false;
        elements.generateNativeSlidesBtn.innerHTML = '<span>🔥 Generate Story Dump (Opus)</span>';
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

async function generateImagePromptsFromSlides(slidesToUse) {
    const isSyp = state.currentService === 'syp';
    const characterPresetEl = isSyp ? elements.characterPresetSyp : elements.characterPreset;
    // For DBT, explicitly send NULL for character to avoid persona injection
    const character = isSyp ? (characterPresetEl?.value || 'luna') : null;
    const promptsLoadingEl = isSyp ? elements.promptsLoadingSyp || elements.promptsLoading : elements.promptsLoading;
    const promptsSectionEl = isSyp ? elements.imagePromptsSectionSyp || elements.imagePromptsSection : elements.imagePromptsSection;
    const genBtn = isSyp ? elements.generateImagePromptsBtnSyp : elements.generateImagePromptsBtn;

    if (genBtn) genBtn.disabled = true;
    if (promptsLoadingEl) promptsLoadingEl.style.display = 'block';
    if (promptsSectionEl) promptsSectionEl.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/generate-image-prompts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                slides: slidesToUse.map(s => s.text),
                character,
                format: state.currentFormat,
                topic: state.currentTopic,
                service: state.currentService
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.prompts && Array.isArray(data.prompts)) {
            state.imagePrompts = data.prompts;
            renderImagePrompts();
            initializeImageGenerationGrid(); // Initialize the slots in Step 3
            showNotification('Image prompts generated!', 'success');
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

    state.imagePrompts.forEach((prompt, index) => {
        const promptEl = document.createElement('div');
        promptEl.className = 'image-prompt-card';
        promptEl.innerHTML = `
            <div class="prompt-header">
                <span class="prompt-number">Slide ${index + 1}</span>
                <button class="btn btn-sm btn-secondary copy-prompt-btn" data-index="${index}">📋 Copy</button>
            </div>
            <div class="prompt-text">${prompt}</div>
        `;
        container.appendChild(promptEl);
    });

    if (section) section.style.display = 'block';

    // Add copy handlers
    container.querySelectorAll('.copy-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            navigator.clipboard.writeText(state.imagePrompts[index]);
            showNotification('Prompt copied!', 'success');
        });
    });
}

// ==========================================
// AI IMAGE GENERATION
// ==========================================
async function generateAiImages() {
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
        const response = await fetch(`${API_BASE}/generate-ai-images`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompts: state.imagePrompts,
                character: characterPresetEl?.value || 'luna',
                service: state.currentService,
                anchorImage: isSyp ? state.characterAnchor : null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.images && Array.isArray(data.images)) {
            // Unify state.generatedImages format to URLs
            state.generatedImages = data.images.map(item => {
                if (typeof item === 'string') return item;
                if (item.result && item.result.images && item.result.images[0]) {
                    const img = item.result.images[0];
                    return `data:${img.mimeType || 'image/png'};base64,${img.data}`;
                }
                return null;
            });

            // Assign images to slides
            state.slides.forEach((slide, index) => {
                if (state.generatedImages[index]) {
                    slide.image = state.generatedImages[index];
                }
            });

            renderGeneratedImages();
            renderSlidesPreview();
            showNotification('Images generated successfully!', 'success');
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating images:', error);
        showNotification('Failed to generate images. Please try again.', 'error');
    } finally {
        if (genBtn) genBtn.disabled = false;
        if (progressEl) progressEl.style.display = 'none';
    }
}

function initializeImageGenerationGrid() {
    const isSyp = state.currentService === 'syp';
    const container = isSyp ? elements.generatedImagesContainerSyp : elements.generatedImagesContainer;
    const stepId = isSyp ? 'step-3_syp' : 'step-3';

    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'grid';

    state.imagePrompts.forEach((prompt, index) => {
        const item = document.createElement('div');
        item.className = 'generated-image-item generated-image-pending';
        item.dataset.index = index;

        item.innerHTML = `
            <span class="slide-label">Slide ${index + 1}</span>
            <div style="text-align: center; padding: 20px;">
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px;">Prompt Ready</p>
                <button class="btn-gen-slide generate-single-btn" data-index="${index}">✨ Generate Image</button>
            </div>
            <div class="ref-selection">
                <input type="checkbox" class="ref-checkbox" data-index="${index}" id="ref-check-${index}" ${state.selectedRefIndices.includes(index) ? 'checked' : ''}>
                <label for="ref-check-${index}" class="ref-label">Use as Ref</label>
            </div>
        `;
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
    const prompt = state.imagePrompts[index];
    if (!prompt) return;

    const originalText = btnEl.innerHTML;

    try {
        btnEl.disabled = true;
        btnEl.innerHTML = '<span>⏳...</span>';

        // Fix: Use correct selector .generated-image-item (as used in initializeImageGenerationGrid)
        const cardEl = btnEl.closest('.generated-image-item');
        if (!cardEl) {
            console.error("Card element not found for index", index);
            throw new Error("UI consistency error: Card not found");
        }

        const isSyp = state.currentService === 'syp';
        const characterPresetEl = isSyp ? elements.characterPresetSyp : elements.characterPreset;

        // Collect all selected reference images
        const referenceImages = [];

        // Always include global character anchor if exists for SYP
        if (isSyp && state.characterAnchor) {
            const parsed = parseDataUrl(state.characterAnchor);
            if (parsed) referenceImages.push(parsed);
        }

        // Add user-ticked reference images from the grid
        state.selectedRefIndices.forEach(refIdx => {
            if (state.generatedImages[refIdx]) {
                const parsed = parseDataUrl(state.generatedImages[refIdx]);
                if (parsed) referenceImages.push(parsed);
            }
        });

        const response = await fetch(`${API_BASE}/generate-image-with-refs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                referenceImages: referenceImages,
                slideIndex: index,
                service: state.currentService,
                character_id: characterPresetEl?.value || 'luna'
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.success && data.image) {
            const imageUrl = `data:${data.image.mime_type || data.image.mimeType || 'image/png'};base64,${data.image.data}`;
            state.generatedImages[index] = imageUrl;

            // Assign to state.slides
            if (state.slides[index]) {
                state.slides[index].image = imageUrl;
            }

            // Replace card content with image
            cardEl.classList.remove('generated-image-pending');
            cardEl.innerHTML = `
                <span class="slide-label">Slide ${index + 1}</span>
                <img src="${imageUrl}" alt="Generated image ${index + 1}">
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
                    state.slides[index].image = imageUrl;
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

function renderGeneratedImages() {
    const isSyp = state.currentService === 'syp';
    const container = isSyp ? elements.generatedImagesContainerSyp : elements.generatedImagesContainer;

    if (!container) return;
    container.innerHTML = '';

    updateParsingToolsVisibility();

    state.imagePrompts.forEach((prompt, index) => {
        const image = state.generatedImages[index];
        const item = document.createElement('div');
        item.className = 'generated-image-item';

        if (image) {
            item.innerHTML = `
                <span class="slide-label">Slide ${index + 1}</span>
                <img src="${image}" alt="Generated image ${index + 1}">
                <div class="image-actions">
                    <button class="btn btn-sm btn-secondary use-image-btn" data-index="${index}">Use</button>
                    <button class="btn btn-sm btn-fire regen-btn" data-index="${index}">🔄 Regen</button>
                </div>
                <div class="ref-selection">
                    <input type="checkbox" class="ref-checkbox" data-index="${index}" id="ref-check-${index}" ${state.selectedRefIndices.includes(index) ? 'checked' : ''}>
                    <label for="ref-check-${index}" class="ref-label">Use as Ref</label>
                </div>
            `;
        } else {
            item.classList.add('generated-image-pending');
            item.innerHTML = `
                <span class="slide-label">Slide ${index + 1}</span>
                <div style="text-align: center; padding: 20px;">
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px;">Prompt Ready</p>
                    <button class="btn-gen-slide generate-single-btn" data-index="${index}">✨ Generate Image</button>
                </div>
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
            console.log("Selected reference indices:", state.selectedRefIndices);
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
                state.slides[index].image = state.generatedImages[index];
                renderSlidesPreview();
                showNotification(`Image assigned to slide ${index + 1}`, 'success');
            } else {
                // Slides don't exist yet
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
        if (!slide.maxWidth) slide.maxWidth = 120; // Default width set to 120%

        // Get the intended font size for final render (1080x1920 canvas)
        const baseFontSize = parseInt(elements.fontSizeInput.value) || 28;

        // Default scale of 1.5 matches requested look
        const slideScale = slide.scale || 1.5;
        const previewScaleFactor = 0.35 * slideScale; // Scale down the entire text overlay
        const slideMaxWidth = slide.maxWidth || elements.textWidthInput?.value || 120;

        slideEl.innerHTML = `
            <div class="slide-number">${index + 1}</div>
            <div class="slide-preview" style="position: relative; width: 100%; height: 100%;">
                ${slide.image ? `<img src="${slide.image}" alt="Slide ${index + 1}">` : '<div class="no-image">No Image</div>'}
                <div class="text-overlay ${state.currentSlideIndex === index ? 'selected' : ''}" style="left: ${slide.position.x}%; top: ${slide.position.y}%; width: ${slideMaxWidth}%; transform: translate(-50%, -50%) scale(${previewScaleFactor}); transform-origin: center center;" data-scale="${slideScale}">
                    <div class="text-box" style="font-size: ${baseFontSize}px; width: 100%;" data-base-font-size="${baseFontSize}">
                        <span class="text-content-span">${slide.text || ''}</span>
                    </div>
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
    initDragHandlers(); // Re-bind drag handlers
}

// ==========================================
// CANVAS RENDERING
// ==========================================
function renderSlideToCanvas(slide, canvas) {
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;

    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = elements.bgColorInput.value;
    ctx.fillRect(0, 0, width, height);

    // Draw image if exists
    if (slide.image) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                drawTextOverlay(ctx, slide.text, width, height, slide.position, slide.scale, slide.maxWidth);
                resolve();
            };
            img.src = slide.image;
        });
    } else {
        drawTextOverlay(ctx, slide.text, width, height, slide.position, slide.scale, slide.maxWidth);
        return Promise.resolve();
    }
}

function drawTextOverlay(ctx, text, width, height, position = { x: 50, y: 50 }, scale = 1.5, maxWidthPercent = 120) {
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
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);

    // Draw the "Unified TikTok Blob"
    const lineHeight = canvasFontSize * 1.25;
    const totalHeight = lines.length * lineHeight;
    const rects = [];
    let currentYForRect = textY - (totalHeight / 2);

    // Increased padding for authentic TikTok look
    const paddingX = canvasFontSize * 0.45;
    const paddingY = canvasFontSize * 0.18;
    const cornerRadius = canvasFontSize * 0.25;

    lines.forEach((line) => {
        const metrics = ctx.measureText(line);
        const lineWidth = metrics.width;

        // Correct Y positioning: the text is drawn at the center of the line.
        // startYForText for line i is: top + (i * lineHeight) + (lineHeight / 2)
        // So the rect should be centered around: currentYForRect + (lineHeight / 2)
        const centerY = currentYForRect + (lineHeight / 2);

        rects.push({
            x: textX - (lineWidth / 2) - paddingX,
            y: centerY - (canvasFontSize / 2) - paddingY,
            w: lineWidth + (paddingX * 2),
            h: canvasFontSize + (paddingY * 2)
        });
        currentYForRect += lineHeight;
    });

    // Function to draw a unified path for the background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();

    if (rects.length > 0) {
        // Trace RIGHT side
        ctx.moveTo(rects[0].x + cornerRadius, rects[0].y);
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            const next = rects[i + 1];

            // Top right
            ctx.lineTo(r.x + r.w - cornerRadius, r.y);
            ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + cornerRadius, cornerRadius);

            if (next) {
                // Bottom right transition
                if (next.w > r.w) {
                    // Step out: Draw arc to next width
                    ctx.lineTo(r.x + r.w, next.y - cornerRadius);
                    ctx.arcTo(r.x + r.w, next.y, next.x + next.w, next.y, cornerRadius);
                } else if (next.w < r.w) {
                    // Step in: Draw arc inwards
                    ctx.lineTo(r.x + r.w, next.y - cornerRadius);
                    ctx.arcTo(r.x + r.w, next.y, next.x + next.w, next.y, cornerRadius);
                } else {
                    ctx.lineTo(r.x + r.w, next.y);
                }
            } else {
                // Final bottom right
                ctx.lineTo(r.x + r.w, r.y + r.h - cornerRadius);
                ctx.arcTo(r.x + r.w, r.y + r.h, r.x + r.w - cornerRadius, r.y + r.h, cornerRadius);
            }
        }

        // Trace LEFT side (backwards)
        for (let i = rects.length - 1; i >= 0; i--) {
            const r = rects[i];
            const prev = rects[i - 1];

            // Bottom left
            ctx.lineTo(r.x + cornerRadius, r.y + r.h);
            ctx.arcTo(r.x, r.y + r.h, r.x, r.y + r.h - cornerRadius, cornerRadius);

            if (prev) {
                // Top left transition
                if (prev.w > r.w) {
                    ctx.lineTo(r.x, prev.y + prev.h + cornerRadius);
                    ctx.arcTo(r.x, prev.y + prev.h, prev.x, prev.y + prev.h, cornerRadius);
                } else if (prev.w < r.w) {
                    ctx.lineTo(r.x, prev.y + prev.h + cornerRadius);
                    ctx.arcTo(r.x, prev.y + prev.h, prev.x, prev.y + prev.h, cornerRadius);
                } else {
                    ctx.lineTo(r.x, prev.y + prev.h);
                }
            } else {
                // Final top left
                ctx.lineTo(r.x, r.y + cornerRadius);
                ctx.arcTo(r.x, r.y, r.x + cornerRadius, r.y, cornerRadius);
            }
        }
    }
    ctx.closePath();
    ctx.fill();

    // Draw the text on top
    ctx.fillStyle = '#000000';
    let startYForText = textY - (totalHeight / 2) + (lineHeight / 2);
    lines.forEach((line) => {
        ctx.fillText(line, textX, startYForText);
        startYForText += lineHeight;
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
            if (state.slides[imageIndex]) {
                state.slides[imageIndex].image = e.target.result;
            }

            if (index === 0) {
                renderSlidesPreview();
            }
        };
        reader.readAsDataURL(file);
    });

    showNotification(`${files.length} image(s) uploaded`, 'success');
}

// ==========================================
// CHARACTER ANCHOR
// ==========================================
function handleAnchorUpload(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Please upload an image file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.characterAnchor = e.target.result;
        elements.anchorImgPreview.src = e.target.result;
        elements.characterAnchorPreview.style.display = 'block';
        showNotification('Character anchor uploaded!', 'success');
    };
    reader.readAsDataURL(file);
}

function clearCharacterAnchor() {
    state.characterAnchor = null;
    elements.anchorImgPreview.src = '';
    elements.characterAnchorPreview.style.display = 'none';
    showNotification('Character anchor cleared', 'info');
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
                service: state.currentService
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
// METADATA GENERATION
// ==========================================
async function generateMetadata() {
    if (!ensureSlidesParsed()) {
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                slides_text: state.slides.map(s => s.text).join('\n'),
                format: state.currentFormat,
                topic: state.currentTopic,
                service: state.currentService,
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
            showNotification('Metadata generated!', 'success');
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

    // Update buttons
    document.querySelectorAll('.service-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.service === service);
    });

    // Update panels
    elements.servicePanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${service}`);
    });
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
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

    // Generate native slides
    if (elements.generateNativeSlidesBtn) {
        elements.generateNativeSlidesBtn.addEventListener('click', generateNativeSlides);
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

    // Parse slides
    if (elements.parseSlidesBtn) {
        elements.parseSlidesBtn.addEventListener('click', () => {
            const text = elements.slideTextInput.value;
            state.slides = parseSlidesFromText(text).map((slide, index) => ({
                ...slide,
                id: Date.now() + index,
                image: state.generatedImages[index] || null, // Attach generated image if available
                position: { x: 50, y: 50 },
                scale: 1.5,
                maxWidth: 120
            }));
            renderSlidesPreview();

            if (elements.hookContextStatus) {
                elements.hookContextStatus.style.display = 'flex';
                elements.hookContextStatus.querySelector('.status-text').textContent =
                    `Using ${state.slides.length} slides for context`;
            }

            showNotification(`Parsed ${state.slides.length} slides`, 'success');
        });
    }

    // Quick improve hook
    if (elements.quickImproveHookBtn) {
        elements.quickImproveHookBtn.addEventListener('click', improveHooks);
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
            state.slides.splice(index, 1);
            renderSlidesPreview();
            showNotification('Slide deleted', 'info');
        }

        if (e.target.classList.contains('edit-slide-btn')) {
            const index = parseInt(e.target.dataset.index);
            const currentScale = state.slides[index].scale || 1.15;
            const scalePercent = Math.round(currentScale * 100);
            const currentWidth = state.slides[index].maxWidth || 85;

            const newText = prompt(`Edit slide text (Scale: ${scalePercent}%, Width: ${Math.round(currentWidth)}%):`, state.slides[index].text);
            if (newText !== null) {
                state.slides[index].text = newText;
                elements.slideTextInput.value = state.slides.map((s, i) => `Slide ${i + 1}: ${s.text}`).join('\n');
                renderSlidesPreview();
            }
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
            state.currentSlideIndex = index;
            document.querySelectorAll('.slide-editor').forEach((card, i) => {
                card.classList.toggle('selected', i === index);
            });
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
                position: { x: 50, y: 50 },
                scale: 1.5,
                maxWidth: 120
            }));
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
}

function initDragHandlers() {
    const overlays = document.querySelectorAll('.text-overlay');
    overlays.forEach(overlay => {
        overlay.addEventListener('mousedown', handleDragStart);
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

    const overlay = e.target.closest('.text-overlay');
    if (!overlay) return;

    const slideEditor = overlay.closest('.slide-editor');
    if (!slideEditor) return;

    const index = parseInt(slideEditor.dataset.index);

    state.isDragging = true;
    state.dragStartIndex = index;
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

        // Update UI immediately
        const overlay = slideEditor.querySelector('.text-overlay');
        overlay.style.left = `${newX}%`;
        overlay.style.top = `${newY}%`;

        // Update state
        state.slides[state.dragStartIndex].position = { x: newX, y: newY };
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
        const position = oldSlides[index] ? oldSlides[index].position : { x: 50, y: 50 };
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

    renderSlidesPreview();
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile, topic, service: 'syp', brandingMode })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
    initEventListeners();

    // Initialize with default values
    if (elements.nativeGenFormat) {
        state.currentFormat = elements.nativeGenFormat.value;
    }
    if (elements.nativeGenTopic) {
        state.currentTopic = elements.nativeGenTopic.value;
    }
    if (elements.includeBrandingDbt) {
        state.includeBranding = elements.includeBrandingDbt.checked;
    }

    console.log('App initialized');
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
