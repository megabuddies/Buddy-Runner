import { useState, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, http, custom, parseGwei, createPublicClient } from 'viem';

// Конфигурация сетей
const NETWORK_CONFIGS = {
  6342: { // MegaETH Testnet
    name: 'MegaETH Testnet',
    rpcUrl: 'https://carrot.megaeth.com/rpc',
    fallbackRpcUrls: [
      'https://carrot.megaeth.com/rpc',
      // Добавьте дополнительные RPC endpoints если доступны
    ],
    wsUrl: 'wss://carrot.megaeth.com/ws',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0', // Updater contract
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 6342,
    sendMethod: 'realtime_sendRawTransaction', // Специальный метод для MegaETH
    connectionTimeouts: {
      initial: 30000, // 30 seconds for initial connection
      retry: 15000,   // 15 seconds for retries
      request: 45000  // 45 seconds for individual requests
    },
    maxConnections: 3, // Limit concurrent connections
  },
  31337: { // Foundry Local
    name: 'Foundry Local',
    rpcUrl: 'http://127.0.0.1:8545',
    fallbackRpcUrls: ['http://127.0.0.1:8545'],
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 31337,
    sendMethod: 'eth_sendRawTransaction',
    connectionTimeouts: {
      initial: 10000,
      retry: 5000,
      request: 15000
    },
    maxConnections: 2,
  },
  50311: { // Somnia Testnet
    name: 'Somnia Testnet',
    rpcUrl: 'https://testnet.somnia.network',
    fallbackRpcUrls: ['https://testnet.somnia.network'],
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 50311,
    sendMethod: 'eth_sendRawTransaction',
    connectionTimeouts: {
      initial: 20000,
      retry: 10000,
      request: 30000
    },
    maxConnections: 2,
  },
  1313161556: { // RISE Testnet
    name: 'RISE Testnet',
    rpcUrl: 'https://testnet-rpc.rise.com',
    fallbackRpcUrls: ['https://testnet-rpc.rise.com'],
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 1313161556,
    sendMethod: 'eth_sendRawTransactionSync', // Синхронный метод для RISE
    connectionTimeouts: {
      initial: 20000,
      retry: 10000,
      request: 30000
    },
    maxConnections: 2,
  }
};

// ABI для Updater контракта
const UPDATER_ABI = [
  {
    "inputs": [],
    "name": "update",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "number",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Safe JSON parsing utility to handle malformed responses
const safeJsonParse = (data) => {
  try {
    // Handle common malformed responses
    if (typeof data === 'string') {
      // Remove common prefixes that cause JSON parsing issues
      const cleanedData = data
        .replace(/^cadesplugin_loaded/, '')
        .replace(/^EnableInte.*?$/, '')
        .trim();
      
      if (cleanedData.length === 0) {
        return null;
      }
      
      return JSON.parse(cleanedData);
    }
    return data;
  } catch (error) {
    console.warn('Failed to parse JSON response:', error.message, 'Data:', data);
    return null;
  }
};

export const useBlockchainUtils = () => {
  const { authenticated, user, login, logout, isReady } = usePrivy();
  const { wallets } = useWallets();
  
  // Состояние
  const [isInitializing, setIsInitializing] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);
  const [balance, setBalance] = useState('0');
  const [contractNumber, setContractNumber] = useState(0);

  // Кэши и пулы - УЛУЧШЕННАЯ СТРУКТУРА
  const clientCache = useRef({});
  const gasParams = useRef({});
  
  // НОВАЯ система управления соединениями
  const connectionPool = useRef({});
  const rpcHealthStatus = useRef({});
  const activeConnections = useRef({});
  
  // УЛУЧШЕННЫЙ ПУЛ ТРАНЗАКЦИЙ с большим размером и централизованным nonce
  const preSignedPool = useRef({});
  const nonceManager = useRef({}); // Централизованное управление nonce
  const isInitialized = useRef({});

  // Кеширование параметров сети для минимизации RPC вызовов
  const chainParamsCache = useRef({});

  // УЛУЧШЕННАЯ конфигурация для разных сетей с адаптивным поведением
  const ENHANCED_POOL_CONFIG = {
    6342: { // MegaETH
      poolSize: 20, // Увеличен для лучшей производительности
      refillAt: 0.4, // Раннее пополнение для избежания простоев
      batchSize: 8, // Больший размер пакета для эффективности
      maxRetries: 3,
      retryDelay: 300,
      burstMode: true, // Поддержка burst режима
      maxBurstSize: 3, // Максимум транзакций в burst режиме
      burstCooldown: 1000 // Cooldown между burst'ами
    },
    31337: { // Foundry
      poolSize: 15,
      refillAt: 0.5,
      batchSize: 7,
      maxRetries: 3,
      retryDelay: 200,
      burstMode: true,
      maxBurstSize: 5,
      burstCooldown: 500
    },
    50311: { // Somnia
      poolSize: 12,
      refillAt: 0.6,
      batchSize: 5,
      maxRetries: 3,
      retryDelay: 400,
      burstMode: false,
      maxBurstSize: 2,
      burstCooldown: 2000
    },
    1313161556: { // RISE
      poolSize: 10,
      refillAt: 0.7,
      batchSize: 4,
      maxRetries: 2,
      retryDelay: 600,
      burstMode: false,
      maxBurstSize: 1,
      burstCooldown: 3000
    },
    default: {
      poolSize: 10,
      refillAt: 0.5,
      batchSize: 5,
      maxRetries: 3,
      retryDelay: 300,
      burstMode: false,
      maxBurstSize: 2,
      burstCooldown: 1000
    }
  };

  // Fallback конфигурация для MegaETH
  const MEGAETH_FALLBACK_CONFIG = {
    // Уменьшаем batch size при проблемах с RPC
    reducedBatchSize: 1,
    // Увеличиваем задержки
    increasedDelay: 1000,
    // Режим graceful degradation
    degradedMode: false
  };

  const fallbackState = useRef({
    6342: { ...MEGAETH_FALLBACK_CONFIG } // MegaETH
  });

  // Система управления burst режимом и rate limiting
  const burstState = useRef({});
  
  const getBurstManager = (chainId) => {
    if (!burstState.current[chainId]) {
      const config = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
      burstState.current[chainId] = {
        lastBurstTime: 0,
        burstCount: 0,
        inCooldown: false,
        pendingTransactions: [],
        processingBurst: false
      };
    }
    return burstState.current[chainId];
  };

  // Проверка возможности burst транзакции
  const canExecuteBurst = (chainId) => {
    const config = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
    if (!config.burstMode) return false;

    const burstManager = getBurstManager(chainId);
    const now = Date.now();

    // Проверяем cooldown период
    if (burstManager.inCooldown && (now - burstManager.lastBurstTime) < config.burstCooldown) {
      return false;
    }

    // Если cooldown закончился, сбрасываем состояние
    if (burstManager.inCooldown && (now - burstManager.lastBurstTime) >= config.burstCooldown) {
      burstManager.inCooldown = false;
      burstManager.burstCount = 0;
    }

    return burstManager.burstCount < config.maxBurstSize;
  };

  // Обновление состояния burst менеджера
  const updateBurstState = (chainId, success) => {
    const config = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
    if (!config.burstMode) return;

    const burstManager = getBurstManager(chainId);
    const now = Date.now();

    if (success) {
      burstManager.burstCount++;
      burstManager.lastBurstTime = now;

      // Если достигли лимита burst, включаем cooldown
      if (burstManager.burstCount >= config.maxBurstSize) {
        burstManager.inCooldown = true;
        console.log(`Burst mode cooldown activated for chain ${chainId} (${config.burstCooldown}ms)`);
      }
    }
  };

  // Умная очередь транзакций для burst режима
  const queueBurstTransaction = async (chainId, transactionFn) => {
    const burstManager = getBurstManager(chainId);
    
    return new Promise((resolve, reject) => {
      burstManager.pendingTransactions.push({
        fn: transactionFn,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      // Запускаем обработку очереди если еще не запущена
      if (!burstManager.processingBurst) {
        processBurstQueue(chainId);
      }
    });
  };

  // Обработка очереди burst транзакций
  const processBurstQueue = async (chainId) => {
    const burstManager = getBurstManager(chainId);
    burstManager.processingBurst = true;

    while (burstManager.pendingTransactions.length > 0) {
      const canBurst = canExecuteBurst(chainId);
      
      if (!canBurst) {
        // Ждем окончания cooldown
        const config = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
        const waitTime = Math.max(100, config.burstCooldown / 10);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      const transaction = burstManager.pendingTransactions.shift();
      if (!transaction) break;

      try {
        const result = await transaction.fn();
        updateBurstState(chainId, true);
        transaction.resolve(result);
      } catch (error) {
        updateBurstState(chainId, false);
        transaction.reject(error);
      }
    }

    burstManager.processingBurst = false;
  };

  // НОВАЯ система мониторинга здоровья RPC endpoints
  const initializeRpcHealth = (chainId) => {
    const config = NETWORK_CONFIGS[chainId];
    if (!config) return;

    if (!rpcHealthStatus.current[chainId]) {
      rpcHealthStatus.current[chainId] = {
        endpoints: config.fallbackRpcUrls.map(url => ({
          url,
          healthy: true,
          lastChecked: 0,
          consecutiveFailures: 0,
          responseTime: 0
        })),
        currentEndpointIndex: 0,
        lastHealthCheck: 0
      };
    }
  };

  // Получение следующего здорового RPC endpoint
  const getHealthyRpcEndpoint = async (chainId) => {
    const health = rpcHealthStatus.current[chainId];
    if (!health) {
      initializeRpcHealth(chainId);
      return NETWORK_CONFIGS[chainId].rpcUrl;
    }

    // Ищем здоровый endpoint
    for (let i = 0; i < health.endpoints.length; i++) {
      const endpoint = health.endpoints[health.currentEndpointIndex];
      
      if (endpoint.healthy || endpoint.consecutiveFailures < 3) {
        return endpoint.url;
      }
      
      // Переходим к следующему endpoint
      health.currentEndpointIndex = (health.currentEndpointIndex + 1) % health.endpoints.length;
    }

    // Если все endpoints нездоровы, возвращаем первый (возможно, проблема временная)
    console.warn(`All RPC endpoints for chain ${chainId} appear unhealthy, using primary`);
    return health.endpoints[0].url;
  };

  // Обновление статуса здоровья endpoint
  const updateRpcHealth = (chainId, rpcUrl, success, responseTime = 0) => {
    const health = rpcHealthStatus.current[chainId];
    if (!health) return;

    const endpoint = health.endpoints.find(ep => ep.url === rpcUrl);
    if (!endpoint) return;

    endpoint.lastChecked = Date.now();
    endpoint.responseTime = responseTime;

    if (success) {
      endpoint.healthy = true;
      endpoint.consecutiveFailures = 0;
    } else {
      endpoint.consecutiveFailures++;
      if (endpoint.consecutiveFailures >= 3) {
        endpoint.healthy = false;
        console.warn(`Marking RPC endpoint as unhealthy: ${rpcUrl} (${endpoint.consecutiveFailures} failures)`);
      }
    }
  };

  // Управление пулом соединений
  const getConnectionFromPool = (chainId, rpcUrl) => {
    const poolKey = `${chainId}-${rpcUrl}`;
    const config = NETWORK_CONFIGS[chainId];
    
    if (!activeConnections.current[poolKey]) {
      activeConnections.current[poolKey] = 0;
    }

    if (activeConnections.current[poolKey] >= config.maxConnections) {
      throw new Error(`Maximum connections (${config.maxConnections}) reached for ${poolKey}`);
    }

    activeConnections.current[poolKey]++;
    
    return () => {
      // Cleanup function
      if (activeConnections.current[poolKey] > 0) {
        activeConnections.current[poolKey]--;
      }
    };
  };

  // Управление fallback режимом
  const enableFallbackMode = (chainId) => {
    const state = fallbackState.current[chainId];
    if (state) {
      state.degradedMode = true;
      console.log(`Enabled fallback mode for chain ${chainId}`);
    }
  };

  const getFallbackConfig = (chainId) => {
    const state = fallbackState.current[chainId];
    return state?.degradedMode ? state : null;
  };

  // УЛУЧШЕННОЕ получение embedded wallet с дополнительными проверками
  const getEmbeddedWallet = () => {
    if (!authenticated || !wallets.length) {
      console.log('Not authenticated or no wallets available');
      return null;
    }
    
    console.log('Available wallets:', wallets.map(w => ({ 
      address: w.address, 
      walletClientType: w.walletClientType, 
      connectorType: w.connectorType 
    })));
    
    // Look for embedded wallet - Privy creates embedded wallets with specific types
    const embeddedWallet = wallets.find(wallet => 
      wallet.walletClientType === 'privy' || 
      wallet.connectorType === 'embedded' ||
      wallet.connectorType === 'privy'
    );
    
    if (embeddedWallet) {
      console.log('Found embedded wallet:', embeddedWallet.address);
      return embeddedWallet;
    }
    
    // If no embedded wallet found, use the first available wallet
    if (wallets.length > 0) {
      console.log('No embedded wallet found, using first available wallet:', wallets[0].address);
      return wallets[0];
    }
    
    console.log('No wallets available');
    return null;
  };

  // ЗНАЧИТЕЛЬНО УЛУЧШЕННОЕ создание клиентов с системой fallback endpoints
  const createClients = async (chainId) => {
    const cacheKey = `${chainId}`;
    if (clientCache.current[cacheKey]) {
      return clientCache.current[cacheKey];
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) throw new Error(`Unsupported network: ${chainId}`);

    const embeddedWallet = getEmbeddedWallet();
    if (!embeddedWallet) throw new Error('No embedded wallet found');

    // Инициализируем систему мониторинга RPC здоровья
    initializeRpcHealth(chainId);

    try {
      // Получаем здоровый RPC endpoint
      const healthyRpcUrl = await getHealthyRpcEndpoint(chainId);
      console.log(`Using RPC endpoint for chain ${chainId}: ${healthyRpcUrl}`);

      // Получаем соединение из пула
      const releaseConnection = getConnectionFromPool(chainId, healthyRpcUrl);

      // Создаем публичный клиент с адаптивными таймаутами
      const publicClient = createPublicClient({
        chain: {
          id: chainId,
          name: config.name,
          network: config.name.toLowerCase().replace(/\s+/g, '-'),
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: {
            default: { http: [healthyRpcUrl] },
            public: { http: [healthyRpcUrl] }
          }
        },
        transport: http(healthyRpcUrl, {
          timeout: config.connectionTimeouts.initial,
          retryCount: 4, // Увеличен retry count
          retryDelay: ({ count }) => Math.min(1000 * Math.pow(2, count), 8000) // Exponential backoff
        })
      });

      // Для MegaETH используем локальное подписание (не RPC)
      let walletClient;
      if (chainId === 6342) {
        // MegaETH: локальное подписание с Privy account
        walletClient = createWalletClient({
          account: embeddedWallet.address,
          chain: publicClient.chain,
          transport: custom({
            async request({ method, params }) {
              if (method === 'eth_signTransaction') {
                // Локальное подписание через embedded wallet
                const embeddedWallet = getEmbeddedWallet();
                if (!embeddedWallet) {
                  throw new Error('No embedded wallet found for signing');
                }
                
                // Создаем walletClient с embedded wallet
                const provider = await embeddedWallet.getProvider?.() || 
                                await embeddedWallet.getEthereumProvider?.() ||
                                embeddedWallet;
                
                if (provider?.request) {
                  return await provider.request({ method, params });
                }
                
                throw new Error('Unable to get provider for signing');
              }
              // Остальные методы идут через публичный RPC
              return await publicClient.request({ method, params });
            }
          })
        });
      } else {
        // Для других сетей используем стандартный подход с улучшенными таймаутами
        walletClient = createWalletClient({
          account: embeddedWallet.address,
          chain: publicClient.chain,
          transport: http(healthyRpcUrl, {
            timeout: config.connectionTimeouts.retry,
            retryCount: 4,
            retryDelay: ({ count }) => Math.min(1000 * Math.pow(2, count), 5000)
          })
        });
      }

      const clients = { 
        publicClient, 
        walletClient, 
        config,
        rpcUrl: healthyRpcUrl,
        releaseConnection // Функция для освобождения соединения
      };
      clientCache.current[cacheKey] = clients;

      console.log(`Created clients for chain ${chainId}:`, {
        publicRPC: healthyRpcUrl,
        signingMethod: chainId === 6342 ? 'Local Privy' : 'RPC'
      });

      return clients;
    } catch (error) {
      console.error(`Error creating clients for chain ${chainId}:`, error);
      throw error;
    }
  };

  // ЦЕНТРАЛИЗОВАННОЕ управление nonce
  const getNonceManager = (chainId, address) => {
    const key = `${chainId}-${address}`;
    if (!nonceManager.current[key]) {
      nonceManager.current[key] = {
        currentNonce: null,
        pendingNonce: null,
        lastUpdate: 0,
        isUpdating: false
      };
    }
    return nonceManager.current[key];
  };

  // УЛУЧШЕННОЕ получение и управление nonce
  const getNextNonce = async (chainId, address, forceRefresh = false) => {
    const manager = getNonceManager(chainId, address);
    const now = Date.now();
    
    // Обновляем nonce если прошло больше 30 секунд или принудительное обновление
    if (!manager.currentNonce || forceRefresh || (now - manager.lastUpdate) > 30000) {
      if (manager.isUpdating) {
        // Ждем завершения текущего обновления
        while (manager.isUpdating) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        manager.isUpdating = true;
        try {
          const { publicClient } = await createClients(chainId);
          const networkNonce = await publicClient.getTransactionCount({
            address: address,
            blockTag: 'pending'
          });
          
          // Используем максимальное значение между сетевым nonce и нашим локальным
          manager.currentNonce = Math.max(networkNonce, manager.currentNonce || 0);
          manager.pendingNonce = manager.currentNonce;
          manager.lastUpdate = now;
          
          console.log(`Updated nonce for ${address} on chain ${chainId}: ${manager.currentNonce}`);
        } catch (error) {
          console.error('Error updating nonce:', error);
          // Если не удалось получить nonce из сети, используем локальный + 1
          if (manager.currentNonce !== null) {
            manager.currentNonce += 1;
            manager.pendingNonce = manager.currentNonce;
          }
        } finally {
          manager.isUpdating = false;
        }
      }
    }
    
    // Возвращаем следующий доступный nonce
    const nextNonce = manager.pendingNonce;
    manager.pendingNonce += 1;
    
    return nextNonce;
  };

  // Получение газовых параметров
  const getGasParams = async (chainId) => {
    if (gasParams.current[chainId]) {
      return gasParams.current[chainId];
    }

    const { publicClient } = await createClients(chainId);
    
    let maxFeePerGas, maxPriorityFeePerGas;
    
    // Специальные параметры для разных сетей
    if (chainId === 6342) {
      // MegaETH Testnet - оптимизированные параметры
      console.log('Using optimized gas parameters for MegaETH Testnet');
      maxFeePerGas = parseGwei('0.0012'); // 1.2 mwei как в логах
      maxPriorityFeePerGas = parseGwei('0.0006'); // 0.6 mwei как в логах
      
      console.log(`Gas params for chain ${chainId}: {maxFeePerGas: '${maxFeePerGas}', maxPriorityFeePerGas: '${maxPriorityFeePerGas}', maxFeePerGasGwei: ${Number(maxFeePerGas) / 1e9}, maxPriorityFeePerGasGwei: ${Number(maxPriorityFeePerGas) / 1e9}}`);
      
    } else {
      // Для остальных сетей используем динамические параметры
      const gasPrice = await publicClient.getGasPrice();
      maxFeePerGas = gasPrice * 2n; // 2x для запаса
      maxPriorityFeePerGas = parseGwei('2'); // 2 gwei
      
      console.log(`Dynamic gas params for chain ${chainId}: {maxFeePerGas: '${maxFeePerGas}', maxPriorityFeePerGas: '${maxPriorityFeePerGas}'}`);
    }

    const params = { maxFeePerGas, maxPriorityFeePerGas };
    gasParams.current[chainId] = params;
    
    console.log(`Using gas parameters: {maxFeePerGasGwei: ${Number(maxFeePerGas) / 1e9}, maxPriorityFeePerGasGwei: ${Number(maxPriorityFeePerGas) / 1e9}}`);
    
    return params;
  };

  // Получение параметров сети с кешированием
  const getCachedChainParams = async (chainId) => {
    const cacheKey = chainId.toString();
    
    if (chainParamsCache.current[cacheKey]) {
      return chainParamsCache.current[cacheKey];
    }

    try {
      const { publicClient } = await createClients(chainId);
      
      // Получаем все необходимые параметры одним запросом для оффлайн подписания
              const [chainIdHex, blockNumber] = await Promise.all([
        retryWithBackoff(() => publicClient.getChainId(), 2, 500, chainId),
        retryWithBackoff(() => publicClient.getBlockNumber(), 2, 500, chainId)
      ]);

      const params = {
        chainId: chainIdHex,
        blockNumber: Number(blockNumber)
      };

      // Кешируем на 30 секунд для MegaETH, дольше для других сетей
      const cacheTime = chainId === 6342 ? 30000 : 60000;
      chainParamsCache.current[cacheKey] = params;
      
      setTimeout(() => {
        delete chainParamsCache.current[cacheKey];
      }, cacheTime);

      console.log(`Cached chain params for ${chainId}:`, params);
      return params;
    } catch (error) {
      console.error('Error getting chain params:', error);
      // Возвращаем базовые параметры если RPC недоступен
      return {
        chainId: chainId,
        blockNumber: 0
      };
    }
  };

  // ЗНАЧИТЕЛЬНО УЛУЧШЕННОЕ предварительное подписание пакета транзакций
  const preSignBatch = async (chainId, startNonce, count) => {
    const chainKey = chainId.toString();
    
    // Получаем конфигурацию для данной сети
    const poolConfig = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
    const fallbackConfig = getFallbackConfig(chainId);
    
    // Применяем конфигурацию
    let actualCount = Math.min(count, poolConfig.poolSize);
    if (fallbackConfig) {
      actualCount = Math.min(actualCount, fallbackConfig.reducedBatchSize);
      console.log(`Using fallback mode for chain ${chainId}: batch size ${actualCount}`);
    }
    
    console.log(`Pre-signing ${actualCount} transactions for chain ${chainId} starting from nonce ${startNonce}`);
    
    if (!preSignedPool.current[chainKey]) {
      preSignedPool.current[chainKey] = {
        transactions: [],
        currentIndex: 0,
        baseNonce: startNonce,
        hasTriggeredRefill: false,
        isRefilling: false
      };
    }

    const pool = preSignedPool.current[chainKey];
    const { walletClient } = await createClients(chainId);
    const gasParams = await getGasParams(chainId);

    console.log(`Using gas parameters: {maxFeePerGasGwei: ${Number(gasParams.maxFeePerGas) / 10**9}, maxPriorityFeePerGasGwei: ${Number(gasParams.maxPriorityFeePerGas) / 10**9}}`);

    const config = NETWORK_CONFIGS[chainId];
    const embeddedWallet = getEmbeddedWallet();
    
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    for (let i = 0; i < actualCount; i++) {
      try {
        // Добавляем задержку между подписаниями
        const delay = fallbackConfig ? fallbackConfig.increasedDelay : poolConfig.retryDelay;
        if (delay > 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // УЛУЧШЕННОЕ управление nonce - используем централизованный менеджер
        const nonce = await getNextNonce(chainId, embeddedWallet.address);
        
        const txData = {
          account: embeddedWallet.address,
          to: config.contractAddress,
          data: '0xa2e62045',
          nonce,
          maxFeePerGas: gasParams.maxFeePerGas,
          maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
          value: 0n,
          type: 'eip1559',
          gas: 100000n,
        };

        let signedTx;
        
        // Разные методы подписания для разных сетей
        if (chainId === 6342) {
          // MegaETH: используем прямое подписание через Privy
          console.log(`Signing transaction ${i + 1} locally for MegaETH`);
          signedTx = await retryWithBackoff(
            async () => {
              // Прямое подписание через embedded wallet
              return await walletClient.signTransaction(txData);
            },
            fallbackConfig ? 1 : poolConfig.maxRetries,
            poolConfig.retryDelay,
            chainId
          );
        } else {
          // Другие сети: используем walletClient
          console.log(`Signing transaction ${i + 1} via RPC for chain ${chainId}`);
          signedTx = await retryWithBackoff(
            () => walletClient.signTransaction(txData),
            fallbackConfig ? 1 : poolConfig.maxRetries,
            poolConfig.retryDelay,
            chainId
          );
        }
        
        pool.transactions.push(signedTx);
        
        consecutiveErrors = 0; // Сбрасываем счетчик ошибок при успехе
        console.log(`Signed transaction ${pool.transactions.length}/${actualCount}`);
      } catch (error) {
        console.error(`Error signing transaction ${i + 1}:`, error);
        consecutiveErrors++;
        
        // Для rate limiting ошибок, активируем fallback режим
        if (error.message?.includes('rate limit') || error.status === 429 || error.status === 403 || error.message?.includes('not whitelisted')) {
          console.log('Rate limit/403/not whitelisted detected, enabling fallback mode');
          enableFallbackMode(chainId);
          
          // Прерываем дальнейшее подписание
          break;
        }
        
        // Если слишком много ошибок подряд, прерываем
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.log(`Too many consecutive errors (${consecutiveErrors}), stopping batch signing`);
          enableFallbackMode(chainId);
          break;
        }
        
        // Для других ошибок, продолжаем со следующей транзакцией
        continue;
      }
    }

    console.log(`Successfully pre-signed ${pool.transactions.length} transactions`);
    
    // Если мы в fallback режиме и у нас есть хотя бы одна транзакция, это успех
    if (fallbackConfig && pool.transactions.length > 0) {
      console.log('Fallback mode: minimum transactions ready for gaming');
    }
  };

  // УЛУЧШЕННОЕ умное пополнение пула
  const extendPool = async (chainId, startNonce, count) => {
    const chainKey = chainId.toString();
    const pool = preSignedPool.current[chainKey];
    
    // Предотвращаем параллельные пополнения
    if (!pool || pool.isRefilling) {
      console.log('Pool extension already in progress, skipping');
      return;
    }
    
    try {
      pool.isRefilling = true;
      console.log(`Extending pool for chain ${chainId} from nonce ${startNonce} with ${count} transactions`);
      
      // Используем существующую функцию preSignBatch для пополнения
      await preSignBatch(chainId, startNonce, count);
      
      if (pool) {
        pool.hasTriggeredRefill = false; // Сбрасываем флаг для следующего пополнения
        console.log(`Pool extended successfully. Total transactions: ${pool.transactions.length}`);
      }
    } catch (error) {
      console.error('Error extending transaction pool:', error);
      // Не бросаем ошибку, просто логируем - игра может продолжаться в realtime режиме
    } finally {
      if (pool) {
        pool.isRefilling = false;
      }
    }
  };

  // ЗНАЧИТЕЛЬНО УЛУЧШЕННОЕ получение следующей транзакции из пула
  const getNextTransaction = async (chainId) => {
    const chainKey = chainId.toString();
    const pool = preSignedPool.current[chainKey];
    const poolConfig = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;

    // Если есть предподписанные транзакции, используем их
    if (pool && pool.transactions.length > pool.currentIndex) {
      const tx = pool.transactions[pool.currentIndex];
      pool.currentIndex++;

      // УЛУЧШЕННАЯ логика автодозаправки - пополняем при достижении порога
      const usageRatio = pool.currentIndex / pool.transactions.length;
      if (usageRatio >= poolConfig.refillAt && !pool.hasTriggeredRefill && !pool.isRefilling) {
        pool.hasTriggeredRefill = true;
        console.log(`Pool ${Math.round(usageRatio * 100)}% empty, extending with new transactions...`);
        
        try {
          const embeddedWallet = getEmbeddedWallet();
          if (embeddedWallet) {
            const nextNonce = await getNextNonce(chainId, embeddedWallet.address);
            await extendPool(chainId, nextNonce, poolConfig.batchSize);
          }
        } catch (error) {
          console.error('Error extending pool:', error);
        }
      }

      return tx;
    }

    // Если нет предподписанных транзакций, создаем и подписываем realtime
    console.log('No pre-signed transactions available, signing realtime...');
    return await createRealtimeTransaction(chainId);
  };

  // УЛУЧШЕННОЕ создание и подписание транзакции в реальном времени
  const createRealtimeTransaction = async (chainId) => {
    try {
      const { publicClient } = await createClients(chainId);
      const config = NETWORK_CONFIGS[chainId];
      const embeddedWallet = getEmbeddedWallet();
      const gasParams = await getGasParams(chainId);

      if (!embeddedWallet) {
        throw new Error('No embedded wallet available for realtime signing');
      }

      // УЛУЧШЕННОЕ получение nonce через централизованный менеджер
      const nonce = await getNextNonce(chainId, embeddedWallet.address);

      const txData = {
        account: embeddedWallet.address,
        to: config.contractAddress,
        data: '0xa2e62045',
        nonce,
        maxFeePerGas: gasParams.maxFeePerGas,
        maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
        value: 0n,
        type: 'eip1559',
        gas: 100000n,
      };

      console.log(`Creating realtime transaction for chain ${chainId} with nonce ${nonce}`);

      // Подписываем транзакцию
      const { walletClient } = await createClients(chainId);
      return await walletClient.signTransaction(txData);
    } catch (error) {
      console.error('Error creating realtime transaction:', error);
      throw error;
    }
  };

  // Проверка баланса
  const checkBalance = async (chainId) => {
    try {
      const { publicClient } = await createClients(chainId);
      const embeddedWallet = getEmbeddedWallet();
      
      if (!embeddedWallet) {
        console.error('No embedded wallet available for balance check');
        return '0';
      }
      
      const balance = await publicClient.getBalance({
        address: embeddedWallet.address
      });
      
      const balanceEth = (Number(balance) / 10**18).toFixed(4);
      setBalance(balanceEth);
      console.log(`Balance for ${embeddedWallet.address}: ${balanceEth} ETH`);
      return balanceEth;
    } catch (error) {
      console.error('Error checking balance:', error);
      // Return 0 balance and let the system continue
      setBalance('0');
      return '0';
    }
  };

  // Вызов faucet
  const callFaucet = async (address, chainId) => {
    try {
      console.log('Calling faucet for address:', address);
      
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, chainId }),
      });

      if (!response.ok) {
        let errorMessage = 'Faucet request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Faucet success:', result);
      return result;
    } catch (error) {
      console.error('Faucet error:', error);
      
      // Provide specific error messages based on common issues
      if (error.message.includes('405')) {
        throw new Error('Faucet service is temporarily unavailable. Please try again later.');
      } else if (error.message.includes('insufficient balance')) {
        throw new Error('Faucet is empty. Please contact support.');
      } else if (error.message.includes('already has sufficient balance')) {
        console.log('User already has sufficient balance, continuing...');
        return { success: true, message: 'Sufficient balance already available' };
      } else {
        throw new Error(`Faucet error: ${error.message}`);
      }
    }
  };

  // ЗНАЧИТЕЛЬНО УЛУЧШЕННАЯ отправка транзакции с retry логикой и обработкой таймаутов
  const sendRawTransaction = async (chainId, signedTx) => {
    const config = NETWORK_CONFIGS[chainId];
    const poolConfig = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
    
    // Получаем здоровый RPC endpoint для отправки
    const rpcUrl = await getHealthyRpcEndpoint(chainId);
    const startTime = Date.now();
    let success = false;
    
    try {
      let response;
      let txHash;
      
      if (config.sendMethod === 'realtime_sendRawTransaction') {
        // MegaETH реалтайм метод - специальная обработка с retry
        console.log('Using MegaETH realtime_sendRawTransaction...');
        
        const sendTransaction = async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), config.connectionTimeouts.request); // Адаптивный timeout
          
          try {
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'realtime_sendRawTransaction',
                params: [signedTx],
                id: Date.now()
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const jsonResponse = await response.text();
            const parsedResponse = safeJsonParse(jsonResponse);
            
            if (!parsedResponse) {
              throw new Error('Invalid response format from RPC');
            }

            return parsedResponse;
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              throw new Error('RPC Error: permanent error forwarding request context deadline exceeded');
            }
            throw error;
          }
        };

        response = await retryWithBackoff(sendTransaction, poolConfig.maxRetries, poolConfig.retryDelay, chainId);
        
        if (response.error) {
          // Обработка специфичных ошибок nonce
          if (response.error.message?.includes('nonce too low')) {
            console.warn('Nonce too low detected, refreshing nonce manager');
            const embeddedWallet = getEmbeddedWallet();
            if (embeddedWallet) {
              await getNextNonce(chainId, embeddedWallet.address, true); // Принудительное обновление
            }
          }
          throw new Error(`RPC Error: ${response.error.message}`);
        }
        
        txHash = response.result;
        console.log('MegaETH transaction hash:', txHash);
        success = true;
        
        // For MegaETH, the realtime method returns receipt immediately
        return { hash: txHash, receipt: response.result };
        
      } else if (config.sendMethod === 'eth_sendRawTransactionSync') {
        // RISE синхронный метод
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.connectionTimeouts.retry); // Адаптивный timeout
        
        try {
          response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendRawTransactionSync',
              params: [signedTx],
              id: Date.now()
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          const jsonResponse = await response.text();
          const result = safeJsonParse(jsonResponse);
          
          if (!result) {
            throw new Error('Invalid response format from RPC');
          }
          
          if (result.error) {
            if (result.error.message?.includes('nonce too low')) {
              console.warn('Nonce too low detected, refreshing nonce manager');
              const embeddedWallet = getEmbeddedWallet();
              if (embeddedWallet) {
                await getNextNonce(chainId, embeddedWallet.address, true);
              }
            }
            throw new Error(result.error.message || 'RISE transaction failed');
          }

          success = true;
          return { hash: result.result, receipt: result.result };
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('RPC Error: permanent error forwarding request context deadline exceeded');
          }
          throw error;
        }
        
      } else {
        // Стандартная отправка с улучшенной обработкой ошибок
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.connectionTimeouts.retry); // Адаптивный timeout
        
        try {
          response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendRawTransaction',
              params: [signedTx],
              id: Date.now()
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          const jsonResponse = await response.text();
          const result = safeJsonParse(jsonResponse);
          
          if (!result) {
            throw new Error('Invalid response format from RPC');
          }
          
          if (result.error) {
            if (result.error.message?.includes('nonce too low')) {
              console.warn('Nonce too low detected, refreshing nonce manager');
              const embeddedWallet = getEmbeddedWallet();
              if (embeddedWallet) {
                await getNextNonce(chainId, embeddedWallet.address, true);
              }
            }
            throw new Error(result.error.message || 'Transaction failed');
          }

          success = true;
          return { hash: result.result };
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('RPC Error: permanent error forwarding request context deadline exceeded');
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Send transaction error:', error);
      throw error;
    } finally {
      // Обновляем статус здоровья RPC endpoint
      const responseTime = Date.now() - startTime;
      updateRpcHealth(chainId, rpcUrl, success, responseTime);
    }
  };

  // ЗНАЧИТЕЛЬНО УЛУЧШЕННЫЙ основной метод отправки обновления с burst поддержкой
  const sendUpdate = async (chainId) => {
    if (transactionPending) {
      throw new Error('Transaction already pending, blocking jump');
    }

    const embeddedWallet = getEmbeddedWallet();
    if (!embeddedWallet) {
      throw new Error('No embedded wallet available');
    }

    const config = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
    
    // Проверяем, можем ли использовать burst режим
    if (config.burstMode && canExecuteBurst(chainId)) {
      console.log('Using burst mode for transaction');
      return await queueBurstTransaction(chainId, async () => {
        return await executeTransaction(chainId);
      });
    } else {
      return await executeTransaction(chainId);
    }
  };

  // Отдельная функция для выполнения транзакции
  const executeTransaction = async (chainId) => {
    let signedTx = null;
    
    try {
      setTransactionPending(true);
      
      // Получаем предподписанную транзакцию или создаем новую
      signedTx = await getNextTransaction(chainId);
      
      if (!signedTx) {
        throw new Error('Failed to get transaction for sending');
      }
      
      console.log('Sending on-chain jump transaction...');
      
      // Отправляем транзакцию с улучшенной обработкой ошибок
      const txResult = await sendRawTransaction(chainId, signedTx);
      console.log('Transaction sent:', txResult);

      const config = NETWORK_CONFIGS[chainId];
      let finalResult = txResult;
      
      // Обработка подтверждения в зависимости от сети
      if (config.sendMethod === 'realtime_sendRawTransaction') {
        // MegaETH: realtime метод уже возвращает подтверждение
        console.log('Transaction confirmed:', txResult);
        finalResult = txResult.receipt || txResult;
        
      } else if (config.sendMethod === 'eth_sendRawTransactionSync') {
        // RISE: синхронный метод уже подтвержден
        console.log('Transaction confirmed:', txResult);
        finalResult = txResult.receipt || txResult;
        
      } else {
        // Стандартные сети: ждём подтверждения с таймаутом
        console.log('Waiting for transaction confirmation...');
        try {
          const { publicClient } = await createClients(chainId);
          const receipt = await Promise.race([
            publicClient.waitForTransactionReceipt({ 
              hash: txResult.hash,
              timeout: 30000 // 30 seconds timeout
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Transaction confirmation timeout')), 35000)
            )
          ]);
          console.log('Transaction confirmed:', receipt);
          finalResult = receipt;
        } catch (confirmError) {
          console.warn('Transaction confirmation failed, but transaction may still be valid:', confirmError);
          // Не бросаем ошибку - транзакция может быть валидной, просто подтверждение не получили
          finalResult = txResult;
        }
      }

      console.log('Jump transaction confirmed:', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('Error sending on-chain movement:', error);
      
      // Обработка специфичных ошибок для улучшения UX
      if (error.message?.includes('nonce too low')) {
        console.log('Nonce too low detected, refreshing nonce and retrying...');
        try {
          // Обновляем nonce принудительно
          await getNextNonce(chainId, embeddedWallet.address, true);
          console.log('Nonce refreshed, please try again');
        } catch (nonceError) {
          console.error('Failed to refresh nonce:', nonceError);
        }
      } else if (error.message?.includes('context deadline exceeded')) {
        console.log('Network timeout detected, transaction may still be processing...');
      } else if (error.message?.includes('insufficient funds')) {
        console.log('Insufficient funds detected, consider calling faucet...');
      }
      
      throw new Error(`Blockchain transaction error: ${error.message}`);
    } finally {
      setTransactionPending(false);
    }
  };

  // ЗНАЧИТЕЛЬНО УЛУЧШЕННАЯ инициализация данных
  const initData = async (chainId) => {
    const chainKey = chainId.toString();
    if (isInitialized.current[chainKey] || isInitializing) {
      return;
    }

    try {
      setIsInitializing(true);
      console.log('Initializing blockchain data for chain:', chainId);

      // Wait for embedded wallet to be created (with retry)
      let embeddedWallet = null;
      let retries = 0;
      const maxRetries = 10;
      
      while (!embeddedWallet && retries < maxRetries) {
        embeddedWallet = getEmbeddedWallet();
        if (!embeddedWallet) {
          console.log(`Waiting for embedded wallet creation... (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        }
      }

      if (!embeddedWallet) {
        throw new Error('No embedded wallet available');
      }

      console.log('Using embedded wallet address:', embeddedWallet.address);

      // Получаем кешированные параметры сети (минимизируем RPC вызовы)
      await getCachedChainParams(chainId);

      // УЛУЧШЕННАЯ инициализация nonce manager
      const nonceManager = getNonceManager(chainId, embeddedWallet.address);
      
      // Проверяем баланс и получаем начальный nonce одновременно
              const [currentBalance, initialNonce] = await Promise.all([
        checkBalance(chainId),
        retryWithBackoff(async () => {
          const { publicClient } = await createClients(chainId);
          return await publicClient.getTransactionCount({
            address: embeddedWallet.address,
            blockTag: 'pending'
          });
        }, 3, 1000, chainId)
      ]);

      // Инициализируем nonce manager с текущим nonce
      nonceManager.currentNonce = initialNonce;
      nonceManager.pendingNonce = initialNonce;
      nonceManager.lastUpdate = Date.now();

      console.log('Current balance:', currentBalance);
      console.log('Starting nonce:', initialNonce);

      // Если баланс равен 0, вызываем faucet
      if (parseFloat(currentBalance) === 0) {
        console.log('Balance is 0, calling faucet...');
        try {
          await callFaucet(embeddedWallet.address, chainId);
          
          // Ждём немного и проверяем баланс снова
          console.log('Waiting for faucet transaction to complete...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          const newBalance = await checkBalance(chainId);
          console.log('Balance after faucet:', newBalance);
          
          // После faucet обновляем nonce, так как могли появиться новые транзакции
          await getNextNonce(chainId, embeddedWallet.address, true);
        } catch (faucetError) {
          console.error('Faucet failed, but continuing with initialization:', faucetError);
          // Don't throw - continue with initialization even if faucet fails
          // Users can manually add funds or try faucet later
        }
      }

      // УЛУЧШЕННОЕ предподписание пакета транзакций с адаптивным размером
      const poolConfig = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
      const fallbackConfig = getFallbackConfig(chainId);
      
      let batchSize = poolConfig.poolSize;
      if (fallbackConfig) {
        batchSize = fallbackConfig.reducedBatchSize;
        console.log(`Using fallback batch size: ${batchSize}`);
      }
      
      console.log(`Pre-signing ${batchSize} transactions starting from nonce ${nonceManager.currentNonce}`);
      
      try {
        await preSignBatch(chainId, nonceManager.currentNonce, batchSize);
        
        // Проверяем, есть ли хотя бы одна подписанная транзакция
        const pool = preSignedPool.current[chainKey];
        if (!pool || pool.transactions.length === 0) {
          console.warn('No transactions were pre-signed, but continuing with manual signing mode');
          // Не бросаем ошибку, продолжаем работу в режиме ручного подписания
        } else {
          console.log(`Successfully pre-signed ${pool.transactions.length} transactions for immediate use`);
        }
      } catch (error) {
        console.error('Pre-signing failed, enabling fallback mode:', error);
        enableFallbackMode(chainId);
        // Продолжаем инициализацию в fallback режиме
      }

      isInitialized.current[chainKey] = true;
      console.log('Initialization complete for chain:', chainId);
      
      if (fallbackConfig) {
        console.log('⚠️ Running in fallback mode - reduced performance expected');
      } else {
        console.log('✅ Full performance mode enabled');
      }
      
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  };

  // Получение текущего номера из контракта
  const getContractNumber = async (chainId) => {
    try {
      const { publicClient, config } = await createClients(chainId);
      
      const number = await publicClient.readContract({
        address: config.contractAddress,
        abi: UPDATER_ABI,
        functionName: 'number'
      });

      setContractNumber(Number(number));
      return Number(number);
    } catch (error) {
      console.error('Error reading contract number:', error);
      return 0;
    }
  };

  // ЗНАЧИТЕЛЬНО УЛУЧШЕННАЯ retry функция с circuit breaker и умной обработкой ошибок
  const circuitBreakers = useRef({});

  const getCircuitBreaker = (chainId) => {
    if (!circuitBreakers.current[chainId]) {
      circuitBreakers.current[chainId] = {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        threshold: 5, // Открываем circuit после 5 неудач
        timeout: 60000 // 60 секунд до попытки перехода в HALF_OPEN
      };
    }
    return circuitBreakers.current[chainId];
  };

  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000, chainId = null) => {
    let lastError;
    let circuitBreaker = null;
    
    // Используем circuit breaker если указан chainId
    if (chainId) {
      circuitBreaker = getCircuitBreaker(chainId);
      
      // Проверяем состояние circuit breaker
      if (circuitBreaker.state === 'OPEN') {
        const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
        if (timeSinceLastFailure < circuitBreaker.timeout) {
          throw new Error(`Circuit breaker is OPEN for chain ${chainId}. Try again in ${Math.round((circuitBreaker.timeout - timeSinceLastFailure) / 1000)} seconds.`);
        } else {
          // Переходим в состояние HALF_OPEN для тестирования
          circuitBreaker.state = 'HALF_OPEN';
          console.log(`Circuit breaker for chain ${chainId} entering HALF_OPEN state`);
        }
      }
    }
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        
        // Успех - сбрасываем circuit breaker
        if (circuitBreaker) {
          circuitBreaker.failures = 0;
          circuitBreaker.state = 'CLOSED';
        }
        
        return result;
      } catch (error) {
        lastError = error;
        const isLastRetry = i === maxRetries - 1;
        
        // Обновляем circuit breaker при ошибке
        if (circuitBreaker) {
          circuitBreaker.failures++;
          circuitBreaker.lastFailureTime = Date.now();
          
          // Переводим в OPEN состояние если превышен порог
          if (circuitBreaker.failures >= circuitBreaker.threshold) {
            circuitBreaker.state = 'OPEN';
            console.warn(`Circuit breaker OPENED for chain ${chainId} after ${circuitBreaker.failures} failures`);
          }
        }
        
        // Проверяем, стоит ли повторять попытку
        const isRetryableError = 
          error.status === 429 || // Too Many Requests
          error.status === 403 || // Forbidden (может быть временно)
          error.status === 500 || // Internal Server Error
          error.status === 502 || // Bad Gateway
          error.status === 503 || // Service Unavailable
          error.status === 504 || // Gateway Timeout
          error.message?.includes('rate limit') ||
          error.message?.includes('timeout') ||
          error.message?.includes('context deadline exceeded') ||
          error.message?.includes('connection') ||
          error.message?.includes('network') ||
          error.message?.includes('fetch') ||
          error.name === 'AbortError' ||
          error.name === 'TypeError'; // Network errors

        // Специальные ошибки, которые не стоит повторять
        const isNonRetryableError = 
          error.message?.includes('nonce too low') ||
          error.message?.includes('insufficient funds') ||
          error.message?.includes('gas too low') ||
          error.message?.includes('invalid signature') ||
          error.message?.includes('execution reverted');

        if (isLastRetry || isNonRetryableError || !isRetryableError) {
          if (isNonRetryableError) {
            console.log(`Non-retryable error encountered: ${error.message}`);
          }
          throw error;
        }

        // Circuit breaker может заставить нас остановиться раньше
        if (circuitBreaker && circuitBreaker.state === 'OPEN') {
          console.log(`Circuit breaker is OPEN, stopping retries for chain ${chainId}`);
          break;
        }

        // Exponential backoff с jitter для избежания thundering herd
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay * Math.pow(2, i) + jitter, 30000); // Максимум 30 секунд
        
        console.log(`Retry attempt ${i + 1}/${maxRetries} after ${Math.round(delay)}ms delay due to:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };

  // Debug утилиты для мониторинга (только в development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      window.blockchainDebug = {
        getRPCHealth: (chainId) => rpcHealthStatus.current[chainId],
        getCircuitBreaker: (chainId) => circuitBreakers.current[chainId],
        getTransactionPool: (chainId) => preSignedPool.current[chainId],
        getBurstState: (chainId) => burstState.current[chainId],
        getConnectionPool: () => activeConnections.current,
        getNonceManager: (chainId, address) => nonceManager.current[`${chainId}-${address}`],
        
        // Утилиты для тестирования
        forceCircuitBreakerOpen: (chainId) => {
          const cb = getCircuitBreaker(chainId);
          cb.state = 'OPEN';
          cb.failures = cb.threshold;
          cb.lastFailureTime = Date.now();
          console.log(`Force opened circuit breaker for chain ${chainId}`);
        },
        
        resetCircuitBreaker: (chainId) => {
          const cb = getCircuitBreaker(chainId);
          cb.state = 'CLOSED';
          cb.failures = 0;
          console.log(`Reset circuit breaker for chain ${chainId}`);
        },
        
        clearTransactionPool: (chainId) => {
          const chainKey = chainId.toString();
          if (preSignedPool.current[chainKey]) {
            preSignedPool.current[chainKey].transactions = [];
            preSignedPool.current[chainKey].currentIndex = 0;
            console.log(`Cleared transaction pool for chain ${chainId}`);
          }
        },
        
        generateHealthReport: (chainId) => {
          const rpcHealth = rpcHealthStatus.current[chainId];
          const poolStatus = preSignedPool.current[chainId?.toString()];
          const circuitBreakerState = circuitBreakers.current[chainId];
          
          const report = {
            timestamp: new Date().toISOString(),
            chainId,
            rpcEndpoints: rpcHealth,
            transactionPool: poolStatus ? {
              totalTransactions: poolStatus.transactions.length,
              currentIndex: poolStatus.currentIndex,
              availableTransactions: poolStatus.transactions.length - poolStatus.currentIndex,
              isRefilling: poolStatus.isRefilling
            } : null,
            circuitBreaker: circuitBreakerState,
            connections: activeConnections.current,
            burstState: burstState.current[chainId]
          };
          
          console.table(report);
          return report;
        }
      };
      
      console.log('🔧 Blockchain debug utilities loaded. Use window.blockchainDebug for monitoring.');
      console.log('📊 Example: window.blockchainDebug.generateHealthReport(6342)');
    }
  }, []);

  return {
    // Состояние
    isInitializing,
    transactionPending,
    balance,
    contractNumber,
    
    // Методы
    initData,
    sendUpdate,
    checkBalance,
    callFaucet,
    getContractNumber,
    
    // Утилиты
    getEmbeddedWallet,
    isAuthenticated: authenticated,
    isReady: authenticated && wallets.length > 0,
    
    // Debug методы (только для разработки)
    ...(process.env.NODE_ENV === 'development' && {
      debugGetRPCHealth: (chainId) => rpcHealthStatus.current[chainId],
      debugGetCircuitBreaker: (chainId) => circuitBreakers.current[chainId],
      debugGenerateReport: (chainId) => window.blockchainDebug?.generateHealthReport(chainId)
    })
  };
};