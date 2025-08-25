// Демонстрация новой системы логирования Buddy Runner
// Запустите этот файл в браузере для тестирования

// Импортируем систему логирования (в реальном приложении это делается через модули)
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4
};

// Получаем текущий уровень логирования
const getLogLevel = () => {
  const storedLevel = localStorage.getItem('logLevel');
  if (storedLevel !== null) {
    return parseInt(storedLevel);
  }
  return LOG_LEVELS.WARN; // По умолчанию
};

// Функции логирования
const logger = {
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
const setLogLevel = (level) => {
  localStorage.setItem('logLevel', level.toString());
  logger.info(`Уровень логирования изменен на: ${Object.keys(LOG_LEVELS)[level]}`);
};

// Демонстрация работы системы логирования
console.log('🚀 Демонстрация системы логирования Buddy Runner');
console.log('===============================================');

// Показываем текущий уровень
console.log(`📊 Текущий уровень логирования: ${Object.keys(LOG_LEVELS)[getLogLevel()]}`);

// Демонстрируем разные уровни логирования
console.log('\n🧪 Тестирование разных уровней логирования:');

logger.error('Это критическая ошибка - всегда показывается');
logger.warn('Это предупреждение - показывается при уровне WARN и выше');
logger.info('Это информация - показывается при уровне INFO и выше');
logger.debug('Это отладка - показывается при уровне DEBUG и выше');
logger.verbose('Это детальная отладка - показывается при уровне VERBOSE');

console.log('\n🎯 Специальные типы логов (всегда показываются):');
logger.critical('Критическая ошибка блокчейна');
logger.success('Успешная инициализация');
logger.game('Игровое событие: прыжок выполнен');
logger.blockchain('Блокчейн транзакция отправлена');
logger.wallet('Кошелек подключен');

console.log('\n🔄 Инструкции по изменению уровня:');
console.log('- localStorage.setItem("logLevel", "0") - только ошибки');
console.log('- localStorage.setItem("logLevel", "1") - ошибки и предупреждения (по умолчанию)');
console.log('- localStorage.setItem("logLevel", "2") - основная информация');
console.log('- localStorage.setItem("logLevel", "3") - отладочная информация');
console.log('- localStorage.setItem("logLevel", "4") - все логи');

console.log('\n💡 Попробуйте изменить уровень и запустить скрипт снова!');
console.log('Пример: localStorage.setItem("logLevel", "4"); location.reload();');