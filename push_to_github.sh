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

REPO_URL="https://github.com/d77167635/iris.git"
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
echo "If the repo already has files on GitHub, this push may be rejected"
echo "as non-fast-forward. Do not force-push unless you have explicitly"
echo "confirmed that overwriting the remote branch is intended."
echo ""
read -p "Push now with --force? [y/N] " confirm

if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
  git push --force origin "$BRANCH"
  echo "Pushed. Check https://github.com/d77167635/iris to confirm the repository structure."
else
  echo "Skipped push. Run manually when ready:"
  echo "  git push --force origin $BRANCH"
fi
