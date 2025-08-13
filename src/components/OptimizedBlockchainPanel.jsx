import React, { useState, useEffect } from 'react';
import { useOptimizedBlockchain } from '../hooks/useOptimizedBlockchain';

const OptimizedBlockchainPanel = () => {
  const {
    // Основные функции
    initializeSystem,
    sendPlayerAction,
    switchNetwork,
    updateContractState,
    resetSystem,

    // Состояние системы
    isInitialized,
    currentNetwork,
    isLoading,
    error,
    isSystemReady,

    // Метрики и статистика
    performanceStats,
    realtimeStats,
    contractState,
    poolInfo,

    // Конфигурация
    availableNetworks,
    sessionDuration
  } = useOptimizedBlockchain();

  const [isExpanded, setIsExpanded] = useState(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [autoSendInterval, setAutoSendInterval] = useState(null);

  // Автоматическая отправка действий для демонстрации
  useEffect(() => {
    if (autoSendEnabled && isSystemReady) {
      const interval = setInterval(async () => {
        try {
          await sendPlayerAction();
        } catch (err) {
          console.error('Ошибка автоотправки:', err);
          setAutoSendEnabled(false);
        }
      }, 1000); // Каждую секунду

      setAutoSendInterval(interval);
      return () => clearInterval(interval);
    } else if (autoSendInterval) {
      clearInterval(autoSendInterval);
      setAutoSendInterval(null);
    }
  }, [autoSendEnabled, isSystemReady, sendPlayerAction]);

  const handleNetworkSwitch = async (networkKey) => {
    if (networkKey === currentNetwork) return;
    
    const success = await switchNetwork(networkKey);
    if (success) {
      console.log(`✅ Переключились на ${networkKey}`);
    }
  };

  const handleManualAction = async () => {
    if (!isSystemReady) return;
    
    try {
      const result = await sendPlayerAction();
      if (result.success) {
        console.log(`🎯 Действие выполнено за ${result.executionTime.toFixed(2)}ms`);
      }
    } catch (err) {
      console.error('Ошибка выполнения действия:', err);
    }
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    if (minutes > 0) return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    return `${seconds}s`;
  };

  return (
    <div className="optimized-blockchain-panel">
      {/* Заголовок панели */}
      <div 
        className="panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-content">
          <div className="status-indicator">
            <div className={`status-light ${isSystemReady ? 'ready' : isLoading ? 'loading' : 'error'}`}></div>
            <span className="status-text">
              {isSystemReady ? 'Готов к бою' : isLoading ? 'Инициализация...' : 'Не инициализирован'}
            </span>
          </div>
          
          {isSystemReady && realtimeStats.lastTransactionTime && (
            <div className="last-transaction">
              <span className="metric-value">{formatTime(realtimeStats.lastTransactionTime)}</span>
              <span className="metric-label">последняя транзакция</span>
            </div>
          )}
          
          <div className="expand-arrow">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Основной контент панели */}
      {isExpanded && (
        <div className="panel-content">
          {/* Ошибка */}
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {/* Выбор сети */}
          <div className="network-selection">
            <h4>🌐 Выбор сети</h4>
            <div className="network-grid">
              {availableNetworks.map(network => (
                <button
                  key={network.key}
                  className={`network-button ${currentNetwork === network.key ? 'active' : ''}`}
                  onClick={() => handleNetworkSwitch(network.key)}
                  disabled={isLoading}
                >
                  <div className="network-icon">{network.icon}</div>
                  <div className="network-info">
                    <div className="network-name">{network.name}</div>
                    <div className="network-description">{network.description}</div>
                    <div className="network-speed">Блоки: {network.blockTime}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Кнопки управления */}
          <div className="control-buttons">
            {!isInitialized ? (
              <button
                className="init-button"
                onClick={() => initializeSystem(currentNetwork)}
                disabled={isLoading}
              >
                🚀 Инициализировать систему
              </button>
            ) : (
              <div className="action-buttons">
                <button
                  className="action-button manual"
                  onClick={handleManualAction}
                  disabled={!isSystemReady || isLoading}
                >
                  🎯 Отправить действие
                </button>
                
                <button
                  className={`action-button auto ${autoSendEnabled ? 'active' : ''}`}
                  onClick={() => setAutoSendEnabled(!autoSendEnabled)}
                  disabled={!isSystemReady}
                >
                  {autoSendEnabled ? '⏸️ Остановить' : '⚡ Авто режим'}
                </button>
                
                <button
                  className="action-button reset"
                  onClick={resetSystem}
                >
                  🔄 Сброс
                </button>
              </div>
            )}
          </div>

          {/* Метрики производительности */}
          {isSystemReady && (
            <div className="performance-metrics">
              <h4>📊 Метрики производительности</h4>
              
              {/* Реальное время */}
              <div className="realtime-stats">
                <div className="stat-card">
                  <div className="stat-value">{realtimeStats.transactionsThisSession}</div>
                  <div className="stat-label">Транзакций в сессии</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">
                    {realtimeStats.averageTimeThisSession ? 
                      formatTime(realtimeStats.averageTimeThisSession) : 'N/A'
                    }
                  </div>
                  <div className="stat-label">Среднее время</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{formatDuration(sessionDuration)}</div>
                  <div className="stat-label">Длительность сессии</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{contractState.currentNumber}</div>
                  <div className="stat-label">Счетчик контракта</div>
                </div>
              </div>

              {/* Информация о пуле */}
              {poolInfo && (
                <div className="pool-info">
                  <h5>📦 Пул транзакций</h5>
                  <div className="pool-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${poolInfo.utilizationPercent}%` }}
                      ></div>
                    </div>
                    <div className="pool-stats">
                      <span>Использовано: {poolInfo.used}/{poolInfo.total}</span>
                      <span>Осталось: {poolInfo.remaining}</span>
                      {poolInfo.needsRefill && <span className="refill-warning">⚠️ Нужна дозаправка</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Общая статистика */}
              {performanceStats && (
                <div className="general-stats">
                  <h5>📈 Общая статистика</h5>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-name">Всего транзакций:</span>
                      <span className="stat-value">{performanceStats.totalTransactions}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-name">Общее среднее время:</span>
                      <span className="stat-value">{formatTime(performanceStats.averageTime)}</span>
                    </div>
                  </div>

                  {/* Статистика по сетям */}
                  {Object.keys(performanceStats.networkStats).length > 0 && (
                    <div className="network-stats">
                      <h6>По сетям:</h6>
                      {Object.entries(performanceStats.networkStats).map(([network, stats]) => (
                        <div key={network} className="network-stat">
                          <span className="network-name">{network}:</span>
                          <span className="network-values">
                            {stats.count} tx, avg: {formatTime(stats.averageTime)}, 
                            min: {formatTime(stats.minTime)}, max: {formatTime(stats.maxTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .optimized-blockchain-panel {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          margin: 20px;
          overflow: hidden;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .panel-header {
          padding: 16px 20px;
          cursor: pointer;
          transition: background-color 0.2s;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .panel-header:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-light {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-light.ready {
          background-color: #4ade80;
        }

        .status-light.loading {
          background-color: #fbbf24;
        }

        .status-light.error {
          background-color: #ef4444;
        }

        .last-transaction {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .metric-value {
          font-weight: bold;
          font-size: 18px;
        }

        .metric-label {
          font-size: 12px;
          opacity: 0.8;
        }

        .expand-arrow {
          font-size: 14px;
          transition: transform 0.2s;
        }

        .panel-content {
          padding: 20px;
          background: rgba(255, 255, 255, 0.95);
          color: #333;
        }

        .error-message {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .network-selection h4 {
          margin: 0 0 12px 0;
          color: #374151;
        }

        .network-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .network-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .network-button:hover {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .network-button.active {
          border-color: #667eea;
          background: #f3f4f6;
        }

        .network-icon {
          font-size: 24px;
        }

        .network-info {
          flex: 1;
        }

        .network-name {
          font-weight: bold;
          margin-bottom: 4px;
        }

        .network-description {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .network-speed {
          font-size: 11px;
          color: #9ca3af;
        }

        .control-buttons {
          margin-bottom: 20px;
        }

        .init-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .init-button:hover {
          transform: translateY(-2px);
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-button {
          flex: 1;
          min-width: 120px;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button.manual {
          background: #10b981;
          color: white;
        }

        .action-button.auto {
          background: #f59e0b;
          color: white;
        }

        .action-button.auto.active {
          background: #dc2626;
        }

        .action-button.reset {
          background: #6b7280;
          color: white;
        }

        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .performance-metrics h4 {
          margin: 0 0 16px 0;
          color: #374151;
        }

        .realtime-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
        }

        .pool-info {
          background: white;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .pool-info h5 {
          margin: 0 0 12px 0;
          color: #374151;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.3s;
        }

        .pool-stats {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6b7280;
        }

        .refill-warning {
          color: #f59e0b !important;
          font-weight: bold;
        }

        .general-stats {
          background: white;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .general-stats h5 {
          margin: 0 0 12px 0;
          color: #374151;
        }

        .stats-grid {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .stat-name {
          color: #6b7280;
        }

        .stat-value {
          font-weight: bold;
          color: #374151;
        }

        .network-stats h6 {
          margin: 8px 0;
          color: #374151;
        }

        .network-stat {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 12px;
        }

        .network-name {
          color: #6b7280;
          font-weight: bold;
        }

        .network-values {
          color: #374151;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (max-width: 768px) {
          .optimized-blockchain-panel {
            margin: 10px;
          }
          
          .network-grid {
            grid-template-columns: 1fr;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .realtime-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default OptimizedBlockchainPanel;