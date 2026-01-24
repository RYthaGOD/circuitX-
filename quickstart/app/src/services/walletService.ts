import { Account, RpcProvider, ec, hash, num } from 'starknet';
import { NETWORK } from '../config/contracts';

const STORAGE_KEY = 'ztarknet_wallet';
const STORAGE_KEY_PREFIX = 'ztarknet_wallet_owner';
const LAST_OWNER_KEY = 'ztarknet_wallet_last_owner';
const ACCOUNT_CLASS_HASH =
  '0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189'; // OpenZeppelin account

export interface ZtarknetWallet {
  privateKey: string;
  publicKey: string;
  address: string;
  deployed: boolean;
}

const getStorageKey = (ownerAddress?: string | null) => {
  if (!ownerAddress) return STORAGE_KEY;
  return `${STORAGE_KEY_PREFIX}:${ownerAddress.toLowerCase()}`;
};

const derivePrivateKeyFromOwner = (ownerAddress?: string | null): string => {
  if (!ownerAddress) {
    const randomBytes = ec.starkCurve.utils.randomPrivateKey();
    // Convert Uint8Array to hex string manually
    const hex = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex;
  }

  const normalized = ownerAddress.toLowerCase();
  const hashed = BigInt(hash.starknetKeccak(normalized));
  const curveN = ec.starkCurve.CURVE?.n ?? BigInt(
    '361850278866613110698659328152149712041468702080126762623304950015868133013'
  );
  const keyBigInt = hashed % curveN || 1n;
  return num.toHex(keyBigInt);
};

/**
 * Generate a new Ztarknet wallet (deterministic per owner when provided)
 */
const bytesToBigIntHex = (bytes: Uint8Array) => {
  const hex =
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  const bigint = BigInt(hex);
  return { bigint, hex };
};

export function generateZtarknetWallet(ownerAddress?: string | null): ZtarknetWallet {
  const privateKeyHex = derivePrivateKeyFromOwner(ownerAddress);
  const rawPublicKey = ec.starkCurve.getPublicKey(privateKeyHex);
  const xSlice =
    rawPublicKey.length === 64 ? rawPublicKey.slice(0, 32) : rawPublicKey.slice(1, 33);
  const { bigint: publicKeyBigInt, hex: publicKeyHex } = bytesToBigIntHex(xSlice);

  const constructorCalldata = [publicKeyBigInt.toString()];
  const address = hash.calculateContractAddressFromHash(
    publicKeyBigInt,
    ACCOUNT_CLASS_HASH,
    constructorCalldata,
    0
  );

  const wallet: ZtarknetWallet = {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    address: num.toHex(address),
    deployed: false,
  };

  saveZtarknetWallet(wallet, ownerAddress);
  return wallet;
}

/**
 * Load Ztarknet wallet from localStorage
 */
export function loadZtarknetWallet(ownerAddress?: string | null): ZtarknetWallet | null {
  try {
    const key = getStorageKey(ownerAddress);
    const stored = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY);
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
export function saveZtarknetWallet(wallet: ZtarknetWallet, ownerAddress?: string | null): void {
  try {
    const key = getStorageKey(ownerAddress);
    localStorage.setItem(key, JSON.stringify(wallet));
    if (ownerAddress) {
      localStorage.setItem(LAST_OWNER_KEY, ownerAddress.toLowerCase());
    }
  } catch (error) {
    console.error('Error saving Ztarknet wallet:', error);
  }
}

/**
 * Create a Starknet Account from wallet data
 */
export function createZtarknetAccount(wallet: ZtarknetWallet): Account {
  const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
  return new Account({
    provider,
    address: wallet.address,
    signer: wallet.privateKey,
    cairoVersion: '1',
  });
}

/**
 * Check if Ztarknet wallet is deployed on-chain
 */
export async function isWalletDeployed(address: string): Promise<boolean> {
  try {
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    // Use getClassAt or getClassByHash instead of getCode
    // For account contracts, check if class hash exists
    try {
      const classHash = await provider.getClassHashAt(address);
      return classHash !== undefined && classHash !== '0x0';
    } catch {
      // Fallback: try to get class at address
      try {
        const contractClass = await provider.getClassAt(address);
        return contractClass !== undefined && contractClass !== null;
      } catch {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}

/**
 * Deploy Ztarknet wallet to the network
 * Note: This requires the wallet to have funds for deployment
 */
export interface DeployResult {
  transaction_hash?: string;
  alreadyDeployed: boolean;
}

export async function deployZtarknetWallet(wallet: ZtarknetWallet): Promise<DeployResult> {
  const already = await isWalletDeployed(wallet.address);
  if (already) {
    return { alreadyDeployed: true };
  }

  const account = createZtarknetAccount(wallet);
  const payload = {
    classHash: ACCOUNT_CLASS_HASH,
    constructorCalldata: [wallet.publicKey],
    addressSalt: wallet.publicKey,
    contractAddress: wallet.address,
  };

  try {
    const response = await account.deployAccount(payload);
    return { transaction_hash: response.transaction_hash, alreadyDeployed: false };
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg.includes('contract already deployed')) {
      return { alreadyDeployed: true };
    }
    throw error;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface DeploymentWatcherOptions {
  maxAttempts?: number;
  intervalMs?: number;
  onTick?: (attempt: number) => void;
}

export async function waitForWalletDeployment(
  wallet: ZtarknetWallet,
  options: DeploymentWatcherOptions & { ownerAddress?: string | null } = {}
): Promise<boolean> {
  const { maxAttempts = 30, intervalMs = 3000, onTick, ownerAddress } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const deployed = await isWalletDeployed(wallet.address);
    if (deployed) {
      saveZtarknetWallet({ ...wallet, deployed: true }, ownerAddress);
      return true;
    }
    onTick?.(attempt);
    await delay(intervalMs);
  }

  return false;
}

