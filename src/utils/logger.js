// Centralized logging system
// Set to false to disable all non-critical logs
const ENABLE_LOGS = false;

// Log levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  LOG: 'log'
};

// Only show these log levels in production
const PRODUCTION_LOG_LEVELS = [LOG_LEVELS.ERROR];

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  constructor(module = 'App') {
    this.module = module;
  }

  _shouldLog(level) {
    if (!ENABLE_LOGS && level !== LOG_LEVELS.ERROR) {
      return false;
    }
    
    if (isProduction && !PRODUCTION_LOG_LEVELS.includes(level)) {
      return false;
    }
    
    return true;
  }

  _formatMessage(message) {
    return `[${this.module}] ${message}`;
  }

  error(...args) {
    // Always show errors
    // console.error(this._formatMessage(args[0]), ...args.slice(1));
  }

  warn(...args) {
    if (this._shouldLog(LOG_LEVELS.WARN)) {
      // console.warn(this._formatMessage(args[0]), ...args.slice(1));
    }
  }

  info(...args) {
    if (this._shouldLog(LOG_LEVELS.INFO)) {
      console.info(this._formatMessage(args[0]), ...args.slice(1));
    }
  }

  debug(...args) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug(this._formatMessage(args[0]), ...args.slice(1));
    }
  }

  log(...args) {
    if (this._shouldLog(LOG_LEVELS.LOG)) {
      // console.log(this._formatMessage(args[0]), ...args.slice(1));
    }
  }
}

// Create logger instances for different modules
export const createLogger = (module) => new Logger(module);

// Pre-created loggers for common modules
export const blockchainLogger = createLogger('Blockchain');
export const gameLogger = createLogger('Game');
export const performanceLogger = createLogger('Performance');

// Default logger
export default createLogger('App');