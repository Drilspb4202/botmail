/**
 * Глобальная переменная для доступа к генератору данных
 */
let dataGenerator;

/**
 * Модуль для генерации случайных данных пользователя
 */
class DataGenerator {
    constructor() {
        // Наборы имен
        this.femaleNames = [
            'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia', 
            'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Mila', 'Ella', 'Avery', 
            'Sofia', 'Camila', 'Aria', 'Scarlett', 'Victoria', 'Madison', 'Luna', 'Grace', 
            'Chloe', 'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora', 'Lily', 'Eleanor', 
            'Hannah', 'Lillian', 'Addison', 'Aubrey', 'Ellie', 'Stella', 'Natalie', 'Zoe', 
            'Leah', 'Hazel', 'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn', 'Bella', 
            'Claire', 'Skylar', 'Lucy', 'Paisley', 'Everly', 'Anna', 'Caroline', 'Nova', 
            'Genesis', 'Emilia', 'Kennedy', 'Samantha', 'Maya', 'Willow', 'Kinsley', 'Naomi', 
            'Aaliyah', 'Elena', 'Sarah', 'Ariana', 'Allison', 'Gabriella', 'Alice', 'Madelyn', 
            'Cora', 'Ruby', 'Eva', 'Serenity', 'Autumn', 'Adeline', 'Hailey', 'Gianna', 
            'Valentina', 'Isla', 'Eliana', 'Quinn', 'Nevaeh', 'Ivy', 'Sadie', 'Piper', 
            'Lydia', 'Alexa', 'Josephine', 'Emery', 'Julia', 'Delilah', 'Arianna', 'Vivian', 
            'Kaylee', 'Sophie', 'Brielle', 'Madeline', 'Donna', 'Maria', 'Jessica'
        ];
        
        this.maleNames = [
            'Liam', 'Noah', 'William', 'James', 'Oliver', 'Benjamin', 'Elijah', 'Lucas', 
            'Mason', 'Logan', 'Alexander', 'Ethan', 'Jacob', 'Michael', 'Daniel', 'Henry', 
            'Jackson', 'Sebastian', 'Aiden', 'Matthew', 'Samuel', 'David', 'Joseph', 'Carter', 
            'Owen', 'Wyatt', 'John', 'Jack', 'Luke', 'Jayden', 'Dylan', 'Grayson', 'Levi', 
            'Isaac', 'Gabriel', 'Julian', 'Mateo', 'Anthony', 'Jaxon', 'Lincoln', 'Joshua', 
            'Christopher', 'Andrew', 'Theodore', 'Caleb', 'Ryan', 'Asher', 'Nathan', 'Thomas', 
            'Leo', 'Isaiah', 'Charles', 'Josiah', 'Hudson', 'Christian', 'Hunter', 'Connor', 
            'Eli', 'Ezra', 'Aaron', 'Landon', 'Adrian', 'Jonathan', 'Nolan', 'Jeremiah', 
            'Easton', 'Elias', 'Colton', 'Cameron', 'Carson', 'Robert', 'Angel', 'Maverick', 
            'Nicholas', 'Dominic', 'Jaxson', 'Greyson', 'Adam', 'Ian', 'Austin', 'Santiago', 
            'Jordan', 'Cooper', 'Brayden', 'Roman', 'Evan', 'Ezekiel', 'Xavier', 'Jose', 
            'Jace', 'Jameson', 'Leonardo', 'Bryson', 'Axel', 'Everett', 'Parker', 'Kayden', 
            'Miles', 'Sawyer', 'Jason', 'Antonio', 'Michael', 'John', 'Robert', 'David'
        ];
        
        // Наборы фамилий
        this.lastNames = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 
            'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 
            'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 
            'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 
            'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 
            'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 
            'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 
            'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 
            'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 
            'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 
            'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 
            'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 
            'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman', 
            'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher', 'Vasquez', 'Simmons', 'Romero'
        ];
        
        // Специальные символы для генерации паролей
        this.specialChars = '!@#$%^&*()_-+=<>?/[]{}|~';
        this.uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
        this.numberChars = '0123456789';
        
        // Уникальные сгенерированные данные
        this.generatedUsernames = new Set();
    }
    
    /**
     * Генерировать случайное имя
     * @param {boolean} isFemale - Женское имя (по умолчанию - случайный выбор)
     * @returns {string} - Случайное имя
     */
    generateName(isFemale = Math.random() > 0.5) {
        const names = isFemale ? this.femaleNames : this.maleNames;
        return names[Math.floor(Math.random() * names.length)];
    }
    
    /**
     * Генерировать случайную фамилию
     * @returns {string} - Случайная фамилия
     */
    generateLastName() {
        return this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    }
    
    /**
     * Генерировать случайный логин на основе имени и фамилии
     * @param {string} firstName - Имя
     * @param {string} lastName - Фамилия
     * @returns {string} - Логин
     */
    generateLogin(firstName, lastName) {
        const name = firstName.toLowerCase();
        const surname = lastName.toLowerCase();
        
        // Несколько вариантов формирования логина
        const loginFormats = [
            // имя.фамилия + случайные цифры
            () => `${name}.${surname}${Math.floor(Math.random() * 1000)}`,
            // имя + первая буква фамилии + случайные цифры
            () => `${name}${surname.charAt(0)}${Math.floor(Math.random() * 1000)}`,
            // первая буква имени + фамилия + случайные цифры
            () => `${name.charAt(0)}${surname}${Math.floor(Math.random() * 1000)}`,
            // имя + фамилия + случайные цифры
            () => `${name}${surname}${Math.floor(Math.random() * 100)}`,
            // имя + фамилия с дублированной последней буквой + случайные цифры
            () => `${name}.${surname}${surname.slice(-1)}${Math.floor(Math.random() * 1000)}`
        ];
        
        // Выбираем случайный формат и генерируем логин
        const randomFormat = loginFormats[Math.floor(Math.random() * loginFormats.length)];
        return randomFormat();
    }
    
    /**
     * Генерировать случайный пароль
     * @param {number} length - Длина пароля (по умолчанию 12)
     * @param {boolean} includeSpecial - Включать специальные символы
     * @param {boolean} includeUppercase - Включать заглавные буквы
     * @param {boolean} includeNumbers - Включать цифры
     * @returns {string} - Случайный пароль
     */
    generatePassword(length = 12, includeSpecial = true, includeUppercase = true, includeNumbers = true) {
        let chars = this.lowercaseChars;
        
        if (includeUppercase) chars += this.uppercaseChars;
        if (includeNumbers) chars += this.numberChars;
        if (includeSpecial) chars += this.specialChars;
        
        let password = '';
        
        // Убеждаемся, что в пароле есть по крайней мере один символ каждого требуемого типа
        if (includeUppercase) {
            password += this.uppercaseChars.charAt(Math.floor(Math.random() * this.uppercaseChars.length));
        }
        
        if (includeNumbers) {
            password += this.numberChars.charAt(Math.floor(Math.random() * this.numberChars.length));
        }
        
        if (includeSpecial) {
            password += this.specialChars.charAt(Math.floor(Math.random() * this.specialChars.length));
        }
        
        // Дополняем до нужной длины
        for (let i = password.length; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Перемешиваем символы
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }
    
    /**
     * Генерировать случайный проверочный код
     * @param {number} length - Длина кода (по умолчанию 6)
     * @param {boolean} lettersOnly - Только буквы
     * @param {boolean} numbersOnly - Только цифры
     * @returns {string} - Случайный код
     */
    generateVerificationCode(length = 6, lettersOnly = false, numbersOnly = false) {
        let chars = '';
        
        if (lettersOnly) {
            chars = this.uppercaseChars;
        } else if (numbersOnly) {
            chars = this.numberChars;
        } else {
            // По умолчанию используем буквы и цифры, но без специальных символов
            chars = this.uppercaseChars + this.numberChars;
        }
        
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return code;
    }
    
    /**
     * Генерировать полный набор случайных данных пользователя
     * @returns {Object} - Данные пользователя
     */
    generateUserData() {
        const isFemale = Math.random() > 0.5;
        const firstName = this.generateName(isFemale);
        const lastName = this.generateLastName();
        const login = this.generateLogin(firstName, lastName);
        const password = this.generatePassword();
        const expiryMinutes = 5; // Срок действия данных (в минутах)
        
        return {
            firstName,
            lastName,
            login,
            password,
            expiryMinutes,
            generated: new Date().toISOString()
        };
    }
}

// Создаем и экспортируем экземпляр генератора данных
dataGenerator = new DataGenerator(); 