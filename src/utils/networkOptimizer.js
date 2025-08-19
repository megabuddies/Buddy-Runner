// Оптимизация сетевых запросов для улучшения производительности игры
const isDev = import.meta.env.DEV;

// Список URL-ов, которые нужно блокировать для улучшения производительности
const blockedUrls = [
  'https://auth.privy.io/api/v1/analytics_events',
  'https://auth.privy.io/api/v1/telemetry',
  'https://api.privy.io/analytics',
  // Добавляем другие аналитические сервисы
];

// Оригинальная функция fetch
const originalFetch = window.fetch;

// Переопределяем fetch для блокировки ненужных запросов в production
if (!isDev) {
  window.fetch = async (url, options) => {
    // Проверяем, является ли запрос заблокированным
    const urlString = typeof url === 'string' ? url : url.toString();
    
    if (blockedUrls.some(blockedUrl => urlString.includes(blockedUrl))) {
      // Возвращаем фиктивный успешный ответ для заблокированных URL
      return Promise.resolve(new Response('{}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Для остальных запросов используем оригинальный fetch
    return originalFetch(url, options);
  };
}

// Экспортируем утилиты для управления сетевыми запросами
export const networkOptimizer = {
  // Добавить URL в список блокировки
  blockUrl: (url) => {
    if (!blockedUrls.includes(url)) {
      blockedUrls.push(url);
    }
  },
  
  // Удалить URL из списка блокировки
  unblockUrl: (url) => {
    const index = blockedUrls.indexOf(url);
    if (index > -1) {
      blockedUrls.splice(index, 1);
    }
  },
  
  // Получить список заблокированных URL
  getBlockedUrls: () => [...blockedUrls],
  
  // Проверить, заблокирован ли URL
  isBlocked: (url) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    return blockedUrls.some(blockedUrl => urlString.includes(blockedUrl));
  }
};

export default networkOptimizer;