#!/bin/bash
set -e

echo "Preparing shared module for deployment..."
cd ../shared
npm ci
npm run build

echo "Packing shared module..."
TARBALL=$(npm pack)
echo "Created tarball: $TARBALL"

echo "Installing functions dependencies with shared module..."
cd ../functions
npm ci
npm install "../shared/$TARBALL"

echo "Building functions..."
npm run build

echo "Functions prepared for deployment"
