import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth';

const EmbeddedWalletEnsurer = () => {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  useEffect(() => {
    if (!authenticated || !user || isCreatingWallet) {
      return;
    }

    // Проверяем, есть ли уже embedded кошелек
    const embeddedWallet = wallets.find(wallet => 
      wallet.walletClientType === 'privy' || 
      wallet.connectorType === 'privy' ||
      wallet.type === 'privy'
    );

    if (!embeddedWallet) {
      console.log('🎯 No embedded wallet found, creating one for gaming...');
      setIsCreatingWallet(true);
      
      createWallet()
        .then((newWallet) => {
          console.log('✅ Successfully created embedded wallet for gaming:', newWallet.address);
          setIsCreatingWallet(false);
        })
        .catch((error) => {
          console.error('❌ Failed to create embedded wallet:', error);
          setIsCreatingWallet(false);
        });
    } else {
      console.log('✅ Embedded wallet already exists:', embeddedWallet.address);
    }
  }, [authenticated, user, wallets, createWallet, isCreatingWallet]);

  // Показываем индикатор создания кошелька
  if (isCreatingWallet) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        zIndex: 10000,
        fontFamily: 'monospace'
      }}>
        🎯 Creating gaming wallet...
      </div>
    );
  }

  return null;
};

export default EmbeddedWalletEnsurer;