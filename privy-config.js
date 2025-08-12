// Privy-Style Wallet Manager для Web3 интеграции
// App ID: cme84q0og02aalc0bh9blzwa9

class PrivyWalletManager {
  constructor() {
    this.appId = 'cme84q0og02aalc0bh9blzwa9';
    this.isConnected = false;
    this.currentUser = null;
    this.walletAddress = null;
    this.walletType = null;
    this.chainId = null;
    
    // Privy-like configuration
    this.config = {
      loginMethods: ['wallet'],
      appearance: {
        theme: 'light',
        accentColor: '#7FBC7F',
        logo: null
      },
      supportedChains: [
        { id: 1, name: 'Ethereum Mainnet' },
        { id: 5, name: 'Goerli Testnet' },
        { id: 137, name: 'Polygon' },
        { id: 80001, name: 'Mumbai Testnet' }
      ]
    };
    
    // Initialize after DOM loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    try {
      console.log(`🔗 Инициализация Privy Wallet Manager (App ID: ${this.appId})`);
      
      // Wait for UI elements
      await this.waitForElements();
      
      // Setup UI
      this.setupUI();
      
      // Check for existing connections
      await this.checkExistingConnection();
      
      // Setup wallet event listeners
      this.setupWalletListeners();
      
      console.log('✅ Privy Wallet Manager успешно инициализирован');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации Privy Wallet Manager:', error);
      this.showError('Не удалось инициализировать подключение кошелька. Обновите страницу.');
    }
  }

  async waitForElements() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!document.getElementById('walletButton') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!document.getElementById('walletButton')) {
      throw new Error('Элементы интерфейса кошелька не найдены');
    }
  }

  setupUI() {
    // Get UI elements
    this.walletButton = document.getElementById('walletButton');
    this.walletInfo = document.getElementById('walletInfo');
    this.walletStatus = document.getElementById('walletStatus');
    this.walletAddressElement = document.getElementById('walletAddress');

    if (!this.walletButton) {
      console.error('Кнопка кошелька не найдена');
      return;
    }

    // Bind event handlers
    this.walletButton.addEventListener('click', () => this.handleWalletClick());
    
    console.log('🎨 UI элементы настроены');
  }

  async checkExistingConnection() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.chainId = await window.ethereum.request({ method: 'eth_chainId' });
          this.isConnected = true;
          this.walletType = this.detectWalletType();
          
          this.currentUser = {
            id: this.generateUserId(),
            wallet: {
              address: this.walletAddress,
              chainId: this.chainId,
              walletClientType: this.walletType
            },
            createdAt: new Date().toISOString()
          };
          
          this.updateUI();
          console.log('🔄 Найдено существующее подключение:', this.walletAddress);
        }
      } catch (error) {
        console.log('ℹ️ Нет существующего подключения');
      }
    }
  }

  setupWalletListeners() {
    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.walletAddress = accounts[0];
          this.updateUserData();
          this.updateUI();
          console.log('🔄 Аккаунт изменен:', this.walletAddress);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId) => {
        this.chainId = chainId;
        this.updateUserData();
        this.updateUI();
        console.log('🔗 Сеть изменена:', chainId);
      });

      // Listen for connection events
      window.ethereum.on('connect', (connectInfo) => {
        console.log('🔗 Подключено к сети:', connectInfo.chainId);
      });

      window.ethereum.on('disconnect', (error) => {
        console.log('❌ Отключено от сети:', error);
        this.disconnect();
      });
    }
  }

  detectWalletType() {
    if (window.ethereum) {
      if (window.ethereum.isMetaMask) return 'metamask';
      if (window.ethereum.isRabby) return 'rabby';
      if (window.ethereum.isCoinbaseWallet) return 'coinbase_wallet';
      if (window.ethereum.isWalletConnect) return 'wallet_connect';
      return 'injected';
    }
    return 'unknown';
  }

  generateUserId() {
    // Generate Privy-like user ID based on wallet address and app ID
    const combined = this.walletAddress + this.appId;
    return 'did:privy:' + this.hashString(combined).substring(0, 32);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  updateUserData() {
    if (this.currentUser) {
      this.currentUser.wallet.address = this.walletAddress;
      this.currentUser.wallet.chainId = this.chainId;
      this.currentUser.wallet.walletClientType = this.detectWalletType();
    }
  }

  async handleWalletClick() {
    if (this.isConnected) {
      await this.disconnect();
    } else {
      await this.login();
    }
  }

  async login() {
    try {
      this.setLoading(true);
      
      if (!window.ethereum) {
        this.showWalletInstallModal();
        return;
      }

      // Show Privy-style wallet selection modal
      await this.showPrivyStyleModal();
      
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
      if (error.message !== 'Подключение отменено пользователем') {
        this.showError('Не удалось подключить кошелек. Попробуйте снова.');
      }
    } finally {
      this.setLoading(false);
    }
  }

  async showPrivyStyleModal() {
    return new Promise((resolve, reject) => {
      // Create Privy-style modal
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(8px);
        animation: fadeIn 0.2s ease-out;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s ease-out;
      `;

      // Add animations
      if (!document.getElementById('privy-styles')) {
        const style = document.createElement('style');
        style.id = 'privy-styles';
        style.textContent = `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .privy-wallet-option {
            display: flex;
            align-items: center;
            padding: 16px 20px;
            margin: 12px 0;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #fafafa;
          }
          .privy-wallet-option:hover {
            border-color: #7FBC7F;
            background: #f0f8f0;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(127, 188, 127, 0.2);
          }
          .privy-wallet-option:active {
            transform: translateY(0);
          }
          .privy-wallet-icon {
            width: 32px;
            height: 32px;
            margin-right: 16px;
            border-radius: 8px;
          }
          .privy-wallet-info {
            flex: 1;
          }
          .privy-wallet-name {
            font-weight: 600;
            color: #333;
            font-size: 16px;
            margin-bottom: 2px;
          }
          .privy-wallet-status {
            font-size: 13px;
            color: #666;
          }
          .privy-close-btn {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 32px;
            height: 32px;
            border: none;
            background: #f0f0f0;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
          }
          .privy-close-btn:hover {
            background: #e0e0e0;
          }
        `;
        document.head.appendChild(style);
      }

      modal.innerHTML = `
        <button class="privy-close-btn" onclick="this.closest('.modal-overlay').remove(); arguments[1] && arguments[1]()">×</button>
        
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 600; color: #333; margin-bottom: 8px;">
            Подключить кошелек
          </h2>
          <p style="color: #666; font-size: 14px;">
            Powered by Privy • App ID: ${this.appId.substring(0, 8)}...
          </p>
        </div>
        
        <div class="privy-wallet-option" data-wallet="metamask">
          <img class="privy-wallet-icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iI0Y2ODUxQiIvPgo8cGF0aCBkPSJNMjQuMjQgNC44TDE2LjcyIDEwLjI0TDE4LjI0IDYuOTZMMjQuMjQgNC44WiIgZmlsbD0iI0U5NTY0NyIvPgo8cGF0aCBkPSJNNy43NiA0LjhMMTUuMTI2IDEwLjMwNEwxMy43NiA2Ljk2TDcuNzYgNC44WiIgZmlsbD0iI0U5NTY0NyIvPgo8L3N2Zz4K" alt="MetaMask">
          <div class="privy-wallet-info">
            <div class="privy-wallet-name">MetaMask</div>
            <div class="privy-wallet-status" id="metamask-status">Проверка...</div>
          </div>
        </div>
        
        <div class="privy-wallet-option" data-wallet="rabby">
          <img class="privy-wallet-icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzdGMjhGRiIvPgo8cGF0aCBkPSJNMTYgOEMyMC40MTgzIDggMjQgMTEuNTgxNyAyNCAxNkMyNCAyMC40MTgzIDIwLjQxODMgMjQgMTYgMjRDMTEuNTgxNyAyNCA4IDIwLjQxODMgOCAxNkM4IDExLjU4MTcgMTEuNTgxNyA4IDE2IDhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="Rabby">
          <div class="privy-wallet-info">
            <div class="privy-wallet-name">Rabby Wallet</div>
            <div class="privy-wallet-status" id="rabby-status">Проверка...</div>
          </div>
        </div>
        
        <div class="privy-wallet-option" data-wallet="coinbase">
          <img class="privy-wallet-icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzAwNTNGRiIvPgo8cGF0aCBkPSJNMTYgOEMxOS4zMTM3IDggMjIgMTAuNjg2MyAyMiAxNEMyMiAxNy4zMTM3IDE5LjMxMzcgMjAgMTYgMjBDMTIuNjg2MyAyMCAxMCAxNy4zMTM3IDEwIDE0QzEwIDEwLjY4NjMgMTIuNjg2MyA4IDE2IDhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="Coinbase">
          <div class="privy-wallet-info">
            <div class="privy-wallet-name">Coinbase Wallet</div>
            <div class="privy-wallet-status" id="coinbase-status">Проверка...</div>
          </div>
        </div>
        
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
          <p style="font-size: 12px; color: #999;">
            Нет кошелька? <a href="#" id="get-wallet-link" style="color: #7FBC7F; text-decoration: none;">Установить кошелек</a>
          </p>
        </div>
      `;

      overlay.appendChild(modal);
      overlay.classList.add('modal-overlay');
      document.body.appendChild(overlay);

      // Check wallet availability
      this.checkWalletAvailability();

      // Handle wallet selection
      const walletOptions = modal.querySelectorAll('.privy-wallet-option');
      walletOptions.forEach(option => {
        option.addEventListener('click', async () => {
          const walletType = option.dataset.wallet;
          overlay.remove();
          try {
            await this.connectWallet(walletType);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Handle get wallet link
      const getWalletLink = modal.querySelector('#get-wallet-link');
      getWalletLink.addEventListener('click', (e) => {
        e.preventDefault();
        overlay.remove();
        this.showWalletInstallModal();
        reject(new Error('Перенаправление на установку кошелька'));
      });

      // Handle close button and overlay click
      const closeBtn = modal.querySelector('.privy-close-btn');
      closeBtn.addEventListener('click', () => {
        overlay.remove();
        reject(new Error('Подключение отменено пользователем'));
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          reject(new Error('Подключение отменено пользователем'));
        }
      });
    });
  }

  checkWalletAvailability() {
    const statuses = {
      metamask: document.getElementById('metamask-status'),
      rabby: document.getElementById('rabby-status'),
      coinbase: document.getElementById('coinbase-status')
    };

    // Check MetaMask
    if (window.ethereum && window.ethereum.isMetaMask) {
      statuses.metamask.textContent = 'Установлен';
      statuses.metamask.style.color = '#28a745';
    } else {
      statuses.metamask.textContent = 'Не установлен';
      statuses.metamask.style.color = '#dc3545';
    }

    // Check Rabby
    if (window.ethereum && window.ethereum.isRabby) {
      statuses.rabby.textContent = 'Установлен';
      statuses.rabby.style.color = '#28a745';
    } else {
      statuses.rabby.textContent = 'Не установлен';
      statuses.rabby.style.color = '#dc3545';
    }

    // Check Coinbase
    if (window.ethereum && window.ethereum.isCoinbaseWallet) {
      statuses.coinbase.textContent = 'Установлен';
      statuses.coinbase.style.color = '#28a745';
    } else {
      statuses.coinbase.textContent = 'Не установлен';
      statuses.coinbase.style.color = '#dc3545';
    }
  }

  async connectWallet(walletType) {
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        this.walletAddress = accounts[0];
        this.chainId = await window.ethereum.request({ method: 'eth_chainId' });
        this.isConnected = true;
        this.walletType = walletType;

        // Create Privy-like user object
        this.currentUser = {
          id: this.generateUserId(),
          wallet: {
            address: this.walletAddress,
            chainId: this.chainId,
            walletClientType: walletType
          },
          createdAt: new Date().toISOString()
        };

        this.updateUI();
        this.showSuccess(`${this.getWalletDisplayName(walletType)} подключен!`);
        
        console.log('✅ Кошелек подключен:', {
          address: this.walletAddress,
          chainId: this.chainId,
          type: walletType
        });
      }
    } catch (error) {
      throw new Error(`Ошибка подключения к ${walletType}: ${error.message}`);
    }
  }

  getWalletDisplayName(walletType) {
    const names = {
      metamask: 'MetaMask',
      rabby: 'Rabby Wallet',
      coinbase: 'Coinbase Wallet',
      injected: 'Кошелек браузера'
    };
    return names[walletType] || 'Кошелек';
  }

  showWalletInstallModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(8px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
      text-align: center;
    `;

    modal.innerHTML = `
      <h2 style="margin-bottom: 16px; color: #333; font-size: 24px; font-weight: 600;">
        Установите Web3 кошелек
      </h2>
      <p style="margin-bottom: 32px; color: #666; font-size: 16px;">
        Для использования игры нужен кошелек Web3
      </p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <a href="https://metamask.io/download/" target="_blank" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          text-decoration: none;
          color: #333;
          transition: all 0.2s ease;
        " onmouseover="this.style.borderColor='#7FBC7F'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e0e0e0'; this.style.transform='translateY(0)'">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9IiNGNjg1MUIiLz4KPC9zdmc+Cg==" alt="MetaMask" style="width: 48px; height: 48px; margin-bottom: 12px;">
          <span style="font-weight: 600; font-size: 14px;">MetaMask</span>
          <span style="font-size: 12px; color: #666; margin-top: 4px;">Популярный выбор</span>
        </a>
        
        <a href="https://rabby.io/" target="_blank" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          text-decoration: none;
          color: #333;
          transition: all 0.2s ease;
        " onmouseover="this.style.borderColor='#7FBC7F'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e0e0e0'; this.style.transform='translateY(0)'">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9IiM3RjI4RkYiLz4KPC9zdmc+Cg==" alt="Rabby" style="width: 48px; height: 48px; margin-bottom: 12px;">
          <span style="font-weight: 600; font-size: 14px;">Rabby</span>
          <span style="font-size: 12px; color: #666; margin-top: 4px;">Для продвинутых</span>
        </a>
      </div>
      
      <button onclick="this.parentElement.parentElement.remove()" style="
        padding: 12px 24px;
        background: #7FBC7F;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        color: white;
        font-weight: 600;
        font-size: 14px;
        transition: background 0.2s ease;
      " onmouseover="this.style.background='#6B8E6B'" onmouseout="this.style.background='#7FBC7F'">
        Понятно
      </button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  async logout() {
    await this.disconnect();
  }

  async disconnect() {
    try {
      this.setLoading(true);
      
      this.currentUser = null;
      this.walletAddress = null;
      this.walletType = null;
      this.chainId = null;
      this.isConnected = false;
      
      this.updateUI();
      this.showSuccess('Кошелек отключен');
      
      console.log('🔌 Кошелек отключен');
    } catch (error) {
      console.error('❌ Ошибка отключения:', error);
      this.showError('Не удалось отключить кошелек.');
    } finally {
      this.setLoading(false);
    }
  }

  updateUI() {
    if (!this.walletButton || !this.walletInfo || !this.walletStatus || !this.walletAddressElement) {
      return;
    }

    if (this.isConnected && this.walletAddress) {
      this.walletButton.textContent = 'Отключить';
      this.walletInfo.classList.remove('hidden');
      this.walletStatus.textContent = 'Подключен';
      this.walletAddressElement.textContent = this.formatAddress(this.walletAddress);
      this.walletButton.classList.add('connected');
    } else {
      this.walletButton.textContent = 'Подключить кошелек';
      this.walletInfo.classList.add('hidden');
      this.walletButton.classList.remove('connected');
    }
  }

  setLoading(loading) {
    if (!this.walletButton) return;
    
    if (loading) {
      this.walletButton.disabled = true;
      this.walletButton.textContent = 'Подключение...';
      this.walletButton.classList.add('loading');
    } else {
      this.walletButton.disabled = false;
      this.walletButton.classList.remove('loading');
      this.updateUI();
    }
  }

  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 16px 20px;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      max-width: 300px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      ${type === 'error' ? 
        'background: linear-gradient(135deg, #ff6b6b, #ee5a52);' : 
        'background: linear-gradient(135deg, #7FBC7F, #6B8E6B);'
      }
    `;
    notification.textContent = message;

    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  // Privy-compatible API methods
  getUser() {
    return this.currentUser;
  }

  getWalletAddress() {
    return this.walletAddress;
  }

  isWalletConnected() {
    return this.isConnected;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Additional utility methods
  getChainId() {
    return this.chainId;
  }

  getWalletType() {
    return this.walletType;
  }

  getAppId() {
    return this.appId;
  }
}

// Initialize the Privy-style wallet manager
console.log('🚀 Загрузка Privy Wallet Manager...');
window.privyWallet = new PrivyWalletManager();

// Export for use in other scripts
window.PrivyWalletManager = PrivyWalletManager;

// Privy-compatible global aliases
window.privy = {
  login: () => window.privyWallet.login(),
  logout: () => window.privyWallet.logout(),
  getUser: () => window.privyWallet.getUser(),
  isAuthenticated: () => window.privyWallet.isWalletConnected()
};