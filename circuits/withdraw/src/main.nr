global DOMAIN_COMMITMENT: Field = 0;
global DOMAIN_LEAF: Field = 1;
global DOMAIN_NODE: Field = 2;
global DEPTH: u32 = 20;

fn hash_commitment(secret: Field, nullifier: Field, k_units: u64) -> Field {
    let input: [Field; 4] = [DOMAIN_COMMITMENT, secret, nullifier, k_units as Field];
    dep::std::hash::pedersen_hash(input)
}

fn hash_leaf(commitment: Field) -> Field {
    let (commitment_low, commitment_high) = dep::std::field::bn254::decompose(commitment);
    let state: [Field; 4] = [DOMAIN_LEAF, commitment_low, commitment_high, 0];
    let output = dep::std::hash::poseidon2_permutation(state, 4);
    output[0]
}

fn hash_node(left: Field, right: Field) -> Field {
    let state: [Field; 4] = [DOMAIN_NODE, left, right, 0];
    let output = dep::std::hash::poseidon2_permutation(state, 4);
    output[0]
}

fn compute_root(leaf: Field, path_elements: [Field; DEPTH], path_indices: [bool; DEPTH]) -> Field {
    let mut hash = leaf;

    for i in 0..DEPTH {
        let sibling = path_elements[i];
        let is_right = path_indices[i];
        let left = if is_right { sibling } else { hash };
        let right = if is_right { hash } else { sibling };
        hash = hash_node(left, right);
    }

    hash
}

// Withdraw circuit for private notes
//
// Public inputs:
// - root: Merkle root
// - nullifier_hash: Poseidon(nullifier)
// - k_units: note size in fixed share units
// - w_units: amount to withdraw in fixed share units
// - new_commitment: commitment for the remaining note (k_units - w_units)
fn main(
    // Private inputs
    secret: Field,
    nullifier: Field,
    path_elements: [Field; DEPTH],
    path_indices: [bool; DEPTH],
    new_secret: Field,
    new_nullifier: Field,

    // Public inputs
    root: pub Field,
    nullifier_hash: pub Field,
    k_units: pub u64,
    w_units: pub u64,
) -> pub Field {
    assert(w_units <= k_units);
    let remaining_units = k_units - w_units;

    let commitment = hash_commitment(secret, nullifier, k_units);
    let leaf = hash_leaf(commitment);
    let computed_root = compute_root(leaf, path_elements, path_indices);
    assert(computed_root == root);

    let computed_nullifier_hash = dep::std::hash::pedersen_hash([nullifier]);
    assert(computed_nullifier_hash == nullifier_hash);

    let new_commitment = hash_commitment(new_secret, new_nullifier, remaining_units);
    new_commitment
}

#[test]
fn test_withdraw_merkle_membership() {
    let secret = 1111;
    let nullifier = 2222;
    let k_units: u64 = 10;
    let w_units: u64 = 4;
    let new_secret = 3333;
    let new_nullifier = 4444;

    let commitment = hash_commitment(secret, nullifier, k_units);
    let leaf = hash_leaf(commitment);

    let mut path_elements: [Field; DEPTH] = [0; DEPTH];
    let mut path_indices: [bool; DEPTH] = [false; DEPTH];
    for i in 0..DEPTH {
        path_elements[i] = (i as Field) + 123;
        path_indices[i] = (i % 2) == 1;
    }

    let root = compute_root(leaf, path_elements, path_indices);
    let nullifier_hash = dep::std::hash::pedersen_hash([nullifier]);

    let out = main(
        secret,
        nullifier,
        path_elements,
        path_indices,
        new_secret,
        new_nullifier,
        root,
        nullifier_hash,
        k_units,
        w_units
    );

    let expected = hash_commitment(new_secret, new_nullifier, k_units - w_units);
    assert(out == expected);
}
