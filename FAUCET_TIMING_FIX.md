# Исправление проблемы с задержкой проверки баланса после Faucet

## Проблема
В игре Mega Buddies новые пользователи получали токены через Privy (кошелек-провайдер), но игра не могла их сразу распознать. Из-за этого процесс presign (предварительная подпись транзакций) не запускался, и пользователю приходилось обновлять страницу, что создавало плохой пользовательский опыт.

**Найденная причина:**
```javascript
setTimeout(() => checkBalance(chainId), 5000);
```
Система отправляла запрос в faucet, но вместо немедленной проверки баланса после получения ответа, ждала 5 секунд. За это время presign выполнялся с текущим балансом, который равен 0 для новых пользователей.

## Реализованные решения

### 1. Убрана задержка в 5 секунд
**Файл:** `src/hooks/useBlockchainUtils.js`

**Было:**
```javascript
// Обновляем баланс через 5 секунд
setTimeout(() => checkBalance(chainId), 5000);
```

**Стало:**
```javascript
// НЕМЕДЛЕННО обновляем баланс после успешного faucet
if (result.success && !result.skipped) {
  console.log('🔄 Immediately updating balance after faucet...');
  try {
    await checkBalance(chainId);
    console.log('✅ Balance updated immediately after faucet');
  } catch (error) {
    console.warn('⚠️ Failed to update balance immediately:', error);
    // Fallback: обновляем через 3 секунды
    setTimeout(() => checkBalance(chainId), 3000);
  }
}
```

### 2. Улучшена логика в функции callFaucet
**Файл:** `src/hooks/useBlockchainUtils.js`

**Было:**
```javascript
// Асинхронно обновляем баланс через 3 секунды
setTimeout(async () => {
  try {
    await checkBalance(chainId);
    console.log('✅ Balance updated after faucet transaction');
  } catch (error) {
    console.warn('Failed to update balance after faucet:', error);
  }
}, 3000);
```

**Стало:**
```javascript
// НЕМЕДЛЕННО обновляем баланс после успешного faucet
try {
  await checkBalance(chainId);
  console.log('✅ Balance updated immediately after faucet transaction');
} catch (error) {
  console.warn('⚠️ Failed to update balance immediately, retrying in 2 seconds:', error);
  // Fallback: повторная попытка через 2 секунды
  setTimeout(async () => {
    try {
      await checkBalance(chainId);
      console.log('✅ Balance updated on retry after faucet transaction');
    } catch (retryError) {
      console.warn('❌ Failed to update balance on retry:', retryError);
    }
  }, 2000);
}
```

### 3. Добавлена автоматическая система faucet
**Файл:** `src/hooks/useBlockchainUtils.js`

Создана функция `initializeNewUser` для автоматической инициализации новых пользователей:

```javascript
const initializeNewUser = async (chainId) => {
  try {
    console.log('🚀 Initializing new user with automatic faucet...');
    const embeddedWallet = getEmbeddedWallet();
    
    if (!embeddedWallet) {
      console.warn('⚠️ No embedded wallet available for new user initialization');
      return false;
    }
    
    // Проверяем текущий баланс
    const currentBalance = await checkBalance(chainId);
    const balanceEth = parseFloat(currentBalance);
    
    // Если баланс достаточный, пропускаем faucet
    if (balanceEth >= 0.00005) {
      console.log('✅ User already has sufficient balance, skipping faucet');
      return true;
    }
    
    // Автоматически вызываем faucet для новых пользователей
    console.log('💰 New user detected, calling automatic faucet...');
    const faucetResult = await callFaucet(embeddedWallet.address, chainId);
    
    if (faucetResult.success) {
      console.log('✅ Automatic faucet completed for new user');
      
      // Немедленно обновляем баланс
      try {
        await checkBalance(chainId);
        console.log('✅ Balance updated immediately for new user');
        return true;
      } catch (error) {
        console.warn('⚠️ Failed to update balance immediately for new user:', error);
        // Fallback: обновляем через 2 секунды
        setTimeout(async () => {
          try {
            await checkBalance(chainId);
            console.log('✅ Balance updated on retry for new user');
          } catch (retryError) {
            console.warn('❌ Failed to update balance on retry for new user:', retryError);
          }
        }, 2000);
        return true;
      }
    } else {
      console.warn('⚠️ Automatic faucet failed for new user:', faucetResult);
      return false;
    }
  } catch (error) {
    console.error('❌ New user initialization failed:', error);
    return false;
  }
};
```

### 4. Улучшено автоматическое обновление баланса
**Файл:** `src/hooks/useBlockchainUtils.js`

Добавлена логика автоматического faucet в функцию `startBalanceAutoUpdate`:

```javascript
// Обновляем баланс каждые 10 секунд с автоматическим faucet
balanceUpdateInterval.current = setInterval(async () => {
  try {
    const currentBalance = await checkBalance(chainId);
    const balanceEth = parseFloat(currentBalance);
    
    // Автоматический faucet для новых пользователей (баланс < 0.00005 ETH)
    if (balanceEth < 0.00005) {
      console.log('💰 Low balance detected, triggering automatic faucet...');
      const embeddedWallet = getEmbeddedWallet();
      if (embeddedWallet) {
        try {
          const faucetResult = await callFaucet(embeddedWallet.address, chainId);
          if (faucetResult.success) {
            console.log('✅ Automatic faucet completed successfully');
            // Немедленно обновляем баланс после автоматического faucet
            setTimeout(async () => {
              try {
                await checkBalance(chainId);
                console.log('✅ Balance updated after automatic faucet');
              } catch (error) {
                console.warn('⚠️ Failed to update balance after auto-faucet:', error);
              }
            }, 1000);
          }
        } catch (faucetError) {
          console.warn('⚠️ Automatic faucet failed:', faucetError.message);
        }
      }
    }
  } catch (error) {
    console.warn('Auto balance update failed:', error);
  }
}, 10000); // 10 секунд
```

### 5. Интегрирована автоматическая инициализация в основной процесс
**Файл:** `src/hooks/useBlockchainUtils.js`

Заменили старую логику faucet на автоматическую инициализацию:

```javascript
// Если баланс меньше 0.00005 ETH, вызываем автоматическую инициализацию нового пользователя
if (parseFloat(currentBalance) < 0.00005) {
  console.log(`💰 Balance is ${currentBalance} ETH (< 0.00005), initializing new user with automatic faucet...`);
  
  // Автоматическая инициализация нового пользователя
  initializeNewUser(chainId)
    .then((initResult) => {
      if (initResult) {
        console.log('✅ New user initialization completed successfully');
        // Обновляем баланс после инициализации
        return checkBalance(chainId).then((updatedBalance) => {
          console.log(`💰 Updated balance after initialization: ${updatedBalance} ETH`);
          return updatedBalance;
        });
      } else {
        console.warn('⚠️ New user initialization failed, falling back to manual faucet...');
        // Fallback логика...
      }
    })
    .catch(error => {
      console.error('❌ New user initialization error:', error);
      return currentBalance;
    });
}
```

## Поток работы после исправлений

### Для новых пользователей:
1. **Пользователь регистрируется** → создается embedded wallet
2. **Проверяется баланс** → если баланс = 0, запускается автоматическая инициализация
3. **Вызывается faucet endpoint** → отправка средств на embedded wallet
4. **Немедленно обновляется баланс** → без задержки в 5 секунд
5. **Запускается presign** → с актуальным балансом
6. **Игра готова** → пользователь может играть сразу

### Для существующих пользователей:
1. **Проверяется баланс** → если баланс достаточный, пропускается faucet
2. **Запускается presign** → с текущим балансом
3. **Игра готова** → пользователь может играть сразу

## Отладочные функции

В development режиме доступны функции для отладки:

```javascript
// Автоматическая инициализация нового пользователя
window.gameInitializeNewUser(chainId)

// Ручной вызов faucet
window.gameCallFaucet(address, chainId)

// Получение embedded wallet
window.gameGetEmbeddedWallet()

// Принудительное создание embedded wallet
window.gameEnsureEmbeddedWallet()
```

## Результат

После внедрения этих исправлений:

1. ✅ **Убрана задержка в 5 секунд** - баланс обновляется немедленно после faucet
2. ✅ **Добавлена автоматическая система faucet** - новые пользователи получают токены автоматически
3. ✅ **Улучшен пользовательский опыт** - игра готова сразу после получения токенов
4. ✅ **Добавлены fallback механизмы** - система работает даже при ошибках
5. ✅ **Улучшена отладка** - подробные логи для отслеживания процесса

Теперь новые пользователи могут начать играть сразу после регистрации, без необходимости обновлять страницу или ждать задержки.