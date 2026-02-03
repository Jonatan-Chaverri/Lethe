mod test_vault {
    use contracts::vault::{IVaultDispatcher, IVaultDispatcherTrait};
    use contracts::merkle_tree::{IMerkleTreeDispatcher, IMerkleTreeDispatcherTrait};
    use contracts::nullifier_registry::{INullifierRegistryDispatcher, INullifierRegistryDispatcherTrait};
    use contracts::verifier::{IVerifierDispatcher, IVerifierDispatcherTrait};
    use contracts::mocks::mock_wbtc::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
    use openzeppelin::utils::serde::SerializedAppend;
    use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use snforge_std::{
        CheatSpan, ContractClassTrait, DeclareResultTrait, cheat_caller_address, declare,
    };
    use starknet::ContractAddress;

    fn OWNER() -> ContractAddress {
        'OWNER'.try_into().unwrap()
    }

    fn USER() -> ContractAddress {
        'USER'.try_into().unwrap()
    }

    const ONE_E8: u256 = 100000000;

    fn deploy_merkle_tree() -> IMerkleTreeDispatcher {
        let contract = declare("MerkleTree").unwrap().contract_class();

        let mut calldata: Array<felt252> = array![];
        calldata.append_serde(OWNER()); // admin

        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        let merkle_tree = IMerkleTreeDispatcher { contract_address };

        merkle_tree
    }

    fn deploy_nullifier_registry() -> INullifierRegistryDispatcher {
        let contract = declare("NullifierRegistry").unwrap().contract_class();

        let mut calldata: Array<felt252> = array![];
        calldata.append_serde(OWNER()); // admin

        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        let nullifier_registry = INullifierRegistryDispatcher { contract_address };

        nullifier_registry
    }

    fn deploy_verifier() -> IVerifierDispatcher {
        let contract = declare("Verifier").unwrap().contract_class();

        let mut calldata: Array<felt252> = array![];
        calldata.append_serde(OWNER()); // admin

        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        let verifier = IVerifierDispatcher { contract_address };

        verifier
    }
    

    fn deploy_wbtc() -> IMockWBTCDispatcher {
        let contract = declare("MockWBTC").unwrap().contract_class();

        let mut calldata: Array<felt252> = array![];
        calldata.append_serde(OWNER()); // admin
        calldata.append_serde(OWNER()); // minter
        calldata.append_serde(OWNER()); // upgrader

        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        let wbtc = IMockWBTCDispatcher { contract_address };

        wbtc
    }

    fn deploy_vault(
        nullifier: ContractAddress, merkle_tree: ContractAddress, verifier: ContractAddress, wbtc: ContractAddress
    ) -> IVaultDispatcher {
        let contract = declare("Vault").unwrap().contract_class();

        let mut calldata: Array<felt252> = array![];
        calldata.append_serde(OWNER()); // admin
        calldata.append_serde(nullifier);
        calldata.append_serde(merkle_tree);
        calldata.append_serde(verifier);
        calldata.append_serde(wbtc);

        let (contract_address, _) = contract.deploy(@calldata).unwrap();
        let vault = IVaultDispatcher { contract_address };

        vault
    }

    fn deploy_contracts() -> (IVaultDispatcher, IMockWBTCDispatcher) {
        let merkle_tree = deploy_merkle_tree();
        let nullifier_registry = deploy_nullifier_registry();
        let verifier = deploy_verifier();
        let wbtc = deploy_wbtc();
        let vault = deploy_vault(nullifier_registry.contract_address, merkle_tree.contract_address, verifier.contract_address, wbtc.contract_address);

        cheat_caller_address(merkle_tree.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        merkle_tree.set_vault_address(vault.contract_address);

        cheat_caller_address(nullifier_registry.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        nullifier_registry.set_vault_address(vault.contract_address);

        (vault, wbtc)
    }

    fn mint_wbtc(wbtc: IMockWBTCDispatcher, user: ContractAddress, amount: u256) {
        cheat_caller_address(wbtc.contract_address, OWNER(), CheatSpan::TargetCalls(1));
        wbtc.mint(user, amount);
    }

    fn approve_wbtc(wbtc: IMockWBTCDispatcher, user: ContractAddress, receiver: ContractAddress, amount: u256) {
        cheat_caller_address(wbtc.contract_address, user, CheatSpan::TargetCalls(1));
        wbtc.approve(receiver, amount);
    }

    #[test]
    fn test_deposit() {
        let (vault, wbtc) = deploy_contracts();

        let total_shares = vault.get_total_shares();
        assert(total_shares == 0, 'Total shares should be 0');

        cheat_caller_address(vault.contract_address, USER(), CheatSpan::TargetCalls(1));
        let commitment = 0x1234567890abcdef;
        let one_btc = ONE_E8;
        mint_wbtc(wbtc, USER(), one_btc);
        approve_wbtc(wbtc, USER(), vault.contract_address, one_btc);
        vault.deposit(one_btc, commitment);

        cheat_caller_address(vault.contract_address, USER(), CheatSpan::TargetCalls(1));
        let balance_of_wbtc = wbtc.balance_of(vault.contract_address);
        assert(balance_of_wbtc == one_btc, 'Balance of wbtc should be 1e8');

        let total_shares = vault.get_total_shares();
        assert(total_shares == ONE_E8, 'Total shares should be 1e8'); // initial deposit set the shares

        let unit_price = vault.get_share_unit_price();
        assert(unit_price == 100_000, 'Unit price should be 1e5');

        // deposit again
        cheat_caller_address(vault.contract_address, USER(), CheatSpan::TargetCalls(1));
        let commitment = 0x1234567890abcdef2;
        let two_btc = ONE_E8 * 2;
        mint_wbtc(wbtc, USER(), two_btc);
        approve_wbtc(wbtc, USER(), vault.contract_address, two_btc);
        vault.deposit(two_btc, commitment);

        let total_shares = vault.get_total_shares();
        assert(total_shares == ONE_E8 * 3, 'Total shares should be 3e8');

        let unit_price = vault.get_share_unit_price();
        assert(unit_price == 100_000, 'Unit price should be 1e5');

        // simulate yield (+ BTC )
        let yield_btc = ONE_E8;
        mint_wbtc(wbtc, vault.contract_address, yield_btc);

        let total_shares = vault.get_total_shares();
        let current_balance = wbtc.balance_of(vault.contract_address);
        println!("total_shares: {}", total_shares);
        println!("current_balance: {}", current_balance);

        let share_price = vault.get_share_unit_price();
        assert(share_price > 100_000, 'Share price wrong');
    }
}