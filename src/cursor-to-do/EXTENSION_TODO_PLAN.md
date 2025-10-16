# 📋 TODO План - whisperx-fronted-docker-compose Chrome Extension (С простой авторизацией)

## 🎯 Цель проекта
Chrome расширение с простой авторизацией: проверить статус → записать → загрузить → уведомление

**Важно**: Записи должны быть привязаны к пользователю!

**Реальный API**: `https://redmadtranscribe-api.neuraldeep.tech/`

---

## 📅 День 1: Базовая структура и авторизация

### ✅ 1.1 Создание структуры проекта
- [ ] Создать папку `whisperx-fronted-docker-compose-extension/`
- [ ] Создать базовую структуру файлов:
  ```
  whisperx-fronted-docker-compose-extension/
  ├── manifest.json
  ├── popup/
  │   ├── popup.html
  │   ├── popup.js
  │   └── popup.css
  ├── background.js
  └── icons/
      ├── icon16.png
      ├── icon48.png
      └── icon128.png
  ```

### ✅ 1.2 Настройка manifest.json без storage
- [ ] Создать `manifest.json` для Manifest V3 с минимальными permissions:
  ```json
  {
    "manifest_version": 3,
    "name": "whisperx-fronted-docker-compose Meeting Recorder",
    "version": "1.0.0",
    "description": "Record meeting audio and transcribe with whisperx-fronted-docker-compose",
    "permissions": [
      "tabCapture",
      "activeTab", 
      "notifications"
    ]
  }
  ```

### ✅ 1.3 Создание UI с авторизацией
- [ ] Создать `popup/popup.html`:
  - Секция авторизации (login/user info)
  - Кнопка "Войти через Google"
  - Информация о пользователе + кнопка "Выйти"
  - Секция записи (показывается только после авторизации)
  - Кнопки записи и таймер

- [ ] Создать `popup/popup.css`:
  - Стили для секций авторизации и записи
  - Скрытие/показ элементов в зависимости от статуса
  - Пульсирующая анимация для записи

### ✅ 1.4 Реализация проверки авторизации
- [ ] В `popup.js` создать функции:
  ```javascript
  // Проверка статуса авторизации
  async function checkAuthStatus() {
    const response = await fetch(`${API_BASE}/auth/status`, {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.authenticated && data.user) {
      showAuthenticatedState(data.user);
    } else {
      showUnauthenticatedState();
    }
  }
  
  // Показ/скрытие UI элементов
  function showAuthenticatedState(user) {
    // Показать секцию записи, скрыть логин
  }
  
  function showUnauthenticatedState() {
    // Показать логин, скрыть секцию записи
  }
  ```

### ✅ 1.5 Тестирование авторизации
- [ ] Загрузить расширение в Chrome
- [ ] Протестировать проверку статуса авторизации
- [ ] Проверить переход на страницу входа
- [ ] Убедиться что UI корректно переключается

---

## 📅 День 2: Запись аудио и интеграция с API

### ✅ 2.1 Реализация записи аудио
- [ ] В `background.js` создать функции записи:
  ```javascript
  let currentUser = null;
  
  async function startRecording() {
    if (!currentUser) {
      throw new Error('Нет данных пользователя');
    }
    
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: false
    });
    
    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    });
    
    // Логика записи...
  }
  ```

### ✅ 2.2 Передача данных пользователя
- [ ] Передача пользователя из popup в background:
  ```javascript
  // В popup.js
  const response = await chrome.runtime.sendMessage({
    action: 'startRecording',
    user: currentUser  // Передаем данные пользователя
  });
  
  // В background.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startRecording') {
      currentUser = request.user; // Сохраняем в памяти
      startRecording().then(sendResponse);
    }
  });
  ```

### ✅ 2.3 Интеграция с API загрузки
- [ ] Создать функцию загрузки с привязкой к пользователю:
  ```javascript
  async function uploadRecording() {
    if (!currentUser) {
      throw new Error('Нет данных пользователя');
    }
    
    const audioBlob = new Blob(recordedChunks, {type: 'audio/webm'});
    const formData = new FormData();
    
    // Включаем email пользователя в имя файла
    formData.append('file', audioBlob, `meeting-${currentUser.email}-${Date.now()}.webm`);
    formData.append('diarize', 'true');
    formData.append('language', 'auto');
    
    const response = await fetch('https://redmadtranscribe-api.neuraldeep.tech/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
  }
  ```

### ✅ 2.4 Обработка ошибок авторизации
- [ ] Обработка ошибки 401 (неавторизован):
  ```javascript
  if (response.status === 401) {
    notifyPopup('uploadError', 'Ошибка авторизации. Войдите заново.');
  }
  ```

- [ ] Очистка данных пользователя после загрузки:
  ```javascript
  } finally {
    currentUser = null; // Очищаем из памяти
  }
  ```

### ✅ 2.5 Система уведомлений
- [ ] Уведомление с именем пользователя:
  ```javascript
  chrome.notifications.create('whisperx2-upload', {
title: 'whisperx-fronted-docker-compose - Запись загружена!',
    message: `Транскрипция для ${currentUser.name || currentUser.email} в процессе.`,
    buttons: [{title: 'Открыть whisperx-fronted-docker-compose'}]
  });
  ```

### ✅ 2.6 Тестирование записи
- [ ] Протестировать запись с авторизованным пользователем
- [ ] Проверить что файл содержит email пользователя
- [ ] Убедиться что запись привязана к правильному аккаунту
- [ ] Тестировать обработку ошибок авторизации

---

## 📅 День 3: Полировка и финализация

### ✅ 3.1 Улучшение UX авторизации
- [ ] Добавить индикаторы состояния:
  - "Проверяем авторизацию..."
  - "Готов к записи встреч"
  - "Необходима авторизация"

- [ ] Улучшить переходы между состояниями:
  - Плавное показ/скрытие секций
  - Корректное отображение информации о пользователе

### ✅ 3.2 Обработка edge cases
- [ ] Пользователь не авторизован при попытке записи:
  ```javascript
  if (!currentUser) {
    status.textContent = 'Ошибка: нет авторизации';
    return;
  }
  ```

- [ ] Сессия истекла во время записи:
  - Показать ошибку авторизации
  - Предложить войти заново

- [ ] Пользователь вышел в другой вкладке:
  - Периодическая проверка статуса (опционально)

### ✅ 3.3 Определение типа встречи
- [ ] Добавить платформу встречи в метаданные:
  ```javascript
  function detectMeetingPlatform() {
    const url = window.location.href;
    if (url.includes('zoom.us')) return 'Zoom';
    if (url.includes('meet.google.com')) return 'Google Meet';
    if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
    return 'Meeting';
  }
  
  // В имени файла
  const platform = detectMeetingPlatform();
  const filename = `${platform}-${currentUser.email}-${Date.now()}.webm`;
  ```

### ✅ 3.4 Финальное тестирование
- [ ] Полный цикл: авторизация → запись → загрузка → уведомление
- [ ] Тестирование на разных платформах встреч
- [ ] Проверка обработки всех ошибок
- [ ] Тестирование выхода/входа

### ✅ 3.5 Создание иконок
- [ ] Профессиональные иконки с тематикой микрофона
- [ ] Размеры: 16x16, 48x48, 128x128

---

## 🔒 Принципы безопасности (обновленные)

### ✅ Минимальные разрешения:
- [x] `tabCapture` - только для записи аудио
- [x] `activeTab` - только активная вкладка
- [x] `notifications` - только уведомления
- [x] **НЕТ `storage`** - никаких данных в браузере

### ✅ Безопасность данных:
- [x] **Данные пользователя только в памяти** - очищаются после загрузки
- [x] **Авторизация через cookie** - используем существующую сессию
- [x] **Привязка к пользователю** - файлы содержат email
- [x] **Проверка авторизации** - перед каждой записью

### ✅ Обработка авторизации:
- [x] Проверка статуса при запуске
- [x] Обработка ошибок 401
- [x] Переход на веб-интерфейс для входа
- [x] Очистка данных из памяти

---

## 🚀 Критерии готовности

### ✅ MVP (Минимально жизнеспособный продукт)
- [x] Проверка авторизации работает
- [x] Запись аудио встреч с привязкой к пользователю
- [x] Загрузка на API с данными пользователя
- [x] Уведомление с переходом в веб
- [x] Обработка ошибок авторизации

### ✅ Полная версия
- [x] Все функции MVP
- [x] Определение типа встречи в метаданных
- [x] Полированный UI для авторизации
- [x] Обработка всех edge cases
- [x] Профессиональные иконки

---

## 📝 Заметки для разработки

### Важные моменты:
1. **Простая авторизация** - только проверка статуса + переход в веб
2. **Безопасность** - данные пользователя только в памяти, никакого storage
3. **Привязка к пользователю** - каждая запись содержит email
4. **Обработка ошибок** - особенно 401 Unauthorized
5. **UX** - понятные состояния авторизации

### Флоу авторизации:
1. Открытие popup → проверка `/auth/status`
2. Если не авторизован → показать кнопку "Войти"
3. Клик "Войти" → открыть веб-интерфейс
4. После входа → пользователь возвращается к расширению
5. Повторная проверка статуса → показать секцию записи

---

**Итого времени**: 2-3 дня активной разработки
**Результат**: Простое и безопасное расширение с авторизацией 🎯 