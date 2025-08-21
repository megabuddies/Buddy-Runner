import React, { useEffect, useState } from 'react';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import './WalletConnection.css';

const WalletConnection = ({ onWalletConnected }) => {
  const { user, authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const [loadingText, setLoadingText] = useState('INITIALIZING');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (authenticated && user) {
      onWalletConnected();
      // Автоматическое обновление страницы после успешного подключения кошелька
      // Ждем немного дольше, чтобы кошелек полностью инициализировался
      // Проверяем, не было ли уже обновления страницы
      const lastRefresh = localStorage.getItem('lastPageRefresh');
      const timeSinceLastRefresh = lastRefresh ? Date.now() - parseInt(lastRefresh) : Infinity;
      
      if (timeSinceLastRefresh > 5000) { // Обновляем не чаще чем раз в 5 секунд
        console.log('🔄 Auto-refreshing page after successful wallet connection...');
        localStorage.setItem('lastPageRefresh', Date.now().toString());
        setTimeout(() => {
          window.location.reload();
        }, 3000); // Увеличиваем задержку для полной инициализации кошелька
      } else {
        console.log('⏱️ Page refresh skipped - too recent');
      }
    }
  }, [authenticated, user, onWalletConnected]);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    const textInterval = setInterval(() => {
      const texts = ['INITIALIZING', 'LOADING SYSTEMS', 'CONNECTING', 'SYNCING'];
      setLoadingText(texts[Math.floor(Math.random() * texts.length)]);
    }, 2000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(textInterval);
    };
  }, []);

  const handleConnect = () => {
    login();
  };

  if (!ready) {
    return (
      <div className="preloader-overlay">
        <div className="preloader-container">
          <div className="preloader-content">
            <div className="terminal-header">
              <div className="terminal-title">BUDDY RUNNER SYSTEM</div>
              <div className="terminal-buttons">
                <div className="terminal-button red"></div>
                <div className="terminal-button yellow"></div>
                <div className="terminal-button green"></div>
              </div>
            </div>
            
            <div className="logo-section">
              <div className="pixel-logo">
                <div className="logo-text">
                  <span className="logo-main">BUDDY</span>
                  <span className="logo-accent">RUNNER</span>
                </div>
              </div>
            </div>

            <div className="loading-bar">
              <div className="progress" style={{width: '100%'}}></div>
            </div>

            <div className="loading-text">
              {loadingText}<span className="dots">{dots}</span>
            </div>

            <div className="terminal-text">
              <span className="terminal-prompt">></span> System initialization in progress...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connection-overlay">
      <div className="wallet-connection-container">
        <div className="wallet-connection-content">
          <div className="terminal-header">
            <div className="terminal-title">WALLET CONNECTION PROTOCOL</div>
            <div className="terminal-buttons">
              <div className="terminal-button red"></div>
              <div className="terminal-button yellow"></div>
              <div className="terminal-button green"></div>
            </div>
          </div>

          <div className="logo-section">
            <div className="pixel-logo">
              <div className="logo-text">
                <span className="logo-main">BUDDY</span>
                <span className="logo-accent">RUNNER</span>
              </div>
              <div className="logo-powered">POWERED BY <strong>MEGA BUDDIES</strong></div>
            </div>
          </div>
          
          <div className="connection-section">
            <div className="connection-icon">🔗</div>
            <h2 className="connection-title">AUTHENTICATION REQUIRED</h2>
            <div className="terminal-content">
              <div className="terminal-text">
                <span className="terminal-prompt">></span> CONNECT YOUR WALLET TO ACCESS THE GAME
              </div>
              <div className="terminal-text">
                <span className="terminal-prompt">></span> ALL SCORES WILL BE STORED ON-CHAIN
              </div>
              <div className="terminal-text">
                <span className="terminal-prompt">></span> SECURE BLOCKCHAIN AUTHENTICATION
              </div>
            </div>
            
            <button className="connect-wallet-button" onClick={handleConnect}>
              <span className="button-icon">🔐</span>
              CONNECT WALLET
              <div className="button-glow"></div>
            </button>
            
            <div className="supported-options">
              <div className="options-title">SUPPORTED AUTHENTICATION METHODS:</div>
              <div className="options-grid">
                <div className="option-item">
                  <span className="option-icon">📧</span>
                  <span className="option-text">EMAIL</span>
                </div>
                <div className="option-item">
                  <span className="option-icon">📱</span>
                  <span className="option-text">PHONE</span>
                </div>
                <div className="option-item">
                  <span className="option-icon">🦊</span>
                  <span className="option-text">METAMASK</span>
                </div>
                <div className="option-item">
                  <span className="option-icon">💼</span>
                  <span className="option-text">OTHER WALLETS</span>
                </div>
              </div>
            </div>

            <div className="security-info">
              <div className="terminal-text">
                <span className="terminal-prompt">></span> SECURITY: 256-BIT ENCRYPTION
              </div>
              <div className="terminal-text">
                <span className="terminal-prompt">></span> NETWORK: MEGAETH COMPATIBLE
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;