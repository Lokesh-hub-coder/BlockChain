// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PraiseBoard
 * @dev A decentralized tipping contract for supporters to send ETH with notes.
 *      Anyone can tip Ifeoma with a short message; she can withdraw accumulated funds.
 */
contract PraiseBoard {
    address public owner;

    // Constants
    uint256 private constant MAX_NOTE_LENGTH = 280;

    // Reentrancy guard
    uint256 private locked = 0;

    // Explicit withdrawal balance tracking (CEI pattern)
    uint256 private pendingWithdrawal = 0;

    /**
     * @dev Emitted when a supporter sends a tip with a note.
     * @param supporter The address of the supporter (from msg.sender)
     * @param amount    The amount of ETH tipped (from msg.value)
     * @param note      The message from the supporter
     */
    event Tip(
        address indexed supporter,
        uint256 amount,
        string note
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can withdraw");
        _;
    }

    modifier noReentrancy() {
        require(locked == 0, "No reentrancy");
        locked = 1;
        _;
        locked = 0;
    }

    /**
     * @dev Sets the deployer as the owner.
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Accept a tip with a note. The note is stored in the event log.
     * @param note The message (max 280 bytes)
     */
    function tip(string memory note) external payable noReentrancy {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(bytes(note).length <= MAX_NOTE_LENGTH, "Note too long");

        // Track accumulated balance in state (state write before any interaction)
        pendingWithdrawal += msg.value;

        // Emit event: supporter from msg.sender, amount from msg.value, note from param
        emit Tip(msg.sender, msg.value, note);
    }

    /**
     * @dev Withdraw all accumulated tips to the owner.
     *      Follows checks-effects-interactions: balance is zeroed before the external call.
     */
    function withdraw() external onlyOwner noReentrancy {
        uint256 amount = pendingWithdrawal;
        require(amount > 0, "Nothing to withdraw");

        // EFFECT: zero the state before the external call (CEI pattern)
        pendingWithdrawal = 0;

        // INTERACTION: transfer to owner
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Returns the contract's current ETH balance.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
