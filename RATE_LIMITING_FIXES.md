# Rate Limiting Fixes for Privy API

## Issue Identified

The application was hitting Privy's API rate limits when trying to pre-sign multiple transactions simultaneously. This caused:

- **429 (Too Many Requests)** errors from Privy's recovery endpoints
- **Failed wallet recovery** messages
- **Transaction signing failures**
- **Blockchain initialization errors**

## Root Cause

The original implementation tried to sign 20 transactions in parallel using `Promise.all()`, which triggered multiple simultaneous requests to Privy's embedded wallet recovery API, exceeding their rate limits.

## Fixes Applied

### 1. **Sequential Transaction Signing**
Changed from parallel to sequential signing to respect rate limits:

```javascript
// BEFORE: Parallel signing (rate limited)
const signingPromises = Array.from({ length: batchSize }, async (_, i) => {
  return await walletClient.signTransaction(txData);
});
const results = await Promise.all(signingPromises);

// AFTER: Sequential signing with delays
const results = [];
for (let i = 0; i < batchSize; i++) {
  const signedTx = await walletClient.signTransaction(txData);
  results.push(signedTx);
  
  // Add delay between signings
  if (i < batchSize - 1) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
```

### 2. **Reduced Batch Sizes**
- **Initial batch**: 20 → 5 transactions
- **Extension batch**: 10 → 3 transactions
- **Legacy fallback**: 10 → 3 transactions

### 3. **Intelligent Retry Logic**
Added proper handling for rate limit errors:

```javascript
catch (signError) {
  if (signError.message.includes('Too many requests') || signError.message.includes('429')) {
    console.log('Rate limited, waiting 3 seconds before retry...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Retry the transaction
    const signedTx = await walletClient.signTransaction(txData);
    results.push(signedTx);
  } else {
    throw signError;
  }
}
```

### 4. **Smart Pool Management**
- **Refill trigger**: Every 2 transactions instead of 5
- **Pool size limit**: Maximum 10 transactions
- **Extension delays**: 1-1.2 seconds between signings

### 5. **Network-Specific Delays**
- **EIP-1559 transactions**: 500ms delays
- **Legacy transactions**: 800ms delays (more conservative)
- **Pool extensions**: 1000-1200ms delays

## Implementation Details

### Pre-signing Function Updates
```javascript
const preSignBatch = async (chainId, startNonce, batchSize = 5) => {
  // Sequential signing with 500ms delays
  // Retry logic for rate limits
  // Fallback to legacy transactions if needed
}
```

### Pool Extension Updates
```javascript
const extendPool = async (chainId, nextNonce, batchSize = 3) => {
  // Conservative approach with longer delays
  // Graceful handling of rate limit errors
  // Skip failed transactions instead of failing entirely
}
```

### Legacy Transaction Support
```javascript
const preSignBatchLegacy = async (chainId, startNonce, batchSize = 3) => {
  // Longer delays (800ms) for legacy transactions
  // 5-second retry delays for rate limits
  // Smaller batch sizes for better reliability
}
```

## Benefits of the Fixes

### ✅ **Reliability**
- No more 429 errors from Privy API
- Consistent transaction signing success
- Graceful handling of temporary failures

### ✅ **Performance**
- Still maintains pre-signed transaction pools
- Instant gameplay once pool is established
- Smart refill system maintains pool size

### ✅ **User Experience**
- Smooth wallet connection
- No visible errors in console
- Faster initialization with smaller initial batch

### ✅ **Scalability**
- Respects Privy's rate limits
- Can be adjusted for higher throughput if needed
- Extensible to other wallet providers

## Configuration Options

The following parameters can be tuned based on needs:

```javascript
// Initial batch size (balance between speed and rate limits)
const INITIAL_BATCH_SIZE = 5;

// Extension batch size (smaller for reliability)
const EXTENSION_BATCH_SIZE = 3;

// Delays between signings
const EIP1559_DELAY = 500;  // ms
const LEGACY_DELAY = 800;   // ms
const EXTENSION_DELAY = 1000; // ms

// Retry delays for rate limits
const RETRY_DELAY = 3000;   // ms
const LEGACY_RETRY_DELAY = 5000; // ms
```

## Testing Results

After implementing these fixes:
- ✅ **Wallet connection**: Successful without errors
- ✅ **Network switching**: Smooth transitions
- ✅ **Transaction pre-signing**: Completes successfully
- ✅ **Pool management**: Maintains adequate transaction supply
- ✅ **Error handling**: Graceful recovery from temporary issues

## Future Improvements

1. **Dynamic Rate Limiting**: Adjust delays based on observed API response times
2. **Pool Optimization**: Intelligent prediction of transaction needs
3. **Caching**: Store signed transactions across sessions
4. **Monitoring**: Track API rate limit usage and optimize accordingly

The application now respects Privy's API limits while maintaining the revolutionary pre-signed transaction system for instant blockchain gameplay!