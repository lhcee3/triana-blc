// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TouristID
 * @dev Smart contract for managing tourist identities with QR code generation
 * @author Triana Team
 */
contract TouristID {
    
    // Struct definition as per team lead's specification
    struct Tourist {
        bytes32 touristId; // keccak256 hash of KYC + Itinerary + Emergency
        bytes32 kycHash; // Incoming hash from server
        bytes32 itineraryHash; // Incoming hash from server
        bytes32 emergencyHash; // Incoming hash from server
        uint256 startDate; // Visit start timestamp
        uint256 endDate; // Visit end timestamp
        bool active; // Is tourist currently active
    }

    // State variables
    address public admin;
    mapping(bytes32 => Tourist) public tourists; // touristId -> Tourist
    mapping(bytes32 => string) public touristQRCodes; // touristId -> QR code data
    
    // Events
    event TouristIdIssued(bytes32 indexed touristId, address indexed issuer, string qrCode);
    event TouristIdRevoked(bytes32 indexed touristId, address indexed revoker);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier validTouristId(bytes32 _touristId) {
        require(tourists[_touristId].touristId != 0, "Tourist ID does not exist");
        _;
    }
    
    modifier validDateRange(uint256 _startDate, uint256 _endDate) {
        require(_startDate < _endDate, "Invalid date range");
        require(_startDate >= block.timestamp - 3600, "Start date cannot be too far in past");
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
        emit AdminChanged(address(0), admin);
    }
    
    /**
     * @dev Issues a new tourist ID after verifying the provided hashes and dates
     * @param _kycHash Hash of KYC data
     * @param _itineraryHash Hash of itinerary data
     * @param _emergencyHash Hash of emergency contact data
     * @param _startDate Visit start timestamp
     * @param _endDate Visit end timestamp
     * @return touristId The generated tourist ID
     */
    function issueTouristId(
        bytes32 _kycHash,
        bytes32 _itineraryHash,
        bytes32 _emergencyHash,
        uint256 _startDate,
        uint256 _endDate
    ) public onlyAdmin validDateRange(_startDate, _endDate) returns (bytes32) {
        
        // Generate unique tourist ID
        bytes32 touristId = keccak256(abi.encodePacked(
            _kycHash,
            _itineraryHash,
            _emergencyHash,
            block.timestamp
        ));
        
        require(tourists[touristId].touristId == 0, "Tourist ID already exists");
        
        // Create tourist record
        tourists[touristId] = Tourist({
            touristId: touristId,
            kycHash: _kycHash,
            itineraryHash: _itineraryHash,
            emergencyHash: _emergencyHash,
            startDate: _startDate,
            endDate: _endDate,
            active: true
        });
        
        // Generate QR code data (JSON-like string for easy parsing)
        string memory qrCode = generateQRCode(touristId, _startDate, _endDate);
        touristQRCodes[touristId] = qrCode;
        
        emit TouristIdIssued(touristId, msg.sender, qrCode);
        return touristId;
    }
    
    /**
     * @dev Verifies the existence and validity of a tourist ID
     * @param _touristId The tourist ID to verify
     * @return isValid Whether the tourist ID is valid
     */
    function verifyTouristId(bytes32 _touristId) public view returns (bool) {
        Tourist memory tourist = tourists[_touristId];
        if (tourist.touristId == 0) {
            return false; // ID does not exist
        }
        if (!tourist.active) {
            return false; // ID is revoked
        }
        if (block.timestamp < tourist.startDate || block.timestamp > tourist.endDate) {
            return false; // ID is not currently valid
        }
        return true; // ID is valid
    }
    
    /**
     * @dev Revokes an existing tourist ID
     * @param _touristId The tourist ID to revoke
     */
    function revokeTouristId(bytes32 _touristId) public onlyAdmin validTouristId(_touristId) {
        Tourist storage tourist = tourists[_touristId];
        require(tourist.active, "Tourist ID is already revoked");
        
        tourist.active = false;
        emit TouristIdRevoked(_touristId, msg.sender);
    }
    
    /**
     * @dev Verifies the integrity of the hashes associated with a tourist ID
     * @param _touristId The tourist ID to verify
     * @param _kycHash Expected KYC hash
     * @param _itineraryHash Expected itinerary hash
     * @param _emergencyHash Expected emergency hash
     * @return isValid Whether all hashes match
     */
    function verifyTouristHashes(
        bytes32 _touristId,
        bytes32 _kycHash,
        bytes32 _itineraryHash,
        bytes32 _emergencyHash
    ) public view validTouristId(_touristId) returns (bool) {
        Tourist memory tourist = tourists[_touristId];
        return (
            tourist.kycHash == _kycHash &&
            tourist.itineraryHash == _itineraryHash &&
            tourist.emergencyHash == _emergencyHash
        );
    }
    
    /**
     * @dev Generates QR code data for a tourist ID
     * @param _touristId The tourist ID
     * @param _startDate Visit start date
     * @param _endDate Visit end date
     * @return qrCode QR code data string
     */
    function generateQRCode(
        bytes32 _touristId,
        uint256 _startDate,
        uint256 _endDate
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '{"id":"0x',
            toHexString(_touristId),
            '","start":',
            uint2str(_startDate),
            ',"end":',
            uint2str(_endDate),
            ',"type":"tourist"}'
        ));
    }
    
    /**
     * @dev Gets the QR code for a tourist ID
     * @param _touristId The tourist ID
     * @return qrCode The QR code data
     */
    function getTouristQRCode(bytes32 _touristId) public view validTouristId(_touristId) returns (string memory) {
        return touristQRCodes[_touristId];
    }
    
    /**
     * @dev Gets tourist information
     * @param _touristId The tourist ID
     * @return tourist The tourist struct
     */
    function getTouristInfo(bytes32 _touristId) public view validTouristId(_touristId) returns (Tourist memory) {
        return tourists[_touristId];
    }
    
    /**
     * @dev Changes the admin address
     * @param _newAdmin The new admin address
     */
    function changeAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        address oldAdmin = admin;
        admin = _newAdmin;
        emit AdminChanged(oldAdmin, _newAdmin);
    }
    
    // Utility functions for QR code generation
    function toHexString(bytes32 _bytes) internal pure returns (string memory) {
        bytes memory hexAlphabet = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            str[i * 2] = hexAlphabet[uint8(_bytes[i] >> 4)];
            str[1 + i * 2] = hexAlphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }
    
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}