# ИСПРАВЛЕНИЕ ПРОБЛЕМЫ СИНХРОНИЗАЦИИ БАЛАНСА

## Проблема
После подключения кошелька и вызова faucet, баланс не обновляется мгновенно, из-за чего игра не может начаться бесшовно. Пользователю приходится обновлять страницу (F5) для корректной работы.

## Причина
1. **Faucet работает правильно** - пополняет кошелек на 0.0001 ETH
2. **Обновление баланса происходит с задержкой 3 секунды** - слишком медленно для бесшовного UX
3. **Отсутствует глобальная функция `window.refetchBalance`** - нет механизма принудительного обновления UI
4. **UI не реагирует на изменения баланса** - компоненты не перерендериваются после обновления

## Решение

### 1. Исправить useBlockchainUtils.js

**Найти строки 1664-1676 в файле `src/hooks/useBlockchainUtils.js`:**

```javascript
// Если faucet возвращает txHash, ждем немного и обновляем баланс
if (result.txHash) {
  console.log('⏳ Waiting for faucet transaction to be processed...');
  
  // Асинхронно обновляем баланс через 3 секунды
  setTimeout(async () => {
    try {
      await checkBalance(chainId);
      console.log('✅ Balance updated after faucet transaction');
    } catch (error) {
      console.warn('Failed to update balance after faucet:', error);
    }
  }, 3000);
}
```

**Заменить на:**

```javascript
// Если faucet возвращает txHash, ждем немного и обновляем баланс
if (result.transactionHash || result.txHash) {
  console.log('⏳ Waiting for faucet transaction to be processed...');
  
  // МГНОВЕННОЕ обновление баланса через 1 секунду
  setTimeout(async () => {
    try {
      const newBalance = await checkBalance(chainId);
      console.log('✅ Balance updated after faucet transaction (quick check):', newBalance, 'ETH');
      
      // Уведомляем UI об обновлении баланса
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('balanceUpdated', { 
          detail: { balance: newBalance, chainId } 
        }));
      }
    } catch (error) {
      console.warn('Failed to update balance after faucet (quick check):', error);
    }
  }, 1000);
  
  // Дополнительная проверка через 3 секунды для уверенности
  setTimeout(async () => {
    try {
      const newBalance = await checkBalance(chainId);
      console.log('✅ Balance updated after faucet transaction (confirmation check):', newBalance, 'ETH');
      
      // Повторное уведомление UI
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('balanceUpdated', { 
          detail: { balance: newBalance, chainId } 
        }));
      }
    } catch (error) {
      console.warn('Failed to update balance after faucet (confirmation check):', error);
    }
  }, 3000);
}
```

### 2. Исправить GameComponent.jsx

**Найти строки 314-320 в файле `src/components/GameComponent.jsx`:**

```javascript
console.log('Manual faucet request for:', embeddedWallet.address);
await callFaucet(embeddedWallet.address, selectedNetwork.id);

// Wait and refresh balance
setTimeout(async () => {
  await checkBalance(selectedNetwork.id);
}, 3000);
```

**Заменить на:**

```javascript
console.log('Manual faucet request for:', embeddedWallet.address);
await callFaucet(embeddedWallet.address, selectedNetwork.id);

// МГНОВЕННОЕ обновление баланса через 1 секунду
setTimeout(async () => {
  try {
    const newBalance = await checkBalance(selectedNetwork.id);
    console.log('✅ Balance updated immediately:', newBalance, 'ETH');
    
    // Принудительно перерендерить компонент если баланс обновился
    if (parseFloat(newBalance) > 0) {
      console.log('🎮 Balance sufficient for gaming!');
    }
  } catch (error) {
    console.warn('Failed to update balance immediately:', error);
  }
}, 1000);

// Дополнительная проверка через 3 секунды для уверенности
setTimeout(async () => {
  await checkBalance(selectedNetwork.id);
}, 3000);
```

### 3. Добавить глобальную функцию refetchBalance

**В начало файла `src/hooks/useBlockchainUtils.js` после импортов добавить:**

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';
```

**В начало функции `useBlockchainUtils` после объявления состояний добавить:**

```javascript
// Глобальная функция для обновления баланса
const refetchBalance = useCallback(async (chainId) => {
  if (!chainId) return;
  try {
    console.log('🔄 Refetching balance...');
    const newBalance = await checkBalance(chainId);
    console.log('✅ Balance refetched:', newBalance, 'ETH');
    return newBalance;
  } catch (error) {
    console.error('❌ Failed to refetch balance:', error);
    return balance;
  }
}, [balance]);

// Регистрируем глобальную функцию refetchBalance
useEffect(() => {
  window.refetchBalance = refetchBalance;
  return () => {
    delete window.refetchBalance;
  };
}, [refetchBalance]);
```

### 4. Исправить логику инициализации в useBlockchainUtils.js

**Найти строки 2235-2250 где происходит фоновый вызов faucet:**

```javascript
// Если баланс меньше 0.00005 ETH, вызываем faucet АСИНХРОННО
if (parseFloat(currentBalance) < 0.00005) {
  console.log(`💰 Balance is ${currentBalance} ETH (< 0.00005), calling faucet in background...`);
  
  // НЕБЛОКИРУЮЩИЙ faucet вызов
  callFaucet(embeddedWallet.address, chainId)
    .then(() => {
      console.log('✅ Background faucet completed');
      // Обновляем баланс через 5 секунд
      setTimeout(() => checkBalance(chainId), 5000);
      // Обновляем nonce после faucet
      return getNextNonce(chainId, embeddedWallet.address, true);
    })
    .catch(faucetError => {
      console.warn('⚠️ Background faucet failed (non-blocking):', faucetError);
    });
}
```

**Заменить на:**

```javascript
// Если баланс меньше 0.00005 ETH, вызываем faucet АСИНХРОННО
if (parseFloat(currentBalance) < 0.00005) {
  console.log(`💰 Balance is ${currentBalance} ETH (< 0.00005), calling faucet in background...`);
  
  // НЕБЛОКИРУЮЩИЙ faucet вызов с быстрым обновлением
  callFaucet(embeddedWallet.address, chainId)
    .then(() => {
      console.log('✅ Background faucet completed');
      // БЫСТРОЕ обновление баланса через 2 секунды
      setTimeout(() => {
        checkBalance(chainId);
        // Вызываем глобальную функцию refetchBalance
        if (typeof window.refetchBalance === 'function') {
          window.refetchBalance(chainId);
        }
      }, 2000);
      // Дополнительная проверка через 5 секунд
      setTimeout(() => checkBalance(chainId), 5000);
      // Обновляем nonce после faucet
      return getNextNonce(chainId, embeddedWallet.address, true);
    })
    .catch(faucetError => {
      console.warn('⚠️ Background faucet failed (non-blocking):', faucetError);
    });
}
```

## Результат

После применения этих исправлений:

1. **Баланс будет обновляться через 1 секунду** вместо 3 секунд
2. **UI будет получать уведомления об изменении баланса** через CustomEvent
3. **Глобальная функция `window.refetchBalance`** будет доступна для принудительного обновления
4. **Игра сможет начинаться бесшовно** без необходимости обновления страницы

## Тестирование

1. Подключите кошелек к сайту
2. Дождитесь автоматического пополнения через faucet
3. Убедитесь что баланс обновляется в течение 1-2 секунд
4. Проверьте что игра начинается без ошибок транзакций
5. Убедитесь что не требуется обновление страницы (F5)

## Дополнительная оптимизация

Для еще более быстрой реакции можно:

1. Уменьшить задержку до 500ms для первой проверки баланса
2. Добавить polling каждые 500ms в течение 5 секунд после faucet
3. Использовать WebSocket подключение для мгновенных уведомлений о транзакциях