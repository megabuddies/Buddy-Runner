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

  // Предварительная подпись пакета транзакций
  const preSignBatch = async (chainId, startNonce, batchSize = 10) => {
    try {
      console.log(`Pre-signing ${batchSize} transactions starting from nonce ${startNonce}`);
      
      const { walletClient, config } = await createClients(chainId);
      const gas = await getGasParams(chainId);
      const embeddedWallet = getEmbeddedWallet();

      const signingPromises = Array.from({ length: batchSize }, async (_, i) => {
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

        return await walletClient.signTransaction(txData);
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
      console.log(`Extending pool with ${batchSize} more transactions from nonce ${nextNonce}`);
      
      const { walletClient, config } = await createClients(chainId);
      const gas = await getGasParams(chainId);
      const embeddedWallet = getEmbeddedWallet();

      const newTransactions = await Promise.all(
        Array.from({ length: batchSize }, async (_, i) => {
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

          return await walletClient.signTransaction(txData);
        })
      );

      const chainKey = chainId.toString();
      const pool = preSignedPool.current[chainKey];
      if (pool) {
        pool.transactions.push(...newTransactions);
        pool.hasTriggeredRefill = false; // Сбрасываем флаг
      }

      console.log(`Pool extended with ${newTransactions.length} transactions`);
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

    // Пополнение каждые 5 транзакций (50% от начального пакета)
    if (pool.currentIndex % 5 === 0 && !pool.hasTriggeredRefill) {
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
      let txHash;
      
      if (config.sendMethod === 'realtime_sendRawTransaction') {
        // MegaETH реалтайм метод - специальная обработка
        console.log('Using MegaETH realtime_sendRawTransaction...');
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

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || 'MegaETH transaction failed');
        }

        txHash = result.result;
        console.log('MegaETH transaction sent with hash:', txHash);
        
        // For MegaETH, the realtime method returns receipt immediately
        return { hash: txHash, receipt: result.result };
        
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
      const signedTx = getNextTransaction(chainId);
      
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
      const nonce = await publicClient.getTransactionCount({
        address: embeddedWallet.address
      });

      console.log('Starting nonce:', nonce);

      // Предварительно подписываем пакет транзакций
      await preSignBatch(chainId, nonce, 20); // Начинаем с 20 транзакций

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