import { ethers } from 'ethers';

// Contract ABI - simplified for the game contract
const GAME_CONTRACT_ABI = [
  "function startGame()",
  "function makeMovement()",
  "function endGame()",
  "function getPlayerSession(address player) view returns (tuple(address player, uint256 score, uint256 movements, uint256 startTime, bool isActive))",
  "function getPlayerHighScore(address player) view returns (uint256)",
  "event GameStarted(address indexed player, uint256 timestamp)",
  "event MovementMade(address indexed player, uint256 movementCount, uint256 score)",
  "event GameEnded(address indexed player, uint256 finalScore, uint256 totalMovements)"
];

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  12227332: "0x0000000000000000000000000000000000000000", // MegaETH Testnet - Deploy contract here
  84532: "0x0000000000000000000000000000000000000000",    // Base Sepolia - Deploy contract here
  41454: "0x0000000000000000000000000000000000000000"     // Monad Testnet - Deploy contract here
};

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.chainId = null;
    this.transactionQueue = [];
    this.isProcessingQueue = false;
  }

  async initialize(privyWallet) {
    try {
      if (!privyWallet) {
        throw new Error('No wallet provided');
      }

      // Get the provider from Privy
      const provider = await privyWallet.getEthersProvider();
      this.provider = provider;
      this.signer = provider.getSigner();
      
      // Get current network
      const network = await provider.getNetwork();
      this.chainId = network.chainId;

      // Initialize contract if address exists for current network
      const contractAddress = CONTRACT_ADDRESSES[this.chainId];
      if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
        this.contract = new ethers.Contract(contractAddress, GAME_CONTRACT_ABI, this.signer);
      }

      console.log(`Blockchain service initialized on chain ${this.chainId}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      return false;
    }
  }

  async startGame() {
    if (!this.contract) {
      console.warn('Contract not available on current network');
      return { success: false, error: 'Contract not deployed on current network' };
    }

    try {
      const tx = await this.contract.startGame();
      console.log('Game started, transaction:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Game start confirmed:', receipt.transactionHash);
      
      return { success: true, txHash: receipt.transactionHash };
    } catch (error) {
      console.error('Failed to start game:', error);
      return { success: false, error: error.message };
    }
  }

  async makeMovement() {
    if (!this.contract) {
      console.warn('Contract not available, simulating movement');
      return { success: true, simulated: true };
    }

    // Add to queue for processing
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
      // Process movements in batches to avoid overwhelming the network
      const batchSize = 2; // Allow max 2 pending transactions as per Crossy Fluffle
      const currentBatch = this.transactionQueue.splice(0, batchSize);

      for (const item of currentBatch) {
        try {
          const tx = await this.contract.makeMovement();
          console.log('Movement transaction sent:', tx.hash);
          
          // Don't wait for confirmation to maintain game speed
          tx.wait().then((receipt) => {
            console.log('Movement confirmed:', receipt.transactionHash);
          });

          item.resolve({ 
            success: true, 
            txHash: tx.hash,
            pending: true 
          });
        } catch (error) {
          console.error('Movement transaction failed:', error);
          item.resolve({ 
            success: false, 
            error: error.message 
          });
        }
      }
    } catch (error) {
      console.error('Error processing transaction queue:', error);
    }

    this.isProcessingQueue = false;

    // Continue processing if there are more items
    if (this.transactionQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  async endGame() {
    if (!this.contract) {
      console.warn('Contract not available on current network');
      return { success: false, error: 'Contract not deployed on current network' };
    }

    try {
      const tx = await this.contract.endGame();
      console.log('Game ended, transaction:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Game end confirmed:', receipt.transactionHash);
      
      return { success: true, txHash: receipt.transactionHash };
    } catch (error) {
      console.error('Failed to end game:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlayerSession(address) {
    if (!this.contract) {
      return null;
    }

    try {
      const session = await this.contract.getPlayerSession(address);
      return {
        player: session.player,
        score: session.score.toString(),
        movements: session.movements.toString(),
        startTime: session.startTime.toString(),
        isActive: session.isActive
      };
    } catch (error) {
      console.error('Failed to get player session:', error);
      return null;
    }
  }

  async getPlayerHighScore(address) {
    if (!this.contract) {
      return 0;
    }

    try {
      const highScore = await this.contract.getPlayerHighScore(address);
      return highScore.toString();
    } catch (error) {
      console.error('Failed to get high score:', error);
      return 0;
    }
  }

  getNetworkName() {
    const networks = {
      12227332: 'MegaETH Testnet',
      84532: 'Base Sepolia',
      41454: 'Monad Testnet',
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet'
    };
    return networks[this.chainId] || `Unknown Network (${this.chainId})`;
  }

  isContractAvailable() {
    return this.contract !== null;
  }

  getPendingTransactions() {
    return this.transactionQueue.length;
  }
}

export default new BlockchainService();