import { useState, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, http, custom, parseGwei, createPublicClient } from 'viem';

// Конфигурация сетей
const NETWORK_CONFIGS = {
  6342: { // MegaETH Testnet
    name: 'MegaETH Testnet',
    rpcUrl: 'https://carrot.megaeth.com/rpc',
    fallbackRpcUrls: [
      'https://carrot.megaeth.com/rpc',
      // Добавьте дополнительные RPC endpoints если доступны
    ],
    wsUrl: 'wss://carrot.megaeth.com/ws',
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0', // Updater contract
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 6342,
    sendMethod: 'eth_sendRawTransaction', // Отключен realtime для MegaETH
    connectionTimeouts: {
      initial: 10000, // 10 seconds for initial connection
      retry: 3000,    // 3 seconds for retries (быстрые retry для gaming)
      request: 5000   // 5 seconds for individual requests (для real-time gaming)
    },
    maxConnections: 3, // Limit concurrent connections
  },
  31337: { // Foundry Local
    name: 'Foundry Local',
    rpcUrl: 'http://127.0.0.1:8545',
    fallbackRpcUrls: ['http://127.0.0.1:8545'],
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 31337,
    sendMethod: 'eth_sendRawTransaction',
    connectionTimeouts: {
      initial: 10000,
      retry: 5000,
      request: 15000
    },
    maxConnections: 2,
  },
  50311: { // Somnia Testnet
    name: 'Somnia Testnet',
    rpcUrl: 'https://testnet.somnia.network',
    fallbackRpcUrls: ['https://testnet.somnia.network'],
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 50311,
    sendMethod: 'eth_sendRawTransaction',
    connectionTimeouts: {
      initial: 20000,
      retry: 10000,
      request: 30000
    },
    maxConnections: 2,
  },
  1313161556: { // RISE Testnet
    name: 'RISE Testnet',
    rpcUrl: 'https://testnet-rpc.rise.com',
    fallbackRpcUrls: ['https://testnet-rpc.rise.com'],
    contractAddress: '0xb34cac1135c27ec810e7e6880325085783c1a7e0',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 1313161556,
    sendMethod: 'eth_sendRawTransactionSync', // Синхронный метод для RISE
    connectionTimeouts: {
      initial: 20000,
      retry: 10000,
      request: 30000
    },
    maxConnections: 2,
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

// Safe JSON parsing utility to handle malformed responses
const safeJsonParse = (data) => {
  try {
    // Handle common malformed responses
    if (typeof data === 'string') {
      // Remove common prefixes that cause JSON parsing issues
      const cleanedData = data
        .replace(/^cadesplugin_loaded/, '')
        .replace(/^EnableInte.*?$/, '')
        .trim();
      
      if (cleanedData.length === 0) {
        return null;
      }
      
      return JSON.parse(cleanedData);
    }
    return data;
  } catch (error) {
    console.warn('Failed to parse JSON response:', error.message, 'Data:', data);
    return null;
  }
};