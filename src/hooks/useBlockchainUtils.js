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
  },
  84532: { // Base Sepolia
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 84532,
    sendMethod: 'eth_sendRawTransaction',
  },
  10143: { // Monad Testnet
    name: 'Monad Testnet',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 10143,
    sendMethod: 'eth_sendRawTransaction',
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
  const { authenticated } = usePrivy();
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

  // Получение embedded wallet
  const getEmbeddedWallet = () => {
    if (!authenticated || !wallets.length) return null;
    return wallets.find(wallet => wallet.walletClientType === 'privy');
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

    // Создаем публичный клиент
    const publicClient = createPublicClient({
      transport: http(config.rpcUrl),
      chain: {
        id: chainId,
        name: config.name,
        network: config.name.toLowerCase().replace(/\s+/g, '-'),
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [config.rpcUrl],
          },
        },
      },
    });

    // Создаем клиент кошелька 
    const ethereumProvider = await embeddedWallet.getEthereumProvider();
    const walletClient = createWalletClient({
      account: embeddedWallet.address,
      transport: custom(ethereumProvider),
      chain: {
        id: chainId,
        name: config.name,
        network: config.name.toLowerCase().replace(/\s+/g, '-'),
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [config.rpcUrl],
          },
        },
      },
    });

    const clients = { publicClient, walletClient, config };
    clientCache.current[cacheKey] = clients;
    return clients;
  };

  // Получение газовых параметров
  const getGasParams = async (chainId) => {
    if (gasParams.current[chainId]) {
      return gasParams.current[chainId];
    }

    const { publicClient } = await createClients(chainId);
    
    try {
      // Try to get EIP-1559 fee data first
      const feeData = await publicClient.estimateFeesPerGas();
      
      let maxFeePerGas, maxPriorityFeePerGas;
      
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 network
        maxFeePerGas = feeData.maxFeePerGas * 120n / 100n; // 20% buffer
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        
        // Ensure priority fee doesn't exceed max fee
        if (maxPriorityFeePerGas > maxFeePerGas) {
          maxPriorityFeePerGas = maxFeePerGas / 2n; // Use half of max fee as priority
        }
      } else {
        // Legacy network - fallback to gas price
        const gasPrice = await publicClient.getGasPrice();
        maxFeePerGas = gasPrice * 120n / 100n; // 20% buffer
        maxPriorityFeePerGas = gasPrice / 10n; // 10% of gas price as tip
        
        // Ensure minimum values
        if (maxPriorityFeePerGas < parseGwei('0.1')) {
          maxPriorityFeePerGas = parseGwei('0.1'); // Minimum 0.1 gwei
        }
        
        // Ensure priority fee doesn't exceed max fee
        if (maxPriorityFeePerGas > maxFeePerGas) {
          maxPriorityFeePerGas = maxFeePerGas / 2n;
        }
      }

      console.log(`Gas params for chain ${chainId}:`, {
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
        maxFeePerGasGwei: Number(maxFeePerGas) / 1e9,
        maxPriorityFeePerGasGwei: Number(maxPriorityFeePerGas) / 1e9
      });

      const params = { maxFeePerGas, maxPriorityFeePerGas };
      gasParams.current[chainId] = params;
      return params;
    } catch (error) {
      console.error('Error getting gas params:', error);
      // Fallback to simple values
      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = gasPrice * 2n;
      const maxPriorityFeePerGas = gasPrice / 10n;
      
      const params = { maxFeePerGas, maxPriorityFeePerGas };
      gasParams.current[chainId] = params;
      return params;
    }
  };

  // Предварительная подпись пакета транзакций с защитой от rate limiting
  const preSignBatch = async (chainId, startNonce, batchSize = 5) => {
    try {
      console.log(`Pre-signing ${batchSize} transactions starting from nonce ${startNonce}`);
      
      const { walletClient, config } = await createClients(chainId);
      const gas = await getGasParams(chainId);
      const embeddedWallet = getEmbeddedWallet();

      console.log('Using gas parameters:', {
        maxFeePerGasGwei: Number(gas.maxFeePerGas) / 1e9,
        maxPriorityFeePerGasGwei: Number(gas.maxPriorityFeePerGas) / 1e9
      });

      // Sign transactions sequentially to avoid rate limiting
      const results = [];
      for (let i = 0; i < batchSize; i++) {
        const txData = {
          account: embeddedWallet.address,
          to: config.contractAddress,
          data: '0xa2e62045', // update() function selector
          nonce: startNonce + i,
          maxFeePerGas: gas.maxFeePerGas,
          maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
          value: 0n,
          type: 'eip1559',
          gas: 100000n,
        };

        // Validate gas values before signing
        if (gas.maxPriorityFeePerGas > gas.maxFeePerGas) {
          console.warn(`Invalid gas params: priority fee (${gas.maxPriorityFeePerGas}) > max fee (${gas.maxFeePerGas})`);
          txData.maxPriorityFeePerGas = gas.maxFeePerGas / 2n;
        }

        try {
          const signedTx = await walletClient.signTransaction(txData);
          results.push(signedTx);
          console.log(`Signed transaction ${i + 1}/${batchSize}`);
          
          // Add delay between signings to avoid rate limiting
          if (i < batchSize - 1) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
          }
        } catch (signError) {
          console.error(`Error signing transaction ${i + 1}:`, signError);
          
          // If we hit rate limits, wait longer and retry
          if (signError.message.includes('Too many requests') || signError.message.includes('429')) {
            console.log('Rate limited, waiting 3 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Retry this transaction
            try {
              const signedTx = await walletClient.signTransaction(txData);
              results.push(signedTx);
              console.log(`Signed transaction ${i + 1}/${batchSize} (after retry)`);
            } catch (retryError) {
              console.error(`Failed to sign transaction ${i + 1} after retry:`, retryError);
              throw retryError;
            }
          } else {
            throw signError;
          }
        }
      }
      
      const chainKey = chainId.toString();
      preSignedPool.current[chainKey] = {
        transactions: results,
        currentIndex: 0,
        baseNonce: startNonce,
        hasTriggeredRefill: false
      };

      console.log(`Successfully pre-signed ${results.length} transactions`);
      return results;
    } catch (error) {
      console.error('Error pre-signing transactions:', error);
      
      // If gas estimation failed, try with legacy transaction
      if (error.message.includes('TipAboveFeeCapError') || error.message.includes('maxPriorityFeePerGas')) {
        console.log('Retrying with legacy transaction type...');
        try {
          return await preSignBatchLegacy(chainId, startNonce, Math.min(batchSize, 3)); // Smaller batch for legacy
        } catch (legacyError) {
          console.error('Legacy transaction also failed:', legacyError);
        }
      }
      
      throw error;
    }
  };

  // Fallback function for legacy (type 0) transactions with rate limiting protection
  const preSignBatchLegacy = async (chainId, startNonce, batchSize = 3) => {
    const { walletClient, config } = await createClients(chainId);
    const { publicClient } = await createClients(chainId);
    const embeddedWallet = getEmbeddedWallet();

    // Get simple gas price for legacy transactions
    const gasPrice = await publicClient.getGasPrice();
    const adjustedGasPrice = gasPrice * 120n / 100n; // 20% buffer

    console.log(`Using legacy transactions with gas price: ${Number(adjustedGasPrice) / 1e9} gwei`);

    // Sign transactions sequentially to avoid rate limiting
    const results = [];
    for (let i = 0; i < batchSize; i++) {
      const txData = {
        account: embeddedWallet.address,
        to: config.contractAddress,
        data: '0xa2e62045',
        nonce: startNonce + i,
        gasPrice: adjustedGasPrice,
        value: 0n,
        type: 'legacy',
        gas: 100000n,
      };

      try {
        const signedTx = await walletClient.signTransaction(txData);
        results.push(signedTx);
        console.log(`Signed legacy transaction ${i + 1}/${batchSize}`);
        
        // Add delay between signings
        if (i < batchSize - 1) {
          await new Promise(resolve => setTimeout(resolve, 800)); // Longer delay for legacy
        }
      } catch (signError) {
        console.error(`Error signing legacy transaction ${i + 1}:`, signError);
        
        if (signError.message.includes('Too many requests') || signError.message.includes('429')) {
          console.log('Rate limited on legacy transaction, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            const signedTx = await walletClient.signTransaction(txData);
            results.push(signedTx);
            console.log(`Signed legacy transaction ${i + 1}/${batchSize} (after retry)`);
          } catch (retryError) {
            console.error(`Failed to sign legacy transaction ${i + 1} after retry:`, retryError);
            throw retryError;
          }
        } else {
          throw signError;
        }
      }
    }
    
    const chainKey = chainId.toString();
    preSignedPool.current[chainKey] = {
      transactions: results,
      currentIndex: 0,
      baseNonce: startNonce,
      hasTriggeredRefill: false
    };

    console.log(`Successfully pre-signed ${results.length} legacy transactions`);
    return results;
  };

  // Умное пополнение пула с защитой от rate limiting
  const extendPool = async (chainId, nextNonce, batchSize = 3) => {
    try {
      console.log(`Extending pool with ${batchSize} more transactions from nonce ${nextNonce}`);
      
      const chainKey = chainId.toString();
      const pool = preSignedPool.current[chainKey];
      
      // Check if we need legacy transactions by looking at the existing pool
      const useEIP1559 = pool && pool.transactions.length > 0 && 
                         pool.transactions[0].includes('"type":"0x2"'); // EIP-1559 indicator
      
      let newTransactions = [];
      
      if (useEIP1559) {
        const { walletClient, config } = await createClients(chainId);
        const gas = await getGasParams(chainId);
        const embeddedWallet = getEmbeddedWallet();

        // Sign sequentially to avoid rate limits
        for (let i = 0; i < batchSize; i++) {
          const txData = {
            account: embeddedWallet.address,
            to: config.contractAddress,
            data: '0xa2e62045',
            nonce: nextNonce + i,
            maxFeePerGas: gas.maxFeePerGas,
            maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
            value: 0n,
            type: 'eip1559',
            gas: 100000n,
          };

          // Validate gas values
          if (gas.maxPriorityFeePerGas > gas.maxFeePerGas) {
            txData.maxPriorityFeePerGas = gas.maxFeePerGas / 2n;
          }

          try {
            const signedTx = await walletClient.signTransaction(txData);
            newTransactions.push(signedTx);
            
            // Delay between signings
            if (i < batchSize - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }
          } catch (signError) {
            console.error(`Error extending pool (EIP1559) transaction ${i + 1}:`, signError);
            if (signError.message.includes('Too many requests')) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue; // Skip this transaction
            }
            break; // Stop trying if other error
          }
        }
      } else {
        // Use legacy transactions
        const { walletClient, config, publicClient } = await createClients(chainId);
        const embeddedWallet = getEmbeddedWallet();
        const gasPrice = await publicClient.getGasPrice();
        const adjustedGasPrice = gasPrice * 120n / 100n;

        // Sign sequentially to avoid rate limits
        for (let i = 0; i < batchSize; i++) {
          const txData = {
            account: embeddedWallet.address,
            to: config.contractAddress,
            data: '0xa2e62045',
            nonce: nextNonce + i,
            gasPrice: adjustedGasPrice,
            value: 0n,
            type: 'legacy',
            gas: 100000n,
          };

          try {
            const signedTx = await walletClient.signTransaction(txData);
            newTransactions.push(signedTx);
            
            // Delay between signings
            if (i < batchSize - 1) {
              await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay for legacy
            }
          } catch (signError) {
            console.error(`Error extending pool (legacy) transaction ${i + 1}:`, signError);
            if (signError.message.includes('Too many requests')) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue; // Skip this transaction
            }
            break; // Stop trying if other error
          }
        }
      }

      if (pool && newTransactions.length > 0) {
        pool.transactions.push(...newTransactions);
        pool.hasTriggeredRefill = false; // Сбрасываем флаг
        console.log(`Pool extended with ${newTransactions.length} transactions`);
      } else {
        console.log('No new transactions added to pool');
      }
    } catch (error) {
      console.error('Error extending pool:', error);
    }
  };

  // Получение следующей транзакции из пула
  const getNextTransaction = (chainId) => {
    const chainKey = chainId.toString();
    const pool = preSignedPool.current[chainKey];
    
    if (!pool || pool.currentIndex >= pool.transactions.length) {
      throw new Error('No pre-signed transactions available');
    }

    const tx = pool.transactions[pool.currentIndex];
    pool.currentIndex++;

    // Пополнение каждые 2 транзакции для поддержания пула
    if (pool.currentIndex % 2 === 0 && !pool.hasTriggeredRefill && pool.transactions.length < 10) {
      pool.hasTriggeredRefill = true;
      const nextNonce = pool.baseNonce + pool.transactions.length;
      
      // Асинхронно подписываем ещё 3 транзакции
      extendPool(chainId, nextNonce, 3).catch(console.error);
    }

    return tx;
  };

  // Проверка баланса
  const checkBalance = async (chainId) => {
    try {
      const { publicClient } = await createClients(chainId);
      const embeddedWallet = getEmbeddedWallet();
      
      if (!embeddedWallet) return '0';
      
      const balance = await publicClient.getBalance({
        address: embeddedWallet.address
      });
      
      const balanceEth = (Number(balance) / 10**18).toFixed(4);
      setBalance(balanceEth);
      return balanceEth;
    } catch (error) {
      console.error('Error checking balance:', error);
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

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        console.error(`Faucet API error: ${response.status} ${response.statusText}`);
        
        // Try to get error text, fallback to status if JSON parsing fails
        let errorMessage;
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse success response as JSON:', jsonError);
        throw new Error('Invalid response from faucet API');
      }

      console.log('Faucet success:', result);
      return result;
    } catch (error) {
      console.error('Faucet error:', error);
      throw error;
    }
  };

  // Отправка транзакции
  const sendRawTransaction = async (chainId, signedTx) => {
    const config = NETWORK_CONFIGS[chainId];
    
    try {
      let response;
      
      if (config.sendMethod === 'realtime_sendRawTransaction') {
        // MegaETH реалтайм метод
        response = await fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'realtime_sendRawTransaction',
            params: [signedTx],
            id: Date.now()
          })
        });
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
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Transaction failed');
      }

      return result.result; // Transaction hash
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
      const signedTx = getNextTransaction(chainId);
      
      // Отправляем транзакцию
      const txHash = await sendRawTransaction(chainId, signedTx);
      console.log('Transaction sent:', txHash);

      // Для некоторых сетей ждём подтверждения
      const config = NETWORK_CONFIGS[chainId];
      if (config.sendMethod === 'eth_sendRawTransaction') {
        // Ждём подтверждения для стандартных сетей
        const { publicClient } = await createClients(chainId);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      console.log('Transaction confirmed:', txHash);
      return txHash;
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

      // Check if we have a supported network
      const config = NETWORK_CONFIGS[chainId];
      if (!config) {
        throw new Error(`Unsupported network: ${chainId}`);
      }

      const embeddedWallet = getEmbeddedWallet();
      if (!embeddedWallet) {
        throw new Error('No embedded wallet available');
      }

      console.log('Using embedded wallet address:', embeddedWallet.address);
      console.log('Network configuration:', config.name);

      // Проверяем баланс
      const currentBalance = await checkBalance(chainId);
      console.log('Current balance:', currentBalance);

      // Если баланс равен 0, вызываем faucet
      if (parseFloat(currentBalance) === 0) {
        console.log('Balance is 0, calling faucet...');
        await callFaucet(embeddedWallet.address, chainId);
        
        // Ждём немного и проверяем баланс снова
        await new Promise(resolve => setTimeout(resolve, 5000));
        await checkBalance(chainId);
      }

      // Получаем текущий nonce
      const { publicClient } = await createClients(chainId);
      const nonce = await publicClient.getTransactionCount({
        address: embeddedWallet.address
      });

      console.log('Starting nonce:', nonce);

      // Предварительно подписываем пакет транзакций (начинаем с меньшего количества)
      await preSignBatch(chainId, nonce, 5); // Начинаем с 5 транзакций

      isInitialized.current[chainKey] = true;
      console.log('Initialization complete for chain:', chainId);
      
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