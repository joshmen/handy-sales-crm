#!/bin/bash
# E2E Test Runner for Handy Suites Mobile App
# Usage: bash run-e2e.sh
#
# Prerequisites:
#   1. Android emulator running (emulator-5554)
#   2. Metro bundler running: npx expo start  (dev mode, NOT --no-dev)
#   3. adb port forwarding: adb reverse tcp:8081 tcp:8081
#
# This script:
#   1. Revokes SYSTEM_ALERT_WINDOW from Expo Go (prevents DevTools overlay)
#   2. Clears Expo Go app state (resets onboarding, auth)
#   3. Runs the full Maestro E2E test suite

ADB="/c/Android/Sdk/platform-tools/adb.exe"
MAESTRO="/c/maestro/bin/maestro"

echo "=== Handy Suites E2E Tests ==="

# Step 1: Check emulator
echo "[1/5] Checking emulator..."
$ADB devices | grep -q "emulator-5554" || { echo "ERROR: No emulator found. Start one first."; exit 1; }

# Step 2: Set up port forwarding
echo "[2/5] Setting up port forwarding..."
$ADB reverse tcp:8081 tcp:8081
$ADB reverse tcp:1050 tcp:1050
$ADB reverse tcp:1052 tcp:1052

# Step 3: Revoke overlay permission (fixes DevTools overlay blocking touches)
echo "[3/5] Revoking overlay permission from Expo Go..."
$ADB shell appops set host.exp.exponent SYSTEM_ALERT_WINDOW deny

# Step 4: Clear Expo Go state (fresh start — forces onboarding)
echo "[4/5] Clearing Expo Go app state..."
$ADB shell pm clear host.exp.exponent

# Step 5: Run Maestro tests
echo "[5/5] Running Maestro E2E tests..."
echo ""
$MAESTRO test .maestro/flow.yaml

EXIT_CODE=$?

# Restore overlay permission after tests
echo ""
echo "Restoring overlay permission..."
$ADB shell appops set host.exp.exponent SYSTEM_ALERT_WINDOW allow

if [ $EXIT_CODE -eq 0 ]; then
  echo "=== ALL TESTS PASSED ==="
else
  echo "=== TESTS FAILED (exit code: $EXIT_CODE) ==="
  echo "Check debug output in ~/.maestro/tests/"
fi

exit $EXIT_CODE
