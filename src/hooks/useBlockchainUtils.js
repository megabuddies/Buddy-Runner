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
    });

    // Создаем клиент кошелька
    const walletClient = createWalletClient({
      account: embeddedWallet.address,
      transport: custom(embeddedWallet.getEthereumProvider()),
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
    
    const gasPrice = await publicClient.getGasPrice();
    const maxFeePerGas = gasPrice * 2n; // 2x для запаса
    const maxPriorityFeePerGas = parseGwei('2'); // 2 gwei

    const params = { maxFeePerGas, maxPriorityFeePerGas };
    gasParams.current[chainId] = params;
    return params;
  };

  // Предварительная подпись пакета транзакций
  const preSignBatch = async (chainId, startNonce, batchSize = 15) => {
    try {
      console.log(`Pre-signing ${batchSize} transactions for chain ${chainId} starting from nonce ${startNonce}`);
      
      const { walletClient, config } = await createClients(chainId);
      const gas = await getGasParams(chainId);
      const embeddedWallet = getEmbeddedWallet();

      if (!embeddedWallet) {
        throw new Error('No embedded wallet found');
      }

      console.log('Available wallets:', wallets.length);
      console.log('Found embedded wallet:', embeddedWallet.address);

      // Вычисляем газовые параметры
      const gasParams = await getGasParams(chainId);
      const maxFeePerGasGwei = Number(gasParams.maxFeePerGas) / 1e9;
      const maxPriorityFeePerGasGwei = Number(gasParams.maxPriorityFeePerGas) / 1e9;
      
      console.log('Using gas parameters:', {
        maxFeePerGasGwei,
        maxPriorityFeePerGasGwei
      });

      const signingPromises = Array.from({ length: batchSize }, async (_, i) => {
        console.log(`Signing transaction ${i + 1} locally for MegaETH`);
        
        console.log('Available wallets:', wallets.length);
        console.log('Found embedded wallet:', embeddedWallet.address);
        
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

        const signedTx = await walletClient.signTransaction(txData);
        console.log(`Signed transaction ${i + 1}/${batchSize}`);
        return signedTx;
      });

      const results = await Promise.all(signingPromises);
      
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
      throw error;
    }
  };

  // Умное пополнение пула
  const extendPool = async (chainId, nextNonce, batchSize = 10) => {
    try {
      console.log(`Extending pool for chain ${chainId} from nonce ${nextNonce} with ${batchSize} transactions`);
      
      const { walletClient, config } = await createClients(chainId);
      const gas = await getGasParams(chainId);
      const embeddedWallet = getEmbeddedWallet();

      // Вычисляем газовые параметры
      const gasParams = await getGasParams(chainId);
      const maxFeePerGasGwei = Number(gasParams.maxFeePerGas) / 1e9;
      const maxPriorityFeePerGasGwei = Number(gasParams.maxPriorityFeePerGas) / 1e9;
      
      console.log('Using gas parameters:', {
        maxFeePerGasGwei,
        maxPriorityFeePerGasGwei
      });

      const newTransactions = await Promise.all(
        Array.from({ length: batchSize }, async (_, i) => {
          console.log(`Signing transaction ${i + 1} locally for MegaETH`);
          
          console.log('Available wallets:', wallets.length);
          console.log('Found embedded wallet:', embeddedWallet.address);
          
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

          const signedTx = await walletClient.signTransaction(txData);
          console.log(`Signed transaction ${i + 1 + (preSignedPool.current[chainId.toString()]?.transactions.length || 0)}/${batchSize}`);
          return signedTx;
        })
      );

      const chainKey = chainId.toString();
      const pool = preSignedPool.current[chainKey];
      if (pool) {
        pool.transactions.push(...newTransactions);
        pool.hasTriggeredRefill = false; // Сбрасываем флаг
      }

      console.log(`Successfully pre-signed ${pool ? pool.transactions.length : newTransactions.length} transactions`);
      console.log(`Pool extended successfully. Total transactions: ${pool ? pool.transactions.length : newTransactions.length}`);
    } catch (error) {
      console.error('Error extending pool:', error);
    }
  };

  // Восстановление пула при ошибках nonce
  const recoverPool = async (chainId) => {
    try {
      console.log(`Recovering transaction pool for chain ${chainId} due to nonce error`);
      
      const chainKey = chainId.toString();
      const embeddedWallet = getEmbeddedWallet();
      
      if (!embeddedWallet) {
        throw new Error('No embedded wallet found');
      }

      // Получаем актуальный nonce из сети
      const { publicClient } = await createClients(chainId);
      const currentNonce = await publicClient.getTransactionCount({
        address: embeddedWallet.address
      });

      console.log(`Recovered nonce: ${currentNonce}`);

      // Очищаем старый пул
      delete preSignedPool.current[chainKey];

      // Создаем новый пул с актуальным nonce
      await preSignBatch(chainId, currentNonce, 15);
      
      console.log(`Pool recovered successfully for chain ${chainId}`);
      return true;
    } catch (error) {
      console.error('Error recovering pool:', error);
      return false;
    }
  };

  // Получение следующей транзакции из пула
  const getNextTransaction = (chainId) => {
    const chainKey = chainId.toString();
    const pool = preSignedPool.current[chainKey];
    
    if (!pool || pool.currentIndex >= pool.transactions.length) {
      console.log('Pool half empty, extending with new transactions...');
      throw new Error('No pre-signed transactions available');
    }

    const tx = pool.transactions[pool.currentIndex];
    pool.currentIndex++;

    // Пополнение при использовании 5 транзакций (30% от 15)
    const triggerRefillAt = 5;
    if (pool.currentIndex === triggerRefillAt && !pool.hasTriggeredRefill) {
      console.log('Pool half empty, extending with new transactions...');
      console.log(`Extending pool for chain ${chainId} from nonce ${pool.baseNonce + pool.transactions.length} with 10 transactions`);
      pool.hasTriggeredRefill = true;
      const nextNonce = pool.baseNonce + pool.transactions.length;
      
      // Асинхронно подписываем ещё 10 транзакций
      extendPool(chainId, nextNonce, 10).catch(console.error);
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

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Faucet request failed');
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
        // Специальная обработка ошибок nonce
        if (result.error.message && result.error.message.includes('nonce too low')) {
          throw new Error(`RPC Error: nonce too low`);
        }
        throw new Error(result.error.message || 'Transaction failed');
      }

      return result.result; // Transaction hash
    } catch (error) {
      console.error('Send transaction error:', error);
      
      // Переброс ошибки с сохранением типа
      if (error.message.includes('nonce too low')) {
        throw new Error(`RPC Error: nonce too low`);
      }
      
      throw error;
    }
  };

  // Основной метод отправки обновления
  const sendUpdate = async (chainId, retryCount = 0) => {
    if (transactionPending) {
      console.log('Transaction already pending, blocking jump');
      throw new Error('Transaction already pending');
    }

    let shouldResetPending = true;

    try {
      setTransactionPending(true);
      console.log('Sending on-chain jump transaction...');
      
      // Получаем предподписанную транзакцию
      const signedTx = getNextTransaction(chainId);
      
      // Отправляем транзакцию
      const config = NETWORK_CONFIGS[chainId];
      if (config.sendMethod === 'realtime_sendRawTransaction') {
        console.log('Using MegaETH realtime_sendRawTransaction...');
      }
      
      const txHash = await sendRawTransaction(chainId, signedTx);
      console.log('MegaETH transaction hash:', txHash);
      console.log('Transaction sent:', { hash: txHash, receipt: txHash });

      // Для некоторых сетей ждём подтверждения
      if (config.sendMethod === 'eth_sendRawTransaction') {
        // Ждём подтверждения для стандартных сетей
        const { publicClient } = await createClients(chainId);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log('Transaction confirmed:', { hash: txHash, receipt });
        return { hash: txHash, receipt };
      }

      console.log('Transaction confirmed:', { hash: txHash, receipt: txHash });
      console.log('Jump transaction confirmed:', txHash);
      return { hash: txHash, receipt: txHash };
    } catch (error) {
      console.error('Send transaction error:', error);
      
      // Специальная обработка ошибок nonce с восстановлением
      if (error.message && error.message.includes('nonce too low') && retryCount === 0) {
        console.error('Error sending update:', error);
        console.error('Error sending on-chain movement:', error);
        console.error('Blockchain transaction error: Transaction nonce error. Attempting recovery...');
        
        shouldResetPending = false; // Не сбрасываем состояние, так как будем делать retry
        setTransactionPending(false); // Освобождаем блокировку для восстановления
        
        // Пытаемся восстановить пул
        const recovered = await recoverPool(chainId);
        
        if (recovered) {
          console.log('Pool recovered, retrying transaction...');
          return await sendUpdate(chainId, 1); // Повторяем с флагом retry
        } else {
          shouldResetPending = true; // Сбрасываем состояние при неудаче
          throw new Error('Transaction nonce error. Pool recovery failed.');
        }
      }
      
      if (error.message && error.message.includes('nonce too low')) {
        console.error('Error sending update:', error);
        console.error('Error sending on-chain movement:', error);
        console.error('Blockchain transaction error: Transaction nonce error. Please try again.');
        throw new Error('Transaction nonce error. Please try again.');
      }
      
      console.error('Error sending update:', error);
      console.error('Error sending on-chain movement:', error);
      throw error;
    } finally {
      if (shouldResetPending) {
        setTransactionPending(false);
      }
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

      const embeddedWallet = getEmbeddedWallet();
      if (!embeddedWallet) {
        throw new Error('No embedded wallet available');
      }

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
      const currentNonce = await publicClient.getTransactionCount({
        address: embeddedWallet.address
      });

      console.log('Starting nonce:', currentNonce);

      // Предварительно подписываем пакет транзакций
      await preSignBatch(chainId, currentNonce, 15); // Начинаем с 15 транзакций

      // Кешируем параметры цепи
      const chainParams = {
        chainId: chainId,
        blockNumber: await publicClient.getBlockNumber()
      };
      console.log(`Cached chain params for ${chainId}:`, chainParams);

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
    recoverPool,
    
    // Утилиты
    getEmbeddedWallet,
    isAuthenticated: authenticated,
    isReady: authenticated && wallets.length > 0
  };
};