// Пример конфигурации AI-Transcribe Web Interface
// Скопируйте этот файл в config.js и настройте под свои нужды

const CONFIG = {
    // API настройки
    API: {
        // Продакшн адрес API сервера
        BASE_URL: 'http://localhost:8880',
        
        // Ваш токен HuggingFace для диаризации спикеров
        HF_TOKEN: 'your-huggingface-token-here',
        
        ENDPOINTS: {
            UPLOAD: '/upload',
            STATUS: '/status',
            TRANSCRIPTIONS: '/transcriptions',
            DOWNLOAD_AUDIO: '/download/audio',
            DOWNLOAD_TRANSCRIPT: '/download/transcript',
            DOWNLOAD_SUBTITLE: '/download/subtitle',
            DELETE_TRANSCRIPTION: '/transcription',
            S3_LINKS: '/s3-links',  // Эндпоинт для получения S3 ссылок
            SUMMARIZE: '/summarize',  // Эндпоинт для суммаризации
            SUMMARIZATION_CONFIG: '/config/summarization'  // Эндпоинт для конфигурации суммаризации
        }
    },

    // Настройки авторизации
    AUTH: {
        // Пароль для входа в систему
        PASSWORD: 'your-secure-password',
        
        // Длительность сессии в миллисекундах (по умолчанию 24 часа)
        SESSION_DURATION: 24 * 60 * 60 * 1000,
        
        STORAGE_KEYS: {
            IS_LOGGED_IN: 'isLoggedIn',
            LOGIN_TIME: 'loginTime'
        }
    },

    // Настройки интерфейса
    UI: {
        // Интервал обновления прогресса транскрипции (мс)
        PROGRESS_UPDATE_INTERVAL: 2000,
        
        // Длительность показа уведомлений (мс)
        NOTIFICATION_DURATION: 3000,
        INFO_NOTIFICATION_DURATION: 5000,
        
        // Таймаут загрузки медиа файлов (мс)
        MEDIA_LOADING_TIMEOUT: 30000,
        
        // Настройки по умолчанию
        AUTO_SCROLL: true,
        SHOW_TIMESTAMPS: true
    },

    // Настройки транскрипции по умолчанию
    TRANSCRIPTION: {
        DEFAULT_MODEL: 'large-v3',
        DEFAULT_LANGUAGE: 'ru',
        DEFAULT_DIARIZE: false,
        DEFAULT_COMPUTE_TYPE: 'auto',
        DEFAULT_BATCH_SIZE: 16
    },

    // Настройки суммаризации перенесены в переменные окружения сервера
    // Конфигурация теперь получается через API: /api/config/summarization
    // Настройте переменные окружения в .env файле:
    // SUMMARIZATION_API_URL, SUMMARIZATION_API_KEY, SUMMARIZATION_MODEL, и т.д.

    // Настройки разработки
    DEBUG: {
        // Включить отладочные сообщения в консоль
        ENABLED: false,
        
        // Логировать все API вызовы
        LOG_API_CALLS: false,
        
        // Симулировать медленную сеть для тестирования
        SIMULATE_SLOW_NETWORK: false
    }
};

// Экспортируем конфигурацию
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} 