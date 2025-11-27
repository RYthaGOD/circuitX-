import { useEffect, useMemo, useState } from 'react';
import { Account } from 'starknet';
import { Check, Copy, ExternalLink, Loader2, RefreshCw, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  createZtarknetAccount,
  deployZtarknetWallet,
  generateZtarknetWallet,
  isWalletDeployed,
  loadZtarknetWallet,
  saveZtarknetWallet,
  waitForWalletDeployment,
  ZtarknetWallet,
} from '../../services/walletService';
import { NETWORK } from '../../config/contracts';

interface ProvisionModalProps {
  isOpen: boolean;
  ownerAddress?: string | null;
  onClose: () => void;
  onWalletReady: (account: Account) => void;
}

type ProvisionState =
  | 'idle'
  | 'generating'
  | 'awaiting_funding'
  | 'deploying'
  | 'ready'
  | 'error';

export function ZtarknetProvisionModal({
  isOpen,
  ownerAddress,
  onClose,
  onWalletReady,
}: ProvisionModalProps) {
  const [wallet, setWallet] = useState<ZtarknetWallet | null>(null);
  const [state, setState] = useState<ProvisionState>('idle');
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const steps = useMemo(
    () => [
      { id: 'generating', label: 'Generating private Ztarknet wallet' },
      { id: 'awaiting_funding', label: 'Fund wallet & deploy on Ztarknet' },
      { id: 'ready', label: 'Wallet ready for Circuit' },
    ],
    []
  );

  useEffect(() => {
    if (!isOpen || !ownerAddress) return;

    let cancelled = false;

    const startProvision = async () => {
      try {
        setErrorMessage(null);
        setTxHash(null);
        setState('generating');

        const existing = loadZtarknetWallet(ownerAddress);
        const walletToUse = existing ?? generateZtarknetWallet(ownerAddress);
        setWallet(walletToUse);

        if (existing?.deployed) {
          finalize(existing);
          return;
        }

        const deployedAlready = await isWalletDeployed(walletToUse.address);
        if (cancelled) return;

        if (deployedAlready) {
          finalize({ ...walletToUse, deployed: true });
          return;
        }

        setState('awaiting_funding');
      } catch (error: any) {
        if (cancelled) return;
        console.error('Provisioning error:', error);
        setState('error');
        setErrorMessage(error.message || 'Failed to provision wallet. Please try again.');
      }
    };

    startProvision();

    return () => {
      cancelled = true;
    };
  }, [isOpen, ownerAddress, onWalletReady]);

  const finalize = (walletData: ZtarknetWallet) => {
    saveZtarknetWallet({ ...walletData, deployed: true }, ownerAddress);
    const account = createZtarknetAccount({ ...walletData, deployed: true });
    onWalletReady(account);
    setState('ready');
    toast.success('Ztarknet wallet is ready for trading');
  };

  const handleDeploy = async () => {
    if (!wallet || !ownerAddress) return;
    setState('deploying');
    setErrorMessage(null);
    setAttempt(0);
    try {
      const deployResult = await deployZtarknetWallet(wallet);

      if (deployResult.alreadyDeployed) {
        finalize({ ...wallet, deployed: true });
        return;
      }

      if (deployResult.transaction_hash) {
        setTxHash(deployResult.transaction_hash);
      }

      const deployed = await waitForWalletDeployment(wallet, {
        ownerAddress,
        onTick: (tryCount) => setAttempt(tryCount),
      });

      if (!deployed) {
        throw new Error(
          'Deployment is taking longer than expected. Please keep this window open and retry.'
        );
      }

      finalize({ ...wallet, deployed: true });
    } catch (error: any) {
      console.error('Deploy error:', error);
      setState('error');
      setErrorMessage(
        error.message ||
          'Failed to deploy wallet. Confirm the address is funded and try again.'
      );
    }
  };

  const handleCopyAddress = async () => {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    toast.success('Address copied');
  };

  const handleCheckStatus = async () => {
    if (!wallet) return;
    setIsChecking(true);
    try {
      const deployed = await isWalletDeployed(wallet.address);
      if (deployed) {
        finalize({ ...wallet, deployed: true });
      } else {
        toast.info('Wallet not deployed yet. Fund it and try again.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Unable to check status right now.');
    } finally {
      setIsChecking(false);
    }
  };

  const renderIcon = (stepId: string) => {
    if (state === 'error' && stepId !== 'generating') {
      return <X className="w-4 h-4 text-red-400" />;
    }

    if (
      state === stepId ||
      (state === 'deploying' && stepId === 'awaiting_funding')
    ) {
      return <Loader2 className="w-4 h-4 text-[#50d2c1] animate-spin" />;
    }

    if (
      state === 'ready' ||
      (state === 'awaiting_funding' && stepId === 'generating') ||
      (state === 'deploying' && stepId === 'generating')
    ) {
      return <Check className="w-4 h-4 text-[#50d2c1]" />;
    }

    return <div className="w-4 h-4 rounded-full border border-white/20" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#101d24] border border-white/10 rounded-3xl shadow-2xl w-full max-w-3xl p-8 relative text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#50d2c1] via-[#2ab09a] to-[#0f1a1f] flex items-center justify-center shadow-lg">
              <Wallet className="text-[#0a1216]" size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-1">Create a Ztarknet Trading Wallet</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                This private wallet is pegged to your Argent address and stored locally. Fund it with faucet tokens, deploy it on Ztarknet, and start trading privately on Circuit.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-3 bg-white/5 rounded-2xl border border-white/10 p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/50">Steps</p>
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex gap-3 items-center">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70">
                      {idx + 1}
                    </div>
                    <div className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                      {renderIcon(step.id)}
                      <span className="text-sm">{step.label}</span>
                      {step.id === 'deploying' && state === 'deploying' && attempt > 0 && (
                        <span className="text-[11px] text-white/40 ml-auto">
                          attempt {attempt.toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {wallet && (
              <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Ztarknet address</p>
                  <div className="p-4 bg-[#0b1419] rounded-xl border border-white/10">
                    <code className="text-xs font-mono break-all text-white">{wallet.address}</code>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCopyAddress}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2 text-xs"
                  >
                    <Copy size={14} />
                    Copy address
                  </button>
                  <button
                    onClick={() =>
                      window.open(`https://faucet.ztarknet.cash/?address=${wallet.address}`, '_blank')
                    }
                    className="flex-1 py-2 rounded-xl bg-[#50d2c1]/20 text-[#50d2c1] hover:bg-[#50d2c1]/25 flex items-center justify-center gap-2 text-xs"
                  >
                    <ExternalLink size={14} />
                    Open faucet
                  </button>
                </div>
                {state === 'awaiting_funding' && (
                  <div className="text-[12px] text-white/70 space-y-1">
                    <p>1. Copy the wallet address above.</p>
                    <p>2. Fund it using the Ztarknet faucet (ETH/yUSD).</p>
                    <p>3. Return here and press Deploy Wallet once funded.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {state === 'deploying' && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#50d2c1]/30 border-t-[#50d2c1] rounded-full animate-spin" />
            <div>
              <p className="text-xs text-white/70">Deploying wallet on Ztarknet...</p>
              {txHash && (
                <a
                  href={`${NETWORK.EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#50d2c1] underline"
                >
                  View transaction
                </a>
              )}
            </div>
          </div>
        )}
        {state === 'error' && (
          <div className="p-3 rounded border border-red-400/40 bg-red-500/5 text-xs text-red-300 space-y-2">
            <div>{errorMessage}</div>
            <button
              onClick={() => setState(wallet?.deployed ? 'ready' : 'awaiting_funding')}
              className="text-[10px] text-white/70 underline flex items-center gap-1"
            >
              <RefreshCw size={10} />
              Try again
            </button>
          </div>
        )}

        {(state === 'awaiting_funding' || state === 'deploying') && wallet && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <button
              onClick={handleCheckStatus}
              disabled={isChecking || state === 'deploying'}
              className="py-2 rounded border border-white/20 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isChecking ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  Check Status
                </>
              )}
            </button>
            <button
              onClick={handleDeploy}
              disabled={state === 'deploying'}
              className="py-2 rounded bg-[#50d2c1] text-[#0f1a1f] text-xs font-semibold hover:bg-[#50d2c1]/90 disabled:opacity-50"
            >
              {state === 'deploying' ? 'Deploying...' : 'Deploy Wallet'}
            </button>
          </div>
        )}

        {state === 'ready' && (
          <button
            onClick={onClose}
            className="w-full mt-4 py-2 rounded bg-[#50d2c1] text-[#0f1a1f] text-xs font-medium"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}


