#[starknet::interface]
pub trait IVerifier<ContractState> {
    fn verify_ultra_keccak_zk_honk_proof(ref self: ContractState, proof: Span<felt252>) -> Result<Span<u256>, felt252>;
}
