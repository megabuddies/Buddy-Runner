# Руководство по решению проблем с блокчейном

## Обзор улучшений

Данное руководство описывает решения для проблем с RPC timeout'ами и другими проблемами производительности блокчейна, основанные на анализе ваших логов.

### Ключевые улучшения

1. **Система fallback RPC endpoints** - автоматическое переключение между RPC серверами
2. **Circuit breaker pattern** - защита от каскадных сбоев
3. **Burst mode для транзакций** - оптимизация для высокочастотных операций
4. **Адаптивные таймауты** - динамическая настройка времени ожидания
5. **Улучшенный retry механизм** - умное повторение запросов с экспоненциальным backoff

## Типичные проблемы и решения

### 1. RPC Timeout'ы ("context deadline exceeded")

**Проблема:** Частые ошибки `RPC Error: permanent error forwarding request context deadline exceeded`

**Причины:**
- Перегрузка RPC сервера
- Медленные сетевые соединения
- Неоптимальные параметры timeout'ов

**Решения:**

#### Автоматические (уже реализованы):
```javascript
// Адаптивные таймауты для разных сетей
connectionTimeouts: {
  initial: 30000,  // MegaETH: 30 секунд для первоначального соединения
  retry: 15000,    // 15 секунд для повторных попыток
  request: 45000   // 45 секунд для отдельных запросов
}

// Система fallback endpoints
fallbackRpcUrls: [
  'https://carrot.megaeth.com/rpc',
  // Добавьте дополнительные endpoints если доступны
]
```

#### Ручные настройки:
1. **Увеличение timeout'ов** (если проблема не решается автоматически):
   ```javascript
   // В src/hooks/useBlockchainUtils.js
   connectionTimeouts: {
     initial: 60000,  // Увеличить до 60 секунд
     retry: 30000,    
     request: 90000   
   }
   ```

2. **Добавление альтернативных RPC endpoints**:
   ```javascript
   fallbackRpcUrls: [
     'https://carrot.megaeth.com/rpc',
     'https://alternative-rpc-url-1.com',
     'https://alternative-rpc-url-2.com'
   ]
   ```

### 2. Rate Limiting

**Проблема:** Слишком частые запросы вызывают rate limiting от RPC провайдера

**Решения:**

#### Burst Mode (автоматически активен):
```javascript
// Конфигурация burst режима для MegaETH
burstMode: true,
maxBurstSize: 3,      // Максимум 3 транзакции в burst
burstCooldown: 1000   // 1 секунда cooldown между burst'ами
```

#### Ручная настройка:
```javascript
// Уменьшение агрессивности для проблемных сетей
6342: { // MegaETH
  maxBurstSize: 1,      // Только 1 транзакция за раз
  burstCooldown: 2000   // 2 секунды между транзакциями
}
```

### 3. Nonce Management проблемы

**Проблема:** Ошибки "nonce too low" или "replacement transaction underpriced"

**Решения:**

#### Автоматические:
- Централизованный nonce manager
- Автоматическая синхронизация с сетью
- Принудительное обновление при ошибках

#### Ручные действия:
1. **Очистка кэша** (в консоли браузера):
   ```javascript
   // Очистить все кэши
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Принудительная синхронизация nonce**:
   ```javascript
   // В useBlockchainUtils.js добавить логирование
   console.log('Current nonce:', manager.currentNonce);
   console.log('Network nonce:', networkNonce);
   ```

### 4. Низкий баланс

**Проблема:** Недостаточно средств для отправки транзакций

**Решения:**

#### Автоматические:
- Проверка баланса при инициализации
- Автоматический вызов faucet при нулевом балансе
- Предупреждения при низком балансе

#### Ручные действия:
1. **Пополнение через faucet**:
   - Система автоматически вызывает faucet
   - Если не работает, использовать внешние faucet'ы

2. **Проверка адреса кошелька**:
   ```javascript
   // В консоли браузера
   console.log('Wallet address:', embeddedWallet.address);
   ```

## Мониторинг и диагностика

### Ключевые метрики в консоли

1. **RPC Health Status**:
   ```
   [PERF-6342] RPC endpoint health: healthy/unhealthy
   Circuit breaker state: CLOSED/OPEN/HALF_OPEN
   ```

2. **Transaction Pool Status**:
   ```
   Pool 50% empty, extending with new transactions...
   Successfully pre-signed 20 transactions
   ```

3. **Performance Metrics**:
   ```
   Response time: 1250ms
   Success rate: 95%
   Burst mode: active/inactive
   ```

### Диагностические команды

В консоли браузера можно выполнить:

```javascript
// Проверка состояния системы
window.blockchainDebug = {
  getRPCHealth: (chainId) => rpcHealthStatus.current[chainId],
  getCircuitBreaker: (chainId) => circuitBreakers.current[chainId],
  getTransactionPool: (chainId) => preSignedPool.current[chainId],
  getBurstState: (chainId) => burstState.current[chainId]
};

// Использование
window.blockchainDebug.getRPCHealth(6342);
```

## Оптимизация производительности

### Для высокочастотного использования

1. **Увеличение размера пула**:
   ```javascript
   poolSize: 30,     // Больше предподписанных транзакций
   refillAt: 0.3,    // Раннее пополнение
   batchSize: 10     // Больший размер пакета
   ```

2. **Агрессивный burst mode**:
   ```javascript
   maxBurstSize: 5,      // Больше транзакций в burst
   burstCooldown: 500    // Меньший cooldown
   ```

### Для стабильности

1. **Консервативные настройки**:
   ```javascript
   poolSize: 10,
   maxBurstSize: 1,
   burstCooldown: 3000,
   maxRetries: 5
   ```

2. **Увеличенные таймауты**:
   ```javascript
   connectionTimeouts: {
     initial: 45000,
     retry: 30000,
     request: 60000
   }
   ```

## Troubleshooting Checklist

### При проблемах с транзакциями:

- [ ] Проверить баланс кошелька
- [ ] Убедиться, что RPC endpoint доступен
- [ ] Проверить состояние circuit breaker
- [ ] Посмотреть логи в консоли браузера
- [ ] Очистить кэш браузера если необходимо
- [ ] Попробовать переключиться на другую сеть и обратно

### При медленной работе:

- [ ] Проверить размер transaction pool
- [ ] Убедиться, что burst mode активен (для поддерживаемых сетей)
- [ ] Проверить время отклика RPC endpoints
- [ ] Рассмотреть увеличение размера пула транзакций

### При частых ошибках:

- [ ] Проверить состояние circuit breaker
- [ ] Убедиться, что fallback endpoints настроены
- [ ] Проверить настройки retry логики
- [ ] Рассмотреть включение fallback режима

## Контакты для поддержки

При возникновении проблем, которые не решаются данным руководством:

1. Предоставьте логи консоли браузера
2. Укажите конкретную сеть (chainId)
3. Опишите последовательность действий, приводящих к проблеме
4. Включите информацию о состоянии системы (можно получить через `window.blockchainDebug`)

## Дополнительные ресурсы

- [MegaETH Documentation](https://docs.megaeth.systems/)
- [Viem Documentation](https://viem.sh/)
- [Privy Documentation](https://docs.privy.io/)