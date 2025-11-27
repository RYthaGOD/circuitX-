import { Account, RpcProvider, ec, hash, num } from 'starknet';
import { NETWORK } from '../config/contracts';

const STORAGE_KEY = 'ztarknet_wallet';
const ACCOUNT_CLASS_HASH = '0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189'; // OpenZeppelin account

export interface ZtarknetWallet {
  privateKey: string;
  publicKey: string;
  address: string;
  deployed: boolean;
}

/**
 * Generate a new Ztarknet wallet
 */
export function generateZtarknetWallet(): ZtarknetWallet {
  // Generate a new key pair
  const privateKey = ec.starkCurve.utils.randomPrivateKey();
  const publicKey = ec.starkCurve.getPublicKey(privateKey);
  
  // For OpenZeppelin accounts, use public key as salt
  // The address is calculated using the class hash, salt (public key), and constructor calldata
  const publicKeyBigInt = num.toBigInt(publicKey);
  const salt = publicKeyBigInt;
  
  // Constructor calldata for OpenZeppelin account is just the public key
  const constructorCalldata = [publicKeyBigInt.toString()];
  
  // Calculate contract address
  const address = hash.calculateContractAddressFromHash(
    salt,
    ACCOUNT_CLASS_HASH,
    constructorCalldata,
    0
  );

  const wallet: ZtarknetWallet = {
    privateKey: num.toHex(privateKey),
    publicKey: num.toHex(publicKey),
    address: num.toHex(address),
    deployed: false, // Will be set to true after deployment
  };

  // Save to localStorage
  saveZtarknetWallet(wallet);

  return wallet;
}

/**
 * Load Ztarknet wallet from localStorage
 */
export function loadZtarknetWallet(): ZtarknetWallet | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading Ztarknet wallet:', error);
    return null;
  }
}

/**
 * Save Ztarknet wallet to localStorage
 */
export function saveZtarknetWallet(wallet: ZtarknetWallet): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  } catch (error) {
    console.error('Error saving Ztarknet wallet:', error);
  }
}

/**
 * Create a Starknet Account from wallet data
 */
export function createZtarknetAccount(wallet: ZtarknetWallet): Account {
  const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
  
  return new Account(
    provider,
    wallet.address,
    wallet.privateKey,
    '1' // cairo version
  );
}

/**
 * Check if Ztarknet wallet is deployed on-chain
 */
export async function isWalletDeployed(address: string): Promise<boolean> {
  try {
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    const code = await provider.getCode(address);
    return code.bytecode.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Deploy Ztarknet wallet to the network
 * Note: This requires the wallet to have funds for deployment
 */
export async function deployZtarknetWallet(wallet: ZtarknetWallet): Promise<string> {
  const account = createZtarknetAccount(wallet);
  
  // Deploy the account using Universal Deployer Contract (UDC)
  // This is a simplified version - you may need to adjust based on your network setup
  const deployAccountPayload = {
    classHash: ACCOUNT_CLASS_HASH,
    constructorCalldata: [wallet.publicKey],
    salt: num.toBigInt(wallet.publicKey),
  };

  // Use UDC to deploy
  const UDC_ADDRESS = '0x041a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad02bf';
  
  // This is a placeholder - actual deployment may vary
  // You might need to use a different deployment method depending on Ztarknet setup
  throw new Error('Wallet deployment not yet implemented. Please deploy manually or use faucet to get funds first.');
}

