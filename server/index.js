const express = require('express');
const ethers = require('ethers');
require('dotenv').config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3000;

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const MERCHANT_PAYMENT_ADDRESS = process.env.MERCHANT_PAYMENT_ADDRESS;
const USDC_ADDRESS = process.env.USDC_ADDRESS;

// MerchantPayment contract ABI
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
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'merchant',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'feePercentage',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'usdcToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// USDC token ABI (updated with allowance and approve functions)
const USDC_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Transfer',
    type: 'event'
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  MERCHANT_PAYMENT_ADDRESS,
  MERCHANT_PAYMENT_ABI,
  wallet
);

// USDC contract instance to listen for transfers
const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

async function getContractState() {
  try {
    const owner = await contract.owner();
    const merchant = await contract.merchant();
    const feePercentage = await contract.feePercentage();
    const usdcTokenAddress = await contract.usdcToken();
    const usdcBalance = await usdcContract.balanceOf(MERCHANT_PAYMENT_ADDRESS);

    console.log('Contract State:', {
      owner,
      merchant,
      feePercentage: feePercentage.toString(),
      usdcTokenAddress,
      usdcBalance: ethers.formatUnits(usdcBalance, 6)
    });
  } catch (error) {
    console.error('Error fetching contract state:', error);
  }
}

async function monitorAndProcessPayments() {
  console.log('Monitoring for USDC payments...');

  usdcContract.on('Transfer', async (from, to, amount, event) => {
    if (to.toLowerCase() === MERCHANT_PAYMENT_ADDRESS.toLowerCase()) {
      console.log(
        `Received USDC payment of ${ethers.formatUnits(amount, 6)} from ${from}`
      );

      try {
        // Check USDC balance of the contract
        const contractBalance = await usdcContract.balanceOf(
          MERCHANT_PAYMENT_ADDRESS
        );
        console.log(
          `Contract USDC balance: ${ethers.formatUnits(contractBalance, 6)}`
        );

        // Check and set allowance if needed
        const currentAllowance = await usdcContract.allowance(
          from,
          MERCHANT_PAYMENT_ADDRESS
        );
        if (currentAllowance < amount) {
          console.log('Insufficient allowance. Approving USDC spend...');
          const approveTx = await usdcContract
            .connect(wallet)
            .approve(MERCHANT_PAYMENT_ADDRESS, amount);
          await approveTx.wait();
          console.log('USDC spend approved');
        }

        // Get and log contract state
        await getContractState();

        const orderId = Date.now();
        const metaData = `Automated payment processing for ${ethers.formatUnits(
          amount,
          6
        )} USDC`;

        console.log(
          `Attempting to process payment: orderId=${orderId}, amount=${amount}, metaData=${metaData}`
        );

        // Try to estimate gas and get more information if it fails
        try {
          const estimatedGas = await contract.processPayment.estimateGas(
            orderId,
            amount,
            metaData
          );
          console.log(`Estimated gas: ${estimatedGas}`);

          const tx = await contract.processPayment(orderId, amount, metaData, {
            gasLimit: estimatedGas.mul(120).div(100) // Add 20% buffer
          });
          console.log(`Transaction sent: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`Payment processed: ${receipt.transactionHash}`);
        } catch (error) {
          console.error('Error estimating gas or processing payment:', error);

          // Try to call the function statically to get more error details
          try {
            const result = await contract.processPayment.staticCall(
              orderId,
              amount,
              metaData
            );
            console.log('Static call result:', result);
          } catch (staticCallError) {
            console.error('Static call error:', staticCallError);
            if (staticCallError.reason) {
              console.error('Revert reason:', staticCallError.reason);
            }
          }

          // Check USDC allowance
          const allowance = await usdcContract.allowance(
            from,
            MERCHANT_PAYMENT_ADDRESS
          );
          console.log(
            `USDC allowance for contract: ${ethers.formatUnits(allowance, 6)}`
          );
        }

        // Check contract state after processing
        await getContractState();
      } catch (error) {
        console.error('Error in payment processing flow:', error);
      }
    }
  });
}

app.get('/', (req, res) => {
  res.send('MerchantPayment server is running');
});

app.get('/contract-state', async (req, res) => {
  try {
    const owner = await contract.owner();
    const merchant = await contract.merchant();
    const feePercentage = await contract.feePercentage();
    const usdcTokenAddress = await contract.usdcToken();
    const usdcBalance = await usdcContract.balanceOf(MERCHANT_PAYMENT_ADDRESS);

    res.json({
      owner,
      merchant,
      feePercentage: feePercentage.toString(),
      usdcTokenAddress,
      usdcBalance: ethers.formatUnits(usdcBalance, 6)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contract state' });
  }
});

app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  await getContractState(); // Log initial contract state
  monitorAndProcessPayments();
});
