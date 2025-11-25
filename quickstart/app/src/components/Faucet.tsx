import { useState } from 'react';
import { connect, disconnect } from '@starknet-io/get-starknet';
import { RpcProvider, Contract, Account, CallData } from 'starknet';
import './Faucet.css';

// yUSD Contract Address
const YUSD_CONTRACT_ADDRESS = '0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda';

// Network RPC URL
const RPC_URL = 'https://ztarknet-madara.d.karnot.xyz';

// yUSD Contract ABI (minimal - just what we need)
const YUSD_ABI = [
  {
    type: 'function',
    name: 'mint_to',
    inputs: [
      { name: 'to', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'balance_of',
    inputs: [
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [
      { type: 'core::integer::u256' }
    ],
    state_mutability: 'view'
  }
];

interface FaucetState {
  status: 'idle' | 'connecting' | 'requesting' | 'success' | 'error';
  message: string;
  txHash?: string;
}

export default function Faucet() {
  const [address, setAddress] = useState<string>('');
  const [wallet, setWallet] = useState<any>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [faucetState, setFaucetState] = useState<FaucetState>({
    status: 'idle',
    message: ''
  });

  // Amount: 1000 yUSD = 1000 * 10^18
  const FAUCET_AMOUNT = BigInt('1000000000000000000000');

  const connectWallet = async () => {
    try {
      setFaucetState({ status: 'connecting', message: 'Connecting wallet...' });
      const starknet = await connect();
      
      if (!starknet) {
        throw new Error('No wallet found. Please install Argent or Braavos wallet.');
      }

      await starknet.enable();
      setWallet(starknet);
      
      if (starknet.account) {
        setAccount(starknet.account);
        setAddress(starknet.account.address);
        setFaucetState({ status: 'idle', message: 'Wallet connected!' });
      }
    } catch (error: any) {
      setFaucetState({
        status: 'error',
        message: error.message || 'Failed to connect wallet'
      });
    }
  };

  const disconnectWallet = async () => {
    await disconnect();
    setWallet(null);
    setAccount(null);
    setAddress('');
    setFaucetState({ status: 'idle', message: '' });
  };

  const requestTokens = async () => {
    if (!address) {
      setFaucetState({
        status: 'error',
        message: 'Please enter a recipient address'
      });
      return;
    }

    if (!account) {
      setFaucetState({
        status: 'error',
        message: 'Please connect your wallet to sign the transaction (you pay gas, tokens go to the address above)'
      });
      return;
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 66) {
      setFaucetState({
        status: 'error',
        message: 'Invalid address format. Must be a valid Starknet address (0x + 64 hex chars)'
      });
      return;
    }

    try {
      setFaucetState({ status: 'requesting', message: 'Requesting 1000 yUSD...' });

      const provider = new RpcProvider({ nodeUrl: RPC_URL });
      const yusdContract = new Contract(YUSD_ABI, YUSD_CONTRACT_ADDRESS, provider);
      yusdContract.connect(account);

      // Prepare calldata for mint_to(to: ContractAddress, amount: u256)
      // u256 is passed as two felt252 values (low, high)
      const callData = CallData.compile({
        to: address,
        amount: {
          low: FAUCET_AMOUNT,
          high: 0n
        }
      });

      // Invoke mint_to function
      const tx = await yusdContract.mint_to(callData);
      
      setFaucetState({
        status: 'success',
        message: 'Transaction submitted!',
        txHash: tx.transaction_hash
      });

      // Wait for transaction to be accepted
      await provider.waitForTransaction(tx.transaction_hash);
      
      setFaucetState({
        status: 'success',
        message: '1000 yUSD sent successfully!',
        txHash: tx.transaction_hash
      });
    } catch (error: any) {
      console.error('Faucet error:', error);
      setFaucetState({
        status: 'error',
        message: error.message || 'Failed to request tokens. Make sure you have enough funds for gas.'
      });
    }
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://explorer-zstarknet.d.karnot.xyz/tx/${txHash}`;
  };

  return (
    <div className="faucet-container">
      <div className="faucet-card">
        <h1>yUSD Faucet</h1>
        <p className="faucet-description">
          Request 1000 yUSD tokens to any address on Ztarknet testnet.
          <br />
          <small>Connect your wallet to sign the transaction (you pay gas fees).</small>
        </p>

        {!account ? (
          <div className="wallet-section">
            <button onClick={connectWallet} className="btn btn-primary">
              Connect Wallet
            </button>
            <p className="help-text">
              Connect your wallet to automatically fill your address, or enter an address manually below.
            </p>
          </div>
        ) : (
          <div className="wallet-section">
            <div className="wallet-info">
              <p><strong>Connected:</strong> {account.address.slice(0, 10)}...{account.address.slice(-8)}</p>
              <button onClick={disconnectWallet} className="btn btn-secondary btn-small">
                Disconnect
              </button>
            </div>
          </div>
        )}

        <div className="address-section">
          <label htmlFor="address">Recipient Address</label>
          <input
            id="address"
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="address-input"
          />
        </div>

        <button
          onClick={requestTokens}
          disabled={faucetState.status === 'requesting' || faucetState.status === 'connecting' || !address}
          className="btn btn-primary btn-large"
        >
          {faucetState.status === 'requesting' ? 'Requesting...' : 'Request 1000 yUSD'}
        </button>

        {faucetState.message && (
          <div className={`status-message ${faucetState.status}`}>
            <p>{faucetState.message}</p>
            {faucetState.txHash && (
              <a
                href={getExplorerUrl(faucetState.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View Transaction →
              </a>
            )}
          </div>
        )}

        <div className="faucet-info">
          <h3>Contract Info</h3>
          <p><strong>Contract Address:</strong> <code>{YUSD_CONTRACT_ADDRESS}</code></p>
          <p><strong>Network:</strong> Ztarknet Testnet</p>
          <p><strong>Amount per request:</strong> 1000 yUSD</p>
        </div>
      </div>
    </div>
  );
}

