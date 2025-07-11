// Состояние записи
let currentUser = null;
let isRecording = false;
let recordingStartTime = null;

// Восстановление состояния при запуске
chrome.runtime.onStartup.addListener(async () => {
  await restoreState();
});

chrome.runtime.onInstalled.addListener(async () => {
  await restoreState();
});

// Функция восстановления состояния
async function restoreState() {
  try {
    console.log('Background: Attempting to restore state');
    
    if (typeof chrome === 'undefined') {
      console.error('Background: chrome object is undefined during restore');
      return;
    }
    
    if (!chrome.storage) {
      console.error('Background: chrome.storage is undefined during restore');
      return;
    }
    
    if (!chrome.storage.local) {
      console.error('Background: chrome.storage.local is undefined during restore');
      return;
    }
    
    const data = await chrome.storage.local.get(['isRecording', 'recordingStartTime', 'currentUser']);
    console.log('Background: Retrieved data from storage:', data);
    
    if (data.isRecording) {
      isRecording = data.isRecording;
      recordingStartTime = data.recordingStartTime;
      currentUser = data.currentUser;
      
      console.log('Background: State restored');
      console.log('Background: isRecording =', isRecording);
      console.log('Background: recordingStartTime =', recordingStartTime);
      console.log('Background: currentUser =', currentUser?.email);
    } else {
      console.log('Background: No active recording found in storage');
    }
  } catch (error) {
    console.error('Background: Error restoring state:', error);
  }
}

// Безопасное сохранение в chrome.storage
function saveState(data) {
  try {
    console.log('Background: Attempting to save state:', data);
    
    if (typeof chrome === 'undefined') {
      console.error('Background: chrome object is undefined');
      return;
    }
    
    if (!chrome.storage) {
      console.error('Background: chrome.storage is undefined');
      return;
    }
    
    if (!chrome.storage.local) {
      console.error('Background: chrome.storage.local is undefined');
      return;
    }
    
    chrome.storage.local.set(data).then(() => {
      console.log('Background: State saved successfully');
    }).catch(error => {
      console.error('Background: Error saving to storage:', error);
    });
  } catch (error) {
    console.error('Background: Error accessing chrome.storage:', error);
  }
}

// Обработка сообщений от popup и offscreen
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action || request.type);
  
  // Сообщения от popup
  if (request.action === 'startRecording') {
    currentUser = request.user;
    console.log('Starting recording for user:', currentUser?.email);
    console.log('Recording settings:', request.settings);
    startRecording(request.settings)
      .then(result => {
        console.log('Start recording result:', result);
        if (result.success) {
          isRecording = true;
          recordingStartTime = Date.now();
          
          // Сохраняем состояние в chrome.storage
          saveState({
            currentUser: currentUser,
            isRecording: true,
            recordingStartTime: recordingStartTime
          });
        }
        sendResponse(result);
      })
      .catch(error => {
        console.error('Start recording error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  } else if (request.action === 'stopRecording') {
    console.log('Stopping recording');
    stopRecording()
      .then(result => {
        console.log('Stop recording result:', result);
        if (result.success) {
          isRecording = false;
          recordingStartTime = null;
          
          // Очищаем состояние в chrome.storage
          saveState({
            isRecording: false,
            recordingStartTime: null
          });
        }
        sendResponse(result);
      })
      .catch(error => {
        console.error('Stop recording error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  } else if (request.action === 'getRecordingStatus') {
    // Новое действие для получения статуса записи
    const status = {
      isRecording: isRecording,
      startTime: recordingStartTime,
      user: currentUser
    };
    console.log('Background: Recording status requested');
    console.log('Background: isRecording =', isRecording);
    console.log('Background: startTime =', recordingStartTime);
    console.log('Background: user =', currentUser ? currentUser.email : 'null');
    console.log('Background: Sending recording status:', status);
    sendResponse(status);
    return true;
  } else if (request.action === 'checkAuthStatus') {
    checkAuthStatus()
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({success: false, error: error.message});
      });
    return true;
  } else if (request.action === 'requestMicrophonePermission') {
    requestMicrophonePermission()
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({success: false, error: error.message});
      });
    return true;
  } else if (request.action === 'getAudioLevels') {
    // Запрос уровней аудио от popup
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'get-audio-levels'
    }).then(response => {
      sendResponse(response || {success: false, micLevel: 0, tabLevel: 0});
    }).catch(() => {
      sendResponse({success: false, micLevel: 0, tabLevel: 0});
    });
    return true;
  }
  
  // Сообщения от offscreen document
  else if (request.target === 'background') {
    if (request.type === 'recording-started') {
      console.log('Recording started in offscreen');
      notifyPopup('recordingStarted');
    } else if (request.type === 'upload-complete') {
      console.log('Upload completed:', request.result);
      isRecording = false;
      recordingStartTime = null;
      
      // Очищаем состояние в chrome.storage
      saveState({
        isRecording: false,
        recordingStartTime: null
      });
      
      notifyPopup('uploadComplete');
      showSuccessNotification(request.result);
    } else if (request.type === 'upload-error') {
      console.error('Upload error:', request.error);
      isRecording = false;
      recordingStartTime = null;
      
      // Очищаем состояние в chrome.storage
      saveState({
        isRecording: false,
        recordingStartTime: null
      });
      
      notifyPopup('uploadError', request.error);
    } else if (request.type === 'recording-error') {
      console.error('Recording error:', request.error);
      isRecording = false;
      recordingStartTime = null;
      
      // Очищаем состояние в chrome.storage
      saveState({
        isRecording: false,
        recordingStartTime: null
      });
      
      notifyPopup('recordingError', request.error);
    }
  }
  
  // Сообщения от страницы разрешений
  else if (request.type === 'permissionResult') {
    // Это сообщение обрабатывается в requestMicrophonePermission
    console.log('Background: Permission result received:', request.granted);
  }
});

// Запрос разрешения микрофона через отдельную страницу
async function requestMicrophonePermission() {
  try {
    console.log('Background: Requesting microphone permission...');
    
    // Создаем временную страницу для запроса разрешения на микрофон
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL('permission.html'),
      active: true
    });
    
    console.log('Background: Permission tab created:', tab.id);
    
    // Ждем результат от страницы разрешений
    return new Promise((resolve) => {
      const messageListener = (message, sender) => {
        console.log('Background: Received permission message:', message, 'from tab:', sender.tab?.id);
        
        if (sender.tab?.id === tab.id && message.type === 'permissionResult') {
          chrome.runtime.onMessage.removeListener(messageListener);
          chrome.tabs.remove(tab.id);
          
          console.log('Background: Permission result:', message.granted);
          resolve({success: message.granted});
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      // Таймаут на случай, если пользователь не отвечает
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        chrome.tabs.remove(tab.id).catch(() => {}); // Игнорируем ошибки если вкладка уже закрыта
        resolve({success: false, error: 'Permission request timeout'});
      }, 60000); // 60 секунд таймаут
    });
  } catch (error) {
    console.error('Background: Error requesting microphone permission:', error);
    return {success: false, error: error.message};
  }
}

// Проверка авторизации через API
async function checkAuthStatus() {
  try {
    console.log('Background: Checking auth status...');
    
    const response = await fetch('http://localhost:8880/api/auth/status', {
      credentials: 'include'
    });
    
    console.log('Background: Auth API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Background: Auth status data:', data);
      
      if (data.authenticated && data.user) {
        currentUser = data.user;
        console.log('Background: User authenticated:', currentUser);
        return {
          success: true,
          authenticated: true,
          user: data.user
        };
      } else {
        console.log('Background: User not authenticated');
        currentUser = null;
        return {
          success: true,
          authenticated: false
        };
      }
    } else {
      console.log('Background: Auth check failed with status:', response.status);
      currentUser = null;
      return {
        success: true,
        authenticated: false
      };
    }
  } catch (error) {
    console.error('Background: Auth check error:', error);
    currentUser = null;
    return {
      success: false,
      error: error.message,
      authenticated: false
    };
  }
}

// Начало записи
async function startRecording(settings = {}) {
  try {
    if (!currentUser) {
      throw new Error('Нет данных пользователя');
    }
    
    console.log('Attempting to get tab stream ID...');
    
    // Проверяем доступность API
    if (!chrome.tabCapture || !chrome.tabCapture.getMediaStreamId) {
      throw new Error('tabCapture.getMediaStreamId API недоступен');
    }
    
    // Получаем активную вкладку
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs.length) {
      throw new Error('Нет активной вкладки');
    }
    
    const tabId = tabs[0].id;
    const tabUrl = tabs[0].url;
    console.log('Active tab:', tabId, tabUrl);
    
    // Получаем stream ID для конкретной вкладки
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });
    
    if (!streamId) {
      throw new Error('Не удалось получить stream ID. Убедитесь что на вкладке есть звук или это вкладка со встречей.');
    }
    
    console.log('Stream ID obtained:', streamId);
    
    // Создаем offscreen document для записи
    await createOffscreenDocument();
    
    // Ждем небольшую паузу для инициализации offscreen document
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Отправляем stream ID в offscreen document и ждем подтверждения
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: offscreen document не ответил'));
      }, 5000);
      
      const messageListener = (response) => {
        if (response && response.target === 'background' && response.type === 'recording-started') {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve({success: true});
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'start-recording',
        streamId: streamId,
        user: currentUser,
        settings: settings
      }).catch(error => {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('Start recording error:', error);
    return {success: false, error: error.message};
  }
}

// Создание offscreen document
async function createOffscreenDocument() {
  try {
    // Проверяем есть ли уже offscreen document
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      console.log('Offscreen document already exists');
      return;
    }
    
    // Создаем offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording audio from tab using tabCapture API'
    });
    
    console.log('Offscreen document created');
  } catch (error) {
    console.error('Error creating offscreen document:', error);
    throw error;
  }
}

// Остановка записи
async function stopRecording() {
  try {
    console.log('Stopping recording...');
    
    // Отправляем команду остановки в offscreen document
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'stop-recording'
    });
    
    return {success: true};
  } catch (error) {
    console.error('Stop recording error:', error);
    return {success: false, error: error.message};
  }
}

// Показ системного уведомления об успешной загрузке
function showSuccessNotification(uploadResult = null) {
  if (!currentUser) return;
  
  let message = `Транскрипция для ${currentUser.name || currentUser.email} в процессе. Нажмите для перехода в веб-интерфейс.`;
  
  // Если есть результат загрузки с task_id, добавляем информацию
  if (uploadResult && uploadResult.task_id) {
    message = `Задача #${uploadResult.task_id} создана. Транскрипция в процессе. Нажмите для перехода к результатам.`;
  }
  
  chrome.notifications.create('whisperx2-upload', {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'whisperx-fronted-docker-compose - Запись отправлена!',
    message: message,
    buttons: [{title: 'Открыть whisperx-fronted-docker-compose'}]
  });
}

// Уведомление popup
function notifyPopup(type, error = null) {
  chrome.runtime.sendMessage({
    type: type,
    error: error
  }).catch(() => {
    // Popup может быть закрыт, это нормально
  });
}

// Обработка кликов по уведомлениям
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'whisperx2-upload' && buttonIndex === 0) {
    chrome.tabs.create({
      url: 'http://localhost:8000/'
    });
    chrome.notifications.clear(notificationId);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'whisperx2-upload') {
    chrome.tabs.create({
      url: 'http://localhost:8000/'
    });
    chrome.notifications.clear(notificationId);
  }
}); 