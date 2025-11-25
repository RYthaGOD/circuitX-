# Shielded Balance Design for Private Collateral Management

## Why the Current Limitation Exists

The current collateral vault uses **transparent balances** (`user_balances: Map<(ContractAddress, felt252), u256>`) because:

1. **Withdrawal Validation**: Must check `user_balance >= amount` before allowing withdrawal (line 224-225)
2. **Double-Spend Prevention**: Need to track balances to prevent users from withdrawing more than deposited
3. **Simplicity**: Direct balance checks are straightforward and gas-efficient
4. **Position Handler Integration**: While positions use ZK proofs, the vault still needs to verify sufficient collateral exists

**Trade-off**: Functionality vs Privacy - we chose functionality for the MVP.

---

## Shielded Balance Architecture (Zcash-Inspired)

### Core Concept: Note-Based Commitments

Instead of storing balances, we store **commitments** to "notes" (deposit records). Users prove ownership and sufficient balance via ZK proofs, similar to how positions work.

### Components

#### 1. **Note Structure** (Off-Chain)
```cairo
struct CollateralNote {
    // Private (known only to user)
    value: u256,              // Deposit amount
    market_id: felt252,       // Which market
    secret: felt252,          // Random secret for nullifier
    recipient: ContractAddress, // Who can spend this note
    
    // Public (in commitment)
    commitment: felt252,      // Hash(value, market_id, secret, recipient)
    nullifier: felt252,       // Hash(secret, commitment) - prevents double-spend
}
```

#### 2. **Commitment Merkle Tree** (On-Chain)
```cairo
#[storage]
struct Storage {
    // Merkle tree of all unspent note commitments
    commitment_tree: MerkleTree<felt252>,
    tree_height: u32,
    tree_root: felt252,
    
    // Nullifier set (prevents double-spending)
    nullifiers: Map<felt252, bool>,
    
    // Aggregate tracking (public, doesn't leak individual amounts)
    market_balances: Map<felt252, u256>,  // Total per market
    total_capital: u256,                   // Global total
}
```

#### 3. **ZK Circuit** (Noir)
The circuit proves:
- User knows a note with `value >= required_amount`
- Note commitment exists in the merkle tree
- Note hasn't been spent (nullifier not in set)
- User can generate the nullifier (owns the secret)
- Output notes sum correctly (for change)

### Operations

#### **Deposit (Shielded)**
```cairo
fn deposit_shielded(
    ref self: ContractState,
    proof: Span<felt252>,
    public_inputs: Span<felt252>,  // [commitment, market_id, value_delta]
    amount: u256,  // Public amount (or could be in proof)
) -> felt252 {
    // 1. Transfer tokens from user
    let yusd = IERC20Dispatcher { contract_address: self.yusd_token.read() };
    yusd.transfer_from(sender: caller, recipient: get_contract_address(), amount);
    
    // 2. Verify ZK proof that:
    //    - Creates valid commitment for new note
    //    - Amount matches transferred tokens
    let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
    verifier.verify_collateral_deposit_proof(proof).expect('INVALID_PROOF');
    
    // 3. Parse public inputs
    let commitment = *public_inputs.at(0);
    let market_id = *public_inputs.at(1);
    let value_delta = *public_inputs.at(2);  // Amount added
    
    // 4. Add commitment to merkle tree
    self.commitment_tree.insert(commitment);
    
    // 5. Update aggregate balances (public, but doesn't leak individual)
    let mut market_balance = self.market_balances.read(market_id);
    market_balance += value_delta;
    self.market_balances.write(market_id, market_balance);
    
    // 6. Emit minimal event (only commitment, no amount)
    self.emit(ShieldedDeposit { commitment, market_id });
    
    commitment
}
```

#### **Withdraw (Shielded)**
```cairo
fn withdraw_shielded(
    ref self: ContractState,
    proof: Span<felt252>,
    public_inputs: Span<felt252>,  // [nullifier, market_id, value_delta, new_commitment?]
    amount: u256,
    recipient: ContractAddress,
) -> bool {
    // 1. Verify ZK proof that:
    //    - User owns a note with value >= amount
    //    - Note commitment exists in merkle tree
    //    - Nullifier is valid (prevents double-spend)
    //    - If change: creates new commitment for remainder
    let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
    let verified = verifier.verify_collateral_withdraw_proof(proof).expect('INVALID_PROOF');
    
    // 2. Parse public inputs
    let nullifier = *public_inputs.at(0);
    let market_id = *public_inputs.at(1);
    let value_delta = *public_inputs.at(2);  // Amount withdrawn
    
    // 3. Check nullifier not already spent
    assert(!self.nullifiers.read(nullifier), 'ALREADY_SPENT');
    
    // 4. Mark nullifier as spent
    self.nullifiers.write(nullifier, true);
    
    // 5. Remove old commitment from tree (or mark as spent)
    //    (In practice, we'd update the tree root)
    
    // 6. If change: add new commitment for remainder
    //    (Handled in proof outputs)
    
    // 7. Update aggregate balances
    let mut market_balance = self.market_balances.read(market_id);
    market_balance -= value_delta;
    self.market_balances.write(market_id, market_balance);
    
    // 8. Transfer tokens
    let yusd = IERC20Dispatcher { contract_address: self.yusd_token.read() };
    yusd.transfer(recipient: recipient, amount: amount);
    
    // 9. Emit minimal event
    self.emit(ShieldedWithdraw { nullifier, market_id });
    
    true
}
```

#### **Prove Sufficient Balance (For Position Opening)**
```cairo
fn prove_sufficient_collateral(
    ref self: ContractState,
    proof: Span<felt252>,
    public_inputs: Span<felt252>,  // [market_id, required_amount, commitment_roots...]
) -> bool {
    // ZK proof proves:
    // - User owns notes totaling >= required_amount
    // - All notes are in the merkle tree
    // - All notes haven't been spent
    // - Notes are for the correct market_id
    
    let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
    let verified = verifier.verify_sufficient_collateral_proof(proof).expect('INVALID_PROOF');
    
    // Parse public inputs
    let market_id = *public_inputs.at(0);
    let required_amount = *public_inputs.at(1);
    
    // Proof output contains: total_value (verified >= required_amount)
    let total_value = *verified_outputs.at(0);
    assert(total_value >= required_amount, 'INSUFFICIENT_COLLATERAL');
    
    true
}
```

### ZK Circuit Requirements (Noir)

#### **Deposit Circuit**
```noir
fn deposit_circuit(
    value: u256,
    market_id: felt252,
    secret: felt252,
    recipient: ContractAddress,
) -> (felt252, felt252) {
    // Compute commitment
    let commitment = poseidon_hash([value, market_id, secret, recipient]);
    
    // Compute nullifier
    let nullifier = poseidon_hash([secret, commitment]);
    
    // Public outputs: [commitment, market_id, value]
    (commitment, nullifier)
}
```

#### **Withdraw Circuit**
```noir
fn withdraw_circuit(
    // Private inputs
    notes: [Note; N],           // User's notes
    secrets: [felt252; N],      // Secrets for each note
    merkle_paths: [MerklePath; N],  // Proofs notes are in tree
    change_value: u256,         // Remaining after withdrawal
    change_secret: felt252,     // Secret for change note
    
    // Public inputs
    nullifiers: [felt252; N],   // Nullifiers for spent notes
    market_id: felt252,
    withdraw_amount: u256,
    new_commitment: felt252,    // Commitment for change note (if any)
) -> (u256, bool) {
    // 1. Verify all notes are in merkle tree
    for i in 0..N {
        assert(verify_merkle_path(notes[i].commitment, merkle_paths[i]));
    }
    
    // 2. Verify user owns notes (can generate nullifiers)
    for i in 0..N {
        let computed_nullifier = poseidon_hash([secrets[i], notes[i].commitment]);
        assert(computed_nullifier == nullifiers[i]);
    }
    
    // 3. Verify total value >= withdraw_amount
    let total_value = sum(notes.map(|n| n.value));
    assert(total_value >= withdraw_amount, 'INSUFFICIENT_BALANCE');
    
    // 4. If change: verify new commitment is correct
    if change_value > 0 {
        let computed_commitment = poseidon_hash([
            change_value, market_id, change_secret, recipient
        ]);
        assert(computed_commitment == new_commitment);
    }
    
    // 5. Verify market_id matches for all notes
    for i in 0..N {
        assert(notes[i].market_id == market_id);
    }
    
    // Public outputs: [total_value, has_change]
    (total_value, change_value > 0)
}
```

### Privacy Guarantees

✅ **Private**:
- Individual deposit amounts (hidden in commitments)
- Individual withdrawal amounts (hidden in nullifiers)
- User's total balance (proven via ZK, not stored)
- Which notes a user owns (only they know the secrets)

✅ **Public** (by design):
- Aggregate market balances (needed for risk management)
- Total vault capital (needed for solvency)
- Merkle tree root (needed for verification)
- Nullifier set (prevents double-spending, but doesn't reveal amounts)

### Implementation Considerations

#### **Merkle Tree Management**
- Use incremental merkle tree (like Tornado Cash)
- Store only root on-chain, compute paths off-chain
- Support up to 2^20 leaves (1M notes)

#### **Nullifier Set**
- Use sparse merkle tree or map for nullifiers
- Check membership in O(1) via map lookup
- Prevent double-spending without revealing amounts

#### **Change Notes**
- When withdrawing partial amount, create new note for remainder
- Similar to UTXO model (Bitcoin/Zcash)
- User maintains multiple notes of varying amounts

#### **Gas Costs**
- Merkle tree updates: ~50k gas per insert
- Nullifier checks: ~5k gas (map lookup)
- ZK proof verification: ~200k-500k gas (depends on circuit size)
- **Trade-off**: Higher gas costs for privacy

### Migration Path

1. **Phase 1**: Deploy shielded vault alongside transparent vault
2. **Phase 2**: Allow users to migrate balances (transparent → shielded)
3. **Phase 3**: Make shielded vault default for new deposits
4. **Phase 4**: Deprecate transparent vault (optional)

### Comparison

| Feature | Transparent | Shielded |
|---------|-------------|----------|
| Deposit Privacy | ❌ Visible | ✅ Hidden |
| Withdrawal Privacy | ❌ Visible | ✅ Hidden |
| Balance Privacy | ❌ Visible | ✅ Hidden |
| Gas Cost (Deposit) | ~50k | ~300k |
| Gas Cost (Withdraw) | ~80k | ~400k |
| Complexity | Low | High |
| ZK Proof Required | No | Yes |

### Security Considerations

1. **Nullifier Collision**: Use cryptographically secure hash (Poseidon)
2. **Merkle Tree Attacks**: Use sufficient tree depth (20+ levels)
3. **Note Forgery**: Commitment includes value, prevents inflation
4. **Double-Spending**: Nullifier set prevents reuse
5. **Front-running**: Commitments hide amounts, but timing still visible

---

## Summary

**Shielded balances** would provide **full privacy** for collateral management by:
- Hiding deposit/withdrawal amounts in commitments
- Proving ownership via ZK proofs (no balance storage)
- Using nullifiers to prevent double-spending
- Maintaining aggregate balances for risk management

**Trade-offs**:
- ✅ Full privacy for users
- ✅ No balance leakage
- ❌ Higher gas costs (~5-10x)
- ❌ More complex implementation
- ❌ Requires ZK circuit development

This design follows the same privacy model as your position system: **prove ownership and validity via ZK, store only commitments on-chain**.

