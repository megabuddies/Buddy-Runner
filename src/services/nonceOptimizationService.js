// Сервис оптимизации управления nonce для предподписанных транзакций

class NonceOptimizationService {
  constructor() {
    // Централизованное управление nonce для каждого адреса на каждой сети
    this.nonceManagers = new Map();
    
    // Резервирование nonce для предподписанных транзакций
    this.reservedNonces = new Map();
    
    // Кэш nonce с временными метками для минимизации RPC вызовов
    this.nonceCache = new Map();
    
    // Время жизни кэша nonce (в миллисекундах)
    this.cacheLifetime = {
      6342: 30 * 1000,    // MegaETH - 30 секунд (быстрые блоки)
      31337: 60 * 1000,   // Foundry - 1 минута (контролируемая среда)
      50311: 45 * 1000,   // Somnia - 45 секунд
      1313161556: 45 * 1000, // RISE - 45 секунд
      default: 45 * 1000   // По умолчанию - 45 секунд
    };
    
    // Конфигурация для разных стратегий управления nonce
    this.strategies = {
      'pre_signed_pool': {
        reserveAhead: 100,     // Резервируем 100 nonce вперед для пула
        refreshThreshold: 0.3,  // Обновляем когда использовано 30%
        maxPendingNonces: 150   // Максимум pending nonces
      },
      'realtime': {
        reserveAhead: 5,       // Резервируем 5 nonce для realtime
        refreshThreshold: 0.6,  // Обновляем когда использовано 60%
        maxPendingNonces: 10    // Максимум pending nonces для realtime
      },
      'hybrid': {
        reserveAhead: 50,      // Гибридный режим
        refreshThreshold: 0.4,
        maxPendingNonces: 75
      }
    };
    
    // Статистика использования nonce для оптимизации
    this.usageStats = new Map();
    
    // Автоматическая очистка устаревших данных каждые 2 минуты
    setInterval(() => this.cleanupExpiredData(), 2 * 60 * 1000);
  }

  // Получение менеджера nonce для конкретной сети и адреса
  getNonceManager(chainId, address) {
    const key = `${chainId}-${address.toLowerCase()}`;
    
    if (!this.nonceManagers.has(key)) {
      this.nonceManagers.set(key, {
        chainId,
        address: address.toLowerCase(),
        currentNonce: null,
        pendingNonce: null,
        reservedNonces: new Set(),
        lastUpdate: 0,
        isUpdating: false,
        strategy: 'pre_signed_pool', // По умолчанию используем стратегию пула
        totalAllocated: 0,
        totalUsed: 0
      });
    }
    
    return this.nonceManagers.get(key);
  }

  // Инициализация nonce manager с актуальным nonce из сети
  async initializeNonceManager(chainId, address, publicClient, strategy = 'pre_signed_pool') {
    const manager = this.getNonceManager(chainId, address);
    const cacheKey = `${chainId}-${address.toLowerCase()}`;
    
    console.log(`🎯 Initializing nonce manager for ${address} on chain ${chainId} with ${strategy} strategy`);
    
    try {
      manager.isUpdating = true;
      manager.strategy = strategy;
      
      // Получаем актуальный nonce из сети
      const [latestNonce, pendingNonce] = await Promise.all([
        publicClient.getTransactionCount({ address, blockTag: 'latest' }),
        publicClient.getTransactionCount({ address, blockTag: 'pending' })
      ]);
      
      const networkNonce = Math.max(latestNonce, pendingNonce);
      
      manager.currentNonce = networkNonce;
      manager.pendingNonce = networkNonce;
      manager.lastUpdate = Date.now();
      manager.totalAllocated = networkNonce;
      
      // Кэшируем nonce
      this.nonceCache.set(cacheKey, {
        nonce: networkNonce,
        timestamp: Date.now()
      });
      
      console.log(`✅ Nonce manager initialized: current=${networkNonce}, strategy=${strategy}`);
      
      // Инициализируем статистику
      if (!this.usageStats.has(cacheKey)) {
        this.usageStats.set(cacheKey, {
          allocations: [],
          averageAllocationTime: 0,
          cacheHitRate: 0,
          totalAllocations: 0,
          successfulAllocations: 0
        });
      }
      
      return networkNonce;
      
    } catch (error) {
      console.error('❌ Error initializing nonce manager:', error);
      
      // Fallback: используем кэшированное значение если есть
      const cached = this.nonceCache.get(cacheKey);
      if (cached) {
        manager.currentNonce = cached.nonce;
        manager.pendingNonce = cached.nonce;
        console.log(`🔄 Using cached nonce ${cached.nonce} due to initialization error`);
        return cached.nonce;
      }
      
      // Последний fallback
      manager.currentNonce = 0;
      manager.pendingNonce = 0;
      console.warn(`⚠️ Initialized with nonce 0 due to errors`);
      return 0;
      
    } finally {
      manager.isUpdating = false;
    }
  }

  // Резервирование диапазона nonce для предподписанных транзакций
  async reserveNonceRange(chainId, address, count, publicClient = null) {
    const manager = this.getNonceManager(chainId, address);
    const strategy = this.strategies[manager.strategy];
    
    console.log(`📝 Reserving ${count} nonces for pre-signed transactions (strategy: ${manager.strategy})`);
    
    // Если менеджер не инициализирован, инициализируем его
    if (manager.currentNonce === null && publicClient) {
      await this.initializeNonceManager(chainId, address, publicClient, manager.strategy);
    }
    
    if (manager.currentNonce === null) {
      throw new Error('Nonce manager not initialized and no publicClient provided');
    }
    
    // Проверяем, не превышаем ли лимит pending nonces
    const currentPending = manager.pendingNonce - manager.currentNonce;
    if (currentPending + count > strategy.maxPendingNonces) {
      console.warn(`⚠️ Reservation would exceed max pending nonces (${currentPending + count} > ${strategy.maxPendingNonces})`);
      // Уменьшаем количество до допустимого лимита
      count = Math.max(0, strategy.maxPendingNonces - currentPending);
      if (count === 0) {
        throw new Error('Cannot reserve nonces: pending limit exceeded');
      }
    }
    
    const startNonce = manager.pendingNonce;
    const endNonce = startNonce + count;
    
    // Резервируем диапазон nonces
    const reservedRange = [];
    for (let i = startNonce; i < endNonce; i++) {
      manager.reservedNonces.add(i);
      reservedRange.push(i);
    }
    
    // Обновляем pending nonce
    manager.pendingNonce = endNonce;
    manager.totalAllocated += count;
    
    // Записываем статистику
    const stats = this.usageStats.get(`${chainId}-${address.toLowerCase()}`);
    if (stats) {
      stats.totalAllocations++;
      stats.successfulAllocations++;
      stats.allocations.push({
        count,
        startNonce,
        timestamp: Date.now(),
        type: 'batch_reservation'
      });
      
      // Держим только последние 100 аллокаций
      if (stats.allocations.length > 100) {
        stats.allocations.shift();
      }
    }
    
    console.log(`✅ Reserved nonces ${startNonce}-${endNonce - 1} (${count} total)`);
    console.log(`📊 Nonce status: current=${manager.currentNonce}, pending=${manager.pendingNonce}, reserved=${manager.reservedNonces.size}`);
    
    return {
      startNonce,
      endNonce: endNonce - 1,
      count,
      reservedNonces: reservedRange
    };
  }

  // Получение следующего доступного nonce (для realtime транзакций)
  async getNextNonce(chainId, address, publicClient = null, forceRefresh = false) {
    const manager = this.getNonceManager(chainId, address);
    const cacheKey = `${chainId}-${address.toLowerCase()}`;
    
    // Если менеджер не инициализирован, инициализируем его
    if (manager.currentNonce === null && publicClient) {
      return await this.initializeNonceManager(chainId, address, publicClient, 'realtime');
    }
    
    // Проверяем нужно ли обновить nonce
    const now = Date.now();
    const cacheLifetime = this.cacheLifetime[chainId] || this.cacheLifetime.default;
    const shouldRefresh = forceRefresh || 
                         (now - manager.lastUpdate) > cacheLifetime ||
                         manager.currentNonce === null;
    
    if (shouldRefresh && publicClient && !manager.isUpdating) {
      await this.refreshNonceFromNetwork(chainId, address, publicClient);
    }
    
    if (manager.currentNonce === null) {
      throw new Error('Nonce manager not available and cannot refresh from network');
    }
    
    // Выделяем следующий nonce
    const nextNonce = manager.pendingNonce;
    manager.pendingNonce += 1;
    manager.totalAllocated += 1;
    
    // Записываем статистику
    const stats = this.usageStats.get(cacheKey);
    if (stats) {
      stats.totalAllocations++;
      stats.successfulAllocations++;
      stats.allocations.push({
        nonce: nextNonce,
        timestamp: now,
        type: 'single_allocation'
      });
    }
    
    console.log(`🎯 Allocated nonce ${nextNonce} for realtime transaction`);
    
    return nextNonce;
  }

  // Обновление nonce из сети
  async refreshNonceFromNetwork(chainId, address, publicClient) {
    const manager = this.getNonceManager(chainId, address);
    const cacheKey = `${chainId}-${address.toLowerCase()}`;
    
    if (manager.isUpdating) {
      // Ждем завершения текущего обновления
      let waitTime = 0;
      while (manager.isUpdating && waitTime < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitTime += 100;
      }
      return;
    }
    
    try {
      manager.isUpdating = true;
      
      const [latestNonce, pendingNonce] = await Promise.all([
        publicClient.getTransactionCount({ address, blockTag: 'latest' }),
        publicClient.getTransactionCount({ address, blockTag: 'pending' })
      ]);
      
      const networkNonce = Math.max(latestNonce, pendingNonce);
      const previousNonce = manager.currentNonce;
      
      // Обновляем только если сетевой nonce больше нашего текущего
      if (networkNonce > manager.currentNonce) {
        manager.currentNonce = networkNonce;
        
        // Если pending nonce меньше сетевого, обновляем его тоже
        if (manager.pendingNonce < networkNonce) {
          manager.pendingNonce = networkNonce;
        }
        
        // Очищаем устаревшие резервирования
        manager.reservedNonces.forEach(nonce => {
          if (nonce < networkNonce) {
            manager.reservedNonces.delete(nonce);
          }
        });
        
        console.log(`🔄 Nonce refreshed for ${address} on chain ${chainId}: ${previousNonce} → ${networkNonce}`);
        
      } else {
        console.log(`🔄 Nonce up to date for ${address} on chain ${chainId}: ${networkNonce}`);
      }
      
      manager.lastUpdate = Date.now();
      
      // Обновляем кэш
      this.nonceCache.set(cacheKey, {
        nonce: networkNonce,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error refreshing nonce from network:', error);
      
      // Используем кэшированное значение при ошибке
      const cached = this.nonceCache.get(cacheKey);
      if (cached && manager.currentNonce < cached.nonce) {
        manager.currentNonce = cached.nonce;
        manager.pendingNonce = Math.max(manager.pendingNonce, cached.nonce);
        console.log(`🔄 Using cached nonce ${cached.nonce} due to network error`);
      }
      
    } finally {
      manager.isUpdating = false;
    }
  }

  // Подтверждение использования nonce (когда транзакция подтверждена)
  confirmNonceUsage(chainId, address, nonce) {
    const manager = this.getNonceManager(chainId, address);
    
    // Удаляем из резервированных
    manager.reservedNonces.delete(nonce);
    
    // Обновляем статистику
    manager.totalUsed += 1;
    
    // Если это самый старый pending nonce, обновляем current
    if (nonce === manager.currentNonce) {
      manager.currentNonce += 1;
    }
    
    console.log(`✅ Confirmed nonce usage: ${nonce}`);
  }

  // Освобождение неиспользованного nonce (при ошибке транзакции)
  releaseNonce(chainId, address, nonce) {
    const manager = this.getNonceManager(chainId, address);
    
    // Удаляем из резервированных
    manager.reservedNonces.delete(nonce);
    
    // Если это был последний pending nonce, уменьшаем pending
    if (nonce === manager.pendingNonce - 1) {
      manager.pendingNonce -= 1;
    }
    
    console.log(`🔄 Released unused nonce: ${nonce}`);
  }

  // Получение статуса nonce manager
  getNonceStatus(chainId, address) {
    const manager = this.getNonceManager(chainId, address);
    const stats = this.usageStats.get(`${chainId}-${address.toLowerCase()}`);
    
    return {
      initialized: manager.currentNonce !== null,
      currentNonce: manager.currentNonce,
      pendingNonce: manager.pendingNonce,
      reservedCount: manager.reservedNonces.size,
      pendingCount: manager.currentNonce !== null ? manager.pendingNonce - manager.currentNonce : 0,
      strategy: manager.strategy,
      lastUpdate: new Date(manager.lastUpdate).toISOString(),
      isUpdating: manager.isUpdating,
      totalAllocated: manager.totalAllocated,
      totalUsed: manager.totalUsed,
      efficiency: manager.totalAllocated > 0 ? (manager.totalUsed / manager.totalAllocated * 100).toFixed(1) : 0,
      statistics: stats ? {
        totalAllocations: stats.totalAllocations,
        successfulAllocations: stats.successfulAllocations,
        successRate: (stats.successfulAllocations / stats.totalAllocations * 100).toFixed(1)
      } : null
    };
  }

  // Переключение стратегии управления nonce
  setStrategy(chainId, address, strategy) {
    const manager = this.getNonceManager(chainId, address);
    
    if (!this.strategies[strategy]) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }
    
    const oldStrategy = manager.strategy;
    manager.strategy = strategy;
    
    console.log(`🔄 Nonce strategy changed for ${address} on chain ${chainId}: ${oldStrategy} → ${strategy}`);
    
    return this.strategies[strategy];
  }

  // Очистка устаревших данных
  cleanupExpiredData() {
    const now = Date.now();
    let cleanedManagers = 0;
    let cleanedCache = 0;
    
    // Очистка устаревшего кэша
    for (const [key, cached] of this.nonceCache.entries()) {
      const [chainId] = key.split('-');
      const lifetime = this.cacheLifetime[chainId] || this.cacheLifetime.default;
      
      if (now - cached.timestamp > lifetime * 3) { // Удаляем кэш старше тройного времени жизни
        this.nonceCache.delete(key);
        cleanedCache++;
      }
    }
    
    // Очистка неактивных менеджеров
    for (const [key, manager] of this.nonceManagers.entries()) {
      if (now - manager.lastUpdate > 30 * 60 * 1000) { // 30 минут неактивности
        this.nonceManagers.delete(key);
        this.usageStats.delete(key);
        cleanedManagers++;
      }
    }
    
    if (cleanedCache > 0 || cleanedManagers > 0) {
      console.log(`🧹 Cleanup completed: ${cleanedCache} cache entries, ${cleanedManagers} inactive managers`);
    }
  }

  // Диагностический отчет
  generateDiagnosticReport() {
    const report = {
      timestamp: new Date().toISOString(),
      managersCount: this.nonceManagers.size,
      cacheSize: this.nonceCache.size,
      strategies: Object.keys(this.strategies),
      managers: {},
      globalStats: {
        totalAllocations: 0,
        totalUsed: 0,
        activeManagers: 0
      }
    };
    
    // Статистика по каждому менеджеру
    for (const [key, manager] of this.nonceManagers.entries()) {
      const [chainId, address] = key.split('-');
      const status = this.getNonceStatus(parseInt(chainId), address);
      
      report.managers[key] = status;
      report.globalStats.totalAllocations += manager.totalAllocated;
      report.globalStats.totalUsed += manager.totalUsed;
      
      if (manager.currentNonce !== null) {
        report.globalStats.activeManagers++;
      }
    }
    
    return report;
  }

  // Сброс менеджера (для тестирования или восстановления)
  resetManager(chainId, address) {
    const key = `${chainId}-${address.toLowerCase()}`;
    
    this.nonceManagers.delete(key);
    this.nonceCache.delete(key);
    this.usageStats.delete(key);
    
    console.log(`🔄 Reset nonce manager for ${address} on chain ${chainId}`);
  }
}

// Создаем singleton экземпляр
const nonceOptimizationService = new NonceOptimizationService();

export default nonceOptimizationService;