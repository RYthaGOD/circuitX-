const anchor = require("@coral-xyz/anchor");
const { SystemProgram } = anchor.web3;
const { assert } = require("chai");
const { createMint, createAccount, mintTo, getAccount, TOKEN_PROGRAM_ID } = require("@solana/spl-token");

describe("perpl_anchor", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.PerplAnchor;
  const payer = provider.wallet.payer;

  const vault = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();

  let mint;
  let userTokenAccount;
  let vaultTokenAccount;

  let userVaultPda;
  let vaultAuthorityPda;

  it("Is initialized!", async () => {
    await program.methods
      .initialize()
      .accounts({
        vault: vault.publicKey,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([vault])
      .rpc();
  });

  it("Setup Tokens", async () => {
    // Airdrop to user
    const signature = await provider.connection.requestAirdrop(user.publicKey, 10000000000);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed"
    );

    // Create Mint
    mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );

    // User ATA
    userTokenAccount = await createAccount(
      provider.connection,
      payer,
      mint,
      user.publicKey
    );

    // Vault ATA (Owned by PDA)
    [vaultAuthorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_authority")],
      program.programId
    );

    vaultTokenAccount = await createAccount(
      provider.connection,
      payer,
      mint,
      vaultAuthorityPda
    );

    // Mint tokens to user
    await mintTo(
      provider.connection,
      payer,
      mint,
      userTokenAccount,
      payer,
      1000
    );
  });

  it("Deposits Funds", async () => {
    [userVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), user.publicKey.toBuffer()],
      program.programId
    );

    const amount = new anchor.BN(500);

    await program.methods
      .deposit(amount)
      .accounts({
        user: user.publicKey,
        userVaultState: userVaultPda,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .signers([user])
      .rpc();

    const vaultState = await program.account.userVault.fetch(userVaultPda);
    assert.ok(vaultState.collateralBalance.eq(amount));

    const tokenAccount = await getAccount(provider.connection, vaultTokenAccount);
    assert.equal(Number(tokenAccount.amount), 500);
  });

  it("Settle PnL (Private Match)", async () => {
    const pnl = new anchor.BN(100);

    await program.methods
      .settlePnl(pnl)
      .accounts({
        arciumAuthority: payer.publicKey,
        user: user.publicKey,
        userVaultState: userVaultPda,
      })
      .rpc();

    const vaultState = await program.account.userVault.fetch(userVaultPda);
    assert.ok(vaultState.collateralBalance.eq(new anchor.BN(600))); // 500 + 100
  });
});
