// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MerchantPayment.sol";

contract DeployMerchantPayment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address merchant = vm.envAddress("MERCHANT_ADDRESS");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        MerchantPayment merchantPayment = new MerchantPayment(
            owner,
            merchant,
            usdcAddress
        );
        
        require(address(merchantPayment) != address(0), "Deployment failed");

        console.log("MerchantPayment deployed at:", address(merchantPayment));
        console.log("Owner address:", owner);
        console.log("Merchant address:", merchant);
        console.log("USDC address:", usdcAddress);

        // Optional: Call any initialization functions here if needed
        // merchantPayment.someInitFunction();

        vm.stopBroadcast();
    }
}