#!/bin/bash
set -euo pipefail

# This script prepares the functions directory for deployment to Firebase Cloud Functions.
# It builds and packs the shared module into a tarball, then installs it as a real package
# instead of a symlink. This is necessary because Firebase only uploads the functions directory,
# and symlinks to ../shared would be broken in the cloud environment.
#
# Note: This script modifies package.json and package-lock.json to reference the tarball.
# These changes should NOT be committed - they are only needed for deployment.

# Change to the functions directory. Firebase sets RESOURCE_DIR to point to the functions directory,
# but runs the script from the project root.
cd "${RESOURCE_DIR:-.}"

# Verify we're in the functions directory by checking for Firebase Functions indicators
if [ ! -f "package.json" ] || ! grep -q "firebase-functions" package.json; then
  echo "Error: This script must be run from the functions directory"
  exit 1
fi

echo "Preparing shared module for deployment..."
cd ../shared
npm ci
npm run build

echo "Packing shared module..."
TARBALL=$(npm pack)
echo "Created tarball: $TARBALL"

echo "Copying tarball to functions directory..."
cp "$TARBALL" ../functions/

echo "Installing functions dependencies with shared module..."
cd ../functions
npm ci
npm install "./$TARBALL"

echo "Cleaning up tarball from shared directory..."
rm -f "../shared/$TARBALL"

echo "Building functions..."
npm run build

echo "Functions prepared for deployment"
