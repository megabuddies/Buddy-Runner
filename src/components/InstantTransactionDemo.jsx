import React, { useState, useEffect } from 'react';
import { useBlockchainUtils } from '../hooks/useBlockchainUtils';
import { useWallets } from '@privy-io/react-auth';

const InstantTransactionDemo = ({ selectedNetwork }) => {
  const { wallets } = useWallets();
  const {
    initInstantTransactionSystem,
    getEmbeddedWallet,
    sendUpdate,
    balance,
    checkBalance,
    getPoolStatus,
    isReady
  } = useBlockchainUtils();

  const [demoState, setDemoState] = useState({
    isInitialized: false,
    isInitializing: false,
    poolStatus: null,
    transactionTimes: [],
    averageTime: 0,
    totalTransactions: 0,
    error: null
  });

  const [testResults, setTestResults] = useState([]);

  // Мониторинг статуса пула
  useEffect(() => {
    if (selectedNetwork && !selectedNetwork.isWeb2) {
      const interval = setInterval(() => {
        const poolStatus = getPoolStatus(selectedNetwork.id);
        setDemoState(prev => ({ ...prev, poolStatus }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedNetwork, getPoolStatus]);

  // Инициализация системы мгновенных транзакций
  const handleInitialize = async () => {
    if (!selectedNetwork || selectedNetwork.isWeb2) {
      setDemoState(prev => ({ ...prev, error: 'Please select a blockchain network' }));
      return;
    }

    setDemoState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      const result = await initInstantTransactionSystem(selectedNetwork.id, 10);
      console.log('🚀 Instant Transaction System initialized:', result);
      
      setDemoState(prev => ({
        ...prev,
        isInitialized: true,
        isInitializing: false,
        error: null
      }));

      // Обновляем баланс
      await checkBalance(selectedNetwork.id);
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      setDemoState(prev => ({
        ...prev,
        isInitializing: false,
        error: error.message
      }));
    }
  };

  // Тест мгновенной транзакции
  const handleInstantTransaction = async () => {
    if (!selectedNetwork || selectedNetwork.isWeb2) return;

    const startTime = performance.now();
    
    try {
      const result = await sendUpdate(selectedNetwork.id);
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);

      const newResult = {
        id: Date.now(),
        time: totalTime,
        blockchainTime: result.blockchainTime || totalTime,
        network: selectedNetwork.name,
        hash: result.hash || result.transactionHash,
        timestamp: new Date().toLocaleTimeString()
      };

      setTestResults(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10 results

      // Обновляем статистику
      setDemoState(prev => {
        const newTimes = [...prev.transactionTimes, totalTime].slice(-20); // Keep last 20
        const avgTime = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
        
        return {
          ...prev,
          transactionTimes: newTimes,
          averageTime: Math.round(avgTime),
          totalTransactions: prev.totalTransactions + 1
        };
      });

    } catch (error) {
      console.error('❌ Transaction failed:', error);
      setDemoState(prev => ({ ...prev, error: error.message }));
    }
  };

  // Пакетный тест (5 транзакций подряд)
  const handleBatchTest = async () => {
    if (!selectedNetwork || selectedNetwork.isWeb2) return;

    for (let i = 0; i < 5; i++) {
      await handleInstantTransaction();
      // Небольшая задержка между транзакциями
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const embeddedWallet = getEmbeddedWallet();

  return (
    <div className="instant-transaction-demo">
      <div className="demo-header">
        <h3>🚀 Instant Transaction System Demo</h3>
        <p>Демонстрация системы мгновенных транзакций с предподписанием</p>
      </div>

      {embeddedWallet && (
        <div className="wallet-info">
          <div className="info-item">
            <span className="label">Embedded Wallet:</span>
            <span className="value">{embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}</span>
          </div>
          <div className="info-item">
            <span className="label">Balance:</span>
            <span className="value">{balance} ETH</span>
          </div>
          <div className="info-item">
            <span className="label">Network:</span>
            <span className="value">{selectedNetwork?.name || 'Not selected'}</span>
          </div>
        </div>
      )}

      {demoState.poolStatus && (
        <div className="pool-status">
          <h4>📊 Transaction Pool Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Available:</span>
              <span className="value">{demoState.poolStatus.remaining}</span>
            </div>
            <div className="status-item">
              <span className="label">Used:</span>
              <span className="value">{demoState.poolStatus.used}</span>
            </div>
            <div className="status-item">
              <span className="label">Total:</span>
              <span className="value">{demoState.poolStatus.total}</span>
            </div>
            <div className="status-item">
              <span className="label">Status:</span>
              <span className={`value ${demoState.poolStatus.isReady ? 'ready' : 'not-ready'}`}>
                {demoState.poolStatus.isReady ? '✅ Ready' : '⏳ Preparing'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="demo-controls">
        {!demoState.isInitialized ? (
          <button 
            className="demo-button primary"
            onClick={handleInitialize}
            disabled={demoState.isInitializing || !isReady}
          >
            {demoState.isInitializing ? '⏳ Initializing...' : '🚀 Initialize System'}
          </button>
        ) : (
          <div className="transaction-controls">
            <button 
              className="demo-button"
              onClick={handleInstantTransaction}
              disabled={!demoState.poolStatus?.isReady}
            >
              ⚡ Send Instant Transaction
            </button>
            <button 
              className="demo-button"
              onClick={handleBatchTest}
              disabled={!demoState.poolStatus?.isReady}
            >
              🔥 Batch Test (5x)
            </button>
          </div>
        )}
      </div>

      {demoState.error && (
        <div className="error-message">
          ❌ {demoState.error}
        </div>
      )}

      {demoState.totalTransactions > 0 && (
        <div className="performance-stats">
          <h4>📈 Performance Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="label">Total Transactions:</span>
              <span className="value">{demoState.totalTransactions}</span>
            </div>
            <div className="stat-item">
              <span className="label">Average Time:</span>
              <span className="value">{demoState.averageTime}ms</span>
            </div>
            <div className="stat-item">
              <span className="label">Last Result:</span>
              <span className="value">
                {testResults[0] ? `${testResults[0].time}ms` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="test-results">
          <h4>📋 Recent Transactions</h4>
          <div className="results-list">
            {testResults.slice(0, 5).map(result => (
              <div key={result.id} className="result-item">
                <div className="result-time">{result.timestamp}</div>
                <div className="result-performance">
                  <span className="total-time">{result.time}ms total</span>
                  <span className="blockchain-time">({result.blockchainTime}ms blockchain)</span>
                </div>
                {result.hash && (
                  <div className="result-hash">
                    {result.hash.slice(0, 10)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .instant-transaction-demo {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          margin: 20px 0;
          color: white;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .demo-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .demo-header h3 {
          margin: 0 0 8px 0;
          font-size: 1.4em;
        }

        .demo-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.9em;
        }

        .wallet-info, .pool-status, .performance-stats {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
        }

        .info-item, .status-item, .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 8px 0;
        }

        .label {
          font-weight: 500;
          opacity: 0.9;
        }

        .value {
          font-weight: 600;
        }

        .value.ready {
          color: #4ade80;
        }

        .value.not-ready {
          color: #fbbf24;
        }

        .status-grid, .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .demo-controls {
          text-align: center;
          margin: 24px 0;
        }

        .transaction-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .demo-button {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .demo-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .demo-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .demo-button.primary {
          background: rgba(74, 222, 128, 0.3);
          border-color: #4ade80;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          border-radius: 8px;
          padding: 12px;
          margin: 16px 0;
          text-align: center;
        }

        .test-results {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
        }

        .results-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .result-item {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          margin: 8px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .result-time {
          font-size: 0.9em;
          opacity: 0.8;
        }

        .result-performance {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .total-time {
          font-weight: 600;
          color: #4ade80;
        }

        .blockchain-time {
          font-size: 0.8em;
          opacity: 0.7;
        }

        .result-hash {
          font-family: monospace;
          font-size: 0.8em;
          opacity: 0.7;
        }

        h4 {
          margin: 0 0 12px 0;
          font-size: 1.1em;
        }
      `}</style>
    </div>
  );
};

export default InstantTransactionDemo;