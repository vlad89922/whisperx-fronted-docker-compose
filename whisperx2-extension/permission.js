class MicrophonePermissionHandler {
    constructor() {
        this.allowBtn = document.getElementById('allowBtn');
        this.denyBtn = document.getElementById('denyBtn');
        this.status = document.getElementById('status');
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        this.allowBtn.addEventListener('click', () => this.requestPermission());
        this.denyBtn.addEventListener('click', () => this.denyPermission());
    }
    
    async requestPermission() {
        this.showStatus('Requesting microphone permission...', '');
        this.allowBtn.disabled = true;
        this.denyBtn.disabled = true;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Получили разрешение, останавливаем поток
            stream.getTracks().forEach(track => track.stop());
            
            this.showStatus('✅ Microphone permission granted!', 'success');
            
            // Отправляем результат в background script
            chrome.runtime.sendMessage({
                type: 'permissionResult',
                granted: true
            });
            
            // Закрываем страницу через 2 секунды
            setTimeout(() => {
                window.close();
            }, 2000);
            
        } catch (error) {
            console.error('Microphone permission denied:', error);
            this.showStatus('❌ Microphone permission denied', 'error');
            
            // Отправляем результат в background script
            chrome.runtime.sendMessage({
                type: 'permissionResult',
                granted: false
            });
            
            this.allowBtn.disabled = false;
            this.denyBtn.disabled = false;
        }
    }
    
    denyPermission() {
        this.showStatus('❌ Permission denied by user', 'error');
        
        // Отправляем результат в background script
        chrome.runtime.sendMessage({
            type: 'permissionResult',
            granted: false
        });
        
        // Закрываем страницу через 2 секунды
        setTimeout(() => {
            window.close();
        }, 2000);
    }
    
    showStatus(message, className) {
        this.status.textContent = message;
        this.status.className = `status ${className}`;
        this.status.style.display = 'block';
    }
}

// Инициализируем обработчик когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    new MicrophonePermissionHandler();
}); 