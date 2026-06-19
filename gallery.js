/*!
 * Gallery v1.0
 * Ultimate gallery with templates
 * 
 * @author Serge Galich <gaserge@mail.ru>
 * @copyright 2025
 * @license MIT
 * @website http://qujs.ru/frame/gallery/
 * 
 * @requires Qu, Frame
 */

(function(global) {
    'use strict';
    
    const LIB_NAME = 'Gallery';
    const DATA_PREFIX = 'qu-gallery';
    const QU_PREFIX = 'qu';
    
    if (global.Qu && global.Qu[LIB_NAME]) {
        global.Qu.debug(`⚠️ [${LIB_NAME}] Already registered, skipping duplicate`);
        return;
    }
    
    let Qu = null;
    let _initOnce = false;

    const DEFAULT_TEMPLATE = `
<template id="default-gallery">
    <div class="swiper" style="width:100%; height:100%;" id="gallery-{{uniqid}}">
        <div class="swiper-wrapper" data-container>
            <div class="swiper-slide">
                <img data-${QU_PREFIX}-gallery-no-close src="{src}" style="max-width:100%; max-height:90vh; object-fit:contain;">
                <div style="position:absolute; bottom:20px; left:0; right:0; text-align:center; color:white; background:rgba(0,0,0,0.5); padding:8px 16px; margin:0 20px; border-radius:20px;">{caption}</div>
            </div>
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-prev" data-${QU_PREFIX}-gallery-no-close></div>
        <div class="swiper-button-next" data-${QU_PREFIX}-gallery-no-close></div>
    </div>
    
    <script>
        (function() {
            var id = 'gallery-{{uniqid}}';
            
            setTimeout(function() {
                var swiperEl = document.getElementById(id);
                
                if (swiperEl && window.Swiper) {
                    new Swiper(swiperEl, {
                        slidesPerView: 1,
                        loop: swiperEl.querySelectorAll('.swiper-slide').length > 1,
                        navigation: {
                            nextEl: '.swiper-button-next',
                            prevEl: '.swiper-button-prev',
                        },
                        pagination: {
                            el: '.swiper-pagination',
                            type: 'fraction',
                        },
                        
                        updateOnWindowResize: false,
                        resizeObserver: false,
                        observer: false,
                        observeParents: false,
                        observeSlideChildren: false,
                    });
                }
            }, 0);
        })();
    </script>
</template>`;

    const TEMPLATE_SIMPLE = `
<template 
    data-${QU_PREFIX}-slide-function="
        (item) => {
            return \`<div class='swiper-slide'>
            <div class='swiper-zoom-container'>
                        <img data-${QU_PREFIX}-gallery-no-close src='\${item.src}' style='max-width:100%; max-height:100vh; object-fit:contain;' loading='lazy'>
                        <div class='swiper-lazy-preloader swiper-lazy-preloader-white'></div>
                    </div>
                     \${item.caption ? \`<div class='swiper-slide-caption-item'>\${item.caption}</div>\` : ''}
                    
                    </div>\`;
        }"
    data-${QU_PREFIX}-init-function="
        (container, items, options) => {
            const swiper = new Swiper(container, {
                initialSlide: options.currentSlide || 0, 
                lazy: true,
                slidesPerView: 1,
                longSwipes: false,
                grabCursor: true,
                zoom: {
                    limitToOriginalSize: true, 
                    toggle: true
                },
                loop: items.length > 1,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                pagination: {
                    el: '.swiper-pagination',
                    type: 'fraction',
                },
                keyboard: {
                    enabled: true,
                    onlyInViewport: false,
                },

                updateOnWindowResize: false,
                resizeObserver: false,
                observer: false,
                observeParents: false,
                observeSlideChildren: false,
            });
            container._swiper = swiper;
        }"
    
    data-${QU_PREFIX}-destroy-function="
        (dialog) => {
            console.log('Вызвана полная очистка Swiper');
            const containers = dialog.querySelectorAll('.swiper, .gallery-top, .gallery-thumbs');
            containers.forEach(el => {
                if (el.swiper) {
                    // 1. Сначала отключаем и удаляем все модули, которые могут висеть на document/window
                    if (el.swiper.keyboard && el.swiper.keyboard.enabled) {
                        el.swiper.keyboard.disable();
                    }
                    if (el.swiper.mousewheel && el.swiper.mousewheel.enabled) {
                        el.swiper.mousewheel.disable();
                    }
                    // 2. Затем очищаем обсерверы
                    if (el.swiper.observer) { el.swiper.observer.disconnect(); el.swiper.observer = null; }
                    if (el.swiper.resize && el.swiper.resize.observer) { el.swiper.resize.observer.disconnect(); el.swiper.resize.observer = null; }
                    
                    // 3. Снимаем слушатели с window (на всякий случай)
                    window.removeEventListener('resize', el.swiper.resize?.resizeHandler);
                    window.removeEventListener('orientationchange', el.swiper.resize?.orientationHandler);

                    // 4. Только теперь полностью уничтожаем экземпляр
                    el.swiper.destroy(true, true);
                    delete el.swiper;
                }
                el.remove(); // удаляем контейнер из DOM
            });
            // Очищаем ссылки
            delete dialog._gallerySwiper;
            delete dialog._galleryThumbsSwiper;
        }
    "
    >
    <div class="swiper" style="width:100%; height:100%;" id="gallery-{{uniqid}}">
        <div class="swiper-wrapper" data-container></div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-prev" data-${QU_PREFIX}-gallery-no-close></div>
        <div class="swiper-button-next" data-${QU_PREFIX}-gallery-no-close></div>
    </div>
</template>
`;

    const TEMPLATE_WITH_THUMBS = `
<template 
    data-${QU_PREFIX}-slide-function="
        (item) => {
            return \`<div class='swiper-slide'>
                <div class='swiper-zoom-container'>
                    <img class='no-lazyloaded' data-${QU_PREFIX}-gallery-no-close src='\${item.src}' style='max-width:100%; max-height:100vh; object-fit:contain;' loading='lazy'>
                    <div class='swiper-lazy-preloader swiper-lazy-preloader-white'></div>
                </div>
                \${item.caption ? \`<div class='swiper-slide-caption-item is-with-thumbs'>\${item.caption}</div>\` : ''}
            </div>\`;
        }"
    data-${QU_PREFIX}-thumb-function="
        (item) => {
            return \`<div class='swiper-slide' data-${QU_PREFIX}-gallery-no-close>
                <img class='no-lazyloaded' src='\${item.thumb || item.src}'  loading='lazy' >
                <div class='swiper-lazy-preloader swiper-lazy-preloader-white'></div>
            </div>\`;
        }"
    data-${QU_PREFIX}-init-function="
        (container, items, options) => {
            const topEl = container.querySelector('.gallery-top');
            const thumbsEl = container.querySelector('.gallery-thumbs');
            
            if (!topEl || !thumbsEl) return;
            
            const thumbs = new Swiper(thumbsEl, {
                initialSlide: options.currentSlide || 0, 
                lazy: true,
                spaceBetween: 10,
                slidesPerView: 'auto',
                grabCursor: true,
                watchSlidesProgress: true,
                centeredSlides: true,
                initialSlide: Math.floor(items.length / 2),

                updateOnWindowResize: false,
                resizeObserver: false,
                observer: false,
                observeParents: false,
                observeSlideChildren: false,
            });
            
            const top = new Swiper(topEl, {
                initialSlide: options.currentSlide || 0, 
                lazy: true,
                slidesPerView: 1,
                grabCursor: true,
                longSwipes: false,
                zoom: {
                    limitToOriginalSize: true, 
                    toggle: true
                },
                loop: items.length > 1,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                pagination: { el: container.querySelector('.swiper-pagination'), type: 'fraction' },
                keyboard: { enabled: true },
                thumbs: { swiper: thumbs },

                updateOnWindowResize: false,
                resizeObserver: false,
                observer: false,
                observeParents: false,
                observeSlideChildren: false,

                ...options
            });
            container._swiper = top;
        }"
        
    data-${QU_PREFIX}-destroy-function="
        (dialog) => {

            console.log('Вызвана полная очистка Swiper');
            const containers = dialog.querySelectorAll('.swiper, .gallery-top, .gallery-thumbs');
            containers.forEach(el => {
                if (el.swiper) {
                    // 1. Сначала отключаем и удаляем все модули, которые могут висеть на document/window
                    if (el.swiper.keyboard && el.swiper.keyboard.enabled) {
                        el.swiper.keyboard.disable();
                    }
                    if (el.swiper.mousewheel && el.swiper.mousewheel.enabled) {
                        el.swiper.mousewheel.disable();
                    }
                    // 2. Затем очищаем обсерверы
                    if (el.swiper.observer) { el.swiper.observer.disconnect(); el.swiper.observer = null; }
                    if (el.swiper.resize && el.swiper.resize.observer) { el.swiper.resize.observer.disconnect(); el.swiper.resize.observer = null; }
                    
                    // 3. Снимаем слушатели с window (на всякий случай)
                    window.removeEventListener('resize', el.swiper.resize?.resizeHandler);
                    window.removeEventListener('orientationchange', el.swiper.resize?.orientationHandler);
        
                    // 4. Только теперь полностью уничтожаем экземпляр
                    el.swiper.destroy(true, true);
                    delete el.swiper;
                }
                el.remove(); // удаляем контейнер из DOM
            });
            // Очищаем ссылки
            delete dialog._gallerySwiper;
            delete dialog._galleryThumbsSwiper;
        }"
>
    <div>
        <div class="swiper gallery-top" style="flex:1;">
            <div class="swiper-wrapper" data-container></div>
            <div class="swiper-pagination"></div>
            <div class="swiper-button-prev" data-${QU_PREFIX}-gallery-no-close></div>
            <div class="swiper-button-next" data-${QU_PREFIX}-gallery-no-close></div>
        </div>
        <div class="swiper gallery-thumbs is-style-1" data-thumbs data-${QU_PREFIX}-gallery-no-close->
            <div class="swiper-wrapper" ></div>
        </div>
    </div>
</template>
`;




    const DEFAULT_CONFIG = {
        libPath: 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
        libCssPath: 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
        libGlobal: 'Swiper',
        attrGroup: DATA_PREFIX,
        attrSrc: 'data-src',
        attrCaption: 'data-caption',
        attrTemplate: 'data-template',
        lazyLoad: true,
        frameOptions: {
            theme: 'gallery',
            modal: true,
            closeButton: true,
            animationOpen: 'fadeIn',
            animationClose: 'fadeIn'
        }
    };

    function Constructor(params = {}) {
        this._config = Object.assign({}, DEFAULT_CONFIG);
        Object.assign(this._config, params);
        this._loadedLibs = {};
        this._loadingLibs = {};
        
        this.init();
    }
    Constructor._debug = false; // true by default
    Constructor.libName = LIB_NAME;

    // Статические методы для работы с data-атрибутами
    Constructor._setData = function(el, name, value, prefix = DATA_PREFIX) {
        const attrName = `data-${prefix}-${name}`;
        if (value === undefined) {
            el.setAttribute(attrName, '');
        } else {
            el.setAttribute(attrName, value);
        }
    };

    Constructor._getData = function(el, name, prefix = DATA_PREFIX) {
        if (!el || typeof el.getAttribute !== 'function') {
            return null;
        }
        return el.getAttribute(`data-${prefix}-${name}`);
    };

    Constructor._hasData = function(el, name, prefix = DATA_PREFIX) {
        if (!el || typeof el.hasAttribute !== 'function') {
            return false;
        }
        return el.hasAttribute(`data-${prefix}-${name}`);
    };

    Constructor._getDataAttrName = function(name, prefix = DATA_PREFIX) {
        if (name) {
            return `data-${prefix}-${name}`;
        }
        return `data-${prefix}`;
    };

    Constructor._Qu = {
        debug: function(...args) {
            if (Qu && Qu.debug) return Qu.debug(...args);
            console.log(...args);
        },

        loadAssets: function(items, options = {}) {
            if (Qu && Qu.loadAssets) return Qu.loadAssets(items, options);
            return null;
        },

        loading: function(state, el) {
            if (Qu && Qu.loading) return Qu.loading(state, el);
            if (el) el.style.opacity = state ? 0.5 : 1;
        },

        on: function(el, ev, handler, opts) {
            if (Qu && Qu.on) { return Qu.on(el, ev, handler, opts); }
            return null;
        },

        off: function(el, ev, handler, opts) {
            if (Qu && Qu.off) { return Qu.off(el, ev, handler, opts); }
            return null;
        },

        dom: function() {
            if (Qu && Qu.dom) return Qu.dom();
            return Promise.resolve();
        },
        
        get Frame() {
            if (Qu && Qu.Frame) {
                return Qu.Frame;
            }
            return null;
        },
    };

    Constructor.use = function(fn) {
        if (typeof fn === 'function') {
            fn(Constructor);
        }
    };

    Constructor.extend = function() {
        if (Array.isArray(global[LIB_NAME + 'Extend'])) {
            global[LIB_NAME + 'Extend'].forEach((fn) => {
                Constructor.use(fn);
            });
            global[LIB_NAME + 'Extend'] = [];
        }
    };

    Constructor.loaded = function(quInstance) {
        Qu = quInstance;
        Constructor.extend();
        Constructor.debug(`📗 [${LIB_NAME}] loaded`);
    };

    Constructor.initOnce = function(params = {}) {
        if (_initOnce === true) return;
        _initOnce = true;
    };

    Constructor.init = function(quInstance, params = {}) {
        console.log('GALLERY Constructor init')
        Qu = quInstance;
        Constructor.initOnce(params);
        Constructor.config(params);
    };

    Constructor.config = function(options) {
        Object.assign(DEFAULT_CONFIG, options);
        return Constructor;
    };

    Constructor.debug = function(...args) {
        if (!Constructor._debug) return;
        Constructor._Qu.debug(...args);
    };

    Constructor.prototype = {
        constructor: Constructor,
        _compiledCache: {},

        use: function(fn) {
            if (typeof fn === 'function') {
                fn(this);
            }
        },

        init: function() {
            console.log('GALLERY Constructor.prototype init')
            if (!this._config.lazyLoad) {
                const assets = [];
                if (this._config.libCssPath) {
                    assets.push(this._config.libCssPath);
                }
                if (this._config.libPath && this._config.libGlobal && !global[this._config.libGlobal]) {
                    assets.push(this._config.libPath);
                }
                if (assets.length > 0) {
                    Constructor._Qu.loadAssets(assets, { waitForLoad: true });
                }
            }
            this.initGalleries();
            return this;
        },
        
        initGalleries: function() {
            Constructor._Qu.off('click', `[${Constructor._getDataAttrName('', this._config.attrGroup)}]`, this._handleClick);
            Constructor._Qu.on('click', `[${Constructor._getDataAttrName('', this._config.attrGroup)}]`, this._handleClick.bind(this));
        },
        
        _handleClick: function(e) {
            e.preventDefault();
            const trigger = e._target || e.currentTarget;
            if (!trigger || typeof trigger.hasAttribute !== 'function') return;
            
            const group = trigger.getAttribute(Constructor._getDataAttrName('', this._config.attrGroup));
            const triggerData = {};
            Object.keys(trigger.dataset).forEach(key => {
                if (!['gallery', 'template', 'src', 'caption'].includes(key)) {
                    triggerData[key] = trigger.dataset[key];
                }
            });
            
            let items = [];
            let currentSlide = 0;
            
            if (!group || group === '1' || group.trim() === '') {
                const src = this._getSrc(trigger);
                if (src) {
                    items = [{
                        src: src,
                        caption: trigger.getAttribute(this._config.attrCaption) || '',
                        alt: trigger.getAttribute('alt') || '',
                        ...triggerData,
                        ...trigger.dataset
                    }];
                }
            } else {
                items = this._getGroupItems(group, triggerData);
                currentSlide = this._getIndex(trigger, group);
            }
            
            if (items.length === 0) return;
            items.forEach((item, i, arr) => {
                item.index = i + 1;
                item.total = arr.length;
            });
            
            this.open(items, {
                title: trigger.getAttribute(Constructor._getDataAttrName('-title', this._config.attrGroup)) || (group ? group : 'Фото'),
                template: trigger.getAttribute(this._config.attrTemplate),
                currentSlide: currentSlide
            });
        },
        
        _getIndex: function(el, group) {
            const items = document.querySelectorAll(`[${Constructor._getDataAttrName('', this._config.attrGroup)}="${group}"]`);
            return Array.from(items).indexOf(el);
        },
        
        _getSrc: function(el) {
            return el.getAttribute(this._config.attrSrc) || el.getAttribute('href') || (el.tagName === 'IMG' ? el.src : el.querySelector('img')?.src);
        },
        
        _getGroupItems: function(group, triggerData = {}) {
            const items = [];
            document.querySelectorAll(`[${Constructor._getDataAttrName('', this._config.attrGroup)}="${group}"]`).forEach(el => {
                const src = this._getSrc(el);
                if (src) {
                    const itemData = {};
                    Object.keys(el.dataset).forEach(key => {
                        if (key !== 'gallery') {
                            itemData[key] = el.dataset[key];
                        }
                    });
                    items.push({
                        src: src,
                        caption: el.getAttribute(this._config.attrCaption) || '',
                        alt: el.getAttribute('alt') || '',
                        element: el,
                        ...triggerData,
                        ...itemData,
                        ...el.dataset
                    });
                }
            });
            return items;
        },
        
        _getTemplate: function(templateId, items) {
            if (templateId) {
                const template = document.getElementById(templateId);
                if (template && template.tagName === 'TEMPLATE') {
                    return template;
                }
            }
            const hasThumbs = items && items.some(item => item.thumb);
            const isSingle = items && items.length === 1;
            let templateHtml;
            if (!isSingle && hasThumbs) {
                templateHtml = TEMPLATE_WITH_THUMBS ;
            } else {
                templateHtml = TEMPLATE_SIMPLE;
            }
            const parser = new DOMParser();
            const doc = parser.parseFromString(templateHtml, 'text/html');
            return doc.querySelector('template');
        },

        _processTemplate: function(template, items, sliderOptions = {}) {
            const uniqid = 'gallery_' + Math.random().toString(36).substr(2, 9);
            let html = template.innerHTML.replace(/\{\{uniqid\}\}/g, uniqid);
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const content = doc.body;
            
            let slideFn = null, thumbFn = null, initFn = null;

            // Вспомогательная функция для кеширования
            const getCompiledFunction = (src, type) => {
                if (!src) return null;
                const cacheKey = type + '_' + src;
                if (!this._compiledCache[cacheKey]) {
                    try {
                        if (type === 'slide' || type === 'thumb') {
                            this._compiledCache[cacheKey] = new Function('item', 'return (' + src + ')(item)');
                        } else if (type === 'init') {
                            this._compiledCache[cacheKey] = new Function('container', 'items', 'options', 'return (' + src + ')(container, items, options)');
                        } else if (type === 'destroy') {
                            this._compiledCache[cacheKey] = new Function('dialog', 'return (' + src + ')(dialog)');
                        }
                    } catch(e) {}
                }
                return this._compiledCache[cacheKey] || null;
            };

            const slideFunctionSrc = Constructor._getData(template, 'slide-function', QU_PREFIX);
            slideFn = getCompiledFunction(slideFunctionSrc, 'slide');

            const thumbFunctionSrc = Constructor._getData(template, 'thumb-function', QU_PREFIX);
            thumbFn = getCompiledFunction(thumbFunctionSrc, 'thumb');

            const initFunctionSrc = Constructor._getData(template, 'init-function', QU_PREFIX);
            initFn = getCompiledFunction(initFunctionSrc, 'init');

/*             
            const slideFunction = Constructor._getData(template, 'slide-function', QU_PREFIX);
            if (slideFunction) {
                try {
                    slideFn = new Function('item', 'return (' + slideFunction + ')(item)');
                } catch(e) {}
            }
            
            const thumbFunction = Constructor._getData(template, 'thumb-function', QU_PREFIX);
            if (thumbFunction) {
                try {
                    thumbFn = new Function('item', 'return (' + thumbFunction + ')(item)');
                } catch(e) {}
            }
            
            const initFunction = Constructor._getData(template, 'init-function', QU_PREFIX);
            if (initFunction) {
                try {
                    initFn = new Function('container', 'items', 'options', 'return (' + initFunction + ')(container, items, options)');
                } catch(e) {}
            } */
            
            const sliderOptionsData = Constructor._getData(template, 'slider-options', QU_PREFIX);
            if (sliderOptionsData) {
                try {
                    sliderOptions = JSON.parse(sliderOptionsData);
                } catch(e) {}
            }
            
            const container = content.querySelector('[data-container]');
            if (container) {
                if (slideFn) {
                    container.innerHTML = '';
                    items.forEach(item => {
                        try {
                            const slideHtml = slideFn(item);
                            if (slideHtml) {
                                const slideTemp = document.createElement('div');
                                slideTemp.innerHTML = slideHtml;
                                while (slideTemp.firstChild) {
                                    container.appendChild(slideTemp.firstChild);
                                }
                            }
                        } catch(e) {}
                    });
                } else {
                    const slideTemplate = container.innerHTML;
                    if (slideTemplate) {
                        container.innerHTML = '';
                        items.forEach(item => {
                            let slideHtml = slideTemplate;
                            Object.keys(item).forEach(key => {
                                slideHtml = slideHtml.replace(new RegExp(`{${key}}`, 'g'), item[key] || '');
                            });
                            const slideTemp = document.createElement('div');
                            slideTemp.innerHTML = slideHtml;
                            while (slideTemp.firstChild) {
                                container.appendChild(slideTemp.firstChild);
                            }
                        });
                    }
                }
            }
            
            if (thumbFn) {
                const thumbContainers = content.querySelectorAll('[data-thumbs]');
                thumbContainers.forEach(container => {
                    const hasThumbs = items.some(item => item.thumb);
                    if (hasThumbs) {
                        container.style.display = 'block';
                        const wrapper = container.querySelector('.swiper-wrapper') || container;
                        wrapper.innerHTML = '';
                        items.forEach(item => {
                            try {
                                const thumbHtml = thumbFn(item);
                                if (thumbHtml) {
                                    const thumbTemp = document.createElement('div');
                                    thumbTemp.innerHTML = thumbHtml;
                                    while (thumbTemp.firstChild) {
                                        wrapper.appendChild(thumbTemp.firstChild);
                                    }
                                }
                            } catch(e) {}
                        });
                    }
                });
            }
            
            if (initFn) {
                content._galleryInit = { fn: initFn, items: items, options: sliderOptions };
            }

            const destroyFunctionSrc = Constructor._getData(template, 'destroy-function', QU_PREFIX);
            const destroyFn = getCompiledFunction(destroyFunctionSrc, 'destroy');
            if (destroyFn) {
                content._galleryDestroy = destroyFn;
            }
            return content;
        },
        
        open: function(items, options = {}) {
            if (!Constructor._Qu || !Constructor._Qu.Frame) {
                console.error(`❌ [${LIB_NAME}] requires Qu.Frame`);
                return this;
            }
            
            const template = this._getTemplate(options.template, items);
            const sliderOptions = {
                currentSlide: options.currentSlide || 0,
                ...(Constructor._getData(template, 'slider-options', QU_PREFIX) ? JSON.parse(Constructor._getData(template, 'slider-options', QU_PREFIX)) : {})
            };
            
            const content = this._processTemplate(template, items, sliderOptions);
            const libPath = Constructor._getData(template, 'lib-path', QU_PREFIX) || this._config.libPath;
            const libGlobal = Constructor._getData(template, 'lib-global', QU_PREFIX) || this._config.libGlobal;
            const libCssPath = Constructor._getData(template, 'lib-css-path', QU_PREFIX) || this._config.libCssPath;
            
            
    const openFrame = () => {
        const openDialogs = document.querySelectorAll('dialog[open][data-frame]');
        const activeDialog = openDialogs[openDialogs.length - 1];
        const frameOptions = {
            ...this._config.frameOptions,
            ...(Constructor._getData(template, 'frame-options', QU_PREFIX) ? JSON.parse(Constructor._getData(template, 'frame-options', QU_PREFIX)) : {}),
            ...options.frameOptions
        };

        let dlg;

        // Сохраняем оригинальный onClose, если он уже был в frameOptions
        const originalOnClose = frameOptions.onClose;
        frameOptions.onClose = function() {
            if (typeof originalOnClose === 'function') {
                originalOnClose.apply(this, arguments);
            }
        };

        Constructor._Qu.Frame.open({
            content: content.innerHTML,
            modal: true,
            closeButton: true,
            onOpen: (dialog) => {
                // Уничтожаем все Swiper при закрытии диалога (событие 'close')
                dialog.addEventListener('close', () => {
                    if (content._galleryDestroy) {
                        content._galleryDestroy(dialog);
                    }
                    // Удаляем диалог из коллекции Frame
                    if (Constructor._Qu.Frame && Constructor._Qu.Frame._dialogs) {
                        Constructor._Qu.Frame._dialogs.delete(dialog);
                    }
                }, { once: true });
        
                
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
                setTimeout(() => {
                    dialog.classList.add('QuGallery-animate');
                    setTimeout(() => dialog.classList.remove('QuGallery-animate'), 1200);
                    if (content._galleryInit) {
                        const { fn, items, options } = content._galleryInit;
                        const hasThumbs = content.querySelector('[data-thumbs]');
                        if (hasThumbs) {
                            fn(dialog, items, options);          // просто запускаем init‑функцию
                        } else {
                            const containerEl = dialog.querySelector('[data-container]')?.parentElement;
                            if (containerEl) {
                                fn(containerEl, items, options); // запускаем init‑функцию
                            }
                        }     

                        if (activeDialog) {
                            Constructor._Qu.loading(false, activeDialog);
                        } else {
                            Constructor._Qu.loading(false, document.body);
                        }
                    }
                    // Остальная часть (скрипты, клики) без изменений
                    const scripts = dialog.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(attr => {
                            newScript.setAttribute(attr.name, attr.value);
                        });
                        newScript.textContent = oldScript.textContent;
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
         /*            setTimeout(() => {
                        dialog.addEventListener('click', (e) => {
                            let target = e.target;
                            let shouldClose = true;
                            while (target && target !== dialog) {
                                if (target.hasAttribute(`data-${QU_PREFIX}-gallery-no-close`)) {
                                    shouldClose = false;
                                    break;
                                }
                                target = target.parentNode;
                            }
                            if (e.target === dialog) shouldClose = true;
                            if (shouldClose) Constructor._Qu.Frame.close(dialog);
                        });
                    }, 100); */

                    // Сохраняем обработчик, чтобы удалять при повторном открытии
                    if (dialog._galleryClickHandler) {
                        dialog.removeEventListener('click', dialog._galleryClickHandler);
                    }
                    const clickHandler = (e) => {
                        // Проверяем, не кликнули ли по элементу с data-qu-gallery-no-close
                        if (e.target.closest(`[data-${QU_PREFIX}-gallery-no-close]`)) return;
                        // Закрываем диалог
                        Constructor._Qu.Frame.close(dialog);
                    };
                    dialog._galleryClickHandler = clickHandler;
                    dialog.addEventListener('click', clickHandler); 

            /*         setTimeout(() => {
                        if (dialog._galleryClickHandler) {
                            dialog.removeEventListener('click', dialog._galleryClickHandler);
                        }
                        const clickHandler = (e) => {
                            if (e.target.closest(`[data-${QU_PREFIX}-gallery-no-close]`)) return;
                            Constructor._Qu.Frame.close(dialog);
                        };
                        dialog._galleryClickHandler = clickHandler;
                        dialog.addEventListener('click', clickHandler);
                    }, 100); */

                }, 0);
            }); });
            },

            onOpen: (dialog) => {
                dialog.addEventListener('close', () => {
                    if (content._galleryDestroy) {
                        content._galleryDestroy(dialog);
                    }
                    if (Constructor._Qu.Frame && Constructor._Qu.Frame._dialogs) {
                        Constructor._Qu.Frame._dialogs.delete(dialog);
                    }
                }, { once: true });
            
                // Дожидаемся полной отрисовки диалога, затем инициализируем слайдер
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        dialog.classList.add('QuGallery-animate');
                        setTimeout(() => dialog.classList.remove('QuGallery-animate'), 1200);
            
                        if (content._galleryInit) {
                            const { fn, items, options } = content._galleryInit;
                            const hasThumbs = content.querySelector('[data-thumbs]');
                            if (hasThumbs) {
                                fn(dialog, items, options);
                            } else {
                                const containerEl = dialog.querySelector('[data-container]')?.parentElement;
                                if (containerEl) {
                                    fn(containerEl, items, options);
                                }
                            }
            
                            if (activeDialog) {
                                Constructor._Qu.loading(false, activeDialog);
                            } else {
                                Constructor._Qu.loading(false, document.body);
                            }
                        }
            
                        // Скрипты и обработчик клика
                        const scripts = dialog.querySelectorAll('script');
                        scripts.forEach(oldScript => {
                            const newScript = document.createElement('script');
                            Array.from(oldScript.attributes).forEach(attr => {
                                newScript.setAttribute(attr.name, attr.value);
                            });
                            newScript.textContent = oldScript.textContent;
                            oldScript.parentNode.replaceChild(newScript, oldScript);
                        });
            
                        if (dialog._galleryClickHandler) {
                            dialog.removeEventListener('click', dialog._galleryClickHandler);
                        }
                        const clickHandler = (e) => {
                            if (e.target.closest(`[data-${QU_PREFIX}-gallery-no-close]`)) return;
                            Constructor._Qu.Frame.close(dialog);
                        };
                        dialog._galleryClickHandler = clickHandler;
                        dialog.addEventListener('click', clickHandler);
                    });
                });
            },
            ...frameOptions
        });

        Constructor.debug(`🧩 [${LIB_NAME}] open`, this._config);
    };
            
            if (this._config.lazyLoad && libGlobal) {
                this._loadLibrary(libPath, libGlobal, libCssPath).then(openFrame);
            } else {
                openFrame();
            }
            return this;
        },

        _loadLibrary: function(libPath, libGlobal, libCssPath) {
            return new Promise((resolve) => {
                if (this._loadedLibs[libGlobal]) {
                    resolve();
                    return;
                }
                if (this._loadingLibs[libGlobal]) {
                    this._loadingLibs[libGlobal].push(resolve);
                    return;
                }
                this._loadingLibs[libGlobal] = [resolve];
                const openDialogs = document.querySelectorAll('dialog[open][data-frame]');
                const activeDialog = openDialogs[openDialogs.length - 1];
                if (activeDialog) {
                    Constructor._Qu.loading(true, activeDialog);
                } else {
                    Constructor._Qu.loading(true, document.body);
                }
                const assets = [];
                if (libCssPath) assets.push(libCssPath);
                if (libPath) assets.push(libPath);
                if (assets.length === 0) {
                    this._loadedLibs[libGlobal] = true;
                    if (this._loadingLibs[libGlobal]) {
                        this._loadingLibs[libGlobal].forEach(cb => cb());
                    }
                    delete this._loadingLibs[libGlobal];
                    resolve();
                    return;
                }
                Constructor._Qu.loadAssets(assets, { type: 'auto', waitForLoad: true }).then(() => {
                    this._loadedLibs[libGlobal] = true;
                    if (this._loadingLibs[libGlobal]) {
                        this._loadingLibs[libGlobal].forEach(cb => cb());
                    }
                    delete this._loadingLibs[libGlobal];
                }).catch(() => {
                    if (activeDialog) {
                        Constructor._Qu.loading(false, activeDialog);
                    } else {
                        Constructor._Qu.loading(false, document.body);
                    }
                });
            });
        },
        
        openGroup: function(group, options) {
            options = options || {};
            const items = this._getGroupItems(group);
            if (!items.length) return this;
            items.forEach((item, i, arr) => {
                item.index = i + 1;
                item.total = arr.length;
            });
            return this.open(items, {
                title: options.title || group,
                template: options.template,
                currentSlide: options.currentSlide || 0
            });
        },
        
        refresh: function() {
            this.initGalleries();
            return this;
        }
    };

    if (global.Qu) {
        global.Qu.lib(LIB_NAME, Constructor);
    } else {
        global._QuLibs = global._QuLibs || [];
        global._QuLibs.push({ name: LIB_NAME, instance: Constructor });
    }
    
})(window);