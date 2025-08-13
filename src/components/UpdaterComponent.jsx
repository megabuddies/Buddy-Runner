import React, { useState } from 'react';
import { useUpdater, useWalletInfo } from '../hooks/useContracts.js';

const UpdaterComponent = () => {
  const { 
    currentNumber, 
    updateNumber, 
    refreshNumber, 
    isLoading: updaterLoading, 
    error: updaterError,
    isAvailable 
  } = useUpdater();
  
  const { networkConfig, walletAddress } = useWalletInfo();
  const [lastTxHash, setLastTxHash] = useState(null);
  const [notification, setNotification] = useState(null);

  const handleUpdate = async () => {
    try {
      setNotification({ type: 'info', message: 'Sending transaction...' });
      const result = await updateNumber();
      
      if (result.success) {
        setLastTxHash(result.txHash);
        setNotification({ 
          type: 'success', 
          message: `Number updated! Gas used: ${result.gasUsed}` 
        });
      }
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: `Failed to update: ${error.message}` 
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshNumber();
      setNotification({ type: 'success', message: 'Number refreshed!' });
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: `Failed to refresh: ${error.message}` 
      });
    }
  };

  // Clear notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!isAvailable) {
    return (
      <div className="updater-container">
        <div className="contracts-unavailable">
          <h3>🔗 Updater Contract</h3>
          <p>Contract not deployed on current network</p>
          {networkConfig && (
            <p className="network-info">Current network: {networkConfig.name}</p>
          )}
          <div className="deployment-note">
            <p>📝 To use this feature:</p>
            <ol>
              <li>Deploy the Updater contract to {networkConfig?.name || 'current network'}</li>
              <li>Update the contract address in `src/config/contracts.js`</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="updater-container">
      <div className="contract-header">
        <h3>🔢 Updater Contract</h3>
        <p className="contract-description">
          Each update is a transaction on {networkConfig?.name || 'blockchain'}
        </p>
      </div>

      <div className="contract-content">
        <div className="current-number-section">
          <div className="number-display">
            <span className="number-label">Current Number:</span>
            <span className="number-value">
              {updaterLoading ? '...' : currentNumber || '0'}
            </span>
          </div>
          
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={updaterLoading}
          >
            {updaterLoading ? '🔄' : '↻'} Refresh
          </button>
        </div>

        <div className="action-section">
          <button 
            className="update-btn"
            onClick={handleUpdate}
            disabled={updaterLoading}
          >
            {updaterLoading ? '⏳ Processing...' : '🚀 Update Number (+1)'}
          </button>
          
          <p className="action-description">
            Click to increment the number by 1. Each click creates a new transaction.
          </p>
        </div>

        {lastTxHash && (
          <div className="transaction-info">
            <p className="tx-label">Last Transaction:</p>
            <a 
              href={`${networkConfig?.explorer}/tx/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
            </a>
          </div>
        )}

        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        {updaterError && (
          <div className="error-message">
            Error: {updaterError}
          </div>
        )}
      </div>

      <div className="wallet-info">
        <p>📱 Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}</p>
        <p>🌐 Network: {networkConfig?.name || 'Unknown'}</p>
      </div>
    </div>
  );
};

export default UpdaterComponent;