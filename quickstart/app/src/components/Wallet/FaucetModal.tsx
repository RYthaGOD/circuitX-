import { useEffect, useState } from 'react';
import { Contract } from 'starknet';
import { CONTRACTS, NETWORK } from '../../config/contracts';
import { useTradingStore } from '../../stores/tradingStore';
import { fetchYusdBalance } from '../../lib/balanceUtils';

const YUSD_ABI = [
  {
    type: 'function',
    name: 'mint_to',
    inputs: [
      { name: 'to', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
];

const MINT_AMOUNT = BigInt('1000000000000000000000'); // 1000 yUSD (18 decimals)

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MintState = 'idle' | 'minting' | 'success' | 'error';

export function FaucetModal({ isOpen, onClose }: FaucetModalProps) {
  const ztarknetAccount = useTradingStore((state) => state.ztarknetAccount);
  const isZtarknetReady = useTradingStore((state) => state.isZtarknetReady);
  const setAvailableBalance = useTradingStore((state) => state.setAvailableBalance);
  const [status, setStatus] = useState<MintState>('idle');
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setMessage('');
      setTxHash(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMint = async () => {
    if (!ztarknetAccount || !isZtarknetReady) {
      setStatus('error');
      setMessage('Please finish setting up your Ztarknet wallet before minting.');
      return;
    }

    setStatus('minting');
    setMessage('Submitting mint transaction...');
    setTxHash(null);

    try {
      const contract = new Contract({
        abi: YUSD_ABI,
        address: CONTRACTS.YUSD_TOKEN,
        providerOrAccount: ztarknetAccount,
      });
      const tx = await contract.mint_to(ztarknetAccount.address, {
        low: MINT_AMOUNT,
        high: 0n,
      });

      setTxHash(tx.transaction_hash);
      setMessage('Waiting for confirmation...');

      await ztarknetAccount.waitForTransaction(tx.transaction_hash);

      setStatus('success');
      setMessage('1000 yUSD minted successfully!');
      
      // Refresh balance after minting
      if (ztarknetAccount) {
        const balance = await fetchYusdBalance(ztarknetAccount);
        setAvailableBalance(balance);
      }
    } catch (error: any) {
      console.error('Faucet mint error:', error);
      setStatus('error');
      setMessage(error?.message || 'Failed to mint yUSD. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
      <div className="bg-[#0c191e] text-white rounded-3xl border border-white/10 w-full max-w-lg p-8 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '30px', fontWeight: 700, marginBottom: '8px' }}>yUSD Faucet</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              Mint 1000 yUSD to your Circuit Ztarknet wallet on{' '}
              <span style={{ color: '#50d2c1', fontWeight: 600 }}>Ztarknet</span>.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '18px',
              padding: '20px',
            }}
          >
            <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
              Ztarknet Address
            </p>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                backgroundColor: 'rgba(255,255,255,0.07)',
                padding: '12px',
                borderRadius: '12px',
                wordBreak: 'break-all',
              }}
            >
              {ztarknetAccount ? ztarknetAccount.address : 'Not ready yet'}
            </div>
            {!isZtarknetReady && (
              <p style={{ fontSize: '12px', color: '#fca5a5', marginTop: '10px' }}>
                Complete wallet setup before requesting faucet funds.
              </p>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '18px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span>Contract</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', textAlign: 'right' }}>
                  {CONTRACTS.YUSD_TOKEN}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span>Amount</span>
                <span>1000 yUSD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span>Network</span>
                <span style={{ textAlign: 'right', fontSize: '12px' }}>{NETWORK.RPC_URL}</span>
              </div>
            </div>
            <button
              onClick={handleMint}
              disabled={status === 'minting' || !isZtarknetReady}
              style={{
                marginTop: '18px',
                width: '100%',
                padding: '14px 0',
                borderRadius: '14px',
                backgroundColor: '#50d2c1',
                color: '#0f1a1f',
                fontWeight: 600,
                fontSize: '15px',
                opacity: status === 'minting' || !isZtarknetReady ? 0.5 : 1,
                cursor: status === 'minting' || !isZtarknetReady ? 'not-allowed' : 'pointer',
                transition: 'background-color 150ms ease',
              }}
            >
              {status === 'minting' ? 'Minting...' : 'Mint 1000 yUSD'}
            </button>
          </div>

          {message && (
            <div
              style={{
                borderRadius: '18px',
                border:
                  status === 'error'
                    ? '1px solid rgba(248,113,113,0.4)'
                    : status === 'success'
                    ? '1px solid rgba(80,210,193,0.4)'
                    : '1px solid rgba(255,255,255,0.12)',
                backgroundColor:
                  status === 'error'
                    ? 'rgba(248,113,113,0.1)'
                    : status === 'success'
                    ? 'rgba(80,210,193,0.1)'
                    : 'rgba(255,255,255,0.05)',
                padding: '16px',
                marginTop: '18px',
                textAlign: 'center',
                fontSize: '13px',
                color:
                  status === 'error'
                    ? '#fecaca'
                    : status === 'success'
                    ? '#50d2c1'
                    : 'rgba(255,255,255,0.8)',
              }}
            >
              <p>{message}</p>
              {txHash && (
                <a
                  href={`${NETWORK.EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    color: 'inherit',
                  }}
                >
                  View transaction ↗
                </a>
              )}
            </div>
          )}

          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '30px' }}>
            Gas fees are paid from your Circuit Ztarknet wallet.
          </p>
        </div>
      </div>
    </div>
  );
}