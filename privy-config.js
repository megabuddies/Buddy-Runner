// Privy Configuration and Wallet Integration
class PrivyWalletManager {
  constructor() {
    this.appId = 'cme84q0og02aalc0bh9blzwa9';
    this.isConnected = false;
    this.currentUser = null;
    this.walletAddress = null;
    
    // Initialize after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    try {
      // Initialize UI elements
      this.walletButton = document.getElementById('walletButton');
      this.walletInfo = document.getElementById('walletInfo');
      this.walletStatus = document.getElementById('walletStatus');
      this.walletAddress = document.getElementById('walletAddress');

      if (!this.walletButton) {
        console.error('Wallet button not found');
        return;
      }

      // Bind event listeners
      this.walletButton.addEventListener('click', () => this.handleWalletClick());

      // Check if user is already connected (from localStorage)
      this.checkExistingConnection();

      console.log('Privy Wallet Manager initialized');
    } catch (error) {
      console.error('Error initializing Privy Wallet Manager:', error);
    }
  }

  checkExistingConnection() {
    const savedConnection = localStorage.getItem('privy_wallet_connection');
    if (savedConnection) {
      try {
        const connectionData = JSON.parse(savedConnection);
        this.walletAddress = connectionData.address;
        this.isConnected = true;
        this.updateUI();
      } catch (error) {
        console.error('Error parsing saved connection:', error);
        localStorage.removeItem('privy_wallet_connection');
      }
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

      // Check if MetaMask is available
      if (typeof window.ethereum !== 'undefined') {
        await this.connectWithMetaMask();
      } else {
        // Fallback: Try to use WalletConnect or other providers
        await this.connectWithAlternative();
      }
    } catch (error) {
      console.error('Connection error:', error);
      this.showError('Failed to connect wallet. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  async connectWithMetaMask() {
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        this.walletAddress = accounts[0];
        this.isConnected = true;

        // Save connection to localStorage
        const connectionData = {
          address: this.walletAddress,
          provider: 'metamask',
          timestamp: Date.now()
        };
        localStorage.setItem('privy_wallet_connection', JSON.stringify(connectionData));

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length === 0) {
            this.disconnect();
          } else {
            this.walletAddress = accounts[0];
            this.updateUI();
          }
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });

        this.updateUI();
        this.showSuccess('Wallet connected successfully!');

        // Send connection event to Privy-like analytics
        this.trackConnection('metamask');
      }
    } catch (error) {
      throw new Error(`MetaMask connection failed: ${error.message}`);
    }
  }

  async connectWithAlternative() {
    // For now, show a message to install MetaMask
    // In a real implementation, you could integrate WalletConnect here
    this.showError('Please install MetaMask or use a Web3-enabled browser to connect your wallet.');
  }

  async disconnect() {
    try {
      this.isConnected = false;
      this.walletAddress = null;
      this.currentUser = null;

      // Remove saved connection
      localStorage.removeItem('privy_wallet_connection');

      // Remove event listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }

      this.updateUI();
      this.showSuccess('Wallet disconnected');

      // Track disconnection
      this.trackDisconnection();
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  }

  updateUI() {
    if (this.isConnected && this.walletAddress) {
      // Update button text
      this.walletButton.textContent = 'Disconnect';
      
      // Show wallet info
      this.walletInfo.classList.remove('hidden');
      this.walletStatus.textContent = 'Connected';
      this.walletAddress.textContent = this.formatAddress(this.walletAddress);
      
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
      z-index: 1000;
      animation: slideIn 0.3s ease;
      ${type === 'error' ? 
        'background: linear-gradient(135deg, #ff6b6b, #ee5a52);' : 
        'background: linear-gradient(135deg, #7FBC7F, #6B8E6B);'
      }
    `;
    notification.textContent = message;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

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

  // Analytics tracking (Privy-like functionality)
  trackConnection(provider) {
    const event = {
      type: 'wallet_connected',
      provider: provider,
      address: this.walletAddress,
      timestamp: Date.now(),
      appId: this.appId
    };
    
    console.log('Wallet connection tracked:', event);
    
    // In a real implementation, you would send this to Privy's analytics
    // For now, we'll just log it
  }

  trackDisconnection() {
    const event = {
      type: 'wallet_disconnected',
      timestamp: Date.now(),
      appId: this.appId
    };
    
    console.log('Wallet disconnection tracked:', event);
  }

  // Public API methods for game integration
  getWalletAddress() {
    return this.walletAddress;
  }

  isWalletConnected() {
    return this.isConnected;
  }

  // Method to get user info in Privy-like format
  getCurrentUser() {
    if (!this.isConnected) return null;
    
    return {
      id: this.walletAddress,
      wallet: {
        address: this.walletAddress,
        chainType: 'ethereum'
      },
      connectedAt: new Date().toISOString()
    };
  }
}

// Initialize the wallet manager
window.privyWallet = new PrivyWalletManager();

// Export for use in other scripts
window.PrivyWalletManager = PrivyWalletManager;