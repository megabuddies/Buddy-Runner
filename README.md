# 🐰 Buddy's Great Carrot Adventure 🥕

A fun jumping game featuring Buddy the bunny, now with Web3 wallet integration powered by **Privy**!

## 🚀 Features

- **Fun Gameplay**: Help Buddy jump over carrots and achieve high scores
- **Web3 Integration**: Connect wallets through Privy (email, phone, or wallet)
- **Modern Tech Stack**: Built with React and Vite
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

1. **Connect your wallet** using the button in the top-right corner
2. **Press SPACE** or **tap the screen** to make Buddy jump
3. **Avoid the carrots** and try to achieve the highest score!

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

## 🌐 Deployment

To deploy this project:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting provider (Vercel, Netlify, etc.)

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

**Enjoy playing Buddy's Great Carrot Adventure! 🐰🥕**