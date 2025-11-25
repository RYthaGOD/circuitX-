//! Role-based access control contract

use starknet::ContractAddress;
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

#[starknet::interface]
pub trait IRoleStore<TContractState> {
    fn has_role(self: @TContractState, account: ContractAddress, role: felt252) -> bool;
    fn grant_role(ref self: TContractState, account: ContractAddress, role: felt252);
    fn revoke_role(ref self: TContractState, account: ContractAddress, role: felt252);
    fn assert_only_role(self: @TContractState, account: ContractAddress, role: felt252);
}

#[starknet::contract]
mod RoleStore {
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address};

    // Role constants
    const ADMIN: felt252 = 'ADMIN';
    const CONTROLLER: felt252 = 'CONTROLLER';
    const KEEPER: felt252 = 'KEEPER';

    #[storage]
    struct Storage {
        // Mapping: (account, role) -> bool
        roles: Map<(ContractAddress, felt252), bool>,
        admin: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        RoleGranted: RoleGranted,
        RoleRevoked: RoleRevoked,
    }

    #[derive(Drop, starknet::Event)]
    struct RoleGranted {
        account: ContractAddress,
        role: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct RoleRevoked {
        account: ContractAddress,
        role: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
        // Grant admin role to admin
        self.roles.write((admin, ADMIN), true);
    }

    #[external(v0)]
    impl RoleStoreImpl of super::IRoleStore<ContractState> {
        fn has_role(self: @ContractState, account: ContractAddress, role: felt252) -> bool {
            self.roles.read((account, role))
        }

        fn grant_role(ref self: ContractState, account: ContractAddress, role: felt252) {
            let caller = get_caller_address();
            assert(self.has_role(caller, ADMIN), 'NOT_ADMIN');

            self.roles.write((account, role), true);
            self.emit(RoleGranted { account, role });
        }

        fn revoke_role(ref self: ContractState, account: ContractAddress, role: felt252) {
            let caller = get_caller_address();
            assert(self.has_role(caller, ADMIN), 'NOT_ADMIN');

            self.roles.write((account, role), false);
            self.emit(RoleRevoked { account, role });
        }

        fn assert_only_role(self: @ContractState, account: ContractAddress, role: felt252) {
            assert(self.has_role(account, role), 'MISSING_ROLE');
        }
    }
}

