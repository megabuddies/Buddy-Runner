import React, { useState } from 'react';
import { useLogin, useLogout, usePrivy, useWallets } from '@privy-io/react-auth';

const WalletComponent = () => {
  const { user, authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { wallets } = useWallets();
  const [showNetworks, setShowNetworks] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  const networks = [
    { id: 12227332, name: 'MegaETH Testnet', emoji: '⚡' },
    { id: 84532, name: 'Base Sepolia', emoji: '🔵' },
    { id: 41454, name: 'Monad Testnet', emoji: '🟣' },
  ];

  const handleWalletAction = () => {
    if (authenticated) {
      logout();
    } else {
      login();
    }
  };

  const switchNetwork = async (chainId) => {
    if (!wallets || wallets.length === 0) return;
    
    setIsNetworkSwitching(true);
    
    try {
      const wallet = wallets[0];
      const networkName = networks.find(n => n.id === chainId)?.name || 'Unknown Network';
      
      // First try to switch to the network
      try {
        await wallet.switchChain(chainId);
        setShowNetworks(false);
        console.log(`Successfully switched to ${networkName}`);
        return;
      } catch (switchError) {
        // If switching fails, try to add the network first
        console.log(`Network ${networkName} not found, attempting to add it...`, switchError);
        
        const networkConfig = getNetworkConfig(chainId);
        if (networkConfig) {
          console.log(`Adding network ${networkName} to wallet...`);
          await addNetwork(wallet, networkConfig);
          
          // Small delay to ensure network is added
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Then try to switch again
          console.log(`Switching to ${networkName}...`);
          await wallet.switchChain(chainId);
          setShowNetworks(false);
          console.log(`Successfully added and switched to ${networkName}`);
        } else {
          throw new Error(`Network configuration not found for chain ID ${chainId}`);
        }
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
      
      let userMessage = 'Failed to switch network. ';
      if (error.message.includes('rejected')) {
        userMessage += 'User cancelled the operation.';
      } else if (error.message.includes('already pending')) {
        userMessage += 'Another network operation is in progress. Please wait and try again.';
      } else {
        userMessage += 'Please try again or add the network manually.';
      }
      
      alert(userMessage);
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  const getNetworkConfig = (chainId) => {
    const networkConfigs = {
      12227332: {
        chainId: '0xBA9304', // 12227332 in hex
        chainName: 'MegaETH Testnet',
        rpcUrls: ['https://rpc.sepolia.megaeth.systems'], // Updated RPC URL
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorerUrls: ['https://sepolia-explorer.megaeth.systems'],
      },
      84532: {
        chainId: '0x14A34', // 84532 in hex
        chainName: 'Base Sepolia',
        rpcUrls: ['https://sepolia.base.org'],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorerUrls: ['https://sepolia.basescan.org'],
      },
      41454: {
        chainId: '0xA1EE', // 41454 in hex
        chainName: 'Monad Testnet',
        rpcUrls: ['https://testnet1.monad.xyz'], // Updated RPC URL
        nativeCurrency: {
          name: 'Monad',
          symbol: 'MON',
          decimals: 18,
        },
        blockExplorerUrls: ['https://testnet1-explorer.monad.xyz'],
      },
    };
    return networkConfigs[chainId];
  };

  const addNetwork = async (wallet, networkConfig) => {
    try {
      // Use the wallet's provider to add the network
      const provider = await wallet.getEthersProvider();
      await provider.send('wallet_addEthereumChain', [networkConfig]);
    } catch (error) {
      // If the error is that the network already exists, that's fine
      if (error.code === 4902 || error.message.includes('already exists') || error.message.includes('Already added')) {
        console.log('Network already exists in wallet');
        return;
      }
      throw error;
    }
  };

  const getCurrentNetwork = () => {
    if (!wallets || wallets.length === 0) return null;
    const wallet = wallets[0];
    return networks.find(network => network.id === wallet.chainId);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletAddress = () => {
    if (user?.wallet?.address) {
      return user.wallet.address;
    }
    if (user?.linkedAccounts) {
      const walletAccount = user.linkedAccounts.find(account => account.type === 'wallet');
      return walletAccount?.address;
    }
    return null;
  };

  const getUserIdentifier = () => {
    if (user?.email?.address) {
      return user.email.address;
    }
    if (user?.phone?.number) {
      return user.phone.number;
    }
    const walletAddress = getWalletAddress();
    if (walletAddress) {
      return formatAddress(walletAddress);
    }
    return 'Unknown User';
  };

  if (!ready) {
    return (
      <div className="wallet-container">
        <button className="wallet-button" disabled>
          Loading...
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <div className="wallet-controls">
        <button 
          className={`wallet-button ${authenticated ? 'connected' : ''}`}
          onClick={handleWalletAction}
        >
          {authenticated ? 'Disconnect' : 'Connect Wallet'}
        </button>
        
        {authenticated && wallets && wallets.length > 0 && (
          <div className="network-selector">
            <button 
              className="network-button"
              onClick={() => setShowNetworks(!showNetworks)}
              disabled={isNetworkSwitching}
            >
              {isNetworkSwitching ? (
                '🔄 Switching...'
              ) : getCurrentNetwork() ? (
                `${getCurrentNetwork().emoji} ${getCurrentNetwork().name}`
              ) : (
                '🌐 Select Network'
              )}
            </button>
            
            {showNetworks && (
              <div className="network-dropdown">
                {networks.map(network => (
                  <button
                    key={network.id}
                    className={`network-option ${
                      getCurrentNetwork()?.id === network.id ? 'active' : ''
                    }`}
                    onClick={() => switchNetwork(network.id)}
                    disabled={isNetworkSwitching}
                  >
                    {isNetworkSwitching ? '🔄' : network.emoji} {network.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {authenticated && (
        <div className="wallet-info">
          <div className="wallet-status">Connected</div>
          <div className="wallet-user">{getUserIdentifier()}</div>
          {getWalletAddress() && (
            <div className="wallet-address">
              Wallet: {formatAddress(getWalletAddress())}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletComponent;