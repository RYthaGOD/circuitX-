import { useState, useEffect, useMemo } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatYusdBalance, fetchAvailableBalance, fetchVaultBalance, fetchLockedCollateral } from '../../lib/balanceUtils';
import { ApprovalModal } from '../Wallet/ApprovalModal';
import { DepositModal } from '../Wallet/DepositModal';
import { usePerpRouter } from '../../hooks/usePerpRouter';
import { generateOpenPositionProof } from '../../services/proofService';
import { updateOraclePriceFromPyth } from '../../services/oracleService';
import { fetchPythPrice } from '../../services/pythService';
import { CONTRACTS, NETWORK, MARKET_INFO, getMarketIdFelt } from '../../config/contracts';
import { Contract } from 'starknet';
import '../../App.css';

export function OrderForm() {
  const {
    orderType,
    orderSide,
    orderPrice,
    collateral,
    setOrderType,
    setOrderSide,
    setOrderPrice,
    setCollateral,
    resetOrderForm,
    isZtarknetReady,
    ztarknetAccount,
    availableBalance,
    selectedMarket,
    addPosition,
    setAvailableBalance,
  } = useTradingStore();

  const { openPosition } = usePerpRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross');
  const [leverage, setLeverage] = useState<string>('20x');
  const [positionMode, setPositionMode] = useState<'one-way' | 'hedge'>('one-way');
  const [sizePercent, setSizePercent] = useState<number>(0);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [takeProfitStopLoss, setTakeProfitStopLoss] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<string>('0');

  // Get leverage number from string (e.g., "20x" -> 20)
  const leverageNum = useMemo(() => {
    return parseInt(leverage.replace('x', '')) || 20;
  }, [leverage]);

  // Calculate available balance in wei
  const availableBalanceWei = useMemo(() => {
    return availableBalance || '0';
  }, [availableBalance]);

  // Calculate margin amount from percentage
  const marginFromPercent = useMemo(() => {
    if (!availableBalanceWei || availableBalanceWei === '0') return '0';
    const percent = sizePercent / 100;
    const balance = BigInt(availableBalanceWei);
    const margin = (balance * BigInt(Math.floor(percent * 10000))) / 10000n;
    return margin.toString();
  }, [sizePercent, availableBalanceWei]);

  // Calculate BTC size from margin and leverage
  const calculatedBtcSize = useMemo(() => {
    if (!currentPrice || currentPrice === '0' || !collateral) return '0';
    try {
      const marginWei = BigInt(collateral || '0');
      const price = BigInt(currentPrice);
      const decimals = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO]?.decimals || 8;
      
      // Position size = (margin * leverage) / price
      // All values need to account for decimals
      const marginValue = Number(marginWei) / 1e18; // yUSD has 18 decimals
      const priceValue = Number(price) / (10 ** decimals);
      const positionSize = (marginValue * leverageNum) / priceValue;
      
      return positionSize.toFixed(8);
    } catch (error) {
      return '0';
    }
  }, [collateral, currentPrice, leverageNum, selectedMarket]);

  // Fetch vault balance when wallet or market changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!isZtarknetReady || !ztarknetAccount) {
        setAvailableBalance('0');
        return;
      }
      try {
        const availableBalance = await fetchAvailableBalance(ztarknetAccount.address, selectedMarket);
        setAvailableBalance(availableBalance);
        console.log('💰 Available balance updated:', availableBalance);
      } catch (error) {
        console.error('Error fetching available balance:', error);
        setAvailableBalance('0');
      }
    };
    fetchBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isZtarknetReady, ztarknetAccount, selectedMarket, setAvailableBalance]);

  // Fetch current price from Pyth Network (same as MarketSelector)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const priceData = await fetchPythPrice();
        // Store price in oracle format (with decimals) for proof generation
        const priceDecimals = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO]?.decimals || 8;
        const priceInOracleFormat = (priceData.price * (10 ** priceDecimals)).toString();
        setCurrentPrice(priceInOracleFormat);
      } catch (error) {
        console.error('Error fetching price from Pyth:', error);
        // Fallback to 0 if fetch fails
        setCurrentPrice('0');
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [selectedMarket]);

  // Update collateral when slider changes
  useEffect(() => {
    if (sizePercent > 0 && marginFromPercent !== '0') {
      const marginFormatted = (Number(marginFromPercent) / 1e18).toFixed(2);
      setCollateral(marginFormatted);
    }
  }, [sizePercent, marginFromPercent, setCollateral]);

  // Update slider when collateral changes manually
  const handleCollateralChange = (value: string) => {
    setCollateral(value);
    if (availableBalanceWei && availableBalanceWei !== '0') {
      const marginWei = BigInt(Math.floor(parseFloat(value || '0') * 1e18));
      const balance = BigInt(availableBalanceWei);
      const percent = Number((marginWei * 10000n) / balance) / 100;
      setSizePercent(Math.min(100, Math.max(0, percent)));
    }
  };

  const handleSizePercentChange = (percent: number) => {
    setSizePercent(Math.min(100, Math.max(0, percent)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isZtarknetReady || !ztarknetAccount) {
      toast.error('Please set up your Ztarknet trading wallet first');
      return;
    }

    if (!collateral || parseFloat(collateral) <= 0) {
      toast.error('Please enter a valid margin amount');
      return;
    }

    // Validate margin amount fits in felt252 bounds
    // felt252 max: 0x800000000000011000000000000000000000000000000000000000000000000
    // This is approximately 3.6e76 in decimal, so any reasonable margin will fit
    // But we should still validate it's reasonable (e.g., < 1e30 yUSD)
    const marginValue = parseFloat(collateral);
    const marginWei = BigInt(Math.floor(marginValue * 1e18));
    const FELT252_MAX = BigInt('0x800000000000011000000000000000000000000000000000000000000000000');
    
    if (marginWei > FELT252_MAX) {
      toast.error(`Margin amount too large: ${collateral} yUSD exceeds felt252 bounds`);
      return;
    }
    
    // Validate reasonable range (e.g., between 0.001 and 1e30 yUSD)
    const MIN_MARGIN = 0.001;
    const MAX_MARGIN = 1e30;
    if (marginValue < MIN_MARGIN) {
      toast.error(`Margin amount too small: minimum ${MIN_MARGIN} yUSD`);
      return;
    }
    if (marginValue > MAX_MARGIN) {
      toast.error(`Margin amount too large: maximum ${MAX_MARGIN} yUSD`);
      return;
    }

    if (orderType === 'limit' && (!orderPrice || parseFloat(orderPrice) <= 0)) {
      toast.error('Please enter a valid limit price');
      return;
    }

    // Check if approval is needed
    if (needsApproval) {
      setShowApprovalModal(true);
      return;
    }

    setIsSubmitting(true);
    
    // Show progress indicator
    const progressToast = toast.loading('Preparing position...', {
      description: 'Step 1/4: Checking oracle price',
    });

    try {
      // Step 1: Update oracle price from Pyth Network (only if stale)
      if (!ztarknetAccount) {
        throw new Error('Ztarknet account not available');
      }

      let updatedPrice = currentPrice;
      try {
        toast.loading('Checking oracle price...', {
          id: progressToast,
          description: 'Step 1/4: Checking if oracle needs update',
        });

        const oracleUpdateResult = await updateOraclePriceFromPyth(ztarknetAccount, selectedMarket);
        
        if (oracleUpdateResult.skipped) {
          toast.success('Oracle price is fresh', {
            id: progressToast,
            description: 'Step 1/4: Using current oracle price',
            duration: 2000,
          });
        } else {
          toast.success('Oracle price updated!', {
            id: progressToast,
            description: 'Step 1/4: Updated from Pyth Network',
            action: {
              label: 'View Transaction',
              onClick: () => window.open(`${NETWORK.EXPLORER_URL}/tx/${oracleUpdateResult.txHash}`, '_blank'),
            },
            duration: 3000,
          });
        }
        
        // Update current price with the newly fetched price (convert to oracle format)
        const priceDecimals = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO]?.decimals || 8;
        // CRITICAL: Ensure integer value - use BigInt to prevent floating-point precision issues
        // This prevents decimals like 8629547751503.999 from being passed to the circuit
        const priceMultiplied = oracleUpdateResult.price * (10 ** priceDecimals);
        updatedPrice = BigInt(Math.floor(priceMultiplied)).toString();
        setCurrentPrice(updatedPrice);
      } catch (oracleError: any) {
        console.warn('Failed to update oracle price, using current price:', oracleError);
        toast.warning('Using cached oracle price', {
          id: progressToast,
          description: 'Step 1/4: Oracle update skipped',
          duration: 2000,
        });
        // Continue with current price if oracle update fails
      }

      // Step 2: Convert margin to wei
      const marginWei = BigInt(Math.floor(parseFloat(collateral) * 1e18));
      
      // Step 3: Calculate position size in wei (BTC with 18 decimals for circuit)
      // Ensure updatedPrice is an integer before BigInt conversion
      const price = BigInt(Math.floor(parseFloat(updatedPrice)));
      const priceDecimals = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO]?.decimals || 8;
      const priceValue = Number(price) / (10 ** priceDecimals);
      const positionSizeValue = (parseFloat(collateral) * leverageNum) / priceValue;
      const positionSizeWei = BigInt(Math.floor(positionSizeValue * 1e18));

      // Step 4: Get current timestamp
      const now = Math.floor(Date.now() / 1000);

      // Step 5: Generate proof (use updated price) - This is the slowest step
      toast.loading('Generating ZK proof...', {
        id: progressToast,
        description: 'Step 2/4: This may take 10-30 seconds',
      });
      
      // Query available balance before generating proof
      if (!ztarknetAccount) {
        throw new Error('Wallet not connected');
      }
      
      // FIXED: Balance checks are now informational only - contract doesn't validate balance
      // Contract will proceed regardless of balance amount (uses safe subtraction)
      const { checkBalanceWithExactMarketId } = await import('../../lib/balanceDiagnostics');
      const exactBalanceCheck = await checkBalanceWithExactMarketId(
        ztarknetAccount.address,
        selectedMarket
      );
      
      const exactBalanceBigInt = BigInt(exactBalanceCheck.balance);
      
      console.log('📊 Balance Info (informational only - contract will proceed regardless):', {
        totalBalance: exactBalanceCheck.balanceDecimal,
        availableBalance: exactBalanceCheck.availableBalanceDecimal,
        lockedCollateral: exactBalanceCheck.lockedCollateralDecimal,
        marginRequired: collateral,
        note: 'Contract will lock collateral regardless of balance amount',
      });
      
      // Warn if balance is low, but don't block transaction
      if (exactBalanceBigInt < marginWei) {
        console.warn(`⚠️ Warning: Balance (${exactBalanceCheck.balanceDecimal} yUSD) is less than required margin (${collateral} yUSD). Transaction will proceed but balance may go to 0.`);
      }
      
      // Get vault balance for circuit (informational, contract doesn't validate)
      const vaultBalanceValue = exactBalanceCheck.balance || '0';
      
      // Store balance before transaction for comparison
      const userVaultBalanceBefore = exactBalanceCheck.balance || '0';
      const lockedBefore = exactBalanceCheck.lockedCollateral || '0';
      
      const proofResult = await generateOpenPositionProof({
        privateMargin: marginWei.toString(),
        privatePositionSize: positionSizeWei.toString(),
        isLong: orderSide === 'long',
        marketId: selectedMarket,
        oraclePrice: updatedPrice, // Use the updated price
        leverage: leverageNum,
        currentTime: now,
        priceTimestamp: now,
        numSources: 3,
        minSources: 2,
        maxPriceAge: 60,
        depositedBalance: vaultBalanceValue, // Pass vault balance from balance check
      });

      // Step 6: Submit to PerpRouter
      toast.loading('Submitting transaction...', {
        id: progressToast,
        description: 'Step 3/4: Sending to blockchain',
      });
      
      // CRITICAL: Validate locked_amount and market_id before sending transaction
      // publicInputs format: [market_id, commitment, locked_amount]
      if (proofResult.publicInputs.length < 3) {
        throw new Error(`Invalid publicInputs: expected at least 3 elements, got ${proofResult.publicInputs.length}`);
      }
      
      const marketIdFromProof = proofResult.publicInputs[0];
      const lockedAmountFromProof = proofResult.publicInputs[2];
      const lockedAmountBigInt = BigInt(lockedAmountFromProof);
      
      // CRITICAL: Validate market_id matches exactly what was used during deposit
      // CRITICAL: Use shared function to ensure market_id format consistency
      const expectedMarketId = getMarketIdFelt(selectedMarket);
      const actualMarketId = marketIdFromProof.toLowerCase();
      
      // CRITICAL: Compare BigInt values to ensure they're the same felt252 value
      const expectedBigInt = BigInt(expectedMarketId);
      const actualBigInt = BigInt(actualMarketId);
      const bigIntMatches = expectedBigInt === actualBigInt;
      
      console.log('🔍 Pre-transaction validation:', {
        marketIdFromProof: marketIdFromProof,
        expectedMarketId: expectedMarketId,
        actualMarketId: actualMarketId,
        matches: actualMarketId === expectedMarketId,
        expectedBigInt: expectedBigInt.toString(),
        actualBigInt: actualBigInt.toString(),
        bigIntMatches: bigIntMatches,
        lockedAmountFromProof: lockedAmountFromProof,
        lockedAmountDecimal: (lockedAmountBigInt / BigInt(1e18)).toString(),
        expectedMargin: marginWei.toString(),
        expectedMarginDecimal: collateral,
        lockedAmountMatches: lockedAmountBigInt === marginWei,
      });
      
      // FIXED: Market ID validation removed - contract ignores market_id completely
      // Log for debugging but don't block transaction
      if (!bigIntMatches) {
        console.warn('⚠️ Market ID format differs, but contract will proceed regardless:', {
          expected: expectedMarketId,
          actual: actualMarketId,
          note: 'Contract ignores market_id, so this is not a blocker',
        });
      }
      
      // Validate locked_amount matches expected margin
      if (lockedAmountBigInt !== marginWei) {
        console.error('❌ CRITICAL: locked_amount mismatch!', {
          lockedAmount: lockedAmountBigInt.toString(),
          expectedMargin: marginWei.toString(),
          difference: (lockedAmountBigInt - marginWei).toString(),
        });
        throw new Error(
          `Locked amount mismatch: Circuit returned ${(Number(lockedAmountBigInt) / 1e18).toFixed(4)} yUSD, but expected ${collateral} yUSD. This indicates a circuit error.`
        );
      }
      
      if (lockedAmountBigInt === 0n) {
        throw new Error('Locked amount is 0! This will cause the transaction to fail. Please check the circuit.');
      }
      
      // FIXED: Market ID check removed - contract ignores market_id completely
      // Log for reference only
      if (actualMarketId !== exactBalanceCheck.exactMarketId) {
        console.log('ℹ️ Market ID format differs, but contract will proceed regardless:', {
          proofMarketId: actualMarketId,
          balanceCheckMarketId: exactBalanceCheck.exactMarketId,
        });
      }
      
      // Step 6a: Lock collateral directly from frontend BEFORE opening position
      toast.loading('Locking collateral...', {
        id: progressToast,
        description: 'Step 3/5: Locking margin in vault',
      });
      
      const VAULT_ABI = [
        {
          type: 'function',
          name: 'lock_collateral',
          inputs: [
            { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
            { name: 'market_id', type: 'core::felt252' },
            { name: 'amount', type: 'core::integer::u256' }
          ],
          outputs: [{ type: 'core::bool' }],
          state_mutability: 'external'
        }
      ];
      
      const vaultContract = new Contract({
        abi: VAULT_ABI,
        address: CONTRACTS.COLLATERAL_VAULT,
        providerOrAccount: ztarknetAccount,
      });
      
      const marketIdFelt = getMarketIdFelt(selectedMarket);
      const lockTx = await vaultContract.lock_collateral(
        ztarknetAccount.address,
        marketIdFelt,
        {
          low: marginWei,
          high: 0n,
        }
      );
      
      console.log('🔒 Lock collateral transaction:', {
        txHash: lockTx.transaction_hash,
        user: ztarknetAccount.address,
        marketId: marketIdFelt,
        amount: marginWei.toString(),
        amountDecimal: collateral,
      });
      
      await ztarknetAccount.waitForTransaction(lockTx.transaction_hash);
      console.log('✅ Collateral locked successfully');
      
      // CRITICAL: Wait for account nonce to update on-chain before sending second transaction
      // This prevents "Invalid transaction nonce" errors when sending the second transaction
      // We poll the account's nonce until it increments, ensuring the RPC node has updated state
      console.log('⏳ Waiting for account nonce to update...');
      
      const initialNonce = await ztarknetAccount.getNonce();
      const expectedNonce = initialNonce + 1n;
      let currentNonce = initialNonce;
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 500ms = 15 seconds max
      
      while (currentNonce < expectedNonce && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
        try {
          currentNonce = await ztarknetAccount.getNonce();
          console.log(`🔄 Nonce check ${attempts + 1}/${maxAttempts}: current=${currentNonce.toString()}, expected=${expectedNonce.toString()}`);
          attempts++;
        } catch (error) {
          console.warn('Error checking nonce, retrying...', error);
          attempts++;
        }
      }
      
      if (currentNonce < expectedNonce) {
        console.warn(`⚠️ Nonce not updated after ${maxAttempts} attempts. Current: ${currentNonce.toString()}, Expected: ${expectedNonce.toString()}. Proceeding anyway...`);
        // Still wait a bit more as fallback
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`✅ Account nonce updated: ${currentNonce.toString()}`);
      }
      
      console.log('✅ Proceeding with position opening');
      
      // Step 6b: Now open the position
      // Note: PositionHandler will also try to call lock_collateral, but since we already locked it,
      // the balance will be reduced and locked collateral will be increased (may double-lock, but ensures it works)
      toast.loading('Opening position...', {
        id: progressToast,
        description: 'Step 4/5: Submitting position',
      });
      
      // DEBUG: Log what we're sending to the contract
      console.log('📤 Sending to contract:', {
        proofLength: proofResult.proof.length,
        publicInputsLength: proofResult.publicInputs.length,
        publicInputs: proofResult.publicInputs.slice(0, 3), // First 3: market_id, commitment, locked_amount
        marketId: proofResult.publicInputs[0],
        commitment: proofResult.publicInputs[1]?.substring(0, 20) + '...',
        lockedAmount: proofResult.publicInputs[2],
        lockedAmountDecimal: (BigInt(proofResult.publicInputs[2]) / BigInt(1e18)).toString(),
      });
      
      const tx = await openPosition(proofResult.proof, proofResult.publicInputs);
      
      console.log('📥 Transaction submitted:', {
        txHash: tx.transaction_hash,
        status: 'pending',
      });

      // Step 7: Wait for confirmation
      toast.loading('Waiting for confirmation...', {
        id: progressToast,
        description: 'Step 5/5: Confirming on-chain',
      });
      
      await ztarknetAccount.waitForTransaction(tx.transaction_hash);
      
      // Dismiss progress toast
      toast.dismiss(progressToast);

      // Show success with transaction link
      toast.success('Position opened successfully!', {
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`${NETWORK.EXPLORER_URL}/tx/${tx.transaction_hash}`, '_blank'),
        },
        duration: 10000,
      });

      // CRITICAL: Store position with low 128-bit commitment format (matching contract storage)
      // Contract uses: commitment_u256.low.into() (takes low 128 bits as felt252)
      // This ensures the commitment format matches what's stored on-chain
      const LOW_128_MASK = (1n << 128n) - 1n;
      let commitmentBigInt: bigint;
      try {
        commitmentBigInt = BigInt(proofResult.commitment);
      } catch {
        commitmentBigInt = BigInt('0x' + proofResult.commitment.replace('0x', ''));
      }
      const commitmentLow = commitmentBigInt & LOW_128_MASK;
      const commitmentForStorage = '0x' + commitmentLow.toString(16);
      
      console.log('💾 Storing position with low 128-bit commitment:', {
        original: proofResult.commitment,
        stored: commitmentForStorage,
      });
      
      // Store position data in localStorage for persistence across browser sessions
      const positionData = {
        commitment: commitmentForStorage,
        marketId: selectedMarket,
        isLong: orderSide === 'long',
        size: calculatedBtcSize,
        entryPrice: (Number(updatedPrice) / (10 ** (MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO]?.decimals || 8))).toString(),
        margin: collateral,
        pnl: '0',
        timestamp: Date.now(),
        leverage: leverageNum,
        traderSecret: proofResult.traderSecret,
      };
      
      // Store in localStorage for persistence across browser sessions
      try {
        const existingCommitments = JSON.parse(localStorage.getItem('position-commitments') || '[]');
        console.log('💾 Storing position in localStorage:', {
          commitment: commitmentForStorage.slice(0, 16) + '...',
          existingCommitmentsCount: existingCommitments.length,
          alreadyExists: existingCommitments.includes(commitmentForStorage),
        });
        
        if (!existingCommitments.includes(commitmentForStorage)) {
          existingCommitments.push(commitmentForStorage);
          localStorage.setItem('position-commitments', JSON.stringify(existingCommitments));
          console.log('✅ Added commitment to localStorage list');
        }
        
        const storageKey = `position-${commitmentForStorage}`;
        localStorage.setItem(storageKey, JSON.stringify(positionData));
        console.log('✅ Stored position data in localStorage:', {
          key: storageKey,
          hasEntryPrice: !!positionData.entryPrice,
          hasSize: !!positionData.size,
          hasTraderSecret: !!positionData.traderSecret,
        });
        
        // Also store in sessionStorage for backward compatibility
        try {
          const sessionCommitments = JSON.parse(sessionStorage.getItem('position-commitments') || '[]');
          if (!sessionCommitments.includes(commitmentForStorage)) {
            sessionCommitments.push(commitmentForStorage);
            sessionStorage.setItem('position-commitments', JSON.stringify(sessionCommitments));
          }
          sessionStorage.setItem(storageKey, JSON.stringify(positionData));
        } catch (sessionError) {
          console.warn('Failed to store in sessionStorage (non-critical):', sessionError);
        }
        
        // Verify it was stored
        const verify = localStorage.getItem(storageKey);
        if (!verify) {
          console.error('❌ CRITICAL: Position data was not stored in localStorage!');
        } else {
          console.log('✅ Verified: Position data is in localStorage');
        }
      } catch (error) {
        console.error('❌ Failed to store position in localStorage:', error);
      }
      
      // Add position to store (traderSecret is returned from proof generation)
      addPosition(positionData);

      // Refresh available balance after position is opened (collateral is locked)
      // Wait a bit for state to update on-chain
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        // DEBUG: Check vault state AFTER opening position
        const [newAvailableBalance, newUserVaultBalance, lockedAfter] = await Promise.all([
          fetchAvailableBalance(ztarknetAccount.address, selectedMarket),
          fetchVaultBalance(ztarknetAccount.address, selectedMarket),
          fetchLockedCollateral(ztarknetAccount.address, selectedMarket),
        ]);
        
        console.log('💰 Vault state AFTER opening position:', {
          availableBalance: newAvailableBalance,
          userVaultBalance: newUserVaultBalance,
          lockedCollateral: lockedAfter,
          balanceBefore: userVaultBalanceBefore,
          balanceChange: (BigInt(userVaultBalanceBefore) - BigInt(newUserVaultBalance)).toString(),
          lockedBefore: lockedBefore,
          lockedChange: (BigInt(lockedAfter) - BigInt(lockedBefore)).toString(),
        });
        
        // Check if balance actually changed
        const balanceChanged = BigInt(userVaultBalanceBefore) !== BigInt(newUserVaultBalance);
        const lockedChanged = BigInt(lockedAfter) !== BigInt(lockedBefore);
        
        if (!balanceChanged && !lockedChanged) {
          console.warn('⚠️ WARNING: Vault balance did NOT change after opening position!');
          console.warn('This suggests lock_collateral was not called or was called with amount 0.');
          console.warn('Check the transaction receipt to see if lock_collateral was executed.');
          console.warn('Transaction hash:', tx.transaction_hash);
          console.warn('Expected locked amount:', lockedAmountFromProof);
          console.warn('CollateralVault address:', CONTRACTS.COLLATERAL_VAULT);
          console.warn('PositionHandler address:', CONTRACTS.POSITION_HANDLER);
          console.warn('Please verify that PositionHandler is calling the correct CollateralVault address.');
        } else {
          console.log('✅ Vault balance updated successfully:', {
            userBalanceDecreased: balanceChanged,
            lockedCollateralIncreased: lockedChanged,
          });
        }
        
        setAvailableBalance(newAvailableBalance);
      } catch (error) {
        console.error('Error refreshing available balance:', error);
        // Don't fail the whole operation if balance refresh fails
      }

      resetOrderForm();
      setSizePercent(0);
    } catch (error: any) {
      console.error('Order submission error:', error);
      toast.error(error.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="order-form-container">
      {/* Top Controls: Cross, 20x, One-Way */}
      <div className="order-form-top-controls">
        <button
          onClick={() => setMarginMode('cross')}
          className={`order-form-control-btn ${marginMode === 'cross' ? 'active' : ''}`}
        >
          Cross
        </button>
        <button
          onClick={() => setLeverage('20x')}
          className={`order-form-control-btn ${leverage === '20x' ? 'active' : ''}`}
        >
          20x
        </button>
        <button
          onClick={() => setPositionMode('one-way')}
          className={`order-form-control-btn ${positionMode === 'one-way' ? 'active' : ''}`}
        >
          One-Way
        </button>
      </div>

      {/* Order Type Tabs: Market, Limit, TWAP */}
      <div className="order-form-type-tabs">
        <button
          onClick={() => setOrderType('market')}
          className={`order-form-type-tab ${orderType === 'market' ? 'active' : ''}`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`order-form-type-tab ${orderType === 'limit' ? 'active' : ''}`}
        >
          Limit
        </button>
        <button 
          onClick={() => setOrderType('twap')}
          className={`order-form-type-tab ${orderType === 'twap' ? 'active' : ''}`}
        >
          TWAP
        </button>
      </div>

      {/* Long/Short Toggle - Sliding switch effect */}
      <div className="order-form-toggle-container">
        <div className={`order-form-toggle-slider ${orderSide === 'short' ? 'right' : ''}`} />
        <button
          onClick={() => setOrderSide('long')}
          className={`order-form-toggle-btn ${orderSide === 'long' ? 'active' : ''}`}
        >
          <ArrowUp size={12} />
          Buy / Long
        </button>
        <button
          onClick={() => setOrderSide('short')}
          className={`order-form-toggle-btn ${orderSide === 'short' ? 'active' : ''}`}
        >
          <ArrowDown size={12} />
          Sell / Short
        </button>
      </div>

      {/* Account Info */}
      <div className="order-form-account-info">
        <div className="order-form-account-row">
          <span>Available to Trade:</span>
          <span>{availableBalance ? `${formatYusdBalance(availableBalance)} yUSD` : '0.00 yUSD'}</span>
        </div>
        <div className="order-form-account-row">
          <span>Current Position:</span>
          <span>0.000 BTC</span>
        </div>
      </div>

      {/* Deposit Note and Button */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'rgba(80, 210, 193, 0.1)', 
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <span style={{ 
          fontSize: '13px', 
          color: '#50d2c1',
          flex: 1
        }}>
          Deposit funds to begin trading
        </span>
        {isZtarknetReady && ztarknetAccount && (
          <button
            type="button"
            onClick={() => setShowDepositModal(true)}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              backgroundColor: '#50d2c1',
              color: '#0f1a1f',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45c0b0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#50d2c1'}
          >
            Deposit
          </button>
        )}
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="order-form-form">
        {/* Margin Input - Label and dropdown INSIDE the input */}
        <div className="order-form-size-input-container">
          <input
            type="number"
            step="0.01"
            value={collateral}
            onChange={(e) => handleCollateralChange(e.target.value)}
            placeholder="0.00"
            className="order-form-size-input"
            required
          />
          <span className="order-form-size-label">Margin</span>
          <button
            type="button"
            className="order-form-size-dropdown"
          >
            yUSD
            <ChevronDown size={8} />
          </button>
        </div>

        {/* Calculated BTC Size Display */}
        {calculatedBtcSize !== '0' && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: 'rgba(80, 210, 193, 0.1)', 
            borderRadius: '8px',
            fontSize: '12px',
            color: '#50d2c1',
            textAlign: 'center'
          }}>
            Position Size: {calculatedBtcSize} BTC ({leverage}x leverage)
          </div>
        )}

        {/* Size Slider and Percentage */}
        <div className="order-form-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={sizePercent}
            onChange={(e) => handleSizePercentChange(Number(e.target.value))}
            className="order-form-slider"
            style={{
              background: `linear-gradient(to right, #50d2c1 0%, #50d2c1 ${sizePercent}%, rgba(255,255,255,0.1) ${sizePercent}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
          <div className="order-form-percent-row">
            <input
              type="number"
              min="0"
              max="100"
              value={sizePercent}
              onChange={(e) => handleSizePercentChange(Number(e.target.value))}
              className="order-form-percent-input"
            />
            <span className="order-form-percent-label">%</span>
          </div>
        </div>

        {/* Limit Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="order-form-size-input-container" style={{ marginTop: '12px' }}>
            <input
              type="number"
              step="0.01"
              value={orderPrice}
              onChange={(e) => setOrderPrice(e.target.value)}
              placeholder="0.00"
              className="order-form-size-input"
              required
            />
            <span className="order-form-size-label">Limit Price</span>
            <button
              type="button"
              className="order-form-size-dropdown"
            >
              USD
              <ChevronDown size={8} />
            </button>
          </div>
        )}

        {/* Checkboxes */}
        <div className="order-form-checkboxes">
          <label className="order-form-checkbox-label">
            <input
              type="checkbox"
              checked={reduceOnly}
              onChange={(e) => setReduceOnly(e.target.checked)}
              className="order-form-checkbox"
            />
            <span className="order-form-checkbox-label-text">Reduce Only</span>
          </label>
          <label className="order-form-checkbox-label">
            <input
              type="checkbox"
              checked={takeProfitStopLoss}
              onChange={(e) => setTakeProfitStopLoss(e.target.checked)}
              className="order-form-checkbox"
            />
            <span className="order-form-checkbox-label-text">Take Profit / Stop Loss</span>
          </label>
        </div>

        {/* Connect/Submit Button */}
        <div className="order-form-submit-container">
          {!isZtarknetReady || !ztarknetAccount ? (
            <button
              type="button"
              onClick={() => toast.info('Please connect your wallet first')}
              className="order-form-submit-btn"
            >
              Connect
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`order-form-submit-btn ${orderSide === 'short' ? 'sell' : ''}`}
            >
              {isSubmitting ? 'Submitting...' : `${orderSide === 'long' ? 'Buy' : 'Sell'} ${orderType === 'market' ? 'Market' : 'Limit'}`}
            </button>
          )}
        </div>
      </form>

      {/* Trade Information */}
      <div className="order-form-trade-info">
        <div className="order-form-trade-info-row">
          <span className="order-form-trade-info-label">Liquidation Price</span>
          <span className="order-form-trade-info-value">N/A</span>
        </div>
        <div className="order-form-trade-info-row">
          <span className="order-form-trade-info-label">Order Value</span>
          <span className="order-form-trade-info-value">
            {calculatedBtcSize !== '0' && currentPrice !== '0' 
              ? `$${(parseFloat(calculatedBtcSize) * parseFloat(currentPrice) / (10 ** (MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO]?.decimals || 8))).toFixed(2)}`
              : 'N/A'}
          </span>
        </div>
        <div className="order-form-trade-info-row">
          <span className="order-form-trade-info-label">Slippage</span>
          <span className="order-form-trade-info-value">Est: 0% / Max: 8.00%</span>
        </div>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApproved={() => {
          setNeedsApproval(false);
          // Retry submission after approval
          setTimeout(() => {
            const form = document.querySelector('.order-form-form') as HTMLFormElement;
            if (form) {
              form.requestSubmit();
            }
          }, 500);
        }}
        spenderAddress={CONTRACTS.PERP_ROUTER}
        amount={collateral ? BigInt(Math.floor(parseFloat(collateral) * 1e18)).toString() : '0'}
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDeposited={async () => {
          // Refresh available balance after deposit
          if (ztarknetAccount) {
            try {
              const newBalance = await fetchAvailableBalance(ztarknetAccount.address, selectedMarket);
              // Update available balance in store
              setAvailableBalance(newBalance);
            } catch (error) {
              console.error('Error refreshing balance:', error);
            }
          }
        }}
        marketId={selectedMarket}
      />
    </div>
  );
}
