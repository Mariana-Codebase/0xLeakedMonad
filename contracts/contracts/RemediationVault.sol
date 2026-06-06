// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * RemediationVault — Bóveda personal de fondos en emergencia.
 *
 * En el Remediation Hub el usuario puede mover sus fondos a esta bóveda
 * mientras revoca approvals de contratos comprometidos. La bóveda mantiene
 * un balance separado por cada usuario — NO es un pool del owner.
 *
 * Soporta:
 *   - Depósito de MON nativo  → depositNative()
 *   - Depósito de ERC-20      → depositERC20(token, amount)  (requiere approve)
 *   - Withdraw del propio user → withdraw* solo del balance propio
 *
 * Seguridad:
 *   - ReentrancyGuard en todos los withdraws.
 *   - SafeERC20 para tokens no estándar.
 *   - El owner NO puede tocar fondos de usuarios. Solo puede emergencyPause.
 */
contract RemediationVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // user => balance de MON nativo
    mapping(address => uint256) public nativeBalanceOf;

    // user => token => balance ERC-20
    mapping(address => mapping(address => uint256)) public tokenBalanceOf;

    address public immutable owner;
    bool public paused;

    event NativeDeposited(address indexed user, uint256 amount);
    event NativeWithdrawn(address indexed user, address indexed to, uint256 amount);
    event TokenDeposited(address indexed user, address indexed token, uint256 amount);
    event TokenWithdrawn(address indexed user, address indexed token, address indexed to, uint256 amount);
    event PauseToggled(bool paused);

    error InsufficientBalance(uint256 available, uint256 requested);
    error VaultPaused();
    error NotOwner();
    error InvalidAmount();
    error InvalidRecipient();

    modifier whenNotPaused() {
        if (paused) revert VaultPaused();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ----------------------------------------------------------------------
    // MON nativo
    // ----------------------------------------------------------------------

    function depositNative() external payable whenNotPaused {
        if (msg.value == 0) revert InvalidAmount();
        nativeBalanceOf[msg.sender] += msg.value;
        emit NativeDeposited(msg.sender, msg.value);
    }

    // Permite recibir MON directo a la dirección del contrato (se acredita al sender).
    receive() external payable {
        if (msg.value == 0) revert InvalidAmount();
        nativeBalanceOf[msg.sender] += msg.value;
        emit NativeDeposited(msg.sender, msg.value);
    }

    function withdrawNative(address payable to, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        if (to == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        uint256 bal = nativeBalanceOf[msg.sender];
        if (bal < amount) revert InsufficientBalance(bal, amount);

        unchecked {
            nativeBalanceOf[msg.sender] = bal - amount;
        }

        (bool ok, ) = to.call{value: amount}("");
        require(ok, "MON transfer failed");

        emit NativeWithdrawn(msg.sender, to, amount);
    }

    // ----------------------------------------------------------------------
    // ERC-20
    // ----------------------------------------------------------------------

    function depositERC20(address token, uint256 amount) external whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        tokenBalanceOf[msg.sender][token] += amount;
        emit TokenDeposited(msg.sender, token, amount);
    }

    function withdrawERC20(address token, address to, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        if (to == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        uint256 bal = tokenBalanceOf[msg.sender][token];
        if (bal < amount) revert InsufficientBalance(bal, amount);

        unchecked {
            tokenBalanceOf[msg.sender][token] = bal - amount;
        }

        IERC20(token).safeTransfer(to, amount);
        emit TokenWithdrawn(msg.sender, token, to, amount);
    }

    // ----------------------------------------------------------------------
    // Owner — solo puede pausar en emergencia, NO mover fondos.
    // ----------------------------------------------------------------------

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PauseToggled(_paused);
    }
}
