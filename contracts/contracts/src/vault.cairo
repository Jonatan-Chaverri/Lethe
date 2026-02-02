#[starknet::interface]
pub trait IVault<ContractState> {
    fn set_merkle_tree(ref self: ContractState, tree: ContractAddress);
    fn get_total_shares(ref self: ContractState) -> u256;
    fn get_share_price(ref self: ContractState) -> u256;
    fn get_unit_price(ref self: ContractState) -> u256;
    fn deposit(ref self: ContractState, amount: u256, commitment: felt252);
    fn withdraw(ref self: ContractState, proof: Array<felt252>, root: felt252, nullifier_hash: felt252, k_units: u256, w_units: u256, recipient: ContractAddress, new_commitment: felt252);
}

[starknet::contract]
mod Vault {
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::interfaces::upgrades::IUpgradeable;
    use starknet::event::EventEmitter;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess, StoragePathEntry, Vec, MutableVecTrait, VecTrait
    };
    use starknet::{ClassHash, ContractAddress, get_caller_address, get_contract_address};

    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    // SRC5
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    // Access Control
    #[abi(embed_v0)]
    impl AccessControlImpl =
        AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;

    // Upgradeable
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;


    const UNIT_ATOMS: u256 = 10**13;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        total_shares: u256,
        tree_address: ContractAddress,
        nullifier_registry_address: ContractAddress,
        wbtc_contract: IERC20Dispatcher,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        CommitmentInserted: CommitmentInserted,
    }

    // Emitted when a product is listed to the Marketplace
    #[derive(Drop, PartialEq, starknet::Event)]
    struct CommitmentInserted {
        commitment: felt252,
        leaf_index: u64,
        new_root: felt252
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        nullifier_registry: ContractAddress,
        wbtc: ContractAddress
    ) {
        self.accesscontrol.initializer();
        self.accesscontrol.grant_role(DEFAULT_ADMIN_ROLE, admin);
        self.nullifier_registry_address.write(nullifier_registry);
        self.wbtc_address.write(IERC20Dispatcher {contract_address: wbtc});
        self.total_shares.write(0);
    }

    #[abi(embed_v0)]
    impl VaultImpl of super::IVault<ContractState> {
        fn set_merkle_tree(ref self: ContractState, tree: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            self.tree_address.write(tree);
        }

        fn get_total_shares(ref self: ContractState) -> u256 {
            self.total_shares.read()
        }

        fn get_share_price(ref self: ContractState) -> u256 {
            let total_shares = self.get_total_shares();
            let total_assets = self.get_total_assets();
            total_assets / total_shares
        }

        fn get_unit_price(ref self: ContractState) -> u256 {
            let total_shares = self.get_total_shares();
            let total_assets = self.get_total_assets();
            (total_assets * UNIT_ATOMS) / total_shares
        }

        fn deposit(ref self: ContractState, amount: u256, commitment: felt252) {
            let mut total_shares = self.total_shares.read();
            let total_assets = self.get_total_assets();

            let mut minted_shares: u256 = 0;
            if total_shares == 0 {
                minted_shares = amount;
            } else {
                minted_shares = (amount * total_shares) / total_assets;
            }

            let k = minted_shares / UNIT_ATOMS;
            assert(k > 0, 'Must buy at least one share');

            self.wbtc_contract.read().transfer_from(
                get_caller_address(), self.get_contract_address(), amount
            );

            total_shares = total_shares + (k * UNIT_ATOMS);
            self.total_shares.write(total_shares);

            self.insert_commitment(commitment);
        }

        fn withdraw(
            ref self: ContractState,
            proof: Array<felt252>,
            root: felt252,
            nullifier_hash: felt252,
            k_units: u256,
            w_units: u256, 
            recipient: ContractAddress,
            new_commitment: felt252
        ) {
            let total_shares = self.total_shares.read();
            let total_assets = self.get_total_assets();

            let shares_to_withdraw = w_units * UNIT_ATOMS;
            let payout = (shares_to_withdraw * total_assets) / total_shares;

            self.total_shares.write(total_shares - shares_to_withdraw);

            self.wbtc_contract.read().transfer(
                recipient, payout
            );

            if (w_units < k_units) {
                // Mint a new commitment for the remaining shares
                self.insert_commitment(new_commitment);
            }

            assert(shares_to_withdraw > 0, 'Must withdraw at least one share');
            
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {

        fn get_total_assets(ref self: ContractState) -> u256 {
            let token_holder = get_contract_address();
            let amount_tokens = self.wbtc_contract.read().balance_of(token_holder);
            amount_tokens
        }

        fn insert_commitment(ref self: ContractState, commitment: felt252) {
            let tree = IMerkleTreeDispatcher {
                contract_address: self.tree_address.read(),
            };
            tree.insert(commitment);
        }
    }

}
