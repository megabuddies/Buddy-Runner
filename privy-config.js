// Official Privy Configuration and Wallet Integration
class PrivyWalletManager {
  constructor() {
    this.appId = 'cme84q0og02aalc0bh9blzwa9';
    this.isConnected = false;
    this.currentUser = null;
    this.walletAddress = null;
    this.privy = null;
    
    // Initialize after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    try {
      // Wait for DOM elements to be available
      await this.waitForElements();
      
      // Initialize without external SDK, use direct wallet connection
      this.initializeDirectWalletConnection();
      
      console.log('Privy-style Wallet Manager initialized');
    } catch (error) {
      console.error('Error initializing Privy Wallet Manager:', error);
      this.showError('Failed to initialize wallet connection. Please refresh the page.');
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
      throw new Error('Wallet button not found');
    }
  }

  initializeDirectWalletConnection() {
    // Initialize UI elements
    this.walletButton = document.getElementById('walletButton');
    this.walletInfo = document.getElementById('walletInfo');
    this.walletStatus = document.getElementById('walletStatus');
    this.walletAddressElement = document.getElementById('walletAddress');

    if (!this.walletButton) {
      console.error('Wallet button not found');
      return;
    }

    // Bind event listeners
    this.walletButton.addEventListener('click', () => this.handleWalletClick());

    // Check for existing connection
    this.checkExistingConnection();
    
    // Listen for provider changes
    this.setupProviderListeners();
  }

  checkExistingConnection() {
    // Check if already connected to any wallet
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            this.walletAddress = accounts[0];
            this.isConnected = true;
            this.updateUI();
          }
        })
        .catch(error => {
          console.log('No existing connection found');
        });
    }
  }

  setupProviderListeners() {
    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.walletAddress = accounts[0];
          this.isConnected = true;
          this.updateUI();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }

  async handleWalletClick() {
    if (this.isConnected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    try {
      this.setLoading(true);
      
      // Show wallet selection modal
      await this.showWalletSelectionModal();
      
    } catch (error) {
      console.error('Connection error:', error);
      this.showError('Failed to connect wallet. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  async showWalletSelectionModal() {
    return new Promise((resolve, reject) => {
      // Create modal overlay
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
        backdrop-filter: blur(5px);
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: modalAppear 0.3s ease-out;
      `;

      // Add animation keyframes
      if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          @keyframes modalAppear {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .wallet-option {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            margin: 10px 0;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f9f9f9;
          }
          .wallet-option:hover {
            border-color: #7FBC7F;
            background: #f0f8f0;
            transform: translateY(-2px);
          }
          .wallet-option img {
            width: 32px;
            height: 32px;
            margin-right: 15px;
          }
          .wallet-option .wallet-name {
            font-weight: bold;
            color: #333;
            flex: 1;
            text-align: left;
          }
          .wallet-option .wallet-status {
            font-size: 12px;
            color: #666;
            margin-left: 10px;
          }
        `;
        document.head.appendChild(style);
      }

      modal.innerHTML = `
        <h2 style="margin-bottom: 20px; color: #333; font-size: 1.5em;">Select Wallet</h2>
        <p style="margin-bottom: 25px; color: #666;">Choose your preferred wallet to connect</p>
        
        <div class="wallet-option" data-wallet="metamask">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iI0Y2ODUxQiIvPgo8cGF0aCBkPSJNMjQuMjQgNC44TDE2LjcyIDEwLjI0TDE4LjI0IDYuOTZMMjQuMjQgNC44WiIgZmlsbD0iI0U5NTY0NyIvPgo8cGF0aCBkPSJNNy43NiA0LjhMMTUuMTI2IDEwLjMwNEwxMy43NiA2Ljk2TDcuNzYgNC44WiIgZmlsbD0iI0U5NTY0NyIvPgo8L3N2Zz4K" alt="MetaMask">
          <span class="wallet-name">MetaMask</span>
          <span class="wallet-status" id="metamask-status">Checking...</span>
        </div>
        
        <div class="wallet-option" data-wallet="rabby">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzdGMjhGRiIvPgo8cGF0aCBkPSJNMTYgOEMyMC40MTgzIDggMjQgMTEuNTgxNyAyNCAxNkMyNCAyMC40MTgzIDIwLjQxODMgMjQgMTYgMjRDMTEuNTgxNyAyNCA4IDIwLjQxODMgOCAxNkM4IDExLjU4MTcgMTEuNTgxNyA4IDE2IDhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="Rabby">
          <span class="wallet-name">Rabby Wallet</span>
          <span class="wallet-status" id="rabby-status">Checking...</span>
        </div>
        
        <button style="
          margin-top: 20px;
          padding: 10px 20px;
          background: #e0e0e0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: #666;
          font-weight: bold;
        " onclick="this.parentElement.parentElement.remove()">Cancel</button>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Check wallet availability
      this.checkWalletAvailability();

      // Handle wallet selection
      const walletOptions = modal.querySelectorAll('.wallet-option');
      walletOptions.forEach(option => {
        option.addEventListener('click', async () => {
          const walletType = option.dataset.wallet;
          overlay.remove();
          try {
            await this.connectToWallet(walletType);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Handle overlay click (close modal)
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          reject(new Error('Connection cancelled'));
        }
      });
    });
  }

  checkWalletAvailability() {
    const metamaskStatus = document.getElementById('metamask-status');
    const rabbyStatus = document.getElementById('rabby-status');

    // Check MetaMask
    if (window.ethereum && window.ethereum.isMetaMask) {
      metamaskStatus.textContent = 'Installed';
      metamaskStatus.style.color = '#28a745';
    } else {
      metamaskStatus.textContent = 'Not installed';
      metamaskStatus.style.color = '#dc3545';
    }

    // Check Rabby (Rabby также устанавливает window.ethereum)
    if (window.ethereum && window.ethereum.isRabby) {
      rabbyStatus.textContent = 'Installed';
      rabbyStatus.style.color = '#28a745';
    } else if (window.ethereum && !window.ethereum.isMetaMask) {
      // Возможно, это Rabby или другой кошелек
      rabbyStatus.textContent = 'Detected';
      rabbyStatus.style.color = '#ffc107';
    } else {
      rabbyStatus.textContent = 'Not installed';
      rabbyStatus.style.color = '#dc3545';
    }
  }

  async connectToWallet(walletType) {
    if (!window.ethereum) {
      throw new Error('No wallet extension found. Please install MetaMask or Rabby.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        this.walletAddress = accounts[0];
        this.isConnected = true;
        this.currentUser = {
          wallet: {
            address: this.walletAddress,
            walletClientType: walletType
          }
        };

        this.updateUI();
        this.showSuccess(`${walletType === 'metamask' ? 'MetaMask' : 'Rabby'} connected successfully!`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to ${walletType}: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      this.setLoading(true);
      
      this.currentUser = null;
      this.walletAddress = null;
      this.isConnected = false;
      
      this.updateUI();
      this.showSuccess('Wallet disconnected');
    } catch (error) {
      console.error('Disconnection error:', error);
      this.showError('Failed to disconnect wallet.');
    } finally {
      this.setLoading(false);
    }
  }

  updateUI() {
    if (!this.walletButton || !this.walletInfo || !this.walletStatus || !this.walletAddressElement) {
      return;
    }

    if (this.isConnected && this.walletAddress) {
      // Update button text
      this.walletButton.textContent = 'Disconnect';
      
      // Show wallet info
      this.walletInfo.classList.remove('hidden');
      this.walletStatus.textContent = 'Connected';
      this.walletAddressElement.textContent = this.formatAddress(this.walletAddress);
      
      // Add connected class for styling
      this.walletButton.classList.add('connected');
    } else {
      // Update button text
      this.walletButton.textContent = 'Connect Wallet';
      
      // Hide wallet info
      this.walletInfo.classList.add('hidden');
      
      // Remove connected class
      this.walletButton.classList.remove('connected');
    }
  }

  setLoading(loading) {
    if (!this.walletButton) return;
    
    if (loading) {
      this.walletButton.disabled = true;
      this.walletButton.textContent = 'Connecting...';
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
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      ${type === 'error' ? 
        'background: linear-gradient(135deg, #ff6b6b, #ee5a52);' : 
        'background: linear-gradient(135deg, #7FBC7F, #6B8E6B);'
      }
    `;
    notification.textContent = message;

    // Add animation styles if not already present
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

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Public API methods for game integration
  getWalletAddress() {
    return this.walletAddress;
  }

  isWalletConnected() {
    return this.isConnected;
  }

  // Method to get user info in Privy format
  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize the wallet manager
window.privyWallet = new PrivyWalletManager();

// Export for use in other scripts
window.PrivyWalletManager = PrivyWalletManager;