import React, { useEffect } from 'react';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import './WalletConnection.css';

const WalletConnection = ({ onWalletConnected }) => {
  const { user, authenticated, ready } = usePrivy();
  const { login } = useLogin();

  useEffect(() => {
    if (authenticated && user) {
      onWalletConnected();
    }
  }, [authenticated, user, onWalletConnected]);

  const handleConnect = () => {
    login();
  };

  if (!ready) {
    return (
      <div className="wallet-connection-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="wallet-connection-container">
      <div className="wallet-connection-content">
        <div className="game-logo">
          <div className="logo-text">
            <span className="logo-main">BUDDY</span>
            <span className="logo-accent">RUNNER</span>
          </div>
          <div className="logo-powered">powered by <strong>Mega Buddies</strong></div>
        </div>
        
        <div className="connection-section">
          <div className="connection-icon">🔗</div>
          <h2 className="connection-title">Connect Your Wallet</h2>
          <p className="connection-description">
            To start playing Buddy Runner, you need to connect your wallet first.
            This ensures your achievements and scores are saved on the blockchain.
          </p>
          
          <button className="connect-wallet-button" onClick={handleConnect}>
            <span className="button-icon">👛</span>
            Connect Wallet
          </button>
          
          <div className="supported-options">
            <p className="options-title">Supported options:</p>
            <div className="options-list">
              <span className="option">📧 Email</span>
              <span className="option">📱 Phone</span>
              <span className="option">🦊 MetaMask</span>
              <span className="option">🔷 Other Wallets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;