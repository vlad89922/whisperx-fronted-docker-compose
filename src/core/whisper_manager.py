"""
Менеджер для работы с моделями WhisperX
"""
import os
import threading
import torch
from typing import Optional, Callable

import whisperx

from ..models.schemas import TranscriptionConfig


class WhisperManager:
    """Менеджер для работы с моделями WhisperX"""
    
    def __init__(self):
        self.model = None
        self.align_model = None
        self.align_metadata = None
        self.diarize_model = None
        self.models_loaded = False
        self.loading_lock = threading.Lock()
        self.device = self._detect_device()
        self.compute_type = self._detect_compute_type()
        print(f"🔧 Обнаружено устройство: {self.device}, compute_type: {self.compute_type}")
    
    def _detect_device(self) -> str:
        """Определение доступного устройства"""
        if torch.cuda.is_available():
            return "cuda"
        else:
            return "cpu"
    
    def _detect_compute_type(self) -> str:
        """Автоматическое определение compute_type"""
        if self.device == "cuda":
            # Проверяем поддержку float16 на GPU
            try:
                # Пробуем создать тензор float16 на GPU
                test_tensor = torch.tensor([1.0], dtype=torch.float16, device="cuda")
                return "float16"
            except Exception:
                return "float32"
        else:
            # Для CPU используем int8 для лучшей производительности
            return "int8"
    
    def load_models(self, config: TranscriptionConfig, status_callback: Optional[Callable] = None):
        """Загрузка моделей WhisperX в память"""
        with self.loading_lock:
            if self.models_loaded:
                return
            
            # Определяем compute_type
            compute_type = config.compute_type
            if compute_type == "auto":
                compute_type = self.compute_type
                print(f"🔧 Автоматически выбран compute_type: {compute_type}")
            
            if status_callback:
                status_callback("loading_whisper_model", "Загрузка модели Whisper...", 20)
            print(f"🔧 Загрузка модели Whisper: {config.model}")
            self.model = whisperx.load_model(
                config.model, 
                self.device, 
                compute_type=compute_type
            )
            
            if status_callback:
                status_callback("loading_align_model", "Загрузка модели выравнивания...", 25)
            print("🔧 Загрузка модели выравнивания...")
            
            # Попытка загрузить модель выравнивания с обработкой ошибок
            try:
                self.align_model, self.align_metadata = whisperx.load_align_model(
                    language_code=config.language, 
                    device=self.device
                )
            except Exception as e:
                print(f"⚠️ Не удалось загрузить модель выравнивания для языка '{config.language}': {e}")
                print("🔧 Попытка загрузить универсальную модель выравнивания...")
                try:
                    # Попробуем загрузить для английского языка как fallback
                    self.align_model, self.align_metadata = whisperx.load_align_model(
                        language_code="en", 
                        device=self.device
                    )
                    print("✅ Загружена английская модель выравнивания как fallback")
                except Exception as e2:
                    print(f"❌ Не удалось загрузить модель выравнивания: {e2}")
                    print("⚠️ Транскрипция будет выполнена без точного выравнивания временных меток")
                    self.align_model = None
                    self.align_metadata = None
            
            if config.diarize and config.hf_token:
                if status_callback:
                    status_callback("loading_diarize_model", "Загрузка модели диаризации...", 28)
                print("🔧 Загрузка модели диаризации...")
                print(f"🔑 HF Token для диаризации: {config.hf_token[:20]}...{config.hf_token[-10:] if len(config.hf_token) > 30 else config.hf_token}")
                print(f"🔑 Длина токена: {len(config.hf_token)} символов")
                print(f"🔑 Токен начинается с 'hf_': {config.hf_token.startswith('hf_')}")
                self.diarize_model = whisperx.diarize.DiarizationPipeline(
                    use_auth_token=config.hf_token, 
                    device=self.device
                )
            
            self.models_loaded = True
            print("✅ Модели загружены успешно!")
    
    def transcribe_audio(self, audio_path: str, config: TranscriptionConfig, status_callback: Optional[Callable] = None) -> dict:
        """
        Выполнение транскрипции аудио
        
        Args:
            audio_path: Путь к аудио файлу
            config: Конфигурация транскрипции
            status_callback: Callback для обновления статуса
        
        Returns:
            Результат транскрипции
        """
        if not self.models_loaded:
            self.load_models(config, status_callback)
        
        # Загружаем аудио
        if status_callback:
            status_callback("loading_audio", "Загрузка аудио файла...", 32)
        print(f"🎵 Загрузка аудио файла: {audio_path}")
        audio = whisperx.load_audio(audio_path)
        
        # Транскрипция
        if status_callback:
            status_callback("transcribing", "Выполнение транскрипции...", 45)
        print("🎯 Выполнение транскрипции...")
        result = self.model.transcribe(audio, batch_size=config.batch_size)
        
        # Выравнивание
        if self.align_model and self.align_metadata:
            if status_callback:
                status_callback("aligning", "Выравнивание текста...", 65)
            print("📐 Выравнивание текста...")
            result = whisperx.align(
                result["segments"], 
                self.align_model, 
                self.align_metadata, 
                audio, 
                self.device
            )
        
        # Диаризация (если включена)
        if config.diarize and self.diarize_model:
            if status_callback:
                status_callback("diarizing", "Диаризация спикеров...", 72)
            print("👥 Диаризация спикеров...")
            diarize_segments = self.diarize_model(audio)
            result = whisperx.assign_word_speakers(diarize_segments, result)
        
        return result
    
    async def transcribe_audio_chunk(self, audio_data, sample_rate: int = 16000, language: str = "ru") -> str:
        """
        Транскрипция аудио чанка для real-time режима
        
        Args:
            audio_data: Numpy array с аудио данными
            sample_rate: Частота дискретизации
            language: Язык для транскрипции
            
        Returns:
            str: Результат транскрипции
        """
        if not self.models_loaded:
            # Для real-time нужно загрузить базовую конфигурацию
            from ..models.schemas import TranscriptionConfig
            basic_config = TranscriptionConfig(
                model="base",
                language=language,
                compute_type="auto",
                batch_size=16,
                diarize=False,
                hf_token=""
            )
            self.load_models(basic_config)
        
        try:
            # Убеждаемся, что audio_data - это numpy array float32
            import numpy as np
            if not isinstance(audio_data, np.ndarray):
                audio_data = np.array(audio_data, dtype=np.float32)
            elif audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # WhisperX ожидает аудио с частотой 16kHz, нужно ресемплировать если нужно
            if sample_rate != 16000:
                # Простое ресемплирование (в продакшене лучше использовать librosa)
                import scipy.signal
                target_length = int(len(audio_data) * 16000 / sample_rate)
                audio_data = scipy.signal.resample(audio_data, target_length)
            
            # Транскрибируем аудио чанк
            result = self.model.transcribe(audio_data, batch_size=1)
            
            # Извлекаем текст из результата
            if result and "segments" in result and result["segments"]:
                text_parts = []
                for segment in result["segments"]:
                    if "text" in segment:
                        text_parts.append(segment["text"].strip())
                
                return " ".join(text_parts).strip()
            
            return ""
            
        except Exception as e:
            print(f"❌ Ошибка транскрипции чанка: {e}")
            return ""
    
    @property
    def is_loaded(self) -> bool:
        """Проверка загружены ли модели"""
        return self.models_loaded 