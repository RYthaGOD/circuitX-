use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
// Use the ephemeral macro if available, likely exported as 'ephemeral' based on error log
use ephemeral_rollups_sdk::anchor::ephemeral;

declare_id!("zkNRFg6rNJGMqkAYxW1o5sdDSfxqskL1PDbJ4VZ4Zmk");

#[ephemeral]
#[program]
pub mod perpl_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        msg!("Perpl Vault Initialized");
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Transfer USDC from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update User Collateral State
        let user_vault = &mut ctx.accounts.user_vault_state;
        user_vault.collateral_balance += amount;
        
        msg!("Deposited {} USDC. New Balance: {}", amount, user_vault.collateral_balance);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_vault = &mut ctx.accounts.user_vault_state;
        require!(user_vault.collateral_balance >= amount, ErrorCode::InsufficientFunds);

        // Update State
        user_vault.collateral_balance -= amount;

        // Transfer USDC from Vault to User
        // Seeds for signing
        let seeds = &[
            b"vault_authority".as_ref(),
            &[ctx.bumps.vault_authority],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        msg!("Withdrawn {} USDC", amount);
        Ok(())
    }

    // RESTRICTED: Only callable by Authorized Operator (MagicBlock TEE)
    pub fn settle_pnl(ctx: Context<SettlePnl>, pnl: i64) -> Result<()> {
        let user_vault = &mut ctx.accounts.user_vault_state;
        
        if pnl > 0 {
            // User Won: Add to balance
            user_vault.collateral_balance += pnl.abs() as u64;
        } else {
            // User Lost: Deduct from balance
            let loss = pnl.abs() as u64;
            // Ensure we don't underflow (Liquidation logic should prevent this, but safety first)
            if user_vault.collateral_balance < loss {
                 user_vault.collateral_balance = 0;
                 // In a real sys, we might take remaining from Insurance Fund
            } else {
                user_vault.collateral_balance -= loss;
            }
        }
        
        msg!("Settled PnL: {}. New Balance: {}", pnl, user_vault.collateral_balance);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed, // Modified to allow init here for convenience
        payer = user,
        space = 8 + 8,
        seeds = [b"user_vault", user.key().as_ref()],
        bump
    )]
    pub user_vault_state: Account<'info, UserVault>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"user_vault", user.key().as_ref()],
        bump
    )]
    pub user_vault_state: Account<'info, UserVault>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA Authority
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettlePnl<'info> {
    // Authorized Operator (Matching Engine running in TEE)
    #[account(mut)]
    pub operator: Signer<'info>, 
    
    // Validating against the Vault's set authority
    #[account(
        constraint = vault.authority == operator.key() @ ErrorCode::UnauthorizedOperator
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: User account is just for PDA derivation
    pub user: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"user_vault", user.key().as_ref()],
        bump
    )]
    pub user_vault_state: Account<'info, UserVault>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
}

#[account]
pub struct UserVault {
    pub collateral_balance: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds in user vault")]
    InsufficientFunds,
    #[msg("Operator is not authorized to settle PnL")]
    UnauthorizedOperator,
}
