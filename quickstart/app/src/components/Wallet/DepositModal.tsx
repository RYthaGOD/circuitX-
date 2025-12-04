import { useState, useEffect } from 'react';
import { Contract } from 'starknet';
import { CONTRACTS, NETWORK } from '../../config/contracts';
import { useTradingStore } from '../../stores/tradingStore';
import { toast } from 'sonner';
import { fetchYusdBalance, fetchVaultBalance } from '../../lib/balanceUtils';

const YUSD_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
];

const VAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'market_id', type: 'core::felt252' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
];

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposited: () => void;
  marketId: string;
}

type DepositState = 'idle' | 'approving' | 'depositing' | 'success' | 'error';

export function DepositModal({ 
  isOpen, 
  onClose, 
  onDeposited,
  marketId 
}: DepositModalProps) {
  const ztarknetAccount = useTradingStore((state) => state.ztarknetAccount);
  const isZtarknetReady = useTradingStore((state) => state.isZtarknetReady);
  const [status, setStatus] = useState<DepositState>('idle');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [yusdBalance, setYusdBalance] = useState<string>('0');
  const [vaultBalance, setVaultBalance] = useState<string>('0');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Fetch balances when modal opens
  useEffect(() => {
    if (isOpen && ztarknetAccount) {
      const fetchBalances = async () => {
        try {
          const yusd = await fetchYusdBalance(ztarknetAccount.address);
          setYusdBalance(yusd);
          
          const vault = await fetchVaultBalance(ztarknetAccount.address, marketId);
          setVaultBalance(vault);
        } catch (error) {
          console.error('Error fetching balances:', error);
        }
      };
      fetchBalances();
    }
  }, [isOpen, ztarknetAccount, marketId]);

  if (!isOpen) return null;

  const formatBalance = (balance: string): string => {
    if (!balance || balance === '0') return '0.00';
    return (Number(balance) / 1e18).toFixed(2);
  };

  const handleDeposit = async () => {
    if (!ztarknetAccount || !isZtarknetReady) {
      setStatus('error');
      setMessage('Please finish setting up your Ztarknet wallet first.');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatus('error');
      setMessage('Please enter a valid amount.');
      return;
    }

    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    const yusdBalanceBigInt = BigInt(yusdBalance);

    if (amountWei > yusdBalanceBigInt) {
      setStatus('error');
      setMessage('Insufficient yUSD balance.');
      return;
    }

    try {
      // Step 1: Check current allowance and approve if needed
      setStatus('approving');
      setMessage('Checking allowance...');
      setTxHash(null);

      const yusdContract = new Contract({
        abi: YUSD_ABI,
        address: CONTRACTS.YUSD_TOKEN,
        providerOrAccount: ztarknetAccount,
      });

      // Check current allowance
      let allowanceBigInt = BigInt(0);
      try {
        const currentAllowance = await yusdContract.allowance(
          ztarknetAccount.address,
          CONTRACTS.COLLATERAL_VAULT
        );
        
        // Handle u256 response (can be object with low/high or direct bigint)
        if (currentAllowance !== undefined && currentAllowance !== null) {
          if (typeof currentAllowance === 'object' && 'low' in currentAllowance) {
            allowanceBigInt = BigInt(currentAllowance.low);
            // If high part exists and is non-zero, we'd need to handle it, but for most cases low is enough
            if ('high' in currentAllowance && currentAllowance.high !== 0n) {
              console.warn('Allowance has high part:', currentAllowance.high);
            }
          } else {
            allowanceBigInt = BigInt(currentAllowance);
          }
        }
        console.log('Current allowance:', allowanceBigInt.toString(), 'Required:', amountWei.toString());
      } catch (error) {
        console.warn('Error checking allowance, will approve anyway:', error);
        allowanceBigInt = BigInt(0);
      }

      // Only approve if current allowance is insufficient
      // Add a small buffer (1% more) to account for any rounding issues
      const requiredAmount = amountWei + (amountWei / 100n);
      
      if (allowanceBigInt < requiredAmount) {
        setMessage('Approving tokens...');
        
        // Approve a much larger amount (100x the deposit amount) to avoid repeated approvals
        // This is safe because approval can be revoked or reduced later
        const approveAmount = amountWei * 100n;
        
        console.log('Approving amount:', approveAmount.toString());
        
        const approveTx = await yusdContract.approve(CONTRACTS.COLLATERAL_VAULT, {
          low: approveAmount,
          high: 0n,
        });

        setMessage('Waiting for approval confirmation...');
        await ztarknetAccount.waitForTransaction(approveTx.transaction_hash);
        
        // Wait longer for state to update (5 seconds)
        setMessage('Waiting for state update...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Double-check allowance after approval (but don't fail if check fails - proceed to deposit)
        try {
          const newAllowance = await yusdContract.allowance(
            ztarknetAccount.address,
            CONTRACTS.COLLATERAL_VAULT
          );
          let newAllowanceBigInt = BigInt(0);
          if (newAllowance !== undefined && newAllowance !== null) {
            if (typeof newAllowance === 'object' && 'low' in newAllowance) {
              newAllowanceBigInt = BigInt(newAllowance.low);
            } else {
              newAllowanceBigInt = BigInt(newAllowance);
            }
          }
          console.log('New allowance after approval:', newAllowanceBigInt.toString());
          
          if (newAllowanceBigInt < requiredAmount) {
            console.warn('Allowance check shows insufficient, but proceeding to deposit anyway. State may not have updated yet.');
            // Don't throw - proceed to deposit. If allowance is really insufficient, deposit will fail with a clear error.
          } else {
            console.log('✅ Allowance verified successfully');
          }
        } catch (error: any) {
          console.warn('Error verifying allowance (proceeding anyway):', error);
          // Continue to deposit - if allowance is insufficient, deposit will fail with LOW_ALLOW error
        }
      } else {
        setMessage('Sufficient allowance found');
        console.log('Using existing allowance:', allowanceBigInt.toString());
      }

      // Step 2: Deposit to vault
      setStatus('depositing');
      setMessage('Depositing to vault...');

      const vaultContract = new Contract({
        abi: VAULT_ABI,
        address: CONTRACTS.COLLATERAL_VAULT,
        providerOrAccount: ztarknetAccount,
      });

      // PERMANENT FIX: Use normalizer to ensure exact format consistency
      // This prevents INSUFFICIENT_BALANCE errors by ensuring the same storage key is used
      const { normalizeMarketId } = await import('../../lib/marketIdNormalizer');
      const marketIdFelt = normalizeMarketId(marketId);
      
      console.log('💰 Deposit market_id (normalized):', {
        marketId,
        marketIdFelt,
        note: 'Using normalizer to ensure exact format consistency',
      });
      
      const depositTx = await vaultContract.deposit(marketIdFelt, {
        low: amountWei,
        high: 0n,
      });

      setTxHash(depositTx.transaction_hash);
      setMessage('Waiting for deposit confirmation...');

      await ztarknetAccount.waitForTransaction(depositTx.transaction_hash);

      setStatus('success');
      setMessage('Deposit successful!');
      
      // Refresh balances
      const newYusd = await fetchYusdBalance(ztarknetAccount.address);
      const newVault = await fetchVaultBalance(ztarknetAccount.address, marketId);
      setYusdBalance(newYusd);
      setVaultBalance(newVault);
      
      // Show success notification
      toast.success('Deposit successful!', {
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`${NETWORK.EXPLORER_URL}/tx/${depositTx.transaction_hash}`, '_blank'),
        },
      });
      
      onDeposited();
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setMessage('');
        setAmount('');
        setTxHash(null);
      }, 1500);
    } catch (error: any) {
      console.error('Deposit error:', error);
      setStatus('error');
      setMessage(error?.message || 'Failed to deposit. Please try again.');
      toast.error('Deposit failed');
    }
  };

  const handleMax = () => {
    if (yusdBalance && yusdBalance !== '0') {
      const maxAmount = (Number(yusdBalance) / 1e18).toString();
      setAmount(maxAmount);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[10000]" 
      style={{ padding: '20px' }}
    >
      <div 
        style={{ 
          backgroundColor: '#0c191e', 
          color: 'white', 
          borderRadius: '24px', 
          border: '1px solid rgba(255,255,255,0.1)', 
          width: '100%', 
          maxWidth: '450px', 
          padding: '40px', 
          position: 'relative', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)' 
        }}
      >
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '16px', 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '20px', 
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 150ms ease' 
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
        >
          ✕
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
            Deposit to Vault
          </h2>

          {/* Balance Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)'
            }}>
              <span>Wallet Balance:</span>
              <span>{formatBalance(yusdBalance)} yUSD</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)'
            }}>
              <span>Vault Balance:</span>
              <span>{formatBalance(vaultBalance)} yUSD</span>
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
              Amount (yUSD)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={status === 'approving' || status === 'depositing'}
                style={{
                  width: '100%',
                  padding: '14px 80px 14px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(80,210,193,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button
                type="button"
                onClick={handleMax}
                disabled={status === 'approving' || status === 'depositing' || yusdBalance === '0'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(80,210,193,0.2)',
                  color: '#50d2c1',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: (status === 'approving' || status === 'depositing' || yusdBalance === '0') ? 'not-allowed' : 'pointer',
                  opacity: (status === 'approving' || status === 'depositing' || yusdBalance === '0') ? 0.5 : 1,
                }}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div 
              style={{ 
                borderRadius: '12px', 
                border: status === 'error' 
                  ? '1px solid rgba(248,113,113,0.4)' 
                  : status === 'success' 
                  ? '1px solid rgba(80,210,193,0.4)' 
                  : '1px solid rgba(255,255,255,0.12)', 
                backgroundColor: status === 'error' 
                  ? 'rgba(248,113,113,0.1)' 
                  : status === 'success' 
                  ? 'rgba(80,210,193,0.1)' 
                  : 'rgba(255,255,255,0.05)', 
                padding: '12px', 
                fontSize: '13px', 
                color: status === 'error' 
                  ? '#fecaca' 
                  : status === 'success' 
                  ? '#50d2c1' 
                  : 'rgba(255,255,255,0.8)',
                textAlign: 'center'
              }}
            >
              {message}
            </div>
          )}

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            disabled={status === 'approving' || status === 'depositing' || !isZtarknetReady || !amount || parseFloat(amount) <= 0}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: '14px',
              backgroundColor: '#50d2c1',
              color: '#0f1a1f',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              cursor: (status === 'approving' || status === 'depositing' || !isZtarknetReady || !amount || parseFloat(amount) <= 0) ? 'not-allowed' : 'pointer',
              opacity: (status === 'approving' || status === 'depositing' || !isZtarknetReady || !amount || parseFloat(amount) <= 0) ? 0.5 : 1,
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (status !== 'approving' && status !== 'depositing' && isZtarknetReady && amount && parseFloat(amount) > 0) {
                e.currentTarget.style.backgroundColor = '#45c0b0';
              }
            }}
            onMouseLeave={(e) => {
              if (status !== 'approving' && status !== 'depositing' && isZtarknetReady && amount && parseFloat(amount) > 0) {
                e.currentTarget.style.backgroundColor = '#50d2c1';
              }
            }}
          >
            {status === 'approving' ? 'Approving...' : status === 'depositing' ? 'Depositing...' : 'Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}

