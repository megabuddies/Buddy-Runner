import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth';

const PrivyDebugger = () => {
  const { user, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet, isCreatingWallet, error: createWalletError } = useCreateWallet();
  const [debugInfo, setDebugInfo] = useState({});
  const [isCreatingManually, setIsCreatingManually] = useState(false);

  useEffect(() => {
    const info = {
      ready,
      authenticated,
      userExists: !!user,
      userId: user?.id,
      walletsCount: wallets.length,
      walletTypes: wallets.map(w => ({
        type: w.walletClientType,
        connectorType: w.connectorType,
        address: w.address
      })),
      hasEmbeddedWallet: wallets.some(w => w.walletClientType === 'privy'),
      createWalletError: createWalletError?.message || null,
      isCreatingWallet
    };
    
    setDebugInfo(info);
    console.log('Privy Debug Info:', info);
  }, [ready, authenticated, user, wallets, createWalletError, isCreatingWallet]);

  const handleCreateWallet = async () => {
    setIsCreatingManually(true);
    try {
      console.log('Manually creating embedded wallet...');
      const wallet = await createWallet();
      console.log('Wallet created successfully:', wallet);
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setIsCreatingManually(false);
    }
  };

  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 10000,
      fontFamily: 'monospace'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>🔍 Privy Debug Info</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Ready: {debugInfo.ready ? '✅' : '❌'}</li>
          <li>Authenticated: {debugInfo.authenticated ? '✅' : '❌'}</li>
          <li>User ID: {debugInfo.userId || 'N/A'}</li>
        </ul>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Wallets ({debugInfo.walletsCount || 0}):</strong>
        {debugInfo.walletTypes?.map((wallet, idx) => (
          <div key={idx} style={{ marginLeft: '10px', marginTop: '5px' }}>
            • {wallet.type} ({wallet.connectorType})<br/>
            &nbsp;&nbsp;{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Embedded Wallet:</strong> {debugInfo.hasEmbeddedWallet ? '✅ Exists' : '❌ Not Found'}
      </div>

      {createWalletError && (
        <div style={{ marginBottom: '10px', color: '#ff6b6b' }}>
          <strong>Error:</strong> {createWalletError}
        </div>
      )}

      {authenticated && !embeddedWallet && (
        <button
          onClick={handleCreateWallet}
          disabled={isCreatingWallet || isCreatingManually}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: isCreatingWallet || isCreatingManually ? 'not-allowed' : 'pointer',
            opacity: isCreatingWallet || isCreatingManually ? 0.5 : 1,
            marginTop: '10px',
            width: '100%'
          }}
        >
          {isCreatingWallet || isCreatingManually ? 'Creating...' : 'Create Embedded Wallet Manually'}
        </button>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
        App ID: {import.meta.env.VITE_PRIVY_APP_ID || 'Using default'}
      </div>
    </div>
  );
};

export default PrivyDebugger;