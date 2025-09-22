# 🚀 Sepolia Deployment Guide

## Quick Deployment Steps

### 1. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your credentials:
# SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
```

### 2. Get Sepolia ETH
- Visit [Sepolia Faucet](https://sepoliafaucet.com)
- Enter your wallet address
- Request test ETH (you need ~0.01 ETH for deployment)

### 3. Deploy Contract
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Deployment Output
After successful deployment, you'll get:
```
📋 BACKEND INTEGRATION INFO
============================================================
Contract Address: 0x... (your deployed contract address)
Network: sepolia (Chain ID: 11155111)
Block Number: ... (block number)
Transaction Hash: 0x... (deployment transaction)
ABI Location: ./deployments/TouristID-ABI.json
Full Deployment Info: ./deployments/tourist-id-sepolia-[timestamp].json
============================================================
```

### 5. Verify Deployment
```bash
# Check contract on Sepolia Etherscan
https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

# Test contract locally first
npx hardhat test
```

## For Your Team Lead 📋

### Required Deliverables:
✅ **Contract Address**: Available after deployment
✅ **Transaction Hash**: Available after deployment  
✅ **ABI JSON**: `./deployments/TouristID-ABI.json`
✅ **Network**: Sepolia Testnet (Chain ID: 11155111)
✅ **Functions Implemented**:
   - `issueTouristId()`
   - `verifyTouristId()`
   - `revokeTouristId()`
   - `verifyTouristHashes()`
   - `generateQRCode()`

### Contract Features:
- ✅ Hash-based tourist data storage
- ✅ Admin-only issuance and revocation
- ✅ QR code generation
- ✅ Time-based validity checks
- ✅ Comprehensive event emissions
- ✅ Gas-optimized implementation

## Troubleshooting

### Common Issues:
1. **"Insufficient funds"** → Get more Sepolia ETH from faucet
2. **"Invalid private key"** → Check .env file format (no 0x prefix)
3. **"Network timeout"** → Try different RPC URL (Infura/Alchemy)

### Support:
- All tests passing: ✅ 21/21 tests
- Contract compiled successfully: ✅
- Deployment script ready: ✅