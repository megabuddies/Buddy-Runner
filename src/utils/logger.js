// Система минимизации логов для улучшения производительности игры
const isDev = import.meta.env.DEV;

// В production режиме полностью отключаем консольные логи
if (!isDev) {
  // Сохраняем оригинальные методы для критических ошибок
  const originalError = console.error;
  
  // Полностью переопределяем все консольные методы
  Object.assign(console, {
    log: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    // Минимизируем даже error логи
    error: (...args) => {
      // Показываем только критические системные ошибки
      const message = args[0];
      if (typeof message === 'string' && 
          (message.includes('Failed to load') || 
           message.includes('Network Error') ||
           message.includes('🚨 CRITICAL'))) {
        originalError(...args);
      }
    },
  });
  
  // Дополнительно перехватываем window.console
  window.console = console;
}

// Экспортируем условные логгеры для разработки
export const devLog = isDev ? console.log : () => {};
export const devWarn = isDev ? console.warn : () => {};
export const devError = isDev ? console.error : () => {};

export default {
  log: devLog,
  warn: devWarn,
  error: devError,
};