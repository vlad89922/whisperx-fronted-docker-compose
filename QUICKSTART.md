# ⚡ Быстрый старт - 5 минут до запуска

## 📋 Что нужно:
- **Ubuntu 20.04+** 
- **NVIDIA GPU 8GB+**
- **Docker** + **NVIDIA Container Toolkit**
- **NVIDIA драйверы 470+**

## 🚀 Запуск:

### 1. Клонируем и настраиваем
```bash
git clone https://github.com/your-repo/whisperx-fronted-docker-compose
cd whisperx-fronted-docker-compose
cp .env.example .env
```

### 2. Настраиваем Google OAuth
```bash
# Идем на https://console.cloud.google.com/apis/credentials
# Создаем OAuth 2.0 Client ID
# Добавляем redirect URI: http://localhost:8880/api/auth/oauth/google/callback
# Копируем Client ID и Secret в .env файл
```

### 3. Запускаем vLLM (для AI суммаризации)
```bash
# В отдельном терминале
docker run --gpus all -p 11434:8000 \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --guided-decoding-backend xgrammar
```

### 4. Запускаем приложение
```bash
docker-compose build
docker-compose up -d
```

### 5. Готово!
Открываем http://localhost:8000

## 🔧 Минимальная настройка .env:

```bash
# Обязательно заполнить:
GOOGLE_CLIENT_ID=ваш-google-client-id
GOOGLE_CLIENT_SECRET=ваш-google-client-secret

# Остальное можно оставить как есть
SUMMARIZATION_API_URL=http://localhost:11434/v1/chat/completions
SUMMARIZATION_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

## ❓ Проблемы?

**GPU не найдена:**
```bash
# Установите NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**vLLM не запускается:**
```bash
# Проверьте что модель поддерживает 32K+ токенов
# Llama-3.1-8B-Instruct поддерживает 128K токенов
```

**OAuth ошибка:**
- Проверьте что redirect URI точно совпадает
- Убедитесь что Google+ API включен в проекте

## 🎯 Что получите:
- ✅ Транскрипция аудио/видео
- ✅ Разделение спикеров  
- ✅ AI суммаризация
- ✅ 6 форматов экспорта
- ✅ Real-time транскрипция
- ✅ Chrome расширение 