#!/bin/bash
set -e

echo "Preparing shared module for deployment..."
cd ../shared
npm ci
npm run build
npm pack

echo "Installing functions dependencies with shared module..."
cd ../functions
npm ci
npm install ../shared/w1aw-schedule-shared-1.0.0.tgz

echo "Building functions..."
npm run build

echo "Functions prepared for deployment"
