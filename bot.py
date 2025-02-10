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