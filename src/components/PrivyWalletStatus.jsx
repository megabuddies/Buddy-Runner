import React, { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useBlockchainUtils } from '../hooks/useBlockchainUtils';

const PrivyWalletStatus = ({ selectedNetwork, className = "" }) => {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { 
    balance, 
    getEmbeddedWallet,
    getPoolStatus,
    getInfinitePoolStats
  } = useBlockchainUtils();
  
  const [poolStatus, setPoolStatus] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Получение информации о embedded wallet
  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      const embeddedWallet = getEmbeddedWallet();
      if (embeddedWallet) {
        setWalletInfo({
          address: embeddedWallet.address,
          type: embeddedWallet.walletClientType,
          isEmbedded: embeddedWallet.walletClientType === 'privy'
        });
      }
    }
  }, [authenticated, wallets, getEmbeddedWallet]);

  // Обновление статуса пула транзакций
  useEffect(() => {
    if (selectedNetwork && selectedNetwork.id !== 'select') {
      const updatePoolStatus = () => {
        try {
          const status = getPoolStatus(selectedNetwork.id);
          const infiniteStats = getInfinitePoolStats(selectedNetwork.id);
          
          setPoolStatus({
            ...status,
            infiniteStats
          });
        } catch (error) {
          console.warn('Failed to get pool status:', error);
        }
      };

      updatePoolStatus();
      const interval = setInterval(updatePoolStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedNetwork, getPoolStatus, getInfinitePoolStats]);

  if (!authenticated || !walletInfo) {
    return null;
  }

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-400';
    
    if (status.isReady && status.totalTransactions > 10) {
      return 'text-green-400';
    } else if (status.isReady && status.totalTransactions > 5) {
      return 'text-yellow-400';
    } else if (status.isReady) {
      return 'text-orange-400';
    } else {
      return 'text-red-400';
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return '⏳';
    
    if (status.isReady && status.totalTransactions > 10) {
      return '🚀';
    } else if (status.isReady && status.totalTransactions > 5) {
      return '⚡';
    } else if (status.isReady) {
      return '⚠️';
    } else {
      return '❌';
    }
  };

  return (
    <div className={`privy-wallet-status ${className}`}>
      <div 
        className="status-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="wallet-info">
          <span className="wallet-icon">👛</span>
          <span className="wallet-address">{formatAddress(walletInfo.address)}</span>
          {walletInfo.isEmbedded && (
            <span className="embedded-badge">Privy</span>
          )}
        </div>
        
        {selectedNetwork && selectedNetwork.id !== 'select' && poolStatus && (
          <div className="pool-status">
            <span className={`status-icon ${getStatusColor(poolStatus)}`}>
              {getStatusIcon(poolStatus)}
            </span>
            <span className={`pool-count ${getStatusColor(poolStatus)}`}>
              {poolStatus.totalTransactions - poolStatus.consumedTransactions}
            </span>
          </div>
        )}
        
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>

      {isExpanded && (
        <div className="status-details">
          <div className="detail-section">
            <h4>💰 Wallet Details</h4>
            <div className="detail-item">
              <span>Address:</span>
              <span className="monospace">{walletInfo.address}</span>
            </div>
            <div className="detail-item">
              <span>Type:</span>
              <span>{walletInfo.isEmbedded ? 'Privy Embedded' : 'External'}</span>
            </div>
            <div className="detail-item">
              <span>Balance:</span>
              <span>{balance || '0.0000'} ETH</span>
            </div>
          </div>

          {selectedNetwork && selectedNetwork.id !== 'select' && poolStatus && (
            <div className="detail-section">
              <h4>⚡ Pre-signed Pool Status</h4>
              <div className="detail-item">
                <span>Network:</span>
                <span>{selectedNetwork.name}</span>
              </div>
              <div className="detail-item">
                <span>Status:</span>
                <span className={getStatusColor(poolStatus)}>
                  {poolStatus.isReady ? 'Ready' : 'Initializing'}
                </span>
              </div>
              <div className="detail-item">
                <span>Available:</span>
                <span className={getStatusColor(poolStatus)}>
                  {poolStatus.totalTransactions - poolStatus.consumedTransactions}
                </span>
              </div>
              <div className="detail-item">
                <span>Total Signed:</span>
                <span>{poolStatus.totalTransactions}</span>
              </div>
              <div className="detail-item">
                <span>Used:</span>
                <span>{poolStatus.consumedTransactions}</span>
              </div>
              
              {poolStatus.infiniteStats && (
                <>
                  <div className="detail-item">
                    <span>Refill Cycles:</span>
                    <span>{poolStatus.infiniteStats.cycles}</span>
                  </div>
                  <div className="detail-item">
                    <span>Growth Rate:</span>
                    <span>+{poolStatus.infiniteStats.netGrowthPerCycle}/cycle</span>
                  </div>
                </>
              )}
            </div>
          )}

          {selectedNetwork && selectedNetwork.id !== 'select' && (
            <div className="detail-section">
              <h4>🎮 Gaming Performance</h4>
              <div className="detail-item">
                <span>Instant Mode:</span>
                <span className="text-green-400">
                  {poolStatus?.isReady ? 'Active' : 'Preparing'}
                </span>
              </div>
              <div className="detail-item">
                <span>Burst Mode:</span>
                <span className="text-blue-400">Enabled</span>
              </div>
              <div className="detail-item">
                <span>Auto-refill:</span>
                <span className="text-purple-400">Infinite</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrivyWalletStatus;