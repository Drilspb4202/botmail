/**
 * Менеджер пула API ключей с автоматической ротацией
 */
class ApiKeyPool {
    constructor() {
        // Пул публичных API ключей
        this.publicKeys = [
            {
                key: '313900549c3e27b57d58ffd9d0e6dbde0c0db9d972e5ff7f26812c567c7beefc',
                usageCount: 0,
                lastUsed: null,
                isExhausted: false,
                monthlyReset: new Date().getTime()
            },
            {
                key: 'cfc00cab6dbea7c39ee1e70ec7d45b1b8ce81b9abf12075e88f1e3bc41959473',
                usageCount: 0,
                lastUsed: null,
                isExhausted: false,
                monthlyReset: new Date().getTime()
            },
            {
                key: '',
                usageCount: 0,
                lastUsed: null,
                isExhausted: true,
                monthlyReset: new Date().getTime()
            },
            {
                key: '',
                usageCount: 0,
                lastUsed: null,
                isExhausted: true,
                monthlyReset: new Date().getTime()
            },
            {
                key: '',
                usageCount: 0,
                lastUsed: null,
                isExhausted: true,
                monthlyReset: new Date().getTime()
            }
        ];

        // Текущий активный ключ
        this.currentKeyIndex = 0;

        // Лимиты использования
        this.limits = {
            monthlyInboxLimit: 50,  // Лимит создания ящиков в месяц
            dailyRequestLimit: 250, // Лимит запросов в день
        };

        // Загружаем сохраненное состояние
        this.loadState();

        // Запускаем проверку сброса счетчиков
        this.checkCountersReset();
        
        // Устанавливаем обработчик ошибок API для автоматической ротации
        this.setupApiErrorHandler();
    }
    
    /**
     * Устанавливаем обработчик ошибок API для автоматической ротации при достижении лимитов
     */
    setupApiErrorHandler() {
        // Перехватываем ошибки fetch для API запросов
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const url = typeof args[0] === 'string' ? args[0] : args[0].url;
                
                // Проверяем, является ли запрос к MailSlurp API
                if (url && url.includes('api.mailslurp.com')) {
                    // Получаем текущий API ключ из заголовков
                    let currentApiKey = '';
                    if (args[1] && args[1].headers) {
                        const headers = args[1].headers;
                        if (headers instanceof Headers) {
                            currentApiKey = headers.get('x-api-key');
                        } else if (typeof headers === 'object') {
                            currentApiKey = headers['x-api-key'];
                        }
                    }
                    
                    // Проверяем, нужно ли заменить ключ
                    const needToReplaceKey = this.publicKeys.some(keyData => 
                        keyData.key === currentApiKey && keyData.isExhausted);
                    
                    if (needToReplaceKey) {
                        console.log('Ключ API исчерпан или недействителен, автоматическая замена');
                        
                        // Получаем новый ключ
                        const newKey = this.getNextAvailableKey();
                        
                        if (newKey) {
                            // Заменяем заголовок в запросе
                            const newArgs = [...args];
                            if (newArgs[1] && newArgs[1].headers) {
                                if (newArgs[1].headers instanceof Headers) {
                                    newArgs[1].headers.set('x-api-key', newKey);
                                } else {
                                    newArgs[1].headers = {
                                        ...newArgs[1].headers,
                                        'x-api-key': newKey
                                    };
                                }
                            }
                            
                            // Выполняем запрос с новым ключом
                            console.log('Используем новый ключ для запроса:', newKey);
                            const response = await originalFetch(...newArgs);
                            
                            if (response.ok) {
                                this.incrementCurrentKeyUsage();
                            }
                            
                            return response;
                        }
                    }
                }
                
                // Выполняем оригинальный запрос
                const response = await originalFetch(...args);
                
                // Проверяем URL запроса - только для MailSlurp API
                if (url && url.includes('api.mailslurp.com')) {
                    // Обрабатываем ответы с ошибками, связанными с лимитами API
                    if (response.status === 429 || response.status === 402 || !response.ok) {
                        console.warn('Проблема с API, возможно достигнут лимит:', response.status, url);
                        
                        // Если это текстовая ошибка с сообщением "User not found for API KEY", 
                        // то ключ недействителен
                        const responseText = await response.clone().text();
                        if (responseText.includes("User not found for API KEY") || 
                            responseText.includes("not found") || 
                            responseText.includes("invalid") ||
                            responseText.includes("Invalid API Key") ||
                            responseText.includes("exceeded")) {
                            
                            console.warn('Недействительный или исчерпанный ключ API, меняем на следующий');
                            
                            // Пометка текущего ключа как исчерпанного
                            this.markCurrentKeyExhausted();
                            
                            // Если есть доступный следующий ключ, пытаемся повторить запрос
                            const newKey = this.getNextAvailableKey();
                            if (newKey) {
                                // Копируем оригинальные параметры запроса
                                const newArgs = [...args];
                                
                                // Заменяем заголовок x-api-key на новый ключ
                                if (newArgs[1] && newArgs[1].headers) {
                                    if (newArgs[1].headers instanceof Headers) {
                                        newArgs[1].headers.set('x-api-key', newKey);
                                    } else {
                                        newArgs[1].headers = {
                                            ...newArgs[1].headers,
                                            'x-api-key': newKey
                                        };
                                    }
                                }
                                
                                // Повторяем запрос с новым ключом
                                console.log('Повторный запрос с новым ключом:', newKey);
                                return originalFetch(...newArgs);
                            }
                        }
                    } else if (response.ok) {
                        // Успешный запрос, увеличиваем счетчик использования
                        this.incrementCurrentKeyUsage();
                    }
                }
                
                return response;
            } catch (error) {
                console.error('Ошибка при выполнении fetch запроса:', error);
                throw error;
            }
        };
    }

    /**
     * Загрузка сохраненного состояния пула ключей
     */
    loadState() {
        const savedState = localStorage.getItem('api_key_pool_state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.publicKeys = state.publicKeys;
                this.currentKeyIndex = state.currentKeyIndex;
            } catch (error) {
                console.error('Ошибка при загрузке состояния пула ключей:', error);
            }
        }
    }

    /**
     * Сохранение текущего состояния пула ключей
     */
    saveState() {
        try {
            const state = {
                publicKeys: this.publicKeys,
                currentKeyIndex: this.currentKeyIndex
            };
            localStorage.setItem('api_key_pool_state', JSON.stringify(state));
        } catch (error) {
            console.error('Ошибка при сохранении состояния пула ключей:', error);
        }
    }

    /**
     * Проверка и сброс счетчиков использования
     */
    checkCountersReset() {
        const now = new Date().getTime();
        
        this.publicKeys.forEach((keyData, index) => {
            // Сброс месячного счетчика
            if (now - keyData.monthlyReset >= 30 * 24 * 60 * 60 * 1000) { // 30 дней
                this.publicKeys[index].usageCount = 0;
                this.publicKeys[index].isExhausted = false;
                this.publicKeys[index].monthlyReset = now;
            }
        });

        this.saveState();

        // Планируем следующую проверку через час
        setTimeout(() => this.checkCountersReset(), 60 * 60 * 1000);
    }

    /**
     * Получить следующий доступный ключ
     * @returns {string|null} API ключ или null, если все ключи исчерпаны
     */
    getNextAvailableKey() {
        const startIndex = this.currentKeyIndex;
        let attempts = 0;

        while (attempts < this.publicKeys.length) {
            const keyData = this.publicKeys[this.currentKeyIndex];

            if (!keyData.isExhausted) {
                return keyData.key;
            }

            // Переходим к следующему ключу по кругу
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.publicKeys.length;
            attempts++;
        }

        // Если все ключи исчерпаны, возвращаем null
        return null;
    }

    /**
     * Пометить текущий ключ как исчерпанный
     */
    markCurrentKeyExhausted() {
        this.publicKeys[this.currentKeyIndex].isExhausted = true;
        this.publicKeys[this.currentKeyIndex].lastUsed = new Date().getTime();
        
        // Переключаемся на следующий ключ
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.publicKeys.length;
        
        this.saveState();

        // Создаем событие об исчерпании ключа
        const event = new CustomEvent('api-key-exhausted', {
            detail: {
                exhaustedKey: this.publicKeys[this.currentKeyIndex].key,
                newKey: this.getNextAvailableKey()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Увеличить счетчик использования текущего ключа
     */
    incrementCurrentKeyUsage() {
        const keyData = this.publicKeys[this.currentKeyIndex];
        keyData.usageCount++;
        keyData.lastUsed = new Date().getTime();

        // Проверяем, не достигнут ли лимит
        if (keyData.usageCount >= this.limits.monthlyInboxLimit) {
            this.markCurrentKeyExhausted();
        }

        this.saveState();
    }

    /**
     * Получить информацию о текущем состоянии пула ключей
     * @returns {Object} Информация о состоянии пула
     */
    getPoolStatus() {
        return {
            totalKeys: this.publicKeys.length,
            availableKeys: this.publicKeys.filter(k => !k.isExhausted).length,
            currentKey: this.publicKeys[this.currentKeyIndex],
            allKeys: this.publicKeys.map(k => ({
                key: k.key.substring(0, 8) + '...',
                usageCount: k.usageCount,
                isExhausted: k.isExhausted,
                lastUsed: k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Никогда'
            }))
        };
    }

    /**
     * Сбросить все счетчики и состояния
     */
    resetPool() {
        this.publicKeys.forEach(keyData => {
            keyData.usageCount = 0;
            keyData.isExhausted = false;
            keyData.lastUsed = null;
            keyData.monthlyReset = new Date().getTime();
        });

        this.currentKeyIndex = 0;
        this.saveState();
    }

    /**
     * Обновить ключ по индексу
     * @param {number} index - Индекс ключа в массиве
     * @param {string} newKey - Новый ключ API
     * @returns {boolean} - Результат операции
     */
    updateKey(index, newKey) {
        if (index < 0 || index >= this.publicKeys.length) {
            console.error(`Невозможно обновить ключ: индекс ${index} вне диапазона`);
            return false;
        }
        
        try {
            // Обновляем ключ и сбрасываем его счетчики
            this.publicKeys[index] = {
                key: newKey,
                usageCount: 0,
                lastUsed: null,
                isExhausted: false,
                monthlyReset: new Date().getTime()
            };
            
            // Если текущий активный ключ - это обновленный, сбрасываем localStorage
            if (this.currentKeyIndex === index) {
                localStorage.removeItem('api_key_pool_state');
            }
            
            // Сохраняем новое состояние
            this.saveState();
            
            console.log(`Ключ API по индексу ${index} успешно обновлен`);
            return true;
        } catch (error) {
            console.error('Ошибка при обновлении ключа:', error);
            return false;
        }
    }

    /**
     * Принудительно сбросить сохраненное состояние и использовать текущие значения ключей
     */
    forceRefreshState() {
        localStorage.removeItem('api_key_pool_state');
        this.currentKeyIndex = 0;
        
        // Сбрасываем состояния всех ключей
        this.publicKeys.forEach((keyData, index) => {
            this.publicKeys[index].usageCount = 0;
            this.publicKeys[index].isExhausted = false;
        });
        
        // Сохраняем текущее состояние
        this.saveState();
        console.log('Состояние пула ключей принудительно обновлено');
        
        // Создаем событие обновления ключей
        const event = new CustomEvent('api-keys-refreshed');
        document.dispatchEvent(event);
    }

    /**
     * Проверить конкретный ключ на работоспособность
     * @param {number} index - Индекс ключа для проверки
     * @returns {Promise<Object>} - Результат проверки
     */
    async checkKey(index) {
        if (index < 0 || index >= this.publicKeys.length) {
            return { success: false, error: 'Индекс ключа вне диапазона' };
        }

        const key = this.publicKeys[index].key;
        try {
            const response = await fetch('https://api.mailslurp.com/user/info', {
                method: 'GET',
                headers: {
                    'x-api-key': key,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    data,
                    message: `Ключ #${index + 1} работает корректно!`
                };
            } else {
                // Если получена ошибка 402 или 429, связанная с лимитами, помечаем ключ как исчерпанный
                if (response.status === 402 || response.status === 429) {
                    this.publicKeys[index].isExhausted = true;
                    this.saveState();
                }

                return {
                    success: false,
                    error: `${response.status}: ${response.statusText}`,
                    message: `Ключ #${index + 1} недействителен или исчерпан`
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Ошибка при проверке ключа #${index + 1}`
            };
        }
    }

    /**
     * Проверить все ключи и обновить их статус
     * @returns {Promise<Array>} - Массив результатов проверки для всех ключей
     */
    async checkAllKeys() {
        const results = [];
        for (let i = 0; i < this.publicKeys.length; i++) {
            const result = await this.checkKey(i);
            results.push(result);
            
            // Небольшая пауза между запросами
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return results;
    }
}

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiKeyPool;
} 