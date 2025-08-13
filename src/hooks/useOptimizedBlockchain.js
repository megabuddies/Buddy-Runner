import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import optimizedBlockchainService from '../services/optimizedBlockchainService';

export const useOptimizedBlockchain = () => {
  // Состояние системы
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState('local');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Метрики производительности
  const [performanceStats, setPerformanceStats] = useState(null);
  const [realtimeStats, setRealtimeStats] = useState({
    lastTransactionTime: null,
    transactionsThisSession: 0,
    averageTimeThisSession: 0
  });

  // Состояние контракта
  const [contractState, setContractState] = useState({
    currentNumber: 0,
    isReading: false
  });

  // Приложение с Privy
  const { ready, authenticated, user } = usePrivy();
  const sessionStatsRef = useRef({
    startTime: null,
    transactionTimes: []
  });

  /**
   * Инициализация оптимизированной системы
   */
  const initializeSystem = useCallback(async (networkKey = 'local', batchSize = 20) => {
    if (!ready || !authenticated || !user?.wallet) {
      console.warn('Privy не готов для инициализации blockchain системы');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🎯 Инициализация оптимизированной системы для игры...`);
      
      // Инициализируем сервис
      await optimizedBlockchainService.initializeOptimized(
        user.wallet, 
        networkKey, 
        batchSize
      );

      setIsInitialized(true);
      setCurrentNetwork(networkKey);
      
      // Сброс статистики сессии
      sessionStatsRef.current = {
        startTime: Date.now(),
        transactionTimes: []
      };
      
      setRealtimeStats({
        lastTransactionTime: null,
        transactionsThisSession: 0,
        averageTimeThisSession: 0
      });

      console.log(`✅ Система готова к отправке действий игрока в блокчейн!`);
      
      // Обновляем текущее состояние контракта
      await updateContractState();
      
      return true;
    } catch (err) {
      console.error('❌ Ошибка инициализации системы:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ready, authenticated, user]);

  /**
   * Отправка действия игрока в блокчейн (основная функция)
   */
  const sendPlayerAction = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('Система не инициализирована');
    }

    try {
      const actionStartTime = performance.now();
      
      // Отправляем действие через оптимизированный сервис
      const executionTime = await optimizedBlockchainService.sendPlayerAction(currentNetwork);
      
      const totalActionTime = performance.now() - actionStartTime;
      
      // Обновляем статистику сессии
      sessionStatsRef.current.transactionTimes.push(executionTime);
      const sessionAverage = sessionStatsRef.current.transactionTimes.reduce((a, b) => a + b, 0) / 
                           sessionStatsRef.current.transactionTimes.length;

      setRealtimeStats(prev => ({
        lastTransactionTime: executionTime,
        transactionsThisSession: prev.transactionsThisSession + 1,
        averageTimeThisSession: sessionAverage
      }));

      // Получаем общую статистику системы
      const stats = optimizedBlockchainService.getPerformanceStats();
      setPerformanceStats(stats);

      console.log(`🎮 Действие игрока отправлено за ${executionTime.toFixed(2)}ms`);
      
      return {
        success: true,
        executionTime,
        totalActionTime,
        transactionHash: null // Добавится в будущих версиях
      };

    } catch (err) {
      console.error('❌ Ошибка отправки действия игрока:', err);
      setError(err.message);
      
      return {
        success: false,
        error: err.message,
        executionTime: null
      };
    }
  }, [isInitialized, currentNetwork]);

  /**
   * Переключение сети (с сохранением состояния)
   */
  const switchNetwork = useCallback(async (networkKey, batchSize = 20) => {
    if (networkKey === currentNetwork) {
      console.log(`Уже подключен к сети ${networkKey}`);
      return true;
    }

    setIsLoading(true);
    
    try {
      // Сбрасываем старую систему
      optimizedBlockchainService.reset();
      setIsInitialized(false);
      
      // Инициализируем для новой сети
      const success = await initializeSystem(networkKey, batchSize);
      
      if (success) {
        console.log(`🔄 Успешно переключились на ${networkKey}`);
      }
      
      return success;
    } catch (err) {
      console.error('❌ Ошибка переключения сети:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentNetwork, initializeSystem]);

  /**
   * Обновление состояния контракта
   */
  const updateContractState = useCallback(async () => {
    if (!isInitialized) return;

    setContractState(prev => ({ ...prev, isReading: true }));
    
    try {
      const currentNumber = await optimizedBlockchainService.getCurrentNumber(currentNetwork);
      
      setContractState({
        currentNumber: currentNumber || 0,
        isReading: false
      });
      
    } catch (err) {
      console.warn('Не удалось обновить состояние контракта:', err);
      setContractState(prev => ({ ...prev, isReading: false }));
    }
  }, [isInitialized, currentNetwork]);

  /**
   * Автоматическое обновление состояния контракта
   */
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(updateContractState, 5000); // Каждые 5 секунд
    return () => clearInterval(interval);
  }, [isInitialized, updateContractState]);

  /**
   * Получение конфигурации доступных сетей
   */
  const getAvailableNetworks = useCallback(() => {
    return [
      { 
        key: 'local', 
        name: 'Local Hardhat', 
        description: 'Локальная тестовая сеть',
        icon: '🏠',
        blockTime: '2s'
      },
      { 
        key: 'megaeth', 
        name: 'MegaETH Testnet', 
        description: 'Сверхбыстрая сеть 100k TPS',
        icon: '⚡',
        blockTime: '100ms'
      },
      { 
        key: 'base', 
        name: 'Base Sepolia', 
        description: 'Base L2 тестовая сеть',
        icon: '🔵',
        blockTime: '2s'
      }
    ];
  }, []);

  /**
   * Проверка готовности системы
   */
  const isSystemReady = useCallback(() => {
    return ready && authenticated && user?.wallet && isInitialized;
  }, [ready, authenticated, user, isInitialized]);

  /**
   * Получение информации о пуле транзакций
   */
  const getPoolInfo = useCallback(() => {
    if (!performanceStats?.poolStatus) return null;
    
    const poolData = performanceStats.poolStatus[currentNetwork];
    if (!poolData) return null;

    return {
      ...poolData,
      utilizationPercent: Math.round((poolData.used / poolData.total) * 100),
      needsRefill: poolData.remaining < poolData.total * 0.3 // Менее 30%
    };
  }, [performanceStats, currentNetwork]);

  /**
   * Сброс системы
   */
  const resetSystem = useCallback(() => {
    optimizedBlockchainService.reset();
    setIsInitialized(false);
    setError(null);
    setPerformanceStats(null);
    setRealtimeStats({
      lastTransactionTime: null,
      transactionsThisSession: 0,
      averageTimeThisSession: 0
    });
    setContractState({
      currentNumber: 0,
      isReading: false
    });
    
    sessionStatsRef.current = {
      startTime: null,
      transactionTimes: []
    };
    
    console.log('🔄 Система сброшена');
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (isInitialized) {
        resetSystem();
      }
    };
  }, []);

  return {
    // Основные функции
    initializeSystem,
    sendPlayerAction,
    switchNetwork,
    updateContractState,
    resetSystem,

    // Состояние системы
    isInitialized,
    currentNetwork,
    isLoading,
    error,
    isSystemReady: isSystemReady(),

    // Метрики и статистика
    performanceStats,
    realtimeStats,
    contractState,
    poolInfo: getPoolInfo(),

    // Конфигурация
    availableNetworks: getAvailableNetworks(),

    // Утилиты
    sessionDuration: sessionStatsRef.current.startTime ? 
      Date.now() - sessionStatsRef.current.startTime : 0
  };
};