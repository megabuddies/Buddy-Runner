import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOptimizedBlockchain } from '../hooks/useOptimizedBlockchain';
import OptimizedBlockchainPanel from './OptimizedBlockchainPanel';

const GameDemo = () => {
  // Игровое состояние
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [actionHistory, setActionHistory] = useState([]);
  
  // Blockchain интеграция
  const {
    sendPlayerAction,
    isSystemReady,
    realtimeStats,
    contractState
  } = useOptimizedBlockchain();

  // Refs для игры
  const gameIntervalRef = useRef(null);
  const gameStartTimeRef = useRef(null);

  /**
   * Обработка игрового действия с отправкой в блокчейн
   */
  const handleGameAction = useCallback(async () => {
    if (!gameActive || !isSystemReady) return;

    const actionStartTime = performance.now();
    
    // Немедленное обновление UI (оптимистичное обновление)
    setScore(prev => prev + 1);
    
    try {
      // Отправляем действие в блокчейн
      const result = await sendPlayerAction();
      
      if (result.success) {
        // Записываем результат в историю
        const actionData = {
          id: Date.now(),
          actionTime: Date.now() - gameStartTimeRef.current,
          blockchainTime: result.executionTime,
          totalTime: performance.now() - actionStartTime,
          success: true
        };
        
        setActionHistory(prev => [actionData, ...prev.slice(0, 9)]); // Оставляем только последние 10
        
        console.log(`🎮 Действие в игре выполнено за ${result.executionTime.toFixed(2)}ms`);
      } else {
        console.error('❌ Ошибка отправки действия:', result.error);
        // В случае ошибки можно откатить UI изменения
        setScore(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('❌ Критическая ошибка при отправке действия:', error);
      setScore(prev => Math.max(0, prev - 1));
    }
  }, [gameActive, isSystemReady, sendPlayerAction]);

  /**
   * Запуск игры
   */
  const startGame = useCallback(() => {
    if (!isSystemReady) {
      alert('Сначала инициализируйте блокчейн систему!');
      return;
    }

    setGameActive(true);
    setScore(0);
    setTimeLeft(30);
    setActionHistory([]);
    gameStartTimeRef.current = Date.now();

    // Таймер игры
    gameIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    console.log('🎮 Игра началась! Каждое действие отправляется в блокчейн!');
  }, [isSystemReady]);

  /**
   * Остановка игры
   */
  const stopGame = useCallback(() => {
    setGameActive(false);
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    console.log('🏁 Игра окончена!');
  }, []);

  // Автоматическая очистка таймера
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, []);

  // Автостоп игры при окончании времени
  useEffect(() => {
    if (timeLeft === 0 && gameActive) {
      stopGame();
    }
  }, [timeLeft, gameActive, stopGame]);

  return (
    <div className="game-demo">
      <div className="demo-container">
        
        {/* Blockchain панель */}
        <OptimizedBlockchainPanel />
        
        {/* Основная игра */}
        <div className="game-section">
          <div className="game-header">
            <h2>🎮 Blockchain Game Demo</h2>
            <p>Каждое действие отправляется в ваш Updater контракт!</p>
          </div>

          {/* Игровая статистика */}
          <div className="game-stats">
            <div className="stat-item">
              <span className="stat-label">Счет:</span>
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Время:</span>
              <span className="stat-value">{timeLeft}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Контракт:</span>
              <span className="stat-value">{contractState.currentNumber}</span>
            </div>
            {realtimeStats.transactionsThisSession > 0 && (
              <div className="stat-item">
                <span className="stat-label">Ср. время:</span>
                <span className="stat-value">
                  {realtimeStats.averageTimeThisSession.toFixed(2)}ms
                </span>
              </div>
            )}
          </div>

          {/* Игровая зона */}
          <div className="game-area">
            {!gameActive ? (
              <div className="game-start">
                <button
                  className="start-button"
                  onClick={startGame}
                  disabled={!isSystemReady}
                >
                  {isSystemReady ? '🚀 Начать игру' : '⏳ Ожидание инициализации...'}
                </button>
                {!isSystemReady && (
                  <p className="init-hint">
                    Инициализируйте блокчейн систему в панели выше
                  </p>
                )}
              </div>
            ) : (
              <div className="game-active">
                <div className="action-zone">
                  <button
                    className="action-button-big"
                    onClick={handleGameAction}
                    disabled={!isSystemReady}
                  >
                    🎯 ДЕЙСТВИЕ!
                  </button>
                  <p className="action-hint">
                    Нажимайте для отправки действий в блокчейн!
                  </p>
                </div>
                
                <button
                  className="stop-button"
                  onClick={stopGame}
                >
                  ⏹️ Остановить игру
                </button>
              </div>
            )}
          </div>

          {/* История действий */}
          {actionHistory.length > 0 && (
            <div className="action-history">
              <h4>📝 История действий</h4>
              <div className="history-list">
                {actionHistory.map(action => (
                  <div key={action.id} className="history-item">
                    <div className="history-time">
                      {(action.actionTime / 1000).toFixed(1)}s
                    </div>
                    <div className="history-details">
                      <span className="blockchain-time">
                        Блокчейн: {action.blockchainTime.toFixed(2)}ms
                      </span>
                      <span className="total-time">
                        Общее: {action.totalTime.toFixed(2)}ms
                      </span>
                    </div>
                    <div className="history-status">
                      {action.success ? '✅' : '❌'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .game-demo {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          padding: 20px;
          color: white;
        }

        .demo-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .game-section {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          margin-top: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .game-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .game-header h2 {
          margin: 0 0 8px 0;
          font-size: 28px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .game-header p {
          margin: 0;
          opacity: 0.8;
          font-size: 16px;
        }

        .game-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-label {
          display: block;
          font-size: 14px;
          opacity: 0.7;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #4ecdc4;
        }

        .game-area {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin-bottom: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .game-start {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .start-button {
          padding: 20px 40px;
          font-size: 20px;
          font-weight: bold;
          background: linear-gradient(45deg, #ff6b6b, #ff8e53);
          color: white;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
        }

        .start-button:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(255, 107, 107, 0.4);
        }

        .start-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .init-hint {
          margin: 0;
          opacity: 0.7;
          font-size: 14px;
        }

        .game-active {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .action-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .action-button-big {
          width: 200px;
          height: 200px;
          font-size: 24px;
          font-weight: bold;
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 8px 24px rgba(78, 205, 196, 0.3);
          border: 4px solid rgba(255, 255, 255, 0.2);
        }

        .action-button-big:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(78, 205, 196, 0.4);
        }

        .action-button-big:active {
          transform: scale(0.95);
        }

        .action-button-big:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-hint {
          margin: 0;
          opacity: 0.8;
          font-size: 16px;
        }

        .stop-button {
          padding: 12px 24px;
          font-size: 16px;
          background: rgba(239, 68, 68, 0.8);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stop-button:hover {
          background: rgba(239, 68, 68, 1);
          transform: translateY(-2px);
        }

        .action-history {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .action-history h4 {
          margin: 0 0 16px 0;
          color: #4ecdc4;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-time {
          font-weight: bold;
          color: #ff8e53;
          min-width: 60px;
        }

        .history-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          margin-left: 12px;
        }

        .blockchain-time {
          font-size: 14px;
          color: #4ecdc4;
        }

        .total-time {
          font-size: 12px;
          opacity: 0.7;
        }

        .history-status {
          font-size: 18px;
        }

        @media (max-width: 768px) {
          .game-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .action-button-big {
            width: 150px;
            height: 150px;
            font-size: 20px;
          }
          
          .game-area {
            padding: 24px 16px;
          }
          
          .history-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .history-details {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default GameDemo;