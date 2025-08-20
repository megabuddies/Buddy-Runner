import { useState, useEffect, useRef, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Конфигурация сетей (копируем из useBlockchainUtils)
const NETWORK_CONFIGS = {
  6342: { // MegaETH Testnet
    name: 'MegaETH Testnet',
    rpcUrl: 'https://carrot.megaeth.com/rpc',
    fallbackRpcUrls: [
      'https://carrot.megaeth.com/rpc'
    ],
    chainId: 6342,
  },
  31337: { // Foundry Local
    name: 'Foundry Local',
    rpcUrl: 'http://127.0.0.1:8545',
    fallbackRpcUrls: ['http://127.0.0.1:8545'],
    chainId: 31337,
  },
  84532: { // Base Sepolia
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    fallbackRpcUrls: ['https://sepolia.base.org'],
    chainId: 84532,
  },
  10143: { // Monad Testnet
    name: 'Monad Testnet',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    fallbackRpcUrls: ['https://testnet-rpc.monad.xyz'],
    chainId: 10143,
  },
  50311: { // Somnia Testnet
    name: 'Somnia Testnet',
    rpcUrl: 'https://testnet.somnia.network',
    fallbackRpcUrls: ['https://testnet.somnia.network'],
    chainId: 50311,
  },
  1313161556: { // RISE Testnet
    name: 'RISE Testnet',
    rpcUrl: 'https://testnet-rpc.rise.com',
    fallbackRpcUrls: ['https://testnet-rpc.rise.com'],
    chainId: 1313161556,
  }
};

/**
 * Custom hook for automatic balance tracking (Wagmi-like functionality)
 * Automatically refetches balance on network changes, wallet changes, and provides manual refetch
 */
export const useAutoBalance = (chainId) => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Refs for cleanup and preventing race conditions
  const abortControllerRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Get embedded wallet
  const getEmbeddedWallet = useCallback(() => {
    if (!authenticated || !wallets.length) {
      return null;
    }
    
    const embeddedWallet = wallets.find(wallet => 
      wallet.walletClientType === 'privy' || 
      wallet.connectorType === 'embedded' ||
      wallet.connectorType === 'privy'
    );
    
    return embeddedWallet || null;
  }, [authenticated, wallets]);

  // Main balance fetch function
  const fetchBalance = useCallback(async (force = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const embeddedWallet = getEmbeddedWallet();
    if (!embeddedWallet || !chainId || !NETWORK_CONFIGS[chainId]) {
      setBalance('0');
      setError(null);
      setIsLoading(false);
      return '0';
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      if (!force && !isLoading) {
        setIsLoading(true);
      }
      setError(null);

      const config = NETWORK_CONFIGS[chainId];
      const publicClient = createPublicClient({
        transport: http(config.rpcUrl, {
          timeout: 10000,
        }),
      });

      const balanceWei = await publicClient.getBalance({
        address: embeddedWallet.address,
      });

      const balanceEth = (Number(balanceWei) / 10**18).toFixed(4);
      
      setBalance(balanceEth);
      setLastUpdated(Date.now());
      setIsLoading(false);
      
      console.log(`💰 Auto-balance updated: ${balanceEth} ETH for ${embeddedWallet.address}`);
      return balanceEth;
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Failed to fetch balance:', err);
        setError(err.message);
        setBalance('0');
      }
      setIsLoading(false);
      return '0';
    }
  }, [chainId, getEmbeddedWallet, isLoading]);

  // Manual refetch function (like Wagmi)
  const refetch = useCallback(async () => {
    console.log('🔄 Manual balance refetch requested');
    return await fetchBalance(true);
  }, [fetchBalance]);

  // Auto-fetch on dependencies change
  useEffect(() => {
    fetchBalance();
  }, [chainId, authenticated, wallets]);

  // Set up periodic refresh (every 30 seconds)
  useEffect(() => {
    if (authenticated && chainId && getEmbeddedWallet()) {
      intervalRef.current = setInterval(() => {
        fetchBalance();
      }, 30000); // 30 seconds
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [authenticated, chainId, fetchBalance, getEmbeddedWallet]);

  // Setup global refetch function (Wagmi-like)
  useEffect(() => {
    window.refetchBalance = refetch;
    console.log('🌐 Global refetchBalance function registered');
    
    return () => {
      if (window.refetchBalance === refetch) {
        delete window.refetchBalance;
      }
    };
  }, [refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    balance,
    isLoading,
    error,
    refetch,
    lastUpdated,
    // Additional utilities
    balanceWei: balance ? BigInt(Math.floor(parseFloat(balance) * 10**18)) : 0n,
    hasBalance: parseFloat(balance) > 0,
    hasSufficientBalance: parseFloat(balance) >= 0.00005,
  };
};

export default useAutoBalance;