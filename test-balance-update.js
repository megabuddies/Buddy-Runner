// Тест для проверки обновления баланса после faucet
console.log('🧪 Testing balance update functionality...');

// Функция для тестирования обновления баланса
async function testBalanceUpdate() {
  try {
    // Ждем, пока Privy инициализируется
    if (typeof window.gameCheckBalance === 'undefined') {
      console.log('⏳ Waiting for Privy to initialize...');
      setTimeout(testBalanceUpdate, 1000);
      return;
    }

    console.log('✅ Privy initialized, testing balance update...');

    // Получаем embedded wallet
    const embeddedWallet = window.gameGetEmbeddedWallet();
    if (!embeddedWallet) {
      console.log('❌ No embedded wallet found');
      return;
    }

    console.log('👛 Embedded wallet found:', embeddedWallet.address);

    // Проверяем текущий баланс
    console.log('💰 Checking current balance...');
    const currentBalance = await window.gameCheckBalance(6342);
    console.log('Current balance:', currentBalance, 'ETH');

    // Если баланс низкий, вызываем faucet
    if (parseFloat(currentBalance) < 0.00005) {
      console.log('🚰 Balance is low, calling faucet...');
      try {
        await window.gameCallFaucet(embeddedWallet.address, 6342);
        console.log('✅ Faucet called successfully');
        
        // Ждем немного и проверяем баланс снова
        setTimeout(async () => {
          console.log('🔄 Checking balance after faucet...');
          const newBalance = await window.gameCheckBalance(6342);
          console.log('New balance:', newBalance, 'ETH');
          
          if (parseFloat(newBalance) > parseFloat(currentBalance)) {
            console.log('🎉 Balance updated successfully!');
          } else {
            console.log('⚠️ Balance not updated yet, may need more time');
          }
        }, 3000);
      } catch (error) {
        console.error('❌ Faucet failed:', error.message);
      }
    } else {
      console.log('✅ Balance is sufficient');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Запускаем тест
testBalanceUpdate();

// Экспортируем функцию для использования в консоли
window.testBalanceUpdate = testBalanceUpdate;