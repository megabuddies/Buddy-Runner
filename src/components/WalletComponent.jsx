import React, { useState, useEffect } from 'react';
import { useLogin, useLogout, usePrivy, useWallets } from '@privy-io/react-auth';

const WalletComponent = ({ selectedNetwork, onDisconnect, disableNetworkControls = false }) => {
  const { user, authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { wallets } = useWallets();
  const [showNetworks, setShowNetworks] = useState(false);
  // isNetworkSwitching больше не нужен - embedded кошелек работает автоматически

  const networks = [
    { id: 6342, name: 'MegaETH Testnet', emoji: '⚡' },
    { id: 84532, name: 'Base Sepolia', emoji: '🔵' },
    { id: 10143, name: 'Monad Testnet', emoji: '🟣' },
  ];

  // ИСПРАВЛЕНО: НЕ переключаем сеть на кошельке для входа
  // Embedded кошелек Privy автоматически работает с правильной сетью
  useEffect(() => {
    // Кошелек для входа используется ТОЛЬКО для аутентификации
    // Все блокчейн операции идут через embedded кошелек Privy
    console.log('Authentication status:', {
      authenticated,
      wallets: wallets?.length || 0,
      isReady: authenticated && wallets?.length > 0
    });
    
    if (authenticated && selectedNetwork) {
      console.log(`Initializing blockchain for network: ${selectedNetwork.name}`);
      // Не переключаем сеть - embedded кошелек автоматически работает с выбранной сетью
    }
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
    // ИСПРАВЛЕНО: НЕ переключаем кошелек для входа, только обновляем выбранную сеть
    const networkName = networks.find(n => n.id === chainId)?.name || 'Unknown Network';
    
    console.log(`Switching game network to ${networkName} (Chain ID: ${chainId})`);
    console.log('Note: Login wallet is used ONLY for authentication. All blockchain operations use embedded wallet.');
    
    // Обновляем выбранную сеть через onNetworkSelect
    if (onNetworkSelect) {
      const selectedNet = networks.find(n => n.id === chainId);
      if (selectedNet) {
        onNetworkSelect(selectedNet);
        setShowNetworks(false);
        console.log(`✅ Game network switched to ${networkName}`);
        console.log('🎮 Embedded wallet will automatically work with this network');
      }
    }
  };

  // getNetworkConfig и addNetwork удалены - больше не нужны
  // Embedded кошелек Privy автоматически работает с любой выбранной сетью

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
            >
              {getCurrentNetwork() ? (
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
                  >
                    {network.emoji} {network.name}
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