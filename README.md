# 🐰 Buddy Runner - Powered by Mega Buddies 🥕⛓️

A **fully on-chain** jumping game featuring Buddy the bunny! Every jump is a blockchain transaction, showcasing the power of high-speed networks like **MegaETH** (100,000 TPS).

**🚀 Experience real-time blockchain gaming with seamless wallet integration!**

## 🚀 Features

- **On-Chain Gameplay**: Every jump sends a blockchain transaction
- **Multi-Network Support**: MegaETH Testnet, Base Sepolia, Monad Testnet
- **Real-Time Transactions**: Experience the speed of modern blockchains
- **Web3 Integration**: Connect wallets through Privy (email, phone, or wallet)
- **Transaction Queue**: Smart batching system for rapid movements
- **On-Chain Scoring**: Persistent high scores stored on blockchain
- **Network Comparison**: Feel the difference between block times
- **Modern Tech Stack**: Built with React, Vite, and ethers.js
- **Responsive Design**: Works on desktop and mobile devices
- **Beautiful UI**: Clean, modern interface with smooth animations

## 🔧 Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser and go to:**
   ```
   http://localhost:3000
   ```

## 🎮 How to Play

1. **Connect your wallet** first using email, phone, or external wallet
2. **Choose your network** from MegaETH, Base Sepolia, or Monad Testnet  
3. **Press SPACE** or **tap the screen** to make Buddy jump
4. **Avoid the carrots** and try to achieve the highest score!

## 🔐 Wallet Integration

This game uses **Privy** for Web3 authentication and wallet management:

- **Email/Phone Login**: Create embedded wallets through email or phone
- **External Wallets**: Connect MetaMask, Rabby, and other popular wallets
- **Seamless Experience**: No complex wallet setup required
- **Secure**: All authentication handled by Privy's infrastructure

### Privy Configuration

The app is configured with App ID: `cme84q0og02aalc0bh9blzwa9`

Supported features:
- Email and wallet authentication
- Embedded wallet creation
- Multiple blockchain support
- Beautiful, customizable UI

## 🛠 Technologies Used

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Privy** - Web3 authentication and wallet management
- **HTML5 Canvas** - Game rendering
- **CSS3** - Responsive styling and animations

## 📁 Project Structure

```
├── public/
│   └── images/          # Game assets (carrots, sprites)
├── src/
│   ├── components/      # React components
│   │   ├── GameComponent.jsx
│   │   └── WalletComponent.jsx
│   ├── game/           # Game logic classes
│   │   ├── Player.js
│   │   ├── Ground.js
│   │   ├── CarrotController.js
│   │   └── Score.js
│   ├── App.jsx         # Main app component
│   ├── App.css         # Styles
│   └── main.jsx        # Entry point
├── index.html          # HTML template
├── package.json        # Dependencies
└── vite.config.js      # Vite configuration
```

## 🔗 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run serve` - Serve production build

## 💰 Faucet Configuration

The game includes an automatic faucet system that provides 0.0001 ETH to users with low balances (< 0.001 ETH).

### Setting up the Faucet Wallet

1. **Create a separate wallet** specifically for the faucet
2. **Fund this wallet** with ETH for the network you're using  
3. **Set the environment variable** in your deployment:

   **For Vercel deployment:**
   ```bash
   FAUCET_OWNER_PRIVATE_KEY=your_faucet_wallet_private_key_here
   ```

   ⚠️ **Security Note**: Never commit private keys to your repository! Always use environment variables.

### How the Faucet Works

- Automatically triggers when user balance < 0.001 ETH
- Sends 0.0001 ETH per request
- Users can also manually request funds via the "Get Test ETH" button
- Works across all supported networks (MegaETH, Base Sepolia, etc.)

## 🌐 Deployment

To deploy this project:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Set up environment variables** (especially `FAUCET_OWNER_PRIVATE_KEY`)

3. **Deploy the `dist` folder** to your hosting provider (Vercel, Netlify, etc.)

## 🎯 Game Features

- **Smooth animations** and responsive controls
- **Progressive difficulty** - game speeds up over time
- **High score tracking** with local storage
- **Beautiful background** with clouds and flowers
- **Player identification** through connected wallet/email

## 🤝 Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Enjoy playing Buddy Runner - Powered by Mega Buddies! 🐰🥕**