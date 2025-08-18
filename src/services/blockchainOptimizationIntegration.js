// Интеграционный сервис для объединения всех оптимизаций транзакций
import transactionOptimizationService from './transactionOptimizationService';
import gasOptimizationService from './gasOptimizationService';
import nonceOptimizationService from './nonceOptimizationService';

class BlockchainOptimizationIntegration {
  constructor() {
    this.isInitialized = new Map();
    this.activeChains = new Set();
    
    // Интегрированные метрики производительности
    this.integratedMetrics = new Map();
    
    // Конфигурация интеграции для разных сетей
    this.integrationConfig = {
      6342: { // MegaETH - максимальная оптимизация
        enableAllOptimizations: true,
        preSignedPoolSize: 100,
        gasStrategy: 'ultra_fast',
        nonceStrategy: 'pre_signed_pool',
        parallelSigning: true,
        burstMode: true,
        metricsUpdateInterval: 2000
      },
      31337: { // Foundry - оптимизированная разработка
        enableAllOptimizations: true,
        preSignedPoolSize: 80,
        gasStrategy: 'minimal',
        nonceStrategy: 'pre_signed_pool',
        parallelSigning: true,
        burstMode: true,
        metricsUpdateInterval: 3000
      },
      50311: { // Somnia - сбалансированная оптимизация
        enableAllOptimizations: true,
        preSignedPoolSize: 60,
        gasStrategy: 'balanced',
        nonceStrategy: 'hybrid',
        parallelSigning: false,
        burstMode: false,
        metricsUpdateInterval: 4000
      },
      1313161556: { // RISE - консервативная оптимизация
        enableAllOptimizations: true,
        preSignedPoolSize: 50,
        gasStrategy: 'optimized',
        nonceStrategy: 'hybrid',
        parallelSigning: false,
        burstMode: false,
        metricsUpdateInterval: 5000
      }
    };
  }

  // Полная инициализация оптимизаций для сети
  async initializeOptimizations(chainId, walletClient, publicClient, embeddedWallet) {
    const chainKey = chainId.toString();
    
    if (this.isInitialized.get(chainKey)) {
      console.log(`✅ Optimizations already initialized for chain ${chainId}`);
      return this.getOptimizationStatus(chainId);
    }

    console.log(`🚀 Initializing integrated blockchain optimizations for chain ${chainId}`);
    
    const config = this.integrationConfig[chainId] || this.integrationConfig[31337]; // Fallback к Foundry config
    const address = embeddedWallet.address;
    
    try {
      // 1. Инициализация газовых оптимизаций
      console.log(`⛽ Initializing gas optimizations...`);
      const gasParams = await gasOptimizationService.getOptimizedGasParams(chainId, publicClient);
      
      // 2. Инициализация nonce менеджера
      console.log(`🎯 Initializing nonce optimizations...`);
      const initialNonce = await nonceOptimizationService.initializeNonceManager(
        chainId, 
        address, 
        publicClient, 
        config.nonceStrategy
      );
      
      // 3. Резервирование nonce для пула предподписанных транзакций
      console.log(`📝 Reserving nonces for pre-signed pool...`);
      const nonceReservation = await nonceOptimizationService.reserveNonceRange(
        chainId, 
        address, 
        config.preSignedPoolSize, 
        publicClient
      );
      
      // 4. Инициализация пула предподписанных транзакций
      console.log(`🎮 Initializing pre-signed transaction pool...`);
      const poolSize = await transactionOptimizationService.initializePool(
        chainId,
        walletClient,
        gasParams,
        nonceReservation.startNonce,
        config.preSignedPoolSize
      );
      
      // 5. Настройка интегрированных метрик
      this.initializeIntegratedMetrics(chainId, config);
      
      // Отмечаем как инициализированный
      this.isInitialized.set(chainKey, true);
      this.activeChains.add(chainId);
      
      const status = {
        chainId,
        initialized: true,
        config,
        gasParams: {
          maxFeePerGas: Number(gasParams.maxFeePerGas) / 1e9,
          maxPriorityFeePerGas: Number(gasParams.maxPriorityFeePerGas) / 1e9,
          strategy: gasParams.strategy
        },
        nonceStatus: nonceOptimizationService.getNonceStatus(chainId, address),
        poolStatus: transactionOptimizationService.getPoolStatus(chainId),
        reservedNonces: nonceReservation,
        poolSize,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Integrated optimizations initialized successfully for chain ${chainId}`);
      console.log(`📊 Status:`, {
        gasStrategy: gasParams.strategy,
        nonceStrategy: config.nonceStrategy,
        poolSize: poolSize,
        reservedNonces: nonceReservation.count
      });
      
      return status;
      
    } catch (error) {
      console.error(`❌ Failed to initialize optimizations for chain ${chainId}:`, error);
      
      // Частичная инициализация при ошибках
      this.isInitialized.set(chainKey, false);
      
      return {
        chainId,
        initialized: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Инициализация интегрированных метрик
  initializeIntegratedMetrics(chainId, config) {
    const chainKey = chainId.toString();
    
    this.integratedMetrics.set(chainKey, {
      chainId,
      config,
      startTime: Date.now(),
      totalTransactions: 0,
      successfulTransactions: 0,
      totalBlockchainTime: 0,
      gasUsage: {
        totalGasUsed: 0,
        averageGasPrice: 0,
        gasEfficiency: 0
      },
      nonceEfficiency: {
        totalAllocated: 0,
        totalUsed: 0,
        wastedNonces: 0
      },
      poolPerformance: {
        poolHits: 0,
        poolMisses: 0,
        refillCount: 0
      },
      lastUpdate: Date.now()
    });
    
    // Запускаем периодическое обновление метрик
    setInterval(() => {
      this.updateIntegratedMetrics(chainId);
    }, config.metricsUpdateInterval);
  }

  // Обновление интегрированных метрик
  updateIntegratedMetrics(chainId) {
    const chainKey = chainId.toString();
    const metrics = this.integratedMetrics.get(chainKey);
    
    if (!metrics) return;
    
    try {
      // Получаем данные от всех сервисов
      const transactionStats = transactionOptimizationService.getPerformanceStats(chainId);
      const gasStats = gasOptimizationService.getPerformanceStats(chainId);
      const nonceStatus = this.getFirstActiveNonceManager(chainId);
      
      // Обновляем интегрированные метрики
      metrics.totalTransactions = transactionStats.totalTransactions;
      metrics.successfulTransactions = transactionStats.successfulTransactions;
      metrics.totalBlockchainTime = transactionStats.averageBlockchainTime * transactionStats.totalTransactions;
      
      if (gasStats) {
        metrics.gasUsage = {
          totalGasUsed: gasStats.averageGasUsed * gasStats.totalTransactions,
          averageGasPrice: gasStats.averageGasPrice || 0,
          gasEfficiency: gasStats.cacheHitRate
        };
      }
      
      if (nonceStatus) {
        metrics.nonceEfficiency = {
          totalAllocated: nonceStatus.totalAllocated,
          totalUsed: nonceStatus.totalUsed,
          wastedNonces: nonceStatus.totalAllocated - nonceStatus.totalUsed
        };
      }
      
      // Статистика пула
      const poolStatus = transactionOptimizationService.getPoolStatus(chainId);
      if (poolStatus.status !== 'not_initialized') {
        metrics.poolPerformance.poolHits = metrics.totalTransactions; // Упрощенная метрика
      }
      
      metrics.lastUpdate = Date.now();
      
    } catch (error) {
      console.error(`Error updating integrated metrics for chain ${chainId}:`, error);
    }
  }

  // Получение первого активного nonce manager для метрик
  getFirstActiveNonceManager(chainId) {
    // Упрощенная версия - в реальности нужно отслеживать активные адреса
    const managers = nonceOptimizationService.nonceManagers;
    for (const [key, manager] of managers.entries()) {
      if (key.startsWith(`${chainId}-`)) {
        return nonceOptimizationService.getNonceStatus(chainId, manager.address);
      }
    }
    return null;
  }

  // Оптимизированная отправка транзакции с интеграцией всех сервисов
  async sendOptimizedTransaction(chainId) {
    const chainKey = chainId.toString();
    
    if (!this.isInitialized.get(chainKey)) {
      throw new Error(`Optimizations not initialized for chain ${chainId}`);
    }

    const startTime = performance.now();
    let success = false;
    let result = null;
    
    try {
      console.log(`🚀 Sending optimized transaction for chain ${chainId}`);
      
      // 1. Получаем предподписанную транзакцию из пула
      const signedTx = await transactionOptimizationService.getNextTransaction(chainId);
      
      // 2. Отправляем транзакцию (здесь должна быть интеграция с существующим кодом отправки)
      result = await this.sendRawTransactionOptimized(chainId, signedTx);
      
      success = true;
      console.log(`✅ Optimized transaction sent successfully:`, result);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Optimized transaction failed:`, error);
      throw error;
      
    } finally {
      const blockchainTime = performance.now() - startTime;
      
      // Записываем метрики во все сервисы
      this.recordTransactionMetrics(chainId, blockchainTime, success, result);
    }
  }

  // Запись метрик транзакции во все сервисы
  recordTransactionMetrics(chainId, blockchainTime, success, result) {
    try {
      // 1. Записываем в сервис транзакций
      transactionOptimizationService.recordPerformanceMetric(chainId, 'transaction_execution', {
        blockchainTime: Math.round(blockchainTime),
        success,
        timestamp: Date.now()
      });
      
      // 2. Записываем газовую статистику (если доступна)
      if (result && result.gasUsed && result.effectiveGasPrice) {
        gasOptimizationService.recordGasUsage(
          chainId,
          result.gasUsed,
          result.effectiveGasPrice,
          success,
          blockchainTime
        );
      }
      
      // 3. Подтверждаем использование nonce (если транзакция успешна)
      if (success && result && result.nonce) {
        // Здесь нужен адрес - в реальной реализации он будет доступен
        // nonceOptimizationService.confirmNonceUsage(chainId, address, result.nonce);
      }
      
      // 4. Обновляем интегрированные метрики
      this.updateIntegratedMetrics(chainId);
      
    } catch (error) {
      console.error('Error recording transaction metrics:', error);
    }
  }

  // Заглушка для отправки транзакции (должна быть заменена реальной реализацией)
  async sendRawTransactionOptimized(chainId, signedTx) {
    // Здесь должна быть интеграция с существующим кодом sendRawTransaction
    // Пока что возвращаем мок результат
    return {
      hash: '0x' + Math.random().toString(16).substring(2),
      nonce: 0, // Должен быть реальный nonce
      gasUsed: 21000,
      effectiveGasPrice: 1000000000, // 1 gwei
      status: 1
    };
  }

  // Получение статуса оптимизаций
  getOptimizationStatus(chainId) {
    const chainKey = chainId.toString();
    
    if (!this.isInitialized.get(chainKey)) {
      return {
        chainId,
        initialized: false,
        message: 'Optimizations not initialized'
      };
    }

    const config = this.integrationConfig[chainId];
    const metrics = this.integratedMetrics.get(chainKey);
    
    return {
      chainId,
      initialized: true,
      config,
      performance: {
        totalTransactions: metrics?.totalTransactions || 0,
        successRate: metrics?.totalTransactions > 0 ? 
          (metrics.successfulTransactions / metrics.totalTransactions * 100).toFixed(1) : 0,
        averageBlockchainTime: metrics?.totalTransactions > 0 ?
          Math.round(metrics.totalBlockchainTime / metrics.totalTransactions) : 0,
        uptime: metrics ? Date.now() - metrics.startTime : 0
      },
      services: {
        transactionPool: transactionOptimizationService.getPoolStatus(chainId),
        gasOptimization: gasOptimizationService.getPerformanceStats(chainId),
        nonceManagement: this.getFirstActiveNonceManager(chainId)
      },
      lastUpdate: metrics?.lastUpdate ? new Date(metrics.lastUpdate).toISOString() : null
    };
  }

  // Получение сводного отчета по всем оптимизациям
  generateComprehensiveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      activeChains: Array.from(this.activeChains),
      totalOptimizedChains: this.activeChains.size,
      services: {
        transactionOptimization: transactionOptimizationService.generateOptimizationReport,
        gasOptimization: gasOptimizationService.generateDiagnosticReport(),
        nonceOptimization: nonceOptimizationService.generateDiagnosticReport()
      },
      integratedMetrics: {},
      recommendations: []
    };

    // Добавляем метрики для каждой активной сети
    for (const chainId of this.activeChains) {
      const status = this.getOptimizationStatus(chainId);
      report.integratedMetrics[chainId] = status;
      
      // Генерируем рекомендации
      const recommendations = this.generateOptimizationRecommendations(chainId, status);
      if (recommendations.length > 0) {
        report.recommendations.push({
          chainId,
          recommendations
        });
      }
    }

    return report;
  }

  // Генерация рекомендаций по оптимизации
  generateOptimizationRecommendations(chainId, status) {
    const recommendations = [];
    const performance = status.performance;
    
    // Анализ производительности
    if (performance.averageBlockchainTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'High transaction times detected',
        action: 'Consider increasing pool size or enabling burst mode'
      });
    }
    
    if (performance.successRate < 95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Low success rate detected',
        action: 'Check gas parameters and network connectivity'
      });
    }
    
    // Анализ пула
    const poolStatus = status.services.transactionPool;
    if (poolStatus.status === 'critical' || poolStatus.status === 'low') {
      recommendations.push({
        type: 'pool_management',
        priority: 'medium',
        message: 'Transaction pool running low',
        action: 'Increase batch size or reduce refill threshold'
      });
    }
    
    return recommendations;
  }

  // Сброс всех оптимизаций для сети (для тестирования)
  resetOptimizations(chainId) {
    const chainKey = chainId.toString();
    
    // Очищаем все сервисы
    transactionOptimizationService.clearPool(chainId);
    
    // Сбрасываем nonce managers для этой сети
    for (const [key] of nonceOptimizationService.nonceManagers.entries()) {
      if (key.startsWith(`${chainId}-`)) {
        const address = key.split('-')[1];
        nonceOptimizationService.resetManager(chainId, address);
      }
    }
    
    // Очищаем интегрированные данные
    this.isInitialized.set(chainKey, false);
    this.activeChains.delete(chainId);
    this.integratedMetrics.delete(chainKey);
    
    console.log(`🔄 Reset all optimizations for chain ${chainId}`);
  }
}

// Создаем singleton экземпляр
const blockchainOptimizationIntegration = new BlockchainOptimizationIntegration();

export default blockchainOptimizationIntegration;