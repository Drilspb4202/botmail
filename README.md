# NeuroMail - Инструкция по обновлению API-ключей

## Где хранятся API-ключи

API-ключи хранятся в трех местах:

1. **Публичные ключи** - в классе `ApiKeyPool` (файл `js/api-key-pool.js`)
2. **Резервный ключ** - в классе `MailSlurpApi` (файл `js/api.js`)
3. **Локальное хранилище** браузера после инициализации

## Текущие API-ключи

В проекте сейчас используются следующие API-ключи:

1. Основные ключи в пуле (файл `js/api-key-pool.js`):
   ```
   f32302aca233b7f4089f7c08b53d949a23bb639f7f01776f07056638d81f292c
   8f47bef8ce382ea4f5809ab705020a5658586b84e1308a84644e197647ceef8f
   5083ac0e5cb4bb411da164c1da9e8d9c1efb7c26d5ccdaf8cc0cc64691903055
   2543594a13e9bb72ae82d959ac68990f812e53bd50b247ca564d8baf3082d2d7
   3a71d464318fc53a706bd14bc99928159dfd0a0b63d9f854d2b25fa3e821301f
   ```

2. Резервный ключ (файл `js/api.js`):
   ```
   f32302aca233b7f4089f7c08b53d949a23bb639f7f01776f07056638d81f292c
   ```

3. Известные неработающие ключи (файл `js/api.js`):
   ```
   bb883bc4065365fedcfacd7cc41a355e54d4b19d06de6505b213c4516f03ae1
   042b76d65e4661288db7647cfae566a7b7b02f2b5cf55528f5a2106ebd32de09
   ```

## Как обновить API-ключи

### 1. Обновление публичных ключей в пуле

Откройте файл `js/api-key-pool.js` и найдите массив `defaultKeys`:

```javascript
this.defaultKeys = [
    { key: "ключ1", isExhausted: false },
    { key: "ключ2", isExhausted: false },
    { key: "ключ3", isExhausted: false },
    { key: "ключ4", isExhausted: false },
    { key: "ключ5", isExhausted: false }
];
```

Замените каждый ключ на новый. Все ключи должны быть валидными API-ключами MailSlurp.

### 2. Обновление резервного ключа

Откройте файл `js/api.js` и найдите строку:

```javascript
this.publicApiKey = this.keyPool.getNextAvailableKey() || 'f32302aca233b7f4089f7c08b53d949a23bb639f7f01776f07056638d81f292c';
```

Замените резервный ключ (значение после `||`) на новый валидный API-ключ MailSlurp.

### 3. Обновление ссылки на старые ключи

В том же файле `js/api.js` найдите массив `oldKeys`:

```javascript
const oldKeys = [
    'bb883bc4065365fedcfacd7cc41a355e54d4b19d06de6505b213c4516f03ae1',
    '042b76d65e4661288db7647cfae566a7b7b02f2b5cf55528f5a2106ebd32de09'
];
```

Обновите этот массив, добавив в него старые ключи, которые больше не работают, чтобы система автоматически их игнорировала.

### 4. После обновления

После обновления кода:
1. Очистите кэш браузера
2. Удалите локальное хранилище (localStorage):
   ```javascript
   localStorage.removeItem('api_key_pool_state');
   localStorage.removeItem('mailslurp_api_key');
   ```
3. Перезагрузите страницу

## Важные правила обновления

1. **Проверяйте ключи** перед использованием на [официальном сайте MailSlurp](https://app.mailslurp.com/)
2. **Никогда не удаляйте все ключи** одновременно - всегда должен быть хотя бы один рабочий ключ
3. **Обновляйте резервный ключ** одновременно с пулом ключей
4. **Не используйте личные API-ключи** в публичном коде
5. **Не коммитьте API-ключи** в Git репозиторий - лучше использовать переменные окружения

## Пример обновления всех ключей

```javascript
// В файле js/api-key-pool.js
this.defaultKeys = [
    { key: "новый_ключ_1", isExhausted: false },
    { key: "новый_ключ_2", isExhausted: false },
    { key: "новый_ключ_3", isExhausted: false },
    { key: "новый_ключ_4", isExhausted: false },
    { key: "новый_ключ_5", isExhausted: false }
];

// В файле js/api.js
this.publicApiKey = this.keyPool.getNextAvailableKey() || 'новый_резервный_ключ';

// Также в js/api.js обновить старые ключи
const oldKeys = [
    'старый_ключ_1',
    'старый_ключ_2',
    'f32302aca233b7f4089f7c08b53d949a23bb639f7f01776f07056638d81f292c', // добавить старый резервный ключ
    'bb883bc4065365fedcfacd7cc41a355e54d4b19d06de6505b213c4516f03ae1',
    '042b76d65e4661288db7647cfae566a7b7b02f2b5cf55528f5a2106ebd32de09'
];
```

## Как запустить проект

Есть несколько способов запустить проект:

1. **Используя Python**:
   ```
   python -m http.server 8080
   ```
   
2. **Используя PowerShell** (если есть проблемы с политикой безопасности):
   ```
   powershell -ExecutionPolicy Bypass -File start-server.ps1
   ```

## Проверка работоспособности ключей

После обновления откройте консоль браузера (F12) и проверьте статус API-ключей:

```javascript
window.mailSlurpApi.checkConnection().then(status => {
    console.log("Статус подключения:", status);
});
```

Если статус `isConnected: true`, значит ключи работают корректно. 