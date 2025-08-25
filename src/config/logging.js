// Конфигурация логирования
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4
};

// Текущий уровень логирования (можно изменить через localStorage или env)
const getLogLevel = () => {
  // Проверяем localStorage
  const storedLevel = localStorage.getItem('logLevel');
  if (storedLevel !== null) {
    return parseInt(storedLevel);
  }
  
  // Проверяем env переменную
  const envLevel = import.meta.env.VITE_LOG_LEVEL;
  if (envLevel) {
    return parseInt(envLevel);
  }
  
  // По умолчанию показываем только ошибки и предупреждения
  return LOG_LEVELS.WARN;
};

// Функции логирования
export const logger = {
  error: (message, ...args) => {
    if (getLogLevel() >= LOG_LEVELS.ERROR) {
      console.error(`❌ ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (getLogLevel() >= LOG_LEVELS.WARN) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },
  
  info: (message, ...args) => {
    if (getLogLevel() >= LOG_LEVELS.INFO) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (getLogLevel() >= LOG_LEVELS.DEBUG) {
      console.log(`🔍 ${message}`, ...args);
    }
  },
  
  verbose: (message, ...args) => {
    if (getLogLevel() >= LOG_LEVELS.VERBOSE) {
      console.log(`📝 ${message}`, ...args);
    }
  },
  
  // Специальные логи для важных событий (всегда показываются)
  critical: (message, ...args) => {
    console.error(`🚨 КРИТИЧЕСКАЯ ОШИБКА: ${message}`, ...args);
  },
  
  success: (message, ...args) => {
    console.log(`✅ ${message}`, ...args);
  },
  
  game: (message, ...args) => {
    console.log(`🎮 ${message}`, ...args);
  },
  
  blockchain: (message, ...args) => {
    console.log(`⛓️ ${message}`, ...args);
  },
  
  wallet: (message, ...args) => {
    console.log(`💰 ${message}`, ...args);
  }
};

// Функция для изменения уровня логирования
export const setLogLevel = (level) => {
  localStorage.setItem('logLevel', level.toString());
  logger.info(`Уровень логирования изменен на: ${Object.keys(LOG_LEVELS)[level]}`);
};

// Функция для получения текущего уровня
export const getCurrentLogLevel = () => {
  return getLogLevel();
};

// Экспортируем уровни для использования
export { LOG_LEVELS };