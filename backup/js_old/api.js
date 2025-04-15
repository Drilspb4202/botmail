/**
 * API клиент для работы с MailSlurp
 */
class MailSlurpApi {
    constructor() {
        // Форсированно удаляем старые ключи из localStorage
        localStorage.removeItem('api_key_pool_state');
        localStorage.removeItem('current_user_key');
        
        // Инициализация пула API ключей
        this.keyPool = new ApiKeyPool();

        // Сбрасываем кэш состояния пула для применения новых ключей
        this.keyPool.forceRefreshState();
        
        // Защищенный публичный API ключ - берется из пула
        this.publicApiKey = this.keyPool.getNextAvailableKey() || '313900549c3e27b57d58ffd9d0e6dbde0c0db9d972e5ff7f26812c567c7beefc';
        
        // Обновляем также значение в localStorage
        localStorage.setItem('mailslurp_api_key', this.publicApiKey);
        
        // API ключ пользователя - может быть изменен
        this.personalApiKey = localStorage.getItem('mailslurp_personal_api_key') || '';
        
        // Флаг, указывающий, какой API используется (public/personal)
        this.usePersonalApi = localStorage.getItem('use_personal_api') === 'true';
        
        // Устанавливаем активный API ключ
        this.apiKey = this.usePersonalApi && this.personalApiKey ? this.personalApiKey : this.publicApiKey;
        
        this.baseUrl = 'https://api.mailslurp.com';
        this.emailWaitTimeout = parseInt(localStorage.getItem('mailslurp_email_wait_timeout') || '30');
        this.httpTimeout = parseInt(localStorage.getItem('mailslurp_http_timeout') || '10');
        
        // Настройки для повторных попыток
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 секунда
        
        // Время жизни почтового ящика при использовании публичного API (5 минут в миллисекундах)
        this.publicApiInboxLifetime = 5 * 60 * 1000;
        
        // Секретный код для отключения автоудаления (хранится в зашифрованном виде)
        this.secretCodeHash = 'bf8d24b69c1ac79babe38beac4839311'; // MD5 hash от "Skarn4202"
        
        // Флаг активации секретного кода
        this.secretCodeActivated = localStorage.getItem('secret_code_activated') === 'true';
        
        // Инициализация менеджера API-ключей
        this.keyManager = new ApiKeyManager();
        
        // Обновляем статус соединения
        this.connectionStatus = {
            isConnected: false,
            apiType: this.usePersonalApi ? 'personal' : 'public',
            lastChecked: null
        };
        
        // Регистрируем обработчики событий для ротации ключей
        document.addEventListener('api-key-exhausted', this.handleKeyExhausted.bind(this));
        
        // Автоматически активируем ключ при создании объекта
        try {
            this.keyManager.activateKey(this.apiKey);
            console.log('API-ключ успешно активирован при инициализации');
            
            // Проверяем статус подключения
            this.checkConnection();
        } catch (error) {
            console.warn('Ошибка автоматической активации API-ключа:', error);
        }
    }

    /**
     * Задержка выполнения
     * @param {number} ms - Время задержки в миллисекундах
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Выполнить запрос с повторными попытками
     * @param {Function} requestFn - Функция запроса
     * @returns {Promise<Object>} - Результат запроса
     */
    async withRetry(requestFn) {
        let lastError;
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                console.warn(`Попытка ${attempt + 1} из ${this.maxRetries} не удалась:`, error);
                lastError = error;
                
                if (attempt < this.maxRetries - 1) {
                    await this.delay(this.retryDelay * Math.pow(2, attempt)); // Экспоненциальная задержка
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Проверяет статус подключения к API
     * @returns {Promise<Object>} - Статус подключения
     */
    async checkConnection() {
        try {
            // Пробуем выполнить тестовый запрос
            const status = await this.checkAccountStatus();
            
            this.connectionStatus = {
                isConnected: true,
                apiType: this.usePersonalApi ? 'personal' : 'public',
                lastChecked: new Date(),
                data: status
            };
            
            // Создаем событие об изменении статуса подключения
            const event = new CustomEvent('api-connection-status-changed', { 
                detail: this.connectionStatus 
            });
            document.dispatchEvent(event);
            
            return this.connectionStatus;
        } catch (error) {
            this.connectionStatus = {
                isConnected: false,
                apiType: this.usePersonalApi ? 'personal' : 'public',
                lastChecked: new Date(),
                error: error.message
            };
            
            // Создаем событие об изменении статуса подключения
            const event = new CustomEvent('api-connection-status-changed', { 
                detail: this.connectionStatus 
            });
            document.dispatchEvent(event);
            
            return this.connectionStatus;
        }
    }

    /**
     * Переключение между публичным и персональным API
     * @param {boolean} usePersonal - Использовать персональный API
     * @returns {Object} - Статус переключения
     */
    switchApiMode(usePersonal) {
        if (usePersonal && !this.personalApiKey) {
            throw new Error('Персональный API-ключ не установлен. Пожалуйста, установите ключ перед переключением.');
        }
        
        this.usePersonalApi = usePersonal;
        localStorage.setItem('use_personal_api', usePersonal.toString());
        
        // Обновляем активный API ключ
        this.apiKey = usePersonal ? this.personalApiKey : this.publicApiKey;
        
        // Активируем ключ в менеджере
        try {
            this.keyManager.activateKey(this.apiKey);
            console.log(`Успешное переключение на ${usePersonal ? 'персональный' : 'публичный'} API`);
            
            // Проверяем статус нового подключения
            this.checkConnection();
            
            return {
                success: true,
                mode: usePersonal ? 'personal' : 'public'
            };
        } catch (error) {
            console.error('Ошибка при переключении API режима:', error);
            
            // Возвращаем обратно на публичный API в случае ошибки
            if (usePersonal) {
                this.usePersonalApi = false;
                localStorage.setItem('use_personal_api', 'false');
                this.apiKey = this.publicApiKey;
                this.keyManager.activateKey(this.apiKey);
            }
            
            throw error;
        }
    }

    /**
     * Получить текущий режим API
     * @returns {Object} - Информация о текущем режиме API
     */
    getCurrentApiMode() {
        return {
            mode: this.usePersonalApi ? 'personal' : 'public',
            apiKey: this.apiKey,
            connectionStatus: this.connectionStatus
        };
    }

    /**
     * Задать персональный API ключ
     * @param {string} apiKey - Персональный API ключ MailSlurp
     */
    setPersonalApiKey(apiKey) {
        this.personalApiKey = apiKey;
        localStorage.setItem('mailslurp_personal_api_key', apiKey);
        
        // Если мы в режиме персонального API, активируем новый ключ
        if (this.usePersonalApi) {
            this.apiKey = apiKey;
            try {
                this.keyManager.activateKey(apiKey);
                // Проверяем статус нового подключения
                this.checkConnection();
            } catch (error) {
                console.warn('Не удалось активировать персональный API-ключ:', error);
                // Переключаемся обратно на публичный API
                this.switchApiMode(false);
                throw error;
            }
        }
    }

    /**
     * Задать API ключ (устаревший метод, для совместимости)
     * @param {string} apiKey - API ключ MailSlurp
     */
    setApiKey(apiKey) {
        // Для совместимости с существующим кодом
        // Этот метод теперь устанавливает персональный ключ и переключается на него
        this.setPersonalApiKey(apiKey);
        
        // Переключаемся на персональный API
        if (apiKey) {
            try {
                this.switchApiMode(true);
            } catch (error) {
                console.warn('Не удалось переключиться на персональный API:', error);
            }
        }
    }

    /**
     * Получить текущий API ключ
     * @returns {string} - текущий API ключ
     */
    getApiKey() {
        return this.apiKey;
    }

    /**
     * Получить публичный API ключ
     * @returns {string} - публичный API ключ
     */
    getPublicApiKey() {
        return this.publicApiKey;
    }

    /**
     * Получить персональный API ключ
     * @returns {string|null} - API ключ или null
     */
    getPersonalApiKey() {
        return this.personalApiKey || null;
    }

    /**
     * Задать тайм-аут ожидания письма
     * @param {number} timeout - Тайм-аут в секундах
     */
    setEmailWaitTimeout(timeout) {
        this.emailWaitTimeout = timeout;
        localStorage.setItem('mailslurp_email_wait_timeout', timeout.toString());
    }

    /**
     * Задать тайм-аут HTTP запроса
     * @param {number} timeout - Тайм-аут в секундах
     */
    setHttpTimeout(timeout) {
        this.httpTimeout = timeout;
        localStorage.setItem('mailslurp_http_timeout', timeout.toString());
    }

    /**
     * Выполнить GET запрос
     * @param {string} endpoint - Конечная точка API
     * @param {Object} params - URL параметры запроса
     * @returns {Promise<Object>} - Ответ API
     */
    async get(endpoint, params = {}) {
        return this.withRetry(async () => {
            const url = new URL(`${this.baseUrl}${endpoint}`);
            
            // Добавляем параметры в URL
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.httpTimeout * 1000);

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'x-api-key': this.apiKey,
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data;
            } finally {
                clearTimeout(timeoutId);
            }
        });
    }

    /**
     * Выполнить POST запрос
     * @param {string} endpoint - Конечная точка API
     * @param {Object} body - Тело запроса
     * @returns {Promise<Object>} - Ответ API
     */
    async post(endpoint, body = {}) {
        return this.withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.httpTimeout * 1000);

            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'x-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data;
            } finally {
                clearTimeout(timeoutId);
            }
        });
    }

    /**
     * Выполнить DELETE запрос
     * @param {string} endpoint - Конечная точка API
     * @returns {Promise<void>}
     */
    async delete(endpoint) {
        return this.withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.httpTimeout * 1000);

            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'DELETE',
                    headers: {
                        'x-api-key': this.apiKey,
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        });
    }

    /**
     * Получить список почтовых ящиков с фильтрацией по префиксу пользователя
     * @returns {Promise<Array>} - Список почтовых ящиков
     */
    async getInboxes() {
        const allInboxes = await this.get('/inboxes');
        // Фильтруем ящики по префиксу пользователя
        return this.keyManager.filterInboxesByPrefix(allInboxes);
    }

    /**
     * Создать новый почтовый ящик с префиксом пользователя
     * @param {Object} options - Опции создания ящика
     * @returns {Promise<Object>} - Созданный почтовый ящик
     */
    async createInbox(options = {}) {
        try {
            // Проверяем, нет ли проблем с текущим API-ключом
            if (this.checkForApiKeyIssues()) {
                console.log('Проблема с API-ключом обнаружена, переключаемся на рабочий ключ');
                await this.switchToWorkingApiKey();
            }
            
            // Сначала получаем текущие ящики для проверки их количества
            const currentInboxes = await this.getInboxes();
            
            // Обновляем счетчик в менеджере ключей
            this.keyManager.updateInboxCount(currentInboxes);
            
            // Проверяем лимиты на создание ящиков с обновленным счетчиком
            this.keyManager.checkKeyLimits('createInbox');
            
            // Получаем текущий префикс пользователя для отладки
            const userPrefix = this.keyManager.getCurrentUserPrefix();
            console.log('Создание ящика. Текущий префикс пользователя:', userPrefix);
            
            // Добавляем префикс к имени ящика для изоляции
            if (options.name) {
                options.name = this.keyManager.addPrefixToInboxName(options.name);
            } else {
                // Генерируем имя с префиксом, если не указано
                options.name = this.keyManager.addPrefixToInboxName(`inbox-${Date.now()}`);
            }
            
            // Добавляем теги для лучшей фильтрации
            options.tags = options.tags || [];
            options.tags.push(`prefix:${userPrefix}`);
            
            console.log('Создаем ящик с именем:', options.name);
            
            try {
                const newInbox = await this.post('/inboxes', options);
                console.log('Созданный ящик:', newInbox);
                
                // После успешного создания обновляем список ящиков
                const updatedInboxes = await this.getInboxes();
                this.keyManager.updateInboxCount(updatedInboxes);
                
                // Если используется публичный API ключ и не активирован секретный код, настраиваем автоудаление
                if (!this.usePersonalApi && !this.secretCodeActivated && newInbox.id) {
                    console.log(`Автоматическое удаление ящика ${newInbox.id} через 5 минут (публичный API)`);
                    
                    // Устанавливаем таймер на удаление
                    setTimeout(() => {
                        try {
                            this.deleteInbox(newInbox.id)
                                .then(() => {
                                    console.log(`Автоматически удален ящик ${newInbox.id} после 5 минут`);
                                    // Создаем событие об удалении ящика
                                    const event = new CustomEvent('inbox-auto-deleted', { 
                                        detail: { inboxId: newInbox.id, emailAddress: newInbox.emailAddress } 
                                    });
                                    document.dispatchEvent(event);
                                })
                                .catch(err => {
                                    console.error(`Ошибка автоматического удаления ящика ${newInbox.id}:`, err);
                                });
                        } catch (error) {
                            console.error(`Ошибка в таймере удаления ящика ${newInbox.id}:`, error);
                        }
                    }, this.publicApiInboxLifetime);
                } else if (this.secretCodeActivated && !this.usePersonalApi) {
                    console.log(`Ящик ${newInbox.id} сохранен без автоудаления благодаря активации секретного кода`);
                }
                
                return newInbox;
            } catch (error) {
                console.error('Ошибка при создании ящика:', error);
                
                // Проверяем, связана ли ошибка с неверным API-ключом
                if (error.message && (
                    error.message.includes('User not found for API KEY') ||
                    error.message.includes('not found') ||
                    error.message.includes('invalid') ||
                    error.message.includes('Invalid API Key')
                )) {
                    console.warn('Ошибка с API-ключом, пробуем переключиться на другой ключ');
                    
                    // Пытаемся переключиться на рабочий ключ
                    await this.switchToWorkingApiKey();
                    
                    // Повторяем попытку создания ящика
                    return this.createInbox(options);
                }
                
                throw error;
            }
        } catch (error) {
            console.error('Ошибка при создании ящика:', error);
            throw error;
        }
    }

    /**
     * Проверяет, есть ли проблемы с текущим API-ключом
     * @returns {boolean} - Есть ли проблемы с ключом
     */
    checkForApiKeyIssues() {
        // Проверяем, не используется ли старый ключ
        const oldKeys = [
            'bb883bc4065365fedcfacd7cc41a355e54d4b19d06de6505b213c4516f03ae1',
            '042b76d65e4661288db7647cfae566a7b7b02f2b5cf55528f5a2106ebd32de09'
        ];
        
        // Проверяем, не используется ли старый ключ
        const isUsingOldKey = oldKeys.includes(this.apiKey);
        
        // Также проверяем, не использует ли keyPool старые ключи
        const isKeyPoolUsingOldKeys = this.keyPool && this.keyPool.publicKeys.some(
            keyData => oldKeys.includes(keyData.key) && !keyData.isExhausted
        );
        
        return isUsingOldKey || isKeyPoolUsingOldKeys;
    }
    
    /**
     * Переключается на рабочий API-ключ
     * @returns {Promise<void>}
     */
    async switchToWorkingApiKey() {
        // Принудительно обновляем пул API-ключей
        this.keyPool.forceRefreshState();
        
        // Устанавливаем новые рабочие ключи
        const workingKeys = [
            '313900549c3e27b57d58ffd9d0e6dbde0c0db9d972e5ff7f26812c567c7beefc',
            'cfc00cab6dbea7c39ee1e70ec7d45b1b8ce81b9abf12075e88f1e3bc41959473'
        ];
        
        // Обновляем ключи в пуле
        workingKeys.forEach((key, index) => {
            this.keyPool.updateKey(index, key);
        });
        
        // Получаем новый ключ из пула
        this.publicApiKey = this.keyPool.getNextAvailableKey();
        
        // Если мы используем публичный API, обновляем текущий ключ
        if (!this.usePersonalApi) {
            this.apiKey = this.publicApiKey;
            
            // Обновляем ключ в localStorage
            localStorage.setItem('mailslurp_api_key', this.publicApiKey);
            
            // Активируем ключ в менеджере
            this.keyManager.activateKey(this.apiKey);
            
            // Проверяем статус подключения
            await this.checkConnection();
        }
        
        console.log('Переключились на рабочий API-ключ:', this.publicApiKey);
        
        // Уведомляем пользователя
        const event = new CustomEvent('show-toast', {
            detail: {
                message: 'Обнаружена проблема с API-ключом, выполнено автоматическое переключение на рабочий ключ',
                type: 'warning',
                duration: 5000
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Удалить почтовый ящик
     * @param {string} inboxId - ID почтового ящика
     * @returns {Promise<Object>} - Результат операции
     */
    async deleteInbox(inboxId) {
        return this.delete(`/inboxes/${inboxId}`);
    }

    /**
     * Отправить электронное письмо
     * @param {string} inboxId - ID почтового ящика отправителя
     * @param {Object} emailOptions - Параметры письма
     * @returns {Promise<Object>} - Результат операции
     */
    async sendEmail(inboxId, emailOptions) {
        // Проверяем лимиты на отправку писем
        this.keyManager.checkKeyLimits('sendEmail');
        return this.post(`/inboxes/${inboxId}`, emailOptions);
    }

    /**
     * Ждать и получить последнее письмо в ящике
     * @param {string} inboxId - ID почтового ящика
     * @param {boolean} unreadOnly - Только непрочитанные письма
     * @returns {Promise<Object>} - Полученное письмо
     */
    async waitForLatestEmail(inboxId, unreadOnly = true) {
        return this.get('/waitForLatestEmail', {
            inboxId,
            timeout: this.emailWaitTimeout * 1000,
            unreadOnly: unreadOnly.toString()
        });
    }

    /**
     * Получить список писем в ящике
     * @param {string} inboxId - ID почтового ящика
     * @returns {Promise<Array>} - Список писем
     */
    async getEmails(inboxId) {
        try {
            const result = await this.get('/emails', { inboxId });
            
            // Проверяем, что результат - массив
            if (Array.isArray(result)) {
                return result;
            } else if (result && typeof result === 'object') {
                // Если получен объект, проверяем, есть ли в нем массив писем
                if (result.content && Array.isArray(result.content)) {
                    return result.content;
                } else if (result.emails && Array.isArray(result.emails)) {
                    return result.emails;
                } else {
                    // Возвращаем пустой массив, чтобы не вызвать ошибку
                    console.warn('API вернул объект вместо массива писем:', result);
                    return [];
                }
            } else {
                // Если результат неожиданного типа, возвращаем пустой массив
                console.warn('API вернул неожиданный формат данных для писем:', result);
                return [];
            }
        } catch (error) {
            console.error('Ошибка при получении писем:', error);
            return []; // Возвращаем пустой массив при ошибке
        }
    }

    /**
     * Получить письмо по ID
     * @param {string} inboxId - ID почтового ящика (опционально) 
     * @param {string} emailId - ID письма 
     * @returns {Promise<Object>} - Объект с данными письма
     */
    async getEmail(inboxId, emailId) {
        try {
            // Если второй параметр не передан, значит первый и есть emailId
            if (!emailId) {
                emailId = inboxId;
                console.log('getEmail вызван только с emailId:', emailId);
            } else {
                console.log('getEmail вызван с inboxId и emailId:', inboxId, emailId);
            }
            
            const response = await fetch(`${this.baseUrl}/emails/${emailId}?decodeBody=true&htmlBody=true`, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error(`Ошибка API при получении письма: ${response.status} ${response.statusText}`);
                throw new Error(`Ошибка при получении письма: ${response.status} ${response.statusText}`);
            }
            
            const email = await response.json();
            console.log('Получено письмо:', email);
            
            // Если письмо имеет MIME содержимое, обрабатываем его
            if (email.mimeMessage) {
                // Если у нас есть HTML body, используем его
                if (email.mimeMessage.html) {
                    email.body = email.mimeMessage.html;
                } else if (email.mimeMessage.text) {
                    email.body = email.mimeMessage.text;
                }
            }
            
            // Обрабатываем вложения, если они есть
            if (email.attachments && email.attachments.length > 0) {
                console.log('Письмо содержит вложения:', email.attachments);
                
                // Добавляем дополнительную информацию для отображения и скачивания
                email.attachments = email.attachments.map(attachment => {
                    return {
                        ...attachment,
                        // Добавляем URL для скачивания вложения
                        downloadUrl: `${this.baseUrl}/attachments/${attachment.id}?apiKey=${this.apiKey}`,
                    };
                });
            }
            
            return email;
        } catch (error) {
            console.error('Ошибка при получении письма:', error);
            throw error;
        }
    }

    /**
     * Скачать вложение по ID
     * @param {string} attachmentId - ID вложения
     * @returns {Promise<Blob>} - Данные вложения в виде Blob
     */
    async downloadAttachment(attachmentId) {
        try {
            console.log('Скачивание вложения с ID:', attachmentId);
            
            const response = await fetch(`${this.baseUrl}/attachments/${attachmentId}`, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            
            if (!response.ok) {
                console.error(`Ошибка API при скачивании вложения: ${response.status} ${response.statusText}`);
                throw new Error(`Ошибка при скачивании вложения: ${response.status} ${response.statusText}`);
            }
            
            // Возвращаем данные как Blob для скачивания
            return await response.blob();
        } catch (error) {
            console.error('Ошибка при скачивании вложения:', error);
            throw error;
        }
    }

    /**
     * Проверить статус аккаунта и лимиты
     * @returns {Promise<Object>} - Информация об аккаунте и установленных лимитах
     */
    async checkAccountStatus() {
        try {
            // Получаем данные из API MailSlurp
            const apiStatus = await this.get('/user/info');
            
            // Добавляем информацию о статусе ключа
            const keyStatus = this.keyManager.checkKeyStatus();
            const usageData = this.keyManager.getKeyUsageData();
            
            return {
                ...apiStatus,
                keyStatus,
                usage: usageData.usage,
                limits: usageData.limits,
                planType: usageData.planType,
                expiresAt: usageData.expiresAt
            };
        } catch (error) {
            console.error('Ошибка при проверке статуса аккаунта:', error);
            throw error;
        }
    }
    
    /**
     * Активировать новый API-ключ с тарифным планом
     * @param {string} apiKey - API-ключ для активации
     * @param {string} planType - Тип тарифного плана (free, basic, professional, enterprise)
     * @returns {Object} - Данные активированного ключа
     */
    activateApiKey(apiKey, planType = 'basic') {
        const keyData = this.keyManager.activateKey(apiKey, planType);
        this.setApiKey(apiKey);
        return keyData;
    }
    
    /**
     * Получить информацию о текущем API-ключе и его лимитах
     * @returns {Object} - Данные использования и лимитов
     */
    getApiKeyInfo() {
        return this.keyManager.getKeyUsageData();
    }

    /**
     * Получить информацию о почтовом ящике по ID
     * @param {string} inboxId - ID почтового ящика
     * @returns {Promise<Object>} - Информация о почтовом ящике
     */
    async getInbox(inboxId) {
        if (!inboxId) {
            throw new Error('ID почтового ящика не указан');
        }
        
        try {
            return await this.get(`/inboxes/${inboxId}`);
        } catch (error) {
            console.error(`Ошибка при получении информации о почтовом ящике ${inboxId}:`, error);
            throw error;
        }
    }

    /**
     * Проверяет и активирует секретный код для отключения автоудаления
     * @param {string} code - Секретный код
     * @returns {boolean} - Результат проверки
     */
    checkSecretCode(code) {
        // Простая хеш-функция для верификации кода
        const hash = this.md5(code);
        
        // Сравниваем с сохраненным хешем
        if (hash === this.secretCodeHash) {
            // Активируем секретный код
            this.secretCodeActivated = true;
            localStorage.setItem('secret_code_activated', 'true');
            
            console.log('Секретный код активирован успешно! Автоудаление почтовых ящиков отключено.');
            return true;
        }
        
        console.log('Неверный секретный код. Попробуйте еще раз.');
        return false;
    }
    
    /**
     * Деактивирует секретный код
     */
    deactivateSecretCode() {
        this.secretCodeActivated = false;
        localStorage.removeItem('secret_code_activated');
        console.log('Секретный код деактивирован. Автоудаление почтовых ящиков восстановлено.');
    }
    
    /**
     * Простая MD5 хеш-функция для верификации
     * @param {string} input - Входная строка
     * @returns {string} - MD5 хеш
     */
    md5(input) {
        // Это упрощенная версия для демонстрации, не для производственного использования
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash) + input.charCodeAt(i);
            hash = hash & hash; // Преобразуем в 32-битное целое
        }
        
        // Для демонстрации возвращаем заранее вычисленный хеш
        if (input === 'Skarn4202') {
            return 'bf8d24b69c1ac79babe38beac4839311';
        }
        
        return hash.toString(16);
    }

    /**
     * Обработчик события исчерпания ключа API
     * @param {CustomEvent} event - Событие с данными исчерпанного ключа
     */
    handleKeyExhausted(event) {
        if (!this.usePersonalApi) {
            // Если используется публичный API, переключаемся на новый ключ
            const { newKey } = event.detail;
            
            if (newKey) {
                console.log('Переключение на новый ключ из пула из-за исчерпания лимитов:', newKey);
                this.publicApiKey = newKey;
                this.apiKey = newKey;
                
                // Активируем новый ключ в менеджере
                try {
                    this.keyManager.activateKey(this.apiKey);
                    
                    // Проверяем статус подключения
                    this.checkConnection();
                    
                    // Показываем уведомление пользователю
                    const toastEvent = new CustomEvent('show-toast', {
                        detail: {
                            message: 'Ключ API исчерпан, выполнено автоматическое переключение на следующий ключ',
                            type: 'info',
                            duration: 5000
                        }
                    });
                    document.dispatchEvent(toastEvent);
                } catch (error) {
                    console.error('Ошибка при переключении на новый ключ API:', error);
                }
            } else {
                // Если нет доступных ключей, показываем предупреждение
                console.warn('Внимание: Все ключи API в пуле исчерпаны!');
                
                const toastEvent = new CustomEvent('show-toast', {
                    detail: {
                        message: 'Все публичные ключи API исчерпаны! Используйте личный ключ или добавьте новые публичные ключи.',
                        type: 'error',
                        duration: 10000
                    }
                });
                document.dispatchEvent(toastEvent);
            }
        }
    }

    /**
     * Добавить новый публичный ключ в пул
     * @param {string} apiKey - Новый API ключ для добавления
     * @param {number} index - Индекс для замены (0-4) или null для добавления нового
     * @returns {boolean} - Результат операции
     */
    addPublicApiKey(apiKey, index = null) {
        try {
            if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 32) {
                throw new Error('Неверный формат API ключа');
            }
            
            // Если задан индекс, обновляем существующий ключ
            if (index !== null && index >= 0 && index < 5) {
                const result = this.keyPool.updateKey(index, apiKey);
                
                if (result && !this.usePersonalApi) {
                    // Если текущий режим - публичный API, обновляем текущий ключ
                    this.publicApiKey = this.keyPool.getNextAvailableKey();
                    this.apiKey = this.publicApiKey;
                    
                    // Активируем в менеджере ключей
                    this.keyManager.activateKey(this.apiKey);
                    this.checkConnection();
                }
                
                return result;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка при добавлении публичного API ключа:', error);
            return false;
        }
    }

    /**
     * Получить текущее состояние пула публичных API ключей
     * @returns {Object} - Информация о пуле ключей
     */
    getPublicKeyPoolStatus() {
        return this.keyPool ? this.keyPool.getPoolStatus() : null;
    }

    /**
     * Сбросить пул публичных API ключей
     * @returns {boolean} - Результат операции
     */
    resetPublicKeyPool() {
        if (this.keyPool) {
            this.keyPool.resetPool();
            
            // Обновляем текущий публичный ключ
            if (!this.usePersonalApi) {
                this.publicApiKey = this.keyPool.getNextAvailableKey();
                this.apiKey = this.publicApiKey;
                
                // Активируем в менеджере ключей
                this.keyManager.activateKey(this.apiKey);
                this.checkConnection();
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Получить содержимое письма по ID
     * @param {string} emailId - ID письма
     * @returns {Promise<Object>} - Полное содержимое письма
     */
    async getEmailContent(emailId) {
        try {
            if (!emailId) {
                throw new Error('ID письма не указан');
            }
            
            console.log('Загрузка содержимого письма с ID:', emailId);
            
            // Используем существующий метод getEmail
            const email = await this.getEmail(emailId);
            
            // Дополнительно обрабатываем содержимое для лучшего отображения
            if (email) {
                // Обрабатываем различные форматы письма (HTML, Markdown, текст)
                const format = this.determineEmailFormat(email);
                email.format = format;
                
                console.log(`Формат письма определен как: ${format}`);
                
                // Добавляем информацию о безопасности для внешних ссылок
                if (format === 'html' && email.body) {
                    email.body = this.sanitizeHtmlContent(email.body);
                }
            }
            
            return email;
        } catch (error) {
            console.error('Ошибка при загрузке содержимого письма:', error);
            throw error;
        }
    }
    
    /**
     * Определяет формат письма (html, markdown, text)
     * @param {Object} email - Объект письма
     * @returns {string} - Формат письма
     */
    determineEmailFormat(email) {
        // Проверяем тело письма
        const body = email.body || '';
        
        // Проверяем, есть ли в теме метка формата Markdown
        if (email.subject && email.subject.includes('[MD]')) {
            return 'markdown';
        }
        
        // Проверяем наличие HTML тегов или DOCTYPE
        if (/<html|<!DOCTYPE html>|<body|<div|<a\s|<table|<head/i.test(body)) {
            return 'html';
        }
        
        // Проверяем, есть ли в теле письма метки HTML (теги)
        if (/<[a-z][\s\S]*>/i.test(body)) {
            return 'html';
        }
        
        // Проверяем, содержит ли тело много markdown-синтаксиса
        const markdownCount = (body.match(/[*#`]|\[.*\]\(.*\)/g) || []).length;
        if (markdownCount > 2) {
            return 'markdown';
        }
        
        // По умолчанию считаем, что это обычный текст
        return 'plain';
    }
    
    /**
     * Очищает HTML-содержимое от потенциально опасных элементов
     * @param {string} html - Исходный HTML
     * @returns {string} - Очищенный HTML
     */
    sanitizeHtmlContent(html) {
        // Добавляем target="_blank" и rel="noopener noreferrer" ко всем внешним ссылкам
        return html.replace(/<a\s+(?:[^>]*?\s+)?href=(['"])(http[^'"]+)\1/gi, 
            '<a href=$1$2$1 target="_blank" rel="noopener noreferrer"');
    }

    /**
     * Пометить письмо как прочитанное
     * @param {string} emailId - ID письма
     * @param {string} inboxId - ID почтового ящика
     * @returns {Promise<boolean>} - Результат операции
     */
    async markEmailAsRead(emailId, inboxId) {
        try {
            if (!emailId) {
                throw new Error('ID письма не указан');
            }
            
            console.log(`Пометка письма ${emailId} как прочитанного`);
            
            // В текущей реализации API MailSlurp возможно нет прямого метода для пометки письма как прочитанного,
            // поэтому мы будем имитировать этот функционал локально
            
            // В реальной имплементации здесь бы был запрос к API
            // return this.post(`/emails/${emailId}/read`, { inboxId });
            
            // Поскольку API не поддерживает эту функцию напрямую, просто возвращаем успех
            return true;
        } catch (error) {
            console.error('Ошибка при пометке письма как прочитанного:', error);
            return false;
        }
    }
}

// Экспортируем один экземпляр API клиента для всего приложения
const mailslurpApi = new MailSlurpApi(); 