// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MerchantPayment {
    address public owner;
    address public merchant;
    uint256 public feePercentage = 1; // 1%
    IERC20 public usdcToken;

    event OrderPaid(
        uint256 indexed orderId, address indexed customer, uint256 totalAmount, uint256 fee, string metaData
    );

    constructor(address _owner, address _merchant, address _usdcAddress) {
        owner = _owner;
        merchant = _merchant;
        usdcToken = IERC20(_usdcAddress);
    }

    function generateTransferURI(uint256 amount, uint256 orderId, string calldata metaData)
        public
        view
        returns (string memory)
    {
        bytes memory data = abi.encode(orderId, metaData);
        return string(
            abi.encodePacked(
                "ethereum:",
                addressToString(address(usdcToken)),
                "@11155111/transfer?address=",
                addressToString(address(this)),
                "&uint256=",
                uintToString(amount),
                "&data=",
                bytesToHexString(data)
            )
        );
    }

    function processPayment(uint256 orderId, uint256 amount, string calldata metaData) external {
        require(amount > 0, "Payment amount must be greater than zero");
        require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient USDC balance");

        uint256 fee = (amount * feePercentage) / 100;
        uint256 merchantAmount = amount - fee;

        require(usdcToken.transfer(owner, fee), "Transfer of fee failed");
        require(usdcToken.transfer(merchant, merchantAmount), "Transfer to merchant failed");

        emit OrderPaid(orderId, msg.sender, amount, fee, metaData);
    }

    function updateFeePercentage(uint256 _newFeePercentage) external {
        require(msg.sender == owner, "Only owner can update fee percentage");
        require(_newFeePercentage <= 100, "Fee percentage must be <= 100");
        feePercentage = _newFeePercentage;
    }

    function updateMerchantAddress(address _newMerchantAddress) external {
        require(msg.sender == owner, "Only owner can update merchant address");
        merchant = _newMerchantAddress;
    }

    function withdrawETH() external {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }

    function withdrawToken(IERC20 token) external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(owner, balance), "Transfer failed");
    }

    // Helper function to convert address to string
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    // Helper function to convert uint to string
    function uintToString(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    // Helper function to convert bytes to hex string
    function bytesToHexString(bytes memory _bytes) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory hexString = new bytes(_bytes.length * 2);
        for (uint256 i = 0; i < _bytes.length; i++) {
            hexString[i * 2] = hexChars[uint8(_bytes[i] >> 4)];
            hexString[i * 2 + 1] = hexChars[uint8(_bytes[i] & 0x0f)];
        }
        return string(hexString);
    }
}
