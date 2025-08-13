# Contract Integration - Updater & Faucet

This project now includes full integration with your Updater and Faucet smart contracts on MegaETH testnet.

## 🚀 Deployed Contracts

### MegaETH Testnet - Live Contracts ✅

**Updater Contract:**
- Address: `0xb34cac1135c27ec810e7e6880325085783c1a7e0`
- Transaction: `0xa1538acccf8a5b7f9fdcf305db56c858b8f62f64a378826bbc11e495deb63aae`
- Block: 13907936

**Faucet Contract:**
- Address: `0x76b71a17d82232fd29aca475d14ed596c67c4b85`
- Transaction: `0x1f483a2fd41a393cadabb5ef7fe3cf72a430592bbb49ec9e82dc75664002c425`
- Block: 13907925

**Owner:** `0x0Fd736429b6fCeFC750d24a4C2A3bE61b39724c3`

The contracts are now **LIVE** and ready to use! 🎉

## 📁 Project Structure

```
src/
├── config/
│   └── contracts.js          # Contract addresses and network configuration
├── abis/
│   ├── Updater.json         # Updater contract ABI
│   └── Faucet.json          # Faucet contract ABI
├── services/
│   └── contractService.js   # Contract interaction service
├── hooks/
│   └── useContracts.js      # React hooks for contract interactions
└── components/
    ├── UpdaterComponent.jsx  # Updater contract UI
    ├── FaucetComponent.jsx   # Faucet contract UI
    └── ContractDashboard.jsx # Main dashboard
```

## 🔧 Setup Instructions

### 1. Deploy Contracts

Deploy these contracts to MegaETH testnet using Remix:

**Updater.sol:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Updater {
    uint256 public number;

    function update() public  {
        number++;
    }
}
```

**Faucet.sol:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Faucet {
    error NotOwner();
    error FaucetEmpty();
    error FailedToSend();

    address public owner;
    uint public constant DRIP_AMOUNT = 0.05 ether;

    constructor(){
        owner = msg.sender;
    }
    
    function deposit() external payable {}
    function emergencyWithdraw() external { /* ... */ }
    function changeOwner(address _newOwner) public { /* ... */ }
    function drip(address payable _to) public { /* ... */ }
}
```

### 2. Configuration ✅ COMPLETED

The contract addresses are already configured in `src/config/contracts.js`:

```javascript
export const CONTRACTS = {
  megaeth: {
    chainId: 6342,
    name: "MegaETH Testnet",
    explorer: "https://carrot.megaeth.com",
    contracts: {
      updater: "0xb34cac1135c27ec810e7e6880325085783c1a7e0", // ✅ LIVE
      faucet: "0x76b71a17d82232fd29aca475d14ed596c67c4b85",  // ✅ LIVE
    }
  },
  // ... other networks
};
```

### 3. Fund the Faucet (Optional)

If you want to use the faucet functionality:
1. Connect your wallet (the deployer/owner)
2. Go to the Faucet tab in the Contract Dashboard
3. Deposit some ETH to the faucet contract

## 🎮 Features

### Updater Contract
- **Read current number** - View the current counter value
- **Update number** - Increment the counter by 1 (creates a transaction)
- **Real-time updates** - Number refreshes after each transaction

### Faucet Contract
- **View faucet info** - See balance, drip amount, and owner
- **Deposit funds** - Add ETH to the faucet contract
- **Send drips** - Distribute 0.05 ETH to any address (owner only)
- **Emergency withdraw** - Withdraw all funds (owner only)
- **Change ownership** - Transfer faucet ownership (owner only)

## 🌐 Network Support

Currently configured for:
- **MegaETH Testnet** (Chain ID: 6342) - Primary network
- **Base Sepolia** (Chain ID: 84532) - Ready for deployment
- **Monad Testnet** (Chain ID: 10143) - Ready for deployment

## 🔗 How to Access

1. **Start the game** and connect your wallet
2. **Click "🔗 View Contracts"** button (top-right)
3. **Switch between tabs** to interact with different contracts
4. **Each action creates a transaction** on the blockchain

## ⚡ Transaction Flow

Every interaction with the contracts creates a real transaction:

- **Updater**: Each "Update Number" click = 1 transaction
- **Faucet**: Each deposit, drip, or ownership change = 1 transaction
- **Real-time feedback** with transaction hashes and gas usage
- **Explorer links** to view transactions on MegaETH explorer

## 🎯 Perfect for MegaETH

This implementation showcases MegaETH's capabilities:
- **Fast transactions** - Each click creates immediate blockchain state changes
- **Low gas costs** - Perfect for frequent interactions
- **Real-time feedback** - Users see immediate transaction confirmations

## 🛠 Troubleshooting

### "Contracts not deployed" message
- Deploy contracts to the current network
- Update addresses in `src/config/contracts.js`
- Refresh the page

### Transaction failures
- Ensure wallet has sufficient ETH for gas
- Check if you're the owner for faucet functions
- Verify contract addresses are correct

### Connection issues
- Switch to MegaETH testnet in your wallet
- Ensure wallet is connected
- Try refreshing the contract info

## 📱 Mobile Friendly

The contract dashboard is fully responsive and works on mobile devices, making it easy to interact with contracts on the go.

---

**Ready to deploy!** Just update the contract addresses and start interacting with your contracts on MegaETH! 🚀