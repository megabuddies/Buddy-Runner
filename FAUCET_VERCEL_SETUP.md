# Настройка Faucet в Vercel

## Проблема
Механизм faucet не работает из-за отсутствия или неправильной настройки переменной окружения `FAUCET_OWNER_PRIVATE_KEY`.

## Решение

### 1. Создайте кошелек для Faucet
Если у вас еще нет отдельного кошелька для faucet:
1. Создайте новый кошелек (можно через MetaMask или любой другой способ)
2. Сохраните приватный ключ этого кошелька
3. Пополните этот кошелек тестовыми токенами на нужных сетях

### 2. Настройте переменную окружения в Vercel

1. Зайдите в настройки проекта на Vercel
2. Перейдите в раздел "Environment Variables"
3. Добавьте новую переменную:
   - **Key**: `FAUCET_OWNER_PRIVATE_KEY`
   - **Value**: Приватный ключ вашего faucet кошелька (без префикса 0x)
   - **Environment**: Production, Preview, Development

### 3. Пополните Faucet кошелек

Faucet кошелек должен иметь достаточно средств на каждой поддерживаемой сети:

- **MegaETH Testnet (6342)**: минимум 0.01 ETH
- **Base Sepolia (84532)**: минимум 0.01 ETH
- **Monad Testnet (10143)**: минимум 0.01 ETH
- **Somnia Testnet (50311)**: минимум 0.01 ETH
- **RISE Testnet (1313161556)**: минимум 0.01 ETH

### 4. Проверьте конфигурацию RPC

Убедитесь, что RPC URL для каждой сети доступны:
- MegaETH: `https://carrot.megaeth.com/rpc`
- Base Sepolia: `https://sepolia.base.org`
- Monad: `https://testnet-rpc.monad.xyz`
- Somnia: `https://testnet.somnia.network`
- RISE: `https://testnet-rpc.rise.com`

### 5. Дополнительные переменные окружения (опционально)

Если стандартные RPC URL не работают, можно переопределить их:
- `MEGAETH_RPC_URL`
- `FOUNDRY_RPC_URL`

## Проверка работы

1. После настройки переменных сделайте redeploy в Vercel
2. В игре нажмите кнопку "Get Test ETH" при низком балансе
3. В консоли браузера должны появиться логи:
   - `💰 Calling optimized faucet for address: 0x...`
   - `🌐 Chain ID: 6342`
   - `📡 Faucet API URL: https://your-app.vercel.app/api/faucet`

## Безопасность

⚠️ **ВАЖНО**: Используйте отдельный кошелек только для faucet, не используйте основной кошелек с реальными средствами!

## Лимиты Faucet

- Каждый адрес может получить 0.0001 ETH за один раз
- Минимальный баланс для получения: < 0.00005 ETH
- Cooldown между запросами: 5 минут