const hre = require("hardhat");

async function main() {
    const MOCK_USDC_ADDRESS = "0x4C424Dc42717EbB6c043c645845E425D4F40fCe0";
    
    console.log("Deploying ConfidentialUSDC...");
    const ConfidentialUSDC = await hre.ethers.getContractFactory("ConfidentialUSDC");
    const cusdc = await ConfidentialUSDC.deploy(MOCK_USDC_ADDRESS);
    
    // Change this line:
    await cusdc.deployed();  // NOT waitForDeployment()
    
    console.log("✅ ConfidentialUSDC deployed to:", cusdc.address);  // NOT getAddress()
}

main().catch(console.error);