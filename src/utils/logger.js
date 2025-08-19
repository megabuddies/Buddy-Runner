// Система минимизации логов для улучшения производительности игры
const isDev = import.meta.env.DEV;

// Создаем пустые функции для production
const noop = () => {};

// В production режиме полностью отключаем консольные логи
if (!isDev) {
  // Сохраняем оригинальные методы
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    error: console.error
  };
  
  // Переопределяем консольные методы
  console.log = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  
  // Минимизируем error логи - показываем только критические
  console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('Failed to load') || 
         message.includes('Network Error') ||
         message.includes('🚨 CRITICAL') ||
         message.includes('Error during build'))) {
      originalConsole.error(...args);
    }
  };
}

// Экспортируем условные логгеры
export const devLog = isDev ? console.log.bind(console) : noop;
export const devWarn = isDev ? console.warn.bind(console) : noop;
export const devError = isDev ? console.error.bind(console) : noop;

export default {
  log: devLog,
  warn: devWarn,
  error: devError,
};