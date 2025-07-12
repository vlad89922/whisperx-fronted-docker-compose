"""
Конфигурация приложения
"""
import os
from pathlib import Path

# Базовые пути
BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"
TEMP_DIR = DATA_DIR / "temp"
DATABASE_FILE = DATA_DIR / "transcriptions_db.json"

# Создаем директории
for dir_path in [DATA_DIR, UPLOADS_DIR, TRANSCRIPTS_DIR, TEMP_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Конфигурация S3 (Yandex Cloud)
S3_CONFIG = {
    'aws_access_key_id': os.getenv('S3_ACCESS_KEY', ''),
    'aws_secret_access_key': os.getenv('S3_SECRET_KEY', ''),
    'bucket_name': os.getenv('S3_BUCKET', 'your-bucket-name'),
    'endpoint_url': os.getenv('S3_ENDPOINT', 'https://storage.yandexcloud.net'),
    'region_name': os.getenv('S3_REGION', 'ru-central1')
}

# OAuth конфигурация
OAUTH_CONFIG = {
    'google_client_id': os.getenv('GOOGLE_CLIENT_ID', ''),
    'google_client_secret': os.getenv('GOOGLE_CLIENT_SECRET', ''),
    'redirect_uri': os.getenv('REDIRECT_URI', 'http://localhost:8880/api/auth/oauth/google/callback'),
    'scopes': ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']
}

# JWT конфигурация
JWT_CONFIG = {
    'secret_key': os.getenv('JWT_SECRET_KEY', ''),
    'algorithm': 'HS256',
    'access_token_expire_minutes': 60 * 24 * 7,  # 7 дней
    'refresh_token_expire_minutes': 60 * 24 * 30  # 30 дней
}

# Поддерживаемые форматы
SUPPORTED_FORMATS = {
    # Аудио
    'mp3', 'm4a', 'wav', 'flac', 'ogg', 'wma', 'aac', 'opus',
    # Видео
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', '3gp', 'mts'
}

# Настройки сервера
SERVER_CONFIG = {
    'host': '0.0.0.0',
    'port': 8880,
    'reload': False,
    'log_level': 'info'
}

# CORS настройки
CORS_ORIGINS = [
    "http://localhost:8000",
    "http://localhost:8880",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://0.0.0.0:8000",
    "http://localhost:8880",
    "http://127.0.0.1:8880",
    "*"
]

# Настройки обработки
PROCESSING_CONFIG = {
    'max_workers': 2,
    'default_model': 'large-v3',
    'default_language': 'ru',
    'default_compute_type': 'float16',
    'default_batch_size': 16
}

# Настройки суммаризации
SUMMARIZATION_CONFIG = {
    'api_url': os.getenv('SUMMARIZATION_API_URL', 'http://localhost:11434/v1/chat/completions'),
    'api_key': os.getenv('SUMMARIZATION_API_KEY', 'your-api-key-here'),
    'model': os.getenv('SUMMARIZATION_MODEL', 'llama3.1:8b'),
    'max_tokens': int(os.getenv('SUMMARIZATION_MAX_TOKENS', '4000')),
    'temperature': float(os.getenv('SUMMARIZATION_TEMPERATURE', '0.1'))
} 