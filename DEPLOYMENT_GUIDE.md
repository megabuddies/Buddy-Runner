# Vercel Deployment Guide

This guide will help you deploy the Buddy Runner application to Vercel successfully.

## Fixed Issues

The following issues have been resolved:
- ✅ Fixed `getChainId is not a function` error
- ✅ Fixed viem client binding errors
- ✅ Fixed faucet API 405 errors
- ✅ Fixed JSON parsing errors
- ✅ Updated Vercel configuration for proper API routing

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare the faucet owner private key

## Step 1: Environment Variables

Set up the following environment variables in your Vercel dashboard:

### Required Variables
```bash
FAUCET_OWNER_PRIVATE_KEY=your_private_key_without_0x_prefix
```

### Optional Variables (with defaults)
```bash
MEGAETH_RPC_URL=https://carrot.megaeth.com/rpc
FOUNDRY_RPC_URL=http://127.0.0.1:8545
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add environment variables in the "Environment Variables" section
6. Click "Deploy"

### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Step 3: Verify Deployment

### Test the Application
1. Visit your Vercel URL
2. Try connecting a wallet
3. Test network switching
4. Verify faucet functionality

### Test API Endpoints
```bash
# Test health check
curl https://your-app.vercel.app/api/health

# Test faucet endpoint (replace with actual address and chainId)
curl -X POST https://your-app.vercel.app/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"0x742b70f16F1f5C1B0F1B13AbC5a6E8F4Ba56e6FB","chainId":6342}'
```

## Project Structure

```
buddy-runner/
├── api/                      # Vercel serverless functions
│   ├── faucet.js            # Faucet API endpoint
│   └── health.js            # Health check endpoint
├── src/                     # React application source
├── dist/                    # Build output (auto-generated)
├── public/                  # Static assets
├── .nvmrc                   # Node.js version specification
├── package.json             # Dependencies and scripts
├── vercel.json             # Vercel configuration
└── vite.config.js          # Vite build configuration
```

## Supported Networks

The application supports the following blockchain networks:

- **MegaETH Testnet** (6342) - Primary network
- **Foundry Local** (31337) - Local development
- **Somnia Testnet** (50311)
- **RISE Testnet** (1313161556)
- **Base Sepolia** (84532)
- **Monad Testnet** (10143)

## Contract Addresses

All networks use the same contract addresses:
- **Faucet Contract**: `0x76b71a17d82232fd29aca475d14ed596c67c4b85`
- **Updater Contract**: `0xb34cac1135c27ec810e7e6880325085783c1a7e0`

## Troubleshooting

### Common Issues

1. **API 404 Errors**
   - Check that files are in the `api/` directory
   - Verify Vercel has detected the API functions

2. **Environment Variable Issues**
   - Ensure `FAUCET_OWNER_PRIVATE_KEY` is set correctly
   - Remove `0x` prefix from private key
   - Redeploy after adding environment variables

3. **Build Failures**
   - Check Node.js version (should be 18.x)
   - Verify all dependencies are installed
   - Check for syntax errors in the code

4. **Wallet Connection Issues**
   - Verify Privy app ID is correct
   - Check network configurations
   - Ensure supported chains are properly configured

### Debug Steps

1. **Check Vercel Logs**
   ```bash
   vercel logs your-app-url
   ```

2. **Test API Locally**
   ```bash
   npm run dev
   # Test at http://localhost:5173/api/health
   ```

3. **Verify Environment Variables**
   ```bash
   vercel env ls
   ```

## Performance Optimizations

The application includes several optimizations:
- Pre-signed transaction pools for instant gameplay
- Client and gas parameter caching
- Automatic wallet funding via faucet
- Network-specific RPC optimizations

## Security Notes

- Private keys are stored securely in Vercel environment variables
- CORS is properly configured for API endpoints
- Input validation is implemented for all API calls
- Rate limiting can be added via Vercel Edge Functions

## Next Steps

After successful deployment:
1. Test all functionality thoroughly
2. Monitor application performance
3. Set up monitoring and alerts
4. Consider implementing additional security measures
5. Scale as needed based on usage

For issues or questions, refer to the error logs in Vercel dashboard or check the application console for detailed error messages.