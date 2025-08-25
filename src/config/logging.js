// Система логирования с уровнями важности
export const LOG_LEVELS = {
  ERROR: 0,    // Критические ошибки
  WARN: 1,     // Предупреждения
  INFO: 2,     // Важная информация
  DEBUG: 3,    // Отладочная информация
  VERBOSE: 4   // Подробная отладочная информация
};

// Текущий уровень логирования
let currentLogLevel = process.env.NODE_ENV === 'development' ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;

// Функция для установки уровня логирования
export const setLogLevel = (level) => {
  currentLogLevel = level;
  console.log(`📝 Log level set to: ${Object.keys(LOG_LEVELS)[level]}`);
};

// Функция для получения текущего уровня логирования
export const getLogLevel = () => currentLogLevel;

// Функция логирования с проверкой уровня
export const log = (level, message, ...args) => {
  if (level <= currentLogLevel) {
    console.log(message, ...args);
  }
};

// Специализированные функции логирования
export const logError = (message, ...args) => log(LOG_LEVELS.ERROR, message, ...args);
export const logWarn = (message, ...args) => log(LOG_LEVELS.WARN, message, ...args);
export const logInfo = (message, ...args) => log(LOG_LEVELS.INFO, message, ...args);
export const logDebug = (message, ...args) => log(LOG_LEVELS.DEBUG, message, ...args);
export const logVerbose = (message, ...args) => log(LOG_LEVELS.VERBOSE, message, ...args);

// Функция для включения/выключения логирования кошельков
let walletLoggingEnabled = false;
export const setWalletLogging = (enabled) => {
  walletLoggingEnabled = enabled;
  console.log(`📝 Wallet logging ${enabled ? 'enabled' : 'disabled'}`);
};

export const isWalletLoggingEnabled = () => walletLoggingEnabled;

// Функция для логирования кошельков только при необходимости
export const logWallet = (message, ...args) => {
  if (walletLoggingEnabled) {
    console.log(message, ...args);
  }
};

// Функция для включения/выключения детального логирования транзакций
let transactionLoggingEnabled = false;
export const setTransactionLogging = (enabled) => {
  transactionLoggingEnabled = enabled;
  console.log(`📝 Transaction logging ${enabled ? 'enabled' : 'disabled'}`);
};

export const isTransactionLoggingEnabled = () => transactionLoggingEnabled;

// Функция для логирования транзакций только при необходимости
export const logTransaction = (message, ...args) => {
  if (transactionLoggingEnabled) {
    console.log(message, ...args);
  }
};

// Функция для сброса всех настроек логирования к значениям по умолчанию
export const resetLoggingSettings = () => {
  currentLogLevel = process.env.NODE_ENV === 'development' ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;
  walletLoggingEnabled = false;
  transactionLoggingEnabled = false;
  console.log('📝 Logging settings reset to defaults');
};

// Экспорт уровней для удобства использования
export { LOG_LEVELS as LEVELS };