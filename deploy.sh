#!/bin/bash
# Klaus Systems — Build, Push, Deploy
set -e
cd "$(dirname "$0")"
echo "Building..."
npm run build
echo "Pushing to GitHub..."
git add -A
git commit -m "${1:-Update}" --allow-empty || true
git push origin master
echo "Deploying to Vercel..."
npx vercel --prod --yes
echo "Live at https://klaus.systems"
