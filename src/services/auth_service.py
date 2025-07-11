"""
Сервис аутентификации с Google OAuth
"""
import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow

from ..config.settings import OAUTH_CONFIG, JWT_CONFIG
from ..models.schemas import GoogleUser, User, UserSession, TokenData
from ..services.database_service import DatabaseService


class AuthService:
    """Сервис для работы с аутентификацией"""
    
    def __init__(self):
        """Инициализация сервиса аутентификации"""
        self.db_service = DatabaseService()
        self.secret_key = JWT_CONFIG['secret_key']
        self.algorithm = JWT_CONFIG['algorithm']
        self.access_token_expire_minutes = JWT_CONFIG['access_token_expire_minutes']
        
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Создание JWT токена доступа
        
        Args:
            data: Данные для включения в токен
            expires_delta: Время жизни токена
            
        Returns:
            str: JWT токен
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        return encoded_jwt
    
    def verify_access_token(self, token: str) -> Optional[TokenData]:
        """
        Проверка JWT токена
        
        Args:
            token: JWT токен для проверки
            
        Returns:
            TokenData: Данные из токена или None если токен невалиден
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            
            if user_id is None:
                return None
                
            token_data = TokenData(user_id=user_id, email=email)
            return token_data
            
        except JWTError:
            return None
    
    def verify_google_token(self, token: str) -> Optional[GoogleUser]:
        """
        Проверка Google ID токена
        
        Args:
            token: Google ID токен
            
        Returns:
            GoogleUser: Данные пользователя Google или None
        """
        try:
            # Проверяем токен через Google API
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                OAUTH_CONFIG['google_client_id']
            )
            
            # Проверяем, что токен от Google
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                return None
                
            google_user = GoogleUser(
                email=idinfo['email'],
                name=idinfo['name'],
                picture=idinfo.get('picture'),
                google_id=idinfo['sub'],
                locale=idinfo.get('locale')
            )
            
            return google_user
            
        except ValueError:
            # Токен невалиден
            return None
    
    def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        """
        Получение пользователя по Google ID
        
        Args:
            google_id: Google ID пользователя
            
        Returns:
            User: Пользователь или None
        """
        users_data = self.db_service.get_users()
        
        for user_data in users_data:
            if user_data.get('google_id') == google_id:
                return User(**user_data)
                
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Получение пользователя по ID
        
        Args:
            user_id: ID пользователя
            
        Returns:
            User: Пользователь или None
        """
        users_data = self.db_service.get_users()
        
        for user_data in users_data:
            if user_data.get('id') == user_id:
                return User(**user_data)
                
        return None
    
    def create_or_update_user(self, google_user: GoogleUser) -> User:
        """
        Создание или обновление пользователя
        
        Args:
            google_user: Данные пользователя Google
            
        Returns:
            User: Созданный или обновленный пользователь
        """
        # Проверяем, существует ли пользователь
        existing_user = self.get_user_by_google_id(google_user.google_id)
        
        current_time = datetime.utcnow()
        
        if existing_user:
            # Обновляем существующего пользователя
            user_data = {
                'id': existing_user.id,
                'email': google_user.email,
                'name': google_user.name,
                'picture': google_user.picture,
                'google_id': google_user.google_id,
                'created_at': existing_user.created_at,
                'last_login': current_time,
                'is_active': True
            }
            
            self.db_service.update_user(existing_user.id, user_data)
            
        else:
            # Создаем нового пользователя
            user_id = str(uuid.uuid4())
            user_data = {
                'id': user_id,
                'email': google_user.email,
                'name': google_user.name,
                'picture': google_user.picture,
                'google_id': google_user.google_id,
                'created_at': current_time,
                'last_login': current_time,
                'is_active': True
            }
            
            self.db_service.create_user(user_data)
            
        return User(**user_data)
    
    def create_user_session(self, user_id: str, user_agent: Optional[str] = None, 
                          ip_address: Optional[str] = None) -> UserSession:
        """
        Создание пользовательской сессии
        
        Args:
            user_id: ID пользователя
            user_agent: User-Agent браузера
            ip_address: IP адрес пользователя
            
        Returns:
            UserSession: Созданная сессия
        """
        session_token = str(uuid.uuid4())
        current_time = datetime.utcnow()
        expires_at = current_time + timedelta(minutes=self.access_token_expire_minutes)
        
        session_data = {
            'user_id': user_id,
            'session_token': session_token,
            'expires_at': expires_at,
            'created_at': current_time,
            'user_agent': user_agent,
            'ip_address': ip_address
        }
        
        self.db_service.create_user_session(session_data)
        
        return UserSession(**session_data)
    
    def get_google_auth_url(self, state: str) -> str:
        """
        Получение URL для аутентификации через Google
        
        Args:
            state: Состояние для защиты от CSRF
            
        Returns:
            str: URL для аутентификации
        """
        scopes = OAUTH_CONFIG['scopes']  # Используем scopes как есть, без добавления префикса
        
        auth_url = (
            f"https://accounts.google.com/o/oauth2/auth?"
            f"client_id={OAUTH_CONFIG['google_client_id']}&"
            f"redirect_uri={OAUTH_CONFIG['redirect_uri']}&"
            f"scope={' '.join(scopes)}&"
            f"response_type=code&"
            f"state={state}&"
            f"access_type=offline&"
            f"prompt=consent"
        )
        
        return auth_url
    
    def exchange_code_for_token(self, code: str) -> Optional[str]:
        """
        Обмен кода авторизации на токен доступа
        
        Args:
            code: Код авторизации от Google
            
        Returns:
            str: ID токен или None при ошибке
        """
        try:
            import requests as http_requests
            
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                'client_id': OAUTH_CONFIG['google_client_id'],
                'client_secret': OAUTH_CONFIG['google_client_secret'],
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': OAUTH_CONFIG['redirect_uri']
            }
            
            response = http_requests.post(token_url, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                return token_data.get('id_token')
            else:
                return None
                
        except Exception as e:
            print(f"Ошибка при обмене кода на токен: {e}")
            return None 