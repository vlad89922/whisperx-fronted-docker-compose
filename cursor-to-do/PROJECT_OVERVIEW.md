# whisperx-fronted-docker-compose - Краткий обзор проекта

## 📊 Статистика проекта
- **Общий объем:** 16,437+ строк кода
- **Backend:** 4,247 строк (Python)
- **Frontend:** 9,247 строк (JavaScript/HTML/CSS)
- **Chrome Extension:** 2,943 строки (JavaScript/HTML)
- **Документация:** 15+ файлов

## 🗂️ Быстрая навигация по файлам

### 🖥️ Серверная часть (Backend)
```
src/
├── main.py                    # 🚀 Точка входа FastAPI приложения
├── api/
│   ├── routes.py              # 🛣️ Основные API маршруты (upload, status, etc.)
│   ├── auth_routes.py         # 🔐 Google OAuth аутентификация
│   └── realtime_routes.py     # 🔴 WebSocket API для real-time
├── core/
│   ├── whisper_manager.py     # 🧠 Управление AI моделями
│   └── transcription_processor.py # ⚙️ Обработка транскрипций
├── services/
│   ├── auth_service.py        # 🔑 OAuth сервис
│   ├── s3_service.py          # ☁️ Yandex Cloud S3
│   ├── database_service.py    # 📊 JSON база данных
│   └── subtitle_generator.py  # 📄 Генерация форматов
└── realtime/
    ├── manager.py             # 🎛️ Менеджер real-time сессий
    ├── processor.py           # 🎤 Аудио обработка
    └── websocket_handler.py   # 🔌 WebSocket обработчик
```

### 🌐 Веб-интерфейс (Frontend)
```
web_interface/
├── index.html                 # 🏠 Главная страница
├── login.html                 # 🔐 Страница входа
├── style.css                  # 🎨 Основные стили (1,988 строк)
├── config.js                  # ⚙️ Конфигурация клиента
└── modules/
    ├── main.js                # 🎯 Главный контроллер приложения
    ├── api.js                 # 🌐 HTTP клиент
    ├── auth.js                # 🔑 Аутентификация
    ├── transcription.js       # 🎤 Управление транскрипцией
    ├── transcript.js          # 📝 Отображение транскриптов
    ├── mediaPlayer.js         # 🎵 Аудио/видео плеер
    ├── history.js             # 📚 История транскрипций
    ├── downloads.js           # 📥 Управление загрузками
    ├── summarization.js       # 🤖 AI суммаризация
    ├── realtimeAudio.js       # 🔴 Real-time аудио
    └── realtimeUI.js          # 🎛️ Real-time интерфейс
```

### 🔌 Chrome расширение
```
whisperx-fronted-docker-compose-extension/
├── manifest.json             # 📋 Манифест расширения
├── background.js             # ⚙️ Service Worker
├── popup.html/js             # 🎛️ Интерфейс расширения
├── offscreen.html/js         # 🎤 Аудио микширование
└── permission.html/js        # 🔐 Управление разрешениями
```

## 🔧 Ключевые функции по файлам

### 🎤 Транскрипция
- **Загрузка файлов:** `web_interface/modules/fileHandler.js`
- **Обработка:** `src/core/transcription_processor.py`
- **AI модели:** `src/core/whisper_manager.py`
- **Статус:** `src/api/routes.py` → `/api/status/{task_id}`

### 🔄 Real-Time
- **WebSocket сервер:** `src/realtime/websocket_handler.py`
- **Аудио захват:** `web_interface/modules/realtimeAudio.js`
- **UI управление:** `web_interface/modules/realtimeUI.js`
- **Обработка потока:** `src/realtime/processor.py`

### 🤖 AI Суммаризация
- **Клиентская логика:** `web_interface/modules/summarization.js`
- **API endpoint:** `src/api/routes.py` → `/api/summarize/{task_id}`
- **Анализ спикеров:** встроено в `summarization.js`

### 🔐 Аутентификация
- **Google OAuth:** `src/services/auth_service.py`
- **JWT токены:** `src/api/auth_routes.py`
- **Клиентская часть:** `web_interface/modules/auth.js`
- **Middleware:** `src/middleware/auth_middleware.py`

### ☁️ Облачное хранение
- **S3 сервис:** `src/services/s3_service.py`
- **Загрузка файлов:** автоматическая после транскрипции
- **Ссылки:** `src/api/routes.py` → `/api/s3-links/{task_id}`

### 📊 База данных
- **JSON DB:** `src/services/database_service.py`
- **Файл данных:** `data/transcriptions_db.json`
- **История:** `web_interface/modules/history.js`

## 🚀 Точки входа

### Запуск приложения
```bash
python run.py              # 🚀 Backend + Frontend
python server.py           # 🖥️ Только API сервер
python dev.py              # 🔧 Режим разработки
```

### Docker
```bash
docker compose up -d                                    # 🐳 Базовый запуск
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d  # 🚀 С GPU
```

### Доступ
- **Web UI:** http://localhost:8000
- **API:** http://localhost:8880
- **Docs:** http://localhost:8880/docs
- **WebSocket:** ws://localhost:8880/ws/realtime

## 🔍 Поиск функций

### Хочу найти код для...

| Функция | Файл | Строка/Метод |
|---------|------|--------------|
| **Загрузка файла** | `web_interface/modules/fileHandler.js` | `handleFileSelect()` |
| **Начало транскрипции** | `src/api/routes.py` | `upload_file()` |
| **Статус обработки** | `src/api/routes.py` | `get_status()` |
| **Отображение транскрипта** | `web_interface/modules/transcript.js` | `displayTranscript()` |
| **Real-time подключение** | `web_interface/modules/realtimeAudio.js` | `connect()` |
| **Создание саммари** | `web_interface/modules/summarization.js` | `createSummary()` |
| **OAuth авторизация** | `src/services/auth_service.py` | `get_oauth_url()` |
| **Загрузка на S3** | `src/services/s3_service.py` | `upload_file()` |
| **Генерация субтитров** | `src/services/subtitle_generator.py` | `generate_*()` |
| **История транскрипций** | `web_interface/modules/history.js` | `loadTranscriptionHistory()` |

## 🎨 Стили и UI

### CSS файлы
- **Основные стили:** `web_interface/style.css` (1,988 строк)
- **Real-time UI:** `web_interface/css/realtime.css` (605 строк)
- **Chrome extension:** встроено в `whisperx-fronted-docker-compose-extension/popup.html`

### Ключевые UI компоненты
- **Drag & Drop:** `.upload-area` в `style.css`
- **Медиаплеер:** `.media-player` в `style.css`
- **Транскрипт:** `.transcript-container` в `style.css`
- **История:** `.history-section` в `style.css`
- **Real-time панель:** `.realtime-panel` в `realtime.css`

## 📋 Конфигурация

### Основные конфиги
- **Сервер:** `src/config/settings.py`
- **Клиент:** `web_interface/config.js`
- **Docker:** `docker-compose.*.yml`
- **Chrome extension:** `whisperx-fronted-docker-compose-extension/manifest.json`

### Переменные окружения
```bash
S3_ACCESS_KEY              # Yandex Cloud S3
S3_SECRET_KEY              # Yandex Cloud S3
S3_BUCKET                  # Имя bucket
GOOGLE_CLIENT_ID           # OAuth клиент
GOOGLE_CLIENT_SECRET       # OAuth секрет
JWT_SECRET_KEY             # JWT подпись
```

## 🐛 Отладка

### Логи и ошибки
- **FastAPI логи:** автоматически в консоль
- **JavaScript ошибки:** браузерная консоль
- **Chrome extension:** `chrome://extensions/` → Developer mode

### Полезные endpoints для отладки
- `GET /api/status/{task_id}` - статус транскрипции
- `GET /api/transcriptions` - список всех транскрипций
- `GET /docs` - автоматическая документация API
- `WebSocket /ws/realtime` - тестирование real-time

---

*Этот файл создан для быстрой навигации по проекту whisperx-fronted-docker-compose. Для полной документации см. README.md* 