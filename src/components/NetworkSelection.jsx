import React, { useState } from 'react';
import './NetworkSelection.css';

const NetworkSelection = ({ onNetworkSelect, onStartGame }) => {
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  const networks = [
    { 
      id: 6342, 
      name: 'MEGAETH TESTNET', 
      emoji: '⚡',
      description: 'Lightning-fast transactions',
      color: '#FF6B6B'
    },
    { 
      id: 84532, 
      name: 'BASE SEPOLIA', 
      emoji: '🔵',
      description: 'Reliable Ethereum L2',
      color: '#4ECDC4'
    },
    { 
      id: 10143, 
      name: 'MONAD TESTNET', 
      emoji: '🟣',
      description: 'Next-gen blockchain',
      color: '#9B59B6'
    }
  ];

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    onNetworkSelect(network);
  };

  const handleStartGame = () => {
    if (selectedNetwork) {
      onStartGame(selectedNetwork);
    }
  };

  return (
    <div className="network-selection-container">
      <div className="game-logo">
        <div className="logo-text">
          <span className="logo-main">CROSSY</span>
          <span className="logo-accent">Fluffle</span>
        </div>
        <div className="logo-trademark">®</div>
      </div>
      
      <div className="game-description">
        <p>Welcome to Crossy Fluffle. Get as far as you can in 60s on each</p>
        <p>network to see the impact of block times on user experience. You</p>
        <p>will remember what real-time feels like.</p>
      </div>

      <div className="network-selection">
        <h2 className="selection-title">Start with one of the chains:</h2>
        
        <div className="network-buttons">
          {networks.map((network) => (
            <button
              key={network.id}
              className={`network-button ${selectedNetwork?.id === network.id ? 'selected' : ''}`}
              onClick={() => handleNetworkSelect(network)}
              style={{ 
                borderColor: selectedNetwork?.id === network.id ? network.color : '#666',
                backgroundColor: selectedNetwork?.id === network.id ? `${network.color}20` : 'transparent'
              }}
            >
              <span className="network-emoji">{network.emoji}</span>
              <span className="network-name">{network.name}</span>
              <span className="network-description">{network.description}</span>
            </button>
          ))}
        </div>

        {selectedNetwork && (
          <div className="start-game-section">
            <button className="start-game-button" onClick={handleStartGame}>
              🐰 Start Adventure on {selectedNetwork.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkSelection;