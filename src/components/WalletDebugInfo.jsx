import React, { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useBlockchainUtils } from '../hooks/useBlockchainUtils';

const WalletDebugInfo = ({ selectedNetwork }) => {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { getEmbeddedWallet } = useBlockchainUtils();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!authenticated || !wallets.length) {
    return null;
  }

  const embeddedWallet = getEmbeddedWallet();

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      zIndex: 1000,
      maxWidth: '350px'
    }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', marginBottom: isExpanded ? '10px' : '0' }}
      >
        🔍 Wallet Debug {isExpanded ? '▼' : '▶'}
      </div>
      
      {isExpanded && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <strong>📊 Summary:</strong>
            <div>Total Wallets: {wallets.length}</div>
            <div>Embedded Wallet: {embeddedWallet ? '✅' : '❌'}</div>
            {embeddedWallet && (
              <div>Embedded Address: {formatAddress(embeddedWallet.address)}</div>
            )}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>👛 All Wallets:</strong>
          </div>

          {wallets.map((wallet, index) => (
            <div key={index} style={{
              padding: '8px',
              margin: '4px 0',
              background: wallet === embeddedWallet ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
              border: wallet === embeddedWallet ? '1px solid rgba(0, 255, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px'
            }}>
              <div><strong>Wallet #{index + 1}</strong> {wallet === embeddedWallet && '🎯'}</div>
              <div>Address: {formatAddress(wallet.address)}</div>
              <div>Type: {wallet.walletClientType || 'unknown'}</div>
              <div>Connector: {wallet.connectorType || 'unknown'}</div>
              {wallet.type && <div>Category: {wallet.type}</div>}
              {wallet.imported !== undefined && <div>Imported: {wallet.imported ? 'Yes' : 'No'}</div>}
            </div>
          ))}

          <div style={{ marginTop: '10px', fontSize: '10px', color: '#aaa' }}>
            🎯 = Embedded wallet (used for faucet)
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDebugInfo;