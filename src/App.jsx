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

  // Конфигурация сетей для ончейн системы
  const megaethTestnet = {
    id: 6342,
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
  };

  const foundryNetwork = {
    id: 31337,
    name: 'Foundry Local',
    network: 'foundry',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['http://127.0.0.1:8545'],
      },
    },
  };

  const somniaTestnet = {
    id: 50311,
    name: 'Somnia Testnet',
    network: 'somnia-testnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://testnet.somnia.network'],
      },
    },
  };

  const riseTestnet = {
    id: 1313161556,
    name: 'RISE Testnet',
    network: 'rise-testnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://testnet-rpc.rise.com'],
      },
    },
  };

  // Privy configuration optimized for seamless gaming experience
  const privyConfig = {
    appId: "cm25q62mj00nks8j5lxk4qyly",
    config: {
      // Appearance
      appearance: {
        theme: 'dark',
        accentColor: '#1391ff',
        logo: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=100&h=100&fit=crop&crop=center',
        walletChainType: 'ethereum-and-solana',
        showWalletLoginFirst: false,
        showWalletUiOnNotConnected: false, // Отключаем UI кошелька
        showWalletUi: false, // Полностью отключаем UI кошелька
      },

      // Отключаем аналитику и телеметрию для улучшения производительности
      analytics: {
        enabled: false, // Полностью отключаем аналитику
      },
      
      // Минимизируем сетевые запросы
      telemetry: {
        enabled: false, // Отключаем телеметрию
      },

      // Дополнительные настройки для минимизации запросов
      clientAnalytics: {
        enabled: false, // Отключаем клиентскую аналитику
      },
      
      // Отключаем автоматические обновления и проверки
      autoRefresh: false,
      backgroundSync: false,
      
      // РЕВОЛЮЦИОННАЯ конфигурация Embedded Wallets для нулевого трения
      embeddedWallets: {
        createOnLogin: 'all-users', // Автоматическое создание для всех пользователей
        requireUserPasswordOnCreate: false, // Убираем трение пароля
        prependWithWalletUi: false, // Не показываем дополнительные UI элементы
        noPromptOnSignature: true, // Отключаем промпты для подписи
        showWalletUiOnNotConnected: false, // Не показываем UI если не подключен
        showWalletLoginFirst: false, // Отключаем первоначальное отображение кошелька
      },
      
      // Login methods optimized for gaming
      loginMethods: ['email', 'wallet', 'google', 'discord', 'twitter'],
      
      // МГНОВЕННЫЕ настройки сети
      defaultChain: megaethTestnet, // MegaETH как приоритетная сеть
      supportedChains: [
        megaethTestnet,
        foundryNetwork,
        somniaTestnet,
        riseTestnet,
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
      
      // Оптимизация для Real-Time Gaming
      walletConnectCloudProjectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || "default",
      
      // УЛУЧШЕННЫЕ настройки для минимального трения
      legal: {
        termsAndConditionsUrl: '/terms',
        privacyPolicyUrl: '/privacy',
      },
      
      // Автоматические разрешения для игры 
      mfa: {
        noPromptOnMfaRequired: false
      }
    }
  };

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
  };

  const handleStartGame = (network) => {
    setSelectedNetwork(network);
    // For blockchain networks, require authentication first
    if (!network.isWeb2) {
      setGameState('wallet-connection');
    } else {
      setGameState('game');
    }
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