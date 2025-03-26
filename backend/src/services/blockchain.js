const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);

const verifyWalletSignature = async (signature, message, address) => {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Check if the recovered address matches the provided address
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw new Error('Failed to verify wallet signature');
  }
};

const getNonce = () => {
  // Generate a random nonce for signing
  return Math.floor(Math.random() * 1000000).toString();
};

module.exports = {
  verifyWalletSignature,
  getNonce
}; 