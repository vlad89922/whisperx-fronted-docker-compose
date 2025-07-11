"""
Главный файл приложения FastAPI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware  # Включено обратно

from .api.routes import router
from .api.auth_routes import router as auth_router  # Включено обратно
from .api.realtime_routes import router as realtime_router, initialize_realtime_system, shutdown_realtime_system  # Real-time маршруты
from .config.settings import CORS_ORIGINS, JWT_CONFIG


def create_app() -> FastAPI:
    """Создание и настройка FastAPI приложения"""
    
    app = FastAPI(
        title="RedMadWhisp - AI Транскрипция с Google OAuth",
        description="API для транскрипции аудио и видео файлов с экспортом в 6 форматов, Google OAuth аутентификацией и автоматической загрузкой на Yandex Cloud S3. Каждый пользователь видит только свои транскрипции.",
        version="2.1.0"
    )
    
    # Добавляем Session middleware для OAuth
    app.add_middleware(
        SessionMiddleware, 
        secret_key=JWT_CONFIG['secret_key']
    )
    
    # Добавляем CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"]
    )
    
    # Подключаем роуты
    app.include_router(auth_router, prefix="/api", tags=["Аутентификация"])  # Включено обратно
    app.include_router(router, prefix="/api", tags=["Транскрипция"])
    app.include_router(realtime_router, prefix="/api", tags=["Real-Time Транскрипция"])  # Real-time маршруты
    
    @app.on_event("startup")
    async def startup_event():
        """Инициализация при запуске"""
        print("🚀 Запуск RedMadWhisp - AI Транскрипция с Google OAuth v2.1...")
        print("🔐 Google OAuth аутентификация включена")
        print("👥 Персональные транскрипции для каждого пользователя")
        print("🌐 CORS настроен для всех доменов")
        print("📋 Доступные форматы экспорта: JSON, SRT, VTT, TSV, DOCX, PDF")
        print("☁️ Автоматическая загрузка файлов на Yandex Cloud S3")
        print("🗑️ Автоматическая очистка локальных файлов после загрузки на S3")
        print("💾 JSON база данных для метаданных транскрипций и пользователей")
        print("🎙️ Real-time транскрипция включена (WebSocket: /api/realtime/ws)")
        
        # Инициализация real-time системы
        try:
            await initialize_realtime_system()
            print("✅ Real-time система инициализирована")
        except Exception as e:
            print(f"⚠️ Ошибка инициализации real-time системы: {e}")
        
        print("✅ Сервер готов к работе! Модели будут загружены при первом запросе.")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """Очистка ресурсов при остановке"""
        print("🔄 Остановка сервера...")
        try:
            await shutdown_realtime_system()
            print("✅ Real-time система остановлена")
        except Exception as e:
            print(f"⚠️ Ошибка остановки real-time системы: {e}")
        print("👋 Сервер остановлен")
    
    return app


# Создаем экземпляр приложения
app = create_app() 