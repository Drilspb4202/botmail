/**
 * Утилита для управления API ключами
 * Позволяет обновлять ключи в пуле и очищать связанный кэш
 */
(function() {
    // Глобальный объект для управления ключами
    window.apiKeyUpdater = {
        /**
         * Обновить ключ API в пуле по индексу
         * @param {number} index - Индекс ключа (от 0 до 4)
         * @param {string} newKey - Новый ключ API
         * @returns {boolean} Успешность операции
         */
        updateKey: function(index, newKey) {
            try {
                // Проверка существования пула ключей
                if (!window.apiKeyPool) {
                    console.error('Ошибка: Пул API ключей не инициализирован');
                    return false;
                }
                
                // Валидация ключа
                if (!newKey || typeof newKey !== 'string' || newKey.length < 32) {
                    console.error('Ошибка: Неверный формат ключа API');
                    return false;
                }
                
                // Обновление ключа
                const result = window.apiKeyPool.updateKey(index, newKey);
                
                if (result) {
                    // Принудительно сбрасываем состояние
                    window.apiKeyPool.forceRefreshState();
                    
                    // Создаем уведомление об успешном обновлении
                    const event = new CustomEvent('show-toast', {
                        detail: {
                            message: `API ключ №${index + 1} успешно обновлен`,
                            type: 'success',
                            duration: 5000
                        }
                    });
                    document.dispatchEvent(event);
                    
                    // Перезагружаем API если он инициализирован
                    if (window.mailSlurpApi) {
                        // Проверяем режим API
                        if (!window.mailSlurpApi.usePersonalApi) {
                            // Если используется публичный API, обновляем текущий ключ
                            window.mailSlurpApi.apiKey = window.apiKeyPool.getNextAvailableKey();
                            window.mailSlurpApi.checkConnection();
                            console.log('API ключ обновлен для текущей сессии');
                        }
                    }
                    
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error('Произошла ошибка при обновлении ключа:', error);
                return false;
            }
        },
        
        /**
         * Очистить локальное хранилище и сбросить состояние пула ключей
         */
        resetKeyPool: function() {
            try {
                if (window.apiKeyPool) {
                    window.apiKeyPool.forceRefreshState();
                    
                    // Создаем уведомление
                    const event = new CustomEvent('show-toast', {
                        detail: {
                            message: 'Пул API ключей сброшен',
                            type: 'info',
                            duration: 3000
                        }
                    });
                    document.dispatchEvent(event);
                    
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Ошибка при сбросе пула ключей:', error);
                return false;
            }
        },
        
        /**
         * Получить информацию о состоянии пула ключей
         * @returns {Object|null} Информация о пуле ключей
         */
        getPoolStatus: function() {
            if (window.apiKeyPool) {
                return window.apiKeyPool.getPoolStatus();
            }
            return null;
        },
        
        /**
         * Проверить состояние обновленного ключа API
         * @param {number} index - Индекс проверяемого ключа
         * @returns {Promise<Object>} Результат проверки
         */
        testKey: async function(index) {
            try {
                if (!window.apiKeyPool || !window.apiKeyPool.publicKeys[index]) {
                    return { success: false, error: 'Ключ с указанным индексом не найден' };
                }
                
                const keyToTest = window.apiKeyPool.publicKeys[index].key;
                
                // Создаем временный объект для проверки
                const baseUrl = 'https://api.mailslurp.com';
                const response = await fetch(`${baseUrl}/user/info`, {
                    method: 'GET',
                    headers: {
                        'x-api-key': keyToTest,
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return { 
                        success: true, 
                        data,
                        message: `Ключ №${index + 1} работает корректно!`
                    };
                } else {
                    return {
                        success: false,
                        error: `Ошибка ${response.status}: ${response.statusText}`,
                        message: `Ключ №${index + 1} не работает`
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    message: `Ошибка при проверке ключа №${index + 1}`
                };
            }
        }
    };
    
    // Прослушиваем событие инициализации страницы
    document.addEventListener('DOMContentLoaded', function() {
        // Проверяем, был ли передан параметр для обновления ключа
        const urlParams = new URLSearchParams(window.location.search);
        const keyParam = urlParams.get('api_key_update');
        const indexParam = urlParams.get('key_index');
        
        if (keyParam && indexParam) {
            // Устанавливаем таймер, чтобы дать время загрузиться всем скриптам
            setTimeout(() => {
                try {
                    const index = parseInt(indexParam, 10);
                    if (window.apiKeyUpdater && !isNaN(index) && index >= 0 && index < 5) {
                        // Обновляем ключ
                        const result = window.apiKeyUpdater.updateKey(index, keyParam);
                        console.log(`Результат автоматического обновления ключа: ${result}`);
                        
                        // Очищаем URL
                        if (history.pushState) {
                            const newUrl = window.location.protocol + "//" + 
                                window.location.host + 
                                window.location.pathname;
                            window.history.pushState({path: newUrl}, '', newUrl);
                        }
                    }
                } catch (e) {
                    console.error('Ошибка при автоматическом обновлении ключа:', e);
                }
            }, 1000);
        }
    });
})(); 