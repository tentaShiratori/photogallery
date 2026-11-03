#!/usr/bin/env bash
# Idempotent Cloud Agent install: mise tools + shims on PATH + pnpm deps.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PATH="${HOME}/.local/bin:${PATH}"

if ! command -v mise >/dev/null 2>&1; then
  curl -fsSL https://mise.jdx.dev/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

mise install

SHIMS_DIR="${HOME}/.local/share/mise/shims"
MARKER="# photogallery-cloud-agent: mise shims"

append_mise_shims_path() {
  local file="$1"
  touch "$file"
  if grep -qF "$MARKER" "$file" 2>/dev/null; then
    return 0
  fi
  {
    printf '\n%s\n' "$MARKER"
    printf 'export PATH="%s:$PATH"\n' "$SHIMS_DIR"
  } >> "$file"
}

append_mise_shims_path "${HOME}/.bashrc"
append_mise_shims_path "${HOME}/.profile"

# Cloud Agent tool shells often skip rc files. ~/.local/bin is already on PATH.
mkdir -p "${HOME}/.local/bin"
for shim in "${SHIMS_DIR}"/*; do
  [[ -e "$shim" ]] || continue
  ln -sfn "$shim" "${HOME}/.local/bin/$(basename "$shim")"
done

# This install process still needs the shims before the next shell starts.
export PATH="${SHIMS_DIR}:${PATH}"

if [[ -f pnpm-lock.yaml ]]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi
