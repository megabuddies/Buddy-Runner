import React, { useState, useEffect } from 'react';
import './NetworkSelection.css';

const NetworkSelection = ({ onNetworkSelect, onStartGame }) => {
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [terminalText, setTerminalText] = useState('');

  const networks = [
    { 
      id: 6342, 
      name: 'MEGAETH TESTNET', 
      emoji: '⚡',
      description: 'Ultra-fast execution layer',
      tech: 'Lightning-fast transactions',
      color: '#ff6b6b',
      status: 'ONLINE',
      icon: '🚀'
    },
    { 
      id: 84532, 
      name: 'BASE SEPOLIA', 
      emoji: '🔵',
      description: 'Ethereum L2 testnet',
      tech: 'Reliable scaling solution',
      color: '#4ecdc4',
      status: 'ONLINE',
      icon: '🌐'
    },
    { 
      id: 10143, 
      name: 'MONAD TESTNET', 
      emoji: '🟣',
      description: 'Next-gen blockchain',
      tech: 'Advanced consensus',
      color: '#9b59b6',
      status: 'BETA',
      icon: '🔮'
    }
  ];

  useEffect(() => {
    const initMessages = [
      'INITIALIZING NETWORK SCANNER...',
      'DETECTING AVAILABLE CHAINS...',
      'ESTABLISHING SECURE CONNECTIONS...',
      'SYSTEM READY FOR NETWORK SELECTION'
    ];

    let messageIndex = 0;
    const interval = setInterval(() => {
      setTerminalText(initMessages[messageIndex]);
      messageIndex++;
      if (messageIndex >= initMessages.length) {
        clearInterval(interval);
        setTimeout(() => setIsInitializing(false), 500);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    onNetworkSelect(network);
  };

  const handleStartGame = () => {
    if (selectedNetwork) {
      onStartGame(selectedNetwork);
    }
  };

  if (isInitializing) {
    return (
      <div className="network-scanner-overlay">
        <div className="scanner-container">
          <div className="scanner-content">
            <div className="terminal-header">
              <div className="terminal-title">NETWORK SCANNER PROTOCOL</div>
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

            <div className="scanner-display">
              <div className="radar-container">
                <div className="radar-sweep"></div>
                <div className="radar-grid"></div>
              </div>
            </div>

            <div className="scanner-text">
              <span className="terminal-prompt">></span> {terminalText}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="network-selection-overlay">
      <div className="network-selection-container">
        <div className="network-selection-content">
          <div className="terminal-header">
            <div className="terminal-title">BLOCKCHAIN NETWORK SELECTOR</div>
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
          
          <div className="mission-briefing">
            <div className="briefing-title">MISSION BRIEFING</div>
            <div className="briefing-content">
              <div className="terminal-text">
                <span className="terminal-prompt">></span> OBJECTIVE: SURVIVE 60 SECONDS ON EACH NETWORK
              </div>
              <div className="terminal-text">
                <span className="terminal-prompt">></span> ANALYZE BLOCK TIME IMPACT ON USER EXPERIENCE
              </div>
              <div className="terminal-text">
                <span className="terminal-prompt">></span> DISCOVER THE POWER OF REAL-TIME BLOCKCHAIN
              </div>
            </div>
          </div>

          <div className="network-selection">
            <div className="selection-title">SELECT TARGET BLOCKCHAIN NETWORK:</div>
            
            <div className="network-grid">
              {networks.map((network) => (
                <div
                  key={network.id}
                  className={`network-card ${selectedNetwork?.id === network.id ? 'selected' : ''}`}
                  onClick={() => handleNetworkSelect(network)}
                >
                  <div className="network-header">
                    <div className="network-icon">{network.icon}</div>
                    <div className="network-status" data-status={network.status}>
                      {network.status}
                    </div>
                  </div>
                  
                  <div className="network-info">
                    <div className="network-name">{network.name}</div>
                    <div className="network-description">{network.description}</div>
                    <div className="network-tech">{network.tech}</div>
                  </div>

                  <div className="network-specs">
                    <div className="spec-item">
                      <span className="spec-label">CHAIN ID:</span>
                      <span className="spec-value">{network.id}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">NETWORK:</span>
                      <span className="spec-value">TESTNET</span>
                    </div>
                  </div>

                  <div className="selection-indicator">
                    {selectedNetwork?.id === network.id && (
                      <div className="selected-glow">SELECTED</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedNetwork && (
              <div className="launch-section">
                <div className="launch-info">
                  <div className="terminal-text">
                    <span className="terminal-prompt">></span> TARGET NETWORK: {selectedNetwork.name}
                  </div>
                  <div className="terminal-text">
                    <span className="terminal-prompt">></span> MISSION STATUS: READY FOR DEPLOYMENT
                  </div>
                </div>
                <button className="launch-button" onClick={handleStartGame}>
                  <span className="button-icon">🚀</span>
                  LAUNCH MISSION ON {selectedNetwork.name}
                  <div className="button-glow"></div>
                </button>
              </div>
            )}
          </div>

          <div className="system-status">
            <div className="status-bar">
              <div className="status-item">
                <span className="status-label">SYSTEMS:</span>
                <span className="status-value online">ONLINE</span>
              </div>
              <div className="status-item">
                <span className="status-label">SECURITY:</span>
                <span className="status-value secure">SECURE</span>
              </div>
              <div className="status-item">
                <span className="status-label">READY:</span>
                <span className="status-value ready">TRUE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkSelection;