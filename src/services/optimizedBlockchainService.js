import { createWalletClient, createPublicClient, http, custom, publicActions } from 'viem';
import { mainnet, sepolia, baseSepolia } from 'viem/chains';
import { encodeFunctionData } from 'viem';

// Конфигурация ваших задеплоенных контрактов
const NETWORK_CONFIG = {
  'local': {
    id: 31337,
    name: 'Local Hardhat',
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: {
      updater: '0xb34cac1135c27ec810e7e6880325085783c1a7e0', // Ваш задеплоенный Updater
      faucet: '0x76b71a17d82232fd29aca475d14ed596c67c4b85'   // Ваш задеплоенный Faucet
    },
    blockTime: 2000, // ms
    gasLimit: 100000n,
    sendMethod: 'eth_sendRawTransaction'
  },
  'megaeth': {
    id: 6342,
    name: 'MegaETH Testnet',
    rpcUrl: 'https://megaeth-testnet.rpc.caldera.xyz/http',
    contracts: {
      updater: '0xb34cac1135c27ec810e7e6880325085783c1a7e0', // Обновите адреса для MegaETH
      faucet: '0x76b71a17d82232fd29aca475d14ed596c67c4b85'
    },
    blockTime: 100, // ms - сверхбыстрые блоки
    gasLimit: 100000n,
    sendMethod: 'realtime_sendRawTransaction' // Специальный метод MegaETH
  },
  'base': {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    contracts: {
      updater: '0xb34cac1135c27ec810e7e6880325085783c1a7e0', // Обновите адреса для Base
      faucet: '0x76b71a17d82232fd29aca475d14ed596c67c4b85'
    },
    blockTime: 2000, // ms
    gasLimit: 100000n,
    sendMethod: 'eth_sendRawTransaction'
  }
};

// ABI для Updater контракта
const UPDATER_ABI = [
  {
    name: 'update',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'number',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

class OptimizedBlockchainService {
  constructor() {
    // Кеши для максимальной производительности
    this.clientCache = {};
    this.gasParams = {};
    this.preSignedPool = {};
    
    // Метрики производительности
    this.metrics = {
      totalTransactions: 0,
      averageTime: 0,
      networkStats: {}
    };
    
    // Состояние
    this.isInitialized = false;
    this.currentWallet = null;
  }

  /**
   * Инициализация системы с предподписанием пакета транзакций
   */
  async initializeOptimized(privyWallet, chainKey = 'local', batchSize = 20) {
    try {
      console.log(`🚀 Инициализация оптимизированной системы для ${chainKey}...`);
      
      const startTime = performance.now();
      this.currentWallet = privyWallet;
      
      // Переключаемся на нужную сеть
      await this.switchToChain(chainKey);
      
      // Создаем кешированный клиент
      await this.createCachedClient(chainKey);
      
      // Получаем и кешируем газовые параметры
      await this.cacheGasParams(chainKey);
      
      // Предподписываем пакет транзакций
      await this.preSignBatch(chainKey, batchSize);
      
      this.isInitialized = true;
      
      const initTime = performance.now() - startTime;
      console.log(`✅ Система инициализирована за ${initTime.toFixed(2)}ms`);
      console.log(`📦 Предподписано ${batchSize} транзакций для мгновенной отправки`);
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  /**
   * Переключение на указанную сеть
   */
  async switchToChain(chainKey) {
    const config = NETWORK_CONFIG[chainKey];
    if (!config) {
      throw new Error(`Неизвестная сеть: ${chainKey}`);
    }

    try {
      const provider = await this.currentWallet.getEthersProvider();
      const currentNetwork = await provider.getNetwork();
      
      if (currentNetwork.chainId !== config.id) {
        console.log(`🔄 Переключение на сеть ${config.name}...`);
        
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${config.id.toString(16)}` }],
        });
        
        // Ждем подтверждения переключения
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn('Не удалось переключить сеть через wallet_switchEthereumChain:', error);
    }
  }

  /**
   * Создание и кеширование клиента для блокчейна
   */
  async createCachedClient(chainKey) {
    if (this.clientCache[chainKey]) {
      return this.clientCache[chainKey];
    }

    const config = NETWORK_CONFIG[chainKey];
    const provider = await this.currentWallet.getEthersProvider();

    // Создаем оптимизированный клиент
    const client = createWalletClient({
      transport: custom(provider),
    }).extend(publicActions);

    // Кешируем клиент
    this.clientCache[chainKey] = client;
    
    console.log(`🔧 Создан и кеширован клиент для ${config.name}`);
    return client;
  }

  /**
   * Получение и кеширование газовых параметров
   */
  async cacheGasParams(chainKey) {
    if (this.gasParams[chainKey]) {
      return this.gasParams[chainKey];
    }

    const client = this.clientCache[chainKey];
    
    try {
      // Получаем текущие газовые параметры
      const gasPrice = await client.getGasPrice();
      
      // Для EIP-1559 сетей
      const gas = {
        maxFeePerGas: gasPrice * 120n / 100n, // +20% для приоритета
        maxPriorityFeePerGas: gasPrice * 10n / 100n, // 10% tip
        gasPrice: gasPrice
      };

      this.gasParams[chainKey] = gas;
      console.log(`⛽ Кеширован газ для ${chainKey}: ${gas.maxFeePerGas.toString()}`);
      
      return gas;
    } catch (error) {
      console.warn('Не удалось получить газовые параметры, используем значения по умолчанию');
      
      // Значения по умолчанию
      const defaultGas = {
        maxFeePerGas: 20000000000n, // 20 gwei
        maxPriorityFeePerGas: 1000000000n, // 1 gwei
        gasPrice: 20000000000n
      };
      
      this.gasParams[chainKey] = defaultGas;
      return defaultGas;
    }
  }

  /**
   * Предподписание пакета транзакций
   */
  async preSignBatch(chainKey, batchSize) {
    const client = this.clientCache[chainKey];
    const config = NETWORK_CONFIG[chainKey];
    const gas = this.gasParams[chainKey];

    try {
      // Получаем текущий nonce
      const account = await client.getAddresses();
      const address = account[0];
      const nonce = await client.getTransactionCount({
        address: address,
        blockTag: 'pending'
      });

      console.log(`📝 Предподписание ${batchSize} транзакций, начиная с nonce ${nonce}...`);

      // Подготавливаем данные для вызова update()
      const updateData = encodeFunctionData({
        abi: UPDATER_ABI,
        functionName: 'update',
        args: []
      });

      const signedTransactions = [];

      // Подписываем пакет транзакций
      for (let i = 0; i < batchSize; i++) {
        const txData = {
          account: address,
          to: config.contracts.updater,
          data: updateData,
          nonce: nonce + i,
          maxFeePerGas: gas.maxFeePerGas,
          maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
          value: 0n,
          type: 'eip1559',
          gas: config.gasLimit,
        };

        const signedTx = await client.signTransaction(txData);
        signedTransactions.push(signedTx);
      }

      // Сохраняем в пул
      this.preSignedPool[chainKey] = {
        transactions: signedTransactions,
        currentIndex: 0,
        baseNonce: nonce,
        hasTriggeredRefill: false
      };

      console.log(`✅ Предподписано ${batchSize} транзакций для ${chainKey}`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка предподписания:', error);
      throw error;
    }
  }

  /**
   * Получение следующей предподписанной транзакции из пула
   */
  getNextTransaction(chainKey) {
    const pool = this.preSignedPool[chainKey];
    
    if (!pool || pool.currentIndex >= pool.transactions.length) {
      throw new Error(`Пул транзакций для ${chainKey} пуст или исчерпан`);
    }

    const transaction = pool.transactions[pool.currentIndex];
    pool.currentIndex++;

    // Автодозаправка пула при 50% использовании
    if (pool.currentIndex >= pool.transactions.length / 2 && !pool.hasTriggeredRefill) {
      pool.hasTriggeredRefill = true;
      console.log(`🔄 Запуск автодозаправки пула для ${chainKey}...`);
      
      // Асинхронно дозаправляем пул
      this.extendPool(chainKey, pool.baseNonce + pool.transactions.length, 10)
        .then(() => {
          console.log(`✅ Пул ${chainKey} успешно дозаправлен`);
          pool.hasTriggeredRefill = false;
        })
        .catch(error => {
          console.error(`❌ Ошибка дозаправки пула ${chainKey}:`, error);
          pool.hasTriggeredRefill = false;
        });
    }

    return transaction;
  }

  /**
   * Дозаправка пула новыми предподписанными транзакциями
   */
  async extendPool(chainKey, startNonce, batchSize) {
    const client = this.clientCache[chainKey];
    const config = NETWORK_CONFIG[chainKey];
    const gas = this.gasParams[chainKey];

    try {
      const account = await client.getAddresses();
      const address = account[0];

      const updateData = encodeFunctionData({
        abi: UPDATER_ABI,
        functionName: 'update',
        args: []
      });

      const newTransactions = [];

      for (let i = 0; i < batchSize; i++) {
        const txData = {
          account: address,
          to: config.contracts.updater,
          data: updateData,
          nonce: startNonce + i,
          maxFeePerGas: gas.maxFeePerGas,
          maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
          value: 0n,
          type: 'eip1559',
          gas: config.gasLimit,
        };

        const signedTx = await client.signTransaction(txData);
        newTransactions.push(signedTx);
      }

      // Добавляем в существующий пул
      this.preSignedPool[chainKey].transactions.push(...newTransactions);
      
      return true;
    } catch (error) {
      console.error('Ошибка дозаправки пула:', error);
      throw error;
    }
  }

  /**
   * Основная функция отправки действия игрока в блокчейн
   */
  async sendPlayerAction(chainKey) {
    if (!this.isInitialized) {
      throw new Error('Система не инициализирована. Вызовите initializeOptimized() сначала.');
    }

    const startTime = performance.now();
    
    try {
      let result;
      
      // Выбираем оптимальный метод для каждого блокчейна
      switch (chainKey) {
        case 'megaeth':
          result = await this.sendMegaethTransaction(startTime);
          break;
        case 'base':
          result = await this.sendBaseTransaction(startTime);
          break;
        default:
          result = await this.sendRegularTransaction(chainKey, startTime);
      }

      // Обновляем метрики
      this.updateMetrics(chainKey, result);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Ошибка отправки действия для ${chainKey}:`, error);
      throw error;
    }
  }

  /**
   * Оптимизированная отправка для MegaETH (реалтайм)
   */
  async sendMegaethTransaction(startTime) {
    const client = this.clientCache['megaeth'];
    const signedTx = this.getNextTransaction('megaeth');

    try {
      // Используем специальный реалтайм метод MegaETH
      const result = await client.request({
        method: 'realtime_sendRawTransaction',
        params: [signedTx]
      });

      const executionTime = performance.now() - startTime;
      console.log(`⚡ MegaETH транзакция отправлена за ${executionTime.toFixed(2)}ms`);
      
      return executionTime;
    } catch (error) {
      // Fallback на обычный метод
      console.warn('Fallback на обычную отправку для MegaETH');
      return await this.sendRegularTransaction('megaeth', startTime);
    }
  }

  /**
   * Оптимизированная отправка для Base
   */
  async sendBaseTransaction(startTime) {
    const client = this.clientCache['base'];
    const signedTx = this.getNextTransaction('base');

    const hash = await client.sendRawTransaction({ 
      serializedTransaction: signedTx 
    });

    const executionTime = performance.now() - startTime;
    console.log(`🔵 Base транзакция отправлена за ${executionTime.toFixed(2)}ms, hash: ${hash}`);
    
    return executionTime;
  }

  /**
   * Стандартная отправка для остальных сетей
   */
  async sendRegularTransaction(chainKey, startTime) {
    const client = this.clientCache[chainKey];
    const signedTx = this.getNextTransaction(chainKey);

    const hash = await client.sendRawTransaction({ 
      serializedTransaction: signedTx 
    });

    // Для локальной сети ждем receipt для демонстрации
    if (chainKey === 'local') {
      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log(`📋 Транзакция подтверждена в блоке ${receipt.blockNumber}`);
    }

    const executionTime = performance.now() - startTime;
    console.log(`🔗 ${chainKey} транзакция отправлена за ${executionTime.toFixed(2)}ms, hash: ${hash}`);
    
    return executionTime;
  }

  /**
   * Обновление метрик производительности
   */
  updateMetrics(chainKey, executionTime) {
    this.metrics.totalTransactions++;
    
    // Обновляем среднее время
    this.metrics.averageTime = (
      (this.metrics.averageTime * (this.metrics.totalTransactions - 1) + executionTime) / 
      this.metrics.totalTransactions
    );

    // Обновляем статистику по сетям
    if (!this.metrics.networkStats[chainKey]) {
      this.metrics.networkStats[chainKey] = {
        count: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
    }

    const stats = this.metrics.networkStats[chainKey];
    stats.count++;
    stats.averageTime = (
      (stats.averageTime * (stats.count - 1) + executionTime) / stats.count
    );
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
  }

  /**
   * Получение текущего значения счетчика из контракта
   */
  async getCurrentNumber(chainKey) {
    const client = this.clientCache[chainKey];
    const config = NETWORK_CONFIG[chainKey];

    try {
      const result = await client.readContract({
        address: config.contracts.updater,
        abi: UPDATER_ABI,
        functionName: 'number'
      });

      return Number(result);
    } catch (error) {
      console.error('Ошибка чтения контракта:', error);
      return null;
    }
  }

  /**
   * Получение статистики производительности
   */
  getPerformanceStats() {
    return {
      ...this.metrics,
      poolStatus: Object.keys(this.preSignedPool).reduce((acc, key) => {
        const pool = this.preSignedPool[key];
        acc[key] = {
          total: pool.transactions.length,
          used: pool.currentIndex,
          remaining: pool.transactions.length - pool.currentIndex
        };
        return acc;
      }, {})
    };
  }

  /**
   * Сброс системы и очистка кешей
   */
  reset() {
    this.clientCache = {};
    this.gasParams = {};
    this.preSignedPool = {};
    this.metrics = {
      totalTransactions: 0,
      averageTime: 0,
      networkStats: {}
    };
    this.isInitialized = false;
    this.currentWallet = null;
    
    console.log('🔄 Система сброшена');
  }
}

// Создаем единственный экземпляр сервиса
export const optimizedBlockchainService = new OptimizedBlockchainService();
export default optimizedBlockchainService;