#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${CIRCUITS_DIR}/.." && pwd)"
CONTRACTS_DIR="${REPO_ROOT}/contracts"

GARAGA_SYSTEM="${GARAGA_SYSTEM:-ultra_keccak_zk_honk}"
VERIFIER_TARGET="${VERIFIER_TARGET:-evm}"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/generate-garaga-verifier.sh <deposit|withdraw|all>

Environment overrides:
  GARAGA_SYSTEM     Proof system for garaga gen (default: ultra_keccak_zk_honk)
  VERIFIER_TARGET   bb verifier target (default: evm)
  BB_BIN            Explicit bb binary path/command to use

What this script does:
  1. Ensures target/<circuit>.json exists (compiles with nargo if missing)
  2. Generates VK with bb write_vk
  3. Runs garaga gen to scaffold a Cairo verifier project
  4. Writes verifier projects to:
     contracts/garaga-verifiers/lethe_<circuit>_verifier
EOF
}

pick_bb() {
  if [[ -n "${BB_BIN:-}" ]]; then
    BB_CMD=("${BB_BIN}")
    return
  fi

  if command -v bb >/dev/null 2>&1; then
    BB_CMD=(bb)
    return
  fi

  if [[ -x "${REPO_ROOT}/webapp/node_modules/.bin/bb" ]]; then
    BB_CMD=("${REPO_ROOT}/webapp/node_modules/.bin/bb")
    return
  fi

  if [[ -x "${CIRCUITS_DIR}/node_modules/.bin/bb" ]]; then
    BB_CMD=("${CIRCUITS_DIR}/node_modules/.bin/bb")
    return
  fi

  echo "Error: bb not found. Install @aztec/bb.js or expose bb in PATH." >&2
  exit 1
}

bb_supports_starknet_target() {
  local bb_help
  bb_help="$("${BB_CMD[@]}" --help 2>/dev/null || true)"
  if echo "${bb_help}" | grep -q "Starknet Garaga Extensions: enabled"; then
    return 0
  fi
  return 1
}

bb_supports_verifier_target_flag() {
  local help_text
  help_text="$("${BB_CMD[@]}" write_vk --help 2>/dev/null || true)"
  if echo "${help_text}" | grep -q "verifier_target"; then
    return 0
  fi
  return 1
}

bb_args_for_target() {
  local target="$1"
  local args=()

  if bb_supports_verifier_target_flag; then
    args+=(-t "${target}")
  else
    # Nightly bb CLI uses --oracle_hash/--disable_zk instead of --verifier_target.
    case "${target}" in
      evm)
        args+=(--oracle_hash keccak)
        ;;
      evm-no-zk)
        args+=(--oracle_hash keccak --disable_zk)
        ;;
      starknet)
        args+=(--oracle_hash starknet)
        ;;
      starknet-no-zk)
        args+=(--oracle_hash starknet --disable_zk)
        ;;
      noir-recursive|noir-rollup)
        args+=(--oracle_hash poseidon2)
        ;;
      noir-recursive-no-zk|noir-rollup-no-zk)
        args+=(--oracle_hash poseidon2 --disable_zk)
        ;;
      *)
        # Safe default for unknown values.
        args+=(--oracle_hash keccak)
        ;;
    esac
  fi

  echo "${args[*]}"
}

ensure_deps() {
  if ! command -v nargo >/dev/null 2>&1; then
    echo "Error: nargo not found in PATH." >&2
    exit 1
  fi

  if ! command -v garaga >/dev/null 2>&1; then
    echo "Error: garaga not found in PATH. Install with: pip install garaga==1.0.1" >&2
    exit 1
  fi

  # Ensure garaga CLI can actually bootstrap (catches typer mismatches early).
  if ! garaga --help >/dev/null 2>&1; then
    echo "Error: garaga CLI failed to start. This is often caused by an incompatible typer version." >&2
    echo "Try: pip install --upgrade 'typer>=0.12,<1' 'click>=8.1,<9' garaga==1.0.1" >&2
    exit 1
  fi

  if ! command -v scarb >/dev/null 2>&1; then
    echo "Error: scarb not found in PATH. Garaga needs it to format/generated Cairo projects." >&2
    echo "Install with scarbup, then ensure 'scarb --version' works." >&2
    exit 1
  fi

  if ! scarb --version >/dev/null 2>&1; then
    echo "Error: scarb is present but not executable in this shell (asdf/shim config issue)." >&2
    echo "Ensure a version is active (e.g. asdf local scarb 2.13.1 or scarbup default)." >&2
    exit 1
  fi
}

print_tool_versions() {
  echo "Using bb binary: ${BB_CMD[*]}"
  "${BB_CMD[@]}" --version || true
  nargo --version || true
}

generate_for_circuit() {
  local circuit="$1"
  local circuit_artifact="${CIRCUITS_DIR}/target/${circuit}.json"
  local circuit_target_dir="${CIRCUITS_DIR}/target/garaga/${circuit}"
  local vk_out_dir="${circuit_target_dir}/vk_data"
  local vk_path=""
  local project_name="lethe_${circuit}_verifier"
  local output_parent="${CONTRACTS_DIR}/garaga-verifiers"
  local output_project_dir="${output_parent}/${project_name}"

  if [[ ! -f "${circuit_artifact}" ]]; then
    echo "Compiling missing artifact for ${circuit}..."
    (cd "${CIRCUITS_DIR}" && nargo compile --package "${circuit}")
  fi

  mkdir -p "${circuit_target_dir}"
  if [[ -d "${output_project_dir}" ]]; then
    echo "Removing existing ${output_project_dir}..."
    rm -rf "${output_project_dir}"
  fi
  mkdir -p "${output_parent}"

  echo "Generating VK for ${circuit}..."
  local target_args
  target_args="$(bb_args_for_target "${VERIFIER_TARGET}")"
  # shellcheck disable=SC2206
  local target_args_array=( ${target_args} )
  "${BB_CMD[@]}" write_vk \
    -b "${circuit_artifact}" \
    -o "${vk_out_dir}" \
    "${target_args_array[@]}"

  # bb write_vk writes files "vk" and "vk_hash" under the output directory.
  # Some older bb versions may write directly to the provided path, so support both.
  if [[ -f "${vk_out_dir}/vk" ]]; then
    vk_path="${vk_out_dir}/vk"
  elif [[ -f "${vk_out_dir}" ]]; then
    vk_path="${vk_out_dir}"
  else
    echo "Error: could not locate generated VK output." >&2
    exit 1
  fi

  echo "Generating Garaga verifier project for ${circuit}..."
  (
    cd "${output_parent}"
    garaga gen \
      --system "${GARAGA_SYSTEM}" \
      --vk "${vk_path}" \
      --project-name "${project_name}"
  )

  echo "Done: ${output_project_dir}"
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -eq 0 ]]; then
    usage
    exit 0
  fi

  ensure_deps
  pick_bb
  print_tool_versions

  if [[ "${VERIFIER_TARGET}" == "starknet" || "${VERIFIER_TARGET}" == "starknet-no-zk" ]]; then
    if ! bb_supports_starknet_target; then
      echo "Warning: current bb binary does not support Starknet Garaga extensions." >&2
      echo "Warning: falling back VERIFIER_TARGET=evm for compatible ultra_keccak_zk_honk VK generation." >&2
      VERIFIER_TARGET="evm"
    fi
  fi

  case "${1}" in
    deposit)
      generate_for_circuit deposit
      ;;
    withdraw)
      generate_for_circuit withdraw
      ;;
    all)
      generate_for_circuit deposit
      generate_for_circuit withdraw
      ;;
    *)
      echo "Error: invalid argument '${1}'" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
