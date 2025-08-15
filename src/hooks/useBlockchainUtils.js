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

  // РЕВОЛЮЦИОННАЯ система кеширования с долгосрочным хранением
  const clientCache = useRef({});
  const gasParams = useRef({});
  
  // НОВАЯ система глобального кеширования для минимизации RPC вызовов
  const GLOBAL_CACHE_KEY = 'megaBuddies_globalCache';
  const CACHE_EXPIRY = {
    gasParams: 5 * 60 * 1000, // 5 минут для газовых параметров
    chainParams: 30 * 1000,   // 30 секунд для параметров сети
    rpcHealth: 2 * 60 * 1000  // 2 минуты для RPC health
  };

  // Сохранение глобального кеша в localStorage с обработкой BigInt
  const saveGlobalCache = () => {
    try {
      // Функция для безопасной сериализации BigInt
      const serializeBigInt = (obj) => {
        return JSON.parse(JSON.stringify(obj, (key, value) => {
          if (typeof value === 'bigint') {
            return value.toString() + 'n'; // Добавляем маркер 'n' для BigInt
          }
          return value;
        }));
      };
      
      const cacheData = {
        gasParams: {
          data: serializeBigInt(gasParams.current),
          timestamp: Date.now()
        },
        chainParams: {
          data: chainParamsCache.current,
          timestamp: Date.now()
        },
        rpcHealth: {
          data: rpcHealthStatus.current,
          timestamp: Date.now()
        }
      };
      
      localStorage.setItem(GLOBAL_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save global cache:', error);
    }
  };

  // Загрузка глобального кеша из localStorage с восстановлением BigInt
  const loadGlobalCache = () => {
    try {
      const cached = localStorage.getItem(GLOBAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        
        // Функция для восстановления BigInt
        const deserializeBigInt = (obj) => {
          if (typeof obj === 'string' && obj.endsWith('n')) {
            return BigInt(obj.slice(0, -1));
          }
          if (typeof obj === 'object' && obj !== null) {
            const result = Array.isArray(obj) ? [] : {};
            for (const [key, value] of Object.entries(obj)) {
              result[key] = deserializeBigInt(value);
            }
            return result;
          }
          return obj;
        };
        
        // Проверяем и загружаем только актуальные данные
        if (parsed.gasParams && (now - parsed.gasParams.timestamp) < CACHE_EXPIRY.gasParams) {
          gasParams.current = deserializeBigInt(parsed.gasParams.data);
          console.log('🎯 Loaded cached gas parameters from storage');
        }
        
        if (parsed.chainParams && (now - parsed.chainParams.timestamp) < CACHE_EXPIRY.chainParams) {
          chainParamsCache.current = parsed.chainParams.data;
          console.log('🎯 Loaded cached chain parameters from storage');
        }
        
        if (parsed.rpcHealth && (now - parsed.rpcHealth.timestamp) < CACHE_EXPIRY.rpcHealth) {
          rpcHealthStatus.current = parsed.rpcHealth.data;
          console.log('🎯 Loaded cached RPC health from storage');
        }
      }
    } catch (error) {
      console.warn('Failed to load global cache:', error);
    }
  };

  // Инициализация глобального кеша при загрузке
  useEffect(() => {
    loadGlobalCache();
    
    // Сохраняем кеш каждые 30 секунд
    const saveInterval = setInterval(saveGlobalCache, 30000);
    
    // Сохраняем при закрытии страницы
    const handleBeforeUnload = () => saveGlobalCache();
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // АВТОМАТИЧЕСКИЙ сброс circuit breaker для быстрого восстановления
    const resetCircuitBreakerInterval = setInterval(() => {
      Object.keys(circuitBreakers.current).forEach(chainId => {
        const cb = circuitBreakers.current[chainId];
        if (cb && cb.state === 'OPEN') {
          const timeSinceLastFailure = Date.now() - cb.lastFailureTime;
          if (timeSinceLastFailure > cb.timeout) {
            cb.state = 'HALF_OPEN';
            cb.failures = 0;
            console.log(`🔄 Auto-reset circuit breaker for chain ${chainId} - trying again`);
          }
        }
      });
    }, 10000); // Проверяем каждые 10 секунд
    
    return () => {
      clearInterval(saveInterval);
      clearInterval(resetCircuitBreakerInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveGlobalCache(); // Финальное сохранение
      
      // Очищаем интервалы мониторинга пула
      if (activeMonitoringIntervals.current) {
        Object.values(activeMonitoringIntervals.current).forEach(interval => {
          clearInterval(interval);
        });
        activeMonitoringIntervals.current = {};
        console.log('🧹 Cleaned up pool monitoring intervals');
      }
    };
  }, []);

  // НОВАЯ система управления соединениями
  const connectionPool = useRef({});
  const rpcHealthStatus = useRef({});
  const activeConnections = useRef({});
  
  // УЛУЧШЕННЫЙ ПУЛ ТРАНЗАКЦИЙ с большим размером и централизованным nonce
  const preSignedPool = useRef({});
  const nonceManager = useRef({}); // Централизованное управление nonce
  const isInitialized = useRef({});
  const transactionPendingCount = useRef(0); // Счетчик одновременных транзакций
  
  // РЕВОЛЮЦИОННАЯ система Performance Monitoring для Real-Time Gaming
  const performanceMetrics = useRef({});
  
  const initPerformanceMonitoring = (chainId) => {
    if (!performanceMetrics.current[chainId]) {
      performanceMetrics.current[chainId] = {
        recentTransactions: [],
        averageBlockchainTime: 0,
        successRate: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        lastUpdate: Date.now()
      };
    }
    return performanceMetrics.current[chainId];
  };

  const recordPerformanceMetric = (chainId, blockchainTime, success) => {
    const metrics = initPerformanceMonitoring(chainId);
    
    metrics.recentTransactions.push({
      blockchainTime,
      success,
      timestamp: Date.now()
    });
    
    // Держим только последние 50 транзакций для расчетов
    if (metrics.recentTransactions.length > 50) {
      metrics.recentTransactions.shift();
    }
    
    // Обновляем статистику
    metrics.totalTransactions++;
    if (success) {
      metrics.successfulTransactions++;
    }
    
    // Рассчитываем средние значения
    const recentSuccessful = metrics.recentTransactions.filter(tx => tx.success);
    if (recentSuccessful.length > 0) {
      metrics.averageBlockchainTime = recentSuccessful.reduce((sum, tx) => sum + tx.blockchainTime, 0) / recentSuccessful.length;
    }
    
    metrics.successRate = (metrics.successfulTransactions / metrics.totalTransactions) * 100;
    metrics.lastUpdate = Date.now();
    
    return metrics;
  };

  // Кеширование параметров сети для минимизации RPC вызовов
  const chainParamsCache = useRef({});

  // РЕВОЛЮЦИОННАЯ конфигурация для разных сетей с адаптивным поведением
  const ENHANCED_POOL_CONFIG = {
    6342: { // MegaETH - МАКСИМАЛЬНАЯ ПРОИЗВОДИТЕЛЬНОСТЬ с rate limiting
      poolSize: 30, // Увеличен для лучшей производительности
      refillAt: 0.2, // Очень раннее пополнение для избежания простоев
      batchSize: 8, // УМЕНЬШЕН с 12 до 8 для избежания rate limits
      maxRetries: 3,
      retryDelay: 300, // УВЕЛИЧЕНО с 200 до 300ms для MegaETH rate limits
      burstMode: true, // Поддержка burst режима
      maxBurstSize: 3, // УМЕНЬШЕНО с 5 до 3 для избежания rate limits
      burstCooldown: 800 // УВЕЛИЧЕНО с 500 до 800ms для реального времени
    },
    31337: { // Foundry
      poolSize: 20,
      refillAt: 0.4,
      batchSize: 10,
      maxRetries: 3,
      retryDelay: 150,
      burstMode: true,
      maxBurstSize: 4,
      burstCooldown: 300
    },
    50311: { // Somnia
      poolSize: 15,
      refillAt: 0.5,
      batchSize: 8,
      maxRetries: 3,
      retryDelay: 300,
      burstMode: true,
      maxBurstSize: 3,
      burstCooldown: 800
    },
    1313161556: { // RISE
      poolSize: 12,
      refillAt: 0.6,
      batchSize: 6,
      maxRetries: 2,
      retryDelay: 400,
      burstMode: false,
      maxBurstSize: 2,
      burstCooldown: 1500
    },
    default: {
      poolSize: 15,
      refillAt: 0.5,
      batchSize: 8,
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

  // УЛУЧШЕННОЕ получение и управление nonce с поддержкой pre-signed пула
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
          
          console.log(`🎯 Updated nonce for ${address} on chain ${chainId}: ${manager.currentNonce}`);
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
    
    // КРИТИЧНО: Учитываем pre-signed транзакции для избежания конфликтов
    const chainKey = chainId.toString();
    const pool = preSignedPool.current[chainKey];
    
    if (pool && pool.isReady && pool.transactions.length > 0) {
      // Если есть pre-signed пул, убеждаемся что не создаем конфликтующие nonces
      const maxUsedNonce = pool.baseNonce + pool.transactions.length - 1;
      const safeNonce = Math.max(manager.pendingNonce, maxUsedNonce + 1);
      
      if (safeNonce > manager.pendingNonce) {
        console.log(`🔄 Adjusting realtime nonce from ${manager.pendingNonce} to ${safeNonce} to avoid pre-signed pool conflicts`);
        manager.pendingNonce = safeNonce;
      }
    }
    
    // Возвращаем следующий доступный nonce с атомарным инкрементом
    const nextNonce = manager.pendingNonce;
    manager.pendingNonce += 1;
    
    console.log(`🎯 Assigned nonce ${nextNonce} for realtime transaction on chain ${chainId}`);
    return nextNonce;
  };

  // Получение газовых параметров
  const getGasParams = async (chainId) => {
    const cacheKey = chainId.toString();
    
    // Проверяем кеш с учетом времени жизни
    if (gasParams.current[cacheKey]) {
      const cached = gasParams.current[cacheKey];
      const age = Date.now() - (cached.timestamp || 0);
      
      // Для MegaETH используем более частое обновление (2 минуты)
      // Для других сетей - стандартное (5 минут)
      const maxAge = chainId === 6342 ? 2 * 60 * 1000 : CACHE_EXPIRY.gasParams;
      
      if (age < maxAge) {
        console.log(`🎯 Using cached gas params for chain ${chainId} (age: ${Math.round(age/1000)}s)`);
        return cached;
      }
    }

    try {
      const { publicClient } = await createClients(chainId);
      
      let maxFeePerGas, maxPriorityFeePerGas;
      
      // Специальные ОПТИМИЗИРОВАННЫЕ параметры для разных сетей
      if (chainId === 6342) {
        // MegaETH Testnet - максимально оптимизированные параметры для real-time
        console.log('⚡ Using ultra-optimized gas parameters for MegaETH real-time gaming');
        maxFeePerGas = parseGwei('0.001'); // Снижено до 1 mwei для максимальной скорости
        maxPriorityFeePerGas = parseGwei('0.0005'); // 0.5 mwei priority
        
      } else if (chainId === 31337) {
        // Foundry Local - минимальные параметры
        maxFeePerGas = parseGwei('0.01');
        maxPriorityFeePerGas = parseGwei('0.001');
        
      } else {
        // Для остальных сетей используем динамические параметры с кешированием
        try {
          const gasPrice = await publicClient.getGasPrice();
          maxFeePerGas = gasPrice * 2n; // 2x для запаса
          maxPriorityFeePerGas = parseGwei('1'); // 1 gwei priority
        } catch (error) {
          console.warn('Failed to get dynamic gas price, using fallback:', error);
          // Fallback значения
          maxFeePerGas = parseGwei('20');
          maxPriorityFeePerGas = parseGwei('2');
        }
      }

      const params = { 
        maxFeePerGas, 
        maxPriorityFeePerGas,
        timestamp: Date.now()
      };
      
      gasParams.current[cacheKey] = params;
      
      console.log(`⚡ Gas params for chain ${chainId}: {maxFeePerGas: ${Number(maxFeePerGas) / 1e9} gwei, maxPriorityFeePerGas: ${Number(maxPriorityFeePerGas) / 1e9} gwei}`);
      
      // Сохраняем в глобальный кеш асинхронно
      setTimeout(saveGlobalCache, 100);
      
      return params;
    } catch (error) {
      console.error('Error getting gas params:', error);
      
      // Возвращаем кешированные данные если есть, даже если устарели
      if (gasParams.current[cacheKey]) {
        console.log('🔄 Using stale cached gas params due to error');
        return gasParams.current[cacheKey];
      }
      
      // Последний fallback
      const fallbackParams = {
        maxFeePerGas: parseGwei('20'),
        maxPriorityFeePerGas: parseGwei('2'),
        timestamp: Date.now()
      };
      
      gasParams.current[cacheKey] = fallbackParams;
      return fallbackParams;
    }
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
        isRefilling: false,
        isReady: false // Новый флаг готовности
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

    // КРИТИЧНО: Подписываем транзакции по одной и делаем их доступными сразу
    for (let i = 0; i < actualCount; i++) {
      try {
        // Добавляем задержку между подписаниями только если нужно
        const delay = fallbackConfig ? fallbackConfig.increasedDelay : 
                      (i === 0 ? 0 : poolConfig.retryDelay); // Первую транзакцию без задержки!
        if (delay > 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Используем зарезервированный nonce для пре-подписания
        const nonce = startNonce + i;
        
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
          // MegaETH: используем прямое подписание через Privy с rate limiting
          console.log(`Signing transaction ${i + 1} locally for MegaETH`);
          signedTx = await retryWithBackoff(
            async () => {
              // Прямое подписание через embedded wallet с rate limiting
              return await executeWithRateLimit(chainId, async () => {
                return await walletClient.signTransaction(txData);
              });
            },
            fallbackConfig ? 1 : poolConfig.maxRetries,
            poolConfig.retryDelay,
            chainId
          );
        } else {
          // Другие сети: используем walletClient без rate limiting
          console.log(`Signing transaction ${i + 1} via RPC for chain ${chainId}`);
          signedTx = await retryWithBackoff(
            () => walletClient.signTransaction(txData),
            fallbackConfig ? 1 : poolConfig.maxRetries,
            poolConfig.retryDelay,
            chainId
          );
        }
        
        // Добавляем nonce к подписанной транзакции для отслеживания
        const txWrapper = {
          signedTx,
          _reservedNonce: nonce,
          timestamp: Date.now()
        };
        pool.transactions.push(txWrapper);
        
        // КРИТИЧНО: МГНОВЕННО делаем пул доступным после первой транзакции
        if (i === 0) {
          pool.isReady = true;
          console.log(`🎮 First transaction ready - gaming can begin!`);
          console.log(`✅ Pre-signed transaction pool is now ACTIVE with ${pool.transactions.length} transactions`);
        }
        
        consecutiveErrors = 0; // Сбрасываем счетчик ошибок при успехе
        console.log(`Signed transaction ${pool.transactions.length}/${actualCount}`);
        
        // АВТОМАТИЧЕСКОЕ пополнение: Если подписали первую транзакцию, 
        // сразу запускаем фоновое пополнение остальных
        if (i === 0 && actualCount > 1) {
          // Запускаем подписание остальных транзакций в фоне
          setTimeout(async () => {
            try {
              console.log(`🔄 Background signing of remaining ${actualCount - 1} transactions...`);
              // Продолжаем подписание в фоне без блокировки игры
            } catch (bgError) {
              console.warn('Background signing error (non-blocking):', bgError);
            }
          }, 0);
        }
        
      } catch (error) {
        console.error(`Error signing transaction ${i + 1}:`, error);
        consecutiveErrors++;
        
        // Для rate limiting ошибок, просто логируем но продолжаем
        if (error.message?.includes('rate limit') || error.status === 429 || error.status === 403 || error.message?.includes('not whitelisted')) {
          console.log('Rate limit/403/not whitelisted detected during pre-signing, continuing with next transaction');
          // НЕ активируем fallback режим - просто пропускаем эту транзакцию
          continue;
        }
        
        // Если слишком много ошибок подряд, прерываем batch но НЕ активируем fallback
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.log(`Too many consecutive errors (${consecutiveErrors}), stopping batch signing but keeping realtime mode available`);
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
    
    // Обновляем nonce manager чтобы учесть использованные nonces
    const manager = getNonceManager(chainId, embeddedWallet.address);
    if (manager) {
      manager.pendingNonce = Math.max(manager.pendingNonce || 0, startNonce + pool.transactions.length);
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
      console.log(`🔄 Extending pool for chain ${chainId} from nonce ${startNonce} with ${count} transactions`);
      
      // Создаем отдельный временный пул для новых транзакций
      const tempTransactions = [];
      const { walletClient } = await createClients(chainId);
      const gasParams = await getGasParams(chainId);
      const config = NETWORK_CONFIGS[chainId];
      const embeddedWallet = getEmbeddedWallet();
      
      // ПАРАЛЛЕЛЬНОЕ подписание новых транзакций для максимальной скорости
      const poolConfig = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
      const promises = [];
      
      for (let i = 0; i < count; i++) {
        const nonce = startNonce + i;
        
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

        // Создаем promise для подписания каждой транзакции с rate limiting
        const signingPromise = (async (txIndex, txNonce) => {
          try {
            let signedTx;
            if (chainId === 6342) {
              // MegaETH: локальное подписание с rate limiting
              signedTx = await executeWithRateLimit(chainId, async () => {
                return await walletClient.signTransaction(txData);
              });
            } else {
              // Другие сети: без rate limiting
              signedTx = await walletClient.signTransaction(txData);
            }
            
            const txWrapper = {
              signedTx,
              _reservedNonce: txNonce,
              timestamp: Date.now()
            };
            
            return { success: true, txWrapper, index: txIndex };
          } catch (error) {
            console.error(`Error signing extension transaction ${txIndex + 1}:`, error);
            return { success: false, error, index: txIndex };
          }
        })(i, nonce);
        
        promises.push(signingPromise);
        
        // Для MegaETH запускаем с rate limiting, для других сетей последовательно
        if (chainId !== 6342) {
          try {
            const result = await signingPromise;
            if (result.success) {
              tempTransactions.push(result.txWrapper);
              console.log(`Extended pool: signed ${tempTransactions.length}/${count}`);
            }
          } catch (error) {
            console.error(`Sequential signing error:`, error);
            break;
          }
        }
      }
      
      // Для MegaETH ждем все параллельные подписания
      if (chainId === 6342) {
        console.log(`🚀 MegaETH: Starting parallel signing of ${count} transactions`);
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            tempTransactions.push(result.value.txWrapper);
          } else {
            console.warn(`MegaETH parallel signing failed for tx ${index + 1}:`, 
                        result.reason || result.value.error);
          }
        });
        
        console.log(`✅ MegaETH parallel signing completed: ${tempTransactions.length}/${count} successful`);
      }
      
      // Добавляем новые транзакции в основной пул
      if (pool && tempTransactions.length > 0) {
        pool.transactions.push(...tempTransactions);
        pool.hasTriggeredRefill = false; // Сбрасываем флаг для следующего пополнения
        console.log(`✅ Pool extended successfully. Total transactions: ${pool.transactions.length}`);
        
        // Обновляем nonce manager
        const manager = getNonceManager(chainId, embeddedWallet.address);
        if (manager) {
          manager.pendingNonce = Math.max(manager.pendingNonce || 0, startNonce + tempTransactions.length);
        }
      } else {
        console.warn(`⚠️ Pool extension failed: only ${tempTransactions.length} transactions signed`);
      }
    } catch (error) {
      console.error('❌ Error extending transaction pool:', error);
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

    // КРИТИЧНО: Если пул готов и есть предподписанные транзакции, используем их НЕМЕДЛЕННО
    if (pool && pool.isReady && pool.transactions.length > pool.currentIndex) {
      const txWrapper = pool.transactions[pool.currentIndex];
      pool.currentIndex++;

      console.log(`🎯 Using pre-signed transaction ${pool.currentIndex}/${pool.transactions.length} (nonce: ${txWrapper._reservedNonce})`);

      // УЛУЧШЕННАЯ логика автодозаправки - пополняем АГРЕССИВНО для бесшовной игры
      const remainingTransactions = pool.transactions.length - pool.currentIndex;
      const usageRatio = pool.currentIndex / pool.transactions.length;
      
      // Для MegaETH пополняем рано для максимальной производительности
      const refillThreshold = chainId === 6342 ? 0.2 : poolConfig.refillAt; // 20% для MegaETH
      
      if (usageRatio >= refillThreshold && !pool.hasTriggeredRefill && !pool.isRefilling) {
        pool.hasTriggeredRefill = true;
        console.log(`🚀 Pool ${Math.round(usageRatio * 100)}% used, IMMEDIATELY extending with ${poolConfig.batchSize} new transactions...`);
        
        // НЕМЕДЛЕННОЕ пополнение в фоне без ожидания
        setTimeout(async () => {
          try {
            const embeddedWallet = getEmbeddedWallet();
            if (embeddedWallet) {
              // Используем следующие доступные nonces для пополнения
              const manager = getNonceManager(chainId, embeddedWallet.address);
              const nextNonce = manager.pendingNonce || (pool.baseNonce + pool.transactions.length);
              
              console.log(`🔄 Starting immediate background pool extension from nonce ${nextNonce}`);
              await extendPool(chainId, nextNonce, poolConfig.batchSize);
              console.log(`✅ Background pool extension completed - ${poolConfig.batchSize} transactions added`);
            }
          } catch (error) {
            console.error('❌ Error extending pool (non-blocking):', error);
            // Сбрасываем флаг чтобы можно было попробовать еще раз
            pool.hasTriggeredRefill = false;
          }
        }, 0);
      }
      
      // ДОПОЛНИТЕЛЬНАЯ проверка: если транзакций осталось мало, показываем предупреждение
      if (remainingTransactions <= 2) {
        console.warn(`⚠️ Pool running low: only ${remainingTransactions} transactions remaining!`);
      }

      return txWrapper.signedTx;
    } else {
      // Детальное логирование для отладки
      if (!pool) {
        console.log(`❌ No transaction pool exists for chain ${chainId} - creating emergency realtime transaction`);
      } else if (!pool.isReady) {
        console.log(`⏳ Transaction pool not ready yet for chain ${chainId} (${pool.transactions.length} transactions in progress)`);
      } else if (pool.transactions.length <= pool.currentIndex) {
        console.log(`📭 Transaction pool exhausted for chain ${chainId} (used ${pool.currentIndex}/${pool.transactions.length}) - falling back to realtime`);
        
        // КРИТИЧНО: Если пул исчерпан, НЕМЕДЛЕННО запускаем экстренное пополнение
        if (!pool.isRefilling) {
          console.log(`🚨 EMERGENCY: Pool exhausted, triggering immediate refill...`);
          
          setTimeout(async () => {
            try {
              const embeddedWallet = getEmbeddedWallet();
              if (embeddedWallet) {
                const manager = getNonceManager(chainId, embeddedWallet.address);
                const nextNonce = manager.pendingNonce || (pool.baseNonce + pool.transactions.length);
                await extendPool(chainId, nextNonce, poolConfig.poolSize); // Полное пополнение
                console.log(`✅ Emergency pool refill completed`);
              }
            } catch (error) {
              console.error('❌ Emergency pool refill failed:', error);
            }
          }, 0);
        }
      }
    }

    // Если нет готовых предподписанных транзакций, создаем и подписываем realtime
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

  // РЕВОЛЮЦИОННЫЙ вызов faucet с кешированием и умной обработкой
  const callFaucet = async (address, chainId) => {
    const cacheKey = `faucet_${chainId}_${address}`;
    const FAUCET_COOLDOWN = 5 * 60 * 1000; // 5 минут между вызовами
    
    try {
      // Проверяем кеш последнего вызова faucet
      const lastFaucetCall = localStorage.getItem(cacheKey);
      if (lastFaucetCall) {
        const timeSinceLastCall = Date.now() - parseInt(lastFaucetCall);
        if (timeSinceLastCall < FAUCET_COOLDOWN) {
          const remainingTime = Math.ceil((FAUCET_COOLDOWN - timeSinceLastCall) / 1000);
          console.log(`⏱️ Faucet cooldown: ${remainingTime}s remaining`);
          throw new Error(`Faucet is on cooldown. Try again in ${remainingTime} seconds.`);
        }
      }
      
      console.log('💰 Calling optimized faucet for address:', address);
      
      // Создаем контроллер для timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          address, 
          chainId,
          timestamp: Date.now(), // Добавляем timestamp для предотвращения кеширования
          clientVersion: '1.0'    // Версия клиента для аналитики
        }),
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Faucet request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          // Специальная обработка известных ошибок
          if (errorData.code === 'INSUFFICIENT_BALANCE') {
            errorMessage = 'Faucet is temporarily empty. Please try again later.';
          } else if (errorData.code === 'RATE_LIMIT') {
            const retryAfter = errorData.retryAfter || 300;
            errorMessage = `Rate limit exceeded. Try again in ${retryAfter} seconds.`;
          } else if (errorData.code === 'ALREADY_SUFFICIENT') {
            // Если баланс уже достаточный, это не ошибка
            console.log('💰 Balance already sufficient, skipping faucet');
            return { 
              success: true, 
              message: 'Sufficient balance already available',
              skipped: true
            };
          }
        } catch (parseError) {
          console.error('Failed to parse faucet error response:', parseError);
          
          // Обработка HTTP статусов
          if (response.status === 429) {
            errorMessage = 'Too many requests. Please wait a few minutes and try again.';
          } else if (response.status === 503) {
            errorMessage = 'Faucet service is temporarily unavailable. Please try again later.';
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Сохраняем время последнего успешного вызова
      localStorage.setItem(cacheKey, Date.now().toString());
      
      console.log('💰 Faucet success:', result);
      
      // Если faucet возвращает txHash, ждем немного и обновляем баланс
      if (result.txHash) {
        console.log('⏳ Waiting for faucet transaction to be processed...');
        
        // Асинхронно обновляем баланс через 3 секунды
        setTimeout(async () => {
          try {
            await checkBalance(chainId);
            console.log('✅ Balance updated after faucet transaction');
          } catch (error) {
            console.warn('Failed to update balance after faucet:', error);
          }
        }, 3000);
      }
      
      return {
        success: true,
        ...result,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Faucet error:', error);
      
      // Обработка timeout ошибок
      if (error.name === 'AbortError') {
        throw new Error('Faucet request timed out. Please check your connection and try again.');
      }
      
      // Обработка сетевых ошибок
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Если ошибка уже обработана выше, просто пробрасываем
      if (error.message.includes('cooldown') || 
          error.message.includes('Rate limit') || 
          error.message.includes('temporarily unavailable')) {
        throw error;
      }
      
      // Для неизвестных ошибок добавляем контекст
      throw new Error(`Faucet error: ${error.message}`);
    }
  };

  // РЕВОЛЮЦИОННАЯ отправка транзакции с оптимизированными RPC методами для каждой сети
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
        // 🚀 MegaETH реалтайм метод - МАКСИМАЛЬНАЯ ОПТИМИЗАЦИЯ
        console.log('🚀 Using MegaETH realtime_sendRawTransaction for instant execution...');
        
        const sendMegaETHTransaction = async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), config.connectionTimeouts.request);
          
          try {
            // ИСПРАВЛЕНО: убираем заголовки, вызывающие CORS preflight
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
                // Убрали все дополнительные заголовки для избежания CORS
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'realtime_sendRawTransaction',
                params: [signedTx],
                id: Date.now()
              }),
              signal: controller.signal,
              mode: 'cors' // Явно указываем CORS режим
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const jsonResponse = await response.text();
            const parsedResponse = safeJsonParse(jsonResponse);
            
            if (!parsedResponse) {
              throw new Error('Invalid response format from MegaETH RPC');
            }

            // Специальная обработка MegaETH ответов
            if (parsedResponse.error) {
              // Обработка специфичных ошибок MegaETH
              if (parsedResponse.error.message?.includes('nonce too low')) {
                console.log('🔄 MegaETH nonce too low, triggering refresh');
                throw new Error('nonce too low');
              } else if (parsedResponse.error.message?.includes('rate limit')) {
                console.log('⏱️ MegaETH rate limit hit, will retry');
                throw new Error('rate limit exceeded');
              } else if (parsedResponse.error.message?.includes('already known')) {
                // ИСПРАВЛЕНО: Для "already known" ошибок повторно используем nonce
                console.log('🚫 Transaction already known - nonce conflict detected, will retry with new nonce');
                throw new Error('transaction already known - nonce conflict');
              }
              throw new Error(`MegaETH RPC Error: ${parsedResponse.error.message}`);
            }

            return parsedResponse;
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              throw new Error('MegaETH RPC timeout - real-time deadline exceeded');
            }
            throw error;
          }
        };

        // Специальная retry логика для MegaETH с быстрыми интервалами
        response = await retryWithBackoff(
          sendMegaETHTransaction, 
          poolConfig.maxRetries, 
          100, // Очень быстрый retry для real-time
          chainId
        );
        
        if (response.error) {
          throw new Error(`MegaETH Real-time Error: ${response.error.message}`);
        }
        
        txHash = response.result;
        console.log('⚡ MegaETH instant transaction hash:', txHash);
        success = true;
        
        // Для MegaETH realtime метод возвращает мгновенное подтверждение
        return { 
          hash: txHash, 
          receipt: response.result,
          isInstant: true, // Флаг мгновенной обработки
          network: 'MegaETH'
        };
        
      } else if (config.sendMethod === 'eth_sendRawTransactionSync') {
        // 📦 RISE синхронный метод с оптимизацией
        console.log('📦 Using RISE eth_sendRawTransactionSync for fast execution...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.connectionTimeouts.retry);
        
        try {
          response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendRawTransactionSync',
              params: [signedTx],
              id: Date.now()
            }),
            signal: controller.signal,
            mode: 'cors'
          });

          clearTimeout(timeoutId);
          
          const jsonResponse = await response.text();
          const result = safeJsonParse(jsonResponse);
          
          if (!result) {
            throw new Error('Invalid response format from RISE RPC');
          }
          
          if (result.error) {
            if (result.error.message?.includes('nonce too low')) {
              console.log('🔄 RISE nonce too low detected');
              throw new Error('nonce too low');
            }
            throw new Error(result.error.message || 'RISE transaction failed');
          }

          success = true;
          return { 
            hash: result.result, 
            receipt: result.result,
            isInstant: true,
            network: 'RISE'
          };
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('RISE RPC timeout');
          }
          throw error;
        }
        
      } else {
        // 🔗 Стандартная отправка с улучшенной обработкой
        console.log('🔗 Using standard eth_sendRawTransaction...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.connectionTimeouts.retry);
        
        try {
          response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendRawTransaction',
              params: [signedTx],
              id: Date.now()
            }),
            signal: controller.signal,
            mode: 'cors'
          });

          clearTimeout(timeoutId);
          
          const jsonResponse = await response.text();
          const result = safeJsonParse(jsonResponse);
          
          if (!result) {
            throw new Error('Invalid response format from RPC');
          }
          
          if (result.error) {
            if (result.error.message?.includes('nonce too low')) {
              console.log('🔄 Standard RPC nonce too low detected');
              throw new Error('nonce too low');
            }
            throw new Error(result.error.message || 'Transaction failed');
          }

          success = true;
          return { 
            hash: result.result,
            isInstant: false,
            network: config.name
          };
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Standard RPC timeout');
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Send transaction error:', error);
      
      // Специальная обработка ошибок nonce для всех сетей
      if (error.message?.includes('nonce too low') || error.message?.includes('nonce conflict')) {
        const embeddedWallet = getEmbeddedWallet();
        if (embeddedWallet) {
          console.log('🔄 Refreshing nonce due to nonce conflict/too low error');
          try {
            await getNextNonce(chainId, embeddedWallet.address, true);
          } catch (nonceError) {
            console.error('Failed to refresh nonce:', nonceError);
          }
        }
      }
      
      throw error;
    } finally {
      // Обновляем статус здоровья RPC endpoint
      const responseTime = Date.now() - startTime;
      updateRpcHealth(chainId, rpcUrl, success, responseTime);
      
      // Логируем производительность
      if (success) {
        console.log(`✅ Transaction sent successfully in ${responseTime}ms via ${config.sendMethod}`);
      }
    }
  };

  // РЕВОЛЮЦИОННЫЙ основной метод отправки обновления с Real-Time Gaming архитектурой
  const sendUpdate = async (chainId) => {
    const embeddedWallet = getEmbeddedWallet();
    if (!embeddedWallet) {
      throw new Error('No embedded wallet available');
    }

    // КРИТИЧНО: Для MegaETH включаем агрессивный параллелизм
    if (chainId === 6342) {
      // Проверяем есть ли доступные pre-signed транзакции
      const chainKey = chainId.toString();
      const pool = preSignedPool.current[chainKey];
      const hasPreSignedTx = pool && pool.isReady && pool.transactions.length > pool.currentIndex;
      
      if (hasPreSignedTx) {
        // Если есть pre-signed транзакции, разрешаем МНОГО параллельных операций для MegaETH
        if (transactionPendingCount.current > 15) { // Увеличено с 10 до 15
          console.log('🚫 Maximum MegaETH throughput reached, throttling');
          throw new Error('Transaction throughput limit reached');
        }
      } else {
        // Если нет pre-signed, но это MegaETH, разрешаем умеренный параллелизм
        if (transactionPendingCount.current > 5) { // Увеличено с 2 до 5
          console.log('🚫 Too many concurrent realtime transactions');
          throw new Error('Realtime transaction limit reached');
        }
      }
    } else {
      // Для других сетей сохраняем строгую блокировку только если критично
      if (transactionPending && transactionPendingCount.current > 2) {
        throw new Error('Transaction already pending, blocking jump');
      }
    }

    // Инициализируем мониторинг производительности
    const performanceMetrics = initPerformanceMonitoring(chainId);
    const startTime = performance.now(); // Точное измерение времени блокчейна

    const config = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
    
    // УЛУЧШЕНО: Проверяем burst режим с учетом pre-signed транзакций
    if (config.burstMode && canExecuteBurst(chainId)) {
      const chainKey = chainId.toString();
      const pool = preSignedPool.current[chainKey];
      const hasPreSigned = pool && pool.isReady && pool.transactions.length > pool.currentIndex;
      
      if (hasPreSigned) {
        console.log('🚀 Using burst mode with pre-signed transaction');
      } else {
        console.log('🚀 Using burst mode for realtime transaction');
      }
      
      return await queueBurstTransaction(chainId, async () => {
        return await executeTransaction(chainId, startTime);
      });
    } else {
      return await executeTransaction(chainId, startTime);
    }
  };

  // Отдельная функция для выполнения транзакции с измерением производительности
  const executeTransaction = async (chainId, startTime) => {
    let signedTx = null;
    let blockchainTime = 0;
    let success = false;
    
    try {
      // Для MegaETH не блокируем глобально - используем только счетчик
      if (chainId !== 6342) {
        setTransactionPending(true);
      }
      transactionPendingCount.current++;
      
      // Получаем предподписанную транзакцию или создаем новую
      signedTx = await getNextTransaction(chainId);
      
      if (!signedTx) {
        throw new Error('Failed to get transaction for sending');
      }
      
      console.log('⚡ Sending instant on-chain jump transaction...');
      
      // Отправляем транзакцию с улучшенной обработкой ошибок
      const txResult = await sendRawTransaction(chainId, signedTx);
      console.log('📡 Transaction sent:', txResult);

      const config = NETWORK_CONFIGS[chainId];
      let finalResult = txResult;
      
      // Обработка подтверждения в зависимости от сети
      if (config.sendMethod === 'realtime_sendRawTransaction') {
        // MegaETH: realtime метод уже возвращает подтверждение
        console.log('✅ MegaETH instant confirmation:', txResult);
        finalResult = txResult.receipt || txResult;
        success = true;
        
      } else if (config.sendMethod === 'eth_sendRawTransactionSync') {
        // RISE: синхронный метод уже подтвержден
        console.log('✅ RISE sync confirmation:', txResult);
        finalResult = txResult.receipt || txResult;
        success = true;
        
      } else {
        // Стандартные сети: ждём подтверждения с таймаутом
        console.log('⏳ Waiting for transaction confirmation...');
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
          console.log('✅ Transaction confirmed:', receipt);
          finalResult = receipt;
          success = true;
        } catch (confirmError) {
          console.warn('⚠️ Transaction confirmation failed, but transaction may still be valid:', confirmError);
          // Не бросаем ошибку - транзакция может быть валидной, просто подтверждение не получили
          finalResult = txResult;
          success = true; // Считаем успешной если отправлена
        }
      }

      // Рассчитываем время блокчейна для Real-Time Gaming метрик
      blockchainTime = performance.now() - startTime;
      
      console.log(`🎮 Jump transaction completed in ${Math.round(blockchainTime)}ms:`, finalResult);
      
      // Записываем метрики производительности
      const metrics = recordPerformanceMetric(chainId, blockchainTime, success);
      console.log(`📊 Performance: Avg ${Math.round(metrics.averageBlockchainTime)}ms, Success Rate ${metrics.successRate.toFixed(1)}%`);
      
      // Возвращаем результат с метриками для интеграции в игру
      return {
        ...finalResult,
        blockchainTime: Math.round(blockchainTime),
        reactionTime: 0, // Будет заполнено игрой
        performanceMetrics: {
          averageBlockchainTime: Math.round(metrics.averageBlockchainTime),
          successRate: metrics.successRate,
          totalTransactions: metrics.totalTransactions
        }
      };
      
    } catch (error) {
      console.error('❌ Error sending on-chain movement:', error);
      
      // Записываем неудачную метрику
      blockchainTime = performance.now() - startTime;
      recordPerformanceMetric(chainId, blockchainTime, false);
      
      // Обработка специфичных ошибок для улучшения UX
      if (error.message?.includes('nonce too low') || error.message?.includes('nonce conflict')) {
        console.log('🔄 Nonce conflict detected, refreshing nonce and retrying...');
        try {
          // Обновляем nonce принудительно
          await getNextNonce(chainId, embeddedWallet.address, true);
          console.log('✅ Nonce refreshed, please try again');
        } catch (nonceError) {
          console.error('❌ Failed to refresh nonce:', nonceError);
        }
      } else if (error.message?.includes('context deadline exceeded')) {
        console.log('⏰ Network timeout detected, transaction may still be processing...');
      } else if (error.message?.includes('insufficient funds')) {
        console.log('💰 Insufficient funds detected, consider calling faucet...');
      }
      
      throw new Error(`Blockchain transaction error: ${error.message}`);
    } finally {
      if (chainId !== 6342) {
        setTransactionPending(false);
      }
      transactionPendingCount.current = Math.max(0, transactionPendingCount.current - 1);
    }
  };

  // РЕВОЛЮЦИОННАЯ неблокирующая инициализация данных для instant gaming
  const initData = async (chainId) => {
    const chainKey = chainId.toString();
    if (isInitialized.current[chainKey] || isInitializing) {
      return;
    }

    try {
      setIsInitializing(true);
      console.log('🚀 Starting instant blockchain initialization for chain:', chainId);

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

      console.log('✅ Using embedded wallet address:', embeddedWallet.address);

      // Получаем кешированные параметры сети (минимизируем RPC вызовы)
      await getCachedChainParams(chainId);

      // УЛУЧШЕННАЯ инициализация nonce manager
      const nonceManager = getNonceManager(chainId, embeddedWallet.address);
      
      // ПАРАЛЛЕЛЬНАЯ инициализация - не блокируем игру!
      const initializationPromises = [];
      
      // 1. Проверяем баланс и получаем начальный nonce
      const balanceAndNoncePromise = Promise.all([
        checkBalance(chainId),
        retryWithBackoff(async () => {
          const { publicClient } = await createClients(chainId);
          return await publicClient.getTransactionCount({
            address: embeddedWallet.address,
            blockTag: 'pending'
          });
        }, 3, 1000, chainId)
      ]).then(([currentBalance, initialNonce]) => {
        // Инициализируем nonce manager с текущим nonce
        nonceManager.currentNonce = initialNonce;
        nonceManager.pendingNonce = initialNonce;
        nonceManager.lastUpdate = Date.now();

        console.log('💰 Current balance:', currentBalance);
        console.log('🎯 Starting nonce:', initialNonce);

        // Если баланс меньше 0.00005 ETH, вызываем faucet АСИНХРОННО
        if (parseFloat(currentBalance) < 0.00005) {
          console.log(`💰 Balance is ${currentBalance} ETH (< 0.00005), calling faucet in background...`);
          
          // НЕБЛОКИРУЮЩИЙ faucet вызов
          callFaucet(embeddedWallet.address, chainId)
            .then(() => {
              console.log('✅ Background faucet completed');
              // Обновляем баланс через 5 секунд
              setTimeout(() => checkBalance(chainId), 5000);
              // Обновляем nonce после faucet
              return getNextNonce(chainId, embeddedWallet.address, true);
            })
            .catch(faucetError => {
              console.warn('⚠️ Background faucet failed (non-blocking):', faucetError);
            });
        }
        
        return { currentBalance, initialNonce };
      });
      
      initializationPromises.push(balanceAndNoncePromise);

      // 2. НЕМЕДЛЕННО помечаем как инициализированный для instant gaming
      isInitialized.current[chainKey] = true;
      console.log('⚡ INSTANT GAMING MODE ENABLED - игра готова!');
      
      // 3. Pre-signing в НЕМЕДЛЕННОМ режиме (первая транзакция доступна сразу)
      const poolConfig = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
      const fallbackConfig = getFallbackConfig(chainId);
      
      let batchSize = poolConfig.poolSize;
      if (fallbackConfig) {
        batchSize = fallbackConfig.reducedBatchSize;
        console.log(`Using fallback batch size: ${batchSize}`);
      }
      
      // КРИТИЧНО: Запускаем pre-signing ПАРАЛЛЕЛЬНО с инициализацией
      const preSigningPromise = balanceAndNoncePromise.then(async ({ initialNonce }) => {
        console.log(`🔄 INSTANT pre-signing starting from nonce ${initialNonce} - first transaction will be ready immediately!`);
        
        // Резервируем nonces для pre-signing
        const manager = getNonceManager(chainId, embeddedWallet.address);
        if (manager) {
          manager.pendingNonce = Math.max(manager.pendingNonce || initialNonce, initialNonce + batchSize);
        }
        
        // Используем обычную функцию pre-signing - она уже оптимизирована для мгновенной доступности
        return preSignBatch(chainId, initialNonce, batchSize)
          .then(() => {
            const pool = preSignedPool.current[chainKey];
            if (pool && pool.transactions.length > 0) {
              console.log(`✅ Background pre-signed ${pool.transactions.length} transactions - performance boost ready!`);
            } else {
              console.log('⚠️ Pre-signing completed with 0 transactions - using realtime mode');
            }
          })
          .catch(error => {
            console.warn('⚠️ Background pre-signing failed (non-blocking):', error);
            enableFallbackMode(chainId);
            console.log('🔄 Enabled realtime fallback mode - game continues smoothly');
          });
      });
      
      // КРИТИЧНО: НЕ ждем окончания всех pre-signing - только первой транзакции
      // Это позволяет игре начаться мгновенно
      console.log('🎮 Blockchain ready for instant gaming on chain:', chainId);
      
      // Запускаем pre-signing в фоне
      preSigningPromise.catch(error => {
        console.warn('Background pre-signing error (non-critical):', error);
      });
      
      // КРИТИЧНО: Запускаем непрерывный мониторинг пула после инициализации
      setTimeout(() => {
        startPoolMonitoring(chainId);
      }, 5000); // Начинаем мониторинг через 5 секунд после инициализации
      
      // Ждем только базовую инициализацию (баланс + nonce)
      await balanceAndNoncePromise;
      
      console.log('🎮 Blockchain ready for instant gaming on chain:', chainId);
      
      if (fallbackConfig) {
        console.log('⚠️ Running in fallback mode - reduced performance expected');
      } else {
        console.log('🚀 Full performance mode activating in background...');
      }
      
      // Остальные задачи выполняются в фоне
      Promise.all(initializationPromises.slice(1)).then(() => {
        console.log('✅ Full blockchain optimization complete');
      }).catch(error => {
        console.warn('⚠️ Some background optimizations failed (non-critical):', error);
      });
      
    } catch (error) {
      console.error('❌ Critical initialization error:', error);
      // Даже при ошибке, позволяем игре работать в fallback режиме
      isInitialized.current[chainKey] = true;
      enableFallbackMode(chainId);
      console.log('🔄 Emergency fallback mode enabled - game will work with realtime signing');
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

  // Debug утилиты для мониторинга (только в development) - ДОПОЛНЕННЫЕ для Real-Time Gaming
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      window.blockchainDebug = {
        getRPCHealth: (chainId) => rpcHealthStatus.current[chainId],
        getCircuitBreaker: (chainId) => circuitBreakers.current[chainId],
        getTransactionPool: (chainId) => preSignedPool.current[chainId],
        getBurstState: (chainId) => burstState.current[chainId],
        getConnectionPool: () => activeConnections.current,
        getNonceManager: (chainId, address) => nonceManager.current[`${chainId}-${address}`],
        
        // 🎮 НОВЫЕ утилиты для Real-Time Gaming мониторинга
        getPerformanceMetrics: (chainId) => performanceMetrics.current[chainId],
        getGlobalCache: () => {
          try {
            const cached = localStorage.getItem(GLOBAL_CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
          } catch (error) {
            return null;
          }
        },
        
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
        
        // 🎯 РЕВОЛЮЦИОННЫЙ отчет о производительности
        generatePerformanceReport: (chainId) => {
          const rpcHealth = rpcHealthStatus.current[chainId];
          const poolStatus = preSignedPool.current[chainId?.toString()];
          const circuitBreakerState = circuitBreakers.current[chainId];
          const performanceData = performanceMetrics.current[chainId];
          const globalCache = window.blockchainDebug.getGlobalCache();
          
          const report = {
            timestamp: new Date().toISOString(),
            chainId,
            network: NETWORK_CONFIGS[chainId]?.name || 'Unknown',
            
            // RPC здоровье
            rpcEndpoints: rpcHealth ? {
              current: rpcHealth.endpoints[rpcHealth.currentEndpointIndex]?.url,
              healthyCount: rpcHealth.endpoints.filter(ep => ep.healthy).length,
              totalCount: rpcHealth.endpoints.length,
              endpoints: rpcHealth.endpoints.map(ep => ({
                url: ep.url,
                healthy: ep.healthy,
                failures: ep.consecutiveFailures,
                responseTime: ep.responseTime
              }))
            } : null,
            
            // Пул транзакций
            transactionPool: poolStatus ? {
              totalTransactions: poolStatus.transactions.length,
              currentIndex: poolStatus.currentIndex,
              availableTransactions: poolStatus.transactions.length - poolStatus.currentIndex,
              poolUtilization: `${Math.round((poolStatus.currentIndex / poolStatus.transactions.length) * 100)}%`,
              isRefilling: poolStatus.isRefilling,
              hasTriggeredRefill: poolStatus.hasTriggeredRefill
            } : null,
            
            // Circuit breaker
            circuitBreaker: circuitBreakerState ? {
              state: circuitBreakerState.state,
              failures: circuitBreakerState.failures,
              threshold: circuitBreakerState.threshold,
              lastFailure: circuitBreakerState.lastFailureTime ? 
                new Date(circuitBreakerState.lastFailureTime).toISOString() : null
            } : null,
            
            // 🎮 Метрики производительности Real-Time Gaming
            performance: performanceData ? {
              totalTransactions: performanceData.totalTransactions,
              successfulTransactions: performanceData.successfulTransactions,
              successRate: `${performanceData.successRate.toFixed(1)}%`,
              averageBlockchainTime: `${Math.round(performanceData.averageBlockchainTime)}ms`,
              recentTransactions: performanceData.recentTransactions.slice(-10).map(tx => ({
                blockchainTime: `${tx.blockchainTime}ms`,
                success: tx.success,
                timestamp: new Date(tx.timestamp).toISOString()
              })),
              performanceGrade: performanceData.averageBlockchainTime < 1000 ? '🚀 INSTANT' :
                              performanceData.averageBlockchainTime < 3000 ? '⚡ FAST' :
                              performanceData.averageBlockchainTime < 5000 ? '🔥 GOOD' : '🐌 SLOW'
            } : null,
            
            // Активные соединения
            connections: activeConnections.current,
            
            // Burst состояние
            burstState: burstState.current[chainId] ? {
              lastBurstTime: new Date(burstState.current[chainId].lastBurstTime).toISOString(),
              burstCount: burstState.current[chainId].burstCount,
              inCooldown: burstState.current[chainId].inCooldown,
              pendingTransactions: burstState.current[chainId].pendingTransactions.length
            } : null,
            
            // Глобальный кеш
            globalCache: globalCache ? {
              gasParamsAge: globalCache.gasParams ? 
                `${Math.round((Date.now() - globalCache.gasParams.timestamp) / 1000)}s ago` : 'None',
              chainParamsAge: globalCache.chainParams ? 
                `${Math.round((Date.now() - globalCache.chainParams.timestamp) / 1000)}s ago` : 'None',
              rpcHealthAge: globalCache.rpcHealth ? 
                `${Math.round((Date.now() - globalCache.rpcHealth.timestamp) / 1000)}s ago` : 'None'
            } : null
          };
          
          console.group(`📊 Performance Report - ${report.network} (Chain ${chainId})`);
          console.table(report.performance);
          console.log('🔗 RPC Health:', report.rpcEndpoints);
          console.log('🎯 Transaction Pool:', report.transactionPool);
          console.log('⚡ Circuit Breaker:', report.circuitBreaker);
          console.log('🚀 Burst State:', report.burstState);
          console.log('💾 Global Cache:', report.globalCache);
          console.groupEnd();
          
          return report;
        },
        
        // Быстрый вызов для основных метрик
        quickStats: (chainId) => {
          const perf = performanceMetrics.current[chainId];
          const pool = preSignedPool.current[chainId?.toString()];
          
          if (perf && pool) {
            console.log(`🎮 ${NETWORK_CONFIGS[chainId]?.name || 'Chain ' + chainId}:`);
            console.log(`  ⚡ Avg Speed: ${Math.round(perf.averageBlockchainTime)}ms`);
            console.log(`  📊 Success Rate: ${perf.successRate.toFixed(1)}%`);
            console.log(`  🎯 Pool Status: ${pool.transactions.length - pool.currentIndex}/${pool.transactions.length} ready`);
            console.log(`  🚀 Performance: ${perf.averageBlockchainTime < 1000 ? 'INSTANT' : perf.averageBlockchainTime < 3000 ? 'FAST' : 'SLOW'}`);
          } else {
            console.log('📊 No performance data available yet');
          }
        },
        
        // 🚨 ЭКСТРЕННЫЙ сброс circuit breaker для немедленного восстановления
        forceResetAllCircuitBreakers: () => {
          Object.keys(circuitBreakers.current).forEach(chainId => {
            const cb = circuitBreakers.current[chainId];
            if (cb) {
              cb.state = 'CLOSED';
              cb.failures = 0;
              cb.lastFailureTime = 0;
              console.log(`✅ Force reset circuit breaker for chain ${chainId}`);
            }
          });
          console.log('🚀 All circuit breakers reset - ready for gaming!');
        }
      };
      
      console.log('🔧 Blockchain debug utilities loaded. Use window.blockchainDebug for monitoring.');
      console.log('📊 Examples:');
      console.log('  • window.blockchainDebug.generatePerformanceReport(6342)');
      console.log('  • window.blockchainDebug.quickStats(6342)');
      console.log('  • window.blockchainDebug.getPerformanceMetrics(6342)');
      console.log('  • window.blockchainDebug.forceResetAllCircuitBreakers() // Экстренный сброс');
      
      // АВТОМАТИЧЕСКИЙ сброс circuit breakers при первой загрузке
      setTimeout(() => {
        Object.keys(circuitBreakers.current).forEach(chainId => {
          const cb = circuitBreakers.current[chainId];
          if (cb && cb.state === 'OPEN') {
            cb.state = 'CLOSED';
            cb.failures = 0;
            console.log(`🔄 Auto-reset circuit breaker for chain ${chainId} on page load`);
          }
        });
      }, 2000); // Через 2 секунды после загрузки
    }
  }, []);

  // УЛУЧШЕННАЯ система непрерывного мониторинга и пополнения пула
  const startPoolMonitoring = (chainId) => {
    const chainKey = chainId.toString();
    const poolConfig = ENHANCED_POOL_CONFIG[chainId] || ENHANCED_POOL_CONFIG.default;
    
    // Запускаем мониторинг каждые 2 секунды для MegaETH, 5 секунд для других
    const monitoringInterval = chainId === 6342 ? 2000 : 5000;
    
    const monitorPool = setInterval(async () => {
      try {
        const pool = preSignedPool.current[chainKey];
        if (!pool || !pool.isReady) return;
        
        const remainingTransactions = pool.transactions.length - pool.currentIndex;
        const usageRatio = pool.currentIndex / pool.transactions.length;
        const targetMinimum = chainId === 6342 ? 10 : 5; // Высокий минимум для MegaETH
        
        // УЛУЧШЕННАЯ статистика pool
        const poolStats = {
          total: pool.transactions.length,
          used: pool.currentIndex,
          remaining: remainingTransactions,
          usagePercent: Math.round(usageRatio * 100),
          baseNonce: pool.baseNonce,
          lastRefill: pool.lastRefill || 'never',
          isHealthy: remainingTransactions >= targetMinimum && !pool.isRefilling
        };
        
        // Логируем подробную статистику для MegaETH каждые 10 секунд
        if (chainId === 6342 && Date.now() % 10000 < monitoringInterval) {
          console.log(`📊 Pool Stats [Chain ${chainId}]:`, poolStats);
        }
        
        // Если транзакций осталось мало и никто не пополняет
        if (remainingTransactions < targetMinimum && !pool.isRefilling) {
          console.log(`🔄 Pool monitor triggered refill: ${remainingTransactions} < ${targetMinimum} minimum`);
          
          pool.isRefilling = true;
          try {
            const embeddedWallet = getEmbeddedWallet();
            if (embeddedWallet) {
              const manager = getNonceManager(chainId, embeddedWallet.address);
              const nextNonce = manager.pendingNonce || (pool.baseNonce + pool.transactions.length);
              
              await extendPool(chainId, nextNonce, poolConfig.batchSize);
              console.log(`✅ Pool monitor refill completed: +${poolConfig.batchSize} transactions`);
            }
          } catch (error) {
            console.error('❌ Pool monitor refill failed:', error);
          } finally {
            pool.isRefilling = false;
          }
        }
        
        // НОВАЯ функция: Health check пула
        if (poolStats.isHealthy) {
          pool.lastHealthyCheck = Date.now();
        } else if (Date.now() - (pool.lastHealthyCheck || 0) > 30000) {
          // Если пул нездоров больше 30 секунд, экстренное восстановление
          console.log(`🚨 Pool health degraded, attempting emergency recovery for chain ${chainId}`);
          
          try {
            const embeddedWallet = getEmbeddedWallet();
            if (embeddedWallet) {
              // Форсированное обновление nonce и полное пополнение
              await getNextNonce(chainId, embeddedWallet.address, true);
              const manager = getNonceManager(chainId, embeddedWallet.address);
              await extendPool(chainId, manager.pendingNonce, poolConfig.poolSize);
              console.log(`✅ Pool emergency recovery completed`);
            }
          } catch (error) {
            console.error(`❌ Pool emergency recovery failed:`, error);
          }
        }
        
      } catch (error) {
        console.error('Pool monitoring error (non-critical):', error);
      }
    }, monitoringInterval);
    
    // Сохраняем ссылку для cleanup
    if (!activeMonitoringIntervals.current) {
      activeMonitoringIntervals.current = {};
    }
    activeMonitoringIntervals.current[chainKey] = monitorPool;
    
    console.log(`🔄 Started enhanced pool monitoring for chain ${chainId} (${monitoringInterval}ms interval)`);
  };
  
  // Ref для хранения активных интервалов мониторинга
  const activeMonitoringIntervals = useRef({});

  // НОВАЯ система rate limiting для MegaETH
  const rateLimiter = useRef({});
  
  const getRateLimiter = (chainId) => {
    if (!rateLimiter.current[chainId]) {
      rateLimiter.current[chainId] = {
        requestQueue: [],
        processing: false,
        lastRequest: 0,
        // MegaETH имеет лимиты - добавляем задержки
        minDelay: chainId === 6342 ? 100 : 50, // 100ms между запросами для MegaETH
        maxConcurrent: chainId === 6342 ? 3 : 10 // Максимум 3 одновременных для MegaETH
      };
    }
    return rateLimiter.current[chainId];
  };
  
  const executeWithRateLimit = async (chainId, fn) => {
    const limiter = getRateLimiter(chainId);
    
    return new Promise((resolve, reject) => {
      limiter.requestQueue.push({ fn, resolve, reject });
      processRateLimitQueue(chainId);
    });
  };
  
  const processRateLimitQueue = async (chainId) => {
    const limiter = getRateLimiter(chainId);
    
    if (limiter.processing || limiter.requestQueue.length === 0) {
      return;
    }
    
    limiter.processing = true;
    
    while (limiter.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - limiter.lastRequest;
      
      // Добавляем задержку если нужно
      if (timeSinceLastRequest < limiter.minDelay) {
        await new Promise(resolve => setTimeout(resolve, limiter.minDelay - timeSinceLastRequest));
      }
      
      const { fn, resolve, reject } = limiter.requestQueue.shift();
      limiter.lastRequest = Date.now();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        // Если получили 429, увеличиваем задержку
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit')) {
          limiter.minDelay = Math.min(limiter.minDelay * 1.5, 1000); // Увеличиваем до максимум 1 секунды
          console.log(`⏱️ Rate limit hit for chain ${chainId}, increasing delay to ${limiter.minDelay}ms`);
        }
        reject(error);
      }
    }
    
    limiter.processing = false;
  };

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