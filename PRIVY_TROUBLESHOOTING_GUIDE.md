# Privy Embedded Wallet Troubleshooting Guide

## Issues Fixed

### 1. Configuration Issues
- ✅ Fixed hardcoded App ID - now uses environment variable
- ✅ Corrected embedded wallet configuration structure
- ✅ Added proper Abstract Testnet support
- ✅ Fixed indentation and syntax issues in privyConfig

### 2. RPC Method Issues
- ✅ The `eth_signTransaction` method being blocked is expected behavior for MegaETH
- ✅ Updated blockchain utilities to handle Abstract Testnet (chain ID 11124)
- ✅ Improved error handling for RPC method restrictions

### 3. Environment Variables
- ✅ Created `.env.example` with proper variable names
- ✅ Updated code to use `VITE_PRIVY_APP_ID` instead of hardcoded value

## Required Actions

### 1. Environment Variables Setup
Add these environment variables to your Vercel deployment:

```bash
VITE_PRIVY_APP_ID=cm25q62mj00nks8j5lxk4qyly
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

### 2. Privy Dashboard Configuration
1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Select your app with ID: `cm25q62mj00nks8j5lxk4qyly`
3. Add your domains to the allowlist:
   - `https://buddy-runner.vercel.app`
   - `https://*.vercel.app` (for preview deployments)
   - `http://localhost:*` (for development)

### 3. Embedded Wallet Policy Settings
In Privy Dashboard → Wallets → Embedded Wallets:
- ✅ Enable "Create on login" for all users
- ✅ Disable "Require user password on create"
- ✅ Configure supported chains: MegaETH Testnet, Abstract Testnet, etc.

## Debugging Steps

### Check Wallet Creation
The updated `WalletConnection.jsx` now includes debug logging:
- Monitor browser console for wallet creation status
- Check if wallets array is populated after authentication
- Verify wallet types and addresses

### Common Issues & Solutions

#### CORS Errors
```
Access to fetch at 'https://auth.privy.io/api/v1/analytics_events' has been blocked by CORS policy
```
**Solution**: Add your domain to Privy Dashboard allowlist

#### RPC Method Not Whitelisted
```
{"code":-32601,"message":"rpc method is not whitelisted"}
```
**Solution**: This is expected for MegaETH. The code handles local signing properly.

#### Wallet Not Created
```
User authenticated but no wallets found
```
**Solution**: Check Privy Dashboard embedded wallet settings and ensure `createOnLogin: 'all-users'` is configured.

## Testing

1. Deploy with new environment variables
2. Test login flow - should see debug logs in console
3. Verify embedded wallet creation after authentication
4. Test blockchain operations on supported networks

## Notes

- The pre-signing and faucet systems are working correctly
- The issue was specifically with embedded wallet creation configuration
- MegaETH RPC rejecting `eth_signTransaction` is expected behavior - the code handles this with local signing