// Отладочный скрипт для проверки проблемы с балансом
// Запустите в консоли браузера после входа в игру

console.log('🔍 Отладка проблемы с балансом...');

// Проверяем доступность функций
if (typeof window.gameCallFaucet === 'undefined') {
  console.log('❌ Функции отладки недоступны. Убедитесь, что вы в development режиме.');
} else {
  console.log('✅ Функции отладки доступны');
  
  // Получаем embedded wallet
  const embeddedWallet = window.gameGetEmbeddedWallet();
  if (embeddedWallet) {
    console.log('✅ Embedded wallet найден:', embeddedWallet.address);
    
    // Проверяем текущий баланс
    console.log('💰 Проверка текущего баланса...');
    window.gameCheckBalance(6342)
      .then(balance => {
        console.log('💰 Текущий баланс:', balance, 'ETH');
        
        // Проверяем состояние React
        console.log('🔍 Проверка состояния React...');
        
        // Попытка получить состояние из React DevTools
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          console.log('✅ React DevTools доступны');
          
          // Ищем компонент с балансом
          const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          if (hook.renderers && hook.renderers.size > 0) {
            const renderer = hook.renderers.get(1);
            if (renderer) {
              console.log('✅ React renderer найден');
              
              // Попытка получить состояние
              try {
                const fiber = renderer.getCurrentFiber();
                if (fiber) {
                  console.log('✅ React fiber найден');
                  console.log('🔍 Fiber state:', fiber.memoizedState);
                }
              } catch (error) {
                console.log('⚠️ Не удалось получить React state:', error);
              }
            }
          }
        } else {
          console.log('❌ React DevTools недоступны');
        }
        
        // Проверяем localStorage на наличие кеша
        console.log('🔍 Проверка localStorage...');
        const faucetCache = localStorage.getItem(`faucet_6342_${embeddedWallet.address}`);
        if (faucetCache) {
          const lastCall = parseInt(faucetCache);
          const timeSinceCall = Date.now() - lastCall;
          console.log('💰 Последний вызов faucet:', new Date(lastCall).toLocaleString());
          console.log('⏱️ Время с последнего вызова:', Math.round(timeSinceCall / 1000), 'секунд');
        } else {
          console.log('❌ Кеш faucet не найден');
        }
        
        // Проверяем, есть ли pre-signed транзакции
        console.log('🔍 Проверка pre-signed транзакций...');
        if (window.gameGetPoolStatus) {
          const poolStatus = window.gameGetPoolStatus(6342);
          console.log('📊 Pool status:', poolStatus);
        } else {
          console.log('❌ Функция getPoolStatus недоступна');
        }
        
        // Тестируем вызов faucet
        if (parseFloat(balance) < 0.00005) {
          console.log('⚠️ Баланс низкий, тестируем faucet...');
          
          return window.gameCallFaucet(embeddedWallet.address, 6342)
            .then(result => {
              console.log('✅ Faucet результат:', result);
              
              // Немедленно проверяем баланс
              return window.gameCheckBalance(6342);
            })
            .then(newBalance => {
              console.log('💰 Баланс после faucet:', newBalance, 'ETH');
              
              // Проверяем еще раз через 2 секунды
              setTimeout(() => {
                console.log('🔄 Проверка баланса через 2 секунды...');
                window.gameCheckBalance(6342)
                  .then(delayedBalance => {
                    console.log('💰 Отложенный баланс:', delayedBalance, 'ETH');
                  })
                  .catch(error => {
                    console.error('❌ Ошибка отложенной проверки:', error);
                  });
              }, 2000);
            });
        } else {
          console.log('✅ Баланс достаточный');
        }
      })
      .catch(error => {
        console.error('❌ Ошибка отладки:', error);
      });
  } else {
    console.log('❌ Embedded wallet не найден');
  }
}

// Инструкции для пользователя
console.log('\n📋 Инструкции для отладки:');
console.log('1. Войдите в игру через Privy');
console.log('2. Проверьте консоль на наличие логов');
console.log('3. Обратите внимание на время последнего вызова faucet');
console.log('4. Проверьте pool status для pre-signed транзакций');
console.log('5. Попробуйте прыгнуть и посмотрите на ошибки');
console.log('6. Проверьте, обновляется ли баланс после первого прыжка');

// Дополнительные проверки
console.log('\n🔍 Дополнительные проверки:');
console.log('- Откройте React DevTools и найдите компонент с балансом');
console.log('- Проверьте Network tab на наличие RPC запросов');
console.log('- Проверьте, есть ли ошибки в консоли при прыжке');
console.log('- Проверьте, отправляются ли транзакции в Network tab');