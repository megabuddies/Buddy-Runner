import { ethers } from 'ethers';

// Конфигурация сетей и контрактов
const NETWORKS = {
  6342: { // MegaETH Testnet
    rpcUrl: process.env.MEGAETH_RPC_URL || 'https://carrot.megaeth.com/rpc',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 6342
  },
  31337: { // Foundry Local
    rpcUrl: process.env.FOUNDRY_RPC_URL || 'http://127.0.0.1:8545',
    faucetAddress: '0x76b71a17d82232fd29aca475d14ed596c67c4b85',
    chainId: 31337
  }
};

// ABI для Faucet контракта
const FAUCET_ABI = [
  "function drip(address payable _to) public",
  "function owner() public view returns (address)",
  "error NotOwner()",
  "error FaucetEmpty()",
  "error FailedToSend()"
];

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

    // Создаем провайдер и кошелёк владельца
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
    
    // Создаем экземпляр контракта
    const faucetContract = new ethers.Contract(
      network.faucetAddress,
      FAUCET_ABI,
      ownerWallet
    );

    // Проверяем баланс фонда
    const faucetBalance = await provider.getBalance(network.faucetAddress);
    const dripAmount = ethers.parseEther('0.05');
    
    if (faucetBalance < dripAmount) {
      return res.status(400).json({ 
        error: 'Faucet is empty',
        balance: ethers.formatEther(faucetBalance)
      });
    }

    // Проверяем, что у пользователя мало средств
    const userBalance = await provider.getBalance(address);
    const minBalance = ethers.parseEther('0.01');
    
    if (userBalance >= minBalance) {
      return res.status(400).json({ 
        error: 'Address already has sufficient balance',
        balance: ethers.formatEther(userBalance)
      });
    }

    // Вызываем функцию drip
    console.log(`Sending 0.05 ETH from faucet to ${address} on chain ${chainId}`);
    
    const tx = await faucetContract.drip(address, {
      gasLimit: 100000n // Явно указываем gas limit для Vercel
    });
    
    // Ждём подтверждения транзакции
    const receipt = await tx.wait();
    
    console.log(`Faucet transaction successful: ${receipt.hash}`);

    return res.status(200).json({
      success: true,
      transactionHash: receipt.hash,
      amount: '0.05',
      recipient: address,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {
    console.error('Faucet error:', error);
    
    // Обработка специфичных ошибок контракта
    if (error.message.includes('NotOwner')) {
      return res.status(403).json({ error: 'Not authorized to use faucet' });
    }
    
    if (error.message.includes('FaucetEmpty')) {
      return res.status(400).json({ error: 'Faucet is empty' });
    }
    
    if (error.message.includes('FailedToSend')) {
      return res.status(500).json({ error: 'Failed to send funds' });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}