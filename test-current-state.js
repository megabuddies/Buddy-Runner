// Простой тест для проверки текущего состояния
// Запустите в консоли браузера после входа в игру

console.log('🧪 Тест текущего состояния...');

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
        
        // Проверяем, есть ли pre-signed транзакции
        console.log('🔍 Проверка pre-signed транзакций...');
        if (window.gameGetPoolStatus) {
          const poolStatus = window.gameGetPoolStatus(6342);
          console.log('📊 Pool status:', poolStatus);
        }
        
        // Если баланс низкий, вызываем faucet
        if (parseFloat(balance) < 0.00005) {
          console.log('⚠️ Баланс низкий, вызываем faucet...');
          
          return window.gameCallFaucet(embeddedWallet.address, 6342)
            .then(result => {
              console.log('✅ Faucet результат:', result);
              
              // Немедленно проверяем баланс
              return window.gameCheckBalance(6342);
            })
            .then(newBalance => {
              console.log('💰 Баланс после faucet:', newBalance, 'ETH');
              
              // Проверяем pool status после faucet
              if (window.gameGetPoolStatus) {
                const poolStatus = window.gameGetPoolStatus(6342);
                console.log('📊 Pool status после faucet:', poolStatus);
              }
            });
        } else {
          console.log('✅ Баланс достаточный');
        }
      })
      .catch(error => {
        console.error('❌ Ошибка тестирования:', error);
      });
  } else {
    console.log('❌ Embedded wallet не найден');
  }
}

// Инструкции для пользователя
console.log('\n📋 Инструкции для тестирования:');
console.log('1. Войдите в игру через Privy');
console.log('2. Запустите этот тест');
console.log('3. Проверьте логи в консоли');
console.log('4. Попробуйте прыгнуть и посмотрите на ошибки');
console.log('5. Проверьте, обновляется ли баланс после первого прыжка');