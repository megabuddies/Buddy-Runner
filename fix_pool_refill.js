#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'src/hooks/useBlockchainUtils.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add lastRefillIndex to pool initialization
content = content.replace(
  /preSignedPool\.current\[chainKey\] = \{([^}]+)hasTriggeredRefill: false,([^}]+)\}/g,
  (match, before, after) => {
    return `preSignedPool.current[chainKey] = {${before}hasTriggeredRefill: false,
        lastRefillIndex: 0, // Track last refill position${after}}`;
  }
);

// Fix 2: Update the refill logic to use lastRefillIndex
content = content.replace(
  /if \(pool\.currentIndex % 3 === 0 && pool\.currentIndex > 0 && !pool\.hasTriggeredRefill\) \{/g,
  `// Check if we should refill (every 3 transactions, but not too frequently)
      const lastRefillIndex = pool.lastRefillIndex || 0;
      const shouldRefill = pool.currentIndex % 3 === 0 && 
                          pool.currentIndex > 0 && 
                          pool.currentIndex > lastRefillIndex + 2 && // At least 3 transactions since last refill
                          !pool.isRefilling; // Don't refill if already refilling
      
      if (shouldRefill) {`
);

// Fix 3: Set lastRefillIndex when triggering refill
content = content.replace(
  /pool\.hasTriggeredRefill = true;(\s*\n\s*\/\/ Пополняем в фоне)/g,
  `pool.hasTriggeredRefill = true;
        pool.lastRefillIndex = pool.currentIndex; // Remember where we triggered refill$1`
);

// Fix 4: Update log messages to clarify pre-signed vs realtime
content = content.replace(
  "console.log('🚀 Using MegaETH realtime_sendRawTransaction for instant execution...');",
  "console.log('🚀 Sending pre-signed transaction via MegaETH realtime_sendRawTransaction RPC method...');"
);

content = content.replace(
  "console.log('⚡ Sending instant on-chain jump transaction...');",
  "console.log('⚡ Sending pre-signed on-chain jump transaction...');"
);

// Fix 5: Reset hasTriggeredRefill after pool extension
content = content.replace(
  /pool\.hasTriggeredRefill = false; \/\/ Сбрасываем флаг для следующего пополнения/g,
  "// Don't reset hasTriggeredRefill here - use lastRefillIndex instead"
);

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed pool refill logic successfully!');
console.log('Changes made:');
console.log('1. Added lastRefillIndex tracking to prevent duplicate refills');
console.log('2. Updated refill logic to check minimum distance between refills');
console.log('3. Clarified log messages about pre-signed vs realtime transactions');
console.log('4. Removed hasTriggeredRefill reset that was causing issues');