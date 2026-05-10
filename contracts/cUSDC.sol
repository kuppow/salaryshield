// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Simplified Confidential USDC wrapper
contract ConfidentialUSDC is ERC20 {
    IERC20 public immutable usdc;
    
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    
    constructor(address _usdc) ERC20("Confidential USDC", "cUSDC") {
        usdc = IERC20(_usdc);
    }
    
    // Deposit USDC → mint cUSDC (this represents the "encrypted" version)
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }
    
    // Withdraw cUSDC → get USDC back
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        _burn(msg.sender, amount);
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }
    
    // View USDC balance of this contract
    function getUSDCBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}