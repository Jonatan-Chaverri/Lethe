use elgamal::{add_ciphertexts, CipherText, encrypt, public_key, decrypt, verify_embedding};
use std::embedded_curve_ops::EmbeddedCurvePoint;

// ==================== CUSTOM TYPES ====================

// Point without is_infinite flag (matches contract expectations)
struct Point {
    x: Field,
    y: Field
}

// ==================== HELPER FUNCTIONS ====================

// Negate an elliptic curve point by negating its y-coordinate
fn negate_point(p: EmbeddedCurvePoint) -> EmbeddedCurvePoint {
    EmbeddedCurvePoint {
        x: p.x,
        y: 0 - p.y,
        is_infinite: p.is_infinite
    }
}

// Homomorphic subtraction: a - b = a + (-b)
fn subtract_ciphertexts(a: CipherText, b: CipherText) -> CipherText {
    let negated_b = (negate_point(b.0), negate_point(b.1));
    add_ciphertexts(a, negated_b)
}

// ==================== WITHDRAW CIRCUIT ====================
// Allows users to withdraw tokens from their confidential balance
//
// PUBLIC INPUTS/OUTPUTS BYTE LAYOUT (matching Rust contract):
// [0..64]:     sender_pubkey (x: 32, y: 32)
// [64..192]:   old_balance_ct (x1.x: 32, x1.y: 32, x2.x: 32, x2.y: 32)
// [192..320]:  new_balance_ct (x1.x: 32, x1.y: 32, x2.x: 32, x2.y: 32) - OUTPUT
// [320..352]:  sender_address (32)
// [352..384]:  token (32)
// [384..416]:  revealed_amount (32) - OUTPUT
// Total: 416 bytes

fn main(
    // Private inputs (secrets not revealed in proof)
    sender_priv_key: Field,
    r_amount: Field,                // Randomness for encrypting amount

    // Public inputs (visible in proof) - ORDER MATTERS for contract!
    sender_pubkey: pub Point,
    old_balance_x1: pub Point,
    old_balance_x2: pub Point,
    sender_address: pub Field,
    token: pub Field,
    amount: pub Field               // Amount to withdraw (plaintext, so contract can transfer)
) -> pub (Point, Point) {  // Returns new_balance ciphertext (2 Points: x1 and x2)
    // Reconstruct EmbeddedCurvePoint and CipherText from Point structs
    let sender_pubkey_ec = EmbeddedCurvePoint {
        x: sender_pubkey.x,
        y: sender_pubkey.y,
        is_infinite: false
    };

    let old_balance_ct: CipherText = (
        EmbeddedCurvePoint { x: old_balance_x1.x, y: old_balance_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: old_balance_x2.x, y: old_balance_x2.y, is_infinite: false }
    );

    // Enforce range constraints
    amount.assert_max_bit_size::<40>();

    // Verify sender's public key matches their private key
    let computed_sender_pubkey = public_key(sender_priv_key);
    assert(computed_sender_pubkey == sender_pubkey_ec);

    // Encrypt the withdrawal amount under user's public key
    let amount_ct = encrypt(sender_pubkey_ec, amount, r_amount);

    // HOMOMORPHIC SUBTRACTION: new_balance = old_balance - amount
    // This works entirely with encrypted values!
    let new_balance_ct = subtract_ciphertexts(old_balance_ct, amount_ct);

    // Return the new encrypted balance as 2 Points (x1 and x2)
    let new_balance_x1 = Point { x: new_balance_ct.0.x, y: new_balance_ct.0.y };
    let new_balance_x2 = Point { x: new_balance_ct.1.x, y: new_balance_ct.1.y };

    (new_balance_x1, new_balance_x2)
}

// ==================== TESTS ====================

#[test]
fn test_withdraw_basic() {
    // Setup: User with 1000 tokens wants to withdraw 200
    let sender_priv_key = 42;
    let sender_pubkey = public_key(sender_priv_key);

    let current_balance = 1000;
    let amount = 200;
    let expected_new_balance = 800;

    // Encrypt current balance
    let r_old = 111;
    let old_balance_ct = encrypt(sender_pubkey, current_balance, r_old);

    // Randomness for encrypting amount
    let r_amount = 222;

    // Call circuit - it will compute and return the new balance
    let (returned_new_balance_x1, returned_new_balance_x2) = main(
        sender_priv_key,
        r_amount,
        Point { x: sender_pubkey.x, y: sender_pubkey.y },
        Point { x: old_balance_ct.0.x, y: old_balance_ct.0.y },
        Point { x: old_balance_ct.1.x, y: old_balance_ct.1.y },
        1, // sender address
        3, // token address
        amount
    );

    // Reconstruct returned balance as CipherText to verify
    let returned_new_balance_ct: CipherText = (
        EmbeddedCurvePoint { x: returned_new_balance_x1.x, y: returned_new_balance_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: returned_new_balance_x2.x, y: returned_new_balance_x2.y, is_infinite: false }
    );

    // Verify: returned new balance decrypts correctly
    let decrypted_new_balance = decrypt(returned_new_balance_ct, sender_priv_key);
    verify_embedding(decrypted_new_balance, expected_new_balance);
}

#[test]
fn test_withdraw_all_balance() {
    // Setup: User withdraws entire balance
    let sender_priv_key = 42;
    let sender_pubkey = public_key(sender_priv_key);

    let current_balance = 500;
    let amount = 500;

    let r_old = 111;
    let old_balance_ct = encrypt(sender_pubkey, current_balance, r_old);

    let r_amount = 222;

    // Call circuit - it will compute and return the new balance
    let (returned_new_balance_x1, returned_new_balance_x2) = main(
        sender_priv_key,
        r_amount,
        Point { x: sender_pubkey.x, y: sender_pubkey.y },
        Point { x: old_balance_ct.0.x, y: old_balance_ct.0.y },
        Point { x: old_balance_ct.1.x, y: old_balance_ct.1.y },
        1,
        3,
        amount
    );

    // Reconstruct returned balance as CipherText to verify
    let returned_new_balance_ct: CipherText = (
        EmbeddedCurvePoint { x: returned_new_balance_x1.x, y: returned_new_balance_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: returned_new_balance_x2.x, y: returned_new_balance_x2.y, is_infinite: false }
    );

    // Verify: returned new balance decrypts to 0 (withdrew everything)
    let decrypted_new_balance = decrypt(returned_new_balance_ct, sender_priv_key);
    verify_embedding(decrypted_new_balance, 0);
}

