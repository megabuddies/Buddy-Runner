import React, { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import contractService from '../services/contractService.js';
import UpdaterComponent from './UpdaterComponent.jsx';
import FaucetComponent from './FaucetComponent.jsx';
import { useWalletInfo } from '../hooks/useContracts.js';

const ContractDashboard = () => {
  const { wallets } = useWallets();
  const { networkConfig, areContractsDeployed } = useWalletInfo();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [activeTab, setActiveTab] = useState('updater');

  useEffect(() => {
    const initializeContracts = async () => {
      if (wallets.length > 0) {
        const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
        if (embeddedWallet) {
          try {
            const success = await contractService.initialize(embeddedWallet);
            setIsInitialized(success);
            if (!success) {
              setInitError('Failed to initialize contract service');
            }
          } catch (error) {
            console.error('Contract initialization error:', error);
            setInitError(error.message);
            setIsInitialized(false);
          }
        }
      }
    };

    initializeContracts();
  }, [wallets]);

  if (!wallets.length) {
    return (
      <div className="contract-dashboard">
        <div className="not-connected">
          <h2>🔗 Contract Dashboard</h2>
          <p>Please connect your wallet to interact with contracts</p>
        </div>
      </div>
    );
  }

  if (!isInitialized && !initError) {
    return (
      <div className="contract-dashboard">
        <div className="initializing">
          <h2>🔗 Contract Dashboard</h2>
          <p>🔄 Initializing contracts...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="contract-dashboard">
        <div className="init-error">
          <h2>🔗 Contract Dashboard</h2>
          <p>❌ Error initializing contracts: {initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-btn"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contract-dashboard">
      <div className="dashboard-header">
        <h2>🔗 Contract Dashboard</h2>
        <p className="dashboard-description">
          Interact with your deployed contracts on {networkConfig?.name || 'blockchain'}
        </p>
        
        {!areContractsDeployed && (
          <div className="contracts-status">
            <p>⚠️ Contracts not deployed on current network</p>
            <p className="status-description">
              Deploy your contracts and update addresses in `src/config/contracts.js`
            </p>
          </div>
        )}
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'updater' ? 'active' : ''}`}
          onClick={() => setActiveTab('updater')}
        >
          🔢 Updater
        </button>
        <button 
          className={`tab-btn ${activeTab === 'faucet' ? 'active' : ''}`}
          onClick={() => setActiveTab('faucet')}
        >
          💧 Faucet
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'updater' && <UpdaterComponent />}
        {activeTab === 'faucet' && <FaucetComponent />}
      </div>

      <div className="dashboard-footer">
        <div className="network-info">
          <p>🌐 Network: {networkConfig?.name || 'Unknown'}</p>
          <p>🆔 Chain ID: {networkConfig?.chainId || 'Unknown'}</p>
          {networkConfig?.explorer && (
            <p>🔍 Explorer: <a href={networkConfig.explorer} target="_blank" rel="noopener noreferrer">
              {networkConfig.explorer}
            </a></p>
          )}
        </div>
        
        <div className="contracts-info">
          <p>📄 Contracts Status: {areContractsDeployed ? '✅ Deployed' : '❌ Not Deployed'}</p>
          <p className="info-note">
            Each action creates a transaction on {networkConfig?.name || 'blockchain'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContractDashboard;