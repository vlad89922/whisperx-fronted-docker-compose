"""
Роуты для аутентификации через Google OAuth
"""
import os
import uuid
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, status, Depends, Response, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.requests import Request

from ..services.auth_service import AuthService
from ..models.schemas import AuthResponse, User
from ..middleware.auth_middleware import get_current_user, get_current_user_optional


router = APIRouter()
auth_service = AuthService()


@router.get("/auth/google/login")
async def google_login(request: Request):
    """
    Инициация процесса аутентификации через Google
    
    Returns:
        RedirectResponse: Перенаправление на страницу аутентификации Google
    """
    try:
        # Генерируем состояние для защиты от CSRF
        state = str(uuid.uuid4())
        
        # Сохраняем состояние в сессии
        request.session['oauth_state'] = state
        
        # Получаем URL для аутентификации
        auth_url = auth_service.get_google_auth_url(state)
        
        return RedirectResponse(url=auth_url)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при инициации аутентификации: {str(e)}"
        )


@router.get("/auth/oauth/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    """
    Обработка callback от Google OAuth
    
    Args:
        request: HTTP запрос
        code: Код авторизации от Google
        state: Состояние для защиты от CSRF
        error: Ошибка от Google
        
    Returns:
        RedirectResponse: Перенаправление на фронтенд с токеном
    """
    try:
        # Проверяем на ошибки от Google
        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка аутентификации Google: {error}"
            )
        
        # Проверяем наличие кода
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Отсутствует код авторизации"
            )
        
        # Проверяем состояние для защиты от CSRF
        session_state = request.session.get('oauth_state')
        if not session_state or session_state != state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверное состояние OAuth"
            )
        
        # Обмениваем код на токен
        id_token = auth_service.exchange_code_for_token(code)
        if not id_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось получить токен от Google"
            )
        
        # Проверяем Google токен
        google_user = auth_service.verify_google_token(id_token)
        if not google_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный токен Google"
            )
        
        # Создаем или обновляем пользователя
        user = auth_service.create_or_update_user(google_user)
        
        # Создаем JWT токен
        access_token = auth_service.create_access_token(
            data={"sub": user.id, "email": user.email}
        )
        
        # Создаем сессию пользователя
        user_agent = request.headers.get("User-Agent")
        client_ip = request.client.host if request.client else None
        auth_service.create_user_session(user.id, user_agent, client_ip)
        
        # Очищаем состояние из сессии
        request.session.pop('oauth_state', None)
        
        # Создаем ответ с перенаправлением на фронтенд
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:8000')
        response = RedirectResponse(url=f"{frontend_url}?auth=success")
        
        # Устанавливаем cookie с токеном
        response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=60 * 60 * 24 * 7,  # 7 дней
            httponly=True,
            secure=False,  # В продакшене должно быть True для HTTPS
            samesite="lax"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обработке callback: {str(e)}"
        )


@router.post("/auth/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user)
):
    """
    Выход из системы
    
    Args:
        response: HTTP ответ
        current_user: Текущий пользователь
        
    Returns:
        dict: Сообщение об успешном выходе
    """
    try:
        # Удаляем все сессии пользователя
        auth_service.db_service.delete_user_sessions(current_user.id)
        
        # Удаляем cookie с токеном
        response.delete_cookie(key="access_token")
        
        return {"message": "Успешный выход из системы"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при выходе из системы: {str(e)}"
        )


@router.get("/auth/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Получение информации о текущем пользователе
    
    Args:
        current_user: Текущий пользователь
        
    Returns:
        User: Информация о пользователе
    """
    return current_user


@router.get("/auth/status")
async def auth_status(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Проверка статуса аутентификации
    
    Args:
        current_user: Текущий пользователь (опционально)
        
    Returns:
        dict: Статус аутентификации
    """
    if current_user:
        return {
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "name": current_user.name,
                "picture": current_user.picture
            }
        }
    else:
        return {
            "authenticated": False,
            "user": None
        } 