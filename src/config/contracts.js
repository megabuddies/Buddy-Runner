// Contract configuration for Updater and Faucet contracts
export const CONTRACTS = {
  // MegaETH Testnet
  megaeth: {
    chainId: 6342,
    name: "MegaETH Testnet",
    explorer: "https://carrot.megaeth.com",
    contracts: {
      updater: "0x0000000000000000000000000000000000000000", // Replace with your deployed Updater contract address
      faucet: "0x0000000000000000000000000000000000000000",  // Replace with your deployed Faucet contract address
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