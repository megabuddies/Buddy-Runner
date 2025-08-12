import React, { useState } from 'react';
import { useLogin, useLogout, usePrivy, useWallets } from '@privy-io/react-auth';

const WalletComponent = () => {
  const { user, authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { wallets } = useWallets();
  const [showNetworks, setShowNetworks] = useState(false);

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
    
    try {
      const wallet = wallets[0];
      await wallet.switchChain(chainId);
      setShowNetworks(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
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
                    }`}
                    onClick={() => switchNetwork(network.id)}
                  >
                    {network.emoji} {network.name}
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