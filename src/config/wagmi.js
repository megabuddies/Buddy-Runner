import { createConfig, http } from 'wagmi';
import { QueryClient } from '@tanstack/react-query';

// Определяем поддерживаемые сети
const megaethTestnet = {
  id: 6342,
  name: 'MegaETH Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://carrot.megaeth.com/rpc'] },
    public: { http: ['https://carrot.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://explorer.megaeth.com' },
  },
  testnet: true,
};

const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
};

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  testnet: true,
};

const somniaTestnet = {
  id: 50311,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://testnet.somnia.network'] },
    public: { http: ['https://testnet.somnia.network'] },
  },
  testnet: true,
};

const riseTestnet = {
  id: 1313161556,
  name: 'RISE Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.rise.com'] },
    public: { http: ['https://testnet-rpc.rise.com'] },
  },
  testnet: true,
};

// Создаем конфигурацию Wagmi
export const wagmiConfig = createConfig({
  chains: [megaethTestnet, baseSepolia, monadTestnet, somniaTestnet, riseTestnet],
  transports: {
    [megaethTestnet.id]: http('https://carrot.megaeth.com/rpc'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
    [somniaTestnet.id]: http('https://testnet.somnia.network'),
    [riseTestnet.id]: http('https://testnet-rpc.rise.com'),
  },
});

// Создаем QueryClient для React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10 секунд
      cacheTime: 30000, // 30 секунд
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

// Экспортируем цепочки для использования в других местах
export const supportedChains = {
  megaethTestnet,
  baseSepolia,
  monadTestnet,
  somniaTestnet,
  riseTestnet,
};