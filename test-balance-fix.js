// Тест для проверки исправлений баланса
// Запустите в консоли браузера после входа в игру

console.log('🧪 Тестирование исправлений баланса...');

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
          console.log('⚠️ Баланс низкий, тестируем автоматический faucet...');
          
          // Тестируем вызов faucet
          return window.gameCallFaucet(embeddedWallet.address, 6342);
        } else {
          console.log('✅ Баланс достаточный');
          return { success: true, skipped: true };
        }
      })
      .then(result => {
        if (result.success && !result.skipped) {
          console.log('✅ Faucet результат:', result);
          
          // Ждем немного и проверяем баланс снова
          setTimeout(() => {
            console.log('🔄 Проверка баланса после faucet...');
            window.gameCheckBalance(6342)
              .then(newBalance => {
                console.log('💰 Новый баланс:', newBalance, 'ETH');
                if (parseFloat(newBalance) >= 0.00005) {
                  console.log('✅ Баланс успешно обновлен!');
                } else {
                  console.log('⚠️ Баланс все еще низкий, возможно нужно подождать');
                }
              })
              .catch(error => {
                console.error('❌ Ошибка проверки баланса:', error);
              });
          }, 3000);
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
console.log('3. Если баланс < 0.00005 ETH, faucet должен вызваться автоматически');
console.log('4. Баланс должен обновляться немедленно после получения ответа от faucet');
console.log('5. Pre-signing должен ждать обновления баланса перед началом');
console.log('6. Попробуйте прыгнуть - должно работать без refresh страницы');