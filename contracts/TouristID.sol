// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TouristID
 * @dev Manages secure digital IDs for tourists in the Triana project
 * @author Triana Development Team
 */
contract TouristID is Ownable, ReentrancyGuard {
    
    // Tourist status enumeration
    enum Status {
        ACTIVE,
        REVOKED,
        EXPIRED
    }
    
    // Tourist struct definition
    struct Tourist {
        bytes32 kycHash;           // Hash of KYC data (Aadhaar/passport + validity period)
        address issuerId;          // Address of entry point (hotel/airport)
        uint64 validFrom;          // UNIX timestamp - validity start
        uint64 validTo;            // UNIX timestamp - validity end
        string emergencyContact;   // Emergency contact information
        string tripItinerary;      // Trip itinerary details
        Status status;             // Current status of the tourist ID
    }
    
    // Main mapping: touristId => Tourist data
    mapping(uint32 => Tourist) public tourists;
    
    // Track existing tourist IDs to prevent duplicates
    mapping(uint32 => bool) public touristExists;
    
    // Authorized issuers (hotels, airports, etc.)
    mapping(address => bool) public authorizedIssuers;
    
    // Events
    event TouristIDIssued(
        uint32 indexed touristId,
        address indexed issuerId,
        uint64 validFrom,
        uint64 validTo
    );
    
    event TouristIDRevoked(uint32 indexed touristId, address indexed revokedBy);
    event TouristIDExpired(uint32 indexed touristId);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    
    // Modifiers
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner(), "Not authorized issuer");
        _;
    }
    
    modifier touristIdExists(uint32 _touristId) {
        require(touristExists[_touristId], "Tourist ID does not exist");
        _;
    }
    
    modifier validTimeRange(uint64 _validFrom, uint64 _validTo) {
        require(_validFrom < _validTo, "Invalid time range");
        // Allow more flexibility for testing - 24 hours buffer
        require(_validFrom >= block.timestamp - 86400, "Start time too far in past"); 
        _;
    }
    
    constructor() {
        // Contract deployer is automatically authorized
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorized(msg.sender);
    }
    
    /**
     * @dev Issue a new tourist ID
     * @param _touristId Unique tourist identifier
     * @param _kycHash Hash of KYC data (Aadhaar/passport + validity period)
     * @param _issuerId Address of the issuing entity
     * @param _validFrom Validity start timestamp
     * @param _validTo Validity end timestamp
     * @param _emergencyContact Emergency contact information
     * @param _tripItinerary Trip itinerary details
     */
    function issueTouristID(
        uint32 _touristId,
        bytes32 _kycHash,
        address _issuerId,
        uint64 _validFrom,
        uint64 _validTo,
        string calldata _emergencyContact,
        string calldata _tripItinerary
    ) 
        external 
        onlyAuthorizedIssuer 
        validTimeRange(_validFrom, _validTo)
        nonReentrant 
    {
        require(!touristExists[_touristId], "Tourist ID already exists");
        require(_kycHash != bytes32(0), "KYC hash cannot be empty");
        require(_issuerId != address(0), "Invalid issuer address");
        require(bytes(_emergencyContact).length > 0, "Emergency contact required");
        
        // Create new tourist record
        tourists[_touristId] = Tourist({
            kycHash: _kycHash,
            issuerId: _issuerId,
            validFrom: _validFrom,
            validTo: _validTo,
            emergencyContact: _emergencyContact,
            tripItinerary: _tripItinerary,
            status: Status.ACTIVE
        });
        
        touristExists[_touristId] = true;
        
        emit TouristIDIssued(_touristId, _issuerId, _validFrom, _validTo);
    }
    
    /**
     * @dev Verify a tourist ID and return all details
     * @param _touristId Tourist ID to verify
     * @return kycHash The KYC hash of the tourist
     * @return issuerId The address of the issuer
     * @return validFrom The validity start timestamp
     * @return validTo The validity end timestamp
     * @return emergencyContact The emergency contact information
     * @return tripItinerary The trip itinerary
     * @return status The current status of the tourist ID
     */
    function verifyTouristID(uint32 _touristId) 
        external 
        view 
        touristIdExists(_touristId)
        returns (
            bytes32 kycHash,
            address issuerId,
            uint64 validFrom,
            uint64 validTo,
            string memory emergencyContact,
            string memory tripItinerary,
            Status status
        ) 
    {
        Tourist memory tourist = tourists[_touristId];
        
        return (
            tourist.kycHash,
            tourist.issuerId,
            tourist.validFrom,
            tourist.validTo,
            tourist.emergencyContact,
            tourist.tripItinerary,
            tourist.status
        );
    }
    
    /**
     * @dev Revoke a tourist ID
     * @param _touristId Tourist ID to revoke
     */
    function revokeTouristID(uint32 _touristId) 
        external 
        onlyAuthorizedIssuer 
        touristIdExists(_touristId) 
    {
        require(tourists[_touristId].status == Status.ACTIVE, "Tourist ID not active");
        
        tourists[_touristId].status = Status.REVOKED;
        
        emit TouristIDRevoked(_touristId, msg.sender);
    }
    
    /**
     * @dev Mark a tourist ID as expired
     * @param _touristId Tourist ID to expire
     */
    function expireTouristID(uint32 _touristId) 
        external 
        touristIdExists(_touristId) 
    {
        Tourist storage tourist = tourists[_touristId];
        require(block.timestamp >= tourist.validTo, "Tourist ID not yet expired");
        require(tourist.status == Status.ACTIVE, "Tourist ID not active");
        
        tourist.status = Status.EXPIRED;
        
        emit TouristIDExpired(_touristId);
    }
    
    /**
     * @dev Check if a tourist ID is currently valid
     * @param _touristId Tourist ID to check
     * @return isValid True if ID is valid and active
     */
    function isValidTouristID(uint32 _touristId) 
        external 
        view 
        touristIdExists(_touristId)
        returns (bool isValid) 
    {
        Tourist memory tourist = tourists[_touristId];
        
        return (
            tourist.status == Status.ACTIVE &&
            block.timestamp >= tourist.validFrom &&
            block.timestamp <= tourist.validTo
        );
    }
    
    /**
     * @dev Generate KYC hash from components
     * @param _kycData Concatenated KYC data
     * @param _validFrom Validity start timestamp
     * @param _validTo Validity end timestamp
     * @return kycHash The computed hash
     */
    function generateKYCHash(
        string calldata _kycData,
        uint64 _validFrom,
        uint64 _validTo
    ) 
        external 
        pure 
        returns (bytes32 kycHash) 
    {
        return keccak256(abi.encodePacked(_kycData, _validFrom, _validTo));
    }
    
    /**
     * @dev Authorize a new issuer
     * @param _issuer Address to authorize
     */
    function authorizeIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "Invalid issuer address");
        require(!authorizedIssuers[_issuer], "Already authorized");
        
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }
    
    /**
     * @dev Revoke issuer authorization
     * @param _issuer Address to revoke
     */
    function revokeIssuer(address _issuer) external onlyOwner {
        require(authorizedIssuers[_issuer], "Not authorized");
        
        authorizedIssuers[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }
    
    /**
     * @dev Get total number of issued tourist IDs (for statistics)
     * Note: This is a simple counter, for production consider using a counter variable
     */
    function getTouristCount() external view returns (uint256 count) {
        // This is a basic implementation - for production, maintain a counter
        // to avoid gas costs of iteration
        return 0; // Placeholder - implement counter in production
    }
}