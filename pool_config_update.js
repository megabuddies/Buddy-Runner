// Обновленная конфигурация пулов для поддержки 10000+ транзакций
const ENHANCED_POOL_CONFIG = {
  6342: { // MegaETH - МАКСИМАЛЬНАЯ ПРОИЗВОДИТЕЛЬНОСТЬ
    poolSize: 500, // МАССИВНО УВЕЛИЧЕН для поддержки 10000+ транзакций без замедления
    refillAt: 0.1, // СВЕРХРАННЕЕ пополнение при 10% использования для опережения
    batchSize: 150, // ОГРОМНЫЙ размер пакета для массового опережающего пополнения
    maxRetries: 3,
    retryDelay: 200, // Быстрые retry для MegaETH
    burstMode: true, // Поддержка burst режима
    maxBurstSize: 20, // УВЕЛИЧЕН лимит burst для сверхдлинных сессий
    burstCooldown: 100 // МИНИМАЛЬНЫЙ cooldown для максимальной скорости
  },
  31337: { // Foundry
    poolSize: 300, // МАССИВНО УВЕЛИЧЕН для длинных игровых сессий
    refillAt: 0.15, // Сверхраннее пополнение
    batchSize: 80, // Огромный размер пакета
    maxRetries: 3,
    retryDelay: 150,
    burstMode: true,
    maxBurstSize: 15, // Увеличен лимит burst
    burstCooldown: 150 // Минимальный cooldown
  },
  50311: { // Somnia
    poolSize: 250, // МАССИВНО УВЕЛИЧЕН для длинных игровых сессий
    refillAt: 0.15, // Сверхраннее пополнение
    batchSize: 60, // Огромный размер пакета
    maxRetries: 3,
    retryDelay: 300,
    burstMode: true,
    maxBurstSize: 12, // Увеличен лимит burst
    burstCooldown: 300 // Уменьшен cooldown
  },
  1313161556: { // RISE
    poolSize: 150, // Значительно увеличен для pre-signed only
    refillAt: 0.3,
    batchSize: 40,
    maxRetries: 2,
    retryDelay: 400,
    burstMode: false,
    maxBurstSize: 5,
    burstCooldown: 1000
  },
  default: {
    poolSize: 100, // Увеличен для pre-signed only
    refillAt: 0.4,
    batchSize: 30,
    maxRetries: 2,
    retryDelay: 500,
    burstMode: false,
    maxBurstSize: 3,
    burstCooldown: 1500
  }
};

// Инструкции по обновлению:
// 1. Найдите ENHANCED_POOL_CONFIG в файле useBlockchainUtils.js
// 2. Замените всю структуру конфигурации на эту новую версию
// 3. Убедитесь, что изменения применены корректно

console.log('Новая конфигурация пулов создана для поддержки 10000+ транзакций');