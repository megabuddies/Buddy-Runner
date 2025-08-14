# Исправление проблем с кошельком и блокчейном

## Обзор исправленных проблем

### 1. ❌ Ошибка `Cannot read properties of undefined (reading 'bind')`
**Причина:** Embedded wallet provider не готов при создании wallet client  
**Решение:** Добавлена проверка готовности provider перед созданием wallet client

```javascript
// Проверяем, доступен ли provider и создаем wallet client только если он готов
try {
  const provider = embeddedWallet.getEthereumProvider();
  if (provider && typeof provider.request === 'function') {
    walletClient = createWalletClient({
      account: embeddedWallet.address,
      transport: custom(provider),
    });
  } else {
    console.warn('Embedded wallet provider not ready, using public client only');
  }
} catch (error) {
  console.warn('Failed to create wallet client:', error.message);
}
```

### 2. ❌ Ошибка `c[0].getChainId is not a function`
**Причина:** Метод `getChainId` вызывается до готовности embedded wallet  
**Решение:** Добавлена проверка существования метода перед вызовом

```javascript
// Проверяем, что wallet готов и имеет метод getChainId
if (wallet && typeof wallet.getChainId === 'function') {
  const currentChainId = await wallet.getChainId();
  // ... логика переключения сети
} else {
  console.warn('Wallet getChainId method not available yet');
}
```

### 3. ❌ Ошибка faucet API 405 "Method not allowed" 
**Причина:** Переменная окружения `FAUCET_OWNER_PRIVATE_KEY` не настроена  
**Решение:** Добавлена обработка ошибок faucet и продолжение инициализации

```javascript
if (parseFloat(currentBalance) === 0) {
  console.log('Balance is 0, calling faucet...');
  try {
    await callFaucet(embeddedWallet.address, chainId);
    // Проверяем баланс после faucet
    await checkBalance(chainId);
  } catch (faucetError) {
    console.warn('Faucet failed, but continuing with initialization:', faucetError.message);
    // Продолжаем инициализацию даже если faucet не работает
  }
}
```

### 4. ❌ Ошибка "Wallet client not available"
**Причина:** Попытка подписи транзакций до готовности wallet client  
**Решение:** Добавлено ожидание готовности и проверки

```javascript
// Ждём несколько секунд, чтобы wallet provider был готов
await new Promise(resolve => setTimeout(resolve, 2000));

const { publicClient, walletClient } = await createClients(chainId);

if (!walletClient) {
  throw new Error('Wallet client not ready. Please try again in a few seconds.');
}
```

## Настройка переменных окружения

### Для локальной разработки:
Создайте файл `.env.local`:

```bash
# Privy Configuration
NEXT_PUBLIC_PROJECT_ID=your_privy_app_id_here

# Faucet Configuration (необходимо для автоматического фондирования)
FAUCET_OWNER_PRIVATE_KEY=your_faucet_owner_private_key_here

# RPC URLs (опционально)
MEGAETH_RPC_URL=https://carrot.megaeth.com/rpc
FOUNDRY_RPC_URL=http://127.0.0.1:8545
```

### Для Vercel deployment:
Добавьте переменные окружения в настройках проекта Vercel:
- `NEXT_PUBLIC_PROJECT_ID` - ваш Privy App ID
- `FAUCET_OWNER_PRIVATE_KEY` - приватный ключ владельца faucet контракта

## Последовательность исправлений

### 1. Проверка готовности Privy
```javascript
// Убедитесь, что Privy полностью инициализирован
const { authenticated, ready } = usePrivy();

if (!ready) {
  return <div>Loading Privy...</div>;
}
```

### 2. Проверка embedded wallet
```javascript
const getEmbeddedWallet = () => {
  if (!authenticated || !wallets.length) return null;
  return wallets.find(wallet => wallet.walletClientType === 'privy');
};
```

### 3. Безопасная инициализация
```javascript
const initBlockchain = async () => {
  if (!isReady || !selectedNetwork || selectedNetwork.isWeb2) {
    console.log('Skipping blockchain initialization - Web2 mode or not ready');
    return;
  }

  try {
    await initData(selectedNetwork.id);
    console.log('Blockchain initialization complete');
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    // Показать пользователю сообщение об ошибке
  }
};
```

## Отладка проблем

### 1. Проверьте консоль браузера
Должны появиться сообщения:
- ✅ `Initializing blockchain for: NETWORK_NAME`
- ✅ `Found embedded wallet: 0x...`
- ✅ `Successfully pre-signed X transactions`

### 2. Если видите ошибки:
```
❌ "Embedded wallet provider not ready" 
→ Подождите несколько секунд после логина

❌ "Wallet client not available"
→ Перезагрузите страницу или попробуйте снова

❌ "Faucet error: 405"
→ Настройте FAUCET_OWNER_PRIVATE_KEY или используйте уже профинансированный кошелёк
```

### 3. Проверьте статус wallet
```javascript
console.log('Wallets:', wallets);
console.log('Authenticated:', authenticated);
console.log('Embedded wallet:', getEmbeddedWallet());
```

## Советы по стабильности

### 1. Добавьте задержки
```javascript
// После логина подождите готовности wallet
useEffect(() => {
  if (authenticated && wallets.length > 0) {
    setTimeout(() => {
      initializeBlockchain();
    }, 3000); // 3 секунды задержки
  }
}, [authenticated, wallets]);
```

### 2. Обработайте ошибки сети
```javascript
const handleNetworkError = (error) => {
  if (error.message.includes('network')) {
    alert('Проблема с сетью. Проверьте подключение.');
  } else if (error.message.includes('wallet')) {
    alert('Проблема с кошельком. Попробуйте перелогиниться.');
  }
};
```

### 3. Показывайте состояние загрузки
```javascript
const [initializationStatus, setInitializationStatus] = useState('idle');

// idle -> loading -> success -> error
```

С этими исправлениями ваше приложение должно работать стабильно и обрабатывать все основные ошибки инициализации кошелька и блокчейна.