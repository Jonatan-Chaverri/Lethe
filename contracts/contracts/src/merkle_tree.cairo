use starknet::ContractAddress;

#[starknet::interface]
pub trait IMerkleTree<ContractState> {
    fn set_vault_address(ref self: ContractState, vault: ContractAddress);
    fn is_valid_root(ref self: ContractState, root: felt252) -> bool;
    fn insert(ref self: ContractState, commitment: u256) -> felt252;
}


#[starknet::contract]
mod MerkleTree {
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::interfaces::upgrades::IUpgradeable;
    use starknet::event::EventEmitter;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess
    };
    use starknet::{ClassHash, ContractAddress, get_caller_address};

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


    const DEPTH: u64 = 20;
    const MAX_LEAVES: u64 = 1048576;
    const MAX_ROOTS: u64 = 10;

    const DOMAIN_LEAF: felt252 = 1;
    const DOMAIN_NODE: felt252 = 2;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        next_leaf_index: u64,
        current_root: felt252,
        filled_subtrees: Map<u64, felt252>,
        zero_hashes: Map<u64, felt252>,
        valid_roots: Map<u64, felt252>,
        rotation: u64,
        vault_address: ContractAddress,
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
        commitment: u256,
        leaf_index: u64,
        new_root: felt252
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.accesscontrol.initializer();
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, admin);
        self.init_zero_hashes();
        self.current_root.write(self.zero_hashes.read(DEPTH - 1));
    }

    #[abi(embed_v0)]
    impl MerkleTreeImpl of super::IMerkleTree<ContractState> {
        fn set_vault_address(ref self: ContractState, vault: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            self.vault_address.write(vault);
        }

        fn is_valid_root(ref self: ContractState, root: felt252) -> bool {
            if self.current_root.read() == root {
                return true;
            }
            for i in 0..MAX_ROOTS {
                if self.valid_roots.read(i) == root {
                    return true;
                }
            }
            false
        }

        fn insert(ref self: ContractState, commitment: u256) -> felt252 {
            assert(self.vault_address.read() == get_caller_address(), 'Caller is not vault');
            let mut index = self.next_leaf_index.read();
            assert(index < MAX_LEAVES, 'Index out of bounds');
            self.next_leaf_index.write(index + 1);

            let mut hash = self.hash_leaf(commitment);

            for level in 0..DEPTH {
                let mut left: felt252 = 0;
                let mut right: felt252 = 0;

                if index % 2 == 0 {
                    left = hash;
                    right = self.zero_hashes.read(level);
                    self.filled_subtrees.write(level, hash);
                } else {
                    left = self.filled_subtrees.read(level);
                    right = hash;
                }

                hash = self.hash_node(left, right);
                index = index / 2;
            }

            self.emit(CommitmentInserted {
                commitment: commitment,
                leaf_index: index,
                new_root: hash
            });

            self.current_root.write(hash);
            // rotation is the index of the valid roots to replace next
            let r = self.rotation.read();
            self.valid_roots.write(r % MAX_ROOTS, hash);
            self.rotation.write(r + 1);
            hash
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

        fn init_zero_hashes(ref self: ContractState) {
            self.zero_hashes.write(0, self.hash_leaf(0));
        
            for i in 1..DEPTH {
                let prev = self.zero_hashes.read(i - 1);
                self.zero_hashes.write(
                    i,
                    self.hash_node(prev, prev)
                );
            }
        }

        fn hash_leaf(self: @ContractState, commitment: u256) -> felt252 {
            core::poseidon::poseidon_hash_span(
                [DOMAIN_LEAF, commitment.low.into(), commitment.high.into()].span()
            )
        }

        fn hash_node(self: @ContractState, left: felt252, right: felt252) -> felt252 {
            core::poseidon::poseidon_hash_span(
                [DOMAIN_NODE, left, right].span()
            )
        }
    }
}