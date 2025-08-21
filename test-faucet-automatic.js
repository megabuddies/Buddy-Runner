// Простой тест для проверки автоматической работы faucet
// Запустите в консоли браузера после входа в игру

console.log('🧪 Тестирование автоматической работы faucet...');

// Проверяем доступность функций
if (typeof window.gameCallFaucet === 'undefined') {
  console.log('❌ Функции отладки недоступны. Убедитесь, что вы в development режиме.');
} else {
  console.log('✅ Функции отладки доступны');
  
  // Получаем embedded wallet
  const embeddedWallet = window.gameGetEmbeddedWallet();
  if (embeddedWallet) {
    console.log('✅ Embedded wallet найден:', embeddedWallet.address);
    
    // Тестируем вызов faucet
    console.log('🧪 Тестирование вызова faucet...');
    window.gameCallFaucet(embeddedWallet.address, 6342)
      .then(result => {
        console.log('✅ Faucet результат:', result);
        if (result.isEmbeddedWallet) {
          console.log('✅ Faucet отправлен на embedded wallet!');
        } else {
          console.log('⚠️ Faucet отправлен на обычный кошелек');
        }
      })
      .catch(error => {
        console.error('❌ Ошибка faucet:', error);
      });
  } else {
    console.log('❌ Embedded wallet не найден');
  }
}

// Проверяем автоматическое обновление баланса
console.log('🔄 Проверка автоматического обновления баланса...');
console.log('Баланс должен обновляться каждые 10 секунд');

// Инструкции для пользователя
console.log('\n📋 Инструкции для тестирования:');
console.log('1. Войдите в игру через Privy');
console.log('2. Проверьте консоль на наличие логов об embedded wallet');
console.log('3. Если баланс < 0.00005 ETH, faucet должен вызваться автоматически');
console.log('4. Баланс должен обновляться каждые 10 секунд');
console.log('5. Нажмите "Get Test ETH" для ручного вызова faucet');