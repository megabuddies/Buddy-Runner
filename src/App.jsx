import React, { useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import GameComponent from './components/GameComponent';
import WalletComponent from './components/WalletComponent';
import NetworkSelection from './components/NetworkSelection';
import WalletConnection from './components/WalletConnection';
import GameDemo from './components/GameDemo';
import './App.css';

const App = () => {
  const appId = 'cme84q0og02aalc0bh9blzwa9';
  const [gameState, setGameState] = useState('network-selection'); // 'network-selection' | 'wallet-connection' | 'game' | 'blockchain-demo'
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
          <div>
            <div style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              zIndex: 1000 
            }}>
              <button
                onClick={() => setGameState('blockchain-demo')}
                style={{
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                🚀 Blockchain Demo
              </button>
            </div>
            <NetworkSelection 
              onNetworkSelect={handleNetworkSelect}
              onStartGame={handleStartGame}
            />
          </div>
        ) : gameState === 'blockchain-demo' ? (
          <div>
            <div style={{ 
              position: 'absolute', 
              top: '20px', 
              left: '20px', 
              zIndex: 1000 
            }}>
              <button
                onClick={() => setGameState('network-selection')}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ← Назад к игре
              </button>
            </div>
            <GameDemo />
          </div>
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
            <div className="back-to-network-button">
              <button 
                className="back-button"
                onClick={handleBackToNetworkSelection}
              >
                ← Back to Network Selection
              </button>
            </div>
            {/* Only show WalletComponent for blockchain networks, not for web2 */}
            {selectedNetwork && !selectedNetwork.isWeb2 && (
              <WalletComponent 
                selectedNetwork={selectedNetwork} 
                onDisconnect={handleDisconnect}
                disableNetworkControls={true}
              />
            )}
            <div className="game-layout">
              <div className="game-header">
                <div className="header-center">
                  <div className="title">
                    Buddy Runner
                    {selectedNetwork && selectedNetwork.isWeb2 && (
                      <span className="web2-mode"> - Classic Mode</span>
                    )}
                  </div>
                </div>
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