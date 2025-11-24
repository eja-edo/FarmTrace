#!/bin/bash

# Script để khởi động chaincode containers bằng cách query từ mỗi peer

echo "=== Khởi động chaincode containers ==="

# Set environment cho Manufacturer peer
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="OrgManufacturerMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/network/crypto-config/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/network/crypto-config/peerOrganizations/manufacturer.example.com/users/Admin@manufacturer.example.com/msp
export CORE_PEER_ADDRESS=peer0.manufacturer.example.com:7051

echo "1. Query từ Manufacturer peer..."
peer chaincode query -C supplychain-channel -n supplychain_cc -c '{"Args":["GetAllProducts"]}' 2>&1 | head -3

echo ""
echo "2. Query từ Shipper peer..."
export CORE_PEER_LOCALMSPID="OrgShipperMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/network/crypto-config/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/network/crypto-config/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051

peer chaincode query -C supplychain-channel -n supplychain_cc -c '{"Args":["GetAllProducts"]}' 2>&1 | head -3

echo ""
echo "3. Query từ Warehouse peer..."
export CORE_PEER_LOCALMSPID="OrgWarehouseMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/network/crypto-config/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/network/crypto-config/peerOrganizations/warehouse.example.com/users/Admin@warehouse.example.com/msp
export CORE_PEER_ADDRESS=peer0.warehouse.example.com:9051

peer chaincode query -C supplychain-channel -n supplychain_cc -c '{"Args":["GetAllProducts"]}' 2>&1 | head -3

echo ""
echo "4. Query từ Retailer peer..."
export CORE_PEER_LOCALMSPID="OrgRetailerMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/network/crypto-config/peerOrganizations/retailer.example.com/peers/peer0.retailer.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/network/crypto-config/peerOrganizations/retailer.example.com/users/Admin@retailer.example.com/msp
export CORE_PEER_ADDRESS=peer0.retailer.example.com:10051

peer chaincode query -C supplychain-channel -n supplychain_cc -c '{"Args":["GetAllProducts"]}' 2>&1 | head -3

echo ""
echo "=== Hoàn tất. Kiểm tra chaincode containers ==="
