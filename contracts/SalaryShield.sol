// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SalaryShield {
    IERC20 public usdc;
    address public hrAddress;
    mapping(address => bool) public isEmployee;
    mapping(address => string) public encryptedSalaries;
    mapping(address => uint256) public pendingPayouts;
    
    uint256 public monthlyBudgetCap;
    uint256 public currentTotalPayroll;
    
    event EmployeeAdded(address indexed emp, string encryptedSalary);
    event PayrollProcessed(address indexed emp, uint256 netAmount);
    event PayoutClaimed(address indexed emp, uint256 amount);
    
    constructor(address _usdcAddress, uint256 _budgetCap) {
        usdc = IERC20(_usdcAddress);
        hrAddress = msg.sender;
        monthlyBudgetCap = _budgetCap;
    }
    
    modifier onlyHR() {
        require(msg.sender == hrAddress, "Only HR");
        _;
    }
    
    modifier onlyEmployee() {
        require(isEmployee[msg.sender], "Not employee");
        _;
    }
    
    function addEmployee(address emp, string memory encryptedSalary) public onlyHR {
        require(!isEmployee[emp], "Already exists");
        isEmployee[emp] = true;
        encryptedSalaries[emp] = encryptedSalary;
        emit EmployeeAdded(emp, encryptedSalary);
    }
    
    function processEmployee(address emp, uint256 netAmount) public onlyHR {
        require(isEmployee[emp], "Not employee");
        pendingPayouts[emp] = netAmount;
        currentTotalPayroll += netAmount;
        require(currentTotalPayroll <= monthlyBudgetCap, "Budget exceeded");
        emit PayrollProcessed(emp, netAmount);
    }
    
    function claimPayout() public onlyEmployee {
        uint256 amount = pendingPayouts[msg.sender];
        require(amount > 0, "No payout");
        pendingPayouts[msg.sender] = 0;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
        emit PayoutClaimed(msg.sender, amount);
    }
    
    function fundPayroll(uint256 amount) public onlyHR {
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
    
    function getContractBalance() public view onlyHR returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}