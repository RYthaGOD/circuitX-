import { useEffect, useState } from 'react';
import { Contract } from 'starknet';
import { CONTRACTS, NETWORK } from '../../config/contracts';
import { useTradingStore } from '../../stores/tradingStore';
import { fetchYusdBalance } from '../../lib/balanceUtils';
import { X, Copy, Check, ExternalLink, Coins, Wallet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setMessage('');
      setTxHash(null);
      setCopied(false);
    }
  }, [isOpen]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Not ready yet';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
    <div className="faucet-modal-overlay">
      <div className="faucet-modal-container">
        <button
          onClick={onClose}
          className="faucet-modal-close-btn"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="faucet-modal-content">
          {/* Header */}
          <div className="faucet-modal-header">
            <div className="faucet-modal-icon-wrapper">
              <Coins size={32} />
            </div>
            <h2 className="faucet-modal-title">yUSD Faucet</h2>
            <p className="faucet-modal-description">
              Get 1000 yUSD tokens for testing on{' '}
              <span className="faucet-modal-network-name">Ztarknet</span>
            </p>
          </div>

          {/* Wallet Address Section */}
          <div className="faucet-modal-section">
            <div className="faucet-modal-section-header">
              <Wallet size={16} />
              <span>Ztarknet Address</span>
            </div>
            <div className="faucet-modal-address-container">
              <div className="faucet-modal-address">
                {ztarknetAccount ? (
                  <>
                    <span className="faucet-modal-address-full">{ztarknetAccount.address}</span>
                    <button
                      onClick={() => copyToClipboard(ztarknetAccount.address)}
                      className="faucet-modal-copy-btn"
                      title="Copy address"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </>
                ) : (
                  <span className="faucet-modal-address-placeholder">Not ready yet</span>
                )}
              </div>
              {!isZtarknetReady && (
                <div className="faucet-modal-warning">
                  <AlertCircle size={14} />
                  <span>Complete wallet setup before requesting faucet funds</span>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="faucet-modal-section">
            <div className="faucet-modal-details">
              <div className="faucet-modal-detail-row">
                <span className="faucet-modal-detail-label">Amount</span>
                <span className="faucet-modal-detail-value highlight">1000 yUSD</span>
              </div>
              <div className="faucet-modal-detail-row">
                <span className="faucet-modal-detail-label">Contract</span>
                <span className="faucet-modal-detail-value monospace">
                  {formatAddress(CONTRACTS.YUSD_TOKEN)}
                </span>
              </div>
              <div className="faucet-modal-detail-row">
                <span className="faucet-modal-detail-label">Network</span>
                <span className="faucet-modal-detail-value">Ztarknet</span>
              </div>
            </div>
            
            <button
              onClick={handleMint}
              disabled={status === 'minting' || !isZtarknetReady}
              className={`faucet-modal-mint-btn ${status === 'minting' ? 'minting' : ''} ${status === 'success' ? 'success' : ''}`}
            >
              {status === 'minting' ? (
                <>
                  <Loader2 size={18} className="faucet-modal-spinner" />
                  <span>Minting...</span>
                </>
              ) : status === 'success' ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Minted Successfully!</span>
                </>
              ) : (
                <>
                  <Coins size={18} />
                  <span>Mint 1000 yUSD</span>
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`faucet-modal-status ${status}`}>
              <div className="faucet-modal-status-icon">
                {status === 'error' ? (
                  <AlertCircle size={18} />
                ) : status === 'success' ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Loader2 size={18} className="faucet-modal-spinner" />
                )}
              </div>
              <div className="faucet-modal-status-content">
                <p className="faucet-modal-status-message">{message}</p>
                {txHash && (
                  <a
                    href={`${NETWORK.EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="faucet-modal-tx-link"
                  >
                    <span>View on Explorer</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <p className="faucet-modal-footer-note">
            Gas fees are paid from your Ztarknet wallet
          </p>
        </div>
      </div>
    </div>
  );
}