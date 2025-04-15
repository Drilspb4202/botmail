/**
 * Менеджер API-ключей для монетизации сервиса и изоляции пользовательских данных
 */
class ApiKeyManager {
    constructor() {
        // Инициализация хранилища ключей
        this.apiKeys = this.loadApiKeys();
        this.currentUserKey = localStorage.getItem('current_user_key') || null;
        
        // Префикс для изоляции почтовых ящиков
        this.prefix = this.generateUserPrefix();
        
        // Добавляем текущее количество ящиков пользователя
        this.currentInboxCount = 0;
    }
    
    /**
     * Загрузка API-ключей из хранилища
     * @returns {Object} - Объект с данными API-ключей
     */
    loadApiKeys() {
        const keysData = localStorage.getItem('api_keys_data');
        return keysData ? JSON.parse(keysData) : {};
    }
    
    /**
     * Сохранение API-ключей в хранилище
     */
    saveApiKeys() {
        localStorage.setItem('api_keys_data', JSON.stringify(this.apiKeys));
    }
    
    /**
     * Генерация префикса для изоляции пользовательских данных
     * @returns {string} - Уникальный префикс
     */
    generateUserPrefix() {
        const storedPrefix = localStorage.getItem('user_prefix');
        if (storedPrefix) return storedPrefix;
        
        // Создаем короткий случайный префикс
        const prefix = 'u' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('user_prefix', prefix);
        return prefix;
    }
    
    /**
     * Активация API-ключа
     * @param {string} apiKey - API-ключ
     * @param {string} planType - Тип тарифного плана
     * @returns {Object} - Информация об активированном ключе
     */
    activateKey(apiKey, planType = 'basic') {
        // Если ключ уже существует, проверяем его валидность
        if (this.apiKeys[apiKey]) {
            const keyData = this.apiKeys[apiKey];
            
            // Проверка срока действия ключа
            if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
                throw new Error('API-ключ истёк. Пожалуйста, обновите подписку.');
            }
            
            // Если ключ валиден, устанавливаем его как текущий
            this.currentUserKey = apiKey;
            localStorage.setItem('current_user_key', apiKey);
            return keyData;
        }
        
        // Создаем новый ключ с данными тарифного плана
        const planLimits = this.getPlanLimits(planType);
        const keyData = {
            apiKey,
            planType,
            createdAt: new Date().toISOString(),
            expiresAt: this.calculateExpiryDate(planType),
            usage: {
                inboxesCreated: 0,
                emailsSent: 0,
                emailsReceived: 0
            },
            limits: planLimits,
            prefix: this.generateUniquePrefix(),
            isActive: true
        };
        
        // Сохраняем ключ и делаем его текущим
        this.apiKeys[apiKey] = keyData;
        this.saveApiKeys();
        this.currentUserKey = apiKey;
        localStorage.setItem('current_user_key', apiKey);
        
        return keyData;
    }
    
    /**
     * Получение лимитов для тарифного плана
     * @param {string} planType - Тип тарифного плана
     * @returns {Object} - Лимиты плана
     */
    getPlanLimits(planType) {
        const plans = {
            free: {
                maxInboxes: 2,
                maxEmailsPerDay: 20,
                maxStorageDays: 1,
                maxAttachmentSize: 1, // в МБ
                canCreateCustomDomains: false,
                hasAdvancedAnalytics: false
            },
            basic: {
                maxInboxes: 10,
                maxEmailsPerDay: 100,
                maxStorageDays: 7,
                maxAttachmentSize: 5,
                canCreateCustomDomains: false,
                hasAdvancedAnalytics: false
            },
            professional: {
                maxInboxes: 50,
                maxEmailsPerDay: 500,
                maxStorageDays: 30,
                maxAttachmentSize: 20,
                canCreateCustomDomains: true,
                hasAdvancedAnalytics: true
            },
            enterprise: {
                maxInboxes: 500,
                maxEmailsPerDay: 5000,
                maxStorageDays: 90,
                maxAttachmentSize: 100,
                canCreateCustomDomains: true,
                hasAdvancedAnalytics: true
            }
        };
        
        // Возвращаем лимиты плана или базовые, если план не определен
        return plans[planType] || plans.basic;
    }
    
    /**
     * Расчет даты истечения срока действия ключа
     * @param {string} planType - Тип тарифного плана
     * @returns {string} - Дата истечения в ISO формате
     */
    calculateExpiryDate(planType) {
        const durationMap = {
            free: 7, // 7 дней
            basic: 30, // 30 дней
            professional: 30, // 30 дней
            enterprise: 365 // 365 дней
        };
        
        const days = durationMap[planType] || 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        
        return expiryDate.toISOString();
    }
    
    /**
     * Генерация уникального префикса для пользователя
     * @returns {string} - Уникальный префикс
     */
    generateUniquePrefix() {
        return 'u' + Math.random().toString(36).substring(2, 8);
    }
    
    /**
     * Обновление количества текущих почтовых ящиков пользователя
     * @param {Array} inboxes - Актуальный список ящиков пользователя
     */
    updateInboxCount(inboxes = []) {
        if (Array.isArray(inboxes)) {
            this.currentInboxCount = inboxes.length;
            
            // Обновляем счетчик в данных ключа, если он активирован
            if (this.currentUserKey && this.apiKeys[this.currentUserKey]) {
                this.apiKeys[this.currentUserKey].usage.inboxesCreated = this.currentInboxCount;
                this.saveApiKeys();
            }
        }
    }
    
    /**
     * Проверка активного ключа на валидность и достаточность лимитов
     * @param {string} action - Тип действия (createInbox, sendEmail, etc.)
     * @returns {boolean} - Результат проверки
     */
    checkKeyLimits(action) {
        // Если ключ не активирован, пробуем активировать текущий ключ
        if (!this.currentUserKey || !this.apiKeys[this.currentUserKey]) {
            // Пробуем получить ключ из localStorage или использовать дефолтный
            const apiKey = localStorage.getItem('mailslurp_api_key') || 'fac5b6d2020a14edc74b54e9f1b09513df1c2ca3fc1901ec9e5933df11052d5a';
            
            try {
                // Пытаемся активировать ключ автоматически
                this.activateKey(apiKey);
                console.log('Ключ был автоматически активирован', apiKey);
            } catch (activationError) {
                console.error('Не удалось автоматически активировать ключ:', activationError);
                throw new Error('API-ключ не активирован. Пожалуйста, активируйте ключ или обновите страницу.');
            }
        }
        
        const keyData = this.apiKeys[this.currentUserKey];
        
        // Проверка срока действия
        if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
            throw new Error('API-ключ истёк. Пожалуйста, обновите подписку.');
        }
        
        // Проверка лимитов в зависимости от действия
        switch(action) {
            case 'createInbox':
                // Используем текущее количество ящиков, а не счетчик созданных
                if (this.currentInboxCount >= keyData.limits.maxInboxes) {
                    throw new Error(`Достигнут лимит почтовых ящиков (${keyData.limits.maxInboxes}). Перейдите на более высокий тариф.`);
                }
                // Не увеличиваем счетчик здесь, это будет делать метод updateInboxCount
                break;
                
            case 'sendEmail':
                if (keyData.usage.emailsSent >= keyData.limits.maxEmailsPerDay) {
                    throw new Error(`Достигнут дневной лимит отправки писем (${keyData.limits.maxEmailsPerDay}). Повторите попытку завтра или перейдите на более высокий тариф.`);
                }
                keyData.usage.emailsSent++;
                break;
                
            default:
                // Для других действий можно добавить дополнительные проверки
                break;
        }
        
        // Обновляем данные использования
        this.apiKeys[this.currentUserKey] = keyData;
        this.saveApiKeys();
        
        return true;
    }
    
    /**
     * Получение префикса текущего пользователя для изоляции данных
     * @returns {string} - Префикс пользователя
     */
    getCurrentUserPrefix() {
        if (this.currentUserKey && this.apiKeys[this.currentUserKey]) {
            return this.apiKeys[this.currentUserKey].prefix;
        }
        return this.prefix;
    }
    
    /**
     * Добавление префикса к имени почтового ящика для изоляции
     * @param {string} inboxName - Исходное имя ящика
     * @returns {string} - Имя с префиксом
     */
    addPrefixToInboxName(inboxName) {
        const prefix = this.getCurrentUserPrefix();
        return `${prefix}-${inboxName}`;
    }
    
    /**
     * Фильтрация ящиков по префиксу пользователя
     * @param {Array} inboxes - Список всех ящиков
     * @returns {Array} - Отфильтрованный список ящиков
     */
    filterInboxesByPrefix(inboxes) {
        // Получаем текущий префикс пользователя
        const userPrefix = this.getCurrentUserPrefix();
        
        console.log('Фильтрация ящиков. Текущий префикс:', userPrefix);
        console.log('Получено ящиков всего:', inboxes.length);
        
        // 1. ВАЖНО! Сначала проверяем, есть ли в списке текущий ящик из localStorage
        const currentInboxId = localStorage.getItem('current_inbox_id');
        let hasCurrentInbox = false;
        
        if (currentInboxId) {
            hasCurrentInbox = inboxes.some(inbox => inbox.id === currentInboxId);
            console.log(`Проверка наличия текущего ящика ${currentInboxId} в списке:`, hasCurrentInbox ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
        }
        
        // 2. Фильтруем ящики по префиксу как обычно
        let filteredInboxes = inboxes.filter(inbox => {
            // Проверяем по имени
            if (inbox.name && inbox.name.startsWith(userPrefix)) {
                return true;
            }
            
            // Проверяем по тегам
            if (inbox.tags && Array.isArray(inbox.tags)) {
                return inbox.tags.some(tag => tag === `prefix:${userPrefix}`);
            }
            
            return false;
        });
        
        console.log('Отфильтровано ящиков по префиксу:', filteredInboxes.length);
        
        // 3. Если текущий ящик есть в общем списке, но его нет в отфильтрованном, добавляем его
        if (currentInboxId && hasCurrentInbox && !filteredInboxes.some(inbox => inbox.id === currentInboxId)) {
            console.log('Текущий ящик не прошел фильтрацию, принудительно добавляем его');
            const currentInbox = inboxes.find(inbox => inbox.id === currentInboxId);
            if (currentInbox) {
                filteredInboxes.push(currentInbox);
            }
        }
        
        return filteredInboxes;
    }
    
    /**
     * Проверка статуса API ключа
     * @returns {Object} - Информация о статусе ключа
     */
    checkKeyStatus() {
        // Если ключ не активирован, пробуем активировать текущий ключ
        if (!this.currentUserKey || !this.apiKeys[this.currentUserKey]) {
            // Пробуем получить ключ из localStorage или использовать дефолтный
            const apiKey = localStorage.getItem('mailslurp_api_key') || 'fac5b6d2020a14edc74b54e9f1b09513df1c2ca3fc1901ec9e5933df11052d5a';
            
            try {
                // Пытаемся активировать ключ автоматически
                this.activateKey(apiKey);
                console.log('Ключ был автоматически активирован для проверки статуса', apiKey);
            } catch (activationError) {
                console.error('Не удалось автоматически активировать ключ:', activationError);
                return {
                    isActive: false,
                    error: 'API-ключ не активирован'
                };
            }
        }
        
        const keyData = this.apiKeys[this.currentUserKey];
        
        // Проверка срока действия
        const isExpired = keyData.expiresAt && new Date(keyData.expiresAt) < new Date();
        
        return {
            isActive: keyData.isActive && !isExpired,
            planType: keyData.planType,
            expiresAt: keyData.expiresAt,
            isExpired,
            prefix: keyData.prefix
        };
    }
    
    /**
     * Получение данных использования и лимитов ключа
     * @returns {Object} - Данные использования и лимиты
     */
    getKeyUsageData() {
        if (!this.currentUserKey || !this.apiKeys[this.currentUserKey]) {
            return {
                usage: {
                    inboxesCreated: 0,
                    emailsSent: 0,
                    emailsReceived: 0
                },
                limits: this.getPlanLimits('basic'),
                planType: 'basic',
                expiresAt: null
            };
        }
        
        const keyData = this.apiKeys[this.currentUserKey];
        
        return {
            usage: keyData.usage,
            limits: keyData.limits,
            planType: keyData.planType,
            expiresAt: keyData.expiresAt
        };
    }
}

// Экспорт класса
window.ApiKeyManager = ApiKeyManager; 