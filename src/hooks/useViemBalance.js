import { useState, useEffect, useRef, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { NETWORK_CONFIGS } from './useBlockchainUtils';

export const useViemBalance = ({ address, chainId, enabled = true }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const clientRef = useRef(null);

  // Создаем публичный клиент для сети
  const createClient = useCallback(async (chainId) => {
    const config = NETWORK_CONFIGS[chainId];
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Используем первый RPC endpoint из конфигурации
    const rpcUrl = Array.isArray(config.rpcUrls) ? config.rpcUrls[0] : config.rpcUrls;
    
    return createPublicClient({
      transport: http(rpcUrl),
      chain: {
        id: chainId,
        name: config.name || `Chain ${chainId}`,
        network: config.name?.toLowerCase() || `chain-${chainId}`,
        nativeCurrency: {
          decimals: 18,
          name: 'Ether',
          symbol: 'ETH',
        },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        }
      }
    });
  }, []);

  // Функция для получения баланса
  const fetchBalance = useCallback(async () => {
    if (!address || !chainId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Создаем или переиспользуем клиент
      if (!clientRef.current || clientRef.current.chainId !== chainId) {
        clientRef.current = await createClient(chainId);
        clientRef.current.chainId = chainId; // Добавляем chainId для отслеживания
      }

      const balance = await clientRef.current.getBalance({
        address: address
      });

      const balanceData = {
        decimals: 18,
        formatted: (Number(balance) / 10**18).toFixed(6),
        symbol: 'ETH',
        value: balance
      };

      setData(balanceData);
      console.log(`💰 useViemBalance: Updated balance for ${address}: ${balanceData.formatted} ETH`);
    } catch (err) {
      console.error('useViemBalance: Error fetching balance:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, enabled, createClient]);

  // Функция для принудительного обновления баланса
  const refetch = useCallback(async () => {
    console.log('🔄 useViemBalance: Manual refetch requested');
    await fetchBalance();
    return { data };
  }, [fetchBalance, data]);

  // Автоматическое обновление при изменении параметров
  useEffect(() => {
    if (enabled && address && chainId) {
      fetchBalance();
    }
  }, [fetchBalance, enabled, address, chainId]);

  // Периодическое обновление баланса (каждые 12 секунд)
  useEffect(() => {
    if (!enabled || !address || !chainId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Устанавливаем интервал для автоматического обновления
    intervalRef.current = setInterval(() => {
      console.log('🔄 useViemBalance: Periodic balance update');
      fetchBalance();
    }, 12000); // Каждые 12 секунд

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, address, chainId, fetchBalance]);

  // Глобальная функция для принудительного обновления
  useEffect(() => {
    if (enabled && address && chainId) {
      // Создаем уникальный ключ для этого хука
      const key = `refetchBalance_${chainId}_${address}`;
      window[key] = refetch;
      
      // Также создаем общую функцию
      if (!window.refetchBalance) {
        window.refetchBalance = refetch;
      }

      return () => {
        delete window[key];
        if (window.refetchBalance === refetch) {
          delete window.refetchBalance;
        }
      };
    }
  }, [refetch, enabled, address, chainId]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
};