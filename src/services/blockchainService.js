// PRE-SIGNED TRANSACTIONS ONLY - Используем только предварительно подписанные транзакции
// Этот сервис больше не создает транзакции через ethers.js, а использует pre-signed пул

import { blockchainLogger as logger } from '../utils/logger.js';

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  6342: "0x0000000000000000000000000000000000000000",  // MegaETH Testnet - Deploy contract here
  84532: "0x0000000000000000000000000000000000000000", // Base Sepolia - Deploy contract here
  10143: "0x0000000000000000000000000000000000000000"  // Monad Testnet - Deploy contract here
};

class BlockchainService {
  constructor() {
    this.chainId = null;
    this.transactionQueue = [];
    this.isProcessingQueue = false;
    this.blockchainUtils = null; // Будет инициализирован через setBlockchainUtils
  }

  // Установка blockchain utils для использования pre-signed транзакций
  setBlockchainUtils(utils) {
    this.blockchainUtils = utils;
  }

  async initialize(privyWallet, chainId) {
    try {
      if (!privyWallet) {
        throw new Error('No wallet provided');
      }

      this.chainId = chainId;

      logger.info(`Blockchain service initialized for pre-signed transactions on chain ${this.chainId}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      return false;
    }
  }

  async startGame() {
    if (!this.blockchainUtils) {
      logger.error('BlockchainUtils not set, cannot use pre-signed transactions');
      return { success: false, error: 'Pre-signed transaction system not available' };
    }

    try {
      logger.debug('Starting game with pre-signed transaction...');
      
      // Используем pre-signed транзакцию через blockchainUtils
      const result = await this.blockchainUtils.sendAndConfirmTransaction(this.chainId);
      
      logger.debug('Game started with pre-signed transaction:', result);
      
      return { 
        success: true, 
        txHash: result.transactionHash || result.hash,
        blockchainTime: result.blockchainTime
      };
    } catch (error) {
      logger.error('Failed to start game with pre-signed transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async makeMovement() {
    if (!this.blockchainUtils) {
      logger.warn('BlockchainUtils not set, simulating movement');
      return { success: true, simulated: true };
    }

    // Add to queue for processing with pre-signed transactions
    return new Promise((resolve) => {
      this.transactionQueue.push({
        type: 'movement',
        resolve,
        timestamp: Date.now()
      });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.transactionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process movements in batches using pre-signed transactions
      const batchSize = 2; // Allow max 2 pending transactions as per Crossy Fluffle
      const currentBatch = this.transactionQueue.splice(0, batchSize);

      for (const item of currentBatch) {
        try {
          // Используем pre-signed транзакцию для движения
          const result = await this.blockchainUtils.sendAndConfirmTransaction(this.chainId);
          logger.debug('Movement sent with pre-signed transaction:', result);

          item.resolve({ 
            success: true, 
            txHash: result.transactionHash || result.hash,
            blockchainTime: result.blockchainTime,
            pending: false // Pre-signed транзакции обрабатываются быстрее
          });
        } catch (error) {
          logger.error('Pre-signed movement transaction failed:', error);
          item.resolve({ 
            success: false, 
            error: error.message 
          });
        }
      }
    } catch (error) {
      logger.error('Error processing pre-signed transaction queue:', error);
    }

    this.isProcessingQueue = false;

    // Continue processing if there are more items
    if (this.transactionQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  async endGame() {
    if (!this.blockchainUtils) {
      logger.warn('BlockchainUtils not set, cannot end game on-chain');
      return { success: false, error: 'Pre-signed transaction system not available' };
    }

    try {
      logger.debug('Ending game with pre-signed transaction...');
      
      // Используем pre-signed транзакцию для завершения игры
      const result = await this.blockchainUtils.sendAndConfirmTransaction(this.chainId);
      
      logger.debug('Game ended with pre-signed transaction:', result);
      
      return { 
        success: true, 
        txHash: result.transactionHash || result.hash,
        blockchainTime: result.blockchainTime
      };
    } catch (error) {
      logger.error('Failed to end game with pre-signed transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlayerSession(address) {
    // В режиме pre-signed транзакций данные сессии недоступны через контракт
    // Возвращаем mock данные или получаем из локального состояния
    logger.warn('Player session data not available in pre-signed only mode');
    return null;
  }

  async getPlayerHighScore(address) {
    // В режиме pre-signed транзакций хай-скор недоступен через контракт
    // Возвращаем mock данные или получаем из локального состояния
    logger.warn('High score data not available in pre-signed only mode');
    return 0;
  }

  getNetworkName() {
    const networks = {
      6342: 'MegaETH Testnet',
      84532: 'Base Sepolia',
      10143: 'Monad Testnet',
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet'
    };
    return networks[this.chainId] || `Unknown Network (${this.chainId})`;
  }

  isContractAvailable() {
    // В режиме pre-signed транзакций контракт всегда "доступен" через pre-signed пул
    return this.blockchainUtils !== null;
  }

  getPendingTransactions() {
    return this.transactionQueue.length;
  }
}

export default new BlockchainService();