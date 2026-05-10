const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.deployed();  // ← Changed from waitForDeployment to deployed()
    console.log("✅ MockUSDC deployed to:", usdc.address);
    
    console.log("🚀 Deploying SalaryShield...");
    const budgetCap = hre.ethers.utils.parseUnits("25000", 6);
    const SalaryShield = await hre.ethers.getContractFactory("SalaryShield");
    const payroll = await SalaryShield.deploy(usdc.address, budgetCap);
    await payroll.deployed();  // ← Changed here too
    console.log("✅ SalaryShield deployed to:", payroll.address);
    
    console.log("💰 Funding payroll...");
    const approveAmount = hre.ethers.utils.parseUnits("100000", 6);
    await usdc.approve(payroll.address, approveAmount);
    const fundAmount = hre.ethers.utils.parseUnits("50000", 6);
    await payroll.fundPayroll(fundAmount);
    
    console.log("🎉 Deployment complete!");
    console.log("MockUSDC:", usdc.address);
    console.log("SalaryShield:", payroll.address);
}

main().catch(console.error);