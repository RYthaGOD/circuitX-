import { useState, useEffect } from 'react';
import { X, Wallet, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateZtarknetWallet,
  loadZtarknetWallet,
  saveZtarknetWallet,
  ZtarknetWallet,
  isWalletDeployed,
  createZtarknetAccount,
} from '../../services/walletService';
import { useTradingStore } from '../../stores/tradingStore';
import { NETWORK } from '../../config/contracts';

interface ZtarknetWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletReady: (account: any) => void;
  ownerAddress?: string | null;
}

export function ZtarknetWalletModal({
  isOpen,
  onClose,
  onWalletReady,
  ownerAddress,
}: ZtarknetWalletModalProps) {
  const [wallet, setWallet] = useState<ZtarknetWallet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const sepoliaAccount = useTradingStore((state) => state.sepoliaAccount);
  const ownerKey = ownerAddress ?? sepoliaAccount?.address ?? null;

  useEffect(() => {
    if (isOpen) {
      // Try to load existing wallet
      const existing = loadZtarknetWallet(ownerKey);
      if (existing) {
        setWallet(existing);
        checkDeployment(existing);
      }
    }
  }, [isOpen, ownerKey]);

  const checkDeployment = async (walletData: ZtarknetWallet) => {
    setIsChecking(true);
    try {
      const deployed = await isWalletDeployed(walletData.address);
      if (deployed) {
        setWallet({ ...walletData, deployed: true });
        saveZtarknetWallet({ ...walletData, deployed: true }, ownerKey);
        
        // Create account and notify parent
        const account = createZtarknetAccount({ ...walletData, deployed: true });
        onWalletReady(account);
      }
    } catch (error) {
      console.error('Error checking deployment:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newWallet = generateZtarknetWallet(ownerKey);
      setWallet(newWallet);
      toast.success('Ztarknet wallet generated!');
      
      // Check if already deployed
      await checkDeployment(newWallet);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate wallet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFaucet = () => {
    if (wallet) {
      window.open(`https://faucet.ztarknet.cash/?address=${wallet.address}`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-[#0f1a1f] rounded-lg border border-[rgba(255,255,255,0.1)] max-w-2xl w-full p-6 relative"
        style={{ backgroundColor: '#0f1a1f' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
            <Wallet size={20} />
            Ztarknet Trading Wallet
          </h2>
          <p className="text-white/70 text-xs">
            Generate a wallet for trading on Ztarknet. This wallet will be used for all on-chain operations.
          </p>
        </div>

        {/* Wallet Generation */}
        {!wallet ? (
          <div className="text-center py-8">
            <p className="text-white/70 mb-6 text-xs">
              A new wallet will be generated for trading on Ztarknet network.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-[#0f1a1f] rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Wallet'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet Address */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                Wallet Address
              </label>
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                <code className="flex-1 text-white font-mono text-xs break-all">
                  {wallet.address}
                </code>
                <button
                  onClick={() => handleCopy(wallet.address, 'Address')}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  {copied === 'Address' ? (
                    <Check size={14} className="text-[#50d2c1]" />
                  ) : (
                    <Copy size={14} className="text-white/50" />
                  )}
                </button>
              </div>
            </div>

            {/* Deployment Status */}
            <div className="p-3 rounded-lg border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/70">
                  Deployment Status
                </span>
                {isChecking ? (
                  <span className="text-xs text-white/50">Checking...</span>
                ) : wallet.deployed ? (
                  <span className="text-xs text-[#50d2c1] font-medium">
                    ✓ Deployed
                  </span>
                ) : (
                  <span className="text-xs text-yellow-400 font-medium">
                    ⚠ Not Deployed
                  </span>
                )}
              </div>

              {!wallet.deployed && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-white/60">
                    Your wallet needs to be deployed before you can trade. Get funds from the faucet first.
                  </p>
                  <button
                    onClick={handleFaucet}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-[#0f1a1f] rounded text-xs font-medium transition-colors"
                  >
                    <ExternalLink size={14} />
                    Get Funds from Faucet
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs font-medium transition-colors disabled:opacity-50 text-white/70 hover:text-white"
              >
                Generate New
              </button>
              {wallet.deployed && (
                <button
                  onClick={() => {
                    const account = createZtarknetAccount(wallet);
                    onWalletReady(account);
                    onClose();
                  }}
                  className="flex-1 px-3 py-2 bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-[#0f1a1f] rounded text-xs font-medium transition-colors"
                >
                  Use This Wallet
                </button>
              )}
            </div>

            {/* Security Warning */}
            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-400">
              ⚠️ <strong>Security:</strong> Your private key is stored locally in your browser. 
              Never share it or expose it publicly. This is a testnet wallet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

