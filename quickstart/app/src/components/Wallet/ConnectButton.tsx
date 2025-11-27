import { useState, useEffect } from 'react';
import { connect, disconnect } from '@starknet-io/get-starknet';
import { Account } from 'starknet';
import { useTradingStore } from '../../stores/tradingStore';
import { Wallet, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { ZtarknetWalletModal } from './ZtarknetWalletModal';
import { loadZtarknetWallet, createZtarknetAccount, isWalletDeployed } from '../../services/walletService';

export function ConnectButton() {
  const {
    sepoliaAccount,
    ztarknetAccount,
    setSepoliaAccount,
    setZtarknetAccount,
    isSepoliaConnected,
    isZtarknetReady,
  } = useTradingStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showZtarknetModal, setShowZtarknetModal] = useState(false);

  useEffect(() => {
    // Load Ztarknet wallet from localStorage if exists
    const loadExistingZtarknetWallet = async () => {
      const saved = loadZtarknetWallet();
      if (saved) {
        try {
          const deployed = await isWalletDeployed(saved.address);
          if (deployed) {
            const account = createZtarknetAccount({ ...saved, deployed: true });
            setZtarknetAccount(account);
          } else {
            // Wallet exists but not deployed - user needs to deploy it
            // Don't auto-show modal here, let user click "Setup Wallet"
          }
        } catch (error) {
          console.error('Error loading Ztarknet wallet:', error);
        }
      }
    };

    loadExistingZtarknetWallet();

    // Check if Sepolia wallet is already connected
    const checkConnection = async () => {
      try {
        const starknet = await connect();
        if (starknet?.isConnected && starknet.account) {
          setSepoliaAccount(starknet.account);
        }
      } catch (error) {
        // Wallet not connected, that's fine
      }
    };

    checkConnection();
  }, [setSepoliaAccount, setZtarknetAccount]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const starknet = await connect();

      if (!starknet) {
        toast.error('No wallet found. Please install Argent or Braavos wallet.');
        return;
      }

      await starknet.enable();

      if (starknet.account) {
        setSepoliaAccount(starknet.account);
        toast.success('Sepolia wallet connected!');
        // Check if Ztarknet wallet already exists and load it silently
        const existing = loadZtarknetWallet();
        if (existing) {
          try {
            const deployed = await isWalletDeployed(existing.address);
            if (deployed) {
              const account = createZtarknetAccount({ ...existing, deployed: true });
              setZtarknetAccount(account);
            }
            // If not deployed, user can click "Setup Wallet" button later
          } catch (error) {
            console.error('Error checking wallet deployment:', error);
          }
        }
        // Don't auto-show modal - let user click "Setup Wallet" if needed
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setSepoliaAccount(null);
    setZtarknetAccount(null);
    toast.info('Wallets disconnected');
  };

  const handleZtarknetWalletReady = (account: Account) => {
    setZtarknetAccount(account);
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
              onClick={() => setShowZtarknetModal(true)}
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
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="px-3 py-1.5 bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-[#0f1a1f] rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
      <ZtarknetWalletModal
        isOpen={showZtarknetModal}
        onClose={() => {
          setShowZtarknetModal(false);
        }}
        onWalletReady={handleZtarknetWalletReady}
      />
    </>
  );
}

