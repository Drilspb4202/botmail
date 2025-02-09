# NeuroMailBot

Telegram бот для создания временных email адресов и получения писем.

## Установка

1. Клонируйте репозиторий:
```bash
git clone <ваш-репозиторий>
cd <папка-с-ботом>
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Создайте файл .env и добавьте токен вашего бота:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## Запуск

Для запуска бота выполните:
```bash
python bot.py
```

## Основные функции

- Создание временных email адресов
- Автоматическое получение писем
- Уведомления о новых письмах
- Различные форматы отображения сообщений
- Автоматическая проверка почты

## Системные требования

- Python 3.7+
- Доступ в интернет
- Токен Telegram бота

## Развертывание на сервере

1. Установите Python и pip
2. Установите зависимости: `pip install -r requirements.txt`
3. Настройте файл .env с вашим токеном
4. Запустите бота: `python bot.py`

Для постоянной работы бота рекомендуется использовать процесс-менеджер, например:
- systemd (Linux)
- supervisor
- pm2

### Пример настройки systemd

1. Создайте файл сервиса:
```bash
sudo nano /etc/systemd/system/neuromail-bot.service
```

2. Добавьте конфигурацию:
```ini
[Unit]
Description=NeuroMail Telegram Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/bot
Environment=PYTHONPATH=/path/to/bot
ExecStart=/usr/bin/python3 /path/to/bot/bot.py
Restart=always

[Install]
WantedBy=multi-user.target
```

3. Включите и запустите сервис:
```bash
sudo systemctl enable neuromail-bot
sudo systemctl start neuromail-bot
```

## Мониторинг

Для мониторинга работы бота проверяйте логи:
```bash
sudo journalctl -u neuromail-bot -f
``` 