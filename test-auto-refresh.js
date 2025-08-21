// Тест автоматического обновления страницы
console.log('🧪 Тестирование автоматического обновления страницы...');

// Проверяем, что функция callFaucet доступна
if (typeof window.gameCallFaucet === 'undefined') {
  console.log('❌ Функция gameCallFaucet не найдена');
  console.log('💡 Убедитесь, что вы находитесь в игровом режиме с подключенным кошельком');
} else {
  console.log('✅ Функция gameCallFaucet найдена');
  
  // Проверяем, есть ли embedded wallet
  if (typeof window.gameGetEmbeddedWallet === 'undefined') {
    console.log('❌ Функция gameGetEmbeddedWallet не найдена');
  } else {
    const embeddedWallet = window.gameGetEmbeddedWallet();
    if (embeddedWallet) {
      console.log('✅ Embedded wallet найден:', embeddedWallet.address);
      
      // Тестируем автоматическое обновление
      console.log('🧪 Тестирование автоматического обновления...');
      console.log('💡 После успешного вызова faucet страница должна автоматически обновиться');
      
      // Показываем инструкции
      console.log('📋 Инструкции:');
      console.log('1. Подключите кошелек через Privy');
      console.log('2. Выберите сеть (например, MegaETH Testnet)');
      console.log('3. Если баланс < 0.00005 ETH, faucet вызовется автоматически');
      console.log('4. После успешного пополнения страница обновится автоматически');
      console.log('5. Также можно нажать "Get Test ETH" для ручного вызова faucet');
      
    } else {
      console.log('❌ Embedded wallet не найден');
      console.log('💡 Убедитесь, что вы подключили кошелек через Privy');
    }
  }
}

// Проверяем настройки автоматического обновления
console.log('🔧 Настройки автоматического обновления:');
console.log('• Обновление происходит только после успешных операций');
console.log('• Минимальный интервал между обновлениями: 5 секунд');
console.log('• Задержка перед обновлением: 2-3 секунды');
console.log('• Обновление происходит после:');
console.log('  - Успешного подключения кошелька');
console.log('  - Успешного пополнения через faucet');
console.log('  - Перехода в игровое состояние');

// Проверяем localStorage
const lastRefresh = localStorage.getItem('lastPageRefresh');
if (lastRefresh) {
  const timeSinceLastRefresh = Date.now() - parseInt(lastRefresh);
  console.log(`⏱️ Последнее обновление: ${Math.floor(timeSinceLastRefresh / 1000)} секунд назад`);
} else {
  console.log('⏱️ Обновлений страницы еще не было');
}