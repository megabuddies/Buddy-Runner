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
          type: embeddedWallet.walletClientType || embeddedWallet.connectorType,
          isEmbedded: embeddedWallet.walletClientType === 'privy' || 
                     embeddedWallet.connectorType === 'embedded' ||
                     embeddedWallet.connectorType === 'privy'
        });
      }
    } else {
      setWalletInfo(null);
    }
  }, [authenticated, wallets, getEmbeddedWallet]);

  // Обновление статуса пула каждые 2 секунды
  useEffect(() => {
    if (!selectedNetwork || selectedNetwork.isWeb2) return;

    const updatePoolStatus = () => {
      try {
        const status = getPoolStatus?.(selectedNetwork.id);
        const infiniteStats = getInfinitePoolStats?.(selectedNetwork.id);
        
        setPoolStatus({
          ...status,
          infiniteStats
        });
      } catch (error) {
        console.warn('Error updating pool status:', error);
      }
    };

    updatePoolStatus();
    const interval = setInterval(updatePoolStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedNetwork, getPoolStatus, getInfinitePoolStats]);

  if (!authenticated || !walletInfo || selectedNetwork?.isWeb2) {
    return null;
  }

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getPoolTrendIcon = (trend) => {
    switch (trend?.toLowerCase()) {
      case 'growing': return '📈';
      case 'stable': return '➡️';
      case 'attention': return '📉';
      default: return '❓';
    }
  };

  const getPoolStatusColor = (remaining) => {
    if (remaining > 20) return '#4ade80'; // green
    if (remaining > 10) return '#fbbf24'; // yellow
    return '#f87171'; // red
  };

  return (
    <div className={`privy-wallet-status ${className}`}>
      <div className="wallet-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="wallet-indicator">
          <div className={`status-dot ${walletInfo.isEmbedded ? 'embedded' : 'external'}`} />
          <span className="wallet-type">
            {walletInfo.isEmbedded ? '🔐 Privy Wallet' : '🔗 External Wallet'}
          </span>
        </div>
        <div className="wallet-balance">
          {balance} ETH
        </div>
        <div className="expand-icon">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {isExpanded && (
        <div className="wallet-details">
          <div className="wallet-info">
            <div className="info-row">
              <span className="label">Address:</span>
              <span className="value">{formatAddress(walletInfo.address)}</span>
            </div>
            <div className="info-row">
              <span className="label">Type:</span>
              <span className="value">{walletInfo.type}</span>
            </div>
            <div className="info-row">
              <span className="label">Network:</span>
              <span className="value">{selectedNetwork.name}</span>
            </div>
          </div>

          {poolStatus && (
            <div className="pool-status">
              <div className="pool-header">
                <h4>⚡ Pre-signed Transaction Pool</h4>
                <div className="pool-trend">
                  {getPoolTrendIcon(poolStatus.trend)} {poolStatus.trend}
                </div>
              </div>
              
              <div className="pool-stats">
                <div className="stat-item">
                  <span className="stat-label">Ready:</span>
                  <span 
                    className="stat-value"
                    style={{ color: getPoolStatusColor(poolStatus.remaining) }}
                  >
                    {poolStatus.remaining}/{poolStatus.total}
                  </span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">Used:</span>
                  <span className="stat-value">{poolStatus.used}</span>
                </div>
                
                <div className="stat-item">
                  <span className="stat-label">Status:</span>
                  <span className={`stat-value ${poolStatus.isReady ? 'ready' : 'not-ready'}`}>
                    {poolStatus.isReady ? '✅ Ready' : '⏳ Loading'}
                  </span>
                </div>

                {poolStatus.isRefilling && (
                  <div className="stat-item">
                    <span className="stat-label">Refilling:</span>
                    <span className="stat-value refilling">🔄 In Progress</span>
                  </div>
                )}
              </div>

              {poolStatus.infiniteStats && (
                <div className="infinite-pool-stats">
                  <div className="infinite-header">
                    <h5>♾️ Infinite Pool Status</h5>
                  </div>
                  <div className="infinite-stats">
                    <div className="stat-item">
                      <span className="stat-label">Growth Cycles:</span>
                      <span className="stat-value">{poolStatus.infiniteStats.cyclesCompleted}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Net Growth:</span>
                      <span className="stat-value">+{poolStatus.infiniteStats.netGrowth}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Next Refill:</span>
                      <span className="stat-value">
                        {poolStatus.infiniteStats.transactionsToNextRefill || 'N/A'} txs
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrivyWalletStatus;