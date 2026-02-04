use elgamal::{public_key, encrypt};
use std::embedded_curve_ops::EmbeddedCurvePoint;

struct Point {
    x: Field,
    y: Field
}

// This program generates valid test data for JavaScript proof generation
// Run with: nargo execute
// Output will be in target/test_data_generator.json (witness values)
fn main(
    sender_priv_key: Field,
    current_balance: Field,
    r_old: Field,
    amount: Field
) -> pub (Point, Point, Point) {
    // Generate public key from private key
    let sender_pubkey = public_key(sender_priv_key);

    // Encrypt current balance
    let old_balance_ct = encrypt(sender_pubkey, current_balance, r_old);

    // Return public key and old balance ciphertext
    let pubkey = Point { x: sender_pubkey.x, y: sender_pubkey.y };
    let old_balance_x1 = Point { x: old_balance_ct.0.x, y: old_balance_ct.0.y };
    let old_balance_x2 = Point { x: old_balance_ct.1.x, y: old_balance_ct.1.y };

    (pubkey, old_balance_x1, old_balance_x2)
}
