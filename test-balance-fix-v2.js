// Обновленный тест для проверки синхронного faucet
// Запустите в консоли браузера после входа в игру

console.log('🧪 Тестирование синхронного faucet...');

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
        
        if (parseFloat(balance) < 0.00005) {
          console.log('⚠️ Баланс низкий, тестируем синхронный faucet...');
          
          // Тестируем синхронный вызов faucet
          return window.gameCallFaucet(embeddedWallet.address, 6342)
            .then(result => {
              console.log('✅ Синхронный faucet результат:', result);
              
              // Немедленно проверяем баланс после faucet
              return window.gameCheckBalance(6342);
            })
            .then(newBalance => {
              console.log('💰 Баланс после синхронного faucet:', newBalance, 'ETH');
              
              if (parseFloat(newBalance) >= 0.00005) {
                console.log('✅ Баланс успешно обновлен синхронно!');
              } else {
                console.log('⚠️ Баланс все еще низкий после синхронного faucet');
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
console.log('2. Проверьте консоль на наличие логов об embedded wallet');
console.log('3. Если баланс < 0.00005 ETH, faucet должен вызываться СИНХРОННО');
console.log('4. Баланс должен обновляться немедленно после получения ответа от faucet');
console.log('5. Pre-signing должен начинаться с обновленным балансом');
console.log('6. Попробуйте прыгнуть - должно работать с первого раза без refresh');
console.log('7. Проверьте логи в консоли для подтверждения синхронной работы');

// Дополнительные проверки
console.log('\n🔍 Дополнительные проверки:');
console.log('- Ищите логи: "calling faucet SYNCHRONOUSLY..."');
console.log('- Ищите логи: "Balance updated immediately after faucet response"');
console.log('- Ищите логи: "Pre-signing with balance: X.XXXX ETH"');
console.log('- Ищите логи: "Pre-signed transaction pool is now ACTIVE"');