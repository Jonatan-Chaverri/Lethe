global DOMAIN_COMMITMENT: Field = 0;

fn hash_commitment(secret: Field, nullifier: Field, k_units: u64) -> Field {
    let input: [Field; 4] = [DOMAIN_COMMITMENT, secret, nullifier, k_units as Field];
    dep::std::hash::pedersen_hash(input)
}

// Deposit circuit: derive a note commitment from private inputs.
// This is useful for proving a commitment was constructed correctly.
fn main(
    secret: Field,
    nullifier: Field,
    k_units: u64
) -> pub Field {
    hash_commitment(secret, nullifier, k_units)
}

#[test]
fn test_commitment_determinism() {
    let secret = 1234;
    let nullifier = 5678;
    let k_units: u64 = 42;

    let expected = hash_commitment(secret, nullifier, k_units);
    let out = main(secret, nullifier, k_units);

    assert(out == expected);
}
