import { Connection, PublicKey } from "@solana/web3.js";
// @ts-ignore
import { delegateAccount, undelegateAccount } from "@magicblock-labs/ephemeral-rollups-sdk";

// MagicBlock Devnet Validator (US Region)
export const MAGIC_BLOCK_VALIDATOR = new PublicKey("MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd");

export class MagicBlockClient {
    connection: Connection;
    wallet: any;

    constructor(connection: Connection, wallet: any) {
        this.connection = connection;
        this.wallet = wallet;
    }

    async delegateVault(vaultPda: PublicKey) {
        if (!this.wallet) throw new Error("Wallet not connected");

        console.log("Delegating vault to MagicBlock TEE...");
        try {
            const tx = await delegateAccount(
                this.connection,
                vaultPda,
                MAGIC_BLOCK_VALIDATOR,
                this.wallet
            );
            console.log("Delegation successful:", tx);
            return tx;
        } catch (e) {
            console.error("Failed to delegate:", e);
            throw e;
        }
    }

    async undelegateVault(vaultPda: PublicKey) {
        if (!this.wallet) throw new Error("Wallet not connected");

        console.log("Undelegating vault from MagicBlock TEE...");
        try {
            const tx = await undelegateAccount(
                this.connection,
                vaultPda,
                MAGIC_BLOCK_VALIDATOR,
                this.wallet
            );
            console.log("Undelegation successful:", tx);
            return tx;
        } catch (e) {
            console.error("Failed to undelegate:", e);
            throw e;
        }
    }
}
