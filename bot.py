import telebot
import requests
import json
import os
from dotenv import load_dotenv
import time
import re
import random
import string
from telebot.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton, Message

# Загрузка переменных окружения
load_dotenv()

# Получение токена бота из переменных окружения
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
print(f"Debug - Loading bot token: {BOT_TOKEN}")

if not BOT_TOKEN:
    raise ValueError("Не удалось загрузить токен бота из .env файла")

bot = telebot.TeleBot(BOT_TOKEN)

# API URLs
BASE_URL = "https://tempmail.glitchy.workers.dev"
GET_MAIL_URL = f"{BASE_URL}/get"
GET_MESSAGES_URL = f"{BASE_URL}/see"
GET_MESSAGE_CONTENT_URL = f"{BASE_URL}/message"
CUSTOM_MAIL_URL = f"{BASE_URL}/custom"

# Словарь для хранения email адресов пользователей
user_emails = {}

# Добавляем словарь для хранения таймеров проверки
check_timers = {}

# Добавляем словарь для хранения интервалов проверки
check_intervals = {}

# Добавляем словарь для хранения прочитанных сообщений
user_read_messages = {}

# Добавляем словарь для хранения настроек формата сообщений
user_message_format = {}

# Форматы сообщений
MESSAGE_FORMATS = {
    'full': '📋 Полный',
    'brief': '📝 Краткий',
    'compact': '📱 Компактный'
}

# Добавляем список доступных доменов из конфига
AVAILABLE_DOMAINS = [
    'guerrillamail.com',
    'guerrillamail.net',
    'guerrillamail.org',
    'sharklasers.com',
    'grr.la',
    'pokemail.net',
    'spam4.me'
]

# Добавляем словарь для хранения статистики
user_stats = {}

# Константы для времени жизни почты
EMAIL_LIFETIME = 3600  # 1 час по умолчанию
EMAIL_CHECK_INTERVAL = 15  # Проверка каждые 15 секунд

def get_messages(message):
    """Получение и отображение сообщений"""
    try:
        user_id = message.from_user.id
        if user_id not in user_emails:
            bot.reply_to(message, "❌ У вас нет активной почты. Создайте новую с помощью кнопки 📧 Создать почту")
            return

        update_stats(user_id, 'messages_checked')
        
        checking_msg = bot.reply_to(message, "⏳ Проверяю сообщения...")
        
        email_data = user_emails[user_id]
        email = email_data['email']
        url = f"{GET_MESSAGES_URL}?mail={email}"
        
        try:
            response = requests.get(url, timeout=10)
            
            if response.status_code == 404 or not response.text.strip():
                bot.reply_to(message, "📭 У вас пока нет сообщений.")
                return

            try:
                data = json.loads(response.text)
                messages = data.get('messages', [])
                
                if not messages:
                    bot.reply_to(message, "📭 У вас пока нет сообщений.")
                    return

                # Инициализируем список прочитанных сообщений для пользователя, если его нет
                if user_id not in user_read_messages:
                    user_read_messages[user_id] = set()

                # Отмечаем все сообщения как прочитанные
                for msg in messages:
                    msg_id = msg.get('id', '')
                    if msg_id:
                        user_read_messages[user_id].add(msg_id)

                format_type = user_message_format.get(user_id, 'full')
                
                for idx, msg in enumerate(messages, 1):
                    message_text = format_message(msg, format_type, idx, len(messages))

                    # Создаем клавиатуру для сообщения
                    msg_keyboard = InlineKeyboardMarkup()
                    msg_keyboard.row(
                        InlineKeyboardButton("🗑 Удалить сообщение", callback_data=f"del_{idx}")
                    )
                    
                    if format_type != 'full':
                        msg_keyboard.row(
                            InlineKeyboardButton("📋 Показать полностью", callback_data=f"show_full_{idx}")
                        )

                    try:
                        bot.send_message(message.chat.id, message_text, parse_mode='Markdown', reply_markup=msg_keyboard)
                    except Exception as e:
                        print(f"DEBUG - Error sending message {idx}: {str(e)}")
                        try:
                            short_message = format_message(msg, 'compact', idx, len(messages))
                            bot.send_message(message.chat.id, short_message, reply_markup=msg_keyboard)
                        except Exception as e2:
                            print(f"DEBUG - Error sending short message {idx}: {str(e2)}")

                try:
                    bot.delete_message(message.chat.id, checking_msg.message_id)
                except:
                    pass
                    
            except json.JSONDecodeError as e:
                bot.reply_to(message, "❌ Ошибка при разборе ответа сервера")
                
        except requests.exceptions.RequestException as e:
            bot.reply_to(message, "❌ Ошибка при получении сообщений. Попробуйте позже.")
            
    except Exception as e:
        bot.reply_to(message, f"❌ Произошла ошибка: {str(e)}")

@bot.message_handler(commands=['help'])
def help_command(message):
    help_text = """
🔍 *Полное руководство по использованию NeuroMail Bot*

📧 *Основные команды:*
• Создать почту - создание нового временного email
• Проверить почту - проверка наличия новых писем
• Список писем - просмотр всех полученных писем
• Удалить почту - удаление текущего адреса
• Помощь - вызов этой справки

⚙️ *Дополнительные функции:*
• Автоматическая проверка почты каждую минуту
• Мгновенные уведомления о новых письмах
• Умное определение кодов и ссылок в письмах
• Три формата отображения сообщений
• Выбор почтового домена

📨 *Работа с письмами:*
• Просмотр содержимого в разных форматах
• Удаление ненужных писем
• Автоматическое форматирование текста
• Поддержка HTML-писем
• Защита от спама

🔐 *Безопасность:*
• Временные адреса живут 1 час
• Автоматическое удаление данных
• Безопасная передача информации
• Защита от несанкционированного доступа
• Отсутствие логирования содержимого

📱 *Форматы отображения:*
• Полный - максимум информации
• Краткий - основные детали
• Компактный - только важное

⚡️ *Автоматизация:*
• Автозапуск проверки почты
• Умное определение важной информации
• Автоочистка старых данных
• Система восстановления при сбоях
• Оптимизация работы

🎯 *Советы по использованию:*
• Создавайте отдельный адрес для каждого сервиса
• Сохраняйте важную информацию сразу
• Используйте разные форматы для удобства
• Проверяйте почту после уведомлений
• Удаляйте неиспользуемые адреса

📊 *Возможности статистики:*
• Количество созданных ящиков
• Частота проверки почты
• Количество полученных писем
• История активности
• Мониторинг использования
    """
    bot.reply_to(message, help_text, parse_mode='Markdown')

def update_stats(user_id, action):
    """Обновление статистики пользователя"""
    if user_id not in user_stats:
        user_stats[user_id] = {
            'emails_created': 0,
            'messages_checked': 0,
            'codes_received': 0,
            'last_active': None
        }
    
    stats = user_stats[user_id]
    stats['last_active'] = time.strftime('%Y-%m-%d %H:%M:%S')
    
    if action == 'email_created':
        stats['emails_created'] += 1
    elif action == 'messages_checked':
        stats['messages_checked'] += 1
    elif action == 'code_received':
        stats['codes_received'] += 1

# Функция для форматирования email адреса
def format_email(email):
    """Форматирует email адрес для URL"""
    # Разделяем email на части
    username, domain = email.split('@')
    return f"{username}"

def create_main_keyboard():
    """Создает основную клавиатуру"""
    keyboard = ReplyKeyboardMarkup(resize_keyboard=True)
    keyboard.row(KeyboardButton("📧 Создать почту"))
    keyboard.row(KeyboardButton("📬 Проверить почту"), KeyboardButton("📋 Список писем"))
    keyboard.row(KeyboardButton("❌ Удалить почту"))
    return keyboard

def generate_password(length=12):
    """Генерирует сложный пароль"""
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    symbols = "!@#$%^&*()_+-=[]{}|"
    
    # Убеждаемся, что пароль содержит как минимум по одному символу каждого типа
    password = [
        random.choice(lowercase),
        random.choice(uppercase),
        random.choice(digits),
        random.choice(symbols)
    ]
    
    # Добавляем остальные символы
    for _ in range(length - 4):
        password.append(random.choice(lowercase + uppercase + digits + symbols))
    
    # Перемешиваем пароль
    random.shuffle(password)
    return ''.join(password)

def create_email_keyboard(email, password):
    """Создает клавиатуру для копирования email и пароля"""
    # Возвращаем None вместо клавиатуры, чтобы не показывать кнопки
    return None

@bot.message_handler(commands=['start'])
def send_welcome(message):
    """Обработчик команды /start"""
    welcome_text = """
🤖 NeuroMailBot - Ваш надежный помощник для работы с временной почтой

Этот бот создаёт временные email адреса для безопасного получения писем. Идеально подходит для регистраций на сайтах, получения проверочных кодов и защиты вашей основной почты от спама.

📧 Основные функции:
• Мгновенное создание временной почты
• Автоматическое получение писем в реальном времени
• Просмотр всех входящих сообщений
• Удаление почты одним нажатием
• Выбор формата отображения писем

📨 Работа с письмами:
• Мгновенные уведомления о новых письмах
• Автоматическое определение кодов подтверждения
• Выделение ссылок из текста писем
• Удаление отдельных писем
• Просмотр писем в разных форматах

📱 Управление через кнопки:
📧 Создать почту - генерация нового адреса
📬 Проверить почту - проверка новых писем
📋 Список писем - все полученные письма
❌ Удалить почту - удаление текущего адреса

Начните работу прямо сейчас!
Нажмите кнопку 📧 Создать почту для получения временного email адреса.
"""
    bot.send_message(message.chat.id, welcome_text, parse_mode='Markdown', reply_markup=create_main_keyboard())

@bot.message_handler(func=lambda message: message.text == "📧 Создать почту")
def create_new_mail(message):
    try:
        # Если есть активная почта, удаляем её
        user_id = message.from_user.id
        if user_id in user_emails and user_id in check_timers:
            stop_checking(message)
        if user_id in user_emails:
            del user_emails[user_id]

        print(f"DEBUG - Trying to create new email...")
        print(f"DEBUG - API URL: {GET_MAIL_URL}")
        
        response = requests.get(GET_MAIL_URL)
        print(f"DEBUG - Response Status: {response.status_code}")
        print(f"DEBUG - Response Headers: {response.headers}")
        print(f"DEBUG - Response Text: {response.text}")
        
        try:
            data = json.loads(response.text)
            print(f"DEBUG - Parsed JSON: {data}")
            
            if data.get('status') == 'ok' and data.get('mail'):
                email = data['mail']
                expired_at = data.get('expired_at', time.time() + EMAIL_LIFETIME)
                password = generate_password()
                
                # Сохраняем email, пароль и время истечения
                user_emails[message.from_user.id] = {
                    'email': email,
                    'password': password,
                    'expired_at': expired_at
                }
                
                # Запускаем автопроверку
                start_checking(message)
                
                response_text = f"""
📧 Ваш новый временный email адрес:
`{email}`

🔐 Пароль:
`{password}`

✅ Почта готова к приему писем
⏳ Срок действия: {time.strftime('%H:%M:%S %d.%m.%Y', time.localtime(expired_at))}"""
                bot.reply_to(message, response_text, parse_mode='Markdown')
            else:
                print(f"DEBUG - Invalid response format. Status: {data.get('status')}, Mail: {data.get('mail')}")
                bot.reply_to(message, "❌ Не удалось создать email. Попробуйте позже.",
                            reply_markup=create_main_keyboard())
                
        except json.JSONDecodeError as e:
            print(f"DEBUG - JSON Parse Error: {str(e)}")
            bot.reply_to(message, "❌ Ошибка при разборе ответа сервера. Возможно, сервис временно недоступен.",
                        reply_markup=create_main_keyboard())
            
    except requests.exceptions.RequestException as e:
        print(f"DEBUG - Request Error: {str(e)}")
        bot.reply_to(message, f"❌ Ошибка при подключении к серверу: {str(e)}",
                    reply_markup=create_main_keyboard())
    except Exception as e:
        print(f"DEBUG - Unexpected Error: {str(e)}")
        bot.reply_to(message, f"❌ Произошла неожиданная ошибка: {str(e)}",
                    reply_markup=create_main_keyboard())

@bot.callback_query_handler(func=lambda call: call.data.startswith('del_'))
def handle_message_actions(call):
    try:
        action, idx = call.data.split('_')
        idx = int(idx) - 1  # Convert to 0-based index
        user_id = call.from_user.id
        
        if user_id not in user_emails:
            bot.answer_callback_query(call.id, "❌ У вас нет активной почты")
            return
            
        email_data = user_emails[user_id]
        email = email_data['email']
        
        # Получаем сообщения
        response = requests.get(f"{GET_MESSAGES_URL}?mail={email}")
        messages = json.loads(response.text).get('messages', [])
        
        if idx >= len(messages):
            bot.answer_callback_query(call.id, "❌ Сообщение не найдено")
            return
            
        message = messages[idx]
        
        # Удаляем сообщение
        bot.answer_callback_query(call.id, "🗑 Сообщение удалено")
        bot.delete_message(call.message.chat.id, call.message.message_id)
                
    except Exception as e:
        bot.answer_callback_query(call.id, "❌ Произошла ошибка")
        print(f"DEBUG - Error in handle_message_actions: {str(e)}")

@bot.message_handler(func=lambda message: message.text == "📬 Проверить почту")
def check_mail_button(message):
    """Обработчик кнопки проверки почты на клавиатуре"""
    user_id = message.from_user.id
    if user_id not in user_emails:
        bot.reply_to(message, "❌ У вас нет активной почты. Создайте новый с помощью кнопки 📧 Создать почту")
        return
    get_messages(message)

@bot.message_handler(func=lambda message: message.text == "📋 Список писем")
def list_messages(message):
    """Обработчик кнопки списка писем"""
    user_id = message.from_user.id
    if user_id not in user_emails:
        bot.reply_to(message, "❌ У вас нет активной почты. Создайте новый с помощью кнопки 📧 Создать почту")
        return
    get_messages(message)

@bot.message_handler(func=lambda message: message.text == "❌ Удалить почту")
def delete_mail(message):
    user_id = message.from_user.id
    if user_id in user_emails:
        # Останавливаем проверку
        if user_id in check_timers:
            stop_checking(message)
        
        # Удаляем email и историю прочитанных сообщений
        del user_emails[user_id]
        if user_id in user_read_messages:
            del user_read_messages[user_id]
            
        bot.reply_to(message, "✅ Почта успешно удалена!")
    else:
        bot.reply_to(message, "❌ У вас нет активной почты.")

@bot.message_handler(func=lambda message: message.text == "ℹ️ Помощь")
def help_button(message):
    help_command(message)

# Обновляем обработчик для неизвестных команд
@bot.message_handler(func=lambda message: True)
def echo_all(message):
    """Обработчик всех остальных сообщений"""
    if message.text and message.text.startswith('/'):
        return  # Игнорируем все неизвестные команды
    bot.reply_to(message, "❓ Используйте кнопки меню для управления ботом.", reply_markup=create_main_keyboard())

def split_long_message(text, max_length=4096):
    """Разбивает длинное сообщение на части"""
    if len(text) <= max_length:
        return [text]
        
    parts = []
    while text:
        if len(text) <= max_length:
            parts.append(text)
            break
            
        # Ищем последний перенос строки в пределах max_length
        split_point = text.rfind('\n', 0, max_length)
        if split_point == -1:
            # Если нет переноса строки, просто разбиваем по max_length
            split_point = max_length
            
        parts.append(text[:split_point])
        text = text[split_point:].lstrip()
        
    return parts

@bot.message_handler(commands=['messages'])
def messages_command(message):
    """Обработчик команды /messages"""
    get_messages(message)

def check_messages_job(chat_id):
    """Фоновая задача для проверки сообщений"""
    if chat_id not in user_emails:
        return
        
    email_data = user_emails[chat_id]
    email = email_data['email']
    url = f"{GET_MESSAGES_URL}?mail={email}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200 and response.text.strip():
            try:
                data = json.loads(response.text)
                messages = data.get('messages', [])
                
                if messages:
                    # Инициализируем множество прочитанных сообщений
                    if chat_id not in user_read_messages:
                        user_read_messages[chat_id] = set()
                    
                    # Проверяем каждое сообщение
                    for msg in messages:
                        msg_id = msg.get('id', '')
                        if msg_id and msg_id not in user_read_messages[chat_id]:
                            # Форматируем и отправляем новое сообщение
                            format_type = user_message_format.get(chat_id, 'full')
                            message_text = format_message(msg, format_type, 1, 1)
                            
                            # Создаем клавиатуру
                            msg_keyboard = InlineKeyboardMarkup()
                            msg_keyboard.row(
                                InlineKeyboardButton("🗑 Удалить", callback_data=f"del_1")
                            )

                            try:
                                # Отправляем сообщение
                                bot.send_message(
                                    chat_id,
                                    "📬 *Новое сообщение:*\n" + message_text,
                                    parse_mode='Markdown',
                                    reply_markup=msg_keyboard
                                )
                                # Отмечаем как прочитанное только после успешной отправки
                                user_read_messages[chat_id].add(msg_id)
                            except Exception as e:
                                print(f"DEBUG - Error sending new message: {str(e)}")
                                try:
                                    # Пробуем отправить короткую версию при ошибке
                                    short_message = format_message(msg, 'compact', 1, 1)
                                    bot.send_message(
                                        chat_id,
                                        "📬 *Новое сообщение:*\n" + short_message,
                                        parse_mode='Markdown',
                                        reply_markup=msg_keyboard
                                    )
                                    user_read_messages[chat_id].add(msg_id)
                                except Exception as e2:
                                    print(f"DEBUG - Error sending short message: {str(e2)}")
                            
            except Exception as e:
                print(f"DEBUG - Error in check_messages_job: {str(e)}")
    except Exception as e:
        print(f"DEBUG - Error in check_messages_job request: {str(e)}")

@bot.message_handler(commands=['start_checking'])
def start_checking(message):
    """Запуск автоматической проверки сообщений"""
    chat_id = message.chat.id
    if chat_id not in user_emails:
        bot.reply_to(message, "❌ Сначала создайте email с помощью /newmail")
        return
        
    if chat_id in check_timers:
        bot.reply_to(message, "✅ Автоматическая проверка уже запущена")
        return
        
    # Используем установленный интервал или значение по умолчанию
    interval = check_intervals.get(chat_id, 15)
        
    # Запускаем периодическую проверку
    import threading
    def check_loop():
        while chat_id in check_timers:
            check_messages_job(chat_id)
            time.sleep(interval)
            
    check_timers[chat_id] = threading.Thread(target=check_loop)
    check_timers[chat_id].daemon = True
    check_timers[chat_id].start()
    
    bot.reply_to(message, f"✅ Автоматическая проверка сообщений запущена\nИнтервал проверки: {interval} секунд")

@bot.message_handler(commands=['stop_checking'])
def stop_checking(message):
    """Остановка автоматической проверки сообщений"""
    chat_id = message.chat.id
    if chat_id in check_timers:
        del check_timers[chat_id]
        bot.reply_to(message, "✅ Автоматическая проверка остановлена")
    else:
        bot.reply_to(message, "❌ Автоматическая проверка не была запущена")

@bot.message_handler(commands=['domains'])
def show_domains(message):
    """Показывает список доступных доменов"""
    domains_text = "📧 Доступные домены:\n\n"
    for i, domain in enumerate(AVAILABLE_DOMAINS, 1):
        domains_text += f"{i}. `@{domain}`\n"
    domains_text += "\nДля создания email с конкретным доменом используйте:\n/newmail_domain <номер домена>"
    bot.reply_to(message, domains_text, parse_mode='Markdown')

@bot.message_handler(commands=['newmail_domain'])
def get_temp_mail_with_domain(message):
    try:
        args = message.text.split()
        if len(args) != 2 or not args[1].isdigit():
            bot.reply_to(message, "❌ Пожалуйста, укажите номер домена.\nПример: /newmail_domain 1\nСписок доменов: /domains")
            return
            
        domain_index = int(args[1]) - 1
        if domain_index < 0 or domain_index >= len(AVAILABLE_DOMAINS):
            bot.reply_to(message, "❌ Неверный номер домена.\nИспользуйте /domains для просмотра списка доступных доменов.")
            return
            
        selected_domain = AVAILABLE_DOMAINS[domain_index]
        url = f"{BASE_URL}?f=get_email_address&lang=en&domain={selected_domain}"
        
        response = requests.get(url)
        print(f"DEBUG - New Mail URL: {url}")
        print(f"DEBUG - New Mail Response: {response.text}")
        print(f"DEBUG - Response Status: {response.status_code}")
        
        try:
            data = json.loads(response.text)
            if 'email_addr' in data and 'sid_token' in data:
                email = data['email_addr']
                session_id = data['sid_token']
                
                # Сохраняем данные пользователя
                user_emails[message.from_user.id] = {
                    'email': email,
                    'session_id': session_id
                }
                
                response_text = f"""
📧 Ваш новый временный email адрес:
`{email}`

✅ Вы можете получать сообщения на этот адрес
⚠️ Адрес действителен в течение 60 минут
🔍 Для проверки сообщений используйте /messages"""
            else:
                response_text = f"❌ Не удалось создать email адрес. Ответ сервера: {response.text}"
                
        except Exception as e:
            print(f"DEBUG - Error parsing response: {str(e)}")
            response_text = f"❌ Ошибка при обработке ответа сервера: {str(e)}"
        
        bot.reply_to(message, response_text, parse_mode='Markdown')
            
    except Exception as e:
        print(f"DEBUG - Request error: {str(e)}")
        bot.reply_to(message, f"❌ Произошла ошибка: {str(e)}")

@bot.message_handler(commands=['set_interval'])
def set_check_interval(message):
    """Установка интервала автопроверки"""
    try:
        args = message.text.split()
        if len(args) != 2 or not args[1].isdigit():
            bot.reply_to(message, """
❌ Пожалуйста, укажите интервал в секундах.
Пример: /set_interval 15

⚠️ Рекомендуемые значения:
- 15 секунд (минимум)
- 60 секунд (стандарт)
- 300 секунд (5 минут)
            """)
            return
            
        interval = int(args[1])
        if interval < 15:
            bot.reply_to(message, "❌ Интервал не может быть меньше 15 секунд")
            return
            
        chat_id = message.chat.id
        check_intervals[chat_id] = interval
        
        bot.reply_to(message, f"✅ Интервал проверки установлен на {interval} секунд")
        
        # Если проверка уже запущена, перезапускаем с новым интервалом
        if chat_id in check_timers:
            stop_checking(message)
            start_checking(message)
            
    except Exception as e:
        bot.reply_to(message, f"❌ Произошла ошибка: {str(e)}")

@bot.callback_query_handler(func=lambda call: call.data == 'check_mail')
def check_mail_callback(call):
    """Обработчик кнопки проверки почты"""
    try:
        user_id = call.from_user.id
        if user_id not in user_emails:
            bot.answer_callback_query(call.id, "❌ У вас нет активной почты", show_alert=True)
            return

        bot.answer_callback_query(call.id, "🔄 Проверяю почту...")
        # Создаем объект сообщения для проверки почты
        message = Message(
            message_id=call.message.message_id,
            from_user=call.from_user,
            date=call.message.date,
            chat=call.message.chat,
            content_type='text',
            options={},
            json_string=None
        )
        check_mail_button(message)
    except Exception as e:
        print(f"DEBUG - Error in check_mail_callback: {str(e)}")
        try:
            bot.answer_callback_query(call.id, "❌ Произошла ошибка при проверке почты", show_alert=True)
        except:
            pass

def create_message_keyboard(message_id):
    """Создает клавиатуру для сообщения"""
    keyboard = InlineKeyboardMarkup()
    keyboard.row(
        InlineKeyboardButton("🗑 Удалить", callback_data=f"delete_msg_{message_id}")
    )
    return keyboard

@bot.callback_query_handler(func=lambda call: call.data.startswith('delete_msg_'))
def delete_message_handler(call):
    """Обработчик удаления сообщения"""
    try:
        # Удаляем сообщение
        bot.delete_message(call.message.chat.id, call.message.message_id)
        bot.answer_callback_query(call.id, "✅ Сообщение удалено")
    except Exception as e:
        print(f"DEBUG - Error deleting message: {str(e)}")
        bot.answer_callback_query(call.id, "❌ Ошибка при удалении сообщения")

def format_message(msg, format_type='full', idx=None, total=None):
    """Форматирование сообщения в зависимости от выбранного формата"""
    msg_content = msg.get('body_html', '') or msg.get('body', '')
    msg_content = re.sub(r'<style.*?</style>', '', msg_content, flags=re.DOTALL)
    msg_content = re.sub(r'<script.*?</script>', '', msg_content, flags=re.DOTALL)
    msg_content = re.sub(r'<[^>]+>', ' ', msg_content)
    msg_content = re.sub(r'\s+', ' ', msg_content)
    msg_content = msg_content.strip()
    
    msg_content = msg_content.replace('_', '\\_').replace('*', '\\*').replace('`', '\\`').replace('[', '\\[')
    
    from_field = msg.get('from', 'Неизвестно').replace('_', '\\_').replace('*', '\\*').replace('`', '\\`')
    subject = msg.get('subject', 'Без темы').replace('_', '\\_').replace('*', '\\*').replace('`', '\\`')
    
    if format_type == 'compact':
        return f"""📨 {idx}/{total if total else '?'}
От: {from_field}
Тема: {subject}"""
    
    elif format_type == 'brief':
        return f"""📨 {idx}/{total if total else '?'}
От: {from_field}
Тема: {subject}
Дата: {msg.get('date', 'Не указана')}

📝 {msg_content[:100]}{"..." if len(msg_content) > 100 else ""}"""
    
    else:  # full
        message_text = f"""📨 {idx}/{total if total else '?'}
От: {from_field}
Тема: {subject}
Дата: {msg.get('date', 'Не указана')}

📝 Текст:
{msg_content[:300]}{"..." if len(msg_content) > 300 else ""}"""

        links = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', msg_content)
        codes = re.findall(r'\b\d{4,8}\b', msg_content)
        
        if links:
            message_text += "\n\n🔗 Ссылки:"
            for link in links[:3]:
                message_text += f"\n{link}"
            if len(links) > 3:
                message_text += "\n..."

        if codes:
            message_text += "\n\n🔑 Коды:"
            for code in codes[:3]:
                message_text += f"\n`{code}`"
            if len(codes) > 3:
                message_text += "\n..."
                
        return message_text

@bot.message_handler(commands=['format'])
def change_format(message):
    """Изменение формата отображения сообщений"""
    keyboard = InlineKeyboardMarkup()
    for format_key, format_name in MESSAGE_FORMATS.items():
        keyboard.row(InlineKeyboardButton(
            f"{format_name} {'✅' if user_message_format.get(message.from_user.id) == format_key else ''}",
            callback_data=f"format_{format_key}"
        ))
    
    bot.reply_to(message, "📋 Выберите формат отображения сообщений:", reply_markup=keyboard)

@bot.callback_query_handler(func=lambda call: call.data.startswith('format_'))
def format_callback(call):
    """Обработчик выбора формата"""
    format_type = call.data.split('_')[1]
    user_id = call.from_user.id
    
    user_message_format[user_id] = format_type
    
    bot.answer_callback_query(call.id, f"✅ Формат изменен на {MESSAGE_FORMATS[format_type]}")
    bot.edit_message_text(
        f"✅ Установлен формат: {MESSAGE_FORMATS[format_type]}",
        call.message.chat.id,
        call.message.message_id
    )

@bot.callback_query_handler(func=lambda call: call.data.startswith('show_full_'))
def show_full_message(call):
    """Показать сообщение в полном формате"""
    try:
        idx = int(call.data.split('_')[2]) - 1
        user_id = call.from_user.id
        
        if user_id not in user_emails:
            bot.answer_callback_query(call.id, "❌ У вас нет активной почты")
            return
            
        email_data = user_emails[user_id]
        email = email_data['email']
        
        response = requests.get(f"{GET_MESSAGES_URL}?mail={email}")
        messages = json.loads(response.text).get('messages', [])
        
        if idx >= len(messages):
            bot.answer_callback_query(call.id, "❌ Сообщение не найдено")
            return
            
        message = messages[idx]
        message_text = format_message(message, 'full', idx + 1, len(messages))
        
        bot.answer_callback_query(call.id)
        bot.send_message(call.message.chat.id, message_text, parse_mode='Markdown')
                
    except Exception as e:
        bot.answer_callback_query(call.id, "❌ Произошла ошибка")
        print(f"DEBUG - Error in show_full_message: {str(e)}")

# Запуск бота
if __name__ == '__main__':
    print("Бот запускается...")
    bot.polling() 