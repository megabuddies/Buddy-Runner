import { useState, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, http, custom, parseGwei, createPublicClient } from 'viem';

// Конфигурация сетей
const NETWORK_CONFIGS = {
  6342: { // MegaETH Testnet
    name: 'MegaETH Testnet',
    rpcUrl: 'https://carrot.megaeth.com/rpc',
    wsUrl: 'wss://carrot.megaeth.com/ws',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0', // Updater contract
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 6342,
    sendMethod: 'realtime_sendRawTransaction', // Специальный метод для MegaETH
  },
  31337: { // Foundry Local
    name: 'Foundry Local',
    rpcUrl: 'http://127.0.0.1:8545',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 31337,
    sendMethod: 'eth_sendRawTransaction',
  },
  50311: { // Somnia Testnet
    name: 'Somnia Testnet',
    rpcUrl: 'https://testnet.somnia.network',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 50311,
    sendMethod: 'eth_sendRawTransaction',
  },
  1313161556: { // RISE Testnet
    name: 'RISE Testnet',
    rpcUrl: 'https://testnet-rpc.rise.com',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 1313161556,
    sendMethod: 'eth_sendRawTransactionSync', // Синхронный метод для RISE
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

export const useBlockchainUtils = () => {
  const { authenticated, user, login, logout, isReady, signTransaction } = usePrivy();
  const { wallets } = useWallets();
  
  // Состояние
  const [isInitializing, setIsInitializing] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);
  const [balance, setBalance] = useState('0');
  const [contractNumber, setContractNumber] = useState(0);

  // Кэши и пулы
  const clientCache = useRef({});
  const gasParams = useRef({});
  const preSignedPool = useRef({});
  const isInitialized = useRef({});

  // Кеширование параметров сети для минимизации RPC вызовов
  const chainParamsCache = useRef({});

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

  // Получение embedded wallet
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

  // Создание клиентов с кэшированием
  const createClients = async (chainId) => {
    const cacheKey = `${chainId}`;
    if (clientCache.current[cacheKey]) {
      return clientCache.current[cacheKey];
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) throw new Error(`Unsupported network: ${chainId}`);

    const embeddedWallet = getEmbeddedWallet();
    if (!embeddedWallet) throw new Error('No embedded wallet found');

    try {
      // Создаем публичный клиент с более надежной конфигурацией
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
            default: { http: [config.rpcUrl] },
            public: { http: [config.rpcUrl] }
          }
        },
        transport: http(config.rpcUrl, {
          timeout: 10000,
          retryCount: 2
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
                // Локальное подписание через Privy
                const tx = params[0];
                return await signTransaction(tx);
              }
              // Остальные методы идут через публичный RPC
              return await publicClient.request({ method, params });
            }
          })
        });
      } else {
        // Для других сетей используем стандартный подход
        walletClient = createWalletClient({
          account: embeddedWallet.address,
          chain: publicClient.chain,
          transport: http(config.rpcUrl)
        });
      }

      const clients = { publicClient, walletClient, config };
      clientCache.current[cacheKey] = clients;

      console.log(`Created clients for chain ${chainId}:`, {
        publicRPC: config.rpcUrl,
        signingMethod: chainId === 6342 ? 'Local Privy' : 'RPC'
      });

      return clients;
    } catch (error) {
      console.error(`Error creating clients for chain ${chainId}:`, error);
      throw error;
    }
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
        retryWithBackoff(() => publicClient.getChainId(), 2, 500),
        retryWithBackoff(() => publicClient.getBlockNumber(), 2, 500)
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

  // Предварительное подписание пакета транзакций
  const preSignBatch = async (chainId, startNonce, count) => {
    const chainKey = chainId.toString();
    
    // Проверяем fallback режим
    const fallbackConfig = getFallbackConfig(chainId);
    
    // Уменьшенные размеры пакетов для разных сетей
    let batchSize = chainId === 6342 ? 3 : (chainId === 1234 ? 5 : count);
    
    // Применяем fallback конфигурацию если активна
    if (fallbackConfig) {
      batchSize = fallbackConfig.reducedBatchSize;
      console.log(`Using fallback mode for chain ${chainId}: batch size ${batchSize}`);
    }
    
    const actualCount = Math.min(count, batchSize);
    
    console.log(`Pre-signing ${actualCount} transactions for chain ${chainId} starting from nonce ${startNonce}`);
    
    if (!preSignedPool.current[chainKey]) {
      preSignedPool.current[chainKey] = {
        transactions: [],
        currentIndex: 0,
        baseNonce: startNonce,
        hasTriggeredRefill: false
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
        const delay = fallbackConfig ? fallbackConfig.increasedDelay : (chainId === 6342 ? 200 : 0);
        if (delay > 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const nonce = startNonce + pool.transactions.length;
        
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
              return await signTransaction(txData);
            },
            fallbackConfig ? 1 : 2, // Меньше retry в fallback режиме
            500
          );
        } else {
          // Другие сети: используем walletClient
          console.log(`Signing transaction ${i + 1} via RPC for chain ${chainId}`);
          signedTx = await retryWithBackoff(
            () => walletClient.signTransaction(txData),
            fallbackConfig ? 1 : 3,
            500
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

  // Умное пополнение пула
  const extendPool = async (chainId, startNonce, count) => {
    try {
      console.log(`Extending pool for chain ${chainId} from nonce ${startNonce} with ${count} transactions`);
      
      // Используем существующую функцию preSignBatch для пополнения
      await preSignBatch(chainId, startNonce, count);
      
      const chainKey = chainId.toString();
      const pool = preSignedPool.current[chainKey];
      if (pool) {
        pool.hasTriggeredRefill = false; // Сбрасываем флаг для следующего пополнения
        console.log(`Pool extended successfully. Total transactions: ${pool.transactions.length}`);
      }
    } catch (error) {
      console.error('Error extending transaction pool:', error);
      // Не бросаем ошибку, просто логируем - игра может продолжаться в realtime режиме
    }
  };

  // Получение следующей транзакции из пула или создание новой
  const getNextTransaction = async (chainId) => {
    const chainKey = chainId.toString();
    const pool = preSignedPool.current[chainKey];

    // Если есть предподписанные транзакции, используем их
    if (pool && pool.transactions.length > pool.currentIndex) {
      const tx = pool.transactions[pool.currentIndex];
      pool.currentIndex++;

      // Автодозаправка пула при 50% использовании
      if (pool.currentIndex >= pool.transactions.length / 2 && !pool.hasTriggeredRefill) {
        pool.hasTriggeredRefill = true;
        console.log('Pool half empty, extending with new transactions...');
        try {
          const nextNonce = pool.baseNonce + pool.transactions.length;
          await extendPool(chainId, nextNonce, 3); // Небольшой batch для дозаправки
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

  // Создание и подписание транзакции в реальном времени
  const createRealtimeTransaction = async (chainId) => {
    try {
      const { publicClient } = await createClients(chainId);
      const config = NETWORK_CONFIGS[chainId];
      const embeddedWallet = getEmbeddedWallet();
      const gasParams = await getGasParams(chainId);

      if (!embeddedWallet) {
        throw new Error('No embedded wallet available for realtime signing');
      }

      // Получаем текущий nonce
      const nonce = await publicClient.getTransactionCount({
        address: embeddedWallet.address,
        blockTag: 'pending'
      });

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
      if (chainId === 6342) {
        // MegaETH: локальное подписание
        return await signTransaction(txData);
      } else {
        // Другие сети: через walletClient
        const { walletClient } = await createClients(chainId);
        return await walletClient.signTransaction(txData);
      }
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

  // Отправка транзакции
  const sendRawTransaction = async (chainId, signedTx) => {
    const config = NETWORK_CONFIGS[chainId];
    
    try {
      let response;
      let txHash;
      
      if (config.sendMethod === 'realtime_sendRawTransaction') {
        // MegaETH реалтайм метод - специальная обработка с retry
        console.log('Using MegaETH realtime_sendRawTransaction...');
        
        const sendTransaction = async () => {
          const response = await fetch(config.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'realtime_sendRawTransaction',
              params: [signedTx],
              id: Date.now()
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          return await response.json();
        };

        response = await retryWithBackoff(sendTransaction, 3, 1000);
        
        if (response.error) {
          throw new Error(`RPC Error: ${response.error.message}`);
        }
        
        txHash = response.result;
        console.log('MegaETH transaction hash:', txHash);
        
        // For MegaETH, the realtime method returns receipt immediately
        return { hash: txHash, receipt: response.result };
        
      } else if (config.sendMethod === 'eth_sendRawTransactionSync') {
        // RISE синхронный метод
        response = await fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_sendRawTransactionSync',
            params: [signedTx],
            id: Date.now()
          })
        });

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || 'RISE transaction failed');
        }

        return { hash: result.result, receipt: result.result };
        
      } else {
        // Стандартная отправка
        response = await fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_sendRawTransaction',
            params: [signedTx],
            id: Date.now()
          })
        });

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || 'Transaction failed');
        }

        return { hash: result.result };
      }
    } catch (error) {
      console.error('Send transaction error:', error);
      throw error;
    }
  };

  // Основной метод отправки обновления
  const sendUpdate = async (chainId) => {
    if (transactionPending) {
      throw new Error('Transaction already pending');
    }

    try {
      setTransactionPending(true);
      
      // Получаем предподписанную транзакцию
      const signedTx = await getNextTransaction(chainId);
      
      console.log('Sending on-chain jump transaction...');
      
      // Отправляем транзакцию
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
        // Стандартные сети: ждём подтверждения
        console.log('Waiting for transaction confirmation...');
        const { publicClient } = await createClients(chainId);
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txResult.hash,
          timeout: 30000 // 30 seconds timeout
        });
        console.log('Transaction confirmed:', receipt);
        finalResult = receipt;
      }

      console.log('Jump transaction confirmed:', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error('Error sending update:', error);
      throw error;
    } finally {
      setTransactionPending(false);
    }
  };

  // Инициализация данных
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

      // Проверяем баланс и получаем nonce одновременно
      const [currentBalance, currentNonce] = await Promise.all([
        checkBalance(chainId),
        retryWithBackoff(async () => {
          const { publicClient } = await createClients(chainId);
          return await publicClient.getTransactionCount({
            address: embeddedWallet.address,
            blockTag: 'pending'
          });
        }, 2, 500)
      ]);

      console.log('Current balance:', currentBalance);
      console.log('Starting nonce:', currentNonce);

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
        } catch (faucetError) {
          console.error('Faucet failed, but continuing with initialization:', faucetError);
          // Don't throw - continue with initialization even if faucet fails
          // Users can manually add funds or try faucet later
        }
      }

      // Предподписание пакета транзакций
      const fallbackConfig = getFallbackConfig(chainId);
      let batchSize = chainId === 6342 ? 3 : (chainId === 1234 ? 5 : 10);
      
      if (fallbackConfig) {
        batchSize = fallbackConfig.reducedBatchSize;
        console.log(`Using fallback batch size: ${batchSize}`);
      }
      
      console.log(`Pre-signing ${batchSize} transactions starting from nonce ${currentNonce}`);
      
      try {
        await preSignBatch(chainId, currentNonce, batchSize);
        
        // Проверяем, есть ли хотя бы одна подписанная транзакция
        const pool = preSignedPool.current[chainKey];
        if (!pool || pool.transactions.length === 0) {
          console.warn('No transactions were pre-signed, but continuing with manual signing mode');
          // Не бросаем ошибку, продолжаем работу в режиме ручного подписания
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

  // Retry функция с exponential backoff
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        const isLastRetry = i === maxRetries - 1;
        const isRetryableError = 
          error.status === 429 || // Too Many Requests
          error.status === 403 || // Forbidden (может быть временно)
          error.status === 500 || // Internal Server Error
          error.status === 502 || // Bad Gateway
          error.status === 503 || // Service Unavailable
          error.message?.includes('rate limit') ||
          error.message?.includes('timeout');

        if (isLastRetry || !isRetryableError) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, i); // Exponential backoff
        console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms delay due to:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
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
    isReady: authenticated && wallets.length > 0
  };
};