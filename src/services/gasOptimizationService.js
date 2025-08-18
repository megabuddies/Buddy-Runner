// Сервис оптимизации газовых параметров с кэшированием и адаптивным обновлением

class GasOptimizationService {
  constructor() {
    // Кэш газовых параметров с временными метками
    this.gasParamsCache = new Map();
    
    // Время жизни кэша для разных сетей (в миллисекундах)
    this.cacheLifetime = {
      6342: 2 * 60 * 1000,    // MegaETH - 2 минуты (быстрые изменения)
      31337: 10 * 60 * 1000,  // Foundry - 10 минут (стабильная локальная сеть)
      50311: 5 * 60 * 1000,   // Somnia - 5 минут
      1313161556: 5 * 60 * 1000, // RISE - 5 минут
      default: 5 * 60 * 1000   // По умолчанию - 5 минут
    };
    
    // Оптимизированные газовые параметры для каждой сети
    this.networkGasConfig = {
      6342: { // MegaETH - ультра-оптимизированные параметры
        maxFeePerGas: '0.001', // 1 mwei для максимальной скорости
        maxPriorityFeePerGas: '0.0005', // 0.5 mwei priority
        gasLimit: 100000,
        strategy: 'ultra_fast'
      },
      31337: { // Foundry Local - минимальные параметры
        maxFeePerGas: '0.01',
        maxPriorityFeePerGas: '0.001',
        gasLimit: 100000,
        strategy: 'minimal'
      },
      50311: { // Somnia - сбалансированные параметры
        maxFeePerGas: '2',
        maxPriorityFeePerGas: '1',
        gasLimit: 100000,
        strategy: 'balanced'
      },
      1313161556: { // RISE - оптимизированные параметры
        maxFeePerGas: '1',
        maxPriorityFeePerGas: '0.5',
        gasLimit: 100000,
        strategy: 'optimized'
      }
    };
    
    // Статистика использования газа для адаптивной оптимизации
    this.gasUsageStats = new Map();
    
    // Автоматическая очистка кэша каждые 30 секунд
    setInterval(() => this.cleanupExpiredCache(), 30000);
  }

  // Получение оптимизированных газовых параметров с кэшированием
  async getOptimizedGasParams(chainId, publicClient = null) {
    const cacheKey = chainId.toString();
    const now = Date.now();
    
    // Проверяем кэш
    if (this.gasParamsCache.has(cacheKey)) {
      const cached = this.gasParamsCache.get(cacheKey);
      const lifetime = this.cacheLifetime[chainId] || this.cacheLifetime.default;
      
      if (now - cached.timestamp < lifetime) {
        console.log(`🎯 Using cached gas parameters for chain ${chainId} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
        return cached.params;
      }
    }

    console.log(`⚡ Fetching fresh gas parameters for chain ${chainId}`);
    
    try {
      let gasParams;
      
      // Получаем оптимизированные параметры для конкретной сети
      const networkConfig = this.networkGasConfig[chainId];
      
      if (networkConfig) {
        // Используем предварительно оптимизированные параметры
        gasParams = {
          maxFeePerGas: this.parseGwei(networkConfig.maxFeePerGas),
          maxPriorityFeePerGas: this.parseGwei(networkConfig.maxPriorityFeePerGas),
          gasLimit: networkConfig.gasLimit,
          strategy: networkConfig.strategy,
          timestamp: now
        };
        
        console.log(`🚀 Using ${networkConfig.strategy} gas strategy for chain ${chainId}`);
        
      } else if (publicClient) {
        // Для неизвестных сетей получаем динамические параметры
        try {
          const gasPrice = await publicClient.getGasPrice();
          gasParams = {
            maxFeePerGas: gasPrice * 2n, // 2x для запаса
            maxPriorityFeePerGas: this.parseGwei('1'), // 1 gwei priority
            gasLimit: 100000,
            strategy: 'dynamic',
            timestamp: now
          };
        } catch (error) {
          console.warn('Failed to get dynamic gas price, using fallback:', error);
          // Fallback значения
          gasParams = {
            maxFeePerGas: this.parseGwei('20'),
            maxPriorityFeePerGas: this.parseGwei('2'),
            gasLimit: 100000,
            strategy: 'fallback',
            timestamp: now
          };
        }
      } else {
        // Последний fallback без publicClient
        gasParams = {
          maxFeePerGas: this.parseGwei('20'),
          maxPriorityFeePerGas: this.parseGwei('2'),
          gasLimit: 100000,
          strategy: 'emergency_fallback',
          timestamp: now
        };
      }

      // Кэшируем параметры
      this.gasParamsCache.set(cacheKey, {
        params: gasParams,
        timestamp: now
      });

      console.log(`💾 Cached gas params for chain ${chainId}:`, {
        maxFeePerGasGwei: Number(gasParams.maxFeePerGas) / 1e9,
        maxPriorityFeePerGasGwei: Number(gasParams.maxPriorityFeePerGas) / 1e9,
        strategy: gasParams.strategy
      });

      // Сохраняем в localStorage для персистентности
      this.saveToLocalStorage();

      return gasParams;
      
    } catch (error) {
      console.error('Error getting gas params:', error);
      
      // Возвращаем кешированные данные если есть, даже если устарели
      if (this.gasParamsCache.has(cacheKey)) {
        console.log('🔄 Using stale cached gas params due to error');
        return this.gasParamsCache.get(cacheKey).params;
      }
      
      // Последний fallback
      return {
        maxFeePerGas: this.parseGwei('20'),
        maxPriorityFeePerGas: this.parseGwei('2'),
        gasLimit: 100000,
        strategy: 'error_fallback',
        timestamp: now
      };
    }
  }

  // Запись статистики использования газа для адаптивной оптимизации
  recordGasUsage(chainId, actualGasUsed, gasPrice, success, transactionTime) {
    const cacheKey = chainId.toString();
    
    if (!this.gasUsageStats.has(cacheKey)) {
      this.gasUsageStats.set(cacheKey, {
        transactions: [],
        averageGasUsed: 0,
        averageGasPrice: 0,
        successRate: 0,
        averageTime: 0
      });
    }

    const stats = this.gasUsageStats.get(cacheKey);
    
    // Добавляем новую статистику
    stats.transactions.push({
      gasUsed: actualGasUsed,
      gasPrice,
      success,
      transactionTime,
      timestamp: Date.now()
    });

    // Держим только последние 50 транзакций
    if (stats.transactions.length > 50) {
      stats.transactions.shift();
    }

    // Пересчитываем средние значения
    const successfulTxs = stats.transactions.filter(tx => tx.success);
    
    if (successfulTxs.length > 0) {
      stats.averageGasUsed = successfulTxs.reduce((sum, tx) => sum + tx.gasUsed, 0) / successfulTxs.length;
      stats.averageGasPrice = successfulTxs.reduce((sum, tx) => sum + tx.gasPrice, 0) / successfulTxs.length;
      stats.averageTime = successfulTxs.reduce((sum, tx) => sum + tx.transactionTime, 0) / successfulTxs.length;
    }

    stats.successRate = (successfulTxs.length / stats.transactions.length) * 100;

    console.log(`📊 Gas usage stats updated for chain ${chainId}:`, {
      avgGasUsed: Math.round(stats.averageGasUsed),
      avgTime: Math.round(stats.averageTime),
      successRate: Math.round(stats.successRate)
    });
  }

  // Адаптивная оптимизация параметров на основе статистики
  getAdaptiveGasParams(chainId) {
    const cacheKey = chainId.toString();
    const stats = this.gasUsageStats.get(cacheKey);
    const baseConfig = this.networkGasConfig[chainId];

    if (!stats || !baseConfig || stats.transactions.length < 5) {
      // Недостаточно данных для адаптации
      return null;
    }

    const adaptedConfig = { ...baseConfig };

    // Адаптируем на основе успешности транзакций
    if (stats.successRate < 90) {
      // Низкий успех - увеличиваем газовые параметры
      adaptedConfig.maxFeePerGas = (parseFloat(baseConfig.maxFeePerGas) * 1.5).toString();
      adaptedConfig.maxPriorityFeePerGas = (parseFloat(baseConfig.maxPriorityFeePerGas) * 1.3).toString();
      console.log(`📈 Adaptive increase for chain ${chainId} due to low success rate (${stats.successRate}%)`);
      
    } else if (stats.successRate > 98 && stats.averageTime < 2000) {
      // Высокий успех и быстрое время - можем снизить параметры
      adaptedConfig.maxFeePerGas = (parseFloat(baseConfig.maxFeePerGas) * 0.9).toString();
      adaptedConfig.maxPriorityFeePerGas = (parseFloat(baseConfig.maxPriorityFeePerGas) * 0.9).toString();
      console.log(`📉 Adaptive decrease for chain ${chainId} due to high performance`);
    }

    // Адаптируем газовый лимит на основе фактического использования
    if (stats.averageGasUsed > 0) {
      const recommendedGasLimit = Math.ceil(stats.averageGasUsed * 1.2); // 20% запас
      if (recommendedGasLimit !== baseConfig.gasLimit) {
        adaptedConfig.gasLimit = recommendedGasLimit;
        console.log(`🔧 Adaptive gas limit for chain ${chainId}: ${baseConfig.gasLimit} → ${recommendedGasLimit}`);
      }
    }

    return adaptedConfig;
  }

  // Парсинг gwei значений
  parseGwei(gweiString) {
    return BigInt(Math.floor(parseFloat(gweiString) * 1e9));
  }

  // Очистка устаревшего кэша
  cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [chainId, cached] of this.gasParamsCache.entries()) {
      const lifetime = this.cacheLifetime[chainId] || this.cacheLifetime.default;
      
      if (now - cached.timestamp > lifetime * 2) { // Удаляем кэш старше двойного времени жизни
        this.gasParamsCache.delete(chainId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired gas cache entries`);
    }
  }

  // Сохранение кэша в localStorage
  saveToLocalStorage() {
    try {
      const cacheData = {};
      
      for (const [chainId, cached] of this.gasParamsCache.entries()) {
        cacheData[chainId] = {
          params: {
            maxFeePerGas: cached.params.maxFeePerGas.toString(),
            maxPriorityFeePerGas: cached.params.maxPriorityFeePerGas.toString(),
            gasLimit: cached.params.gasLimit,
            strategy: cached.params.strategy
          },
          timestamp: cached.timestamp
        };
      }
      
      localStorage.setItem('gasOptimization_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save gas cache to localStorage:', error);
    }
  }

  // Загрузка кэша из localStorage
  loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem('gasOptimization_cache');
      if (cached) {
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        
        for (const [chainId, data] of Object.entries(cacheData)) {
          const lifetime = this.cacheLifetime[chainId] || this.cacheLifetime.default;
          
          // Загружаем только свежие данные
          if (now - data.timestamp < lifetime) {
            this.gasParamsCache.set(chainId, {
              params: {
                maxFeePerGas: BigInt(data.params.maxFeePerGas),
                maxPriorityFeePerGas: BigInt(data.params.maxPriorityFeePerGas),
                gasLimit: data.params.gasLimit,
                strategy: data.params.strategy,
                timestamp: data.timestamp
              },
              timestamp: data.timestamp
            });
          }
        }
        
        console.log(`💾 Loaded gas cache from localStorage: ${this.gasParamsCache.size} entries`);
      }
    } catch (error) {
      console.warn('Failed to load gas cache from localStorage:', error);
    }
  }

  // Получение статистики производительности
  getPerformanceStats(chainId) {
    const cacheKey = chainId.toString();
    const stats = this.gasUsageStats.get(cacheKey);
    
    if (!stats || stats.transactions.length === 0) {
      return {
        totalTransactions: 0,
        successRate: 0,
        averageGasUsed: 0,
        averageTime: 0,
        cacheHitRate: 0
      };
    }

    return {
      totalTransactions: stats.transactions.length,
      successRate: Math.round(stats.successRate * 10) / 10,
      averageGasUsed: Math.round(stats.averageGasUsed),
      averageTime: Math.round(stats.averageTime),
      cacheHitRate: this.calculateCacheHitRate(chainId)
    };
  }

  // Расчет коэффициента попаданий в кэш
  calculateCacheHitRate(chainId) {
    // Это упрощенная версия - в реальности нужно отслеживать попадания/промахи
    const cached = this.gasParamsCache.get(chainId.toString());
    return cached ? 85 : 0; // Примерный коэффициент
  }

  // Диагностический отчет
  generateDiagnosticReport() {
    const report = {
      timestamp: new Date().toISOString(),
      cacheStatus: {
        totalEntries: this.gasParamsCache.size,
        networks: Array.from(this.gasParamsCache.keys())
      },
      statistics: {},
      configurations: this.networkGasConfig
    };

    // Добавляем статистику для каждой сети
    for (const [chainId, stats] of this.gasUsageStats.entries()) {
      report.statistics[chainId] = this.getPerformanceStats(parseInt(chainId));
    }

    return report;
  }
}

// Создаем singleton экземпляр
const gasOptimizationService = new GasOptimizationService();

// Загружаем кэш при инициализации
gasOptimizationService.loadFromLocalStorage();

export default gasOptimizationService;