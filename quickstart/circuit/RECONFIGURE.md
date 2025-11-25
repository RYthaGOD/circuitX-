# How to Reconfigure the Circuit

## Understanding the Warning

The warning about `max_price_age` being unused is **expected and safe to ignore**. The variable is passed to functions but the actual comparison validation happens on-chain in the Cairo contract, not in the circuit itself.

## Why You're Getting the Same Output

The circuit output (commitment hash) depends on the inputs in `Prover.toml`. If you're getting the same output, it means you're using the same inputs. To get a different output, you need to change the inputs.

## How to Reconfigure

### Step 1: Choose Your Action

Edit `Prover.toml` and set the `action` field:
- `"0"` = Open market order
- `"1"` = Open limit order  
- `"2"` = Open TWAP order
- `"3"` = Close position
- `"4"` = Close with take profit
- `"5"` = Close with stop loss
- `"6"` = Check liquidation

### Step 2: Update Inputs Based on Action

#### For Open Market Order (action = "0"):
```toml
action = "0"
private_margin = "100"
private_position_size = "1000"
private_trader_secret = "12345"
market_id = "1"
is_long = "1"
oracle_price = "50000"
price_impact = "50"
execution_price = "50050"  # oracle_price + price_impact for long
acceptable_slippage = "100"  # 1% in basis points
leverage = "10"
min_margin_ratio = "5"
max_position_size = "10000"
current_time = "1000000"
price_timestamp = "1000000"
num_sources = "5"
min_sources = "3"
max_price_age = "60"
# Set unused fields to "0"
trigger_price = "0"
current_price = "0"
closing_size = "0"
take_profit_price = "0"
stop_loss_price = "0"
trading_fee_bps = "0"
twap_price = "0"
twap_duration = "0"
chunk_index = "0"
total_chunks = "0"
private_entry_price = "0"  # Not needed for opening
```

#### For Close Position (action = "3"):
```toml
action = "3"
private_margin = "100"
private_position_size = "1000"
private_entry_price = "50000"  # Entry price when position was opened
private_trader_secret = "12345"
market_id = "1"
is_long = "1"
current_price = "51000"  # Current market price
current_time = "1000000"
price_timestamp = "1000000"
closing_size = "1000"  # Amount to close (can be partial)
num_sources = "5"
min_sources = "3"
max_price_age = "60"
trading_fee_bps = "10"  # 0.1% in basis points
# Set unused fields to "0"
oracle_price = "0"
price_impact = "0"
execution_price = "0"
acceptable_slippage = "0"
leverage = "0"
min_margin_ratio = "0"
max_position_size = "0"
trigger_price = "0"
take_profit_price = "0"
stop_loss_price = "0"
twap_price = "0"
twap_duration = "0"
chunk_index = "0"
total_chunks = "0"
```

#### For Limit Order (action = "1"):
```toml
action = "1"
private_margin = "100"
private_position_size = "1000"
private_trader_secret = "12345"
market_id = "1"
is_long = "1"
oracle_price = "50000"
trigger_price = "49500"  # Order executes when price reaches this
price_impact = "50"
execution_price = "50050"
acceptable_slippage = "100"
leverage = "10"
min_margin_ratio = "5"
max_position_size = "10000"
current_time = "1000000"
price_timestamp = "1000000"
num_sources = "5"
min_sources = "3"
max_price_age = "60"
# Set unused fields to "0"
current_price = "0"
closing_size = "0"
take_profit_price = "0"
stop_loss_price = "0"
trading_fee_bps = "0"
twap_price = "0"
twap_duration = "0"
chunk_index = "0"
total_chunks = "0"
private_entry_price = "0"
```

#### For TWAP Order (action = "2"):
```toml
action = "2"
private_margin = "100"
private_position_size = "1000"  # Chunk size
private_trader_secret = "12345"
market_id = "1"
is_long = "1"
twap_price = "50000"  # TWAP price from oracle
price_impact = "50"
execution_price = "50050"
acceptable_slippage = "100"
leverage = "10"
min_margin_ratio = "5"
max_position_size = "10000"
current_time = "1000000"
price_timestamp = "1000000"
twap_duration = "1800"  # 30 minutes in seconds
num_sources = "5"
min_sources = "3"
max_price_age = "60"
chunk_index = "0"  # First chunk
total_chunks = "6"  # Total number of chunks
# Set unused fields to "0"
oracle_price = "0"
trigger_price = "0"
current_price = "0"
closing_size = "0"
take_profit_price = "0"
stop_loss_price = "0"
trading_fee_bps = "0"
private_entry_price = "0"
```

#### For Close with Take Profit (action = "4"):
```toml
action = "4"
private_margin = "100"
private_position_size = "1000"
private_entry_price = "50000"
private_trader_secret = "12345"
market_id = "1"
is_long = "1"
current_price = "51000"  # Current market price
take_profit_price = "51000"  # TP price (must be reached)
current_time = "1000000"
price_timestamp = "1000000"
closing_size = "1000"
num_sources = "5"
min_sources = "3"
max_price_age = "60"
trading_fee_bps = "10"
# Set unused fields to "0"
oracle_price = "0"
price_impact = "0"
execution_price = "0"
acceptable_slippage = "0"
leverage = "0"
min_margin_ratio = "0"
max_position_size = "0"
trigger_price = "0"
stop_loss_price = "0"
twap_price = "0"
twap_duration = "0"
chunk_index = "0"
total_chunks = "0"
```

#### For Close with Stop Loss (action = "5"):
```toml
action = "5"
private_margin = "100"
private_position_size = "1000"
private_entry_price = "50000"
private_trader_secret = "12345"
market_id = "1"
is_long = "1"
current_price = "49000"  # Current market price
stop_loss_price = "49000"  # SL price (must be hit)
current_time = "1000000"
price_timestamp = "1000000"
closing_size = "1000"
num_sources = "5"
min_sources = "3"
max_price_age = "60"
trading_fee_bps = "10"
# Set unused fields to "0"
oracle_price = "0"
price_impact = "0"
execution_price = "0"
acceptable_slippage = "0"
leverage = "0"
min_margin_ratio = "0"
max_position_size = "0"
trigger_price = "0"
take_profit_price = "0"
twap_price = "0"
twap_duration = "0"
chunk_index = "0"
total_chunks = "0"
```

#### For Liquidation Check (action = "6"):
```toml
action = "6"
private_margin = "100"
private_position_size = "1000"
private_entry_price = "50000"
private_trader_secret = "12345"
market_id = "1"
is_long = "1"
current_price = "49000"  # Current market price (loss scenario)
current_time = "1000000"
price_timestamp = "1000000"
min_margin_ratio = "5"  # 5% maintenance margin
max_price_age = "60"
num_sources = "5"
min_sources = "3"
# Set unused fields to "0"
oracle_price = "0"
price_impact = "0"
execution_price = "0"
acceptable_slippage = "0"
leverage = "0"
max_position_size = "0"
trigger_price = "0"
current_price = "0"
closing_size = "0"
take_profit_price = "0"
stop_loss_price = "0"
trading_fee_bps = "0"
twap_price = "0"
twap_duration = "0"
chunk_index = "0"
total_chunks = "0"
```

### Step 3: Regenerate Witness and Proof

After updating `Prover.toml`:

```bash
cd circuit
nargo execute witness
bb prove --scheme ultra_honk --zk --oracle_hash starknet -b ./target/circuit.json -w ./target/witness.gz -o ./target
bb write_vk --scheme ultra_honk --oracle_hash starknet -b ./target/circuit.json -o ./target
```

### Step 4: Regenerate Verifier (if needed)

If you changed the circuit logic (not just inputs), regenerate the verifier:

```bash
cd ..
garaga gen --system ultra_starknet_zk_honk --vk ./circuit/target/vk --project-name verifier
```

## Important Notes

1. **Changing inputs only**: If you only change `Prover.toml` inputs, you don't need to regenerate the verifier. The same verifier can verify proofs with different inputs.

2. **Changing circuit code**: If you modify `main.nr` or `perp.nr`, you MUST regenerate the verifier because the circuit structure changed.

3. **Commitment uniqueness**: Different inputs will produce different commitment hashes. The commitment is a Pedersen hash of the inputs, so changing any input will change the output.

4. **Price calculations**: 
   - For long positions: `execution_price = oracle_price + price_impact`
   - For short positions: `execution_price = oracle_price - price_impact`

## Quick Reference Table

| Action | Value | Key Parameters | When to Use |
|--------|-------|----------------|-------------|
| Open Market | `"0"` | `price_impact`, `execution_price`, `leverage` | Immediate execution at current price |
| Open Limit | `"1"` | `trigger_price`, `price_impact`, `execution_price` | Execute when price reaches trigger |
| Open TWAP | `"2"` | `twap_price`, `twap_duration`, `chunk_index` | Time-weighted average price order |
| Close | `"3"` | `current_price`, `closing_size`, `trading_fee_bps` | Regular position close |
| Close TP | `"4"` | `take_profit_price`, `current_price` | Close when profit target reached |
| Close SL | `"5"` | `stop_loss_price`, `current_price` | Close when loss limit hit |
| Liquidation | `"6"` | `current_price`, `min_margin_ratio` | Check if position is liquidatable |

## Quick Test: Change One Value

To verify the circuit is working with new inputs, try changing just one value:

```toml
# Change this:
private_margin = "200"  # Was "100"
```

Then run:
```bash
nargo execute witness
```

You should see a different commitment output!

## Troubleshooting

### Issue: Still getting the same output after changing inputs

**Solution:**
1. Make sure you saved `Prover.toml` after editing
2. Verify the values actually changed: `cat Prover.toml | grep private_margin`
3. Clear the target directory and regenerate: `rm -rf target && nargo execute witness`

### Issue: Circuit execution fails with assertion error

**Common causes:**
- `execution_price` doesn't match calculated price:
  - Long: `execution_price = oracle_price + price_impact`
  - Short: `execution_price = oracle_price - price_impact`
- Price calculations are incorrect for your `is_long` value

**Solution:** Double-check your price calculations match the circuit logic.

### Issue: Warning about unused variable `max_price_age`

**Solution:** This is **expected and safe to ignore**. The validation happens on-chain, not in the circuit.

### Issue: Need to test different scenarios quickly

**Solution:** Create multiple `Prover.toml` files:
```bash
cp Prover.toml Prover.market.toml
cp Prover.toml Prover.close.toml
# Edit each file for different scenarios
# Then use: nargo execute --prover Prover.market.toml witness
```

## Common Input Patterns

### Testing Profit Scenario (Long Position)
```toml
action = "3"
is_long = "1"
private_entry_price = "50000"
current_price = "51000"  # Price went up = profit for long
```

### Testing Loss Scenario (Long Position)
```toml
action = "3"
is_long = "1"
private_entry_price = "50000"
current_price = "49000"  # Price went down = loss for long
```

### Testing Short Position
```toml
action = "0"
is_long = "0"  # Short position
oracle_price = "50000"
execution_price = "49950"  # oracle_price - price_impact for short
```

### Testing Partial Close
```toml
action = "3"
private_position_size = "1000"
closing_size = "500"  # Close only half the position
```

