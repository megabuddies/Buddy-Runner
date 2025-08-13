import { ethers } from 'ethers';
import { getContractAddresses, areContractsDeployed } from '../config/contracts.js';
import UpdaterABI from '../abis/Updater.json';
import FaucetABI from '../abis/Faucet.json';

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.updaterContract = null;
    this.faucetContract = null;
    this.chainId = null;
    this.walletAddress = null;
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
      
      // Get wallet address
      this.walletAddress = await this.signer.getAddress();

      // Initialize contracts if deployed on current network
      if (areContractsDeployed(this.chainId)) {
        const addresses = getContractAddresses(this.chainId);
        
        this.updaterContract = new ethers.Contract(
          addresses.updater,
          UpdaterABI,
          this.signer
        );
        
        this.faucetContract = new ethers.Contract(
          addresses.faucet,
          FaucetABI,
          this.signer
        );
      }

      console.log(`Contract service initialized on chain ${this.chainId}`);
      console.log(`Wallet address: ${this.walletAddress}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize contract service:', error);
      return false;
    }
  }

  // Updater Contract Functions
  async getUpdaterNumber() {
    if (!this.updaterContract) {
      console.warn('Updater contract not available on current network');
      return null;
    }

    try {
      const number = await this.updaterContract.number();
      return number.toString();
    } catch (error) {
      console.error('Failed to get updater number:', error);
      throw error;
    }
  }

  async updateNumber() {
    if (!this.updaterContract) {
      console.warn('Updater contract not available on current network');
      return { success: false, error: 'Contract not deployed on current network' };
    }

    try {
      console.log('Sending update transaction...');
      const tx = await this.updaterContract.update();
      console.log('Update transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Update transaction confirmed:', receipt.transactionHash);
      
      return { 
        success: true, 
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to update number:', error);
      return { success: false, error: error.message };
    }
  }

  // Faucet Contract Functions
  async getFaucetInfo() {
    if (!this.faucetContract) {
      console.warn('Faucet contract not available on current network');
      return null;
    }

    try {
      const [owner, dripAmount, balance] = await Promise.all([
        this.faucetContract.owner(),
        this.faucetContract.DRIP_AMOUNT(),
        this.provider.getBalance(this.faucetContract.address)
      ]);

      return {
        owner,
        dripAmount: ethers.formatEther(dripAmount),
        balance: ethers.formatEther(balance),
        isOwner: owner.toLowerCase() === this.walletAddress.toLowerCase()
      };
    } catch (error) {
      console.error('Failed to get faucet info:', error);
      throw error;
    }
  }

  async depositToFaucet(amount) {
    if (!this.faucetContract) {
      console.warn('Faucet contract not available on current network');
      return { success: false, error: 'Contract not deployed on current network' };
    }

    try {
      console.log(`Depositing ${amount} ETH to faucet...`);
      const tx = await this.faucetContract.deposit({
        value: ethers.parseEther(amount)
      });
      console.log('Deposit transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Deposit transaction confirmed:', receipt.transactionHash);
      
      return { 
        success: true, 
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to deposit to faucet:', error);
      return { success: false, error: error.message };
    }
  }

  async requestDrip(toAddress) {
    if (!this.faucetContract) {
      console.warn('Faucet contract not available on current network');
      return { success: false, error: 'Contract not deployed on current network' };
    }

    try {
      console.log(`Requesting drip to ${toAddress}...`);
      const tx = await this.faucetContract.drip(toAddress);
      console.log('Drip transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Drip transaction confirmed:', receipt.transactionHash);
      
      return { 
        success: true, 
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to request drip:', error);
      return { success: false, error: error.message };
    }
  }

  async emergencyWithdraw() {
    if (!this.faucetContract) {
      console.warn('Faucet contract not available on current network');
      return { success: false, error: 'Contract not deployed on current network' };
    }

    try {
      console.log('Performing emergency withdraw...');
      const tx = await this.faucetContract.emergencyWithdraw();
      console.log('Emergency withdraw transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Emergency withdraw confirmed:', receipt.transactionHash);
      
      return { 
        success: true, 
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to emergency withdraw:', error);
      return { success: false, error: error.message };
    }
  }

  async changeOwner(newOwner) {
    if (!this.faucetContract) {
      console.warn('Faucet contract not available on current network');
      return { success: false, error: 'Contract not deployed on current network' };
    }

    try {
      console.log(`Changing owner to ${newOwner}...`);
      const tx = await this.faucetContract.changeOwner(newOwner);
      console.log('Change owner transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Change owner confirmed:', receipt.transactionHash);
      
      return { 
        success: true, 
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to change owner:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility functions
  areContractsAvailable() {
    return this.updaterContract !== null && this.faucetContract !== null;
  }

  getChainId() {
    return this.chainId;
  }

  getWalletAddress() {
    return this.walletAddress;
  }

  async getWalletBalance() {
    if (!this.provider || !this.walletAddress) {
      return '0';
    }

    try {
      const balance = await this.provider.getBalance(this.walletAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return '0';
    }
  }
}

export default new ContractService();