/**
 * NeuroMail Performance Optimizer
 * Модуль для оптимизации производительности интерфейса и устранения проблем с "дёрганьем" скролла
 * 
 * @version 1.0.0
 */

class PerformanceOptimizer {
    constructor() {
        // Состояние скролла и оптимизации
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.isResizing = false;
        this.resizeTimeout = null;
        this.intersectionObserver = null;
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.rafId = null;
        this.pendingLayoutUpdates = false;

        // Настройки
        this.config = {
            scrollThrottle: 100,   // мс между обработкой событий скролла
            resizeDebounce: 250,   // мс задержки при изменении размера
            mutationThrottle: 150, // мс между обработкой изменений DOM
            scrollSyncDelay: 16,   // мс (примерно 1 фрейм при 60 кадрах/с)
            batchDomUpdates: true  // группировать обновления DOM
        };

        // Инициализация
        this.init();
    }

    /**
     * Инициализация оптимизатора
     */
    init() {
        console.log('🚀 Initializing NeuroMail Performance Optimizer...');

        this.setupScrollHandler();
        this.setupResizeHandler();
        this.setupIntersectionObserver();
        this.setupMutationObserver();
        this.applyForcedLayerOptimizations();
        this.optimizeAnimations();
        this.registerDOMTweaks();
        
        // Инициализируем после полной загрузки страницы
        window.addEventListener('load', () => {
            this.onPageLoaded();
        });

        console.log('✅ Performance Optimizer initialized');
    }

    /**
     * Настройка оптимизированной обработки скролла
     */
    setupScrollHandler() {
        const throttleScroll = this.throttle(this.handleScroll.bind(this), this.config.scrollThrottle);
        
        // Используем пассивные слушатели для улучшения производительности
        window.addEventListener('scroll', throttleScroll, { passive: true });
        
        // Оптимизированный обработчик для всплытия скролла (bubbling)
        document.querySelectorAll('.scrollable-container, .emails-list, .inbox-list, .email-content').forEach(el => {
            if (el) {
                el.addEventListener('scroll', throttleScroll, { passive: true });
            }
        });
    }

    /**
     * Обработчик события скролла
     * @param {Event} event - Событие скролла
     */
    handleScroll(event) {
        // Устанавливаем флаг скроллинга
        this.isScrolling = true;
        
        // При скролле удаляем ненужные эффекты для ускорения
        document.body.classList.add('is-scrolling');
        
        // Используем RAF для синхронизации с отрисовкой кадра
        this.cancelRaf();
        this.rafId = requestAnimationFrame(() => {
            // Дополнительная логика при скролле, если нужна
            
            // Сбрасываем таймаут скролла
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                document.body.classList.remove('is-scrolling');
                
                // Восстанавливаем визуальные эффекты после завершения скролла
                this.restoreVisualEffects();
            }, this.config.scrollThrottle + 50);
        });
    }

    /**
     * Восстановление визуальных эффектов после прокрутки
     */
    restoreVisualEffects() {
        // Восстанавливаем эффекты, которые были отключены во время скролла
        const animatedElements = document.querySelectorAll('.animated, .fade-in, .transition');
        animatedElements.forEach(el => {
            el.style.transition = '';
        });
    }

    /**
     * Настройка оптимизированной обработки изменения размера окна
     */
    setupResizeHandler() {
        const debounceResize = this.debounce(this.handleResize.bind(this), this.config.resizeDebounce);
        window.addEventListener('resize', debounceResize, { passive: true });
        
        // Создаем ResizeObserver для отслеживания изменений размера важных элементов
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(this.debounce(entries => {
                for (const entry of entries) {
                    // Оптимизируем только важные элементы
                    if (entry.target.classList.contains('main-content') || 
                        entry.target.classList.contains('email-content') ||
                        entry.target.classList.contains('inbox-container')) {
                        this.handleElementResize(entry);
                    }
                }
            }, 100));
            
            // Наблюдаем за ключевыми элементами
            document.querySelectorAll('.main-content, .email-content, .inbox-container').forEach(el => {
                if (el) this.resizeObserver.observe(el);
            });
        }
    }

    /**
     * Обработчик изменения размера окна
     */
    handleResize() {
        this.isResizing = true;
        
        // Отключаем тяжелые эффекты во время изменения размера
        document.body.classList.add('is-resizing');
        
        // Перерасчет лейаутов только при необходимости
        this.adjustLayoutForCurrentViewport();
        
        // Сбрасываем флаг изменения размера
        setTimeout(() => {
            this.isResizing = false;
            document.body.classList.remove('is-resizing');
        }, 50);
    }
    
    /**
     * Обработчик изменения размера элемента
     * @param {ResizeObserverEntry} entry - Запись изменения размера
     */
    handleElementResize(entry) {
        const el = entry.target;
        
        // Проверяем необходимость обновления лейаута для конкретного элемента
        if (el.classList.contains('email-content')) {
            this.optimizeEmailContentLayout(el);
        } else if (el.classList.contains('inbox-container')) {
            this.optimizeInboxListLayout(el);
        }
    }

    /**
     * Оптимизация лейаута контента писем
     * @param {HTMLElement} contentEl - Элемент контента письма
     */
    optimizeEmailContentLayout(contentEl) {
        // Оптимизация отображения изображений
        contentEl.querySelectorAll('img').forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            if (!img.hasAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }
        });
        
        // Оптимизация таблиц для мобильного отображения
        if (window.innerWidth < 768) {
            contentEl.querySelectorAll('table').forEach(table => {
                if (!table.classList.contains('responsive-table')) {
                    table.classList.add('responsive-table');
                    table.style.maxWidth = '100%';
                    table.style.display = 'block';
                    table.style.overflowX = 'auto';
                }
            });
        }
    }

    /**
     * Оптимизация лейаута списка почтовых ящиков
     * @param {HTMLElement} inboxEl - Контейнер списка ящиков
     */
    optimizeInboxListLayout(inboxEl) {
        // Оптимизация адаптивности списка
        const items = inboxEl.querySelectorAll('.inbox-item');
        const isMobile = window.innerWidth < 768;
        
        items.forEach(item => {
            // Адаптируем отображение для мобильных
            if (isMobile && !item.classList.contains('mobile-optimized')) {
                item.classList.add('mobile-optimized');
                
                // Сокращаем длинные адреса в мобильном виде
                const emailEl = item.querySelector('.inbox-email');
                if (emailEl && emailEl.textContent.length > 20) {
                    const email = emailEl.textContent;
                    const truncated = email.substring(0, 10) + '...' + email.substring(email.indexOf('@'));
                    emailEl.setAttribute('data-full-email', email);
                    emailEl.textContent = truncated;
                }
            } else if (!isMobile && item.classList.contains('mobile-optimized')) {
                item.classList.remove('mobile-optimized');
                
                // Восстанавливаем полные адреса при декстопном виде
                const emailEl = item.querySelector('.inbox-email');
                if (emailEl && emailEl.hasAttribute('data-full-email')) {
                    emailEl.textContent = emailEl.getAttribute('data-full-email');
                }
            }
        });
    }

    /**
     * Настройка IntersectionObserver для оптимизации загрузки
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (entry.target.classList.contains('lazy-image')) {
                            this.loadLazyImage(entry.target);
                        } else if (entry.target.classList.contains('lazy-load')) {
                            this.loadLazyComponent(entry.target);
                        }
                        
                        // Перестаем наблюдать за элементом после загрузки
                        this.intersectionObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '200px 0px', // Предзагрузка до появления в поле зрения
                threshold: 0.01
            });
            
            // Начинаем наблюдение за ленивыми элементами
            document.querySelectorAll('.lazy-image, .lazy-load').forEach(el => {
                this.intersectionObserver.observe(el);
            });
        }
    }

    /**
     * Загрузка ленивого изображения
     * @param {HTMLElement} img - Элемент изображения
     */
    loadLazyImage(img) {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
        }
        
        // Добавляем плавное появление
        requestAnimationFrame(() => {
            img.style.opacity = '1';
            img.style.transition = 'opacity 0.3s ease-in';
        });
    }

    /**
     * Загрузка ленивого компонента
     * @param {HTMLElement} component - Компонент для ленивой загрузки
     */
    loadLazyComponent(component) {
        component.classList.remove('lazy-load');
        component.classList.add('loaded');
        
        // Триггерим событие для других компонентов
        component.dispatchEvent(new CustomEvent('lazy-loaded'));
    }

    /**
     * Настройка MutationObserver для оптимизации изменений DOM
     */
    setupMutationObserver() {
        if ('MutationObserver' in window && this.config.batchDomUpdates) {
            const throttledDomUpdate = this.throttle(this.processDomMutations.bind(this), this.config.mutationThrottle);
            
            this.mutationObserver = new MutationObserver(mutations => {
                // Анализируем изменения и группируем обновления
                this.pendingLayoutUpdates = true;
                throttledDomUpdate(mutations);
            });
            
            // Наблюдаем за изменениями в основных контейнерах
            this.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'data-i18n', 'data-visible']
            });
        }
    }

    /**
     * Обработка мутаций DOM для оптимизации
     * @param {MutationRecord[]} mutations - Записи мутаций DOM
     */
    processDomMutations(mutations) {
        // Используем RAF для синхронизации с отрисовкой
        this.cancelRaf();
        this.rafId = requestAnimationFrame(() => {
            // Проверяем наличие изменений в i18n атрибутах
            const hasI18nChanges = mutations.some(mutation => 
                mutation.type === 'attributes' && 
                mutation.attributeName === 'data-i18n'
            );
            
            // Если есть изменения локализации, применяем их оптимизированно
            if (hasI18nChanges && window.i18n) {
                this.optimizeTranslationUpdates();
            }
            
            // Оптимизация после добавления/удаления элементов
            const hasStructuralChanges = mutations.some(mutation => 
                mutation.type === 'childList' && 
                (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
            );
            
            if (hasStructuralChanges) {
                this.optimizeAfterDomChanges();
            }
            
            this.pendingLayoutUpdates = false;
        });
    }

    /**
     * Оптимизация обновлений переводов
     */
    optimizeTranslationUpdates() {
        // Группируем обновления переводов для уменьшения количества reflow
        const i18nElements = document.querySelectorAll('[data-i18n]');
        const language = window.i18n.getLanguage();
        const translationBatch = [];
        
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            translationBatch.push({
                element: el,
                key: key
            });
        });
        
        // Применяем обновления в одном цикле RAF
        requestAnimationFrame(() => {
            translationBatch.forEach(item => {
                const translation = window.i18n.translate(item.key);
                if (item.element.textContent !== translation) {
                    item.element.textContent = translation;
                }
            });
            
            // Также обрабатываем placeholder атрибуты
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                const translation = window.i18n.translate(key);
                if (el.placeholder !== translation) {
                    el.placeholder = translation;
                }
            });
        });
    }

    /**
     * Оптимизация после структурных изменений DOM
     */
    optimizeAfterDomChanges() {
        // Проверяем и оптимизируем контейнеры писем после изменений
        const emailContainers = document.querySelectorAll('.email-item, .email-content');
        if (emailContainers.length > 0) {
            this.optimizeEmailContainers(emailContainers);
        }
        
        // Оптимизируем новые изображения
        document.querySelectorAll('img:not([loading])').forEach(img => {
            img.setAttribute('loading', 'lazy');
            img.setAttribute('decoding', 'async');
        });
        
        // Добавляем новые ленивые элементы в IntersectionObserver
        if (this.intersectionObserver) {
            document.querySelectorAll('.lazy-image:not(.observed), .lazy-load:not(.observed)').forEach(el => {
                el.classList.add('observed');
                this.intersectionObserver.observe(el);
            });
        }
    }

    /**
     * Оптимизация контейнеров писем
     * @param {NodeList} containers - Список контейнеров писем
     */
    optimizeEmailContainers(containers) {
        containers.forEach(container => {
            // Оптимизируем таблицы в письмах
            container.querySelectorAll('table').forEach(table => {
                if (!table.classList.contains('optimized')) {
                    table.classList.add('optimized');
                    table.style.tableLayout = 'fixed';
                    table.style.width = '100%';
                }
            });
            
            // Оптимизируем внешние ссылки
            container.querySelectorAll('a[href^="http"]').forEach(link => {
                if (!link.hasAttribute('rel')) {
                    link.setAttribute('rel', 'noopener noreferrer');
                }
                if (!link.hasAttribute('target')) {
                    link.setAttribute('target', '_blank');
                }
            });
        });
    }

    /**
     * Применение принудительных оптимизаций слоев для улучшения плавности
     */
    applyForcedLayerOptimizations() {
        // Применяем hardware acceleration к ключевым элементам интерфейса
        const criticalElements = [
            '.emails-list-container',
            '.inbox-list-container',
            '.email-content-container',
            '.main-content',
            '.sidebar',
            '.modal',
            '.toast'
        ];
        
        criticalElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.transform = 'translateZ(0)';
                el.style.backfaceVisibility = 'hidden';
                el.style.perspective = '1000px';
                
                // Для мобильных устройств дополнительно оптимизируем
                if (window.innerWidth < 768) {
                    el.style.willChange = 'transform, opacity';
                }
            });
        });
        
        // Особые оптимизации для скроллируемых контейнеров
        document.querySelectorAll('.scrollable-container').forEach(el => {
            el.style.overflowY = 'auto';
            el.style.webkitOverflowScrolling = 'touch';
            el.style.overscrollBehavior = 'contain';
        });
    }

    /**
     * Оптимизация анимаций
     */
    optimizeAnimations() {
        // Проверяем предпочтения пользователя по уменьшению движения
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Если пользователь предпочитает меньше движений, отключаем или упрощаем анимации
        if (prefersReducedMotion) {
            document.documentElement.classList.add('reduced-motion');
            
            // Устанавливаем более простые анимации
            document.querySelectorAll('.animated, .fade-in, .transition').forEach(el => {
                el.style.transition = 'none';
                el.style.animation = 'none';
            });
        } else {
            // Иначе оптимизируем существующие анимации
            document.querySelectorAll('.animated, .fade-in').forEach(el => {
                if (!el.style.willChange) {
                    el.style.willChange = 'opacity, transform';
                    
                    // Сбрасываем willChange после завершения анимации
                    el.addEventListener('animationend', function() {
                        this.style.willChange = 'auto';
                    }, { once: true });
                }
            });
            
            // Оптимизация переходов
            document.querySelectorAll('.transition').forEach(el => {
                if (!el.style.willChange) {
                    el.style.willChange = 'opacity, transform';
                    
                    el.addEventListener('transitionend', function() {
                        this.style.willChange = 'auto';
                    }, { once: true });
                }
            });
        }
    }

    /**
     * Регистрация дополнительных оптимизаций DOM
     */
    registerDOMTweaks() {
        // Оптимизация для мобильного тапа (устранение задержки 300ms)
        document.addEventListener('touchstart', function(){}, {passive: true});
        
        // Оптимизация модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            if (!modal.classList.contains('optimized-modal')) {
                modal.classList.add('optimized-modal');
                
                // Предотвращаем перерисовку фона при открытии модального окна
                modal.addEventListener('modal:before-open', () => {
                    document.body.style.overflow = 'hidden';
                    // Не позволяем основному контенту двигаться при скролле модального окна
                    document.querySelector('.main-content').style.position = 'fixed';
                    document.querySelector('.main-content').style.width = '100%';
                });
                
                modal.addEventListener('modal:after-close', () => {
                    document.body.style.overflow = '';
                    document.querySelector('.main-content').style.position = '';
                    document.querySelector('.main-content').style.width = '';
                });
            }
        });
        
        // Оптимизация клика по кнопкам (активной кнопки)
        document.querySelectorAll('.clickable-element').forEach(button => {
            if (!button.getAttribute('data-optimized')) {
                button.setAttribute('data-optimized', 'true');
                
                // Предотвращаем многократные клики
                button.addEventListener('click', function(e) {
                    if (this.hasAttribute('data-processing')) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    
                    this.setAttribute('data-processing', 'true');
                    this.classList.add('processing');
                    
                    // Сбрасываем состояние через 1 секунду
                    setTimeout(() => {
                        this.removeAttribute('data-processing');
                        this.classList.remove('processing');
                    }, 1000);
                });
            }
        });
    }

    /**
     * Настройка оптимизаций после полной загрузки страницы
     */
    onPageLoaded() {
        // Финальные оптимизации после полной загрузки страницы
        console.log('📊 Applying final performance optimizations...');
        
        // Оптимизируем размер шрифтов для данного устройства
        this.optimizeFontSizes();
        
        // Принудительно удаляем класс загрузки
        document.body.classList.remove('loading');
        document.documentElement.classList.remove('loading');
        
        // Удаляем ненужные скрипты и стили после загрузки
        this.cleanupAfterLoad();
        
        // Устанавливаем постоянные слушатели для новых элементов
        this.setupMutationObserversForNewElements();
        
        // Активируем ленивую загрузку для всех поддерживаемых элементов
        this.setupExtendedLazyLoading();
        
        console.log('✅ Final optimizations applied');
    }

    /**
     * Оптимизация размеров шрифтов для текущего устройства
     */
    optimizeFontSizes() {
        const isMobile = window.innerWidth < 768;
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        
        // Устанавливаем оптимальные размеры шрифтов для разных устройств
        if (isMobile) {
            document.documentElement.style.fontSize = '14px';
        } else if (isTablet) {
            document.documentElement.style.fontSize = '15px';
        } else {
            document.documentElement.style.fontSize = '16px';
        }
        
        // Оптимизация таблиц писем для маленьких экранов
        if (isMobile) {
            document.querySelectorAll('.emails-list th, .emails-list td').forEach(cell => {
                cell.style.padding = '8px 4px';
            });
        }
    }

    /**
     * Очистка неиспользуемых ресурсов после загрузки
     */
    cleanupAfterLoad() {
        // Удаляем прелоадер если он еще остался
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.display = 'none';
            setTimeout(() => {
                preloader.remove();
            }, 1000);
        }
        
        // Удаляем ненужные скрипты для ускорения страницы
        if (!window.keepDebugScripts) {
            document.querySelectorAll('script[data-debug="true"]').forEach(script => {
                script.remove();
            });
        }
    }

    /**
     * Настройка наблюдения за новыми элементами для оптимизации
     */
    setupMutationObserversForNewElements() {
        // Наблюдаем за добавлением новых кнопок для оптимизации клика
        const buttonObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Node.ELEMENT_NODE
                            // Оптимизируем новые кнопки
                            const buttons = node.querySelectorAll ? 
                                node.querySelectorAll('.clickable-element:not([data-optimized])') : [];
                            
                            buttons.forEach(button => {
                                button.setAttribute('data-optimized', 'true');
                                
                                button.addEventListener('click', function(e) {
                                    if (this.hasAttribute('data-processing')) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return false;
                                    }
                                    
                                    this.setAttribute('data-processing', 'true');
                                    this.classList.add('processing');
                                    
                                    setTimeout(() => {
                                        this.removeAttribute('data-processing');
                                        this.classList.remove('processing');
                                    }, 1000);
                                });
                            });
                        }
                    });
                }
            });
        });
        
        buttonObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Настройка расширенной ленивой загрузки
     */
    setupExtendedLazyLoading() {
        // Если браузер поддерживает ленивую загрузку, добавляем атрибут ко всем изображениям
        if ('loading' in HTMLImageElement.prototype) {
            document.querySelectorAll('img:not([loading])').forEach(img => {
                img.loading = 'lazy';
            });
        }
        
        // Откладываем загрузку iframe и тяжелых элементов
        document.querySelectorAll('iframe').forEach(iframe => {
            if (!iframe.hasAttribute('loading')) {
                iframe.loading = 'lazy';
            }
        });
    }

    /**
     * Отмена текущего requestAnimationFrame
     */
    cancelRaf() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Адаптация лейаута для текущего размера окна
     */
    adjustLayoutForCurrentViewport() {
        const width = window.innerWidth;
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;
        
        // Классы для адаптации
        document.body.classList.toggle('mobile-view', isMobile);
        document.body.classList.toggle('tablet-view', isTablet);
        document.body.classList.toggle('desktop-view', width >= 1024);
        
        // Изменяем лейаут контейнеров для оптимального отображения
        if (isMobile) {
            this.optimizeForMobileView();
        } else if (isTablet) {
            this.optimizeForTabletView();
        } else {
            this.optimizeForDesktopView();
        }
    }

    /**
     * Оптимизация для мобильного отображения
     */
    optimizeForMobileView() {
        // Находим таблицы и делаем их прокручиваемыми горизонтально
        document.querySelectorAll('table:not(.responsive-table)').forEach(table => {
            // Проверяем, что у таблицы есть родитель
            if (table && table.parentNode) {
                table.classList.add('responsive-table');
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive-wrapper';
                wrapper.style.overflowX = 'auto';
                wrapper.style.width = '100%';
                
                // Безопасная вставка обертки
                try {
                    table.parentNode.insertBefore(wrapper, table);
                    wrapper.appendChild(table);
                } catch (error) {
                    console.warn('Не удалось обернуть таблицу для адаптивности:', error);
                }
            }
        });
        
        // Оптимизируем отображение email в списке писем
        document.querySelectorAll('.email-sender, .inbox-email').forEach(el => {
            if (el.textContent.length > 20 && !el.hasAttribute('data-full-text')) {
                el.setAttribute('data-full-text', el.textContent);
                el.textContent = el.textContent.substring(0, 15) + '...';
            }
        });
    }

    /**
     * Оптимизация для планшетного отображения
     */
    optimizeForTabletView() {
        // Восстанавливаем полные тексты, если они были сокращены
        document.querySelectorAll('[data-full-text]').forEach(el => {
            el.textContent = el.getAttribute('data-full-text');
            el.removeAttribute('data-full-text');
        });
        
        // Оптимизируем таблицы, делая их более компактными
        document.querySelectorAll('table').forEach(table => {
            table.classList.add('table-compact');
        });
    }

    /**
     * Оптимизация для настольного отображения
     */
    optimizeForDesktopView() {
        // Восстанавливаем полные тексты
        document.querySelectorAll('[data-full-text]').forEach(el => {
            el.textContent = el.getAttribute('data-full-text');
            el.removeAttribute('data-full-text');
        });
        
        // Восстанавливаем нормальное отображение таблиц
        document.querySelectorAll('table.table-compact').forEach(table => {
            table.classList.remove('table-compact');
        });
    }

    // Утилиты

    /**
     * Функция throttle для ограничения частоты вызовов
     * @param {Function} func - Функция для ограничения
     * @param {number} limit - Лимит времени в мс
     * @returns {Function} - Ограниченная функция
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Функция debounce для отложенного вызова
     * @param {Function} func - Функция для отложенного вызова
     * @param {number} wait - Время ожидания в мс
     * @returns {Function} - Отложенная функция
     */
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
}

// Инициализация оптимизатора производительности
window.performanceOptimizer = new PerformanceOptimizer();

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
} 