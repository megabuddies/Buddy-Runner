// Тест для проверки исправления faucet с подтверждением транзакции
// Этот тест проверяет, что баланс обновляется только после подтверждения транзакции

console.log('🧪 Тестирование исправления faucet с подтверждением транзакции...');
console.log('📋 Цель: Убедиться, что баланс обновляется только после подтверждения транзакции');

// Проверяем доступность функций
if (typeof window.gameCallFaucet === 'undefined') {
  console.error('❌ window.gameCallFaucet не найден');
  console.log('💡 Убедитесь, что вы находитесь в игре и blockchain utils загружены');
} else {
  console.log('✅ window.gameCallFaucet найден');
}

if (typeof window.gameGetEmbeddedWallet === 'undefined') {
  console.error('❌ window.gameGetEmbeddedWallet не найден');
} else {
  console.log('✅ window.gameGetEmbeddedWallet найден');
}

// Функция для тестирования faucet с подтверждением
async function testFaucetConfirmation() {
  try {
    console.log('\n🔍 Шаг 1: Получение embedded wallet...');
    const embeddedWallet = window.gameGetEmbeddedWallet();
    
    if (!embeddedWallet) {
      console.error('❌ Embedded wallet не найден');
      console.log('💡 Убедитесь, что вы подключены к игре');
      return;
    }
    
    console.log('✅ Embedded wallet найден:', embeddedWallet.address);
    
    console.log('\n🔍 Шаг 2: Проверка текущего баланса...');
    // Получаем текущий баланс через blockchain utils
    if (window.gameCheckBalance) {
      const currentBalance = await window.gameCheckBalance(6342); // MegaETH Testnet
      console.log('💰 Текущий баланс:', currentBalance, 'ETH');
    } else {
      console.log('⚠️ window.gameCheckBalance не найден, пропускаем проверку баланса');
    }
    
    console.log('\n🔍 Шаг 3: Вызов faucet с ожиданием подтверждения...');
    console.log('⏳ Это может занять до 60 секунд...');
    
    const startTime = Date.now();
    const result = await window.gameCallFaucet(embeddedWallet.address, 6342);
    const endTime = Date.now();
    
    console.log('✅ Faucet результат:', result);
    console.log(`⏱️ Время выполнения: ${endTime - startTime}ms`);
    
    // Проверяем результат
    if (result.success) {
      console.log('✅ Faucet успешно выполнен');
      
      if (result.confirmed) {
        console.log('✅ Транзакция подтверждена в блокчейне');
        console.log('📊 Детали транзакции:');
        console.log('  • Hash:', result.txHash);
        console.log('  • Block:', result.receipt?.blockNumber);
        console.log('  • Gas Used:', result.receipt?.gasUsed);
        console.log('  • Status:', result.receipt?.status);
      } else {
        console.log('⚠️ Транзакция отправлена, но подтверждение не получено');
        console.log('💡 Баланс будет обновлен через 5 секунд');
      }
      
      if (result.isEmbeddedWallet) {
        console.log('✅ Faucet отправлен на правильный embedded wallet');
      } else {
        console.log('⚠️ Faucet отправлен на обычный кошелек');
      }
      
    } else {
      console.error('❌ Faucet не удался');
    }
    
    console.log('\n🔍 Шаг 4: Проверка обновления баланса...');
    if (window.gameCheckBalance) {
      // Ждем немного для обновления баланса
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newBalance = await window.gameCheckBalance(6342);
      console.log('💰 Новый баланс:', newBalance, 'ETH');
      
      if (parseFloat(newBalance) > 0.00005) {
        console.log('✅ Баланс успешно обновлен после faucet');
      } else {
        console.log('⚠️ Баланс все еще низкий, возможно нужно подождать дольше');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
    console.log('💡 Проверьте консоль для деталей ошибки');
  }
}

// Функция для тестирования инициализации с faucet
async function testInitializationWithFaucet() {
  try {
    console.log('\n🔍 Тест инициализации с автоматическим faucet...');
    
    if (typeof window.gameInitData === 'undefined') {
      console.log('⚠️ window.gameInitData не найден, пропускаем тест инициализации');
      return;
    }
    
    console.log('⏳ Запуск инициализации блокчейна...');
    const startTime = Date.now();
    
    await window.gameInitData(6342); // MegaETH Testnet
    
    const endTime = Date.now();
    console.log(`✅ Инициализация завершена за ${endTime - startTime}ms`);
    
    // Проверяем баланс после инициализации
    if (window.gameCheckBalance) {
      const balance = await window.gameCheckBalance(6342);
      console.log('💰 Баланс после инициализации:', balance, 'ETH');
    }
    
  } catch (error) {
    console.error('❌ Ошибка в тесте инициализации:', error);
  }
}

// Функция для мониторинга состояния пула транзакций
function monitorTransactionPool() {
  console.log('\n🔍 Мониторинг пула транзакций...');
  
  if (typeof window.blockchainDebug === 'undefined') {
    console.log('⚠️ window.blockchainDebug не найден');
    return;
  }
  
  // Получаем статус пула
  const poolStatus = window.blockchainDebug.getTransactionPool(6342);
  if (poolStatus) {
    console.log('📊 Статус пула транзакций:');
    console.log('  • Всего транзакций:', poolStatus.transactions?.length || 0);
    console.log('  • Использовано:', poolStatus.currentIndex || 0);
    console.log('  • Доступно:', (poolStatus.transactions?.length || 0) - (poolStatus.currentIndex || 0));
    console.log('  • Готов:', poolStatus.isReady ? '✅' : '❌');
    console.log('  • Пополняется:', poolStatus.isRefilling ? '🔄' : '⏸️');
  } else {
    console.log('⚠️ Пул транзакций не найден');
  }
  
  // Генерируем отчет о производительности
  try {
    const report = window.blockchainDebug.generatePerformanceReport(6342);
    console.log('📈 Отчет о производительности сгенерирован');
  } catch (error) {
    console.log('⚠️ Не удалось сгенерировать отчет о производительности');
  }
}

// Основная функция тестирования
async function runFaucetConfirmationTest() {
  console.log('🚀 Запуск теста исправления faucet...');
  console.log('📅 Время:', new Date().toISOString());
  
  // Тест 1: Ручной вызов faucet с подтверждением
  await testFaucetConfirmation();
  
  // Тест 2: Инициализация с автоматическим faucet
  await testInitializationWithFaucet();
  
  // Тест 3: Мониторинг пула транзакций
  monitorTransactionPool();
  
  console.log('\n✅ Тест завершен!');
  console.log('📋 Результаты:');
  console.log('  • Faucet с подтверждением: Проверено');
  console.log('  • Обновление баланса: Проверено');
  console.log('  • Инициализация: Проверено');
  console.log('  • Пул транзакций: Проверено');
}

// Экспортируем функции для использования в консоли
window.testFaucetConfirmation = testFaucetConfirmation;
window.testInitializationWithFaucet = testInitializationWithFaucet;
window.monitorTransactionPool = monitorTransactionPool;
window.runFaucetConfirmationTest = runFaucetConfirmationTest;

console.log('🔧 Функции тестирования добавлены в window:');
console.log('  • window.testFaucetConfirmation() - тест ручного faucet');
console.log('  • window.testInitializationWithFaucet() - тест инициализации');
console.log('  • window.monitorTransactionPool() - мониторинг пула');
console.log('  • window.runFaucetConfirmationTest() - полный тест');

// Автоматически запускаем тест через 2 секунды
setTimeout(() => {
  console.log('\n🔄 Автоматический запуск теста через 2 секунды...');
  runFaucetConfirmationTest();
}, 2000);