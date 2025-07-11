"""
Сервис для работы с JSON базой данных
"""
import json
import threading
from typing import Dict, List, Optional
from datetime import datetime

from ..config.settings import DATABASE_FILE


class DatabaseService:
    """Сервис для работы с JSON базой данных"""
    
    def __init__(self):
        self.lock = threading.Lock()
    
    def load_database(self) -> Dict:
        """Загрузка базы данных из JSON файла"""
        with self.lock:
            if DATABASE_FILE.exists():
                try:
                    with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        # Обеспечиваем структуру базы данных
                        if 'transcriptions' not in data:
                            data['transcriptions'] = {}
                        if 'users' not in data:
                            data['users'] = {}
                        if 'sessions' not in data:
                            data['sessions'] = {}
                        return data
                except (json.JSONDecodeError, Exception) as e:
                    print(f"⚠️ Ошибка загрузки базы данных: {e}")
                    return {'transcriptions': {}, 'users': {}, 'sessions': {}}
            return {'transcriptions': {}, 'users': {}, 'sessions': {}}
    
    def save_database(self, db_data: Dict):
        """Сохранение базы данных в JSON файл"""
        with self.lock:
            try:
                # Конвертируем datetime объекты в строки для JSON сериализации
                def convert_datetime(obj):
                    if isinstance(obj, datetime):
                        return obj.isoformat()
                    elif isinstance(obj, dict):
                        return {k: convert_datetime(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_datetime(item) for item in obj]
                    return obj
                
                serializable_data = convert_datetime(db_data)
                
                with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
                    json.dump(serializable_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"❌ Ошибка сохранения базы данных: {e}")
    
    # Методы для работы с транскрипциями
    def add_transcription(self, transcription_data: Dict):
        """Добавление транскрипции в базу данных"""
        db = self.load_database()
        db['transcriptions'][transcription_data['id']] = transcription_data
        self.save_database(db)
        print(f"✅ Транскрипция {transcription_data['id']} добавлена в базу данных")
    
    def get_transcription(self, task_id: str) -> Optional[Dict]:
        """Получение транскрипции из базы данных"""
        db = self.load_database()
        return db['transcriptions'].get(task_id)
    
    def update_transcription(self, task_id: str, updates: Dict):
        """Обновление транскрипции в базе данных"""
        db = self.load_database()
        if task_id in db['transcriptions']:
            db['transcriptions'][task_id].update(updates)
            self.save_database(db)
            print(f"✅ Транскрипция {task_id} обновлена в базе данных")
    
    def delete_transcription(self, task_id: str) -> bool:
        """Удаление транскрипции из базы данных"""
        db = self.load_database()
        if task_id in db['transcriptions']:
            del db['transcriptions'][task_id]
            self.save_database(db)
            print(f"✅ Транскрипция {task_id} удалена из базы данных")
            return True
        return False
    
    def get_all_transcriptions(self) -> List[Dict]:
        """Получение всех транскрипций из базы данных"""
        db = self.load_database()
        # Сортируем по дате создания (новые сначала)
        transcriptions = list(db['transcriptions'].values())
        transcriptions.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return transcriptions
    
    def get_user_transcriptions(self, user_id: str) -> List[Dict]:
        """Получение транскрипций пользователя"""
        db = self.load_database()
        user_transcriptions = []
        
        for transcription in db['transcriptions'].values():
            if transcription.get('user_id') == user_id:
                user_transcriptions.append(transcription)
        
        # Сортируем по дате создания (новые сначала)
        user_transcriptions.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return user_transcriptions
    
    def create_transcription_record(self, task_id: str, filename: str, status: str = "pending", **kwargs) -> Dict:
        """Создание записи транскрипции"""
        record = {
            "id": task_id,
            "filename": filename,
            "status": status,
            "created_at": datetime.now().isoformat(),
            "s3_links": {},
            **kwargs
        }
        return record
    
    def create_error_record(self, task_id: str, filename: str, error_msg: str, user_id: str = None) -> Dict:
        """Создание записи об ошибке"""
        return self.create_transcription_record(
            task_id=task_id,
            filename=filename,
            status="failed",
            error=error_msg,
            user_id=user_id
        )
    
    def create_completed_record(self, task_id: str, filename: str, s3_links: Dict, **kwargs) -> Dict:
        """Создание записи о завершенной транскрипции"""
        return self.create_transcription_record(
            task_id=task_id,
            filename=filename,
            status="completed",
            completed_at=datetime.now().isoformat(),
            s3_links=s3_links,
            **kwargs
        )
    
    # Методы для работы с пользователями
    def create_user(self, user_data: Dict):
        """Создание пользователя в базе данных"""
        db = self.load_database()
        db['users'][user_data['id']] = user_data
        self.save_database(db)
        print(f"✅ Пользователь {user_data['email']} создан в базе данных")
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        """Получение пользователя по ID"""
        db = self.load_database()
        return db['users'].get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Получение пользователя по email"""
        db = self.load_database()
        for user in db['users'].values():
            if user.get('email') == email:
                return user
        return None
    
    def get_user_by_google_id(self, google_id: str) -> Optional[Dict]:
        """Получение пользователя по Google ID"""
        db = self.load_database()
        for user in db['users'].values():
            if user.get('google_id') == google_id:
                return user
        return None
    
    def update_user(self, user_id: str, updates: Dict):
        """Обновление пользователя в базе данных"""
        db = self.load_database()
        if user_id in db['users']:
            db['users'][user_id].update(updates)
            self.save_database(db)
            print(f"✅ Пользователь {user_id} обновлен в базе данных")
    
    def get_users(self) -> List[Dict]:
        """Получение всех пользователей"""
        db = self.load_database()
        return list(db['users'].values())
    
    # Методы для работы с сессиями
    def create_user_session(self, session_data: Dict):
        """Создание пользовательской сессии"""
        db = self.load_database()
        db['sessions'][session_data['session_token']] = session_data
        self.save_database(db)
        print(f"✅ Сессия для пользователя {session_data['user_id']} создана")
    
    def get_user_session(self, session_token: str) -> Optional[Dict]:
        """Получение сессии по токену"""
        db = self.load_database()
        return db['sessions'].get(session_token)
    
    def delete_user_session(self, session_token: str) -> bool:
        """Удаление пользовательской сессии"""
        db = self.load_database()
        if session_token in db['sessions']:
            del db['sessions'][session_token]
            self.save_database(db)
            print(f"✅ Сессия {session_token} удалена")
            return True
        return False
    
    def delete_user_sessions(self, user_id: str) -> int:
        """Удаление всех сессий пользователя"""
        db = self.load_database()
        deleted_count = 0
        
        sessions_to_delete = []
        for session_token, session_data in db['sessions'].items():
            if session_data.get('user_id') == user_id:
                sessions_to_delete.append(session_token)
        
        for session_token in sessions_to_delete:
            del db['sessions'][session_token]
            deleted_count += 1
        
        if deleted_count > 0:
            self.save_database(db)
            print(f"✅ Удалено {deleted_count} сессий пользователя {user_id}")
        
        return deleted_count 