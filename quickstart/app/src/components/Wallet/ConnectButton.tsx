import { useState, useEffect } from 'react';
import { connect, disconnect } from '@starknet-io/get-starknet';
import { Account } from 'starknet';
import { useTradingStore } from '../../stores/tradingStore';
// import { Wallet, LogOut } from 'lucide-react'; // Unused
import { toast } from 'sonner';
import { ZtarknetWalletModal } from './ZtarknetWalletModal';
import { ZtarknetProvisionModal } from './ZtarknetProvisionModal';
import {
  loadZtarknetWallet,
  createZtarknetAccount,
  isWalletDeployed,
} from '../../services/walletService';
import { fetchYusdBalance } from '../../lib/balanceUtils';

export function ConnectButton() {
  const {
    sepoliaAccount,
    ztarknetAccount,
    setSepoliaAccount,
    setZtarknetAccount,
    isSepoliaConnected,
    isZtarknetReady,
    setAvailableBalance,
  } = useTradingStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showZtarknetModal, setShowZtarknetModal] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionOwner, setProvisionOwner] = useState<string | null>(null);

  useEffect(() => {
    const syncWallet = async () => {
      if (!sepoliaAccount) return;
      const saved = loadZtarknetWallet(sepoliaAccount.address);
      if (!saved) return;
      try {
        const deployed = saved.deployed
          ? true
          : await isWalletDeployed(saved.address);
        if (deployed) {
          const account = createZtarknetAccount({ ...saved, deployed: true });
          setZtarknetAccount(account);
          // Fetch balance when wallet is loaded
          const balance = await fetchYusdBalance(account);
          setAvailableBalance(balance);
        }
      } catch (error) {
        console.error('Error loading Ztarknet wallet:', error);
      }
    };

    syncWallet();
  }, [sepoliaAccount, setZtarknetAccount, setAvailableBalance]);

  // Fetch balance when ztarknetAccount changes
  useEffect(() => {
    const updateBalance = async () => {
      if (ztarknetAccount && isZtarknetReady) {
        const balance = await fetchYusdBalance(ztarknetAccount);
        setAvailableBalance(balance);
      } else {
        setAvailableBalance('0');
      }
    };
    updateBalance();
  }, [ztarknetAccount, isZtarknetReady, setAvailableBalance]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const starknet = await connect({
        modalMode: 'alwaysAsk',
        modalTheme: 'dark',
      });

      if (!starknet) {
        toast.error('No wallet found. Please install Argent or Braavos wallet.');
        return;
      }

      // Connect to wallet - check if account is available
      if (starknet && 'account' in starknet && starknet.account) {
        const account = starknet.account as Account;
        const ownerAddress = account.address;
        setSepoliaAccount(account);
        toast.success('Sepolia wallet connected!');

        const existing = loadZtarknetWallet(ownerAddress);
        if (existing && existing.deployed) {
          const account = createZtarknetAccount(existing);
          setZtarknetAccount(account);
          // Fetch balance when wallet is connected
          const balance = await fetchYusdBalance(account);
          setAvailableBalance(balance);
        } else if (existing) {
          try {
            const deployed = await isWalletDeployed(existing.address);
            if (deployed) {
              const account = createZtarknetAccount({ ...existing, deployed: true });
              setZtarknetAccount(account);
              // Fetch balance when wallet is connected
              const balance = await fetchYusdBalance(account);
              setAvailableBalance(balance);
            } else {
              setProvisionOwner(ownerAddress);
              setShowProvisionModal(true);
            }
          } catch (error) {
            console.error('Error checking wallet deployment:', error);
            setProvisionOwner(ownerAddress);
            setShowProvisionModal(true);
          }
        } else {
          setProvisionOwner(ownerAddress);
          setShowProvisionModal(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDisconnect = async () => {
    await disconnect();
    setSepoliaAccount(null);
    setZtarknetAccount(null);
    setAvailableBalance('0');
    toast.info('Wallets disconnected');
  };

  const handleZtarknetWalletReady = async (account: Account) => {
    setZtarknetAccount(account);
    setShowProvisionModal(false);
    setShowZtarknetModal(false);
    // Fetch balance when wallet is ready
    const balance = await fetchYusdBalance(account);
    setAvailableBalance(balance);
    toast.success('Ztarknet wallet ready for trading!');
  };

  if (isSepoliaConnected && sepoliaAccount) {
    return (
      <>
        <div className="flex items-center gap-2">
          {isZtarknetReady && ztarknetAccount ? (
            <div className="px-3 py-1.5 bg-[#50d2c1]/10 border border-[#50d2c1]/30 rounded text-xs">
              <div className="text-[#50d2c1] font-mono">
                {ztarknetAccount.address.slice(0, 6)}...{ztarknetAccount.address.slice(-4)}
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setProvisionOwner(sepoliaAccount?.address ?? null);
                setShowProvisionModal(true);
              }}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-white/70 hover:text-white transition-colors"
            >
              Setup Wallet
            </button>
          )}
        </div>
        <ZtarknetWalletModal
          isOpen={showZtarknetModal}
          onClose={() => {
            setShowZtarknetModal(false);
          }}
          onWalletReady={handleZtarknetWalletReady}
          ownerAddress={sepoliaAccount?.address}
        />
        <ZtarknetProvisionModal
          isOpen={showProvisionModal}
          ownerAddress={provisionOwner ?? sepoliaAccount?.address}
          onClose={() => setShowProvisionModal(false)}
          onWalletReady={handleZtarknetWalletReady}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="px-3 py-1.2 bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-[#000000] rounded-xl text-xs font-extralight transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
      <ZtarknetWalletModal
        isOpen={showZtarknetModal}
        onClose={() => {
          setShowZtarknetModal(false);
        }}
        onWalletReady={handleZtarknetWalletReady}
        ownerAddress={sepoliaAccount?.address}
      />
      <ZtarknetProvisionModal
        isOpen={showProvisionModal}
        ownerAddress={provisionOwner}
        onClose={() => setShowProvisionModal(false)}
        onWalletReady={handleZtarknetWalletReady}
      />
    </>
  );
}

