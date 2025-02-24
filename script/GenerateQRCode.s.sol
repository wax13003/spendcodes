// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MerchantPayment.sol";

contract GenerateQRCode is Script {
    function run() external view {
        address contractAddress = vm.envAddress("MERCHANT_PAYMENT_ADDRESS");
        MerchantPayment merchantPayment = MerchantPayment(contractAddress);

        uint256 orderId = 12345;
        string memory metaData = "Test Order";
        uint256 amount = 10000000; // 10 USDC (assuming 6 decimal places)

        string memory uri = merchantPayment.generateTransferURI(amount, orderId, metaData);

        console.log("Generated ERC-681 URI for USDC payment on Sepolia testnet:");
        console.log(uri);
        console.log("\nThis URI includes:");
        console.log("- USDC token address on Sepolia");
        console.log("- Sepolia testnet chain ID (11155111)");
        console.log("- Transfer function call");
        console.log("- MerchantPayment contract address as the recipient");
        console.log("- Amount to transfer");
        console.log("- Encoded data including orderId and metaData");
        console.log("\nTo generate a QR code, use an online QR code generator with this URI.");
        console.log("Note: This URI initiates a USDC transfer to the MerchantPayment contract.");
        console.log("The contract will automatically process the payment upon receiving the funds.");
        console.log("\nCustomer steps:");
        console.log("1. Scan the QR code with a compatible wallet.");
        console.log("2. Approve and send the transaction to transfer USDC.");
        console.log("3. The contract will automatically handle fee distribution and payment processing.");
    }
}
