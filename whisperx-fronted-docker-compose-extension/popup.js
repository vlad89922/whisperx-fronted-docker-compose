// Элементы UI
const loginSection = document.getElementById('loginSection');
const recordingSection = document.getElementById('recordingSection');

const loginBtn = document.getElementById('loginBtn');
const requestPermissionBtn = document.getElementById('requestPermissionBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

const userName = document.getElementById('userName');
const status = document.getElementById('status');
const permissionStatus = document.getElementById('permissionStatus');
const permissionSection = document.getElementById('permissionSection');
const recordingControls = document.getElementById('recordingControls');
const recordingSettings = document.getElementById('recordingSettings');
const diarizeCheckbox = document.getElementById('diarizeCheckbox');
const webInterfaceSection = document.getElementById('webInterfaceSection');
const openWebBtn = document.getElementById('openWebBtn');
const microphoneSelect = document.getElementById('microphoneSelect');
const refreshMicsBtn = document.getElementById('refreshMicsBtn');

// Элементы для информации о записи
const recordingInfo = document.getElementById('recordingInfo');
const recordingTimer = document.getElementById('recordingTimer');
const micLevel = document.getElementById('micLevel');
const tabLevel = document.getElementById('tabLevel');
const micLevelText = document.getElementById('micLevelText');
const tabLevelText = document.getElementById('tabLevelText');

// Состояние
let isRecording = false;
let startTime = null;
let currentUser = null;
let micPermissionGranted = false;
let timerInterval = null;

// API конфигурация
const API_BASE = 'http://localhost:8880/api';

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuthStatus();
  // Проверяем статус записи только после проверки авторизации
  await checkRecordingStatus();
});

// Проверка авторизации через сессию браузера
async function checkAuthStatus() {
  try {
    status.textContent = 'Проверяем авторизацию...';
    
    const response = await chrome.runtime.sendMessage({
      action: 'checkAuthStatus'
    });
    
    console.log('Auth status response:', response);
    
    if (response.success && response.authenticated && response.user) {
      showRecordingInterface(response.user);
    } else {
      showLoginInterface();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showLoginInterface();
  }
}

// Проверка статуса записи при открытии popup
async function checkRecordingStatus() {
  try {
    console.log('Popup: Checking recording status...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'getRecordingStatus'
    });
    
    console.log('Popup: Recording status response:', response);
    
    if (response && response.isRecording && response.user) {
      console.log('Popup: Found active recording, restoring state...');
      
      // Восстанавливаем состояние записи
      currentUser = response.user;
      startTime = response.startTime;
      isRecording = true;
      micPermissionGranted = true; // Если запись идет, разрешение есть
      
      console.log('Popup: Restored startTime:', startTime);
      console.log('Popup: Current time:', Date.now());
      if (startTime) {
        const elapsed = Date.now() - startTime;
        console.log('Popup: Elapsed time:', Math.floor(elapsed / 1000), 'seconds');
      }
      
      // Убеждаемся что мы в правильном интерфейсе
      if (recordingSection.style.display === 'none') {
        console.log('Popup: Showing recording interface');
        showRecordingInterface(response.user);
      }
      
      // Показываем UI записи
      console.log('Popup: Starting recording UI');
      startRecordingUI();
      
      console.log('Popup: Recording state restored successfully');
    } else {
      console.log('Popup: No active recording found');
      // Проверяем разрешение микрофона если пользователь авторизован
      if (currentUser) {
        await checkMicrophonePermission();
      }
    }
  } catch (error) {
    console.error('Popup: Error checking recording status:', error);
  }
}

// Проверка разрешения микрофона
async function checkMicrophonePermission() {
  try {
    const result = await navigator.permissions.query({name: 'microphone'});
    updatePermissionStatus(result.state);
    
    result.addEventListener('change', () => {
      updatePermissionStatus(result.state);
    });
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    updatePermissionStatus('unknown');
  }
}

// Обновление статуса разрешения
function updatePermissionStatus(state) {
  micPermissionGranted = state === 'granted';
  
  switch (state) {
    case 'granted':
      permissionStatus.textContent = '✅ Разрешение микрофона получено';
      permissionStatus.className = 'permission-status permission-granted';
      requestPermissionBtn.style.display = 'none';
      recordingControls.style.display = 'block';
      break;
    case 'denied':
      permissionStatus.textContent = '❌ Разрешение микрофона отклонено';
      permissionStatus.className = 'permission-status permission-denied';
      requestPermissionBtn.style.display = 'block';
      recordingControls.style.display = 'none';
      break;
    case 'prompt':
      permissionStatus.textContent = '⚠️ Требуется разрешение микрофона';
      permissionStatus.className = 'permission-status permission-unknown';
      requestPermissionBtn.style.display = 'block';
      recordingControls.style.display = 'none';
      break;
    default:
      permissionStatus.textContent = '❓ Проверяем разрешение микрофона...';
      permissionStatus.className = 'permission-status permission-unknown';
      requestPermissionBtn.style.display = 'block';
      recordingControls.style.display = 'none';
  }
}

// Показать интерфейс входа
function showLoginInterface() {
  loginSection.style.display = 'block';
  recordingSection.style.display = 'none';
  
  status.textContent = 'Необходима авторизация';
}

// Показать интерфейс записи
function showRecordingInterface(user) {
  currentUser = user;
  
  loginSection.style.display = 'none';
  recordingSection.style.display = 'block';
  recordingSettings.style.display = 'block';
  
  userName.textContent = user.name || user.email || 'Пользователь';
  status.textContent = 'Готов к записи встреч';
  
  // Проверяем разрешение микрофона
  checkMicrophonePermission();
  
  // Загружаем список микрофонов
  loadMicrophones();
}

// Обработчики событий
function setupEventListeners() {
  loginBtn.addEventListener('click', handleLogin);
  requestPermissionBtn.addEventListener('click', handleRequestPermission);
  startBtn.addEventListener('click', handleStartRecording);
  stopBtn.addEventListener('click', handleStopRecording);
  openWebBtn.addEventListener('click', handleOpenWebInterface);
  refreshMicsBtn.addEventListener('click', loadMicrophones);
  
  // Слушаем сообщения от background script
  chrome.runtime.onMessage.addListener((message) => {
    console.log('Popup: Received message:', message);
    
    if (message.type === 'recordingStarted') {
      console.log('Popup: Recording started notification');
      // Устанавливаем время начала для новой записи
      if (!isRecording) {
        startTime = Date.now();
      }
      startRecordingUI();
    } else if (message.type === 'uploadComplete') {
      console.log('Popup: Upload completed');
      showSuccessInterface('Смешанная запись (микрофон + вкладка) отправлена!');
      webInterfaceSection.style.display = 'block';
    } else if (message.type === 'uploadError') {
      console.error('Popup: Upload error:', message.error);
      stopRecordingUI();
      status.textContent = 'Ошибка загрузки: ' + message.error;
      
      // Если ошибка авторизации - показываем вход
      if (message.error && message.error.includes('авторизации')) {
        showLoginInterface();
      }
    } else if (message.type === 'recordingError') {
      console.error('Popup: Recording error:', message.error);
      stopRecordingUI();
      status.textContent = 'Ошибка записи: ' + message.error;
    }
  });
}

// Простая авторизация через веб-интерфейс
function handleLogin() {
  status.textContent = 'Открываем страницу входа...';
  
      chrome.tabs.create({
      url: 'http://localhost:8000/login.html'
    });
  
  window.close();
}

// Запрос разрешения микрофона
async function handleRequestPermission() {
  try {
    status.textContent = 'Запрашиваем разрешение микрофона...';
    requestPermissionBtn.disabled = true;
    
    // Отправляем сообщение в background script для запроса разрешения
    const response = await chrome.runtime.sendMessage({
      action: 'requestMicrophonePermission'
    });
    
    if (response.success) {
      updatePermissionStatus('granted');
      status.textContent = 'Разрешение получено!';
    } else {
      updatePermissionStatus('denied');
      status.textContent = 'Разрешение отклонено';
    }
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    updatePermissionStatus('denied');
    status.textContent = 'Ошибка запроса разрешения';
  } finally {
    requestPermissionBtn.disabled = false;
  }
}

// Начало записи
async function handleStartRecording() {
  if (!currentUser) {
    status.textContent = 'Ошибка: нет авторизации';
    return;
  }
  
  if (!micPermissionGranted) {
    status.textContent = 'Ошибка: нет разрешения микрофона';
    return;
  }
  
  try {
    status.textContent = 'Начинаем запись...';
    startBtn.disabled = true;
    
    // Отправляем сообщение в background script
    const response = await chrome.runtime.sendMessage({
      action: 'startRecording',
      user: currentUser,
      settings: {
        diarize: true, // Всегда включено разделение на спикеров
        microphoneId: microphoneSelect.value || null
      }
    });
    
    if (response && response.success) {
      // UI обновится через сообщение от background
      console.log('Recording started successfully');
    } else {
      status.textContent = 'Ошибка: ' + (response?.error || 'Неизвестная ошибка');
      startBtn.disabled = false;
    }
  } catch (error) {
    console.error('Recording start error:', error);
    status.textContent = 'Ошибка запуска записи: ' + error.message;
    startBtn.disabled = false;
  }
}

// Остановка записи и автоматическая отправка
async function handleStopRecording() {
  try {
    status.textContent = 'Останавливаем и отправляем...';
    stopBtn.disabled = true;
    
    const response = await chrome.runtime.sendMessage({
      action: 'stopRecording'
    });
    
    if (response && response.success) {
      status.textContent = 'Загружаем на сервер...';
      // UI обновится через сообщение от background
    } else {
      status.textContent = 'Ошибка остановки записи: ' + (response?.error || 'Неизвестная ошибка');
      stopBtn.disabled = false;
    }
  } catch (error) {
    console.error('Recording stop error:', error);
    status.textContent = 'Ошибка остановки записи: ' + error.message;
    stopBtn.disabled = false;
  }
}

// UI для записи
function startRecordingUI() {
  isRecording = true;
  permissionSection.style.display = 'none';
  recordingSettings.style.display = 'none';
  recordingControls.style.display = 'block';
  recordingInfo.style.display = 'block';
  webInterfaceSection.style.display = 'none';
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  
  // Устанавливаем время начала только если оно еще не установлено
  if (!startTime) {
    startTime = Date.now();
  }
  
  status.textContent = '🎙️ Записываем микрофон + звук вкладки...';
  
  // Запускаем таймер
  startTimer();
  
  // Запускаем мониторинг уровней (имитация)
  startLevelMonitoring();
}

function stopRecordingUI() {
  isRecording = false;
  permissionSection.style.display = 'block';
  recordingSettings.style.display = 'block';
  recordingInfo.style.display = 'none';
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
  startBtn.disabled = false;
  stopBtn.disabled = false;
  
  // Останавливаем таймер
  stopTimer();
  
  // Обновляем отображение контролов в зависимости от разрешения
  if (micPermissionGranted) {
    recordingControls.style.display = 'block';
  } else {
    recordingControls.style.display = 'none';
  }
}

function showSuccessInterface(message = 'Запись отправлена на обработку!') {
  stopRecordingUI();
  status.textContent = '✅ ' + message;
}

// Функции для таймера
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    if (startTime) {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      recordingTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      recordingTimer.textContent = '00:00';
    }
  }, 1000);
  
  // Сразу обновляем таймер при запуске
  if (startTime) {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    recordingTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  recordingTimer.textContent = '00:00';
}

// Мониторинг уровней (имитация для демонстрации)
function startLevelMonitoring() {
  // Запрашиваем уровни у background script
  const levelInterval = setInterval(() => {
    if (!isRecording) {
      clearInterval(levelInterval);
      return;
    }
    
    chrome.runtime.sendMessage({
      action: 'getAudioLevels'
    }).then(response => {
      if (response && response.success) {
        updateAudioLevels(response.micLevel || 0, response.tabLevel || 0);
      } else {
        // Имитация для демонстрации
        const micLevel = Math.random() * 80 + 10; // 10-90%
        const tabLevel = Math.random() * 70 + 20; // 20-90%
        updateAudioLevels(micLevel, tabLevel);
      }
    }).catch(() => {
      // Имитация при ошибке
      const micLevel = Math.random() * 80 + 10;
      const tabLevel = Math.random() * 70 + 20;
      updateAudioLevels(micLevel, tabLevel);
    });
  }, 200); // Обновляем каждые 200мс
}

function updateAudioLevels(micPercent, tabPercent) {
  // Обновляем визуальные индикаторы
  micLevel.style.width = micPercent + '%';
  tabLevel.style.width = tabPercent + '%';
  
  // Обновляем текстовые значения
  micLevelText.textContent = Math.round(micPercent) + '%';
  tabLevelText.textContent = Math.round(tabPercent) + '%';
}

// Открытие веб-интерфейса
function handleOpenWebInterface() {
      chrome.tabs.create({
      url: 'http://localhost:8000/'
    });
  window.close();
}

// Загрузка списка микрофонов
async function loadMicrophones() {
  try {
    console.log('Popup: Loading microphones...');
    microphoneSelect.innerHTML = '<option value="">Загружаем...</option>';
    
    // Запрашиваем список устройств
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter(device => device.kind === 'audioinput');
    
    console.log('Popup: Found microphones:', microphones.length);
    
    // Очищаем список
    microphoneSelect.innerHTML = '';
    
    if (microphones.length === 0) {
      microphoneSelect.innerHTML = '<option value="">Микрофоны не найдены</option>';
      return;
    }
    
    // Добавляем опцию "по умолчанию"
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '🎤 По умолчанию';
    microphoneSelect.appendChild(defaultOption);
    
    // Добавляем все найденные микрофоны
    microphones.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      
      // Формируем название
      let label = device.label || `Микрофон ${index + 1}`;
      if (label.length > 30) {
        label = label.substring(0, 27) + '...';
      }
      
      option.textContent = `🎙️ ${label}`;
      microphoneSelect.appendChild(option);
    });
    
    console.log('Popup: Microphones loaded successfully');
    
  } catch (error) {
    console.error('Popup: Error loading microphones:', error);
    microphoneSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
  }
} 