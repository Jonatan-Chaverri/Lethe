mod test_merkle_tree {
    use contracts::merkle_tree::{IMerkleTreeDispatcher, IMerkleTreeDispatcherTrait};
    use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::utils::serde::SerializedAppend;
    use snforge_std::{
        CheatSpan, ContractClassTrait, DeclareResultTrait, cheat_caller_address, declare,
        start_cheat_caller_address, stop_cheat_caller_address,
    };
    use starknet::ContractAddress;
    use starknet::syscalls::call_contract_syscall;

    fn OWNER() -> ContractAddress {
        'OWNER'.try_into().unwrap()
    }

    fn VAULT() -> ContractAddress {
        'VAULT'.try_into().unwrap()
    }

    fn deploy_merkle_tree() -> IMerkleTreeDispatcher {
        let contract = declare("MerkleTree").unwrap().contract_class();

        let mut calldata: Array<felt252> = array![];
        calldata.append_serde(OWNER()); // admin

        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        let merkle_tree = IMerkleTreeDispatcher { contract_address };

        merkle_tree
    }

    #[test]
    fn test_insert() {
        let merkle_tree = deploy_merkle_tree();

        cheat_caller_address(merkle_tree.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        merkle_tree.set_vault_address(VAULT());

        cheat_caller_address(merkle_tree.contract_address, VAULT(), CheatSpan::TargetCalls(1));
        let first_root = merkle_tree.insert(0x1234567890abcdef);
        assert(first_root != 0, 'First root is 0');

        cheat_caller_address(merkle_tree.contract_address, VAULT(), CheatSpan::TargetCalls(1));
        let second_root = merkle_tree.insert(0xabcdef1234567890);
        assert(first_root != second_root, 'Roots are the same');

        cheat_caller_address(merkle_tree.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        let invalid_root = merkle_tree.is_valid_root(0x1234567890abcdef);
        assert(!invalid_root, 'Roots should be invalid');

        cheat_caller_address(merkle_tree.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        let valid_root_first = merkle_tree.is_valid_root(first_root);
        assert(valid_root_first, 'First root should be valid');

        cheat_caller_address(merkle_tree.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        let valid_root_second = merkle_tree.is_valid_root(second_root);
        assert(valid_root_second, 'Second root should be valid');
    }
}