// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AlertOracle is EIP712, Ownable {
    using ECDSA for bytes32;

    bytes32 private constant _RISK_SCORE_TYPEHASH = keccak256(
        "RiskScoreUpdate(address contractAddress,uint8 score,string label,uint256 nonce,uint256 deadline)"
    );

    struct RiskScore {
        uint8   score;
        string  label;
        uint256 updatedAt;
        address updatedBy;  // quién envió la última tx
    }

    mapping(address => RiskScore) public scores;
    mapping(address => bool) public isVerifier;
    mapping(address => uint256) public nonces;

    event ScoreUpdated(
        address indexed contractAddress,
        uint8   score,
        string  label,
        uint256 updatedAt,
        address indexed updatedBy,
        uint256 nonce
    );

    event VerifierSet(address indexed verifier, bool enabled);

    error NotAVerifier(address signer);
    error SignatureExpired(uint256 deadline);
    error InvalidNonce(uint256 expected, uint256 provided);
    error ScoreOutOfRange(uint8 score);

    constructor(address initialVerifier)
        EIP712("0xLeaked.AlertOracle", "1")
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

    function updateScoreWithProof(
        address contractAddress,
        uint8   score,
        string calldata label,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (score > 100) revert ScoreOutOfRange(score);
        if (block.timestamp > deadline) revert SignatureExpired(deadline);

        bytes32 structHash = keccak256(
            abi.encode(
                _RISK_SCORE_TYPEHASH,
                contractAddress,
                score,
                keccak256(bytes(label)),
                nonce,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (!isVerifier[signer]) revert NotAVerifier(signer);
        if (nonces[signer] != nonce) revert InvalidNonce(nonces[signer], nonce);

        unchecked {
            nonces[signer] = nonce + 1;
        }

        scores[contractAddress] = RiskScore({
            score:     score,
            label:     label,
            updatedAt: block.timestamp,
            updatedBy: msg.sender
        });

        emit ScoreUpdated(contractAddress, score, label, block.timestamp, msg.sender, nonce);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
