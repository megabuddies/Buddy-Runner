import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import contractService from '../services/contractService.js';
import { areContractsDeployed, getNetworkConfig } from '../config/contracts.js';

// Hook for Updater contract
export function useUpdater() {
  const [currentNumber, setCurrentNumber] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { wallets } = useWallets();

  const refreshNumber = useCallback(async () => {
    if (!contractService.areContractsAvailable()) {
      setCurrentNumber(null);
      return;
    }

    try {
      setIsLoading(true);
      const number = await contractService.getUpdaterNumber();
      setCurrentNumber(number);
      setError(null);
    } catch (err) {
      console.error('Error fetching updater number:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateNumber = useCallback(async () => {
    if (!contractService.areContractsAvailable()) {
      throw new Error('Contracts not available on current network');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await contractService.updateNumber();
      
      if (result.success) {
        // Refresh the number after successful update
        await refreshNumber();
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error updating number:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshNumber]);

  // Initialize and refresh number when wallet changes
  useEffect(() => {
    if (wallets.length > 0) {
      refreshNumber();
    }
  }, [wallets, refreshNumber]);

  return {
    currentNumber,
    updateNumber,
    refreshNumber,
    isLoading,
    error,
    isAvailable: contractService.areContractsAvailable()
  };
}

// Hook for Faucet contract
export function useFaucet() {
  const [faucetInfo, setFaucetInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { wallets } = useWallets();

  const refreshFaucetInfo = useCallback(async () => {
    if (!contractService.areContractsAvailable()) {
      setFaucetInfo(null);
      return;
    }

    try {
      setIsLoading(true);
      const info = await contractService.getFaucetInfo();
      setFaucetInfo(info);
      setError(null);
    } catch (err) {
      console.error('Error fetching faucet info:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const depositToFaucet = useCallback(async (amount) => {
    if (!contractService.areContractsAvailable()) {
      throw new Error('Contracts not available on current network');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await contractService.depositToFaucet(amount);
      
      if (result.success) {
        // Refresh faucet info after successful deposit
        await refreshFaucetInfo();
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error depositing to faucet:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshFaucetInfo]);

  const requestDrip = useCallback(async (toAddress) => {
    if (!contractService.areContractsAvailable()) {
      throw new Error('Contracts not available on current network');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await contractService.requestDrip(toAddress);
      
      if (result.success) {
        // Refresh faucet info after successful drip
        await refreshFaucetInfo();
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error requesting drip:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshFaucetInfo]);

  const emergencyWithdraw = useCallback(async () => {
    if (!contractService.areContractsAvailable()) {
      throw new Error('Contracts not available on current network');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await contractService.emergencyWithdraw();
      
      if (result.success) {
        // Refresh faucet info after successful withdrawal
        await refreshFaucetInfo();
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error with emergency withdraw:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshFaucetInfo]);

  const changeOwner = useCallback(async (newOwner) => {
    if (!contractService.areContractsAvailable()) {
      throw new Error('Contracts not available on current network');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await contractService.changeOwner(newOwner);
      
      if (result.success) {
        // Refresh faucet info after successful owner change
        await refreshFaucetInfo();
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error changing owner:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshFaucetInfo]);

  // Initialize and refresh faucet info when wallet changes
  useEffect(() => {
    if (wallets.length > 0) {
      refreshFaucetInfo();
    }
  }, [wallets, refreshFaucetInfo]);

  return {
    faucetInfo,
    depositToFaucet,
    requestDrip,
    emergencyWithdraw,
    changeOwner,
    refreshFaucetInfo,
    isLoading,
    error,
    isAvailable: contractService.areContractsAvailable()
  };
}

// Hook for wallet information
export function useWalletInfo() {
  const [walletBalance, setWalletBalance] = useState('0');
  const [walletAddress, setWalletAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [networkConfig, setNetworkConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { wallets } = useWallets();

  const refreshWalletInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const balance = await contractService.getWalletBalance();
      const address = contractService.getWalletAddress();
      const currentChainId = contractService.getChainId();
      
      setWalletBalance(balance);
      setWalletAddress(address);
      setChainId(currentChainId);
      
      if (currentChainId) {
        try {
          const config = getNetworkConfig(currentChainId);
          setNetworkConfig(config);
        } catch (err) {
          setNetworkConfig(null);
        }
      }
    } catch (err) {
      console.error('Error fetching wallet info:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh wallet info when wallet changes
  useEffect(() => {
    if (wallets.length > 0) {
      refreshWalletInfo();
    }
  }, [wallets, refreshWalletInfo]);

  return {
    walletBalance,
    walletAddress,
    chainId,
    networkConfig,
    refreshWalletInfo,
    isLoading,
    areContractsDeployed: chainId ? areContractsDeployed(chainId) : false
  };
}