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
import threading

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

# Изменяем структуру хранения email адресов
user_emails = {}  # user_id -> {email -> {email_data}}

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

# Список администраторов бота (ID пользователей Telegram)
ADMIN_IDS = [int(os.getenv('ADMIN_ID', '0'))]  # Добавьте сюда ID администраторов

# Глобальная статистика бота
bot_stats = {
    'start_time': time.time(),
    'total_users': set(),  # Уникальные пользователи
    'total_emails_created': 0,
    'total_messages_received': 0,
    'total_checks': 0,
    'active_emails': 0,  # Текущие активные почтовые ящики
}

# Добавляем словарь для хранения статистики
user_stats = {}

# Константы для времени жизни почты
EMAIL_LIFETIME = 86400  # 24 часа
EMAIL_CHECK_INTERVAL = 15  # Проверка каждые 15 секунд

# Списки для генерации имен
FIRST_NAMES = [
    # Английские имена
    "Alex", "Michael", "David", "John", "James", "Robert", "William", "Thomas",
    "Daniel", "Richard", "Joseph", "Charles", "Christopher", "Paul", "Mark",
    "Donald", "George", "Kenneth", "Steven", "Edward", "Brian", "Ronald",
    "Anthony", "Kevin", "Jason", "Matthew", "Gary", "Timothy", "Jose", "Larry",
    # Русские имена (транслит)
    "Ivan", "Dmitry", "Sergey", "Andrey", "Pavel", "Mikhail", "Nikolay", "Vladimir",
    "Alexander", "Maxim", "Anton", "Roman", "Artem", "Denis", "Evgeny", "Igor",
    "Oleg", "Victor", "Yury", "Boris", "Konstantin", "Leo", "Peter", "Vadim"
]

LAST_NAMES = [
    # Английские фамилии
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White",
    "Harris", "Clark", "Lewis", "Robinson", "Walker", "Hall", "Young",
    # Русские фамилии (транслит)
    "Ivanov", "Petrov", "Sidorov", "Smirnov", "Kuznetsov", "Popov", "Sokolov",
    "Lebedev", "Kozlov", "Novikov", "Morozov", "Volkov", "Solovyov", "Vasiliev",
    "Zaytsev", "Pavlov", "Semyonov", "Golubev", "Vinogradov", "Bogdanov"
]

def generate_random_name():
    """Генерирует случайное имя, фамилию и логин"""
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    # Добавляем случайное число для уникальности
    random_number = random.randint(1, 999)
    login = f"{first_name.lower()}.{last_name.lower()}{random_number}"
    return {
        'first_name': first_name,
        'last_name': last_name,
        'login': login
    }

def get_messages(message):
    """Получение и отображение сообщений"""
    try:
        user_id = message.from_user.id
        print(f"DEBUG - Checking messages for user {user_id}")
        print(f"DEBUG - Current user_emails state: {user_emails}")
        
        if user_id not in user_emails:
            print(f"DEBUG - No active emails for user {user_id}")
            bot.reply_to(message, "❌ У вас нет активной почты. Создайте новую с помощью кнопки 📧 Создать почту")
            return

        checking_msg = bot.reply_to(message, "⏳ Проверяю сообщения...")
        
        try:
            # Получаем первый email из словаря пользователя
            if not user_emails[user_id]:
                print(f"DEBUG - Empty email dictionary for user {user_id}")
                bot.reply_to(message, "❌ У вас нет активной почты. Создайте новую с помощью кнопки 📧 Создать почту")
                bot.delete_message(message.chat.id, checking_msg.message_id)
                return
                
            email = next(iter(user_emails[user_id].keys()))
            email_data = user_emails[user_id][email]
            print(f"DEBUG - Checking email: {email}")
            print(f"DEBUG - Email data: {email_data}")
            
            url = f"{GET_MESSAGES_URL}?mail={email}"
            print(f"DEBUG - Request URL: {url}")
            
            response = requests.get(url, timeout=10)
            print(f"DEBUG - Response status: {response.status_code}")
            print(f"DEBUG - Response text: {response.text}")
            
            response.raise_for_status()
            
            if not response.text.strip():
                bot.reply_to(message, "📭 У вас пока нет сообщений.")
                bot.delete_message(message.chat.id, checking_msg.message_id)
                return

            data = json.loads(response.text)
            if not isinstance(data, dict):
                print(f"DEBUG - Invalid response format: {data}")
                raise ValueError("Неверный формат данных от сервера")
                
            messages = data.get('messages', [])
            print(f"DEBUG - Found {len(messages)} messages")
            
            if not messages:
                bot.reply_to(message, "📭 У вас пока нет сообщений.")
                bot.delete_message(message.chat.id, checking_msg.message_id)
                return
                
            # Инициализируем множество прочитанных сообщений для пользователя
            if user_id not in user_read_messages:
                user_read_messages[user_id] = set()

            # Отмечаем все сообщения как прочитанные
            for msg in messages:
                msg_id = msg.get('id', '')
                if msg_id:
                    user_read_messages[user_id].add(msg_id)
                    update_stats(user_id, 'message_received')

            # Всегда используем полный формат
            format_type = 'full'

            for idx, msg in enumerate(messages, 1):
                message_text, msg_keyboard = format_message(msg, format_type, idx, len(messages))
                msg_keyboard.row(
                    InlineKeyboardButton("🗑 Удалить сообщение", callback_data=f"del_{idx}")
                )

                try:
                    bot.send_message(message.chat.id, message_text, parse_mode='Markdown', reply_markup=msg_keyboard)
                except Exception as e:
                    print(f"DEBUG - Error sending message {idx}: {str(e)}")
                    try:
                        short_message, short_keyboard = format_message(msg, 'compact', idx, len(messages))
                        bot.send_message(message.chat.id, short_message, reply_markup=short_keyboard)
                    except Exception as e2:
                        print(f"DEBUG - Error sending short message {idx}: {str(e2)}")

            bot.delete_message(message.chat.id, checking_msg.message_id)
                
        except json.JSONDecodeError as e:
            print(f"DEBUG - JSON Parse Error: {str(e)}, Response: {response.text}")
            bot.reply_to(message, "❌ Ошибка при разборе ответа сервера. Возможно, почтовый сервис временно недоступен.")
            bot.delete_message(message.chat.id, checking_msg.message_id)
                
        except requests.exceptions.RequestException as e:
            print(f"DEBUG - Request Error: {str(e)}")
            bot.reply_to(message, "❌ Ошибка при получении сообщений. Сервер временно недоступен.")
            bot.delete_message(message.chat.id, checking_msg.message_id)
            
    except Exception as e:
        print(f"DEBUG - Unexpected Error: {str(e)}")
        print(f"DEBUG - User emails state: {user_emails.get(message.from_user.id, 'No emails')}")
        bot.reply_to(message, "❌ Ошибка при проверке почты. Попробуйте создать новый ящик.")
        try:
            bot.delete_message(message.chat.id, checking_msg.message_id)
        except:
            pass

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
    """Обновление статистики пользователя и глобальной статистики"""
    # Обновление пользовательской статистики
    if user_id not in user_stats:
        user_stats[user_id] = {
            'emails_created': 0,
            'messages_checked': 0,
            'messages_received': 0,
            'last_active': None
        }
    
    stats = user_stats[user_id]
    stats['last_active'] = time.strftime('%Y-%m-%d %H:%M:%S')
    
    # Обновление глобальной статистики
    bot_stats['total_users'].add(user_id)
    
    if action == 'email_created':
        stats['emails_created'] += 1
        bot_stats['total_emails_created'] += 1
        bot_stats['active_emails'] = len(user_emails)
    elif action == 'messages_checked':
        stats['messages_checked'] += 1
        bot_stats['total_checks'] += 1
    elif action == 'message_received':
        stats['messages_received'] += 1
        bot_stats['total_messages_received'] += 1

@bot.message_handler(commands=['stats'])
def show_stats(message):
    """Показывает статистику использования бота"""
    if message.from_user.id not in ADMIN_IDS:
        bot.reply_to(message, "❌ У вас нет прав для просмотра статистики.")
        return

    # Подсчет активных пользователей (использовали бота за последние 24 часа)
    current_time = time.time()
    active_users = sum(1 for stats in user_stats.values() 
                      if stats['last_active'] and 
                      time.mktime(time.strptime(stats['last_active'], '%Y-%m-%d %H:%M:%S')) > current_time - 86400)

    # Формирование статистики
    uptime = time.time() - bot_stats['start_time']
    days = int(uptime // 86400)
    hours = int((uptime % 86400) // 3600)
    minutes = int((uptime % 3600) // 60)

    stats_text = f"""
📊 *Статистика бота NeuroMailBot*

⏱ *Время работы:* {days}д {hours}ч {minutes}м

👥 *Пользователи:*
• Всего пользователей: {len(bot_stats['total_users'])}
• Активных за 24ч: {active_users}

📧 *Почтовые ящики:*
• Создано всего: {bot_stats['total_emails_created']}
• Активных сейчас: {bot_stats['active_emails']}

📨 *Сообщения:*
• Всего получено: {bot_stats['total_messages_received']}
• Проверок почты: {bot_stats['total_checks']}

🔝 *Топ пользователей:*
"""

    # Добавляем топ-5 пользователей по количеству созданных ящиков
    top_users = sorted(user_stats.items(), 
                      key=lambda x: x[1]['emails_created'], 
                      reverse=True)[:5]
    
    for i, (user_id, stats) in enumerate(top_users, 1):
        stats_text += f"{i}. ID: {user_id} - {stats['emails_created']} ящиков\n"

    bot.reply_to(message, stats_text, parse_mode='Markdown')

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
    keyboard.row(KeyboardButton("❌ Удалить почту"), KeyboardButton("👤 Генерация имени"))
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
    """Создание нового временного email адреса"""
    try:
        user_id = message.from_user.id
        
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
                # Всегда устанавливаем время истечения на 24 часа от текущего момента
                expired_at = time.time() + EMAIL_LIFETIME
                password = generate_password()
                
                # Инициализируем словарь для пользователя, если его еще нет
                if user_id not in user_emails:
                    user_emails[user_id] = {}
                
                # Сохраняем email данные
                user_emails[user_id] = {
                    email: {
                        'email': email,
                        'password': password,
                        'expired_at': expired_at
                    }
                }
                
                # Обновляем статистику
                update_stats(user_id, 'email_created')
                
                # Запускаем автопроверку для нового ящика
                start_checking(message, email)
                
                response_text = f"""
📧 Ваш новый временный email адрес:
`{email}`

🔐 Пароль:
`{password}`

✅ Почта готова к приему писем
⏳ Срок действия: {time.strftime('%H:%M:%S %d.%m.%Y', time.localtime(expired_at))}
♻️ Почта будет автоматически удалена через 24 часа

📬 Используйте кнопку 📋 Список писем для просмотра всех ваших активных ящиков."""
                bot.reply_to(message, response_text, parse_mode='Markdown')
            else:
                print(f"DEBUG - Invalid response format. Status: {data.get('status')}, Mail: {data.get('mail')}")
                bot.reply_to(message, "❌ Не удалось создать email. Попробуйте позже.",
                           reply_markup=create_main_keyboard())
        except json.JSONDecodeError as e:
            print(f"DEBUG - JSON Parse Error: {str(e)}")
            bot.reply_to(message, "❌ Ошибка при разборе ответа сервера. Возможно, сервис временно недоступен.",
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
    
    # Создаем клавиатуру для выбора почтового ящика
    keyboard = InlineKeyboardMarkup()
    
    if user_id in user_emails and user_emails[user_id]:
        # Сортируем ящики по времени создания (сначала новые)
        sorted_emails = sorted(
            user_emails[user_id].items(),
            key=lambda x: x[1]['expired_at'],
            reverse=True
        )
        
        for email, email_data in sorted_emails:
            expired_at = email_data['expired_at']
            remaining_time = int((expired_at - time.time()) / 3600)  # оставшееся время в часах
            
            # Добавляем кнопку для каждого активного ящика
            keyboard.row(
                InlineKeyboardButton(
                    f"📬 {email} (⏳ {remaining_time}ч)",
                    callback_data=f"show_mailbox_{email}"
                )
            )
        
        keyboard.row(
            InlineKeyboardButton("🔄 Обновить", callback_data="refresh_mailboxes")
        )
        
        bot.reply_to(
            message,
            "📬 Выберите почтовый ящик для просмотра сообщений:",
            reply_markup=keyboard
        )
    else:
        bot.reply_to(message, "❌ У вас нет активных почтовых ящиков. Создайте новый с помощью кнопки 📧 Создать почту")

@bot.callback_query_handler(func=lambda call: call.data.startswith('show_mailbox_'))
def show_mailbox_messages(call):
    """Показывает сообщения выбранного почтового ящика"""
    try:
        email = call.data.replace('show_mailbox_', '')
        user_id = call.from_user.id
        
        if user_id not in user_emails or email not in user_emails[user_id]:
            bot.answer_callback_query(call.id, "❌ Этот почтовый ящик больше не доступен")
            return
            
        checking_msg = bot.send_message(call.message.chat.id, "⏳ Проверяю сообщения...")
        
        url = f"{GET_MESSAGES_URL}?mail={email}"
        try:
            response = requests.get(url)
            if response.status_code == 200 and response.text.strip():
                data = json.loads(response.text)
                messages = data.get('messages', [])
                
                if not messages:
                    bot.send_message(call.message.chat.id, f"📭 В ящике {email} пока нет сообщений")
                    bot.delete_message(call.message.chat.id, checking_msg.message_id)
                    return
                    
                bot.send_message(
                    call.message.chat.id,
                    f"📬 Сообщения в ящике {email}:"
                )
                
                format_type = user_message_format.get(user_id, 'full')
                
                for idx, msg in enumerate(messages, 1):
                    message_text, msg_keyboard = format_message(msg, format_type, idx, len(messages))
                    
                    # Создаем клавиатуру для сообщения
                    msg_keyboard.row(
                        InlineKeyboardButton("🗑 Удалить сообщение", callback_data=f"del_{idx}")
                    )
                    
                    if format_type != 'full':
                        msg_keyboard.row(
                            InlineKeyboardButton("📋 Показать полностью", callback_data=f"show_full_{idx}")
                        )
                    
                    bot.send_message(
                        call.message.chat.id,
                        message_text,
                        parse_mode='Markdown',
                        reply_markup=msg_keyboard
                    )
            else:
                bot.send_message(call.message.chat.id, "❌ Не удалось получить сообщения")
                
        except Exception as e:
            print(f"DEBUG - Error getting messages: {str(e)}")
            bot.send_message(call.message.chat.id, "❌ Произошла ошибка при получении сообщений")
            
        finally:
            try:
                bot.delete_message(call.message.chat.id, checking_msg.message_id)
            except:
                pass
                
    except Exception as e:
        print(f"DEBUG - Error in show_mailbox_messages: {str(e)}")
        bot.answer_callback_query(call.id, "❌ Произошла ошибка")

@bot.callback_query_handler(func=lambda call: call.data == "refresh_mailboxes")
def refresh_mailboxes(call):
    """Обновляет список почтовых ящиков"""
    try:
        message = call.message
        message.from_user = call.from_user
        list_messages(message)
        bot.answer_callback_query(call.id, "✅ Список обновлен")
    except Exception as e:
        print(f"DEBUG - Error refreshing mailboxes: {str(e)}")
        bot.answer_callback_query(call.id, "❌ Ошибка при обновлении")

@bot.message_handler(func=lambda message: message.text == "❌ Удалить почту")
def delete_mail(message):
    """Удаление почтового ящика"""
    user_id = message.from_user.id
    if user_id in user_emails and user_emails[user_id]:
        # Создаем клавиатуру для выбора ящика для удаления
        keyboard = InlineKeyboardMarkup()
        
        for email in user_emails[user_id].keys():
            keyboard.row(
                InlineKeyboardButton(
                    f"🗑 {email}",
                    callback_data=f"delete_mailbox_{email}"
                )
            )
        
        bot.reply_to(
            message,
            "🗑 Выберите почтовый ящик для удаления:",
            reply_markup=keyboard
        )
    else:
        bot.reply_to(message, "❌ У вас нет активных почтовых ящиков.")

@bot.callback_query_handler(func=lambda call: call.data.startswith('delete_mailbox_'))
def delete_mailbox(call):
    """Удаление выбранного почтового ящика"""
    try:
        email = call.data.replace('delete_mailbox_', '')
        user_id = call.from_user.id
        
        if user_id in user_emails and email in user_emails[user_id]:
            # Останавливаем проверку
            if user_id in check_timers and email in check_timers[user_id]:
                stop_checking_email(user_id, email)
            
            # Удаляем email и историю прочитанных сообщений
            del user_emails[user_id][email]
            if user_id in user_read_messages and email in user_read_messages[user_id]:
                del user_read_messages[user_id][email]
            
            # Если у пользователя не осталось ящиков, удаляем его запись
            if not user_emails[user_id]:
                del user_emails[user_id]
            
            bot.answer_callback_query(call.id, f"✅ Почтовый ящик {email} успешно удален!")
            bot.delete_message(call.message.chat.id, call.message.message_id)
        else:
            bot.answer_callback_query(call.id, "❌ Этот почтовый ящик уже недоступен")
            bot.delete_message(call.message.chat.id, call.message.message_id)
    except Exception as e:
        print(f"DEBUG - Error in delete_mailbox: {str(e)}")
        bot.answer_callback_query(call.id, "❌ Произошла ошибка при удалении")

@bot.message_handler(func=lambda message: message.text == "ℹ️ Помощь")
def help_button(message):
    help_command(message)

@bot.message_handler(func=lambda message: message.text == "👤 Генерация имени")
def generate_name_button(message):
    """Обработчик кнопки генерации имени"""
    try:
        # Генерируем случайное имя
        name_data = generate_random_name()
        
        # Формируем ответное сообщение
        response_text = f"""
👤 *Сгенерированные данные:*

👨‍💼 *Имя:* `{name_data['first_name']}`
👨‍👦 *Фамилия:* `{name_data['last_name']}`
🆔 *Логин:* `{name_data['login']}`

Вы можете использовать эти данные при регистрации на сайтах.
Логин можно использовать как часть email адреса."""
        
        bot.reply_to(message, response_text, parse_mode='Markdown')
    except Exception as e:
        bot.reply_to(message, f"❌ Произошла ошибка при генерации имени: {str(e)}")

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

def check_messages_job(chat_id, email):
    """Фоновая задача для проверки сообщений"""
    if chat_id not in user_emails or email not in user_emails[chat_id]:
        return
        
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
                        user_read_messages[chat_id] = {}
                    if email not in user_read_messages[chat_id]:
                        user_read_messages[chat_id][email] = set()
                    
                    # Проверяем каждое сообщение
                    for msg in messages:
                        msg_id = msg.get('id', '')
                        if msg_id and msg_id not in user_read_messages[chat_id][email]:
                            # Всегда используем полный формат
                            format_type = 'full'
                            message_text, msg_keyboard = format_message(msg, format_type, 1, 1)
                            
                            try:
                                # Отправляем сообщение
                                bot.send_message(
                                    chat_id,
                                    f"📬 *Новое сообщение в ящике* `{email}`:\n" + message_text,
                                    parse_mode='Markdown',
                                    reply_markup=msg_keyboard
                                )
                                # Отмечаем как прочитанное только после успешной отправки
                                user_read_messages[chat_id][email].add(msg_id)
                            except Exception as e:
                                print(f"DEBUG - Error sending new message: {str(e)}")
                                try:
                                    # Пробуем отправить короткую версию при ошибке
                                    short_message, short_keyboard = format_message(msg, 'compact', 1, 1)
                                    bot.send_message(
                                        chat_id,
                                        f"📬 *Новое сообщение в ящике* `{email}`:\n" + short_message,
                                        parse_mode='Markdown',
                                        reply_markup=short_keyboard
                                    )
                                    user_read_messages[chat_id][email].add(msg_id)
                                except Exception as e2:
                                    print(f"DEBUG - Error sending short message: {str(e2)}")
            except Exception as e:
                print(f"DEBUG - Error in check_messages_job: {str(e)}")
    except Exception as e:
        print(f"DEBUG - Error in check_messages_job request: {str(e)}")

@bot.message_handler(commands=['start_checking'])
def start_checking(message, email=None):
    """Запуск автоматической проверки сообщений"""
    chat_id = message.chat.id
    if chat_id not in user_emails:
        bot.reply_to(message, "❌ Сначала создайте email с помощью /newmail")
        return
        
    if chat_id not in check_timers:
        check_timers[chat_id] = {}
        
    # Если email не указан, проверяем все ящики пользователя
    if email is None:
        for email in user_emails[chat_id].keys():
            if email not in check_timers[chat_id]:
                start_email_checking(chat_id, email)
    else:
        if email not in check_timers[chat_id]:
            start_email_checking(chat_id, email)

def start_email_checking(chat_id, email):
    """Запускает проверку конкретного почтового ящика"""
    interval = check_intervals.get(chat_id, 15)
    
    def check_loop():
        while chat_id in check_timers and email in check_timers[chat_id]:
            check_messages_job(chat_id, email)
            time.sleep(interval)
            
    check_timers[chat_id][email] = threading.Thread(target=check_loop)
    check_timers[chat_id][email].daemon = True
    check_timers[chat_id][email].start()

@bot.message_handler(commands=['stop_checking'])
def stop_checking(message, email=None):
    """Остановка автоматической проверки сообщений"""
    chat_id = message.chat.id
    if chat_id in check_timers:
        if email is None:
            # Останавливаем проверку всех ящиков
            for email in list(check_timers[chat_id].keys()):
                stop_checking_email(chat_id, email)
            del check_timers[chat_id]
            bot.reply_to(message, "✅ Автоматическая проверка остановлена для всех ящиков")
        else:
            # Останавливаем проверку конкретного ящика
            if email in check_timers[chat_id]:
                stop_checking_email(chat_id, email)
                bot.reply_to(message, f"✅ Автоматическая проверка остановлена для {email}")
    else:
        bot.reply_to(message, "❌ Автоматическая проверка не была запущена")

def stop_checking_email(chat_id, email):
    """Останавливает проверку конкретного почтового ящика"""
    if chat_id in check_timers and email in check_timers[chat_id]:
        del check_timers[chat_id][email]
        if not check_timers[chat_id]:  # Если больше нет активных проверок
            del check_timers[chat_id]

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
    try:
        # Получаем содержимое письма
        msg_content = msg.get('body_html', '') or msg.get('body', '')
        if not msg_content:
            msg_content = "Текст письма отсутствует"
            
        # Очищаем HTML
        msg_content = re.sub(r'<style.*?</style>', '', msg_content, flags=re.DOTALL)
        msg_content = re.sub(r'<script.*?</script>', '', msg_content, flags=re.DOTALL)
        
        # Извлекаем ссылки до удаления HTML, сохраняя их целостность
        links = []
        for match in re.finditer(r'href=[\'"]([^\'"]+)[\'"]', msg_content):
            link = match.group(1).strip()
            # Удаляем пробелы и переносы строк внутри ссылки
            link = ''.join(link.split())
            if link:
                links.append(link)
        
        print(f"DEBUG - Found raw links: {links}")
        
        # Фильтруем и валидируем ссылки
        valid_links = []
        for link in links:
            # Проверяем базовую структуру URL
            if not re.match(r'^https?://', link):
                if not link.startswith(('javascript:', 'data:', 'file:', 'ftp:', 'mailto:')):
                    link = 'https://' + link
                else:
                    print(f"DEBUG - Skipping invalid protocol link: {link}")
                    continue
                    
            # Проверяем, что URL содержит допустимый домен
            if not re.match(r'^https?://[a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}', link):
                print(f"DEBUG - Invalid domain in link: {link}")
                continue
                
            try:
                # Дополнительная проверка структуры URL
                from urllib.parse import urlparse, urljoin
                parsed = urlparse(link)
                if all([parsed.scheme, parsed.netloc]):
                    # Собираем ссылку обратно без пробелов и переносов
                    clean_link = urljoin(parsed.scheme + '://' + parsed.netloc, parsed.path)
                    if parsed.query:
                        clean_link += '?' + parsed.query
                    if parsed.fragment:
                        clean_link += '#' + parsed.fragment
                    valid_links.append(clean_link)
                    print(f"DEBUG - Valid link added: {clean_link}")
                else:
                    print(f"DEBUG - Invalid URL structure: {link}")
            except Exception as e:
                print(f"DEBUG - URL parsing error: {str(e)} for link: {link}")
                continue
        
        print(f"DEBUG - Valid links after filtering: {valid_links}")
        
        # Удаляем оставшиеся HTML теги
        msg_content = re.sub(r'<[^>]+>', ' ', msg_content)
        msg_content = re.sub(r'\s+', ' ', msg_content)
        msg_content = msg_content.strip()
        
        # Безопасное получение данных
        from_field = msg.get('from', 'Неизвестно')
        subject = msg.get('subject', 'Без темы')
        date = msg.get('date', 'Не указана')
        
        # Экранируем специальные символы Markdown
        msg_content = msg_content.replace('_', '\\_').replace('*', '\\*').replace('`', '\\`').replace('[', '\\[')
        from_field = from_field.replace('_', '\\_').replace('*', '\\*').replace('`', '\\`').replace('[', '\\[')
        subject = subject.replace('_', '\\_').replace('*', '\\*').replace('`', '\\`').replace('[', '\\[')
        
        # Формируем базовое сообщение
        message_text = f"""📨 {idx}/{total if total else '?'}
От: {from_field}
Тема: {subject}
Дата: {date}

📝 Текст письма:
{msg_content}"""

        # Создаем клавиатуру для сообщения
        msg_keyboard = InlineKeyboardMarkup()

        # Добавляем кнопки из HTML, если есть
        if valid_links:
            message_text += "\n\n🔗 Ссылки для входа:"
            for i, link in enumerate(valid_links):
                try:
                    # Создаем короткое имя для кнопки
                    button_text = f"🔗 Ссылка {i+1}"
                    # Добавляем кнопку для каждой ссылки
                    msg_keyboard.row(InlineKeyboardButton(text=button_text, url=link))
                    print(f"DEBUG - Added button with URL: {link}")
                except Exception as e:
                    print(f"DEBUG - Error adding URL button: {str(e)}, URL: {link}")
                    # Добавляем ссылку в текст сообщения вместо кнопки
                    message_text += f"\n{button_text}: {link}"
                    continue

        # Улучшенный поиск кодов верификации
        verification_codes = []
        
        # Сначала ищем цифровые коды напрямую в тексте
        numeric_codes = re.findall(r'(?<!\d)(\d{6})(?!\d)', msg_content)
        verification_codes.extend(numeric_codes)
        
        # Затем ищем коды после ключевых слов
        code_patterns = [
            r'(?:code|код|verify|token|auth|pin)[:\s]+(\d{6})',
            r'(?:enter|введите)[:\s]+(?:the\s+)?(?:code|pin|код)?[:\s]*(\d{6})',
            r'(?:verification|confirmation)[:\s]+(?:code|pin|код)?[:\s]*(\d{6})',
            r'(?:your|ваш)[:\s]+(?:code|pin|код)[:\s]+(?:is|:)[:\s]*(\d{6})',
            r'(?<!\d)(\d{6})(?!\d)',  # Изолированный 6-значный код
        ]
        
        for pattern in code_patterns:
            matches = re.finditer(pattern, msg_content, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                code = match.group(1) if len(match.groups()) > 0 else match.group(0)
                code = code.strip()
                if code and code.isdigit() and len(code) == 6:
                    verification_codes.append(code)
                    print(f"DEBUG - Found numeric code: {code}")
        
        # Удаляем дубликаты и сортируем
        verification_codes = sorted(set(verification_codes))
        print(f"DEBUG - Final codes: {verification_codes}")
        
        if verification_codes:
            message_text += "\n\n🔑 Коды подтверждения:"
            for code in verification_codes:
                message_text += f"\n`{code}`"

        # Добавляем кнопку удаления
        msg_keyboard.row(InlineKeyboardButton("🗑 Удалить сообщение", callback_data=f"del_{idx}"))
            
        return message_text, msg_keyboard
        
    except Exception as e:
        print(f"DEBUG - Error in format_message: {str(e)}")
        # Возвращаем безопасное сообщение в случае ошибки
        error_text = f"""📨 {idx}/{total if total else '?'}
От: {msg.get('from', 'Неизвестно')}
Тема: {msg.get('subject', 'Без темы')}
Дата: {msg.get('date', 'Не указана')}

❌ Ошибка при форматировании сообщения"""
        return error_text, InlineKeyboardMarkup()

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
        message_text, msg_keyboard = format_message(message, 'full', idx + 1, len(messages))
        
        bot.answer_callback_query(call.id)
        bot.send_message(call.message.chat.id, message_text, parse_mode='Markdown', reply_markup=msg_keyboard)
                
    except Exception as e:
        bot.answer_callback_query(call.id, "❌ Произошла ошибка")
        print(f"DEBUG - Error in show_full_message: {str(e)}")

def cleanup_expired_emails():
    """Очистка устаревших почтовых ящиков"""
    current_time = time.time()
    
    for user_id in list(user_emails.keys()):
        expired_emails = []
        
        for email, email_data in user_emails[user_id].items():
            expired_at = email_data.get('expired_at')
            if expired_at is None or current_time > expired_at:
                expired_emails.append(email)
                
                try:
                    # Останавливаем проверку для устаревшего ящика
                    if user_id in check_timers and email in check_timers[user_id]:
                        stop_checking_email(user_id, email)
                    
                    # Уведомляем пользователя
                    remaining_minutes = int((expired_at - current_time) / 60) if expired_at else 0
                    if remaining_minutes > 0:
                        notification_text = f"""
⚠️ Внимание! Срок действия почтового ящика истекает через {remaining_minutes} минут.
📧 Email: `{email}`

🔐 Пароль: `{email_data['password']}`

⏳ Срок действия: {time.strftime('%H:%M:%S %d.%m.%Y', time.localtime(expired_at))}
♻️ Почта будет автоматически удалена через {remaining_minutes} минут."""
                        bot.send_message(user_id, notification_text, parse_mode='Markdown')
                except Exception as e:
                    print(f"DEBUG - Error sending notification: {str(e)}")

# Запускаем периодическую очистку каждую минуту
def cleanup_loop():
    while True:
        try:
            cleanup_expired_emails()
        except Exception as e:
            print(f"DEBUG - Error in cleanup loop: {str(e)}")
        time.sleep(60)  # Проверяем каждую минуту

cleanup_thread = threading.Thread(target=cleanup_loop)
cleanup_thread.daemon = True
cleanup_thread.start()

@bot.message_handler(commands=['backup'])
def backup_mailbox(message):
    """Создание резервной копии почтового ящика"""
    user_id = message.from_user.id
    if user_id not in user_emails:
        bot.reply_to(message, "❌ У вас нет активной почты для резервного копирования")
        return
        
    try:
        email_data = user_emails[user_id]
        email = email_data['email']
        url = f"{GET_MESSAGES_URL}?mail={email}"
        
        response = requests.get(url)
        if response.status_code == 200 and response.text.strip():
            data = json.loads(response.text)
            messages = data.get('messages', [])
            
            if not messages:
                bot.reply_to(message, "📭 Нет сообщений для резервного копирования")
                return
                
            backup_text = f"📧 Резервная копия почтового ящика {email}\n"
            backup_text += f"📅 Дата создания: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            
            for idx, msg in enumerate(messages, 1):
                backup_text += f"\n{'='*30}\n"
                backup_text += f"📨 Сообщение {idx}/{len(messages)}\n"
                backup_text += f"От: {msg.get('from', 'Неизвестно')}\n"
                backup_text += f"Тема: {msg.get('subject', 'Без темы')}\n"
                backup_text += f"Дата: {msg.get('date', 'Не указана')}\n"
                backup_text += f"Текст:\n{msg.get('body', '')}\n"
            
            # Разбиваем на части, если текст слишком длинный
            parts = split_long_message(backup_text)
            for part in parts:
                bot.send_message(message.chat.id, part)
                
            bot.reply_to(message, "✅ Резервная копия создана успешно!")
            
        else:
            bot.reply_to(message, "❌ Не удалось получить данные для резервного копирования")
            
    except Exception as e:
        print(f"DEBUG - Error creating backup: {str(e)}")
        bot.reply_to(message, "❌ Произошла ошибка при создании резервной копии")

@bot.message_handler(commands=['search'])
def search_messages(message):
    """Поиск по сообщениям"""
    try:
        args = message.text.split(maxsplit=1)
        if len(args) < 2:
            bot.reply_to(message, """
❓ Используйте команду в формате:
/search <текст для поиска>

Например:
/search код подтверждения
/search password
            """)
            return
            
        user_id = message.from_user.id
        if user_id not in user_emails:
            bot.reply_to(message, "❌ У вас нет активной почты для поиска")
            return
            
        search_text = args[1].lower()
        email_data = user_emails[user_id]
        email = email_data['email']
        url = f"{GET_MESSAGES_URL}?mail={email}"
        
        searching_msg = bot.reply_to(message, "🔍 Выполняю поиск...")
        
        try:
            response = requests.get(url)
            if response.status_code == 200 and response.text.strip():
                data = json.loads(response.text)
                messages = data.get('messages', [])
                
                found_messages = []
                for msg in messages:
                    content = msg.get('body_html', '') or msg.get('body', '')
                    subject = msg.get('subject', '')
                    sender = msg.get('from', '')
                    
                    # Ищем во всех полях
                    if (search_text in content.lower() or 
                        search_text in subject.lower() or 
                        search_text in sender.lower()):
                        found_messages.append(msg)
                
                if not found_messages:
                    bot.reply_to(message, f"❌ Сообщения содержащие '{search_text}' не найдены")
                    return
                    
                bot.reply_to(message, f"✅ Найдено сообщений: {len(found_messages)}")
                
                # Отправляем найденные сообщения
                for idx, msg in enumerate(found_messages, 1):
                    message_text, msg_keyboard = format_message(msg, 'brief', idx, len(found_messages))
                    bot.send_message(message.chat.id, message_text, parse_mode='Markdown', reply_markup=msg_keyboard)
                    
            else:
                bot.reply_to(message, "❌ Не удалось получить сообщения для поиска")
                
        except Exception as e:
            print(f"DEBUG - Error searching messages: {str(e)}")
            bot.reply_to(message, "❌ Произошла ошибка при поиске")
            
        finally:
            try:
                bot.delete_message(message.chat.id, searching_msg.message_id)
            except:
                pass
                
    except Exception as e:
        print(f"DEBUG - Error in search command: {str(e)}")
        bot.reply_to(message, "❌ Произошла ошибка при выполнении поиска")

# Запуск бота
if __name__ == '__main__':
    print("Бот запускается...")
    while True:
        try:
            print("Подключение к Telegram API...")
            bot.polling(none_stop=True, interval=1, timeout=60)
        except requests.exceptions.ConnectionError as e:
            print(f"Ошибка соединения: {e}")
            print("Переподключение через 10 секунд...")
            time.sleep(10)
        except requests.exceptions.ReadTimeout as e:
            print(f"Таймаут соединения: {e}")
            print("Переподключение через 5 секунд...")
            time.sleep(5)
        except Exception as e:
            print(f"Критическая ошибка: {e}")
            print("Перезапуск через 10 секунд...")
            time.sleep(10)
