const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TouristID Contract", function () {
  let touristID;
  let admin;
  let user1;
  let user2;
  
  // Test data
  const kycHash = ethers.keccak256(ethers.toUtf8Bytes("test-kyc-data"));
  const itineraryHash = ethers.keccak256(ethers.toUtf8Bytes("test-itinerary"));
  const emergencyHash = ethers.keccak256(ethers.toUtf8Bytes("test-emergency"));
  
  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();
    
    const TouristID = await ethers.getContractFactory("TouristID");
    touristID = await TouristID.deploy();
    await touristID.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct admin", async function () {
      expect(await touristID.admin()).to.equal(admin.address);
    });
  });

  describe("Issue Tourist ID", function () {
    it("Should issue a new tourist ID successfully", async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600; // 1 hour from now
      const endDate = startDate + 86400; // 1 day later
      
      const tx = await touristID.issueTouristId(
        kycHash,
        itineraryHash,
        emergencyHash,
        startDate,
        endDate
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      
      expect(event).to.not.be.undefined;
      expect(event.args.issuer).to.equal(admin.address);
    });

    it("Should generate unique tourist IDs", async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate + 86400;
      
      const tx1 = await touristID.issueTouristId(
        kycHash,
        itineraryHash,
        emergencyHash,
        startDate,
        endDate
      );
      
      // Wait a bit to ensure different timestamp
      await time.increase(1);
      
      const tx2 = await touristID.issueTouristId(
        ethers.keccak256(ethers.toUtf8Bytes("different-kyc")),
        itineraryHash,
        emergencyHash,
        startDate + 1,
        endDate + 1
      );
      
      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();
      
      const event1 = receipt1.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      const event2 = receipt2.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      
      expect(event1.args.touristId).to.not.equal(event2.args.touristId);
    });

    it("Should only allow admin to issue tourist IDs", async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate + 86400;
      
      await expect(
        touristID.connect(user1).issueTouristId(
          kycHash,
          itineraryHash,
          emergencyHash,
          startDate,
          endDate
        )
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should validate date ranges", async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate - 1000; // Invalid: end before start
      
      await expect(
        touristID.issueTouristId(
          kycHash,
          itineraryHash,
          emergencyHash,
          startDate,
          endDate
        )
      ).to.be.revertedWith("Invalid date range");
    });

    it("Should generate QR code", async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate + 86400;
      
      const tx = await touristID.issueTouristId(
        kycHash,
        itineraryHash,
        emergencyHash,
        startDate,
        endDate
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      const touristId = event.args.touristId;
      
      const qrCode = await touristID.getTouristQRCode(touristId);
      expect(qrCode).to.include('{"id":"0x');
      expect(qrCode).to.include('"type":"tourist"}');
    });
  });

  describe("Verify Tourist ID", function () {
    let touristId;
    
    beforeEach(async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate + 86400;
      
      const tx = await touristID.issueTouristId(
        kycHash,
        itineraryHash,
        emergencyHash,
        startDate,
        endDate
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      touristId = event.args.touristId;
    });

    it("Should return false for non-existent tourist ID", async function () {
      const fakeTouristId = ethers.keccak256(ethers.toUtf8Bytes("fake-id"));
      const isValid = await touristID.verifyTouristId(fakeTouristId);
      expect(isValid).to.be.false;
    });

    it("Should return true for valid tourist ID within time range", async function () {
      // Move to within the valid time range
      await time.increase(3700); // Move past start time
      
      const isValid = await touristID.verifyTouristId(touristId);
      expect(isValid).to.be.true;
    });

    it("Should return false for tourist ID outside time range", async function () {
      // Don't move time, so we're before start time
      const isValid = await touristID.verifyTouristId(touristId);
      expect(isValid).to.be.false;
    });

    it("Should return false for revoked tourist ID", async function () {
      await touristID.revokeTouristId(touristId);
      
      // Move to within valid time range
      await time.increase(3700);
      
      const isValid = await touristID.verifyTouristId(touristId);
      expect(isValid).to.be.false;
    });
  });

  describe("Revoke Tourist ID", function () {
    let touristId;
    
    beforeEach(async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate + 86400;
      
      const tx = await touristID.issueTouristId(
        kycHash,
        itineraryHash,
        emergencyHash,
        startDate,
        endDate
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      touristId = event.args.touristId;
    });

    it("Should revoke tourist ID successfully", async function () {
      await expect(touristID.revokeTouristId(touristId))
        .to.emit(touristID, "TouristIdRevoked")
        .withArgs(touristId, admin.address);
      
      const tourist = await touristID.getTouristInfo(touristId);
      expect(tourist.active).to.be.false;
    });

    it("Should only allow admin to revoke", async function () {
      await expect(
        touristID.connect(user1).revokeTouristId(touristId)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should not revoke already revoked tourist ID", async function () {
      await touristID.revokeTouristId(touristId);
      
      await expect(
        touristID.revokeTouristId(touristId)
      ).to.be.revertedWith("Tourist ID is already revoked");
    });

    it("Should not revoke non-existent tourist ID", async function () {
      const fakeTouristId = ethers.keccak256(ethers.toUtf8Bytes("fake-id"));
      
      await expect(
        touristID.revokeTouristId(fakeTouristId)
      ).to.be.revertedWith("Tourist ID does not exist");
    });
  });

  describe("Verify Tourist Hashes", function () {
    let touristId;
    
    beforeEach(async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate + 86400;
      
      const tx = await touristID.issueTouristId(
        kycHash,
        itineraryHash,
        emergencyHash,
        startDate,
        endDate
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      touristId = event.args.touristId;
    });

    it("Should verify correct hashes", async function () {
      const isValid = await touristID.verifyTouristHashes(
        touristId,
        kycHash,
        itineraryHash,
        emergencyHash
      );
      expect(isValid).to.be.true;
    });

    it("Should reject incorrect hashes", async function () {
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong-data"));
      
      const isValid = await touristID.verifyTouristHashes(
        touristId,
        wrongHash,
        itineraryHash,
        emergencyHash
      );
      expect(isValid).to.be.false;
    });
  });

  describe("Admin Management", function () {
    it("Should change admin successfully", async function () {
      await expect(touristID.changeAdmin(user1.address))
        .to.emit(touristID, "AdminChanged")
        .withArgs(admin.address, user1.address);
      
      expect(await touristID.admin()).to.equal(user1.address);
    });

    it("Should only allow current admin to change admin", async function () {
      await expect(
        touristID.connect(user1).changeAdmin(user2.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should not allow setting admin to zero address", async function () {
      await expect(
        touristID.changeAdmin(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid admin address");
    });
  });

  describe("Get Tourist Information", function () {
    let touristId;
    
    beforeEach(async function () {
      const currentTime = await time.latest();
      const startDate = currentTime + 3600;
      const endDate = startDate + 86400;
      
      const tx = await touristID.issueTouristId(
        kycHash,
        itineraryHash,
        emergencyHash,
        startDate,
        endDate
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'TouristIdIssued');
      touristId = event.args.touristId;
    });

    it("Should get tourist information", async function () {
      const tourist = await touristID.getTouristInfo(touristId);
      
      expect(tourist.touristId).to.equal(touristId);
      expect(tourist.kycHash).to.equal(kycHash);
      expect(tourist.itineraryHash).to.equal(itineraryHash);
      expect(tourist.emergencyHash).to.equal(emergencyHash);
      expect(tourist.active).to.be.true;
    });

    it("Should revert for non-existent tourist ID", async function () {
      const fakeTouristId = ethers.keccak256(ethers.toUtf8Bytes("fake-id"));
      
      await expect(
        touristID.getTouristInfo(fakeTouristId)
      ).to.be.revertedWith("Tourist ID does not exist");
    });
  });
});