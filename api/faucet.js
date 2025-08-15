import { ethers } from 'ethers';

// Конфигурация сетей и контрактов
const NETWORKS = {
  6342: { // MegaETH Testnet
    rpcUrl: process.env.MEGAETH_RPC_URL || 'https://carrot.megaeth.com/rpc',
    chainId: 6342
  },
  31337: { // Foundry Local
    rpcUrl: process.env.FOUNDRY_RPC_URL || 'http://127.0.0.1:8545',
    chainId: 31337
  },
  84532: { // Base Sepolia
    rpcUrl: 'https://sepolia.base.org',
    chainId: 84532
  },
  10143: { // Monad Testnet
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143
  },
  50311: { // Somnia Testnet
    rpcUrl: 'https://testnet.somnia.network',
    chainId: 50311
  },
  1313161556: { // RISE Testnet
    rpcUrl: 'https://testnet-rpc.rise.com',
    chainId: 1313161556
  }
};

export default async function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Обрабатываем preflight запросы
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, chainId } = req.body;

    // Валидация входных данных
    if (!address || !chainId) {
      return res.status(400).json({ error: 'Address and chainId are required' });
    }

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const network = NETWORKS[chainId];
    if (!network) {
      return res.status(400).json({ error: 'Unsupported network' });
    }

    // Получаем приватный ключ владельца из переменных окружения
    const ownerPrivateKey = process.env.FAUCET_OWNER_PRIVATE_KEY;
    if (!ownerPrivateKey) {
      return res.status(500).json({ error: 'Faucet owner private key not configured' });
    }

    // Создаем провайдер и faucet кошелёк
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);

    // Проверяем баланс фонда
    const dripAmount = ethers.parseEther('0.0001'); // Изменено на 0.0001 ETH
    const faucetBalance = await provider.getBalance(ownerWallet.address); // Проверяем баланс отдельного faucet кошелька
    
    if (faucetBalance < dripAmount) {
      return res.status(400).json({ 
        error: 'Faucet wallet is empty',
        balance: ethers.formatEther(faucetBalance)
      });
    }

    // Проверяем, что у пользователя мало средств (< 0.001 ETH)
    const userBalance = await provider.getBalance(address);
    const minBalance = ethers.parseEther('0.001'); // Изменено с 0.01 на 0.001 ETH
    
    if (userBalance >= minBalance) {
      return res.status(400).json({ 
        error: 'Address already has sufficient balance',
        balance: ethers.formatEther(userBalance),
        minimum: '0.001'
      });
    }

    // Отправляем ETH напрямую из faucet кошелька
    console.log(`Sending 0.0001 ETH from faucet wallet to ${address} on chain ${chainId}`);
    
    const tx = await ownerWallet.sendTransaction({
      to: address,
      value: dripAmount,
      gasLimit: 21000n // Стандартный газ для простого перевода ETH
    });
    
    // Ждём подтверждения транзакции
    const receipt = await tx.wait();
    
    console.log(`Faucet transaction successful: ${receipt.hash}`);

    return res.status(200).json({
      success: true,
      transactionHash: receipt.hash,
      amount: '0.0001',
      recipient: address,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {
    console.error('Faucet error:', error);
    
    // Обработка специфичных ошибок
    if (error.message.includes('insufficient funds')) {
      return res.status(400).json({ error: 'Faucet wallet has insufficient funds' });
    }
    
    if (error.message.includes('nonce')) {
      return res.status(500).json({ error: 'Transaction nonce error, please try again' });
    }
    
    if (error.message.includes('gas')) {
      return res.status(500).json({ error: 'Gas estimation failed, please try again' });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}