// Contract configuration for Updater and Faucet contracts
export const CONTRACTS = {
  // MegaETH Testnet
  megaeth: {
    chainId: 6342,
    name: "MegaETH Testnet",
    explorer: "https://carrot.megaeth.com",
    contracts: {
      updater: "0xb34cac1135c27ec810e7e6880325085783c1a7e0", // Deployed Updater contract
      faucet: "0x76b71a17d82232fd29aca475d14ed596c67c4b85",  // Deployed Faucet contract
    }
  },
  
  // Base Sepolia (for future deployment)
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    explorer: "https://sepolia.basescan.org",
    contracts: {
      updater: "0x0000000000000000000000000000000000000000",
      faucet: "0x0000000000000000000000000000000000000000",
    }
  },
  
  // Monad Testnet (for future deployment)
  monadTestnet: {
    chainId: 10143,
    name: "Monad Testnet", 
    explorer: "https://explorer.testnet.monad.xyz",
    contracts: {
      updater: "0x0000000000000000000000000000000000000000",
      faucet: "0x0000000000000000000000000000000000000000",
    }
  }
};

// Function to get contract addresses by chain ID
export function getContractAddresses(chainId) {
  const network = Object.values(CONTRACTS).find(n => n.chainId === chainId);
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  return network.contracts;
}

// Function to get network configuration by chain ID
export function getNetworkConfig(chainId) {
  const network = Object.values(CONTRACTS).find(n => n.chainId === chainId);
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  return network;
}

// Check if contracts are deployed on the current network
export function areContractsDeployed(chainId) {
  try {
    const addresses = getContractAddresses(chainId);
    return addresses.updater !== "0x0000000000000000000000000000000000000000" &&
           addresses.faucet !== "0x0000000000000000000000000000000000000000";
  } catch (error) {
    return false;
  }
}