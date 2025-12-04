import { useState, useEffect } from 'react';
import { Settings, X, Copy, Check } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore';
import { fetchYusdBalance } from '../../lib/balanceUtils';
import { toast } from 'sonner';

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [ztarknetBalance, setZtarknetBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const sepoliaAccount = useTradingStore((state) => state.sepoliaAccount);
  const ztarknetAccount = useTradingStore((state) => state.ztarknetAccount);
  const isZtarknetReady = useTradingStore((state) => state.isZtarknetReady);

  // Fetch Ztarknet balance when modal opens
  useEffect(() => {
    if (isOpen && ztarknetAccount && isZtarknetReady) {
      setIsLoadingBalance(true);
      fetchYusdBalance(ztarknetAccount)
        .then((balance) => {
          setZtarknetBalance(balance);
          setIsLoadingBalance(false);
        })
        .catch((error) => {
          console.error('Error fetching balance:', error);
          setIsLoadingBalance(false);
        });
    }
  }, [isOpen, ztarknetAccount, isZtarknetReady]);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    if (!balance || balance === '0') return '0.00';
    return (Number(balance) / 1e18).toFixed(2);
  };

  const copyToClipboard = (text: string, type: 'sepolia' | 'ztarknet') => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Generate 5-word note for external wallet (deterministic based on address)
  const generateFiveWordNote = (address: string): string => {
    if (!address) return 'Not connected';
    // Simple deterministic word selection based on address
    const words = [
      'secure', 'private', 'encrypted', 'protected', 'shielded',
      'anonymous', 'hidden', 'masked', 'veiled', 'concealed',
      'confidential', 'secret', 'discrete', 'isolated', 'separated',
      'independent', 'autonomous', 'decentralized', 'distributed', 'scattered'
    ];
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedWords: string[] = [];
    for (let i = 0; i < 5; i++) {
      selectedWords.push(words[(hash + i * 7) % words.length]);
    }
    return selectedWords.join(' ');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="header-icon-button"
        type="button"
      >
        <Settings size={18} />
      </button>
    );
  }

  return (
    <div className="settings-modal-overlay" onClick={() => setIsOpen(false)}>
      <div
        className="settings-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="settings-modal-header">
            <div className="settings-modal-header-left">
              <div className="settings-modal-icon-container">
                <Settings size={20} />
              </div>
              <h2 className="settings-modal-title">
                Settings
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="settings-modal-close-button"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="settings-modal-body">
            {/* External Wallet (Sepolia) */}
            <div className="settings-modal-section">
              <div className="settings-modal-section-title">
                External Wallet
              </div>
              <div className="settings-modal-wallet-box">
                {sepoliaAccount ? (
                  <>
                    <div className="settings-modal-wallet-header">
                      <div className="settings-modal-wallet-address">
                        {formatAddress(sepoliaAccount.address)}
                      </div>
                      <button
                        onClick={() => copyToClipboard(sepoliaAccount.address, 'sepolia')}
                        className={`settings-modal-copy-button ${copiedAddress === 'sepolia' ? 'copied' : ''}`}
                      >
                        {copiedAddress === 'sepolia' ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                    <div className="settings-modal-wallet-note">
                      {generateFiveWordNote(sepoliaAccount.address)}
                    </div>
                  </>
                ) : (
                  <div className="settings-modal-wallet-status">
                    Not connected
                  </div>
                )}
              </div>
            </div>

            {/* Ztarknet Wallet */}
            <div className="settings-modal-section">
              <div className="settings-modal-section-title">
                Ztarknet Wallet
              </div>
              <div className="settings-modal-wallet-box settings-modal-wallet-box-ztarknet">
                {ztarknetAccount && isZtarknetReady ? (
                  <>
                    <div className="settings-modal-wallet-header" style={{ marginBottom: '12px' }}>
                      <div className="settings-modal-wallet-address settings-modal-wallet-address-ztarknet">
                        {formatAddress(ztarknetAccount.address)}
                      </div>
                      <button
                        onClick={() => copyToClipboard(ztarknetAccount.address, 'ztarknet')}
                        className={`settings-modal-copy-button settings-modal-copy-button-ztarknet ${copiedAddress === 'ztarknet' ? 'copied' : ''}`}
                      >
                        {copiedAddress === 'ztarknet' ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                    <div className="settings-modal-balance-row">
                      <div className="settings-modal-balance-label">
                        Balance
                      </div>
                      <div className={`settings-modal-balance-value ${isLoadingBalance ? 'settings-modal-balance-loading' : ''}`}>
                        {isLoadingBalance ? (
                          'Loading...'
                        ) : (
                          `${formatBalance(ztarknetBalance)} yUSD`
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="settings-modal-wallet-status">
                    Not set up
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Note */}
            <div className="settings-modal-privacy-box">
              <div className="settings-modal-privacy-text">
                <div className="settings-modal-privacy-title">
                  Privacy Notice
                </div>
                Your trading positions and balances are kept private through zero-knowledge proofs.
                Only you can view your complete trading history and position details.
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

