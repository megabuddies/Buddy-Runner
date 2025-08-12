import React, { useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import GameComponent from './components/GameComponent';
import WalletComponent from './components/WalletComponent';
import NetworkSelection from './components/NetworkSelection';
import WalletConnection from './components/WalletConnection';
import './App.css';

const App = () => {
  const appId = 'cme84q0og02aalc0bh9blzwa9';
  const [gameState, setGameState] = useState('network-selection'); // 'network-selection' | 'wallet-connection' | 'game'
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  const privyConfig = {
    appearance: {
      theme: 'light',
      accentColor: '#7FBC7F',
      logo: 'https://your-logo-url.com/logo.png', // Можете заменить на свой логотип
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
    },
    loginMethods: ['email', 'wallet'],
    supportedChains: [
      {
        id: 6342, // MegaETH Testnet
        name: 'MegaETH Testnet',
        network: 'megaeth-testnet',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://carrot.megaeth.com/rpc'],
            webSocket: ['wss://carrot.megaeth.com/ws'],
          },
        },
        blockExplorers: {
          default: {
            name: 'MegaETH Explorer',
            url: 'https://carrot.megaeth.com',
          },
        },
      },
      {
        id: 84532, // Base Sepolia
        name: 'Base Sepolia',
        network: 'base-sepolia',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://sepolia.base.org'],
          },
        },
        blockExplorers: {
          default: {
            name: 'Base Sepolia Explorer',
            url: 'https://sepolia.basescan.org',
          },
        },
      },
      {
        id: 10143, // Monad Testnet
        name: 'Monad Testnet',
        network: 'monad-testnet',
        nativeCurrency: {
          name: 'Monad',
          symbol: 'MON',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://testnet-rpc.monad.xyz'],
          },
        },
        blockExplorers: {
          default: {
            name: 'Monad Explorer',
            url: 'https://testnet.monadexplorer.com',
          },
        },
      },
      {
        id: 1, // Ethereum Mainnet
        name: 'Ethereum',
        network: 'homestead',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://eth-mainnet.g.alchemy.com/v2/your-api-key'],
          },
        },
        blockExplorers: {
          default: {
            name: 'Etherscan',
            url: 'https://etherscan.io',
          },
        },
      },
      {
        id: 11155111, // Sepolia Testnet
        name: 'Sepolia',
        network: 'sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://sepolia.infura.io/v3/your-api-key'],
          },
        },
        blockExplorers: {
          default: {
            name: 'Etherscan',
            url: 'https://sepolia.etherscan.io',
          },
        },
      },
    ],
  };

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
  };

  const handleStartGame = (network) => {
    setSelectedNetwork(network);
    setGameState('game'); // Skip wallet-connection state
  };

  const handleWalletConnected = () => {
    setGameState('game');
  };

  const handleBackToNetworkSelection = () => {
    setGameState('network-selection');
    setSelectedNetwork(null);
  };

  const handleBackToWalletConnection = () => {
    setGameState('wallet-connection');
  };

  const handleDisconnect = () => {
    // Reset state and return to network selection
    setGameState('network-selection');
    setSelectedNetwork(null);
  };

  return (
    <PrivyProvider
      appId={appId}
      config={privyConfig}
    >
      <div className="app">
        {gameState === 'network-selection' ? (
          <NetworkSelection 
            onNetworkSelect={handleNetworkSelect}
            onStartGame={handleStartGame}
          />
        ) : gameState === 'wallet-connection' ? (
          <div>
            <div className="back-to-wallet">
              <button 
                className="back-button-small"
                onClick={handleBackToNetworkSelection}
              >
                ← Back to Network Selection
              </button>
            </div>
            <WalletConnection onWalletConnected={handleWalletConnected} />
          </div>
        ) : (
          <>
            <WalletComponent 
              selectedNetwork={selectedNetwork} 
              onDisconnect={handleDisconnect}
              disableNetworkControls={true}
            />
            <div className="game-header">
              <button 
                className="back-button"
                onClick={handleBackToNetworkSelection}
              >
                ← Back to Network Selection
              </button>
              <div className="title">
                Buddy Runner
              </div>
              <div className="header-info">
                {selectedNetwork && (
                  <div className="current-network-info">
                    <span className="network-indicator">
                      {selectedNetwork.emoji} {selectedNetwork.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <GameComponent selectedNetwork={selectedNetwork} />
            <div className="instructions">
              <p className="main-instruction">📱 Press SPACE or tap to make Buddy jump!</p>
              <p className="help-text">Help our brave bunny Buddy hop over the giant carrots and achieve the highest score!</p>
              <p className="warning-text">Watch out for those sneaky garden carrots!</p>
            </div>
          </>
        )}
      </div>
    </PrivyProvider>
  );
};

export default App;