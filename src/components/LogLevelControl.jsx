import React, { useState, useEffect } from 'react';
import { logger, setLogLevel, getCurrentLogLevel, LOG_LEVELS } from '../config/logging';
import '../styles/LogLevelControl.css';

const LogLevelControl = () => {
  const [currentLevel, setCurrentLevel] = useState(getCurrentLogLevel());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setCurrentLevel(getCurrentLogLevel());
  }, []);

  const handleLevelChange = (level) => {
    setLogLevel(level);
    setCurrentLevel(level);
  };

  const getLevelName = (level) => {
    const names = {
      [LOG_LEVELS.ERROR]: 'Только ошибки',
      [LOG_LEVELS.WARN]: 'Ошибки и предупреждения',
      [LOG_LEVELS.INFO]: 'Основная информация',
      [LOG_LEVELS.DEBUG]: 'Отладочная информация',
      [LOG_LEVELS.VERBOSE]: 'Все логи'
    };
    return names[level] || 'Неизвестно';
  };

  const getLevelDescription = (level) => {
    const descriptions = {
      [LOG_LEVELS.ERROR]: 'Показывать только критические ошибки',
      [LOG_LEVELS.WARN]: 'Показывать ошибки и предупреждения',
      [LOG_LEVELS.INFO]: 'Показывать основную информацию о работе приложения',
      [LOG_LEVELS.DEBUG]: 'Показывать отладочную информацию для разработчиков',
      [LOG_LEVELS.VERBOSE]: 'Показывать все логи, включая детальную отладку'
    };
    return descriptions[level] || '';
  };

  const getLevelIcon = (level) => {
    const icons = {
      [LOG_LEVELS.ERROR]: '🚨',
      [LOG_LEVELS.WARN]: '⚠️',
      [LOG_LEVELS.INFO]: 'ℹ️',
      [LOG_LEVELS.DEBUG]: '🔍',
      [LOG_LEVELS.VERBOSE]: '📝'
    };
    return icons[level] || '❓';
  };

  return (
    <div className="log-level-control">
      <button 
        className="log-level-toggle"
        onClick={() => setIsVisible(!isVisible)}
        title="Управление уровнем логирования"
      >
        {getLevelIcon(currentLevel)} Логи
      </button>
      
      {isVisible && (
        <div className="log-level-panel">
          <div className="log-level-header">
            <h3>Уровень логирования</h3>
            <button 
              className="close-button"
              onClick={() => setIsVisible(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="log-level-options">
            {Object.entries(LOG_LEVELS).map(([name, level]) => (
              <div 
                key={level}
                className={`log-level-option ${currentLevel === level ? 'active' : ''}`}
                onClick={() => handleLevelChange(level)}
              >
                <div className="log-level-icon">
                  {getLevelIcon(level)}
                </div>
                <div className="log-level-info">
                  <div className="log-level-name">
                    {getLevelName(level)}
                  </div>
                  <div className="log-level-description">
                    {getLevelDescription(level)}
                  </div>
                </div>
                {currentLevel === level && (
                  <div className="log-level-check">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="log-level-footer">
            <button 
              className="test-log-button"
              onClick={() => {
                logger.error('Тестовая ошибка');
                logger.warn('Тестовое предупреждение');
                logger.info('Тестовая информация');
                logger.debug('Тестовая отладка');
                logger.verbose('Тестовая детальная отладка');
              }}
            >
              Тестировать логи
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogLevelControl;