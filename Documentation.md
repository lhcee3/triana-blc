# Triana Blockchain - Tourist ID System

## What We've Built ✅

- **Smart Contract**: Complete `TouristID.sol` with KYC, emergency contacts, trip itinerary
- **Features**: Issue IDs, verify tourists, manage issuers, suspend/reactivate IDs
- **Security**: Role-based access, hash-based KYC storage, time-bound validity
- **Development Setup**: Hardhat framework, deployment scripts, test suite

## Current Status
- ✅ Contracts compile successfully
- ✅ Ready for testing and deployment
- ✅ Git repo initialized on main branch

## Next Steps
- Run comprehensive tests
- Deploy to testnet
- Build frontend integration

## Why No Artifacts in Git?
Artifacts are build files (like `.exe` files) - they're in `.gitignore` because:
- Can be regenerated with `npx hardhat compile`
- Would bloat the repo with large JSON files
- Standard blockchain development practice

## Team Usage
```bash
npm install           # Install dependencies
npx hardhat compile   # Compile contracts
npx hardhat test      # Run tests (next step)
npx hardhat node      # Start local blockchain
```
