#!/data/data/com.termux/files/usr/bin/bash
# One-time Termux setup for Hearth's automatic backup server.
# Run from the repo root:  bash native/termux-setup.sh
set -e

cd "$(dirname "$0")/.."
mkdir -p "$HOME/.hearth" "$HOME/.termux"
cp server.py "$HOME/.hearth/server.py"

PROPS="$HOME/.termux/termux.properties"
touch "$PROPS"
if ! grep -q '^[[:space:]]*allow-external-apps[[:space:]]*=[[:space:]]*true' "$PROPS"; then
  printf '\nallow-external-apps=true\n' >> "$PROPS"
fi
if command -v termux-reload-settings >/dev/null 2>&1; then
  termux-reload-settings || true
fi

echo "Hearth server installed at $HOME/.hearth/server.py"
echo
echo "One-time Android setup:"
echo "  1. Run: termux-setup-storage"
echo "  2. Grant Hearth the 'Run commands' permission when it asks."
echo "     If it does not ask, open Android Settings → Apps → Hearth →"
echo "     Permissions → Additional permissions → Run commands."
echo "  3. In Termux, run this once to make sure Python is available:"
echo "       pkg install python"
echo
echo "The Hearth app will start the server automatically when you back up."
