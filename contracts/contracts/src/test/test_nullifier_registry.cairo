mod test_nullifier_registry {
    use contracts::nullifier_registry::{INullifierRegistryDispatcher, INullifierRegistryDispatcherTrait};
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

    fn deploy_nullifier_registry() -> INullifierRegistryDispatcher {
        let contract = declare("NullifierRegistry").unwrap().contract_class();

        let mut calldata: Array<felt252> = array![];
        calldata.append_serde(OWNER()); // admin

        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        let nullifier_registry = INullifierRegistryDispatcher { contract_address };

        nullifier_registry
    }

    #[test]
    fn test_insert() {
        let nullifier_registry = deploy_nullifier_registry();

        cheat_caller_address(nullifier_registry.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        nullifier_registry.set_vault_address(VAULT());

        cheat_caller_address(nullifier_registry.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        let nullifier_hash = 0x1234567890abcdef;
        let is_spent = nullifier_registry.is_spent(nullifier_hash);
        assert(!is_spent, 'Nullifier should not be spent');

        cheat_caller_address(nullifier_registry.contract_address, VAULT(), CheatSpan::TargetCalls(1));
        nullifier_registry.mark_as_spent(nullifier_hash);

        cheat_caller_address(nullifier_registry.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        assert(nullifier_registry.is_spent(nullifier_hash), 'Nullifier should be spent');
    }
}