//! yUSD Token Contract
//! A mintable ERC20 token for Ztarknet testnet
//! Total Supply: 10,000,000,000 yUSD (10B)
//! Decimals: 18
//! Anyone can mint tokens (for faucet functionality)

use starknet::ContractAddress;

#[starknet::interface]
trait IyUSD<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(
        self: @TContractState, owner: ContractAddress, spender: ContractAddress
    ) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn mint(ref self: TContractState, amount: u256);
    fn mint_to(ref self: TContractState, to: ContractAddress, amount: u256);
}

#[starknet::contract]
mod yUSD {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use core::num::traits::Zero;
    use super::IyUSD;
    use starknet::storage::{
        StoragePointerReadAccess,
        StoragePointerWriteAccess,
        StorageMapReadAccess,
        StorageMapWriteAccess
    };
    use starknet::storage::Map;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
        Mint: Mint,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: u256
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        spender: ContractAddress,
        value: u256
    }

    #[derive(Drop, starknet::Event)]
    struct Mint {
        to: ContractAddress,
        amount: u256
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        symbol: felt252,
        initial_supply: u256,
        recipient: ContractAddress
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(18);
        
        if initial_supply > 0 {
            self._mint(recipient, initial_supply);
        }
    }

    // ============================================
    // ERC20 Standard Functions
    // ============================================

    #[abi(embed_v0)]
    impl yUSDImpl of IyUSD<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress
        ) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) -> bool {
            let caller = get_caller_address();
            self._spend_allowance(sender, caller, amount);
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self._approve(owner, spender, amount);
            true
        }

        // ============================================
        // Minting Functions (Public - Anyone can mint)
        // ============================================

        /// Mint tokens to the caller's address
        /// Anyone can call this function (for faucet functionality)
        fn mint(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            self._mint(caller, amount);
        }

        /// Mint tokens to a specific address
        /// Anyone can call this function (for faucet functionality)
        fn mint_to(ref self: ContractState, to: ContractAddress, amount: u256) {
            self._mint(to, amount);
        }
    }

    // ============================================
    // Internal Functions
    // ============================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            assert(!to.is_zero(), 'ZERO_ADDR');
            
            let mut total_supply = self.total_supply.read();
            total_supply += amount;
            self.total_supply.write(total_supply);
            
            let mut balance = self.balances.read(to);
            balance += amount;
            self.balances.write(to, balance);
            
            let zero_address: ContractAddress = Zero::zero();
            self.emit(Transfer { 
                from: zero_address, 
                to, 
                value: amount 
            });
            
            self.emit(Mint { to, amount });
        }

        fn _burn(ref self: ContractState, account: ContractAddress, amount: u256) {
            assert(!account.is_zero(), 'ZERO_ADDR');
            
            let mut balance = self.balances.read(account);
            assert(balance >= amount, 'LOW_BALANCE');
            balance -= amount;
            self.balances.write(account, balance);
            
            let mut total_supply = self.total_supply.read();
            total_supply -= amount;
            self.total_supply.write(total_supply);
            
            let zero_address: ContractAddress = Zero::zero();
            self.emit(Transfer { 
                from: account, 
                to: zero_address, 
                value: amount 
            });
        }

        fn _transfer(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            amount: u256
        ) {
            assert(!from.is_zero(), 'ZERO_ADDR');
            assert(!to.is_zero(), 'ZERO_ADDR');
            
            let mut from_balance = self.balances.read(from);
            assert(from_balance >= amount, 'LOW_BALANCE');
            from_balance -= amount;
            self.balances.write(from, from_balance);
            
            let mut to_balance = self.balances.read(to);
            to_balance += amount;
            self.balances.write(to, to_balance);
            
            self.emit(Transfer { from, to, value: amount });
        }

        fn _approve(
            ref self: ContractState,
            owner: ContractAddress,
            spender: ContractAddress,
            amount: u256
        ) {
            assert(!owner.is_zero(), 'ZERO_ADDR');
            assert(!spender.is_zero(), 'ZERO_ADDR');
            
            self.allowances.write((owner, spender), amount);
            self.emit(Approval { owner, spender, value: amount });
        }

        fn _spend_allowance(
            ref self: ContractState,
            owner: ContractAddress,
            spender: ContractAddress,
            amount: u256
        ) {
            let mut allowance = self.allowances.read((owner, spender));
            assert(allowance >= amount, 'LOW_ALLOW');
            allowance -= amount;
            self.allowances.write((owner, spender), allowance);
        }
    }
}
