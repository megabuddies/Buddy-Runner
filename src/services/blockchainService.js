// PRE-SIGNED TRANSACTIONS ONLY - Используем только предварительно подписанные транзакции
// Этот сервис больше не создает транзакции через ethers.js, а использует pre-signed пул

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

      // Silenced info log: service initialized
      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      return false;
    }
  }

  async startGame() {
    if (!this.blockchainUtils) {
      console.error('BlockchainUtils not set, cannot use pre-signed transactions');
      return { success: false, error: 'Pre-signed transaction system not available' };
    }

    try {
      // Silenced info log: starting game
      
      // Используем pre-signed транзакцию через blockchainUtils
      const result = await this.blockchainUtils.sendAndConfirmTransaction(this.chainId);
      
      // Silenced info log: game started
      
      return { 
        success: true, 
        txHash: result.transactionHash || result.hash,
        blockchainTime: result.blockchainTime
      };
    } catch (error) {
      console.error('Failed to start game with pre-signed transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async makeMovement() {
    if (!this.blockchainUtils) {
      // Silenced warn: simulating movement without blockchainUtils
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
          // Silenced info log: movement sent

          item.resolve({ 
            success: true, 
            txHash: result.transactionHash || result.hash,
            blockchainTime: result.blockchainTime,
            pending: false // Pre-signed транзакции обрабатываются быстрее
          });
        } catch (error) {
          console.error('Pre-signed movement transaction failed:', error);
          item.resolve({ 
            success: false, 
            error: error.message 
          });
        }
      }
    } catch (error) {
      console.error('Error processing pre-signed transaction queue:', error);
    }

    this.isProcessingQueue = false;

    // Continue processing if there are more items
    if (this.transactionQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  async endGame() {
    if (!this.blockchainUtils) {
      // Silenced warn: cannot end game without blockchainUtils
      return { success: false, error: 'Pre-signed transaction system not available' };
    }

    try {
      // Silenced info log: ending game
      
      // Используем pre-signed транзакцию для завершения игры
      const result = await this.blockchainUtils.sendAndConfirmTransaction(this.chainId);
      
      // Silenced info log: game ended
      
      return { 
        success: true, 
        txHash: result.transactionHash || result.hash,
        blockchainTime: result.blockchainTime
      };
    } catch (error) {
      console.error('Failed to end game with pre-signed transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlayerSession(address) {
    // В режиме pre-signed транзакций данные сессии недоступны через контракт
    // Возвращаем mock данные или получаем из локального состояния
    // Silenced warn: player session data unavailable
    return null;
  }

  async getPlayerHighScore(address) {
    // В режиме pre-signed транзакций хай-скор недоступен через контракт
    // Возвращаем mock данные или получаем из локального состояния
    // Silenced warn: high score data unavailable
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