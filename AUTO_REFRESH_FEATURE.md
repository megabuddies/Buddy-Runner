# 🔄 Автоматическое обновление страницы

## Описание

Добавлена функция автоматического обновления страницы (как по F5) после успешного создания кошелька Privy и пополнения через Faucet.

## Когда происходит автоматическое обновление

### 1. После успешного подключения кошелька Privy
- **Место**: `src/components/WalletConnection.jsx`
- **Условие**: Успешная аутентификация пользователя
- **Задержка**: 3 секунды (для полной инициализации кошелька)
- **Логика**: Обновление происходит только если прошло более 5 секунд с последнего обновления

### 2. После успешного пополнения через Faucet
- **Место**: `src/hooks/useBlockchainUtils.js`
- **Условие**: Успешный вызов API faucet с флагом `shouldRefresh: true`
- **Задержка**: 2 секунды (для завершения всех операций)
- **Логика**: Обновление происходит только после успешных операций

### 3. После перехода в игровое состояние
- **Место**: `src/App.jsx`
- **Условие**: Переход из состояния подключения кошелька в игровое состояние
- **Задержка**: 2.5 секунды (для инициализации всех компонентов)

### 4. После ручного вызова Faucet
- **Место**: `src/components/GameComponent.jsx`
- **Условие**: Успешный ручной вызов faucet через кнопку "Get Test ETH"
- **Задержка**: 2 секунды

## Механизм защиты от множественных обновлений

### localStorage контроль
```javascript
const lastRefresh = localStorage.getItem('lastPageRefresh');
const timeSinceLastRefresh = lastRefresh ? Date.now() - parseInt(lastRefresh) : Infinity;

if (timeSinceLastRefresh > 5000) { // Обновляем не чаще чем раз в 5 секунд
  localStorage.setItem('lastPageRefresh', Date.now().toString());
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}
```

### Логирование
Все операции автоматического обновления логируются в консоль:
- `🔄 Auto-refreshing page after successful faucet...`
- `🔄 Auto-refreshing page after successful wallet connection...`
- `🔄 Auto-refreshing page after entering game state...`
- `⏱️ Page refresh skipped - too recent`

## Настройки

### Временные интервалы
- **Минимальный интервал между обновлениями**: 5 секунд
- **Задержка после подключения кошелька**: 3 секунды
- **Задержка после faucet**: 2 секунды
- **Задержка после перехода в игру**: 2.5 секунды

### Условия срабатывания
- Только после успешных операций
- Только если прошло достаточно времени с последнего обновления
- Только для blockchain сетей (не для Web2 режима)

## Тестирование

### Автоматический тест
Запустите в консоли браузера:
```javascript
// Загрузите тестовый файл
fetch('/test-auto-refresh.js').then(r => r.text()).then(eval);
```

### Ручное тестирование
1. Подключите кошелек через Privy
2. Выберите сеть (например, MegaETH Testnet)
3. Если баланс < 0.00005 ETH, faucet вызовется автоматически
4. После успешного пополнения страница обновится автоматически
5. Также можно нажать "Get Test ETH" для ручного вызова faucet

## Логи в консоли

### Успешные операции
```
✅ Background faucet completed
✅ Faucet sent to embedded wallet: 0x...
🔄 Auto-refreshing page after successful faucet...
```

### Пропущенные обновления
```
⏱️ Page refresh skipped - too recent
```

### Ошибки
```
⚠️ Background faucet failed (non-blocking): Error message
```

## Совместимость

- ✅ Работает с Privy embedded wallets
- ✅ Работает с внешними кошельками
- ✅ Совместимо с автоматическим и ручным вызовом faucet
- ✅ Не влияет на Web2 режим игры
- ✅ Защищено от множественных обновлений

## Отключение функции

Если нужно отключить автоматическое обновление, можно:

1. Удалить все вызовы `window.location.reload()`
2. Или добавить флаг в localStorage:
```javascript
localStorage.setItem('disableAutoRefresh', 'true');
```

И проверить его перед обновлением:
```javascript
if (!localStorage.getItem('disableAutoRefresh')) {
  window.location.reload();
}
```