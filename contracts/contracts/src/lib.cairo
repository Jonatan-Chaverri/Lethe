mod merkle_tree;
mod nullifier_registry;
mod verifier;
mod vault;

#[cfg(test)]
mod mocks {
    pub mod mock_wbtc;
}

#[cfg(test)]
mod test {
    mod test_merkle_tree;
    mod test_nullifier_registry;
    mod test_vault;
}