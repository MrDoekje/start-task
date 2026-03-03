#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/cli.js"
LINK_NAME="start-task"

# --- Detect target bin directory ---

if [ "$(uname)" = "Darwin" ]; then
  BIN_DIR="$HOME/.local/bin"
elif [ "$(uname)" = "Linux" ]; then
  BIN_DIR="$HOME/.local/bin"
else
  # Windows (Git Bash / MSYS2)
  BIN_DIR="$HOME/bin"
fi

mkdir -p "$BIN_DIR"

# --- Create symlink ---

LINK_PATH="$BIN_DIR/$LINK_NAME"

if [ -L "$LINK_PATH" ] || [ -e "$LINK_PATH" ]; then
  echo "Removing existing $LINK_PATH"
  rm "$LINK_PATH"
fi

ln -s "$CLI" "$LINK_PATH"
echo "Linked $LINK_PATH -> $CLI"

# --- Ensure bin directory is in PATH ---

add_to_path() {
  local rc_file="$1"
  local export_line="export PATH=\"$BIN_DIR:\$PATH\""

  if [ -f "$rc_file" ] && grep -qF "$BIN_DIR" "$rc_file"; then
    echo "$BIN_DIR already in PATH via $rc_file"
    return
  fi

  # Check if already in current PATH
  if echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
    echo "$BIN_DIR already in PATH"
    return
  fi

  echo "" >> "$rc_file"
  echo "# Added by start-task installer" >> "$rc_file"
  echo "$export_line" >> "$rc_file"
  echo "Added $BIN_DIR to PATH in $rc_file"
  echo "Run: source $rc_file  (or open a new terminal)"
}

# Detect shell config file
if [ -n "${ZSH_VERSION:-}" ] || [ "$(basename "${SHELL:-}")" = "zsh" ]; then
  add_to_path "$HOME/.zshrc"
elif [ -n "${BASH_VERSION:-}" ] || [ "$(basename "${SHELL:-}")" = "bash" ]; then
  if [ -f "$HOME/.bash_profile" ]; then
    add_to_path "$HOME/.bash_profile"
  else
    add_to_path "$HOME/.bashrc"
  fi
elif [ -f "$HOME/.profile" ]; then
  add_to_path "$HOME/.profile"
else
  echo "Could not detect shell config. Add this to your shell profile:"
  echo "  export PATH=\"$BIN_DIR:\$PATH\""
fi

echo ""
echo "Done! Run 'start-task' to launch."
