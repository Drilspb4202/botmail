/**
 * Модуль интернационализации для NeuroMail
 * Поддерживает русский и английский языки
 */
class I18nManager {
    constructor() {
        // Текущий язык (по умолчанию русский)
        this.currentLang = localStorage.getItem('neuromail_language') || 'ru';
        
        // Словари переводов
        this.translations = {
            'ru': {
                // Общие
                'app_name': 'NeuroMail',
                'loading': 'Загрузка...',
                'success': 'Успешно',
                'error': 'Ошибка',
                'warning': 'Предупреждение',
                'info': 'Информация',
                'copied': 'Скопировано',
                'close': 'Закрыть',
                'save': 'Сохранить',
                'cancel': 'Отмена',
                'delete': 'Удалить',
                'confirm': 'Подтвердить',
                'refresh': 'Обновить',
                'search': 'Поиск',
                'send': 'Отправить',
                'create': 'Создать',
                'update': 'Обновить',
                'error_copying': 'Не удалось скопировать email адрес',
                
                // Навигация
                'nav_inboxes': 'Почтовые ящики',
                'nav_emails': 'Письма',
                'nav_stats': 'Статистика',
                'nav_settings': 'Настройки',
                'nav_premium': 'Premium',
                'nav_donate': 'Поддержать проект',
                
                // Страница почтовых ящиков
                'inbox_management': '📬 Управление почтовыми ящиками',
                'create_new_inbox': 'Создать новый',
                'welcome_title': '✨ Добро пожаловать в NeuroMail!',
                'welcome_desc': 'NeuroMail — это мощный инструмент для работы с временными почтовыми ящиками. Создавайте виртуальные ящики для защиты вашей основной почты от спама и нежелательных рассылок.',
                'feature_privacy': 'Защита конфиденциальности при регистрации на сайтах',
                'feature_instant': 'Мгновенное создание и удаление почтовых ящиков',
                'feature_realtime': 'Просмотр писем в реальном времени с уведомлениями',
                'tip_copy': 'Совет: Нажмите на адрес электронной почты в таблице, чтобы скопировать его в буфер обмена.',
                'vpn_warning': 'Внимание! Если вы находитесь в России, для корректной работы сервиса необходимо использовать VPN. В настоящее время сервис может работать нестабильно на мобильных устройствах.',
                'public_api_note': 'При использовании публичного API ключа почтовые ящики автоматически удаляются через 5 минут.',
                'public_api_warning': 'Внимание! При использовании публичного API почтовые ящики автоматически удаляются через {0} мин. Для постоянных ящиков используйте персональный API ключ или активируйте секретный код.',
                'secret_code_activated': 'Секретный код активирован. Ваши почтовые ящики не будут автоматически удаляться даже с публичным API.',
                
                // Таблица ящиков
                'inbox_id': 'ID',
                'inbox_email': 'Email адрес',
                'inbox_created': 'Создан',
                'inbox_actions': 'Действия',
                'inbox_loading': 'Загрузка почтовых ящиков...',
                'inbox_view_emails': 'Просмотр писем',
                'inbox_delete': 'Удалить ящик',
                
                // Статистика
                'stats_usage': '📊 Статистика использования',
                'stats_total_inboxes': 'Всего ящиков',
                'stats_api_requests': 'API запросов',
                
                // Страница писем
                'emails_title': '📧 Письма',
                'emails_send': 'Отправить письмо',
                'emails_from': 'От кого',
                'emails_subject': 'Тема',
                'emails_received': 'Получено',
                'emails_actions': 'Действия',
                'emails_no_inbox': 'Выберите почтовый ящик для просмотра писем',
                'emails_empty': 'В этом ящике пока нет писем',
                'emails_view': 'Просмотр письма',
                'emails_delete': 'Удалить письмо',
                
                // Просмотр письма
                'email_details': 'Детали письма',
                'email_from': 'От:',
                'email_to': 'Кому:',
                'email_subject': 'Тема:',
                'email_date': 'Дата:',
                'email_body': 'Содержание письма',
                
                // Модальные окна
                'modal_delete_inbox': 'Удаление почтового ящика',
                'modal_delete_inbox_confirm': 'Вы действительно хотите удалить этот почтовый ящик? Это действие невозможно отменить.',
                'modal_delete_email': 'Удаление письма',
                'modal_delete_email_confirm': 'Вы действительно хотите удалить это письмо? Это действие невозможно отменить.',
                'modal_send_email': 'Отправка письма',
                'modal_send_email_desc': 'Заполните форму для отправки письма',
                'modal_send_to': 'Получатель:',
                'modal_send_subject': 'Тема:',
                'modal_send_body': 'Сообщение:',
                'modal_create_inbox': 'Создание почтового ящика',
                'modal_create_inbox_desc': 'Нажмите кнопку "Создать" для создания нового временного почтового ящика. Адрес ящика будет сгенерирован автоматически.',
                
                // Генератор данных
                'generator_title': 'Генерация данных',
                'generator_first_name': 'Имя',
                'generator_last_name': 'Фамилия',
                'generator_login': 'Логин',
                'generator_password': 'Пароль',
                'generator_validity': 'Действительно:',
                'generator_minutes': 'минут',
                'generator_one_time': 'Данные действительны для одной регистрации',
                'generator_copy_all': 'Копировать все данные',
                'generator_generate_new': 'Сгенерировать новое',
                
                // Настройки
                'settings_title': '⚙️ Настройки',
                'settings_api': 'Настройки API',
                'settings_api_key': 'API ключ:',
                'settings_api_key_personal': 'Персональный API ключ:',
                'settings_api_key_placeholder': 'Введите персональный API ключ...',
                'settings_api_key_toggle': 'Показать/скрыть ключ',
                'settings_api_update': 'Сохранить ключ',
                'settings_api_reset': 'Сбросить к публичному API',
                'settings_api_mode': 'Режим API:',
                'settings_api_mode_label': 'Режим API',
                'settings_api_mode_public': 'Публичный',
                'settings_api_mode_personal': 'Персональный',
                'settings_api_mode_combined': 'Комбинированный',
                'settings_api_key_hide': 'Скрыть',
                'settings_api_key_show': 'Показать',
                'settings_api_status_checking': 'Проверка соединения...',
                'settings_api_public_note': 'Используется защищенный публичный API ключ',
                'settings_api_personal_note': 'Используется персональный API ключ',
                
                // Тайм-ауты
                'settings_timeouts': 'Тайм-ауты',
                'settings_timeout_email': 'Ожидание письма (сек):',
                'settings_timeout_http': 'Тайм-аут HTTP запроса (сек):',
                
                // Автоудаление
                'settings_auto_delete': 'Автоматическое удаление',
                'settings_auto_delete_inboxes': 'Автоматически удалять почтовые ящики после использования',
                'settings_auto_delete_emails': 'Удалять письма старше:',
                'settings_auto_delete_days': 'дней',
                'settings_inbox_timer': 'Таймер удаления ящика после просмотра:',
                'settings_inbox_timer_never': 'Не удалять',
                'settings_inbox_timer_5min': 'Через 5 минут',
                'settings_inbox_timer_1hour': 'Через 1 час',
                
                // Логирование
                'settings_logging': 'Журнал операций',
                'settings_logging_enable': 'Включить журналирование',
                'settings_logging_save_file': 'Сохранять журнал в файл',
                'settings_logging_path': 'Путь к файлу журнала:',
                
                // Секретный код
                'settings_secret_code': 'Расширенные возможности',
                'settings_secret_code_placeholder': 'Введите секретный код для разблокировки...',
                'settings_secret_code_toggle': 'Показать/скрыть код',
                'settings_secret_code_desc': 'Введите специальный код для разблокировки расширенных функций, включая сохранение почтовых ящиков при использовании публичного API.',
                
                // Premium
                'premium_title': '🔑 Premium API-ключ',
                'premium_subtitle': 'Получите персональный доступ к сервису',
                'premium_price_period': '/ месяц',
                'premium_feature_1': '10 персональных почтовых ящиков',
                'premium_feature_2': 'Полная конфиденциальность ваших данных',
                'premium_feature_3': 'Мгновенное получение писем и уведомления',
                'premium_feature_4': 'Возможность удалять и создавать новые ящики',
                'premium_feature_5': 'Прием почты со всех популярных сервисов',
                'premium_feature_6': 'Идеально для кодов регистрации и проверочных ссылок',
                'premium_warning': 'Без Premium-ключа все пользователи делят общий доступ к API, что ограничивает приватность и может привести к потере доступа к вашим ящикам.',
                'premium_contact_title': 'Как получить персональный API-ключ:',
                'premium_contact_message': 'Просто свяжитесь с нами в Telegram:',
                'premium_payment_info': 'Оплата принимается в USDT. После оплаты вы получите ваш персональный API-ключ, который нужно будет ввести в разделе "Настройки".',
                'premium_testimonials_title': 'Что говорят наши пользователи',
                
                // Ошибки
                'error_loading': 'Ошибка при загрузке данных',
                'error_creating': 'Ошибка при создании',
                'error_deleting': 'Ошибка при удалении',
                'error_sending': 'Ошибка при отправке',
                'error_updating': 'Ошибка при обновлении',
                'error_connection': 'Ошибка подключения к серверу',
                'try_again': 'Попробуйте еще раз',
                
                // Специальные коды
                'code_title': 'Активация секретного кода',
                'code_label': 'Секретный код:',
                'code_activate': 'Активировать',
                'code_status_active': 'Код активирован',
                'code_status_inactive': 'Код не активирован',
                
                // Поддержка проекта
                'donate_title': '💖 Поддержать проект',
                'donate_button': 'Сделать пожертвование',
                'donate_desc': 'Вы можете поддержать развитие проекта NeuroMail, чтобы он становился лучше и функциональнее.',
                'donate_support_title': '💖 Ваша поддержка важна для нас!',
                'donate_support_desc': 'Проект NeuroMail создается и поддерживается энтузиастами. Ваши пожертвования помогают нам:',
                'donate_feature_1': 'Оплачивать серверную инфраструктуру',
                'donate_feature_2': 'Разрабатывать новые функции',
                'donate_feature_3': 'Улучшать безопасность и производительность',
                'donate_feature_4': 'Поддерживать команду разработчиков',
                'donate_options': 'Способы поддержки:',
                'donate_crypto': 'Криптовалюта',
                'donate_crypto_desc': 'Поддержите развитие проекта с помощью криптовалюты.',
                'donate_show_wallet': 'Показать кошелек USDT TRC20',
                'donate_usdt': 'USDT TRC20',
                'donate_wallet': 'Кошелек:',
                'donate_copy': 'Копировать адрес',
                'donate_note': 'Используйте только сеть TRC20 для отправки USDT.',
                'wallet_modal_title': 'Кошелек USDT TRC20',
                'wallet_modal_desc': 'Вы можете поддержать проект, отправив USDT на следующий кошелек:',
                'wallet_modal_note': 'Используйте только сеть TRC20 для отправки USDT.',
                'wallet_copy_btn': 'Копировать адрес'
            },
            'en': {
                // General
                'app_name': 'NeuroMail',
                'loading': 'Loading...',
                'success': 'Success',
                'error': 'Error',
                'warning': 'Warning',
                'info': 'Information',
                'copied': 'Copied',
                'close': 'Close',
                'save': 'Save',
                'cancel': 'Cancel',
                'delete': 'Delete',
                'confirm': 'Confirm',
                'refresh': 'Refresh',
                'search': 'Search',
                'send': 'Send',
                'create': 'Create',
                'update': 'Update',
                'error_copying': 'Failed to copy email address',
                
                // Navigation
                'nav_inboxes': 'Mailboxes',
                'nav_emails': 'Emails',
                'nav_stats': 'Statistics',
                'nav_settings': 'Settings',
                'nav_premium': 'Premium',
                'nav_donate': 'Support Project',
                
                // Mobile navigation
                'mobile_inbox': 'Inboxes',
                'mobile_emails': 'Emails',
                'mobile_settings': 'Settings',
                'mobile_premium': 'Premium',
                
                // Inbox page
                'inbox_management': '📬 Mailbox Management',
                'create_new_inbox': 'Create New',
                'welcome_title': '✨ Welcome to NeuroMail!',
                'welcome_desc': 'NeuroMail is a powerful tool for working with temporary mailboxes. Create virtual mailboxes to protect your main email from spam and unwanted mailings.',
                'feature_privacy': 'Privacy protection when registering on websites',
                'feature_instant': 'Instant creation and deletion of mailboxes',
                'feature_realtime': 'Real-time email viewing with notifications',
                'tip_copy': 'Tip: Click on an email address in the table to copy it to clipboard.',
                'vpn_warning': 'Attention! If you are located in Russia, you need to use a VPN for the service to work correctly. Currently, the service may be unstable on mobile devices.',
                'public_api_note': 'When using a public API key, mailboxes are automatically deleted after 5 minutes.',
                'public_api_warning': 'Warning! When using the public API, mailboxes are automatically deleted after {0} minutes. For permanent mailboxes, use a personal API key or activate a secret code.',
                'secret_code_activated': 'Secret code activated. Your mailboxes will not be automatically deleted even with the public API.',
                
                // Inboxes table
                'inbox_id': 'ID',
                'inbox_email': 'Email address',
                'inbox_created': 'Created',
                'inbox_actions': 'Actions',
                'inbox_loading': 'Loading mailboxes...',
                'inbox_view_emails': 'View emails',
                'inbox_delete': 'Delete inbox',
                'tip': 'Tip',
                'note': 'Note',
                
                // Statistics
                'stats_usage': '📊 Usage Statistics',
                'stats_total_inboxes': 'Total mailboxes',
                'stats_api_requests': 'API requests',
                
                // Emails page
                'emails_title': '📧 Emails',
                'emails_send': 'Send email',
                'emails_from': 'From',
                'emails_subject': 'Subject',
                'emails_received': 'Received',
                'emails_actions': 'Actions',
                'emails_no_inbox': 'Select a mailbox to view emails',
                'emails_empty': 'There are no emails in this inbox yet',
                'emails_view': 'View email',
                'emails_delete': 'Delete email',
                
                // Email viewer
                'email_details': 'Email details',
                'email_from': 'From:',
                'email_to': 'To:',
                'email_subject': 'Subject:',
                'email_date': 'Date:',
                'email_body': 'Email content',
                'email_view_title': '📨 View Email',
                
                // Modal windows
                'modal_delete_inbox': 'Delete Mailbox',
                'modal_delete_inbox_confirm': 'Are you sure you want to delete this mailbox? This action cannot be undone.',
                'modal_delete_email': 'Delete Email',
                'modal_delete_email_confirm': 'Are you sure you want to delete this email? This action cannot be undone.',
                'modal_send_email': 'Send Email',
                'modal_send_email_desc': 'Fill out the form to send an email',
                'modal_send_to': 'Recipient:',
                'modal_send_subject': 'Subject:',
                'modal_send_body': 'Message:',
                'modal_create_inbox': 'Create Mailbox',
                'modal_create_inbox_desc': 'Click the "Create" button to create a new temporary mailbox. The mailbox address will be generated automatically.',
                
                // Generator data
                'generator_title': 'Data Generation',
                'generator_first_name': 'First Name',
                'generator_last_name': 'Last Name',
                'generator_login': 'Login',
                'generator_password': 'Password',
                'generator_validity': 'Validity:',
                'generator_minutes': 'minutes',
                'generator_one_time': 'Data valid for one registration',
                'generator_copy_all': 'Copy all data',
                'generator_generate_new': 'Generate new',
                
                // Settings
                'settings_title': '⚙️ Settings',
                'settings_api': 'API Settings',
                'settings_api_key': 'API key:',
                'settings_api_key_personal': 'Personal API key:',
                'settings_api_key_placeholder': 'Enter personal API key...',
                'settings_api_key_toggle': 'Show/hide key',
                'settings_api_update': 'Save key',
                'settings_api_reset': 'Reset to public API',
                'settings_api_mode': 'API mode:',
                'settings_api_mode_label': 'API mode',
                'settings_api_mode_public': 'Public',
                'settings_api_mode_personal': 'Personal',
                'settings_api_mode_combined': 'Combined',
                'settings_api_key_hide': 'Hide',
                'settings_api_key_show': 'Show',
                'settings_api_status_checking': 'Checking connection...',
                'settings_api_public_note': 'Using secured public API key',
                'settings_api_personal_note': 'Using personal API key',
                
                // Timeouts
                'settings_timeouts': 'Timeouts',
                'settings_timeout_email': 'Email waiting (sec):',
                'settings_timeout_http': 'HTTP request timeout (sec):',
                
                // Auto delete
                'settings_auto_delete': 'Automatic deletion',
                'settings_auto_delete_inboxes': 'Automatically delete mailboxes after use',
                'settings_auto_delete_emails': 'Delete emails older than:',
                'settings_auto_delete_days': 'days',
                'settings_inbox_timer': 'Inbox deletion timer after viewing:',
                'settings_inbox_timer_never': 'Never delete',
                'settings_inbox_timer_5min': 'After 5 minutes',
                'settings_inbox_timer_1hour': 'After 1 hour',
                
                // Logging
                'settings_logging': 'Operation log',
                'settings_logging_enable': 'Enable logging',
                'settings_logging_save_file': 'Save log to file',
                'settings_logging_path': 'Log file path:',
                
                // Secret code
                'settings_secret_code': 'Advanced features',
                'settings_secret_code_placeholder': 'Enter secret code to unlock...',
                'settings_secret_code_toggle': 'Show/hide code',
                'settings_secret_code_desc': 'Enter a special code to unlock advanced features, including saving mailboxes when using the public API.',
                
                // Premium
                'premium_title': '🔑 Premium API key',
                'premium_subtitle': 'Get personal access to the service',
                'premium_price_period': '/ month',
                'premium_feature_1': '10 personal mailboxes',
                'premium_feature_2': 'Complete confidentiality of your data',
                'premium_feature_3': 'Instant email receipt and notifications',
                'premium_feature_4': 'Ability to delete and create new mailboxes',
                'premium_feature_5': 'Receive mail from all popular services',
                'premium_feature_6': 'Perfect for registration codes and verification links',
                'premium_warning': 'Without a Premium key, all users share common API access, which limits privacy and may result in loss of access to your mailboxes.',
                'premium_contact_title': 'How to get a personal API key:',
                'premium_contact_message': 'Just contact us on Telegram:',
                'premium_payment_info': 'Payment is accepted in USDT. After payment, you will receive your personal API key, which you will need to enter in the "Settings" section.',
                'premium_testimonials_title': 'What our users say',
                
                // Errors
                'error_loading': 'Error loading data',
                'error_creating': 'Error creating',
                'error_deleting': 'Error deleting',
                'error_sending': 'Error sending',
                'error_updating': 'Error updating',
                'error_connection': 'Error connecting to server',
                'try_again': 'Try again',
                
                // Special codes
                'code_title': 'Secret code activation',
                'code_label': 'Secret code:',
                'code_activate': 'Activate',
                'code_status_active': 'Code activated',
                'code_status_inactive': 'Code not activated',
                
                // Support project
                'donate_title': '💖 Support the project',
                'donate_button': 'Make a donation',
                'donate_desc': 'You can support the development of the NeuroMail project to make it better and more functional.',
                'donate_support_title': '💖 Your support is important to us!',
                'donate_support_desc': 'The NeuroMail project is created and maintained by enthusiasts. Your donations help us:',
                'donate_feature_1': 'Pay for server infrastructure',
                'donate_feature_2': 'Develop new features',
                'donate_feature_3': 'Improve security and performance',
                'donate_feature_4': 'Support the development team',
                'donate_options': 'Support methods:',
                'donate_crypto': 'Cryptocurrency',
                'donate_crypto_desc': 'Support the project development with cryptocurrency.',
                'donate_show_wallet': 'Show USDT TRC20 wallet',
                'donate_usdt': 'USDT TRC20',
                'donate_wallet': 'Wallet:',
                'donate_copy': 'Copy address',
                'donate_note': 'Use only the TRC20 network for sending USDT.',
                'wallet_modal_title': 'USDT TRC20 Wallet',
                'wallet_modal_desc': 'You can support the project by sending USDT to the following wallet:',
                'wallet_modal_note': 'Use only the TRC20 network for sending USDT.',
                'wallet_copy_btn': 'Copy address'
            }
        };
        
        // Инициализируем события
        this.initEvents();
    }
    
    /**
     * Инициализация обработчиков событий
     */
    initEvents() {
        // После полной загрузки DOM инициализируем интерфейс
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initLanguageSwitcher();
                this.updateInterface();
                this.initToastHandlers();
            });
        } else {
            // DOM уже загружен
            setTimeout(() => {
                this.initLanguageSwitcher();
                this.updateInterface();
                this.initToastHandlers();
            }, 0);
        }
    }
    
    /**
     * Инициализация переключателя языков
     */
    initLanguageSwitcher() {
        console.log('Инициализация языкового переключателя...');
        
        // Используем существующие кнопки переключения языка из HTML
        const langButtons = document.querySelectorAll('.lang-btn');
        
        if (langButtons.length > 0) {
            console.log('Найдены кнопки переключения языка:', langButtons.length);
            
            // Добавляем обработчики событий для каждой кнопки
            langButtons.forEach(btn => {
                const lang = btn.getAttribute('data-lang');
                
                // Устанавливаем правильные классы активности при инициализации
                if (lang === this.currentLang) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
                
                // Удаляем предыдущие обработчики, чтобы избежать дублирования
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Добавляем обработчик события клика
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Переключение языка на:', lang);
                    this.setLanguage(lang);
                });
            });
            
            console.log('Обработчики языковых кнопок установлены');
        } else {
            console.warn('Не найдены кнопки переключения языка в DOM');
        }
    }
    
    /**
     * Установка языка
     * @param {string} lang - Код языка ('ru' или 'en')
     */
    setLanguage(lang) {
        if (lang !== 'ru' && lang !== 'en') {
            console.error('Неподдерживаемый язык:', lang);
            return;
        }
        
        console.log('Установка языка:', lang);
        
        // Сохраняем выбранный язык
        this.currentLang = lang;
        localStorage.setItem('neuromail_language', lang);
        
        // Обновляем интерфейс
        this.updateInterface();
        
        // Обновляем активный класс на кнопках языка
        const langBtns = document.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            if (btn.getAttribute('data-lang') === lang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Показываем визуальное подтверждение
        try {
            const toast = document.getElementById('toast');
            if (toast) {
                // Используем querySelector относительно найденного toast элемента
                const message = toast.querySelector('.toast-message');
                if (message) {
                    message.textContent = lang === 'ru' ? 'Язык изменен на русский' : 'Language changed to English';
                    toast.className = 'toast active success';
                    setTimeout(() => {
                        toast.className = 'toast';
                    }, 3000);
                } else {
                    // Если элемент .toast-message не найден, создаем его
                    console.log('Элемент .toast-message не найден, создаю его');
                    const messageEl = document.createElement('div');
                    messageEl.className = 'toast-message';
                    messageEl.textContent = lang === 'ru' ? 'Язык изменен на русский' : 'Language changed to English';
                    toast.appendChild(messageEl);
                    toast.className = 'toast active success';
                    setTimeout(() => {
                        toast.className = 'toast';
                    }, 3000);
                }
            } else {
                console.warn('Элемент #toast не найден в DOM');
            }
        } catch (error) {
            console.error('Ошибка при отображении уведомления о смене языка:', error);
        }
        
        // Генерируем событие изменения языка
        document.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lang } }));
    }
    
    /**
     * Получение перевода по ключу
     * @param {string} key - Ключ перевода
     * @param {object} params - Параметры для подстановки
     * @returns {string} - Переведенная строка
     */
    t(key, params = {}) {
        const translation = this.translations[this.currentLang][key] || key;
        
        if (params && Object.keys(params).length > 0) {
            // Подстановка параметров в строку
            return translation.replace(/\{\{(\w+)\}\}/g, (match, p1) => {
                return params[p1] !== undefined ? params[p1] : match;
            });
        }
        
        return translation;
    }
    
    /**
     * Обновление интерфейса на текущий язык
     */
    updateInterface() {
        // Обновляем все элементы с атрибутом data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = this.t(key);
            }
        });
        
        // Обновляем все placeholder'ы с атрибутом data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                element.setAttribute('placeholder', this.t(key));
            }
        });
        
        // Обновляем все title с атрибутом data-i18n-title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (key) {
                element.setAttribute('title', this.t(key));
            }
        });
    }
    
    /**
     * Инициализация обработчиков для тост-уведомлений
     */
    initToastHandlers() {
        // Добавляем обработчик закрытия тоста
        const toastClose = document.querySelector('.toast-close');
        if (toastClose) {
            toastClose.addEventListener('click', () => {
                const toast = document.getElementById('toast');
                if (toast) {
                    toast.className = 'toast';
                }
            });
        }
        
        // Автоматическое закрытие тоста по клику на нем
        const toast = document.getElementById('toast');
        if (toast) {
            toast.addEventListener('click', () => {
                toast.className = 'toast';
            });
        }
    }
}

// Создаем и экспортируем экземпляр класса
const i18n = new I18nManager();
window.i18n = i18n; // Делаем доступным глобально

// Экспортируем функцию перевода для удобства
window.t = function(key, params) {
    return i18n.t(key, params);
}; 