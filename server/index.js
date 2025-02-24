const express = require('express');
const ethers = require('ethers');
require('dotenv').config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3000;

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const MERCHANT_PAYMENT_ADDRESS = process.env.MERCHANT_PAYMENT_ADDRESS;
const USDC_ADDRESS = process.env.USDC_ADDRESS;

const MERCHANT_PAYMENT_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'string', name: 'metaData', type: 'string' }
    ],
    name: 'processPayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

const USDC_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  }
];

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(MERCHANT_PAYMENT_ADDRESS, MERCHANT_PAYMENT_ABI, wallet);
const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

async function monitorAndProcessPayments() {
  console.log('Monitoring for USDC payments...');

  usdcContract.on('Transfer', async (from, to, amount) => {
    if (to.toLowerCase() === MERCHANT_PAYMENT_ADDRESS.toLowerCase()) {
      console.log(`Received USDC payment of ${ethers.formatUnits(amount, 6)} from ${from}`);
      try {
        const orderId = Date.now();
        const metaData = `Automated payment processing for ${ethers.formatUnits(amount, 6)} USDC`;

        console.log(`Processing payment: orderId=${orderId}, amount=${amount}, metaData=${metaData}`);

        const tx = await contract.processPayment(orderId, amount, metaData);
        console.log(`Transaction sent: ${tx.hash}`);

        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction wait timed out!')), 60000)
        );

        const receipt = await Promise.race([tx.wait(), timeout]);
        console.log(`Transaction receipt:`, JSON.stringify(receipt, null, 2));
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    }
  });
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  monitorAndProcessPayments();
});
