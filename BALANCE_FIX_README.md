# Исправление проблемы с балансом при первом входе

## Проблема

При первом входе пользователя в игру:
1. Privy создает embedded wallet
2. Faucet отправляет токены
3. **НО** игра не распознает обновленный баланс сразу
4. Pre-signing запускается с балансом 0
5. Транзакции не могут быть отправлены
6. Пользователь должен обновить страницу

## Причина

Задержка в 5 секунд между вызовом faucet и проверкой баланса создавала race condition:
- Faucet отправлял токены
- Pre-signing запускался сразу с старым балансом (0)
- Транзакции создавались без достаточных средств

## Решение

### 1. Убрана задержка в проверке баланса

**Файл:** `src/hooks/useBlockchainUtils.js`

**До:**
```javascript
setTimeout(() => checkBalance(chainId), 5000);
```

**После:**
```javascript
await checkBalance(chainId);
```

### 2. Добавлена проверка баланса в preSignBatch

**Файл:** `src/hooks/useBlockchainUtils.js`

Добавлена проверка баланса перед началом pre-signing:
```javascript
// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем баланс перед началом pre-signing
console.log('🔍 Checking balance before pre-signing...');
const currentBalance = await checkBalance(chainId);
const balanceEth = parseFloat(currentBalance);

if (balanceEth < 0.00005) {
  console.log(`⚠️ Insufficient balance (${currentBalance} ETH) for pre-signing. Waiting for faucet...`);
  
  // Ждем до 15 секунд для обновления баланса после faucet
  let updatedBalance = currentBalance;
  let attempts = 0;
  const maxAttempts = 30; // 30 попыток по 500ms = 15 секунд
  
  while (parseFloat(updatedBalance) < 0.00005 && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      updatedBalance = await checkBalance(chainId);
      attempts++;
      console.log(`🔄 Balance check attempt ${attempts}/${maxAttempts}: ${updatedBalance} ETH`);
    } catch (error) {
      console.warn('Failed to check balance during pre-signing wait:', error);
      attempts++;
    }
  }
  
  if (parseFloat(updatedBalance) < 0.00005) {
    console.error(`❌ Insufficient balance after ${maxAttempts} attempts (${updatedBalance} ETH). Cannot pre-sign transactions.`);
    throw new Error(`Insufficient balance for pre-signing: ${updatedBalance} ETH`);
  } else {
    console.log(`✅ Balance updated to ${updatedBalance} ETH - proceeding with pre-signing`);
  }
}
```

### 3. Добавлена проверка баланса в getNextTransaction

**Файл:** `src/hooks/useBlockchainUtils.js`

Добавлена проверка баланса перед использованием pre-signed транзакций:
```javascript
// ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что баланс достаточен перед использованием pre-signed транзакций
const currentBalance = await checkBalance(chainId);
const balanceEth = parseFloat(currentBalance);

if (balanceEth < 0.00005) {
  console.error(`❌ Insufficient balance (${currentBalance} ETH) for using pre-signed transactions`);
  throw new Error(`Insufficient balance for blockchain transactions: ${currentBalance} ETH. Please wait for faucet or refresh page.`);
}
```

### 4. Улучшена обработка ошибок

**Файл:** `src/hooks/useBlockchainUtils.js`

Добавлена автоматическая попытка вызова faucet при недостаточном балансе:
```javascript
} else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient balance')) {
  console.log('💰 Insufficient funds detected, consider calling faucet...');
  
  // Попытка автоматического вызова faucet при недостаточном балансе
  try {
    const embeddedWallet = getEmbeddedWallet();
    if (embeddedWallet) {
      console.log('🔄 Attempting automatic faucet call due to insufficient balance...');
      await callFaucet(embeddedWallet.address, chainId);
      console.log('✅ Automatic faucet call completed');
    }
  } catch (faucetError) {
    console.warn('⚠️ Automatic faucet call failed:', faucetError);
  }
}
```

## Результат

Теперь при первом входе пользователя:

1. ✅ Баланс проверяется немедленно после получения ответа от faucet
2. ✅ Pre-signing ждет обновления баланса перед началом (до 15 секунд)
3. ✅ Если баланс все еще недостаточен, выдается понятная ошибка
4. ✅ Автоматическая попытка вызова faucet при недостаточном балансе
5. ✅ Пользователь может начать играть без обновления страницы

## Тестирование

Используйте файл `test-balance-fix.js` для тестирования:

1. Войдите в игру через Privy
2. Откройте консоль браузера
3. Запустите: `node test-balance-fix.js`
4. Проверьте логи для подтверждения работы исправлений

## Логи для отладки

При правильной работе вы должны увидеть:
```
🔍 Checking balance before pre-signing...
⚠️ Insufficient balance (0.0000 ETH) for pre-signing. Waiting for faucet...
🔄 Balance check attempt 1/30: 0.0000 ETH
🔄 Balance check attempt 2/30: 0.0000 ETH
...
✅ Balance updated to 0.0010 ETH - proceeding with pre-signing
✅ Pre-signed transaction pool is now ACTIVE with 1 transaction
```