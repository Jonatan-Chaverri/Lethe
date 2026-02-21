use starknet::ContractAddress;

#[starknet::interface]
pub trait IVesuStrategy<ContractState> {
    fn set_vault_address(ref self: ContractState, vault: ContractAddress);
    fn get_total_locked_assets(self: @ContractState) -> u256;
    fn deposit_assets(ref self: ContractState, amount_assets: u256);
    fn withdraw_assets(ref self: ContractState, amount_assets: u256);
    fn rescue_tokens(ref self: ContractState, token: ContractAddress, to: ContractAddress, amount: u256);

    fn is_configured(self: @ContractState) -> bool;
    fn get_pool(self: @ContractState) -> ContractAddress;
    fn get_asset(self: @ContractState) -> ContractAddress;
    fn get_v_token(self: @ContractState) -> ContractAddress;
}

#[starknet::interface]
pub trait IVesuPoolFactory<ContractState> {
    fn v_token_for_asset(
        self: @ContractState, pool: ContractAddress, asset: ContractAddress,
    ) -> ContractAddress;
}

#[starknet::interface]
pub trait IVesuVToken<ContractState> {
    fn convert_to_assets(self: @ContractState, shares: u256) -> u256;
    fn deposit(ref self: ContractState, assets: u256, receiver: ContractAddress) -> u256;
    fn withdraw(
        ref self: ContractState,
        assets: u256,
        receiver: ContractAddress,
        owner: ContractAddress,
    ) -> u256;
}

#[starknet::contract]
mod VesuStrategy {
    // Vault handles user accounting and share logic; this strategy only deploys capital into Vesu.
    // Keeping these responsibilities separate reduces risk and preserves modularity.
    use core::num::traits::{Bounded, Zero};
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::event::EventEmitter;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};

    use super::{
        IVesuPoolFactoryDispatcher,
        IVesuPoolFactoryDispatcherTrait,
        IVesuVTokenDispatcher,
        IVesuVTokenDispatcherTrait,
    };

    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);

    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    #[abi(embed_v0)]
    impl AccessControlImpl = AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        vault: ContractAddress,
        pool: ContractAddress,
        asset: ContractAddress,
        v_token: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        Deposited: Deposited,
        Withdrawn: Withdrawn,
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    struct Deposited {
        amount: u256,
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    struct Withdrawn {
        amount: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        pool: ContractAddress,
        v_token: ContractAddress,
        asset: ContractAddress,
    ) {
        self.accesscontrol.initializer();
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, admin);

        self.pool.write(pool);
        self.asset.write(asset);
        self.v_token.write(v_token);

        // Hackathon tradeoff: one-time max approval during initialization; never re-approved dynamically.
        IERC20Dispatcher { contract_address: asset }.approve(v_token, Bounded::<u256>::MAX);
    }

    #[abi(embed_v0)]
    impl VesuStrategyImpl of super::IVesuStrategy<ContractState> {

        fn set_vault_address(ref self: ContractState, vault: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            self.vault.write(vault);
        }

        fn get_total_locked_assets(self: @ContractState) -> u256 {
            let v_token = self.v_token.read();
            let shares = IERC20Dispatcher { contract_address: v_token }.balance_of(get_contract_address());
            IVesuVTokenDispatcher { contract_address: v_token }.convert_to_assets(shares)
        }

        fn deposit_assets(ref self: ContractState, amount_assets: u256) {
            self._assert_only_vault();
            assert(amount_assets > 0, 'zero-amount');

            // Invariant: strategy never pulls from vault; it only deploys tokens already held by this contract.
            let strategy_address = get_contract_address();
            let asset = IERC20Dispatcher { contract_address: self.asset.read() };
            let current_balance = asset.balance_of(strategy_address);
            assert(current_balance >= amount_assets, 'insufficient-balance');

            IVesuVTokenDispatcher { contract_address: self.v_token.read() }
                .deposit(amount_assets, strategy_address);
            self.emit(Deposited { amount: amount_assets });
        }

        fn withdraw_assets(ref self: ContractState, amount_assets: u256) {
            self._assert_only_vault();
            assert(amount_assets > 0, 'zero-amount');

            // Withdraw always sends funds to vault; liquidity failures in Vesu are expected to revert upstream.
            IVesuVTokenDispatcher { contract_address: self.v_token.read() }.withdraw(
                amount_assets, self.vault.read(), get_contract_address(),
            );
            self.emit(Withdrawn { amount: amount_assets });
        }

        fn rescue_tokens(ref self: ContractState, token: ContractAddress, to: ContractAddress, amount: u256) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            if token == self.asset.read() {
                assert(to == self.vault.read(), 'asset-only-vault');
            }
            // Operational safety escape hatch for demo/hackathon incidents.
            IERC20Dispatcher { contract_address: token }.transfer(to, amount);
        }

        fn is_configured(self: @ContractState) -> bool {
            // mock for now
            true
        }

        fn get_pool(self: @ContractState) -> ContractAddress {
            self.pool.read()
        }

        fn get_asset(self: @ContractState) -> ContractAddress {
            self.asset.read()
        }

        fn get_v_token(self: @ContractState) -> ContractAddress {
            self.v_token.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_vault(self: @ContractState) {
            assert(get_caller_address() == self.vault.read(), 'only-vault');
        }
    }
}
