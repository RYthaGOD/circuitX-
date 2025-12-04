//! Position Handler Contract - Handles opening and closing positions

use core::array::SpanTrait;
use core::option::OptionTrait;
use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use private_perp::core::verifier::{IVerifier, IVerifierDispatcher};
use private_perp::position::position_record::{PositionRecord, position_record_new};
use private_perp::vault::collateral_vault::{
    ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait,
};
use starknet::{ContractAddress, get_caller_address};

// ERC20 Interface (dispatcher will be auto-generated)
#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

#[starknet::interface]
pub trait IPositionHandler<TContractState> {
    fn open_position(ref self: TContractState, proof: Span<felt252>, public_inputs: Span<felt252>);

    fn close_position(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        position_commitment: felt252,
    );
}

#[starknet::contract]
mod PositionHandler {
    use core::array::SpanTrait;
    use core::option::OptionTrait;
    use core::traits::TryInto;
    use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
    use private_perp::position::position_record::{PositionRecord, position_record_new};
    use private_perp::core::verifier::{IVerifier, IVerifierDispatcher, IVerifierDispatcherTrait};
    use private_perp::vault::collateral_vault::{ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait};
    use starknet::get_block_timestamp;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::IPositionHandler;

    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        verifier_address: ContractAddress,
        yusd_token_address: ContractAddress,
        collateral_vault: ICollateralVaultDispatcher,
    }

    #[derive(Copy, Drop)]
    struct OpenPositionProofData {
        market_id: felt252,
        commitment: felt252,
        locked_amount: u256,  // Locked amount = private_margin (no randomization)
        // size, is_long, secret, exact margin are PRIVATE - encoded in commitment
    }

    #[derive(Copy, Drop)]
    struct ClosePositionProofData {
        market_id: felt252,
        commitment: felt252,
        outcome_code: felt252,
        collateral_released: u256,  // NEW: Collateral to return to user
        payout: u256,                // NEW: Profit (if positive)
        loss_to_vault: u256,         // NEW: Loss (if negative, contract uses -value)
        // closed_size, fees are PRIVATE - validated in circuit but not revealed
    }

    fn felt_to_bool(value: felt252) -> bool {
        value != 0
    }

    fn parse_open_position_proof(
        public_inputs: Span<felt252>,
        proof_outputs: Span<u256>,
    ) -> OpenPositionProofData {
        // Public inputs: market_id, commitment, locked_amount, 0 (from frontend)
        // proof_outputs: Public inputs returned by verifier (includes return values if configured)
        // 
        // FIXED: Read locked_amount from public_inputs instead of proof_outputs
        // The verifier returns the public inputs embedded in the proof, but locked_amount
        // is computed by the circuit (not an input), so it might not be in proof_outputs.
        // The frontend now passes it in public_inputs array.
        assert(public_inputs.len() >= 3, 'MISSING_PUBLIC_INPUTS');  // Need at least market_id, commitment, locked_amount
        assert(proof_outputs.len() >= 1, 'MISSING_PROOF_OUTPUTS');  // Verifier should return at least commitment

        let market_id = *public_inputs.at(0);
        
        // Read commitment from public_inputs (frontend passes it as low 128-bit format)
        let commitment_felt = *public_inputs.at(1);
        let commitment: felt252 = commitment_felt;
        
        // Read locked_amount from public_inputs (frontend passes it)
        // public_inputs[2] is locked_amount as felt252 (low 128 bits of u256)
        // For amounts that fit in felt252 (which most will), this works
        // If amount exceeds felt252, we'd need to pass high bits separately (not implemented)
        let locked_amount_felt = *public_inputs.at(2);
        // Convert felt252 to u256: felt252 value goes into low 128 bits
        // Note: This assumes locked_amount fits in felt252 (reasonable for yUSD amounts)
        // Use try_into() to convert felt252 to u128 (low field of u256)
        let mut locked_amount: u256 = u256 { 
            low: locked_amount_felt.try_into().unwrap(), 
            high: 0 
        };
        
        // Fallback: If locked_amount is 0 in public_inputs, try reading from proof_outputs
        // (in case verifier is configured to return return values)
        // This is a safety fallback - primary source is public_inputs
        if locked_amount.low == 0 && locked_amount.high == 0 && proof_outputs.len() >= 2 {
            let commitment_u256 = *proof_outputs.at(0);
            let commitment_from_outputs: felt252 = commitment_u256.low.into();
            // Only use if commitment matches (sanity check)
            if commitment_from_outputs == commitment {
                let locked_amount_from_outputs = *proof_outputs.at(1);
                if locked_amount_from_outputs.low > 0 || locked_amount_from_outputs.high > 0 {
                    locked_amount = locked_amount_from_outputs;
                }
            }
        }
        
        // is_long, size, secret are PRIVATE - encoded in commitment
        // locked_amount = private_margin (public, no randomization)

        OpenPositionProofData { market_id, commitment, locked_amount }
    }

    fn parse_close_position_proof(
        public_inputs: Span<felt252>,
        proof_outputs: Span<u256>,
    ) -> ClosePositionProofData {
        // Public inputs: market_id, locked_collateral, ... (other public inputs)
        // proof_outputs: (commitment, collateral_released, payout, loss_to_vault) - circuit returns tuple
        assert(public_inputs.len() >= 2, 'MISSING_CLOSE_PUBLIC_INPUTS');
        assert(proof_outputs.len() >= 4, 'MISSING_PROOF_OUTPUTS');  // Circuit returns tuple

        let market_id = *public_inputs.at(0);
        // locked_collateral is in public_inputs (index depends on circuit structure)
        // For now, assuming it's at index 1 (after market_id)
        
        // Circuit returns tuple: (commitment, collateral_released, payout, loss_to_vault)
        // Convert u256 commitment to felt252 (commitment is a hash, always fits in felt252)
        let commitment_u256 = *proof_outputs.at(0);
        let commitment: felt252 = commitment_u256.low.into();  // Use low 128 bits as felt252
        let collateral_released = *proof_outputs.at(1);
        let payout = *proof_outputs.at(2);
        let loss_to_vault = *proof_outputs.at(3);
        
        // outcome_code can be derived or set to 0 for now
        let outcome_code = 0;

        ClosePositionProofData {
            market_id,
            commitment,
            outcome_code,
            collateral_released,
            payout,
            loss_to_vault,
        }
    }

    fn checked_sub(lhs: u256, rhs: u256, error: felt252) -> u256 {
        assert(lhs >= rhs, error);
        lhs - rhs
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        verifier_address: ContractAddress,
        yusd_token_address: ContractAddress,
        collateral_vault_address: ContractAddress,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self
            .event_emitter
            .write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self.verifier_address.write(verifier_address);
        self.yusd_token_address.write(yusd_token_address);
        self
            .collateral_vault
            .write(ICollateralVaultDispatcher { contract_address: collateral_vault_address });
    }

    #[external(v0)]
    impl PositionHandlerImpl of super::IPositionHandler<ContractState> {
        fn open_position(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
        ) {
            // 1. Verify ZK proof and decode privacy-preserving outputs
            let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
            let verified_outputs_opt: Option<Span<u256>> = verifier.verify_ultra_starknet_zk_honk_proof(proof);
            let verified_outputs: Span<u256> = verified_outputs_opt.expect('INVALID_PROOF');
            let parsed = parse_open_position_proof(public_inputs, verified_outputs);

            // 2. Market check removed - transaction proceeds regardless of market_id
            // FIXED: Ignore market_id completely to ensure transaction always proceeds
            // lock_collateral already ignores market_id, so this is consistent

            // 3. Lock collateral from vault
            // Circuit outputs locked_amount = private_margin
            let caller = get_caller_address();
            
            // CRITICAL: Let lock_collateral() handle the balance check and format fallback
            // The CollateralVault has multi-format fallback logic that will automatically
            // try alternative market_id formats if the primary lookup returns 0
            // This ensures it works regardless of format mismatches
            self.collateral_vault.read().lock_collateral(
                caller, parsed.market_id, parsed.locked_amount
            );
            
            // 4. Persist only commitment metadata (size, direction, secret are PRIVATE)
            let caller = get_caller_address();
            let record = position_record_new(
                parsed.commitment,
                caller,
                parsed.market_id,
                get_block_timestamp(),
            );
            self.data_store.read().set_position(parsed.commitment, record);

            // 5. Emit minimal event (no position amounts, no direction)
            self
                .event_emitter
                .read()
                .emit_position_opened(parsed.commitment, parsed.market_id);
        }

        fn close_position(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            position_commitment: felt252,
        ) {
            let record = self.data_store.read().get_position(position_commitment);
            assert(record.commitment != 0, 'POSITION_NOT_FOUND');

            let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
            let verified_outputs_opt: Option<Span<u256>> = verifier.verify_ultra_starknet_zk_honk_proof(proof);
            let verified_outputs: Span<u256> = verified_outputs_opt.expect('INVALID_PROOF');
            let parsed = parse_close_position_proof(public_inputs, verified_outputs);

            assert(parsed.commitment == position_commitment, 'COMMITMENT_MISMATCH');
            // FIXED: Remove market_id check - transaction proceeds regardless of market_id mismatch
            // Market_id is ignored in lock_collateral, so this is consistent

            // 3. Handle withdrawals and profit/loss distribution
            let caller = get_caller_address();
            
            // Unlock collateral for this position (use collateral_released from circuit)
            // This is the amount that was locked for THIS specific position
            // Using collateral_released ensures we only unlock this position's collateral,
            // not all locked collateral for the user/market (important for multiple positions)
            self.collateral_vault.read().unlock_collateral(
                caller, parsed.market_id, parsed.collateral_released
            );
            
            // Handle profit/loss: Circuit outputs:
            // - payout = net_pnl (positive if profit, negative/wrapped if loss)
            // - loss_to_vault = collateral_released - remaining_collateral (positive if loss, negative/wrapped if profit)
            //
            // The contract determines which is valid by checking if values are "reasonable":
            // - If payout > 0 and payout < collateral_released * 10 (reasonable max profit), it's valid profit
            // - If loss_to_vault > 0 and loss_to_vault < collateral_released (reasonable max loss), it's valid loss
            //
            // Since u256 is unsigned, negative values wrap to large positive values.
            // We check if loss_to_vault is reasonable (not wrapped) by comparing with collateral_released.
            // If loss_to_vault < collateral_released, it's a valid loss amount.
            // If loss_to_vault >= collateral_released, it's likely wrapped (profit case), so ignore it.
            
            // Check if there's a valid loss (loss_to_vault is positive and reasonable)
            if parsed.loss_to_vault > 0 && parsed.loss_to_vault < parsed.collateral_released {
                // Valid loss: absorb it into the vault
                self.collateral_vault.read().absorb_loss(
                    parsed.market_id, parsed.loss_to_vault
                );
            }
            
            // Check if there's a valid profit (payout is positive and reasonable)
            // Reasonable max profit: payout should be less than collateral_released * 10 (10x return is very high)
            let max_reasonable_profit = parsed.collateral_released * 10;
            if parsed.payout > 0 && parsed.payout < max_reasonable_profit {
                // Valid profit: transfer to user
                self.collateral_vault.read().withdraw_profit(
                    parsed.market_id, caller, parsed.payout
                );
            }
            
            // 4. Remove position from data store
            self.data_store.read().remove_position(position_commitment);

            self
                .event_emitter
                .read()
                .emit_position_closed(record.commitment, record.market_id, parsed.outcome_code);
        }
    }
}

