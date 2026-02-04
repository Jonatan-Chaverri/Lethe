#!/bin/bash
# Clean build artifacts from Noir circuits

echo "Cleaning build artifacts..."

# Remove target directories (compiled circuits and witnesses)
rm -rf */target target

# Optional: Remove proofs directory if it exists
rm -rf proofs/

# Optional: Remove cached dependencies (forces re-download)
# Uncomment if you want to clean dependency cache too:
# rm -rf ~/.nargo/

echo "✓ Cleaned build artifacts successfully"
echo "  - Removed target/ directories"
echo "  - Removed proofs/ (if exists)"
echo ""
echo "Run 'nargo compile' to rebuild"
