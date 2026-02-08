use starknet::ContractAddress;

#[starknet::interface]
pub trait IVault<ContractState> {
    fn get_total_shares(self: @ContractState) -> u256;
    fn get_share_unit_price(self: @ContractState) -> u256;
    fn deposit(ref self: ContractState, proof: Array<felt252>);
    fn withdraw(
        ref self: ContractState,
        proof: Array<felt252>,
        root: felt252,
        nullifier_hash: felt252,
        k_units: u256,
        w_units: u256,
        recipient: ContractAddress,
        new_commitment: u256
    );
}

#[starknet::contract]
mod Vault {
    use contracts::nullifier_registry::{INullifierRegistryDispatcher, INullifierRegistryDispatcherTrait};
    use contracts::merkle_tree::{IMerkleTreeDispatcher, IMerkleTreeDispatcherTrait};
    use contracts::verifier::{IVerifierDispatcher, IVerifierDispatcherTrait};
    use openzeppelin::interfaces::upgrades::IUpgradeable;
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::upgrades::UpgradeableComponent;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
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

    // 0.00001 share or 10^-5 atoms
    // this is the smallest unit a user can buy or sell
    const UNIT_ATOMS: u256 = 100000;
    const BTC_ATOMS: u256 = 100000000;

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
        deposit_verifier_address: ContractAddress,
        withdraw_verifier_address: ContractAddress,
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
        UpgradeableEvent: UpgradeableComponent::Event
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        nullifier_registry: ContractAddress,
        merkle_tree: ContractAddress,
        deposit_verifier: ContractAddress,
        withdraw_verifier: ContractAddress,
        wbtc: ContractAddress,
    ) {
        self.accesscontrol.initializer();
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, admin);
        self.nullifier_registry_address.write(nullifier_registry);
        self.tree_address.write(merkle_tree);
        self.wbtc_contract.write(IERC20Dispatcher {contract_address: wbtc});
        self.deposit_verifier_address.write(deposit_verifier);
        self.withdraw_verifier_address.write(withdraw_verifier);

        self.total_shares.write(0);
    }

    #[abi(embed_v0)]
    impl VaultImpl of super::IVault<ContractState> {
        fn get_total_shares(self: @ContractState) -> u256 {
            self.total_shares.read()
        }

        fn get_share_unit_price(self: @ContractState) -> u256 {
            let total_shares = self.get_total_shares();
            if total_shares == 0 {
                return 0;
            }
            let wbtc_in_contract = self.get_total_assets();
            (wbtc_in_contract * UNIT_ATOMS) / total_shares
        }

        fn deposit(ref self: ContractState, proof: Array<felt252>) {
            let mut total_shares = self.total_shares.read();
            let total_assets = self.get_total_assets();

            let proof_result = self.verify_deposit_proof(proof.span());
            let commitment = *proof_result.at(1);
            let k_units = *proof_result.at(0);

            let amount_btc_sats: u256 =
                if total_shares == 0 {
                    k_units * BTC_ATOMS / UNIT_ATOMS
                } else {
                    // Normal pricing
                    (k_units * total_assets) / total_shares
                };

            self.wbtc_contract.read().transfer_from(
                get_caller_address(), get_contract_address(), amount_btc_sats
            );

            total_shares = total_shares + k_units;
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
            new_commitment: u256
        ) {
            assert(!self.is_nullifier_spent(nullifier_hash), 'Nullifier already spent');
            assert(self.is_valid_root(root), 'Invalid root');
            assert(w_units > 0, 'w units less than 0');

            let proof_result = self.verify_withdraw_proof(proof.span());

            self.mark_nullifier_as_spent(nullifier_hash);

            let total_shares = self.total_shares.read();
            let total_assets = self.get_total_assets();

            let shares_to_withdraw: u256 = w_units * UNIT_ATOMS;
            assert(shares_to_withdraw <= total_shares, 'Not enough shares to withdraw');
            let payout = (shares_to_withdraw * total_assets) / total_shares;

            self.total_shares.write(total_shares - shares_to_withdraw);

            self.wbtc_contract.read().transfer(
                recipient, payout
            );

            if (w_units < k_units) {
                // Mint a new commitment for the remaining shares
                self.insert_commitment(new_commitment);
            }

            assert(shares_to_withdraw > 0, 'shares is less than 0');
            
        }
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            // This function can only be called by the owner
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            // Replace the class hash upgrading the contract
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {

        fn get_total_assets(self: @ContractState) -> u256 {
            let token_holder = get_contract_address();
            let amount_tokens = self.wbtc_contract.read().balance_of(token_holder);
            amount_tokens
        }

        fn insert_commitment(ref self: ContractState, commitment: u256) {
            let tree = IMerkleTreeDispatcher {
                contract_address: self.tree_address.read(),
            };
            tree.insert(commitment);
        }

        fn is_nullifier_spent(ref self: ContractState, nullifier_hash: felt252) -> bool {
            let nullifier_registry = INullifierRegistryDispatcher {
                contract_address: self.nullifier_registry_address.read(),
            };
            nullifier_registry.is_spent(nullifier_hash)
        }

        fn mark_nullifier_as_spent(ref self: ContractState, nullifier_hash: felt252) {
            let nullifier_registry = INullifierRegistryDispatcher {
                contract_address: self.nullifier_registry_address.read(),
            };
            nullifier_registry.mark_as_spent(nullifier_hash);
        }

        fn is_valid_root(ref self: ContractState, root: felt252) -> bool {
            let mut tree = IMerkleTreeDispatcher {
                contract_address: self.tree_address.read(),
            };
            tree.is_valid_root(root)
        }

        fn verify_deposit_proof(ref self: ContractState, proof: Span<felt252>) -> Span<u256> {
            let verifier = IVerifierDispatcher {
                contract_address: self.deposit_verifier_address.read(),
            };
            let result = verifier.verify_ultra_keccak_zk_honk_proof(proof);
            assert(result.is_ok(), 'Deposit proof is invalid');
            return result.unwrap();
        }

        fn verify_withdraw_proof(ref self: ContractState, proof: Span<felt252>) -> Span<u256> {
            let verifier = IVerifierDispatcher {
                contract_address: self.withdraw_verifier_address.read(),
            };
            let result = verifier.verify_ultra_keccak_zk_honk_proof(proof);
            assert(result.is_ok(), 'Withdraw proof is invalid');
            return result.unwrap();
        }
        
    }

}
