// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BreachRegistry is EIP712, Ownable {
    using ECDSA for bytes32;

    bytes32 private constant _BREACH_EVIDENCE_TYPEHASH = keccak256(
        "BreachEvidence(bytes32 targetHash,string source,string dataType,address beneficiary,uint256 nonce,uint256 deadline)"
    );

    struct BreachRecord {
        bytes32 targetHash;
        string  source;
        string  dataType;
        address beneficiary;
        address reporter;
        uint256 timestamp;
    }

    BreachRecord[] public records;

    mapping(address => bool) public isVerifier;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => mapping(bytes32 => uint256)) private _seenSource;
    mapping(address => uint256[]) private _beneficiaryRecords;

    event BreachRecorded(
        uint256 indexed id,
        bytes32 indexed targetHash,
        address indexed beneficiary,
        string  source,
        string  dataType,
        address reporter,
        uint256 nonce
    );

    event VerifierSet(address indexed verifier, bool enabled);

    error NotAVerifier(address signer);
    error SignatureExpired(uint256 deadline);
    error InvalidNonce(uint256 expected, uint256 provided);
    error DuplicateBreach(bytes32 targetHash, bytes32 sourceHash);

    constructor(address initialVerifier)
        EIP712("0xLeaked.BreachRegistry", "1")
        Ownable(msg.sender)
    {
        if (initialVerifier != address(0)) {
            isVerifier[initialVerifier] = true;
            emit VerifierSet(initialVerifier, true);
        }
    }

    function setVerifier(address verifier, bool enabled) external onlyOwner {
        isVerifier[verifier] = enabled;
        emit VerifierSet(verifier, enabled);
    }

    function recordBreachWithProof(
        bytes32 targetHash,
        string calldata source,
        string calldata dataType,
        address beneficiary,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256 recordId) {
        if (block.timestamp > deadline) revert SignatureExpired(deadline);

        bytes32 structHash = keccak256(
            abi.encode(
                _BREACH_EVIDENCE_TYPEHASH,
                targetHash,
                keccak256(bytes(source)),
                keccak256(bytes(dataType)),
                beneficiary,
                nonce,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (!isVerifier[signer]) revert NotAVerifier(signer);
        if (nonces[signer] != nonce) revert InvalidNonce(nonces[signer], nonce);

        bytes32 sourceHash = keccak256(bytes(source));
        if (_seenSource[targetHash][sourceHash] != 0) {
            revert DuplicateBreach(targetHash, sourceHash);
        }

        unchecked {
            nonces[signer] = nonce + 1;
        }

        records.push(
            BreachRecord({
                targetHash:  targetHash,
                source:      source,
                dataType:    dataType,
                beneficiary: beneficiary,
                reporter:    msg.sender,
                timestamp:   block.timestamp
            })
        );

        recordId = records.length - 1;
        _seenSource[targetHash][sourceHash] = recordId + 1;
        _beneficiaryRecords[beneficiary].push(recordId);

        emit BreachRecorded(
            recordId,
            targetHash,
            beneficiary,
            source,
            dataType,
            msg.sender,
            nonce
        );
    }

    function totalBreaches() external view returns (uint256) {
        return records.length;
    }

    function recordsOfBeneficiary(address beneficiary)
        external
        view
        returns (uint256[] memory)
    {
        return _beneficiaryRecords[beneficiary];
    }

    function isRegistered(bytes32 targetHash, string calldata source)
        external
        view
        returns (bool)
    {
        return _seenSource[targetHash][keccak256(bytes(source))] != 0;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
