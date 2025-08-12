import React from 'react';
import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth';

const WalletComponent = () => {
  const { user, authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  const handleWalletAction = () => {
    if (authenticated) {
      logout();
    } else {
      login();
    }
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
      <button 
        className={`wallet-button ${authenticated ? 'connected' : ''}`}
        onClick={handleWalletAction}
      >
        {authenticated ? 'Disconnect' : 'Connect Wallet'}
      </button>
      
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