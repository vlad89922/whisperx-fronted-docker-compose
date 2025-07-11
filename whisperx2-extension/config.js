// Chrome Extension Configuration
const CONFIG = {
  // API endpoints - настройте под ваш сервер
  API_BASE: 'http://localhost:8880/api',
  FRONTEND_URL: 'http://localhost:8000',
  
  // Development mode
  DEVELOPMENT: true,
  
  // Permissions - обновите для вашего домена
  PERMISSIONS: [
    'http://localhost:8880/*',
    'http://localhost:8000/*'
    // Для продакшена добавьте:
    // 'https://yourdomain.com/*',
    // 'https://api.yourdomain.com/*'
  ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
} 