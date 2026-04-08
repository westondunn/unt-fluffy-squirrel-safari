#!/usr/bin/env bash
# Codex environment bootstrap
# Ensures all tools needed for quality gates are available

set -euo pipefail

echo "Setting up quality gate environment..."

# Install yq if not present
if ! command -v yq &>/dev/null; then
  echo "Installing yq..."
  if [[ "$(uname -s)" == "Linux" ]]; then
    sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
    sudo chmod +x /usr/local/bin/yq
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    brew install yq
  else
    echo "Please install yq manually: https://github.com/mikefarah/yq#install"
  fi
fi

# Install npm dependencies
echo "Installing npm dependencies..."
npm ci

# Make gate scripts executable
echo "Setting gate script permissions..."
chmod +x scripts/gates/*.sh

echo "Setup complete. Run quality gates with: bash scripts/gates/run-gate.sh --all"
