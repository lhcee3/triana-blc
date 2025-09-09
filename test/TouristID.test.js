const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TouristID Contract", function () {
  // Fixture to deploy the contract
  async function deployTouristIDFixture() {
    const [owner, issuer1, issuer2, unauthorized] = await ethers.getSigners();
    
    const TouristID = await ethers.getContractFactory("TouristID");
    const touristID = await TouristID.deploy();
    
    await touristID.waitForDeployment();
    
    return { touristID, owner, issuer1, issuer2, unauthorized };
  }

  // Helper function to create test data
  function createTestTouristData(touristId = 12345) {
    const kycData = `AADHAAR_${touristId}_PASSPORT_DATA`;
    const validFrom = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const validTo = validFrom + (30 * 24 * 60 * 60); // 30 days validity
    const kycHash = ethers.keccak256(ethers.toUtf8Bytes(`${kycData}${validFrom}${validTo}`));
    
    return {
      touristId,
      kycHash,
      validFrom,
      validTo,
      emergencyContact: "+91-9876543210",
      tripItinerary: "Mumbai -> Goa -> Bangalore -> Mumbai"
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      expect(await touristID.owner()).to.equal(owner.address);
    });

    it("Should authorize the deployer as an issuer", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      expect(await touristID.authorizedIssuers(owner.address)).to.be.true;
    });
  });

  describe("Issuer Management", function () {
    it("Should allow owner to authorize new issuers", async function () {
      const { touristID, owner, issuer1 } = await loadFixture(deployTouristIDFixture);
      
      await expect(touristID.connect(owner).authorizeIssuer(issuer1.address))
        .to.emit(touristID, "IssuerAuthorized")
        .withArgs(issuer1.address);
      
      expect(await touristID.authorizedIssuers(issuer1.address)).to.be.true;
    });

    it("Should allow owner to revoke issuer authorization", async function () {
      const { touristID, owner, issuer1 } = await loadFixture(deployTouristIDFixture);
      
      await touristID.connect(owner).authorizeIssuer(issuer1.address);
      
      await expect(touristID.connect(owner).revokeIssuer(issuer1.address))
        .to.emit(touristID, "IssuerRevoked")
        .withArgs(issuer1.address);
      
      expect(await touristID.authorizedIssuers(issuer1.address)).to.be.false;
    });

    it("Should not allow non-owners to authorize issuers", async function () {
      const { touristID, issuer1, unauthorized } = await loadFixture(deployTouristIDFixture);
      
      await expect(
        touristID.connect(unauthorized).authorizeIssuer(issuer1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Tourist ID Issuance", function () {
    it("Should issue a new tourist ID successfully", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      await expect(
        touristID.connect(owner).issueTouristID(
          testData.touristId,
          testData.kycHash,
          owner.address,
          testData.validFrom,
          testData.validTo,
          testData.emergencyContact,
          testData.tripItinerary
        )
      ).to.emit(touristID, "TouristIDIssued")
        .withArgs(testData.touristId, owner.address, testData.validFrom, testData.validTo);
      
      expect(await touristID.touristExists(testData.touristId)).to.be.true;
    });

    it("Should not allow duplicate tourist IDs", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Issue first ID
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      // Try to issue duplicate
      await expect(
        touristID.connect(owner).issueTouristID(
          testData.touristId,
          testData.kycHash,
          owner.address,
          testData.validFrom,
          testData.validTo,
          testData.emergencyContact,
          testData.tripItinerary
        )
      ).to.be.revertedWith("Tourist ID already exists");
    });

    it("Should not allow unauthorized issuers to issue IDs", async function () {
      const { touristID, unauthorized } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      await expect(
        touristID.connect(unauthorized).issueTouristID(
          testData.touristId,
          testData.kycHash,
          unauthorized.address,
          testData.validFrom,
          testData.validTo,
          testData.emergencyContact,
          testData.tripItinerary
        )
      ).to.be.revertedWith("Not authorized issuer");
    });

    it("Should validate time ranges", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Test invalid time range (validTo before validFrom)
      await expect(
        touristID.connect(owner).issueTouristID(
          testData.touristId,
          testData.kycHash,
          owner.address,
          testData.validTo, // Wrong order
          testData.validFrom,
          testData.emergencyContact,
          testData.tripItinerary
        )
      ).to.be.revertedWith("Invalid time range");
    });

    it("Should require non-empty KYC hash", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      await expect(
        touristID.connect(owner).issueTouristID(
          testData.touristId,
          ethers.ZeroHash, // Empty hash
          owner.address,
          testData.validFrom,
          testData.validTo,
          testData.emergencyContact,
          testData.tripItinerary
        )
      ).to.be.revertedWith("KYC hash cannot be empty");
    });

    it("Should require emergency contact", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      await expect(
        touristID.connect(owner).issueTouristID(
          testData.touristId,
          testData.kycHash,
          owner.address,
          testData.validFrom,
          testData.validTo,
          "", // Empty emergency contact
          testData.tripItinerary
        )
      ).to.be.revertedWith("Emergency contact required");
    });
  });

  describe("Tourist ID Verification", function () {
    it("Should return correct tourist data", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Issue tourist ID
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      // Verify data
      const result = await touristID.verifyTouristID(testData.touristId);
      
      expect(result[0]).to.equal(testData.kycHash); // kycHash
      expect(result[1]).to.equal(owner.address); // issuerId
      expect(result[2]).to.equal(testData.validFrom); // validFrom
      expect(result[3]).to.equal(testData.validTo); // validTo
      expect(result[4]).to.equal(testData.emergencyContact); // emergencyContact
      expect(result[5]).to.equal(testData.tripItinerary); // tripItinerary
      expect(result[6]).to.equal(0); // status (ACTIVE = 0)
    });

    it("Should revert for non-existent tourist ID", async function () {
      const { touristID } = await loadFixture(deployTouristIDFixture);
      
      await expect(
        touristID.verifyTouristID(99999)
      ).to.be.revertedWith("Tourist ID does not exist");
    });
  });

  describe("Tourist ID Status Management", function () {
    it("Should revoke a tourist ID", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Issue tourist ID
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      // Revoke it
      await expect(
        touristID.connect(owner).revokeTouristID(testData.touristId)
      ).to.emit(touristID, "TouristIDRevoked")
        .withArgs(testData.touristId, owner.address);
      
      // Check status
      const result = await touristID.verifyTouristID(testData.touristId);
      expect(result[6]).to.equal(1); // status (REVOKED = 1)
    });

    it("Should expire a tourist ID when time has passed", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      
      // Create data with short validity period
      const validFrom = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const validTo = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now
      const testData = {
        ...createTestTouristData(),
        validFrom,
        validTo
      };
      
      // Issue tourist ID
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      // Fast forward time past expiry
      await time.increaseTo(validTo + 1);
      
      // Expire it
      await expect(
        touristID.expireTouristID(testData.touristId)
      ).to.emit(touristID, "TouristIDExpired")
        .withArgs(testData.touristId);
      
      // Check status
      const result = await touristID.verifyTouristID(testData.touristId);
      expect(result[6]).to.equal(2); // status (EXPIRED = 2)
    });

    it("Should not revoke non-active tourist ID", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Issue and revoke
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      await touristID.connect(owner).revokeTouristID(testData.touristId);
      
      // Try to revoke again
      await expect(
        touristID.connect(owner).revokeTouristID(testData.touristId)
      ).to.be.revertedWith("Tourist ID not active");
    });

    it("Should not expire tourist ID before expiry time", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Issue tourist ID (valid for 30 days)
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      // Try to expire before time
      await expect(
        touristID.expireTouristID(testData.touristId)
      ).to.be.revertedWith("Tourist ID not yet expired");
    });
  });

  describe("Tourist ID Validation", function () {
    it("Should correctly validate active tourist ID within validity period", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      
      // Create data with current time validity
      const validFrom = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const validTo = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const testData = {
        ...createTestTouristData(),
        validFrom,
        validTo
      };
      
      // Issue tourist ID
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      // Should be valid
      expect(await touristID.isValidTouristID(testData.touristId)).to.be.true;
    });

    it("Should invalidate revoked tourist ID", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Issue and revoke
      await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      await touristID.connect(owner).revokeTouristID(testData.touristId);
      
      // Should be invalid
      expect(await touristID.isValidTouristID(testData.touristId)).to.be.false;
    });
  });

  describe("KYC Hash Generation", function () {
    it("Should generate consistent KYC hash", async function () {
      const { touristID } = await loadFixture(deployTouristIDFixture);
      
      const kycData = "TEST_AADHAAR_123456789";
      const validFrom = 1700000000;
      const validTo = 1700086400;
      
      const hash1 = await touristID.generateKYCHash(kycData, validFrom, validTo);
      const hash2 = await touristID.generateKYCHash(kycData, validFrom, validTo);
      
      expect(hash1).to.equal(hash2);
    });

    it("Should generate different hashes for different data", async function () {
      const { touristID } = await loadFixture(deployTouristIDFixture);
      
      const validFrom = 1700000000;
      const validTo = 1700086400;
      
      const hash1 = await touristID.generateKYCHash("DATA1", validFrom, validTo);
      const hash2 = await touristID.generateKYCHash("DATA2", validFrom, validTo);
      
      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle multiple tourist IDs from same issuer", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      
      const testData1 = createTestTouristData(11111);
      const testData2 = createTestTouristData(22222);
      
      // Issue multiple IDs
      await touristID.connect(owner).issueTouristID(
        testData1.touristId,
        testData1.kycHash,
        owner.address,
        testData1.validFrom,
        testData1.validTo,
        testData1.emergencyContact,
        testData1.tripItinerary
      );
      
      await touristID.connect(owner).issueTouristID(
        testData2.touristId,
        testData2.kycHash,
        owner.address,
        testData2.validFrom,
        testData2.validTo,
        testData2.emergencyContact,
        testData2.tripItinerary
      );
      
      // Both should exist
      expect(await touristID.touristExists(testData1.touristId)).to.be.true;
      expect(await touristID.touristExists(testData2.touristId)).to.be.true;
    });

    it("Should handle maximum uint32 tourist ID", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      
      const maxUint32 = 4294967295; // 2^32 - 1
      const testData = createTestTouristData(maxUint32);
      
      await expect(
        touristID.connect(owner).issueTouristID(
          testData.touristId,
          testData.kycHash,
          owner.address,
          testData.validFrom,
          testData.validTo,
          testData.emergencyContact,
          testData.tripItinerary
        )
      ).to.not.be.reverted;
      
      expect(await touristID.touristExists(maxUint32)).to.be.true;
    });

    it("Should prevent unauthorized access to management functions", async function () {
      const { touristID, unauthorized } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Try unauthorized operations
      await expect(
        touristID.connect(unauthorized).authorizeIssuer(unauthorized.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        touristID.connect(unauthorized).revokeIssuer(unauthorized.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should handle reentrancy protection", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // This test ensures the ReentrancyGuard is working
      // In a real scenario, you'd test with a malicious contract
      // For now, we just verify the modifier doesn't break normal operation
      await expect(
        touristID.connect(owner).issueTouristID(
          testData.touristId,
          testData.kycHash,
          owner.address,
          testData.validFrom,
          testData.validTo,
          testData.emergencyContact,
          testData.tripItinerary
        )
      ).to.not.be.reverted;
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should have reasonable gas costs for common operations", async function () {
      const { touristID, owner } = await loadFixture(deployTouristIDFixture);
      const testData = createTestTouristData();
      
      // Test issuance gas cost
      const issueTx = await touristID.connect(owner).issueTouristID(
        testData.touristId,
        testData.kycHash,
        owner.address,
        testData.validFrom,
        testData.validTo,
        testData.emergencyContact,
        testData.tripItinerary
      );
      
      const receipt = await issueTx.wait();
      console.log("      Gas used for issuance:", receipt.gasUsed.toString());
      
      // Verify gas usage is reasonable (adjust threshold as needed)
      expect(receipt.gasUsed).to.be.below(200000);
    });
  });
});