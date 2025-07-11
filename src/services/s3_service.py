"""
Сервис для работы с S3 (Yandex Cloud)
"""
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
from typing import Optional, Dict
from datetime import datetime

from ..config.settings import S3_CONFIG


class S3Service:
    """Сервис для работы с S3"""
    
    def __init__(self):
        self.client = self._create_client()
    
    def _create_client(self):
        """Создание клиента S3"""
        return boto3.client(
            's3',
            aws_access_key_id=S3_CONFIG['aws_access_key_id'],
            aws_secret_access_key=S3_CONFIG['aws_secret_access_key'],
            endpoint_url=S3_CONFIG['endpoint_url'],
            region_name=S3_CONFIG['region_name']
        )
    
    def upload_file(self, file_path: Path, object_name: str) -> Optional[str]:
        """
        Загрузка файла на S3 и получение публичной ссылки
        
        Args:
            file_path: Путь к локальному файлу
            object_name: Имя объекта в S3
        
        Returns:
            Публичная ссылка на файл или None в случае ошибки
        """
        try:
            # Загружаем файл
            print(f"📤 Загружаем {file_path.name} на S3 как {object_name}...")
            self.client.upload_file(str(file_path), S3_CONFIG['bucket_name'], object_name)
            
            # Устанавливаем публичный доступ
            self.client.put_object_acl(
                ACL='public-read',
                Bucket=S3_CONFIG['bucket_name'],
                Key=object_name
            )
            
            # Генерируем публичную ссылку
            public_url = f"{S3_CONFIG['endpoint_url']}/{S3_CONFIG['bucket_name']}/{object_name}"
            print(f"✅ Файл загружен на S3: {public_url}")
            
            return public_url
            
        except ClientError as e:
            print(f"❌ Ошибка загрузки на S3: {e}")
            return None
        except Exception as e:
            print(f"❌ Неожиданная ошибка при загрузке на S3: {e}")
            return None
    
    def upload_transcript_files(self, task_id: str, filename: str, subtitle_files: Dict[str, str]) -> Dict[str, str]:
        """
        Загрузка файлов транскрипции на S3
        
        Args:
            task_id: ID задачи
            filename: Оригинальное имя файла
            subtitle_files: Словарь с путями к файлам субтитров
        
        Returns:
            Словарь с публичными ссылками на файлы
        """
        s3_links = {}
        base_name = Path(filename).stem
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for format_type, file_path in subtitle_files.items():
            if not file_path or not Path(file_path).exists():
                continue
            
            s3_object_name = f"transcripts/{task_id}/{base_name}_{timestamp}.{format_type}"
            s3_url = self.upload_file(Path(file_path), s3_object_name)
            
            if s3_url:
                s3_links[format_type] = s3_url
        
        return s3_links
    
    def upload_original_file(self, task_id: str, filename: str, file_path: Path) -> Optional[str]:
        """
        Загрузка оригинального файла на S3
        
        Args:
            task_id: ID задачи
            filename: Оригинальное имя файла
            file_path: Путь к файлу
        
        Returns:
            Публичная ссылка на файл или None
        """
        base_name = Path(filename).stem
        file_extension = file_path.suffix
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        s3_object_name = f"originals/{task_id}/{base_name}_{timestamp}{file_extension}"
        
        return self.upload_file(file_path, s3_object_name)
    
    def upload_json_data(self, task_id: str, filename: str, data: dict) -> Optional[str]:
        """
        Загрузка JSON данных на S3
        
        Args:
            task_id: ID задачи
            filename: Оригинальное имя файла
            data: Данные для загрузки
        
        Returns:
            Публичная ссылка на файл или None
        """
        import json
        from ..config.settings import TEMP_DIR
        
        # Создаем временный JSON файл
        temp_json_file = TEMP_DIR / f"{task_id}_full.json"
        
        try:
            with open(temp_json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # Загружаем на S3
            base_name = Path(filename).stem
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            s3_object_name = f"transcripts/{task_id}/{base_name}_{timestamp}_full.json"
            
            s3_url = self.upload_file(temp_json_file, s3_object_name)
            
            return s3_url
            
        except Exception as e:
            print(f"❌ Ошибка загрузки JSON на S3: {e}")
            return None
        finally:
            # Удаляем временный файл
            if temp_json_file.exists():
                temp_json_file.unlink() 