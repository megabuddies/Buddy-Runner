import React, { useState } from 'react';
import { useFaucet, useWalletInfo } from '../hooks/useContracts.js';

const FaucetComponent = () => {
  const { 
    faucetInfo, 
    depositToFaucet, 
    requestDrip, 
    emergencyWithdraw,
    changeOwner,
    refreshFaucetInfo, 
    isLoading: faucetLoading, 
    error: faucetError,
    isAvailable 
  } = useFaucet();
  
  const { networkConfig, walletAddress, walletBalance } = useWalletInfo();
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [dripAddress, setDripAddress] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [lastTxHash, setLastTxHash] = useState(null);
  const [notification, setNotification] = useState(null);

  const handleDeposit = async () => {
    try {
      setNotification({ type: 'info', message: 'Sending deposit transaction...' });
      const result = await depositToFaucet(depositAmount);
      
      if (result.success) {
        setLastTxHash(result.txHash);
        setNotification({ 
          type: 'success', 
          message: `Deposited ${depositAmount} ETH! Gas used: ${result.gasUsed}` 
        });
        setDepositAmount('0.1');
      }
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: `Failed to deposit: ${error.message}` 
      });
    }
  };

  const handleRequestDrip = async () => {
    if (!dripAddress) {
      setNotification({ type: 'error', message: 'Please enter an address' });
      return;
    }

    try {
      setNotification({ type: 'info', message: 'Sending drip transaction...' });
      const result = await requestDrip(dripAddress);
      
      if (result.success) {
        setLastTxHash(result.txHash);
        setNotification({ 
          type: 'success', 
          message: `Drip sent to ${dripAddress.slice(0, 6)}...${dripAddress.slice(-4)}! Gas used: ${result.gasUsed}` 
        });
        setDripAddress('');
      }
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: `Failed to send drip: ${error.message}` 
      });
    }
  };

  const handleEmergencyWithdraw = async () => {
    try {
      setNotification({ type: 'info', message: 'Sending emergency withdraw transaction...' });
      const result = await emergencyWithdraw();
      
      if (result.success) {
        setLastTxHash(result.txHash);
        setNotification({ 
          type: 'success', 
          message: `Emergency withdraw completed! Gas used: ${result.gasUsed}` 
        });
      }
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: `Failed to withdraw: ${error.message}` 
      });
    }
  };

  const handleChangeOwner = async () => {
    if (!newOwnerAddress) {
      setNotification({ type: 'error', message: 'Please enter a new owner address' });
      return;
    }

    try {
      setNotification({ type: 'info', message: 'Sending change owner transaction...' });
      const result = await changeOwner(newOwnerAddress);
      
      if (result.success) {
        setLastTxHash(result.txHash);
        setNotification({ 
          type: 'success', 
          message: `Owner changed to ${newOwnerAddress.slice(0, 6)}...${newOwnerAddress.slice(-4)}! Gas used: ${result.gasUsed}` 
        });
        setNewOwnerAddress('');
      }
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: `Failed to change owner: ${error.message}` 
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshFaucetInfo();
      setNotification({ type: 'success', message: 'Faucet info refreshed!' });
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
      <div className="faucet-container">
        <div className="contracts-unavailable">
          <h3>💧 Faucet Contract</h3>
          <p>Contract not deployed on current network</p>
          {networkConfig && (
            <p className="network-info">Current network: {networkConfig.name}</p>
          )}
          <div className="deployment-note">
            <p>📝 To use this feature:</p>
            <ol>
              <li>Deploy the Faucet contract to {networkConfig?.name || 'current network'}</li>
              <li>Update the contract address in `src/config/contracts.js`</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="faucet-container">
      <div className="contract-header">
        <h3>💧 Faucet Contract</h3>
        <p className="contract-description">
          Distribute ETH to addresses on {networkConfig?.name || 'blockchain'}
        </p>
        
        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={faucetLoading}
        >
          {faucetLoading ? '🔄' : '↻'} Refresh Info
        </button>
      </div>

      {faucetInfo && (
        <div className="faucet-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Balance:</span>
              <span className="info-value">{parseFloat(faucetInfo.balance).toFixed(4)} ETH</span>
            </div>
            <div className="info-item">
              <span className="info-label">Drip Amount:</span>
              <span className="info-value">{faucetInfo.dripAmount} ETH</span>
            </div>
            <div className="info-item">
              <span className="info-label">Owner:</span>
              <span className="info-value">
                {faucetInfo.owner.slice(0, 6)}...{faucetInfo.owner.slice(-4)}
                {faucetInfo.isOwner && <span className="owner-badge"> (You)</span>}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="faucet-actions">
        {/* Deposit Section */}
        <div className="action-section">
          <h4>💰 Deposit to Faucet</h4>
          <div className="input-group">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount in ETH"
              min="0"
              step="0.001"
              disabled={faucetLoading}
            />
            <button 
              className="action-btn deposit-btn"
              onClick={handleDeposit}
              disabled={faucetLoading || !depositAmount || parseFloat(depositAmount) <= 0}
            >
              {faucetLoading ? '⏳ Processing...' : '💰 Deposit'}
            </button>
          </div>
          <p className="balance-info">Your balance: {parseFloat(walletBalance).toFixed(4)} ETH</p>
        </div>

        {/* Drip Section - Only show if user is owner */}
        {faucetInfo?.isOwner && (
          <div className="action-section">
            <h4>💧 Send Drip</h4>
            <div className="input-group">
              <input
                type="text"
                value={dripAddress}
                onChange={(e) => setDripAddress(e.target.value)}
                placeholder="0x... recipient address"
                disabled={faucetLoading}
              />
              <button 
                className="action-btn drip-btn"
                onClick={handleRequestDrip}
                disabled={faucetLoading || !dripAddress}
              >
                {faucetLoading ? '⏳ Processing...' : '💧 Send Drip'}
              </button>
            </div>
            <p className="action-description">
              Send {faucetInfo?.dripAmount} ETH to any address
            </p>
          </div>
        )}

        {/* Owner Functions */}
        {faucetInfo?.isOwner && (
          <div className="owner-functions">
            <h4>👑 Owner Functions</h4>
            
            <div className="action-section">
              <h5>🚨 Emergency Withdraw</h5>
              <button 
                className="action-btn emergency-btn"
                onClick={handleEmergencyWithdraw}
                disabled={faucetLoading}
              >
                {faucetLoading ? '⏳ Processing...' : '🚨 Emergency Withdraw All'}
              </button>
              <p className="action-description">
                Withdraw all funds from the faucet contract
              </p>
            </div>

            <div className="action-section">
              <h5>👑 Change Owner</h5>
              <div className="input-group">
                <input
                  type="text"
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  placeholder="0x... new owner address"
                  disabled={faucetLoading}
                />
                <button 
                  className="action-btn owner-btn"
                  onClick={handleChangeOwner}
                  disabled={faucetLoading || !newOwnerAddress}
                >
                  {faucetLoading ? '⏳ Processing...' : '👑 Change Owner'}
                </button>
              </div>
            </div>
          </div>
        )}
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

      {faucetError && (
        <div className="error-message">
          Error: {faucetError}
        </div>
      )}

      <div className="wallet-info">
        <p>📱 Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}</p>
        <p>🌐 Network: {networkConfig?.name || 'Unknown'}</p>
      </div>
    </div>
  );
};

export default FaucetComponent;