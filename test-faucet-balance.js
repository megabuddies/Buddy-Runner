// Тестовый скрипт для проверки работы faucet и обновления баланса
// Запускать в консоли браузера на странице игры

console.log('🧪 Starting faucet and balance test...');

// Функция для тестирования faucet
async function testFaucet() {
  try {
    console.log('💰 Testing faucet functionality...');
    
    // Получаем embedded wallet
    const embeddedWallet = window.gameGetEmbeddedWallet?.();
    if (!embeddedWallet) {
      console.error('❌ No embedded wallet found');
      return;
    }
    
    console.log('✅ Found embedded wallet:', embeddedWallet.address);
    
    // Проверяем текущий баланс
    console.log('📊 Checking current balance...');
    const currentBalance = await window.gameForceRefreshBalance?.(6342);
    console.log('💰 Current balance:', currentBalance);
    
    // Вызываем faucet
    console.log('🚰 Calling faucet...');
    const faucetResult = await window.gameCallFaucet?.(embeddedWallet.address, 6342);
    console.log('✅ Faucet result:', faucetResult);
    
    // Ждем немного и проверяем баланс снова
    console.log('⏳ Waiting for balance update...');
    setTimeout(async () => {
      try {
        const newBalance = await window.gameForceRefreshBalance?.(6342);
        console.log('💰 New balance after faucet:', newBalance);
        
        if (newBalance > currentBalance) {
          console.log('✅ SUCCESS: Balance increased after faucet!');
        } else {
          console.log('⚠️ Balance did not increase, may need more time...');
        }
      } catch (error) {
        console.error('❌ Failed to check new balance:', error);
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Faucet test failed:', error);
  }
}

// Функция для тестирования обновления баланса
async function testBalanceRefresh() {
  try {
    console.log('🔄 Testing balance refresh functionality...');
    
    // Принудительно обновляем баланс
    const result = await window.refetchBalance?.(6342);
    console.log('✅ Balance refresh result:', result);
    
    // Проверяем статус пула транзакций
    const poolStatus = window.blockchainDebug?.getTransactionPool(6342);
    console.log('📊 Transaction pool status:', poolStatus);
    
  } catch (error) {
    console.error('❌ Balance refresh test failed:', error);
  }
}

// Функция для полного тестирования
async function runFullTest() {
  console.log('🚀 Starting full faucet and balance test...');
  
  // Проверяем доступность функций
  if (!window.gameCallFaucet || !window.gameGetEmbeddedWallet || !window.refetchBalance) {
    console.error('❌ Required functions not available. Make sure you are on the game page and blockchain is initialized.');
    return;
  }
  
  console.log('✅ All required functions are available');
  
  // Запускаем тесты
  await testBalanceRefresh();
  await testFaucet();
  
  console.log('🎯 Full test completed!');
}

// Экспортируем функции для использования в консоли
window.testFaucet = testFaucet;
window.testBalanceRefresh = testBalanceRefresh;
window.runFullTest = runFullTest;

console.log('🧪 Test functions loaded:');
console.log('  • window.testFaucet() - Test faucet functionality');
console.log('  • window.testBalanceRefresh() - Test balance refresh');
console.log('  • window.runFullTest() - Run complete test suite');
console.log('');
console.log('💡 Run window.runFullTest() to start testing...');