"""
Middleware для аутентификации пользователей
"""
from typing import Optional
from fastapi import HTTPException, status, Depends, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..services.auth_service import AuthService
from ..models.schemas import User, TokenData


# Создаем экземпляр HTTPBearer для извлечения токенов из заголовков
security = HTTPBearer(auto_error=False)


class AuthMiddleware:
    """Middleware для аутентификации"""
    
    def __init__(self):
        """Инициализация middleware аутентификации"""
        self.auth_service = AuthService()
    
    async def get_current_user(
        self, 
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        access_token: Optional[str] = Cookie(None)
    ) -> User:
        """
        Получение текущего пользователя из JWT токена
        
        Args:
            request: HTTP запрос
            credentials: Токен из заголовка Authorization
            access_token: Токен из cookie
            
        Returns:
            User: Текущий пользователь
            
        Raises:
            HTTPException: Если пользователь не аутентифицирован
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима аутентификация",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        # Пытаемся получить токен из заголовка или cookie
        token = None
        if credentials:
            token = credentials.credentials
        elif access_token:
            token = access_token
        
        if not token:
            raise credentials_exception
        
        # Проверяем токен
        token_data = self.auth_service.verify_access_token(token)
        if token_data is None:
            raise credentials_exception
        
        # Получаем пользователя
        user = self.auth_service.get_user_by_id(token_data.user_id)
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Неактивный пользователь"
            )
        
        return user
    
    async def get_current_user_optional(
        self, 
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        access_token: Optional[str] = Cookie(None)
    ) -> Optional[User]:
        """
        Получение текущего пользователя (опционально)
        
        Args:
            request: HTTP запрос
            credentials: Токен из заголовка Authorization
            access_token: Токен из cookie
            
        Returns:
            Optional[User]: Текущий пользователь или None
        """
        try:
            return await self.get_current_user(request, credentials, access_token)
        except HTTPException:
            return None
    
    async def get_current_active_user(
        self,
        current_user: User = Depends(lambda: auth_middleware.get_current_user)
    ) -> User:
        """
        Получение текущего активного пользователя
        
        Args:
            current_user: Текущий пользователь
            
        Returns:
            User: Активный пользователь
            
        Raises:
            HTTPException: Если пользователь неактивен
        """
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Неактивный пользователь"
            )
        return current_user


# Создаем глобальный экземпляр middleware
auth_middleware = AuthMiddleware()


# Зависимости для использования в роутах
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None)
) -> User:
    """Зависимость для получения текущего пользователя"""
    return await auth_middleware.get_current_user(request, credentials, access_token)


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None)
) -> Optional[User]:
    """Зависимость для получения текущего пользователя (опционально)"""
    return await auth_middleware.get_current_user_optional(request, credentials, access_token)


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Зависимость для получения текущего активного пользователя"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Неактивный пользователь"
        )
    return current_user 