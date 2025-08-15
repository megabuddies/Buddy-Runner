import React, { useState, useEffect } from 'react';
import { useLogin, useLogout, usePrivy, useWallets } from '@privy-io/react-auth';

const WalletComponent = ({ selectedNetwork, onDisconnect, disableNetworkControls = false }) => {
  const { user, authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { wallets } = useWallets();
  const [showNetworks, setShowNetworks] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  const networks = [
    { id: 6342, name: 'MegaETH Testnet', emoji: '⚡' },
    { id: 84532, name: 'Base Sepolia', emoji: '🔵' },
    { id: 10143, name: 'Monad Testnet', emoji: '🟣' },
  ];

  // Auto-switch to selected network when wallet connects
  useEffect(() => {
    const autoSwitchNetwork = async () => {
      if (authenticated && wallets && wallets.length > 0 && selectedNetwork && !isNetworkSwitching) {
        try {
          const wallet = wallets[0];
          
          // Safely get chain ID with error handling
          let currentChainId;
          try {
            // Check if wallet has getChainId method
            if (typeof wallet.getChainId === 'function') {
              currentChainId = await wallet.getChainId();
            } else if (wallet.chainId) {
              // Fallback to chainId property
              currentChainId = wallet.chainId;
            } else {
              // Try to get chain ID from provider
              const provider = await wallet.getEthereumProvider?.();
              if (provider && provider.request) {
                const chainIdHex = await provider.request({ method: 'eth_chainId' });
                currentChainId = parseInt(chainIdHex, 16);
              } else {
                console.warn('Cannot determine current chain ID, skipping auto-switch');
                return;
              }
            }
          } catch (chainIdError) {
            console.warn('Failed to get current chain ID:', chainIdError);
            return;
          }
          
          if (currentChainId !== selectedNetwork.id) {
            console.log(`Auto-switching to ${selectedNetwork.name}...`);
            setIsNetworkSwitching(true);
            await switchNetwork(selectedNetwork.id);
          }
        } catch (error) {
          console.warn('Auto network switch failed:', error);
        } finally {
          setIsNetworkSwitching(false);
        }
      }
    };

    autoSwitchNetwork();
  }, [authenticated, wallets, selectedNetwork]);

  const handleWalletAction = () => {
    if (authenticated) {
      logout();
      // Call disconnect callback if provided
      if (onDisconnect) {
        onDisconnect();
      }
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
      
      // Safely check if wallet supports switchChain method
      if (typeof wallet.switchChain !== 'function') {
        console.warn('Wallet does not support network switching');
        alert('This wallet does not support automatic network switching. Please switch manually.');
        return;
      }
      
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
          
          try {
            await addNetwork(wallet, networkConfig);
            
            // Small delay to ensure network is added
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Then try to switch again
            console.log(`Switching to ${networkName}...`);
            await wallet.switchChain(chainId);
            setShowNetworks(false);
            console.log(`Successfully added and switched to ${networkName}`);
          } catch (addNetworkError) {
            // Check if this is the Privy mainnet RPC limitation
            if (addNetworkError.message?.includes('this request method is not supported') || 
                addNetworkError.message?.includes('mainnet.rpc.privy.systems') ||
                addNetworkError.code === 'SERVER_ERROR') {
              // Network addition failed due to Privy limitation, but user was informed
              console.log('Network addition failed due to Privy limitation - user needs to add manually');
              return; // Exit gracefully, user was already informed
            }
            throw addNetworkError; // Re-throw other errors
          }
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
      6342: {
        chainId: '0x18C6', // 6342 in hex
        chainName: 'MegaETH Testnet',
        rpcUrls: ['https://carrot.megaeth.com/rpc'],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorerUrls: ['https://carrot.megaeth.com'],
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
      10143: {
        chainId: '0x279F', // 10143 in hex
        chainName: 'Monad Testnet',
        rpcUrls: ['https://testnet-rpc.monad.xyz'],
        nativeCurrency: {
          name: 'Monad',
          symbol: 'MON',
          decimals: 18,
        },
        blockExplorerUrls: ['https://testnet.monadexplorer.com'],
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
      
      // Handle Privy's mainnet RPC limitation for testnet chains
      if (error.message.includes('this request method is not supported') || 
          error.message.includes('mainnet.rpc.privy.systems') ||
          error.code === 'SERVER_ERROR') {
        console.warn('⚠️ Privy mainnet RPC does not support adding testnet chains');
        console.log('Network configuration available, but automatic addition failed:', networkConfig);
        
        // Show user-friendly message for manual network addition
        alert(`Please add the ${networkConfig.chainName} network manually in your wallet:\n\n` +
              `Network Name: ${networkConfig.chainName}\n` +
              `RPC URL: ${networkConfig.rpcUrls[0]}\n` +
              `Chain ID: ${networkConfig.chainId}\n` +
              `Currency Symbol: ${networkConfig.nativeCurrency.symbol}\n` +
              `Block Explorer: ${networkConfig.blockExplorerUrls[0]}\n\n` +
              `After adding the network manually, try switching again.`);
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
        
        {authenticated && wallets && wallets.length > 0 && !disableNetworkControls && (
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
                    } ${selectedNetwork?.id === network.id ? 'selected-game-network' : ''}`}
                    onClick={() => switchNetwork(network.id)}
                    disabled={isNetworkSwitching}
                  >
                    {isNetworkSwitching ? '🔄' : network.emoji} {network.name}
                    {selectedNetwork?.id === network.id && ' 🎮'}
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
          <div className="wallet-network">
            {selectedNetwork ? selectedNetwork.name : getCurrentNetwork()?.name || 'Unknown Network'}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletComponent;