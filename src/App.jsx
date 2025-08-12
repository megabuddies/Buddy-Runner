import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import GameComponent from './components/GameComponent';
import WalletComponent from './components/WalletComponent';
import './App.css';

const App = () => {
  const appId = 'cme84q0og02aalc0bh9blzwa9';

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
        id: 12227332, // MegaETH Testnet
        name: 'MegaETH Testnet',
        network: 'megaeth-testnet',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://rpc.sepolia.megaeth.systems'],
          },
        },
        blockExplorers: {
          default: {
            name: 'MegaETH Explorer',
            url: 'https://sepolia-explorer.megaeth.systems',
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
        id: 41454, // Monad Testnet
        name: 'Monad Testnet',
        network: 'monad-testnet',
        nativeCurrency: {
          name: 'Monad',
          symbol: 'MON',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://testnet1.monad.xyz'],
          },
        },
        blockExplorers: {
          default: {
            name: 'Monad Explorer',
            url: 'https://testnet1-explorer.monad.xyz',
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

  return (
    <PrivyProvider
      appId={appId}
      config={privyConfig}
    >
      <div className="app">
        <WalletComponent />
        <div className="title">
          🐰 Buddy's Great Carrot Adventure 🥕
        </div>
        <GameComponent />
        <div className="instructions">
          <p className="main-instruction">📱 Press SPACE or tap to make Buddy jump!</p>
          <p className="help-text">Help our brave bunny Buddy hop over the giant carrots and achieve the highest score!</p>
          <p className="warning-text">Watch out for those sneaky garden carrots!</p>
        </div>
      </div>
    </PrivyProvider>
  );
};

export default App;