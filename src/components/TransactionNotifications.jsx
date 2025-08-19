import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/TransactionNotifications.css';

const TransactionNotifications = ({ 
  transactionPending, 
  transactionPendingCount,
  balance, 
  blockchainStatus, 
  selectedNetwork,
  authenticated 
}) =&gt; {
  const [notifications, setNotifications] = useState([]);
  const [nextId, setNextId] = useState(1);
  const [lastProcessedTransactionTime, setLastProcessedTransactionTime] = useState(0);
  const [lastPendingCount, setLastPendingCount] = useState(0);

  // Добавляем уведомление о транзакции (отслеживаем изменения totalMovements)
  useEffect(() =&gt; {
    if (authenticated && selectedNetwork && !selectedNetwork.isWeb2 && blockchainStatus) {
      // Отслеживаем увеличение totalMovements как индикатор новой транзакции
      const currentMovements = blockchainStatus.totalMovements || 0;
      
      // Если totalMovements увеличился, значит была новая транзакция
      if (currentMovements &gt; 0) {
        // Проверяем, есть ли новая транзакция по времени
        const currentTransactionTime = blockchainStatus.lastTransactionTime || 0;
        
        if (currentTransactionTime &gt; lastProcessedTransactionTime && currentTransactionTime &gt; 0) {
          const notification = {
            id: nextId,
            type: 'transaction',
            title: 'Jump Completed',
            message: `Jump completed in ${currentTransactionTime}ms on ${selectedNetwork.name}`,
            status: 'completed',
            timestamp: Date.now(),
            completedAt: Date.now()
          };
          
          setNotifications(prev =&gt; [...prev, notification]);
          setNextId(prev =&gt; prev + 1);
          setLastProcessedTransactionTime(currentTransactionTime);
        }
      }
    }
  }, [blockchainStatus?.totalMovements, blockchainStatus?.lastTransactionTime, authenticated, selectedNetwork, nextId, lastProcessedTransactionTime]);

  // Добавляем уведомление о pending транзакции (отслеживаем увеличение transactionPendingCount)
  useEffect(() =&gt; {
    if (authenticated && selectedNetwork && !selectedNetwork.isWeb2) {
      // Если количество pending транзакций увеличилось, создаем уведомление
      if (transactionPendingCount &gt; lastPendingCount) {
        const notification = {
          id: nextId,
          type: 'transaction',
          title: 'Transaction Pending',
          message: `Processing jump on ${selectedNetwork.name}`,
          status: 'pending',
          timestamp: Date.now()
        };
        
        setNotifications(prev =&gt; [...prev, notification]);
        setNextId(prev =&gt; prev + 1);
        setLastPendingCount(transactionPendingCount);
      } else if (transactionPendingCount < lastPendingCount) {
        // Если количество pending уменьшилось, обновляем счетчик
        setLastPendingCount(transactionPendingCount);
      }
    }
  }, [transactionPendingCount, authenticated, selectedNetwork, nextId, lastPendingCount]);

  // Обновляем pending транзакции до completed (только для не-MegaETH сетей)
  useEffect(() =&gt; {
    if (blockchainStatus?.lastTransactionTime && authenticated && selectedNetwork && !selectedNetwork.isWeb2) {
      // Находим pending транзакцию и обновляем её (только если есть pending транзакции)
      setNotifications(prev =&gt; prev.map(notif =&gt; 
        notif.status === 'pending' && notif.type === 'transaction' 
          ? {
              ...notif,
              status: 'completed',
              message: `Jump completed in ${blockchainStatus.lastTransactionTime}ms`,
              completedAt: Date.now()
            }
          : notif
      ));
    }
  }, [blockchainStatus?.lastTransactionTime, authenticated, selectedNetwork]);

  // Добавляем уведомление об ошибках транзакций
  useEffect(() =&gt; {
    if (blockchainStatus?.lastError && authenticated && selectedNetwork && !selectedNetwork.isWeb2) {
      // Проверяем, что это новая ошибка (по timestamp)
      const hasRecentError = notifications.some(n =&gt; 
        n.type === 'error' && 
        (Date.now() - n.timestamp) < 5000 && // За последние 5 секунд
        n.message.includes(blockchainStatus.lastError.type)
      );
      
      if (!hasRecentError) {
        const notification = {
          id: nextId,
          type: 'error',
          title: 'Transaction Error',
          message: `${blockchainStatus.lastError.type}: ${blockchainStatus.lastError.message?.slice(0, 50)}...`,
          status: 'error',
          timestamp: Date.now()
        };
        
        setNotifications(prev =&gt; [...prev, notification]);
        setNextId(prev =&gt; prev + 1);
      }
    }
  }, [blockchainStatus?.lastError?.timestamp, authenticated, selectedNetwork, notifications, nextId]); // Используем timestamp вместо всего объекта

  // Добавляем уведомление о высокой производительности
  useEffect(() =&gt; {
    if (blockchainStatus?.averageTransactionTime && 
        blockchainStatus.averageTransactionTime < 1000 && 
        authenticated && selectedNetwork && !selectedNetwork.isWeb2) {
      
      const hasPerformanceNotif = notifications.some(n =&gt; n.type === 'performance' && (Date.now() - n.timestamp) < 30000);
      
      if (!hasPerformanceNotif) {
        const notification = {
          id: nextId,
          type: 'performance',
          title: 'Excellent Performance!',
          message: `Average speed: ${Math.round(blockchainStatus.averageTransactionTime)}ms - Gaming Mode Active! 🚀`,
          status: 'success',
          timestamp: Date.now()
        };
        
        setNotifications(prev =&gt; [...prev, notification]);
        setNextId(prev =&gt; prev + 1);
      }
    }
  }, [blockchainStatus?.averageTransactionTime, authenticated, selectedNetwork, notifications, nextId]);

  // Добавляем уведомление о низком балансе
  useEffect(() =&gt; {
    if (balance && parseFloat(balance) < 0.00005 && authenticated && selectedNetwork && !selectedNetwork.isWeb2) {
      const hasLowBalanceNotif = notifications.some(n =&gt; n.type === 'low-balance' && n.status !== 'dismissed');
      
      if (!hasLowBalanceNotif) {
        const notification = {
          id: nextId,
          type: 'low-balance',
          title: 'Low Balance',
          message: `Balance: ${balance} ETH - Get test tokens`,
          status: 'warning',
          timestamp: Date.now()
        };
        
        setNotifications(prev =&gt; [...prev, notification]);
        setNextId(prev =&gt; prev + 1);
      }
    }
  }, [balance, authenticated, selectedNetwork, notifications, nextId]);

  // Автоматическое удаление старых уведомлений
  useEffect(() =&gt; {
    const interval = setInterval(() =&gt; {
      setNotifications(prev =&gt; {
        const now = Date.now();
        const filtered = prev.filter(notif =&gt; {
          // Удаляем completed уведомления через 3 секунды
          if (notif.status === 'completed' && notif.completedAt && (now - notif.completedAt) &gt; 3000) {
            return false;
          }
          // Удаляем старые уведомления через 10 секунд
          if ((now - notif.timestamp) &gt; 10000) {
            return false;
          }
          return true;
        });
        
        // Возвращаем тот же массив, если ничего не изменилось (избегаем лишних ререндеров)
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 2000); // Увеличиваем интервал до 2 секунд

    return () =&gt; clearInterval(interval);
  }, []);

  const dismissNotification = useCallback((id) =&gt; {
    setNotifications(prev =&gt; prev.filter(notif =&gt; notif.id !== id));
  }, []);

  const getNotificationIcon = useCallback((type, status) =&gt; {
    if (type === 'transaction') {
      return status === 'pending' ? '⏳' : status === 'completed' ? '✅' : '🔄';
    }
    if (type === 'low-balance') {
      return '⚠️';
    }
    if (type === 'error') {
      return '❌';
    }
    if (type === 'performance') {
      return '🚀';
    }
    return '📢';
  }, []);

  const getNotificationClass = useCallback((type, status) =&gt; {
    if (type === 'transaction') {
      return status === 'pending' ? 'pending' : status === 'completed' ? 'success' : 'info';
    }
    if (type === 'low-balance') {
      return 'warning';
    }
    if (type === 'error') {
      return 'error';
    }
    if (type === 'performance') {
      return 'success';
    }
    return 'info';
  }, []);

  if (!authenticated || !selectedNetwork || selectedNetwork.isWeb2 || notifications.length === 0) {
    return null;
  }

  return (
    <div className="transaction-notifications">
      {notifications.map((notification) =&gt; (
        <div 
          key={notification.id}
          className={`notification ${getNotificationClass(notification.type, notification.status)}`}
        >
          <div className="notification-content">
            <div className="notification-header">
              <span className="notification-icon">
                {getNotificationIcon(notification.type, notification.status)}
              </span>
              <span className="notification-title">{notification.title}</span>
              <button 
                className="notification-close"
                onClick={() =&gt; dismissNotification(notification.id)}
              >
                ×
              </button>
            </div>
            <div className="notification-message">{notification.message}</div>
            {notification.type === 'transaction' && notification.status === 'pending' && (
              <div className="notification-progress">
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionNotifications;