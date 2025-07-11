"""
Модели данных для API
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr  # Включено обратно
from datetime import datetime


# Модели аутентификации
class GoogleUser(BaseModel):
    """Модель пользователя Google"""
    email: EmailStr  # Включено обратно
    name: str
    picture: Optional[str] = None
    google_id: str
    locale: Optional[str] = None


class User(BaseModel):
    """Модель пользователя в системе"""
    id: str
    email: EmailStr  # Включено обратно
    name: str
    picture: Optional[str] = None
    google_id: str
    created_at: datetime
    last_login: datetime
    is_active: bool = True


class UserSession(BaseModel):
    """Модель пользовательской сессии"""
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None


class AuthResponse(BaseModel):
    """Ответ при аутентификации"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_info: User


class TokenData(BaseModel):
    """Данные из JWT токена"""
    user_id: Optional[str] = None
    email: Optional[str] = None


# Существующие модели транскрипции
class TranscriptionConfig(BaseModel):
    """Конфигурация для транскрипции"""
    model: str = "large-v3"
    language: str = "ru"
    diarize: bool = False
    hf_token: Optional[str] = None
    compute_type: str = "auto"
    batch_size: int = 16


class TranscriptionStatus(BaseModel):
    """Статус транскрипции"""
    id: str
    status: str  # pending, processing, completed, failed
    filename: str
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    progress: Optional[str] = None
    progress_percent: Optional[int] = None
    user_id: Optional[str] = None  # Добавляем связь с пользователем


class TranscriptionResult(BaseModel):
    """Результат транскрипции"""
    id: str
    filename: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    transcript_file: Optional[str] = None
    audio_file: Optional[str] = None
    subtitle_files: Optional[Dict[str, str]] = None
    s3_links: Optional[Dict[str, str]] = None
    segments: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    progress: Optional[str] = None
    progress_percent: Optional[int] = None
    user_id: Optional[str] = None  # Добавляем связь с пользователем


class TranscriptionListItem(BaseModel):
    """Элемент списка транскрипций"""
    id: str
    filename: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    transcript_file: Optional[str] = None
    audio_file: Optional[str] = None
    subtitle_files: Optional[Dict[str, str]] = None
    s3_links: Optional[Dict[str, str]] = None
    error: Optional[str] = None
    progress: Optional[str] = None
    progress_percent: Optional[int] = None
    user_id: Optional[str] = None  # Добавляем связь с пользователем 