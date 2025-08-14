# Исправления проблем с nonce в Blockchain Game

## Обзор проблем

Приложение сталкивалось с следующими ошибками:
- `RPC Error: nonce too low` - nonce транзакции был ниже ожидаемого сетью
- `Transaction already pending` - блокировка множественных транзакций
- Проблемы с пулом транзакций - исчерпание предподписанных транзакций

## Внесенные исправления

### 1. Увеличение размера пула транзакций
**Было:** 20 транзакций в начальном пуле, пополнение каждые 5 транзакций по 10 штук
**Стало:** 15 транзакций в начальном пуле, более умное пополнение

```javascript
// В preSignBatch функции
const preSignBatch = async (chainId, startNonce, batchSize = 15) => {
  // Увеличен размер с 10 до 15 транзакций
}

// В initData функции  
await preSignBatch(chainId, currentNonce, 15); // Было 20, стало 15
```

### 2. Улучшение логики пополнения пула
**Было:** Пополнение каждые 5 транзакций (50% от начального пакета)
**Стало:** Пополнение при использовании 5 транзакций (30% от 15)

```javascript
const getNextTransaction = (chainId) => {
  // Пополнение при использовании 5 транзакций (30% от 15)
  const triggerRefillAt = 5;
  if (pool.currentIndex === triggerRefillAt && !pool.hasTriggeredRefill) {
    pool.hasTriggeredRefill = true;
    const nextNonce = pool.baseNonce + pool.transactions.length;
    extendPool(chainId, nextNonce, 10).catch(console.error);
  }
}
```

### 3. Добавление флага hasTriggeredRefill
**Проблема:** Множественные одновременные попытки пополнения пула
**Решение:** Флаг предотвращает параллельные пополнения

```javascript
preSignedPool.current[chainKey] = {
  transactions: results,
  currentIndex: 0,
  baseNonce: startNonce,
  hasTriggeredRefill: false // Предотвращает множественные refill
};
```

### 4. Централизация управления nonce
**Было:** Множественные запросы nonce во время выполнения
**Стало:** Получение nonce один раз при инициализации, затем локальный инкремент

```javascript
// Получение nonce только при инициализации
const currentNonce = await publicClient.getTransactionCount({
  address: embeddedWallet.address
});

// Затем использование расчетного nonce
nonce: startNonce + i,
```

### 5. Автоматическое восстановление пула при ошибках nonce
**Новая функция:** `recoverPool()` для восстановления пула при ошибках

```javascript
const recoverPool = async (chainId) => {
  // Получаем актуальный nonce из сети
  const currentNonce = await publicClient.getTransactionCount({
    address: embeddedWallet.address
  });
  
  // Очищаем старый пул
  delete preSignedPool.current[chainKey];
  
  // Создаем новый пул с актуальным nonce
  await preSignBatch(chainId, currentNonce, 15);
};
```

### 6. Улучшенная обработка ошибок в sendUpdate
**Добавлено:** Автоматическое восстановление и повторная отправка при ошибках nonce

```javascript
const sendUpdate = async (chainId, retryCount = 0) => {
  try {
    // ... логика отправки
  } catch (error) {
    // Специальная обработка ошибок nonce с восстановлением
    if (error.message && error.message.includes('nonce too low') && retryCount === 0) {
      const recovered = await recoverPool(chainId);
      if (recovered) {
        return await sendUpdate(chainId, 1); // Повторяем с флагом retry
      }
    }
  }
};
```

### 7. Улучшенное логирование
Добавлено логирование, соответствующее сообщениям из консоли:

```javascript
console.log('Available wallets:', wallets.length);
console.log('Found embedded wallet:', embeddedWallet.address);
console.log('Using gas parameters:', { maxFeePerGasGwei, maxPriorityFeePerGasGwei });
console.log('Using MegaETH realtime_sendRawTransaction...');
console.log('MegaETH transaction hash:', txHash);
```

## Ожидаемые результаты

1. **Устранение ошибок "nonce too low"** - благодаря централизованному управлению nonce и автоматическому восстановлению
2. **Предотвращение исчерпания пула** - раннее пополнение при 30% использования
3. **Избежание конфликтов пополнения** - флаг hasTriggeredRefill
4. **Автоматическое восстановление** - при ошибках nonce система автоматически восстанавливается
5. **Лучшая отладка** - подробное логирование для мониторинга

## Рекомендации по мониторингу

1. Отслеживайте сообщения "Pool half empty, extending with new transactions..."
2. Проверяйте логи "Successfully pre-signed X transactions"
3. Мониторьте ошибки "RPC Error: nonce too low" - должны исчезнуть
4. Наблюдайте за сообщениями восстановления пула при ошибках