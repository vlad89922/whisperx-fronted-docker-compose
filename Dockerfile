# whisperx-fronted-docker-compose - AI Транскрипция с GPU поддержкой
# Базовый образ PyTorch с CUDA и cuDNN для GPU ускорения

FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel as base

# Метаданные
LABEL maintainer="whisperx-fronted-docker-compose Team"
LABEL description="AI-powered transcription service with WhisperX and GPU support"
LABEL version="2.0.0"

# Переменные окружения
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    # Основные системные пакеты
    build-essential \
    curl \
    git \
    wget \
    # Аудио/видео обработка
    ffmpeg \
    libsndfile1 \
    # Очистка кеша
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Исправляем проблему совместимости cuDNN
# Создаем символические ссылки для cuDNN 8.x совместимости
RUN cd /opt/conda/lib/python*/site-packages/nvidia/cudnn/lib && \
    ln -sf libcudnn.so.9 libcudnn.so.8 && \
    ln -sf libcudnn_ops.so.9 libcudnn_ops_infer.so.8 && \
    ln -sf libcudnn_cnn.so.9 libcudnn_cnn_infer.so.8 && \
    ln -sf libcudnn_adv.so.9 libcudnn_adv_infer.so.8 && \
    echo "cuDNN compatibility links created"

# Обновляем LD_LIBRARY_PATH для поиска cuDNN библиотек
ENV LD_LIBRARY_PATH="/opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib:${LD_LIBRARY_PATH}"

# Создаем пользователя для безопасности
RUN groupadd -r whisperx && useradd -r -g whisperx -d /app -s /bin/bash whisperx

# Создаем рабочую директорию
WORKDIR /app

# Копируем весь проект для установки
COPY . .

# Устанавливаем uv для быстрой установки зависимостей
RUN python -m pip install --upgrade pip && pip install uv

# Устанавливаем Python зависимости из pyproject.toml
# Принудительно переустанавливаем PyTorch с правильной версией
RUN uv pip install --system --no-cache \
    "torch>=2.6.0" \
    "torchaudio>=2.6.0" \
    "torchvision>=0.21.0"

# Устанавливаем остальные зависимости из requirements.txt
RUN uv pip install --system --no-cache -r requirements.txt

# Создаем необходимые директории и устанавливаем права
RUN mkdir -p data/temp data/uploads data/transcripts && \
    mkdir -p /root/.cache/whisperx /root/.cache/huggingface /root/.cache/torch && \
    chown -R whisperx:whisperx /app

# Переключаемся на пользователя whisperx
USER whisperx

# Создаем init script для установки прав на volume при старте
RUN echo '#!/bin/bash\n\
# Устанавливаем права на директории, которые могут быть volume\n\
if [ -d "/app/data" ]; then\n\
    # Проверяем, есть ли права записи\n\
    if [ ! -w "/app/data" ]; then\n\
        echo "⚠️  Директория /app/data не доступна для записи. Попытка исправить..."\n\
        # Создаем файл с правами, если его нет\n\
        touch /app/data/.permissions_test 2>/dev/null || echo "❌ Нет прав записи в /app/data"\n\
    fi\n\
    # Создаем необходимые поддиректории\n\
    mkdir -p /app/data/temp /app/data/uploads /app/data/transcripts 2>/dev/null || true\n\
fi\n\
exec "$@"' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Открываем порты
EXPOSE 8880 8000

# Проверка здоровья контейнера
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8880/health || exit 1

# Точка входа для установки прав
ENTRYPOINT ["/app/entrypoint.sh"]

# Команда по умолчанию
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8880"] 