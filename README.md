# NeuroMail Bot

Telegram бот для создания и управления временными email адресами.

## Основные функции

- 📧 Создание временных email адресов
- 📨 Автоматическое получение писем в реальном времени
- 🔍 Умное определение кодов подтверждения
- 🔗 Извлечение и форматирование ссылок
- 📱 Разные форматы отображения сообщений
- 🔐 Автоматическое удаление старых ящиков
- 🌐 Поддержка различных почтовых доменов

## Установка и запуск локально

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Drilspb4202/botmail.git
cd botmail
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Создайте файл `.env` и добавьте в него:
```
TELEGRAM_BOT_TOKEN=ваш_токен_бота
ADMIN_ID=ваш_telegram_id
```

4. Запустите бота:
```bash
python bot.py
```

## Развертывание на PythonAnywhere

1. Зарегистрируйтесь на [PythonAnywhere](https://www.pythonanywhere.com)

2. После входа в аккаунт, перейдите в раздел "Consoles" и откройте новую Bash консоль

3. Клонируйте репозиторий:
```bash
git clone https://github.com/Drilspb4202/botmail.git
```

4. Создайте виртуальное окружение:
```bash
mkvirtualenv --python=/usr/bin/python3.9 botmail-env
```

5. Активируйте виртуальное окружение:
```bash
workon botmail-env
```

6. Перейдите в директорию проекта и установите зависимости:
```bash
cd botmail
pip install pyTelegramBotAPI python-dotenv requests
pip install -r requirements.txt
```

7. Создайте и настройте файл с переменными окружения:
```bash
nano .env
```
Добавьте в файл:
```
TELEGRAM_BOT_TOKEN=ваш_токен_бота
ADMIN_ID=ваш_telegram_id
```

8. Проверьте, что бот запускается:
```bash
python bot.py
```

9. Настройте Always-on task:
- Перейдите в раздел "Tasks"
- Нажмите "Add a new task"
- В поле "Command" введите полный путь:
```bash
cd /home/ваш_username/botmail && source /home/ваш_username/.virtualenvs/botmail-env/bin/activate && python bot.py
```
- Установите расписание на "Always-on"
- Нажмите "Create"

10. Проверьте логи в разделе "Files" в папке:
```
/home/ваш_username/.pythonanywhere/logs/
```

### Решение частых проблем на PythonAnywhere

1. Если получаете ошибку "No module named 'telebot'":
```bash
workon botmail-env  # Активируйте виртуальное окружение
pip install pyTelegramBotAPI  # Установите библиотеку вручную
```

2. Если виртуальное окружение не активируется:
```bash
source ~/.virtualenvs/botmail-env/bin/activate
```

3. Если не видно логов бота:
```bash
tail -f /home/ваш_username/.pythonanywhere/logs/botmail.log
```

## Обновление кода

### Локальное обновление

1. Убедитесь, что вы находитесь в директории проекта:
```bash
cd botmail
```

2. Получите последние изменения из репозитория:
```bash
git pull origin master
```

3. Если есть новые зависимости, обновите их:
```bash
pip install -r requirements.txt
```

4. Перезапустите бота:
```bash
python bot.py
```

### Обновление на PythonAnywhere

1. Откройте bash консоль на PythonAnywhere

2. Перейдите в директорию проекта:
```bash
cd botmail
```

3. Получите последние изменения:
```bash
git pull origin master
```

4. Активируйте виртуальное окружение и обновите зависимости:
```bash
workon botmail-env
pip install -r requirements.txt
```

5. Перезапустите Always-on task:
- Перейдите в раздел "Tasks"
- Остановите текущую задачу
- Запустите её заново

6. Проверьте логи для подтверждения успешного запуска

## Работа с Git

### Обновление последнего коммита

1. Внесите необходимые изменения в файлы

2. Добавьте изменения в текущий коммит:
```bash
git add .
git commit --amend -m "Новое сообщение коммита"
```

3. Отправьте изменения в репозиторий:
```bash
git push --force origin master
```

⚠️ Внимание: Используйте `--force` с осторожностью, только если вы уверены, что никто другой не работает с этой веткой.

### Создание нового коммита

1. Добавьте изменения:
```bash
git add .
```

2. Создайте коммит:
```bash
git commit -m "Описание изменений"
```

3. Отправьте изменения:
```bash
git push origin master
```

## Использование

1. Начните диалог с ботом: [@ваш_бот](https://t.me/ваш_бот)
2. Используйте команду /start для получения инструкций
3. Нажмите кнопку "📧 Создать почту" для получения временного email
4. Используйте остальные кнопки для управления почтой и сообщениями

## Безопасность

- Все временные адреса автоматически удаляются через 24 часа
- Пароли генерируются случайным образом
- Поддерживается безопасное хранение чувствительных данных
- Реализована защита от спама и злоупотреблений

## Лицензия

MIT License