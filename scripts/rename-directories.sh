#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Rename HandySales → HandySuites directories and files
# Run from project root AFTER closing VSCode:
#   bash scripts/rename-directories.sh
# ═══════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")/.."

echo "=== Renaming lib directories ==="
mv libs/HandySales.Domain libs/HandySuites.Domain 2>/dev/null && echo "✓ libs/HandySuites.Domain" || echo "⚠ Already renamed or locked"
mv libs/HandySales.Application libs/HandySuites.Application 2>/dev/null && echo "✓ libs/HandySuites.Application" || echo "⚠ Already renamed or locked"
mv libs/HandySales.Infrastructure libs/HandySuites.Infrastructure 2>/dev/null && echo "✓ libs/HandySuites.Infrastructure" || echo "⚠ Already renamed or locked"
mv libs/HandySales.Shared libs/HandySuites.Shared 2>/dev/null && echo "✓ libs/HandySuites.Shared" || echo "⚠ Already renamed or locked"

echo "=== Renaming API directories ==="
mv apps/api/src/HandySales.Api apps/api/src/HandySuites.Api 2>/dev/null && echo "✓ apps/api/src/HandySuites.Api" || echo "⚠ Already renamed or locked"
mv apps/api/tests/HandySales.Tests apps/api/tests/HandySuites.Tests 2>/dev/null && echo "✓ apps/api/tests/HandySuites.Tests" || echo "⚠ Already renamed or locked"

echo "=== Renaming Billing directories ==="
mv apps/billing/HandySales.Billing.Api apps/billing/HandySuites.Billing.Api 2>/dev/null && echo "✓ apps/billing/HandySuites.Billing.Api" || echo "⚠ Already renamed or locked"
mv apps/billing/HandySales.Billing.Tests apps/billing/HandySuites.Billing.Tests 2>/dev/null && echo "✓ apps/billing/HandySuites.Billing.Tests" || echo "⚠ Already renamed or locked"

echo "=== Renaming Mobile directories ==="
mv apps/mobile/HandySales.Mobile.Api apps/mobile/HandySuites.Mobile.Api 2>/dev/null && echo "✓ apps/mobile/HandySuites.Mobile.Api" || echo "⚠ Already renamed or locked"
mv apps/mobile/HandySales.Mobile.Tests apps/mobile/HandySuites.Mobile.Tests 2>/dev/null && echo "✓ apps/mobile/HandySuites.Mobile.Tests" || echo "⚠ Already renamed or locked"

echo "=== Renaming .csproj files ==="
for f in $(find . -name "HandySales*.csproj" -not -path "./.git/*"); do
  newf=$(echo "$f" | sed 's/HandySales/HandySuites/g')
  mv "$f" "$newf" 2>/dev/null && echo "✓ $newf" || echo "⚠ $f locked"
done

echo "=== Renaming .sln file ==="
mv apps/api/src/HandySales.sln apps/api/src/HandySuites.sln 2>/dev/null && echo "✓ HandySuites.sln" || echo "⚠ Already renamed"

echo "=== Updating Dockerfiles ==="
sed -i 's/HandySales/HandySuites/g' infra/docker/Dockerfile.Main.Dev 2>/dev/null
sed -i 's/HandySales/HandySuites/g' infra/docker/Dockerfile.Billing.Dev 2>/dev/null
sed -i 's/HandySales/HandySuites/g' infra/docker/Dockerfile.Mobile.Dev 2>/dev/null
sed -i 's/HandySales/HandySuites/g' infra/docker/Dockerfile.Web.Dev 2>/dev/null
echo "✓ Dockerfiles updated"

echo "=== Updating remaining file references ==="
find . -name "*.csproj" -not -path "./.git/*" -exec sed -i 's/HandySales/HandySuites/g' {} +
find . -name "*.sln" -not -path "./.git/*" -exec sed -i 's/HandySales/HandySuites/g' {} +
echo "✓ Project references updated"

echo "=== Updating package.json ==="
sed -i 's/"handysales-monorepo"/"handysuites-monorepo"/' package.json 2>/dev/null
echo "✓ package.json updated"

echo ""
echo "=== DONE ==="
echo "Now run:"
echo "  git add -A"
echo "  git commit -m 'refactor: rename HandySales → HandySuites directories and files'"
echo "  git push origin main"
echo ""
echo "Then reopen VSCode and rebuild Docker:"
echo "  docker-compose -f docker-compose.dev.yml up -d --build"
