use starknet::ContractAddress;

#[starknet::interface]
pub trait IMockVToken<ContractState> {
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
pub mod MockVToken {
    use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::IMockVToken;

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        asset: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
    }

    #[constructor]
    fn constructor(ref self: ContractState, asset: ContractAddress) {
        self.erc20.initializer("MockVToken", "MVTOKEN");
        self.asset.write(asset);
    }

    impl ERC20ImmutableConfig of ERC20Component::ImmutableConfig {
        const DECIMALS: u8 = 6;
    }

    #[abi(embed_v0)]
    impl MockVTokenImpl of IMockVToken<ContractState> {
        fn convert_to_assets(self: @ContractState, shares: u256) -> u256 {
            // 1:1 conversion for test and local deployment scenarios.
            shares
        }

        fn deposit(ref self: ContractState, assets: u256, receiver: ContractAddress) -> u256 {
            assert(assets > 0, 'zero-assets');

            let caller = get_caller_address();
            let token = IERC20Dispatcher { contract_address: self.asset.read() };
            let this = get_contract_address();

            token.transfer_from(caller, this, assets);
            self.erc20.mint(receiver, assets);
            assets
        }

        fn withdraw(
            ref self: ContractState,
            assets: u256,
            receiver: ContractAddress,
            owner: ContractAddress,
        ) -> u256 {
            assert(assets > 0, 'zero-assets');
            assert(get_caller_address() == owner, 'only-owner');

            let token = IERC20Dispatcher { contract_address: self.asset.read() };
            self.erc20.burn(owner, assets);
            token.transfer(receiver, assets);
            assets
        }
    }
}
