# 🧪 Quick Testing Guide - Handover Workflow

## ✅ Verified Working (Nov 3, 2025)

The handover approval workflow has been **fully tested and verified** working correctly.

---

## 🚀 Quick Test (30 seconds)

```bash
# From your Windows host
cd E:\server_ship\blockchainCore

# Copy and run test script in fabric-tools container
docker cp test-workflow-simple.sh fabric-tools:/tmp/
docker exec fabric-tools bash /tmp/test-workflow-simple.sh
```

**Expected Output:**
```
✅ Handover Workflow Test Complete!

Test Results:
  [1] ✓ Product created by Manufacturer
  [2] ✓ Handover requested to Shipper
  [3] ✓ Handover accepted by Shipper
```

---

## 📋 What Gets Tested

1. **CreateProduct** - Manufacturer creates a product
   - MSP validation: Only OrgManufacturerMSP can create
   - Multi-peer endorsement: 3/4 peers endorse
   - Product stored with initial owner = Manufacturer

2. **RequestHandoverToShipper** - Manufacturer requests handover
   - MSP validation: Only OrgManufacturerMSP can request
   - Handover record created with status = PENDING
   - Product.PendingHandover updated

3. **AcceptHandover** - Shipper accepts the handover
   - MSP validation: Only OrgShipperMSP can accept
   - Ownership transferred: Manufacturer → Shipper
   - Product status updated: Manufactured → InTransit
   - Approval record added to audit trail

---

## 🔍 Manual Testing Commands

### 1. Create Product
```bash
docker exec fabric-tools peer chaincode invoke \
  -o orderer.example.com:7050 --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C supplychain-channel -n supplychain_cc \
  --peerAddresses peer0.manufacturer.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c '{"function":"CreateProduct","Args":["PROD123","Widget","BATCH123","Vietnam","2025-11-03","ipfs123"]}'
```

### 2. Request Handover
```bash
docker exec fabric-tools peer chaincode invoke \
  -o orderer.example.com:7050 --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C supplychain-channel -n supplychain_cc \
  --peerAddresses peer0.manufacturer.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c '{"function":"RequestHandoverToShipper","Args":["PROD123","SHIP123","WB123","sig123"]}'
```

### 3. Accept Handover (as Shipper)
```bash
docker exec fabric-tools bash -c '
export CORE_PEER_LOCALMSPID="OrgShipperMSP"
export CORE_PEER_ADDRESS=peer0.shipper.example.com:8051
export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/users/Admin@shipper.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt

peer chaincode invoke \
  -o orderer.example.com:7050 --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C supplychain-channel -n supplychain_cc \
  --peerAddresses peer0.manufacturer.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
  -c "{\"function\":\"AcceptHandover\",\"Args\":[\"HANDOVER-PROD123-SHIPPER\",\"RECEIVER123\",\"sig-accept\"]}"
'
```

---

## ⚠️ Important Notes

### Multi-Peer Endorsement Required
**MUST include at least 3 peers** in `--peerAddresses` to satisfy MAJORITY policy (3/4).

If you only use 1 peer, you'll get:
```
ENDORSEMENT_POLICY_FAILURE - 1 sub-policies were satisfied, 
but this policy requires 3
```

### Wait Between Transactions
Add 3-5 second delays between transactions to allow block propagation:
```bash
sleep 5  # Wait for block to commit and propagate
```

### PowerShell vs Bash
- ❌ **Don't use** PowerShell for complex JSON (escaping issues)
- ✅ **Use** bash scripts inside fabric-tools container
- ✅ **Use** `docker exec fabric-tools bash /tmp/script.sh`

---

## 📊 Verification Checklist

After running tests, verify:

- [ ] All 3 transactions return `status:200`
- [ ] No `ENDORSEMENT_POLICY_FAILURE` errors
- [ ] Product created with owner = Manufacturer
- [ ] Handover request creates PENDING status
- [ ] Acceptance transfers ownership to Shipper
- [ ] Product status changes to InTransit

---

## 🔗 Related Documentation

- **Full Verification Report**: `HANDOVER_WORKFLOW_VERIFICATION.md`
- **Copilot Instructions**: `.github/copilot-instructions.md`
- **Test Scripts**: 
  - `test-workflow-simple.sh` - Complete workflow
  - `test-chaincode.sh` - Individual functions
- **Chaincode**: `chaincode/go/supplychain.go`

---

## 🎯 Success Criteria

✅ **Workflow is working if:**
1. CreateProduct completes with status:200
2. RequestHandoverToShipper completes with status:200
3. AcceptHandover completes with status:200
4. No endorsement policy failures
5. Ownership transfers from Manufacturer to Shipper

---

**Last Tested**: November 3, 2025  
**Chaincode Sequence**: 4  
**Test Status**: ✅ PASSING
