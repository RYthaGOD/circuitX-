import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { MagicBlockClient } from '../lib/magicblock_client';

export const useMagicBlock = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [isDelegated, setIsDelegated] = useState(false);
    const [loading, setLoading] = useState(false);

    const delegate = useCallback(async (vaultPda: PublicKey) => {
        if (!wallet.publicKey || !wallet.signTransaction) return;
        setLoading(true);
        try {
            const client = new MagicBlockClient(connection, wallet);
            await client.delegateVault(vaultPda);
            setIsDelegated(true);
            alert("Success! Your Vault is now Private (Delegated to TEE).");
        } catch (error) {
            console.error(error);
            alert("Delegation Failed: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    }, [connection, wallet]);

    const undelegate = useCallback(async (vaultPda: PublicKey) => {
        if (!wallet.publicKey || !wallet.signTransaction) return;
        setLoading(true);
        try {
            const client = new MagicBlockClient(connection, wallet);
            await client.undelegateVault(vaultPda);
            setIsDelegated(false);
            alert("Success! Your Vault is Public again (Undelegated).");
        } catch (error) {
            console.error(error);
            alert("Undelegation Failed: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    }, [connection, wallet]);

    return {
        isDelegated,
        delegate,
        undelegate,
        loading
    };
};
