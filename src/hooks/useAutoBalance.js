import { useState, useEffect, useRef } from 'react';
import { createPublicClient, http } from 'viem';

// Простой хук для автоматического отслеживания баланса
export const useAutoBalance = ({ address, chainId, rpcUrl, enabled = true }) => {
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef(null);
  const intervalRef = useRef(null);

  // Создание публичного клиента
  const getClient = async () => {
    if (!clientRef.current && rpcUrl) {
      clientRef.current = createPublicClient({
        transport: http(rpcUrl)
      });
    }
    return clientRef.current;
  };

  // Функция для получения баланса
  const fetchBalance = async () => {
    if (!address || !chainId || !rpcUrl || !enabled) {
      return '0';
    }

    setIsLoading(true);
    try {
      const client = await getClient();
      const balanceWei = await client.getBalance({ address });
      const balanceEth = (Number(balanceWei) / 10**18).toFixed(4);
      
      setBalance(balanceEth);
      console.log(`💰 useAutoBalance: ${address} balance: ${balanceEth} ETH`);
      return balanceEth;
    } catch (error) {
      console.error('useAutoBalance: Error fetching balance:', error);
      return '0';
    } finally {
      setIsLoading(false);
    }
  };

  // Функция refetch для принудительного обновления
  const refetch = async () => {
    console.log('🔄 useAutoBalance: Manual refetch requested');
    return await fetchBalance();
  };

  // Автоматическое обновление при изменении параметров
  useEffect(() => {
    if (enabled && address && chainId && rpcUrl) {
      fetchBalance();
    }
  }, [address, chainId, rpcUrl, enabled]);

  // Периодическое обновление (каждые 10 секунд)
  useEffect(() => {
    if (!enabled || !address || !chainId || !rpcUrl) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchBalance();
    }, 10000); // 10 секунд

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, address, chainId, rpcUrl]);

  // Создание глобальной функции refetchBalance
  useEffect(() => {
    if (enabled && refetch) {
      window.refetchBalance = refetch;
      console.log('✅ useAutoBalance: Global refetchBalance created');
      
      return () => {
        if (window.refetchBalance === refetch) {
          delete window.refetchBalance;
        }
      };
    }
  }, [enabled, refetch]);

  return {
    balance,
    isLoading,
    refetch
  };
};