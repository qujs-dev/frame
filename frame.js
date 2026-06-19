/*!
 * Frame v1.0 Simple Modal Dialogs
 * 
 * @author Serge Galich <gaserge@mail.ru>
 * @copyright 2025
 * @license MIT
 * @website http://qujs.ru/frame/
 * 
 * @requires Qu
 */

(function(global) {
    'use strict';
    
    const LIB_NAME = 'Frame';
    const DATA_PREFIX = 'qu-frame';
    const QU_PREFIX = 'qu';

    if (global.Qu && global.Qu[LIB_NAME]) {
        global.Qu.debug(`⚠️ [${LIB_NAME}] Already registered, skipping duplicate`);
        return;
    }

    let Qu = null;
    let _initOnce = false;

    const DEFAULT_CONFIG = {
        content: '',
        type: 'default',
        theme: 'default',
        modal: true,
        closeButton: true,
        backdropClose: true,
        escClose: true,
        animation: null,
        animationOpen: null,
        animationClose: null,
        animationDuration: null,
        animationDurationClose: null,
        onOpen: null,
        onClose: null,
        onBeforeOpen: null,
        onBeforeClose: null,
        template: null,
        className: '',
        cssPrefix: 'frame',
        header: true,
        
        lexicon: {
            close: 'Закрыть',
            cancel: 'Отмена',
            confirm: 'OK',
            titles: {
                success: 'Успех',
                error: 'Ошибка', 
                warning: 'Предупреждение',
                info: 'Информация',
                confirm: 'Подтверждение',
            }
        }
    };

    function Constructor(params = {}) {
        this._config = Object.assign({}, DEFAULT_CONFIG);
        Object.assign(this._config, params);
        
        this._dialogs = new Set();
        this._animationDuration = 300;
    }
    Constructor._debug = false; // true by default
    Constructor.libName = LIB_NAME;

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

    Constructor._removeData = function(el, name, prefix = DATA_PREFIX) {
        el.removeAttribute(`data-${prefix}-${name}`);
    };

    Constructor._Qu = {
        debug: function(...args) {
            if (Qu && Qu.debug) return Qu.debug(...args);
            console.log(...args);
        },

        trigger: function(el, ev, opts) {
            if (Qu && Qu.trigger) return Qu.trigger(el, ev, opts);
            const event = new CustomEvent(ev, { detail: opts?.detail });
            return el.dispatchEvent(event);
        },

        on: function(el, ev, handler, opts) {
            if (Qu && Qu.on) { return Qu.on(el, ev, handler, opts); }
            
            if (typeof ev !== 'string' && ev.addEventListener) {
                if (typeof el === 'string') {
                    el = el.split(' ').filter(e => e.trim());
                }

                el.forEach(el => {
                    ev.addEventListener(el.trim(), handler, opts);
                });
                return;
            }
            
            if (typeof ev === 'string') {
                if (typeof el === 'string') {
                    el = el.split(' ').filter(e => e.trim());
                }
                el.forEach(el => {
                    document.addEventListener(el.trim(), function(event) {
                        const target = event.target.closest(ev);
                        if (target) {
                            event._target = target;
                            handler(event);
                        }
                    }, opts);
                });
                
                return;
            }
        },

        page: function() {
            if (Qu && Qu.page) return Qu.page();

            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    global.addEventListener('load', resolve);
                }
            });
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

    Constructor._getLocalizedTitle = function(title, type, options = {}) {
        const lexicon = { ...DEFAULT_CONFIG.lexicon, ...(options.lexicon || {}) };
        return (title === undefined || title === null) 
            ? lexicon.titles[type] 
            : title;
    };

    Constructor._defaultTemplate = function(config) {
        const prefix = config.cssPrefix || 'frame';
        
        let html = '';
        
        if (config.header && (config.title || config.closeButton)) {
            html += `
                <div class="${prefix}-header">
                    ${config.title ? `<div class="${prefix}-title">${config.title}</div>` : '<div></div>'}
                    ${config.closeButton ? `<button type="button" class="${prefix}-close" aria-label="${config.lexicon?.close || DEFAULT_CONFIG.lexicon.close}">&times;</button>` : ''}
                </div>
            `;
        } else if (config.closeButton && !config.header) {
            html += `
                <button type="button" class="${prefix}-close ${prefix}-close-minimal" aria-label="${config.lexicon?.close || DEFAULT_CONFIG.lexicon.close}">&times;</button>
            `;
        }

        if (!config.content.includes(`${prefix}-footer`)) {
            html += `<div class="${prefix}-content">${config.content}</div>`;
        } else {
            html += config.content;
        }
        
        return `<div class="${prefix}-modal">${html}</div>`;
    };

    Constructor._defaultInstance = null;
    Constructor._getDefaultInstance = function() {
        if (!Constructor._defaultInstance) {
            Constructor._defaultInstance = new Constructor();
        }
        return Constructor._defaultInstance;
    };
    
    Constructor.open = function(selector) {
        return Constructor._getDefaultInstance().open(selector);
    };
    

    Constructor.close = function(dialog) {
        return Constructor._getDefaultInstance().close(dialog);
    };

    Constructor.closeAll = function() {
        return Constructor._getDefaultInstance().closeAll();
    };

    
    // Статические методы для типовых диалогов
    Constructor.success = function(content, title, options = {}) {
        return Constructor._getDefaultInstance().success(content, title, options);
    };

    Constructor.error = function(content, title, options = {}) {
        return Constructor._getDefaultInstance().error(content, title, options);
    };

    Constructor.warning = function(content, title, options = {}) {
        return Constructor._getDefaultInstance().warning(content, title, options);
    };

    Constructor.info = function(content, title, options = {}) {
        return Constructor._getDefaultInstance().info(content, title, options);
    };

    Constructor.minimal = function(content, options = {}) {
        return Constructor._getDefaultInstance().minimal(content, options);
    };

    Constructor.confirm = function(content, title, onConfirm, onCancel, options = {}) {
        return Constructor._getDefaultInstance().confirm(content, title, onConfirm, onCancel, options);
    };

    Constructor.getDialogs = function() {
        return Constructor._getDefaultInstance().getDialogs();
    };

    Constructor.hasOpenDialogs = function() {
        return Constructor._getDefaultInstance().hasOpenDialogs();
    };

    Constructor.destroy = function() {
        return Constructor._getDefaultInstance().destroy();
    };

    Constructor.getInstance = function(dialogOrSelector) {
        const dialog = typeof dialogOrSelector === 'string' 
            ? document.querySelector(dialogOrSelector) 
            : dialogOrSelector;
        
        if (!dialog) return null;
        
        return dialog._frameInstance || null;
    };

    // Прототип (методы инстанса)
    Constructor.prototype = {
        constructor: Constructor,

        use: function(fn) {
            if (typeof fn === 'function') {
                fn(this);
            }
        },

        config: function(options) {
            Object.assign(this._config, options);
            return this;
        },

        _getDialogAnimationDuration: function(dialog) {
            const computedStyle = getComputedStyle(dialog);
            const duration = computedStyle.transitionDuration;
            
            let durationMs = this._animationDuration;
            if (duration) {
                if (duration.includes('ms')) {
                    durationMs = parseFloat(duration);
                } else if (duration.includes('s')) {
                    durationMs = parseFloat(duration) * 1000;
                }
            }
            
            return Math.max(durationMs, 100);
        },

        _closePreviousDialogs: function(count) {
            if (!count) return;
            
            const openDialogs = Array.from(document.querySelectorAll('dialog[open]'));
            
            if (openDialogs.length === 0) return;
            
            if (count === true) {
                openDialogs.forEach(dialog => {
                    if (Constructor._hasData(dialog, 'frame', QU_PREFIX)) {
                        this.close(dialog);
                    }
                });
            } else if (typeof count === 'number' && count > 0) {
                const dialogsToClose = openDialogs.slice(-count);
                dialogsToClose.forEach(dialog => {
                    if (Constructor._hasData(dialog, 'frame', QU_PREFIX)) {
                        this.close(dialog);
                    }
                });
            }
        },

        _getLocalizedTitle: function(title, type, options = {}) {
            const config = { ...this._config, ...options };
            return Constructor._getLocalizedTitle(title, type, config);
        },

        _applyAnimation: function(dialog, type) {
            const config = dialog._config || this._config;
            
            if (type === 'open') {
                Constructor._removeData(dialog, 'closing', QU_PREFIX);
                requestAnimationFrame(() => {
                    Constructor._setData(dialog, 'opening', '', QU_PREFIX);
                });
            } else {
                Constructor._removeData(dialog, 'opening', QU_PREFIX);
                Constructor._setData(dialog, 'closing', '', QU_PREFIX);

                if (config && config.animationDurationClose) {
                    dialog.style.setProperty('--qu-transition-duration', config.animationDurationClose + 'ms');
                }
            }
        },

        _clearCustomDuration: function(dialog) {
            dialog.style.removeProperty('--qu-transition-duration');
            
            if (dialog._config) {
                delete dialog._config.animationDuration;
            }
        },

        _setupDialogEvents: function(dialog) {
            const config = Object.assign({}, this._config, dialog._config || {});
            const prefix = config.cssPrefix || 'frame';
            let _this = this;
            
            const closeBtns = dialog.querySelectorAll(`.${prefix}-close, .${prefix}-close-minimal`);
            
            closeBtns.forEach(closeBtn => {
                Constructor._Qu.on('click', closeBtn, (e) => {
                    e.stopPropagation();
                    this.close(dialog, 'cancel');
                });
            });

            let backdropClickStartTarget = null;

            Constructor._Qu.on('mousedown', dialog, (e) => {
                backdropClickStartTarget = e.target;
            });

            Constructor._Qu.on('click', dialog, (e) => {
                if (config.backdropClose && e.target === dialog) {
                    if (backdropClickStartTarget !== dialog) return;
                    
                    setTimeout(() => {
                        if (!window.getSelection().toString().trim()) {
                            this.close(dialog, 'cancel');
                        }
                    }, 10);
                }
                
                backdropClickStartTarget = null;
            });

            Constructor._Qu.on('close', dialog, () => {
                const config = dialog._config;
                if (config && config.onClose) {
                    config.onClose();
                }
                Constructor._removeData(dialog, 'opening', QU_PREFIX);
                Constructor._removeData(dialog, 'closing', QU_PREFIX);
                this._clearCustomDuration(dialog);
                
                this._dialogs.delete(dialog);
                
                if (dialog._frameCreated) {
                    setTimeout(() => {
                        if (dialog.parentNode) {
                            dialog.parentNode.removeChild(dialog);
                        }
                    }, 50);
                }
            });
            
            if (config.escClose !== false) {
                Constructor._Qu.on('cancel', dialog, (e) => {
                    e.preventDefault();
                    this.close(dialog, 'cancel');
                });
            }
        },

        _createDialog: function(config) {
            const dialog = document.createElement('dialog');
            const prefix = config.cssPrefix || 'frame';
            
            let dialogClasses = `${prefix}-dialog ${prefix}-${config.type}`;
            
            if (config.className) {
                dialogClasses += ` ${config.className}`;
            }
            
            if (!config.header) {
                dialogClasses += ` ${prefix}-no-header`;
            }
            
            dialog.className = dialogClasses;
            
            Constructor._setData(dialog, 'animation-open', config.animationOpen, QU_PREFIX);
            Constructor._setData(dialog, 'animation-close', config.animationClose, QU_PREFIX);
            Constructor._setData(dialog, 'frame', 'true', QU_PREFIX);
            Constructor._setData(dialog, 'theme', config.theme);

            if (config.animationDuration) {
                dialog.style.setProperty('--qu-transition-duration', config.animationDuration + 'ms');
            }
            
            dialog._config = config;
            dialog._frameCreated = true;
            dialog._frameInstance = this;

            let html = '';
            if (typeof config.template === 'function') {
                html = config.template(config);
            } else if (typeof config.template === 'string') {
                html = config.template;
            } else {
                html = Constructor._defaultTemplate(config);
            }

            dialog.innerHTML = html;
            document.body.appendChild(dialog);

            this._setupDialogEvents(dialog);

            return dialog;
        },

        open: function(selectorOrOptions) {
            if (typeof selectorOrOptions === 'string') {
                return this._openExisting(selectorOrOptions);
            }
            
            if (selectorOrOptions && selectorOrOptions.selector) {
                const options = { ...selectorOrOptions };
                const selector = options.selector;
                delete options.selector;
                return this._openExisting(selector, options);
            }
            
            return this._createNew(selectorOrOptions || {});
        },

        _openExisting: function(selector, options = {}) {
            const existingDialog = document.querySelector(selector);
        
            if (!existingDialog) {
                console.error(`❌ [${LIB_NAME}] dialog not found:`, selector);
                return this;
            }
        
            if (existingDialog.tagName !== 'DIALOG') {
                console.error(`❌ [${LIB_NAME}] element is not dialog:`, selector);
                return this;
            }
        
            this._dialogs.add(existingDialog);
            existingDialog.style.removeProperty('--qu-transition-duration');

            existingDialog._frameInstance = this;
            
            if (!existingDialog._config) {
                existingDialog._config = {};
            }
            
            const existingAnimationOpen = Constructor._getData(existingDialog, 'animation-open', QU_PREFIX);
            const existingAnimationClose = Constructor._getData(existingDialog, 'animation-close', QU_PREFIX);
            const existingTheme = Constructor._getData(existingDialog, 'theme');
            
            Constructor._removeData(existingDialog, 'animation-open', QU_PREFIX);
            Constructor._removeData(existingDialog, 'animation-close', QU_PREFIX);
            Constructor._removeData(existingDialog, 'theme');
            
            let animationOpen = options.animationOpen;
            let animationClose = options.animationClose;
            let theme = options.theme; 
            
            if (!animationOpen && existingAnimationOpen) {
                animationOpen = existingAnimationOpen;
            }
            
            if (!animationClose && existingAnimationClose) {
                animationClose = existingAnimationClose;
            }
            
            if (!animationOpen) {
                animationOpen = this._config.animationOpen || this._config.animation || 'fadeOut';
            }
            
            if (!animationClose) {
                animationClose = this._config.animationClose || this._config.animation || 'fadeIn';
            }

            if (!theme && existingTheme) {
                theme = existingTheme;
            }
            
            if (!theme) {
                theme = this._config.theme || 'default';
            }
            
            Constructor._setData(existingDialog, 'animation-open', animationOpen, QU_PREFIX);
            Constructor._setData(existingDialog, 'animation-close', animationClose, QU_PREFIX);
            Constructor._setData(existingDialog, 'theme', theme);
            
            if (options.animationDuration) {
                existingDialog.style.setProperty('--qu-transition-duration', options.animationDuration + 'ms');
            }
            
            if (options.type) {
                existingDialog.classList.add(`frame-${options.type}`);
            }
            if (options.className) {
                existingDialog.classList.add(options.className);
            }
            
            Object.assign(existingDialog._config, options);
            
            if (Constructor._hasData(existingDialog, 'frame', QU_PREFIX)) {
                existingDialog.showModal();
            } else {
                existingDialog.show();
            }
        
            requestAnimationFrame(() => {
                this._applyAnimation(existingDialog, 'open');
            });
        
            if (!existingDialog._frameInitialized) {
                this._setupDialogEvents(existingDialog);
                existingDialog._frameInitialized = true;
            }

            Constructor.debug(`🧩 [${LIB_NAME}] open existing`, {
                dialog: existingDialog,
                config: { ...this._config, ...existingDialog._config }
            });
        
            return this;
        },

        _createNew: function(options) {
            const config = { ...this._config, ...options };

            if (config.animation && !config.animationOpen && !config.animationClose) {
                config.animationOpen = config.animation;
                config.animationClose = config.animation;
            }
            if (!config.animationOpen) config.animationOpen = config.animation || 'fade';
            if (!config.animationClose) config.animationClose = config.animation || 'fade';
            
            if (config.onBeforeOpen && config.onBeforeOpen() === false) return;

            const dialog = this._createDialog(config);
            
            this._dialogs.add(dialog);
            
            if (config.modal) {
                dialog.showModal();
            } else {
                dialog.show();
            }
            
            requestAnimationFrame(() => {
                this._applyAnimation(dialog, 'open');
            });
            
            if (config.onOpen) {
                config.onOpen(dialog);
            }

            Constructor.debug(`🧩 [${LIB_NAME}] open new`, {
                dialog: dialog,
                config: config
            });

            return this;
        },

        close: function(dialogOrSelector, returnValue) {
            let dialogToClose;
            
            if (typeof dialogOrSelector === 'string') {
                dialogToClose = document.querySelector(dialogOrSelector);
            } 
            else if (dialogOrSelector && dialogOrSelector.tagName === 'DIALOG') {
                dialogToClose = dialogOrSelector;
            }
            else {
                return this.closeAll(returnValue);
            }
            
            if (!dialogToClose) return this;
            
            const config = dialogToClose._config;
            
            if (config && config.onBeforeClose && config.onBeforeClose() === false) return;

            let animationDuration = this._getDialogAnimationDuration(dialogToClose);
            
            this._applyAnimation(dialogToClose, 'close');
            
            if (config && config.animationDurationClose) {
                animationDuration = config.animationDurationClose;
            }
            
            setTimeout(() => {
                dialogToClose.close(returnValue);
                
                this._dialogs.delete(dialogToClose);
                
                if (dialogToClose._frameCreated) {
                    setTimeout(() => {
                        if (dialogToClose.parentNode) {
                            dialogToClose.parentNode.removeChild(dialogToClose);
                        }
                    }, 50);
                }
            }, animationDuration);
            
            return this;
        },

        closeAll: function(returnValue) {
            this._dialogs.forEach(dialog => {
                this.close(dialog, returnValue);
            });
            return this;
        },

        success: function(content, title, options = {}) {
            this._closePreviousDialogs(options.closePrevious);

            const finalTitle = this._getLocalizedTitle(title, 'success', options);

            return this._createNew({
                title: finalTitle,
                content: content,
                type: 'success',
                theme: options.theme || this._config.theme, 
                ...options
            });
        },

        error: function(content, title, options = {}) {
            this._closePreviousDialogs(options.closePrevious);

            const finalTitle = this._getLocalizedTitle(title, 'error', options);

            return this._createNew({
                title: finalTitle,
                content: content,
                type: 'error',
                theme: options.theme || this._config.theme, 
                ...options
            });
        },

        warning: function(content, title, options = {}) {
            this._closePreviousDialogs(options.closePrevious);

            const finalTitle = this._getLocalizedTitle(title, 'warning', options);

            return this._createNew({
                title: finalTitle,
                content: content,
                type: 'warning',
                theme: options.theme || this._config.theme, 
                ...options
            });
        },

        info: function(content, title, options = {}) {
            this._closePreviousDialogs(options.closePrevious);

            const finalTitle = this._getLocalizedTitle(title, 'info', options);

            return this._createNew({
                title: finalTitle,
                content: content,
                type: 'info',
                theme: options.theme || this._config.theme, 
                ...options
            });
        },

        minimal: function(content, options = {}) {
            this._closePreviousDialogs(options.closePrevious);

            return this._createNew({
                title: '',
                content: content,
                header: false,
                theme: options.theme || this._config.theme, 
                ...options
            });
        },

        confirm: function(content, title, onConfirm, onCancel, options = {}) {
            let _this = this;
            const finalTitle = this._getLocalizedTitle(title, 'confirm', options);
            const config = { ...this._config, ...options };
            const prefix = config.cssPrefix || 'frame';
            
            const buttons = `
                <button type="button" class="${prefix}-btn ${prefix}-cancel">${config.lexicon.cancel}</button>
                <button type="button" class="${prefix}-btn ${prefix}-confirm">${config.lexicon.confirm}</button>
            `;
            
            const form = `
                <div class="${prefix}-content">${content}</div>
                <div class="${prefix}-footer">${buttons}</div>
            `;
            
            return this._createNew({
                title: finalTitle,
                content: form,
                closeButton: true,
                ...options,
                onOpen: function(dialog) {
                    let handled = false;
                    
                    const cancelBtn = dialog.querySelector(`.${prefix}-cancel`);
                    const confirmBtn = dialog.querySelector(`.${prefix}-confirm`);
                    const closeBtn = dialog.querySelector(`.${prefix}-close`);
                    
                    const handleCancel = function() {
                        if (!handled) {
                            handled = true;
                            if (onCancel) onCancel();
                            _this.close(dialog, 'cancel');
                        }
                    };
                    
                    const handleConfirm = function() {
                        if (!handled) {
                            handled = true;
                            if (onConfirm) onConfirm();
                            _this.close(dialog, 'default');
                        }
                    };

                    if (cancelBtn) {
                        Constructor._Qu.on('click', cancelBtn, handleCancel);
                    }
                    
                    if (confirmBtn) {
                        Constructor._Qu.on('click', confirmBtn, handleConfirm);
                    }
                    
                    if (closeBtn) {
                        Constructor._Qu.on('click', closeBtn, handleCancel);
                    }
                    
                    if (config.backdropClose !== false) {
                        Constructor._Qu.on('click', dialog, function(e) {
                            if (e.target === dialog) {
                                handleCancel();
                            }
                        });
                    }
                    
                    if (config.escClose !== false) {
                        Constructor._Qu.on('cancel', dialog, function(e) {
                            e.preventDefault();
                            handleCancel();
                        });
                    }
                    
                    if (options.onOpen) {
                        options.onOpen(dialog);
                    }
                }
            });
        },

        getAnimationDuration: function() {
            return this._animationDuration;
        },

        getDialogs: function() {
            return Array.from(this._dialogs);
        },

        hasOpenDialogs: function() {
            return this._dialogs.size > 0;
        },

        destroy: function() {
            this.closeAll();
            return this;
        }
    };

    if (global.Qu) {
        global.Qu.lib(LIB_NAME, Constructor);
    } else {
        global._QuLibs = global._QuLibs || [];
        global._QuLibs.push({ name: LIB_NAME, instance: Constructor });
    }

})(typeof window !== 'undefined' ? window : global);