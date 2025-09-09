const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting TouristID contract deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy the TouristID contract
  console.log("📦 Deploying TouristID contract...");
  const TouristID = await ethers.getContractFactory("TouristID");
  
  // Deploy with constructor parameters (if any)
  const touristID = await TouristID.deploy();
  await touristID.waitForDeployment();

  const contractAddress = await touristID.getAddress();
  console.log("✅ TouristID contract deployed to:", contractAddress);

  // Get deployment transaction details
  const deployTx = touristID.deploymentTransaction();
  console.log("📋 Deployment transaction hash:", deployTx.hash);
  console.log("🔗 Block number:", deployTx.blockNumber || "Pending...");
  
  // Wait for a few confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await touristID.deploymentTransaction().wait(3);
  console.log("✅ Contract confirmed!");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("\n🌐 Network Info:");
  console.log("   - Chain ID:", network.chainId.toString());
  console.log("   - Network Name:", network.name);

  // Generate deployment info for backend integration
  const deploymentInfo = {
    contractName: "TouristID",
    contractAddress: contractAddress,
    deployer: deployer.address,
    network: {
      name: network.name,
      chainId: network.chainId.toString()
    },
    deploymentTransaction: {
      hash: deployTx.hash,
      blockNumber: deployTx.blockNumber
    },
    timestamp: new Date().toISOString(),
    abi: TouristID.interface.formatJson()
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info
  const deploymentFile = path.join(deploymentsDir, `tourist-id-${network.name}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to:", deploymentFile);

  // Save ABI separately for easy backend integration
  const abiFile = path.join(deploymentsDir, "TouristID-ABI.json");
  fs.writeFileSync(abiFile, TouristID.interface.formatJson());
  console.log("📄 Contract ABI saved to:", abiFile);

  // Display key information for backend team
  console.log("\n" + "=".repeat(60));
  console.log("📋 BACKEND INTEGRATION INFO");
  console.log("=".repeat(60));
  console.log("Contract Address:", contractAddress);
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Block Number:", deployTx.blockNumber || "Check transaction hash");
  console.log("Transaction Hash:", deployTx.hash);
  console.log("ABI Location:", abiFile);
  console.log("Full Deployment Info:", deploymentFile);
  console.log("=".repeat(60));

  // Verify initial state
  console.log("\n🔍 Verifying initial contract state...");
  const owner = await touristID.owner();
  const isAuthorized = await touristID.authorizedIssuers(deployer.address);
  console.log("   - Owner:", owner);
  console.log("   - Deployer authorized as issuer:", isAuthorized);

  // Example: Issue a test tourist ID (optional - comment out for production)
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("\n🧪 Creating test tourist ID...");
    try {
      const kycData = "TEST_AADHAAR_123456789";
      const validFrom = Math.floor(Date.now() / 1000);
      const validTo = validFrom + (30 * 24 * 60 * 60); // 30 days from now
      
      const kycHash = ethers.keccak256(
        ethers.toUtf8Bytes(`${kycData}${validFrom}${validTo}`)
      );
      
      const testTx = await touristID.issueTouristID(
        12345,
        kycHash,
        deployer.address,
        validFrom,
        validTo,
        "Emergency: +91-9876543210",
        "Mumbai -> Goa -> Mumbai"
      );
      
      await testTx.wait();
      console.log("   ✅ Test tourist ID 12345 issued successfully");
      
      // Verify the test ID
      const verification = await touristID.verifyTouristID(12345);
      console.log("   ✅ Test ID verification successful");
    } catch (error) {
      console.log("   ⚠️ Test ID creation failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment completed successfully!");
  return {
    contract: touristID,
    address: contractAddress,
    deploymentInfo
  };
}

// Handle deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;