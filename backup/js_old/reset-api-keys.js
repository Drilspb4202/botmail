/**
 * Скрипт для сброса API-ключей и очистки localStorage
 */
(function() {
    // Удаляем все записи в localStorage, связанные с API-ключами
    localStorage.removeItem('api_key_pool_state');
    localStorage.removeItem('current_user_key');
    localStorage.removeItem('mailslurp_api_key');
    
    // Устанавливаем новые работающие ключи
    const apiKeys = [
        {
            key: '291bfc5c2846a21115cabdd60c0ea4be1b5884cf08761575cbaff9797a429e2d',
            usageCount: 0,
            lastUsed: null,
            isExhausted: false,
            monthlyReset: new Date().getTime()
        },
        {
            key: 'f74ec85c249827e83b58eeab8b15e8d9cc91d2ca5508c5c8b758805756d524b2',
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
    
    localStorage.setItem('api_key_pool_state', JSON.stringify(newState));
    localStorage.setItem('mailslurp_api_key', apiKeys[0].key);
    
    // Добавляем уведомление для пользователя
    console.log('API-ключи сброшены успешно. Перезагрузите страницу для применения изменений.');
    
    // Показываем уведомление на странице
    const event = new CustomEvent('show-toast', {
        detail: {
            message: 'API-ключи сброшены успешно. Перезагрузите страницу для применения изменений.',
            type: 'success',
            duration: 5000
        }
    });
    document.dispatchEvent(event);
})(); 