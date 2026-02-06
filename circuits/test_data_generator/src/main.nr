global DOMAIN_COMMITMENT: Field = 0;

fn hash_commitment(secret: Field, nullifier: Field, k_units: u64) -> Field {
    let input: [Field; 4] = [DOMAIN_COMMITMENT, secret, nullifier, k_units as Field];
    dep::std::hash::pedersen_hash(input)
}

// Generates note data useful for JS proof generation.
// Run with: nargo execute
// Output will be in target/test_data_generator.json (witness values)
fn main(
    secret: Field,
    nullifier: Field,
    k_units: u64,
    w_units: u64,
    new_secret: Field,
    new_nullifier: Field
) -> pub (Field, Field, Field) {
    let commitment = hash_commitment(secret, nullifier, k_units);
    let nullifier_hash = dep::std::hash::pedersen_hash([nullifier]);
    let remaining_units = k_units - w_units;
    let new_commitment = hash_commitment(new_secret, new_nullifier, remaining_units);

    (commitment, nullifier_hash, new_commitment)
}

#[test]
fn test_generate_data() {
    let secret = 1111;
    let nullifier = 2222;
    let k_units: u64 = 10;
    let w_units: u64 = 4;
    let new_secret = 3333;
    let new_nullifier = 4444;

    let (commitment, nullifier_hash, new_commitment) = main(
        secret,
        nullifier,
        k_units,
        w_units,
        new_secret,
        new_nullifier
    );

    let expected_commitment = hash_commitment(secret, nullifier, k_units);
    let expected_nullifier_hash = dep::std::hash::pedersen_hash([nullifier]);
    let expected_new_commitment = hash_commitment(new_secret, new_nullifier, k_units - w_units);

    assert(commitment == expected_commitment);
    assert(nullifier_hash == expected_nullifier_hash);
    assert(new_commitment == expected_new_commitment);
}
