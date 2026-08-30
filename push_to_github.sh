#!/usr/bin/env bash
set -euo pipefail

# Run this from INSIDE the extracted `iris/` folder (the one containing
# backend/, frontend/, supabase/, README.md).
#
# This preserves the full directory structure — the GitHub web upload UI
# flattens nested folders when you drag-and-drop; `git` never does.
#
# Usage:
#   cd iris
#   chmod +x push_to_github.sh
#   ./push_to_github.sh

REPO_URL="https://github.com/d77167635/ibag.git"
BRANCH="main"

if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "supabase" ]; then
  echo "Error: run this from inside the iris/ folder (expects README.md, backend/, frontend/, supabase/)."
  exit 1
fi

git init
git add .
git commit -m "Iris Phase 1 scaffold: backend, frontend, Supabase migration"
git branch -M "$BRANCH"
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

echo ""
echo "About to push to: $REPO_URL ($BRANCH)"
echo "If the repo already has files on GitHub (from the flattened upload),"
echo "this push will likely be rejected as non-fast-forward. In that case,"
echo "either:"
echo "  a) delete the existing files on GitHub first (recommended — they're"
echo "     flattened/broken anyway), then re-run this script, or"
echo "  b) run: git push --force origin $BRANCH"
echo "     (force-push only if you're OK overwriting what's currently there)"
echo ""
read -p "Push now with --force? [y/N] " confirm

if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
  git push --force origin "$BRANCH"
  echo "Pushed. Check https://github.com/d77167635/ibag to confirm the folder structure looks right."
else
  echo "Skipped push. Run manually when ready:"
  echo "  git push --force origin $BRANCH"
fi
