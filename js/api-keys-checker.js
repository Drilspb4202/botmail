/**
 * Автоматическая проверка и обновление API-ключей при запуске приложения
 */
(function() {
    // Запускаем проверку после загрузки страницы
    document.addEventListener('DOMContentLoaded', checkAndUpdateApiKeys);
    
    /**
     * Проверяет и обновляет API-ключи при необходимости
     */
    async function checkAndUpdateApiKeys() {
        try {
            console.log('Проверка API-ключей...');
            
            // Проверяем, использует ли приложение известные нерабочие ключи
            const oldKeys = [
                'bb883bc4065365fedcfacd7cc41a355e54d4b19d06de6505b213c4516f03ae1',
                '042b76d65e4661288db7647cfae566a7b7b02f2b5cf55528f5a2106ebd32de09',
                '7d65e4661288db7647cfae566a7b7b02f2b5cf55528f5a2106ebd32de09042b'
            ];
            
            // Получаем текущий ключ из localStorage
            const currentKey = localStorage.getItem('mailslurp_api_key');
            
            // Проверяем, является ли текущий ключ одним из старых нерабочих ключей
            if (currentKey && oldKeys.includes(currentKey)) {
                console.warn('Обнаружен устаревший API-ключ:', currentKey);
                
                // Выполняем сброс к новым ключам
                resetToNewKeys();
                
                // Показываем уведомление пользователю
                showResetNotification();
                
                return;
            }
            
            // Проверяем состояние пула ключей
            const poolState = localStorage.getItem('api_key_pool_state');
            if (poolState) {
                try {
                    const state = JSON.parse(poolState);
                    
                    // Проверяем, есть ли в пуле старые ключи
                    const hasOldKeys = state.publicKeys && state.publicKeys.some(
                        keyData => oldKeys.includes(keyData.key) && !keyData.isExhausted
                    );
                    
                    if (hasOldKeys) {
                        console.warn('Обнаружены устаревшие ключи в пуле');
                        
                        // Выполняем сброс к новым ключам
                        resetToNewKeys();
                        
                        // Показываем уведомление пользователю
                        showResetNotification();
                        
                        return;
                    }
                } catch (error) {
                    console.error('Ошибка при проверке состояния пула ключей:', error);
                }
            }
            
            console.log('Проверка API-ключей завершена, все ключи актуальны');
        } catch (error) {
            console.error('Ошибка при проверке API-ключей:', error);
        }
    }
    
    /**
     * Сбрасывает API-ключи к новым рабочим ключам
     */
    function resetToNewKeys() {
        console.log('Сброс API-ключей к новым рабочим ключам');
        
        // Удаляем все записи в localStorage, связанные с API-ключами
        localStorage.removeItem('api_key_pool_state');
        localStorage.removeItem('current_user_key');
        localStorage.removeItem('mailslurp_api_key');
        localStorage.removeItem('use_personal_api');
        localStorage.removeItem('api_mode');
        
        // Устанавливаем новые работающие ключи
        const apiKeys = [
            {
                key: 'f32302aca233b7f4089f7c08b53d949a23bb639f7f01776f07056638d81f292c',
                usageCount: 0,
                lastUsed: null,
                isExhausted: false,
                monthlyReset: new Date().getTime()
            },
            {
                key: '8f47bef8ce382ea4f5809ab705020a5658586b84e1308a84644e197647ceef8f',
                usageCount: 0,
                lastUsed: null,
                isExhausted: false,
                monthlyReset: new Date().getTime()
            }
        ];
        
        // Сохраняем новое состояние пула ключей
        const newState = {
            publicKeys: apiKeys,
            currentKeyIndex: 0
        };
        
        // Обновляем локальное хранилище
        localStorage.setItem('api_key_pool_state', JSON.stringify(newState));
        localStorage.setItem('mailslurp_api_key', apiKeys[0].key);
        localStorage.setItem('api_mode', 'public');
        
        console.log('API-ключи успешно сброшены к новым рабочим ключам');
    }
    
    /**
     * Показывает уведомление о сбросе API-ключей
     */
    function showResetNotification() {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = 'api-key-reset-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>API-ключи обновлены</h4>
                <p>Обнаружены устаревшие API-ключи. Они были автоматически обновлены до новых рабочих ключей.</p>
                <p>Если возникнут проблемы, вы можете выполнить полный сброс ключей на странице <a href="reset.html">сброса ключей</a>.</p>
                <button class="close-btn">Понятно</button>
            </div>
        `;
        
        // Создаем стили для уведомления
        const style = document.createElement('style');
        style.textContent = `
            .api-key-reset-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #333;
                color: #fff;
                border-radius: 5px;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
                z-index: 9999;
                max-width: 350px;
            }
            .notification-content {
                padding: 15px;
            }
            .notification-content h4 {
                margin-top: 0;
                color: #3498db;
            }
            .notification-content a {
                color: #3498db;
                text-decoration: none;
            }
            .notification-content a:hover {
                text-decoration: underline;
            }
            .close-btn {
                background-color: #3498db;
                color: white;
                border: none;
                padding: 5px 15px;
                border-radius: 3px;
                cursor: pointer;
                float: right;
                margin-top: 10px;
            }
            .close-btn:hover {
                background-color: #2980b9;
            }
        `;
        
        // Добавляем стили и уведомление в документ
        document.head.appendChild(style);
        document.body.appendChild(notification);
        
        // Добавляем обработчик для кнопки закрытия
        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.remove();
        });
        
        // Автоматически закрываем уведомление через 15 секунд
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 15000);
    }
})(); 