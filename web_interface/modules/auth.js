// Модуль авторизации для Google OAuth
class AuthManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8880/api';
        this.user = null;
        this.isAuthenticated = false;
    }

    // Проверка авторизации через API
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/status`, {
                method: 'GET',
                credentials: 'include', // Включаем cookies
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    this.isAuthenticated = true;
                    this.user = data.user;
                    return true;
                } else {
                    this.isAuthenticated = false;
                    this.user = null;
                    // Перенаправляем на страницу входа
                    window.location.href = '/login.html';
                    return false;
                }
            } else {
                this.isAuthenticated = false;
                this.user = null;
                // Перенаправляем на страницу входа
                window.location.href = '/login.html';
                return false;
            }
        } catch (error) {
            console.error('Ошибка проверки аутентификации:', error);
            this.isAuthenticated = false;
            this.user = null;
            // Перенаправляем на страницу входа
            window.location.href = '/login.html';
            return false;
        }
    }

    // Получение информации о текущем пользователе
    async getCurrentUser() {
        if (this.user) {
            return this.user;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.user = userData;
                this.isAuthenticated = true;
                return userData;
            } else {
                throw new Error('Не удалось получить данные пользователя');
            }
        } catch (error) {
            console.error('Ошибка получения данных пользователя:', error);
            this.user = null;
            this.isAuthenticated = false;
            return null;
        }
    }

    // Функция выхода
    async logout() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            // Независимо от результата, очищаем локальные данные
            this.user = null;
            this.isAuthenticated = false;
            
            // Перенаправляем на страницу входа
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Ошибка при выходе:', error);
            // Все равно очищаем и перенаправляем
            this.user = null;
            this.isAuthenticated = false;
            window.location.href = '/login.html';
        }
    }

    // Проверка валидности сессии
    isSessionValid() {
        return this.isAuthenticated && this.user !== null;
    }

    // Получение токена из cookies (если нужно)
    getAuthToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token') {
                return value;
            }
        }
        return null;
    }

    // Инициализация Google OAuth входа
    initiateGoogleLogin() {
        window.location.href = `${this.apiBaseUrl}/auth/google/login`;
    }

    // Получение имени пользователя для отображения
    getUserDisplayName() {
        if (this.user) {
            return this.user.name || this.user.email || 'Пользователь';
        }
        return 'Пользователь';
    }

    // Получение email пользователя
    getUserEmail() {
        if (this.user) {
            return this.user.email || '';
        }
        return '';
    }

    // Получение аватара пользователя
    getUserPicture() {
        if (this.user && this.user.picture) {
            return this.user.picture;
        }
        return null;
    }

    // Проверка и инициализация аутентификации при загрузке страницы
    async init() {
        // Проверяем, не находимся ли мы на странице входа
        if (window.location.pathname.includes('login.html')) {
            return;
        }

        // Проверяем аутентификацию
        const isAuth = await this.checkAuthentication();
        
        if (isAuth) {
            // Получаем данные пользователя
            await this.getCurrentUser();
        }
        
        return isAuth;
    }
}

// Экспорт для использования в других модулях
window.AuthManager = AuthManager; 