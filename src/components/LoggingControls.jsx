import React, { useState } from 'react';
import { 
  setLogLevel, 
  getLogLevel, 
  setWalletLogging, 
  isWalletLoggingEnabled,
  setTransactionLogging,
  isTransactionLoggingEnabled,
  resetLoggingSettings,
  LOG_LEVELS 
} from '../config/logging';

const LoggingControls = () => {
  const [currentLevel, setCurrentLevel] = useState(getLogLevel());
  const [walletLogging, setWalletLoggingState] = useState(isWalletLoggingEnabled());
  const [transactionLogging, setTransactionLoggingState] = useState(isTransactionLoggingEnabled());

  const handleLogLevelChange = (level) => {
    setLogLevel(level);
    setCurrentLevel(level);
  };

  const handleWalletLoggingChange = (enabled) => {
    setWalletLogging(enabled);
    setWalletLoggingState(enabled);
  };

  const handleTransactionLoggingChange = (enabled) => {
    setTransactionLogging(enabled);
    setTransactionLoggingState(enabled);
  };

  const handleReset = () => {
    resetLoggingSettings();
    setCurrentLevel(getLogLevel());
    setWalletLoggingState(isWalletLoggingEnabled());
    setTransactionLoggingState(isTransactionLoggingEnabled());
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '250px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>📝 Logging Controls</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Log Level:
          <select 
            value={currentLevel} 
            onChange={(e) => handleLogLevelChange(Number(e.target.value))}
            style={{ 
              marginLeft: '10px', 
              padding: '2px 5px',
              background: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '3px'
            }}
          >
            <option value={LOG_LEVELS.ERROR}>ERROR</option>
            <option value={LOG_LEVELS.WARN}>WARN</option>
            <option value={LOG_LEVELS.INFO}>INFO</option>
            <option value={LOG_LEVELS.DEBUG}>DEBUG</option>
            <option value={LOG_LEVELS.VERBOSE}>VERBOSE</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <input
            type="checkbox"
            checked={walletLogging}
            onChange={(e) => handleWalletLoggingChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Wallet Logging
        </label>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <input
            type="checkbox"
            checked={transactionLogging}
            onChange={(e) => handleTransactionLoggingChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Transaction Logging
        </label>
      </div>

      <button 
        onClick={handleReset}
        style={{
          background: '#555',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '11px'
        }}
      >
        Reset to Defaults
      </button>

      <div style={{ 
        marginTop: '10px', 
        fontSize: '10px', 
        opacity: 0.7,
        borderTop: '1px solid #555',
        paddingTop: '10px'
      }}>
        <div>Current: {Object.keys(LOG_LEVELS)[currentLevel]}</div>
        <div>Wallet: {walletLogging ? 'ON' : 'OFF'}</div>
        <div>Transaction: {transactionLogging ? 'ON' : 'OFF'}</div>
      </div>
    </div>
  );
};

export default LoggingControls;