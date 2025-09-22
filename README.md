# TouristID Smart Contract 🏛️

A blockchain-based tourist identification system built on Ethereum that provides secure, verifiable digital identity management for tourists with hash-based data storage and QR code generation capabilities.

## 🏗️ Architecture Overview

The TouristID contract implements a comprehensive tourist identity management system with:
- **Hash-based Storage**: Tourist data stored as cryptographic hashes for privacy
- **Admin Controls**: Role-based access control with authorized issuers
- **QR Code Generation**: On-chain QR code string generation for easy verification
- **Time-based Validity**: Start and end date validation for tourist IDs
- **Status Management**: Active, revoked status tracking

## 📋 Contract Structure

### Tourist Data Model
```solidity
struct Tourist {
    bytes32 touristId;      // Unique hash-based identifier
    bytes32 kycHash;        // KYC document hash
    bytes32 itineraryHash;  // Travel itinerary hash
    bytes32 emergencyHash;  // Emergency contact hash
    uint256 startDate;      // Validity start timestamp
    uint256 endDate;        // Validity end timestamp
    bool active;            // Active status
}
```

### Core Functions
- `issueTouristId()` - Issue new tourist ID with hash verification
- `verifyTouristId()` - Verify tourist ID and return status
- `revokeTouristId()` - Revoke tourist ID (admin only)
- `verifyTouristHashes()` - Verify tourist data hashes
- `generateQRCode()` - Generate QR code string for tourist ID

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- MetaMask or compatible wallet
- Sepolia testnet ETH for deployment

### Installation
```bash
# Clone and setup
git clone <repository>
cd triana-blockchain
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Sepolia RPC URL and private key
```

### Testing
```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Run specific test file
npx hardhat test test/TouristID.test.js
```

### Deployment

#### Local Development
```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network (new terminal)
npx hardhat run scripts/deploy.js --network localhost
```

#### Sepolia Testnet
```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia
```

## 🌐 Network Configuration

### Sepolia Testnet
- **Chain ID**: 11155111
- **RPC URL**: Configure in `.env` file
- **Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com

### Required Environment Variables
```env
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
```

## 📦 Contract Interface

### Admin Functions
```solidity
function issueTouristId(
    bytes32 touristId,
    bytes32 kycHash,
    bytes32 itineraryHash,
    bytes32 emergencyHash,
    uint256 startDate,
    uint256 endDate
) external onlyAdmin

function revokeTouristId(bytes32 touristId) external onlyAdmin
```

### Verification Functions
```solidity
function verifyTouristId(bytes32 touristId) external view returns (Tourist memory)
function verifyTouristHashes(
    bytes32 touristId,
    bytes32 kycHash,
    bytes32 itineraryHash,
    bytes32 emergencyHash
) external view returns (bool)
function generateQRCode(bytes32 touristId) external view returns (string memory)
```

## 🛠️ Development Workflow

### Contract Compilation
```bash
npx hardhat compile
```

### Testing Strategy
- Unit tests for all core functions
- Admin access control tests
- Hash verification tests
- Time-based validation tests
- QR code generation tests
- Gas optimization tests

### Deployment Artifacts
After deployment, check the `deployments/` directory for:
- Contract address and transaction details
- ABI JSON file for frontend integration
- Network-specific deployment information

## 🔐 Security Features

### Access Control
- **Admin-only** functions protected by `onlyAdmin` modifier
- **Role-based** permissions for tourist ID management
- **Input validation** for all critical operations

### Data Privacy
- **Hash-based storage** - sensitive data never stored on-chain
- **Zero-knowledge proofs** ready architecture
- **Selective disclosure** via hash verification

### Audit Recommendations
- [x] ReentrancyGuard implementation
- [x] Input validation and sanitation
- [x] Role-based access control
- [x] Event emission for transparency
- [x] Gas optimization patterns

## 📊 Contract Analytics

### Gas Costs (Estimated)
- Tourist ID Issuance: ~120,000 gas
- Tourist ID Verification: ~30,000 gas
- Tourist ID Revocation: ~45,000 gas
- Hash Verification: ~25,000 gas

### Test Coverage
- 21 comprehensive test cases
- 100% function coverage
- Edge case validation
- Security scenario testing

## 🔗 Integration Guide

### Frontend Integration
```javascript
import { ethers } from 'ethers';
import TouristIDABI from './deployments/TouristID-ABI.json';

const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  TouristIDABI,
  provider
);

// Verify tourist ID
const tourist = await contract.verifyTouristId(touristId);
const qrCode = await contract.generateQRCode(touristId);
```

### Backend Integration
1. Use deployment artifacts in `deployments/` directory
2. Import contract ABI for web3 interactions
3. Monitor contract events for real-time updates
4. Implement hash generation for tourist data

## 📚 Additional Resources

### Hardhat Documentation
- [Hardhat Network](https://hardhat.org/hardhat-network/)
- [Testing Contracts](https://hardhat.org/tutorial/testing-contracts.html)
- [Deploying to Networks](https://hardhat.org/tutorial/deploying-to-a-live-network.html)

### Ethereum Testnet Resources
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Ethereum Testnet Guide](https://ethereum.org/en/developers/docs/networks/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical issues:
1. Check the test suite for examples
2. Review Hardhat documentation
3. Create an issue with full error details
4. Include network, transaction hash, and contract address

---

**Built for SIH25 - Triana Blockchain Team** 🚀
