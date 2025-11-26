#!/bin/bash

echo "=============================================="
echo "Starting API Gateway Server"
echo "=============================================="
echo ""

# Check if wallet has identities
if [ ! -f "wallet/appUser.id" ]; then
    echo "⚠️  Wallet identity not found. Importing..."
    node import-identity.js
    echo ""
fi

# Start API server
echo "Starting Express server on port 3000..."
echo ""
export NODE_ENV=development
export PORT=3000
export CHANNEL_NAME=supplychain-channel
export CHAINCODE_NAME=supplychain_cc

node src/index.js
