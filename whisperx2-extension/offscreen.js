// Offscreen document для записи аудио из вкладки + микрофона
console.log('Offscreen document loaded');

// Состояние записи
let mediaRecorder = null;
let recordedChunks = [];
let tabStream = null;
let micStream = null;
let combinedStream = null;
let audioContext = null;
let currentUser = null;
let recordingSettings = null;
let micAnalyzer = null;
let tabAnalyzer = null;
let levelMonitorInterval = null;

// Слушаем сообщения от service worker
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Offscreen: Received message:', message);
  
  if (message.target !== 'offscreen') {
    return;
  }
  
  try {
    if (message.type === 'start-recording') {
      await startRecording(message.streamId, message.user, message.settings);
    } else if (message.type === 'stop-recording') {
      await stopRecording();
    } else if (message.type === 'get-audio-levels') {
      sendResponse(getAudioLevels());
      return;
    }
  } catch (error) {
    console.error('Offscreen: Error handling message:', error);
    chrome.runtime.sendMessage({
      target: 'background',
      type: 'recording-error',
      error: error.message
    });
  }
});

// Начало записи
async function startRecording(streamId, user, settings = {}) {
  try {
    console.log('Offscreen: Starting recording with streamId:', streamId);
    console.log('Offscreen: Settings:', settings);
    currentUser = user;
    recordingSettings = settings;
    
    if (!streamId) {
      throw new Error('StreamId не предоставлен');
    }
    
    // Получаем поток с микрофона
    console.log('Offscreen: Requesting microphone access...');
    
    // Формируем constraints для микрофона
    const micConstraints = {
      audio: {
        echoCancellation: false,  // Отключаем для лучшего качества записи
        noiseSuppression: false,  // Отключаем для сохранения натурального звука
        autoGainControl: false,   // Отключаем автогейн, управляем вручную
        sampleRate: 44100,
        channelCount: 1,          // Моно для микрофона
        volume: 1.0               // Максимальная громкость
      }
    };
    
    // Если указан конкретный микрофон, используем его
    if (settings.microphoneId) {
      micConstraints.audio.deviceId = { exact: settings.microphoneId };
      console.log('Offscreen: Using specific microphone:', settings.microphoneId);
    } else {
      console.log('Offscreen: Using default microphone');
    }
    
    micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
    console.log('Offscreen: Microphone stream obtained');
    
    // Получаем MediaStream из streamId (звук вкладки)
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });
    
    console.log('Offscreen: Tab stream obtained successfully');
    console.log('Offscreen: Tab stream tracks:', tabStream.getTracks().map(track => ({
      kind: track.kind,
      enabled: track.enabled,
      readyState: track.readyState,
      label: track.label
    })));
    
    // Останавливаем видео трек - нам нужен только звук
    const videoTracks = tabStream.getVideoTracks();
    videoTracks.forEach(track => track.stop());
    
    // Создаем AudioContext для микширования потоков
    audioContext = new AudioContext({
      sampleRate: 44100
    });
    
    // Создаем источники для каждого потока
    const micSource = audioContext.createMediaStreamSource(micStream);
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    
    // Создаем узлы усиления для балансировки громкости
    const micGain = audioContext.createGain();
    const tabGain = audioContext.createGain();
    
    // Настраиваем громкость для сбалансированного микширования 50/50
    // Увеличиваем микрофон для лучшей слышимости в записи
    micGain.gain.value = 2.0;  // 200% громкости микрофона (усиливаем)
    tabGain.gain.value = 1.0;  // 100% громкости вкладки
    
    console.log('Offscreen: Audio mix ratio set to 2.0/1.0 (mic boosted for better recording)');
    
    // Создаем destination для комбинированного потока
    const destination = audioContext.createMediaStreamDestination();
    
    // Создаем анализаторы для мониторинга уровней
    micAnalyzer = audioContext.createAnalyser();
    tabAnalyzer = audioContext.createAnalyser();
    
    micAnalyzer.fftSize = 256;
    tabAnalyzer.fftSize = 256;
    
    // Подключаем источники через узлы усиления к destination
    micSource.connect(micGain);
    tabSource.connect(tabGain);
    
    // Подключаем анализаторы для мониторинга
    micGain.connect(micAnalyzer);
    tabGain.connect(tabAnalyzer);
    
    // Подключаем к выходу
    micGain.connect(destination);
    tabGain.connect(destination);
    
    // КРИТИЧЕСКИ ВАЖНО: Восстанавливаем аудио для пользователя
    // Без этого Chrome заглушает звук на вкладке
    tabGain.connect(audioContext.destination);
    
    // НЕ подключаем микрофон к выходу - пользователь не должен слышать себя
    // Микрофон идет только в запись через destination
    
    console.log('Offscreen: Audio routing: tab → speakers, mic → recording only');
    
    // Запускаем мониторинг уровней
    startLevelMonitoring();
    
    // Получаем комбинированный поток (уже смешанный)
    combinedStream = destination.stream;
    
    console.log('Offscreen: Audio mixing completed');
    console.log('Offscreen: Microphone tracks:', micStream.getAudioTracks().length);
    console.log('Offscreen: Tab audio tracks:', tabStream.getAudioTracks().length);
    console.log('Offscreen: Combined stream tracks:', combinedStream.getAudioTracks().length);
    
    // Детальная информация о треках
    micStream.getAudioTracks().forEach((track, i) => {
      console.log(`Offscreen: Mic track ${i}:`, {
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings()
      });
    });
    
    tabStream.getAudioTracks().forEach((track, i) => {
      console.log(`Offscreen: Tab track ${i}:`, {
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings()
      });
    });
    
    console.log('Offscreen: Combined stream created');
    
    // Определяем MIME тип для записи
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    
    let mimeType = null;
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }
    
    if (!mimeType) {
      throw new Error('Ни один из поддерживаемых MIME типов не доступен');
    }
    
    console.log('Offscreen: Using MIME type:', mimeType);
    
    // Создаем MediaRecorder для комбинированного потока
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: mimeType,
      audioBitsPerSecond: 128000
    });
    
    // Обработчики событий MediaRecorder
    mediaRecorder.ondataavailable = (event) => {
      console.log('Offscreen: Data available, size:', event.data.size);
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      console.log('Offscreen: MediaRecorder stopped, chunks:', recordedChunks.length);
      
      // Останавливаем все треки
      cleanup();
      
      // Автоматически загружаем запись
      await uploadRecording();
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('Offscreen: MediaRecorder error:', event.error);
      chrome.runtime.sendMessage({
        target: 'background',
        type: 'recording-error',
        error: `MediaRecorder error: ${event.error.message}`
      });
    };
    
    // Начинаем запись
    mediaRecorder.start(1000); // Сохраняем данные каждую секунду
    console.log('Offscreen: MediaRecorder started');
    
    // Уведомляем background script об успешном старте
    chrome.runtime.sendMessage({
      target: 'background',
      type: 'recording-started'
    });
    
  } catch (error) {
    console.error('Offscreen: Start recording error:', error);
    
    // Очищаем ресурсы при ошибке
    cleanup();
    
    // Уведомляем об ошибке
    chrome.runtime.sendMessage({
      target: 'background',
      type: 'recording-error',
      error: error.message
    });
    
    throw error;
  }
}

// Остановка записи
async function stopRecording() {
  try {
    console.log('Offscreen: Stopping recording...');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      console.log('Offscreen: MediaRecorder stop called');
    } else {
      console.log('Offscreen: MediaRecorder not recording, state:', mediaRecorder?.state);
    }
    
  } catch (error) {
    console.error('Offscreen: Stop recording error:', error);
    throw error;
  }
}

// Очистка ресурсов
function cleanup() {
  console.log('Offscreen: Cleaning up resources...');
  
  // Останавливаем мониторинг уровней
  stopLevelMonitoring();
  
  // Останавливаем все треки
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  
  if (tabStream) {
    tabStream.getTracks().forEach(track => track.stop());
    tabStream = null;
  }
  
  if (combinedStream) {
    combinedStream.getTracks().forEach(track => track.stop());
    combinedStream = null;
  }
  
  // Очищаем анализаторы
  micAnalyzer = null;
  tabAnalyzer = null;
  
  // Закрываем AudioContext
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
}

// Автоматическая загрузка записи
async function uploadRecording() {
  try {
    console.log('Offscreen: Starting upload, chunks:', recordedChunks.length);
    
    if (recordedChunks.length === 0) {
      throw new Error('Нет данных для загрузки');
    }
    
    if (!currentUser) {
      throw new Error('Нет данных пользователя');
    }
    
    // Создаем единый blob из записанных чанков (уже смешанный аудиопоток)
    const audioBlob = new Blob(recordedChunks, {type: 'audio/webm'});
    console.log('Offscreen: Created merged audio blob');
    console.log('Offscreen: - Chunks count:', recordedChunks.length);
    console.log('Offscreen: - Total size:', audioBlob.size, 'bytes');
    console.log('Offscreen: - Duration estimated:', Math.round(audioBlob.size / 16000), 'seconds');
    
    if (audioBlob.size === 0) {
      throw new Error('Размер записи равен 0');
    }
    
    if (audioBlob.size < 1000) {
      throw new Error('Запись слишком короткая или повреждена');
    }
    
    // Создаем FormData для отправки
    const formData = new FormData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `meeting-${currentUser.email}-${timestamp}.webm`;
    
    formData.append('file', audioBlob, filename);
    
    console.log('Offscreen: Uploading file:', filename);
    
    // Создаем URL с параметрами как в веб-интерфейсе
    // Всегда включаем разделение на спикеров
    const diarizeEnabled = true;
    
    const uploadParams = new URLSearchParams({
      model: 'large-v3',           // Используем лучшую модель
      language: 'ru',              // Русский язык по умолчанию
      diarize: diarizeEnabled.toString(), // Используем настройку пользователя
      compute_type: 'auto',        // Автоматический выбор типа вычислений
      batch_size: '16'             // Размер батча для обработки
    });
    
    // HuggingFace токен будет передан сервером из переменных окружения
    // Не включаем его в параметры запроса для безопасности
    
    console.log('Offscreen: Upload parameters:');
    console.log('Offscreen: - Model: large-v3');
    console.log('Offscreen: - Language: ru');
    console.log('Offscreen: - Diarize:', diarizeEnabled);
    console.log('Offscreen: - Compute type: auto');
    console.log('Offscreen: - Batch size: 16');
    
    const uploadUrl = `http://localhost:8880/api/upload?${uploadParams.toString()}`;
    
    console.log('Offscreen: Final upload URL:', uploadUrl);
    console.log('Offscreen: URL should match: http://localhost:8880/api/upload?model=large-v3&language=ru&diarize=true&compute_type=auto&batch_size=16');
    
    // Отправляем на сервер
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      credentials: 'include' // Используем токен из cookie
    });
    
    console.log('Offscreen: Upload response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Offscreen: Upload successful:', result);
      console.log('Offscreen: - Task ID:', result.task_id);
      console.log('Offscreen: - Status:', result.status);
      
      // Уведомляем об успехе с результатом
      chrome.runtime.sendMessage({
        target: 'background',
        type: 'upload-complete',
        result: {
          ...result,
          frontendUrl: 'http://localhost:8000',
          message: `Смешанная запись (микрофон + вкладка) с разделением на спикеров успешно загружена`
        }
      });
      
    } else {
      const errorText = await response.text();
      console.error('Offscreen: Upload failed:', response.status, errorText);
      
      let errorMessage;
      if (response.status === 401) {
        errorMessage = 'Ошибка авторизации. Войдите заново.';
      } else {
        errorMessage = `HTTP ${response.status}: ${errorText}`;
      }
      
      chrome.runtime.sendMessage({
        target: 'background',
        type: 'upload-error',
        error: errorMessage
      });
    }
    
  } catch (error) {
    console.error('Offscreen: Upload error:', error);
    chrome.runtime.sendMessage({
      target: 'background',
      type: 'upload-error',
      error: error.message
    });
  } finally {
    // Очищаем данные
    recordedChunks = [];
    currentUser = null;
    recordingSettings = null;
    mediaRecorder = null;
  }
}

// Мониторинг уровней аудио
function startLevelMonitoring() {
  if (levelMonitorInterval) {
    clearInterval(levelMonitorInterval);
  }
  
  levelMonitorInterval = setInterval(() => {
    const levels = getAudioLevels();
    if (levels.success) {
      // Отправляем уровни в background для передачи в popup
      chrome.runtime.sendMessage({
        target: 'background',
        type: 'audio-levels',
        micLevel: levels.micLevel,
        tabLevel: levels.tabLevel
      }).catch(() => {
        // Игнорируем ошибки - popup может быть закрыт
      });
    }
  }, 200); // Обновляем каждые 200мс
}

function stopLevelMonitoring() {
  if (levelMonitorInterval) {
    clearInterval(levelMonitorInterval);
    levelMonitorInterval = null;
  }
}

function getAudioLevels() {
  if (!micAnalyzer || !tabAnalyzer || !audioContext) {
    return { success: false, micLevel: 0, tabLevel: 0 };
  }
  
  try {
    // Получаем данные для микрофона
    const micBufferLength = micAnalyzer.frequencyBinCount;
    const micDataArray = new Uint8Array(micBufferLength);
    micAnalyzer.getByteFrequencyData(micDataArray);
    
    // Получаем данные для вкладки
    const tabBufferLength = tabAnalyzer.frequencyBinCount;
    const tabDataArray = new Uint8Array(tabBufferLength);
    tabAnalyzer.getByteFrequencyData(tabDataArray);
    
    // Вычисляем средний уровень
    const micLevel = calculateAverageLevel(micDataArray);
    const tabLevel = calculateAverageLevel(tabDataArray);
    
    return {
      success: true,
      micLevel: micLevel,
      tabLevel: tabLevel
    };
  } catch (error) {
    console.error('Error getting audio levels:', error);
    return { success: false, micLevel: 0, tabLevel: 0 };
  }
}

function calculateAverageLevel(dataArray) {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataArray.length;
  return Math.round((average / 255) * 100); // Конвертируем в проценты
} 