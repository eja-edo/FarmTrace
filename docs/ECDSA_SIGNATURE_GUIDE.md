# ECDSA Signature Requirements for Handover Operations

## Overview

FarmTrace blockchain uses **production-grade ECDSA signature validation** for all handover accept/reject operations. This prevents unauthorized parties from accepting handovers on behalf of organizations.

## How It Works

### 1. Signature Generation

When accepting a handover, the receiver must sign a message using their organization's **Admin private key** (from MSP crypto-config):

**Message Format:**
```
{handoverID}:{nonce}:{receiverID}
```

**Example:**
```
HANDOVER-PROD-001-SHIPPER-abc123:64fdb1b25ec64fb3d49f738304840c8b:RECEIVER-SHIPPER-001
```

**Signature Algorithm:**
```bash
echo -n "{message}" | openssl dgst -sha256 -sign {private_key} | od -An -tx1 | tr -d ' \n'
```

### 2. Validation Process

Chaincode validates signatures by:
1. Extracting caller's X.509 certificate from transaction context
2. Verifying message was signed by certificate's private key
3. Checking signature matches expected format (ASN.1 DER encoded ECDSA)
4. Preventing replay attacks using nonce (unique per handover)

### 3. Security Properties

✅ **Cryptographically Secure**: Uses ECDSA P-256 (same as Fabric certificates)  
✅ **Replay Attack Prevention**: Nonce ensures signature only valid once  
✅ **Non-Repudiation**: Signature proves who approved handover (audit trail)  
✅ **MSP-Based Access Control**: Only organization with correct MSP can accept  

## Usage in Tests

### Automated Test (PowerShell)

```powershell
# Get handover details
$handover = Invoke-RestMethod -Uri "http://localhost:3000/api/v2/handovers/$handoverId"
$nonce = $handover.data.nonce
$receiverId = "RECEIVER-001"

# Generate signature using helper script
$message = "${handoverId}:${nonce}:${receiverId}"
$signature = .\scripts\generate-signature-docker.ps1 -Org "shipper" -Message $message

# Accept handover
$body = @{
    receiverId = $receiverId
    signature = $signature
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v2/handovers/$handoverId/accept" `
    -Method POST `
    -Headers @{"X-User-Identity"="shipper:user1"; "Content-Type"="application/json"} `
    -Body $body
```

### Manual Test (Bash)

```bash
# In fabric-tools container
HANDOVER_ID="HANDOVER-PROD-001-SHIPPER-abc123"
NONCE="64fdb1b25ec64fb3d49f738304840c8b"
RECEIVER_ID="RECEIVER-001"

# Find shipper's private key
PRIV_KEY=$(find /crypto/peerOrganizations/shipper.example.com/users/Admin@*/msp/keystore -name "*_sk" | head -1)

# Generate signature
MESSAGE="${HANDOVER_ID}:${NONCE}:${RECEIVER_ID}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -sign "$PRIV_KEY" | od -An -tx1 | tr -d ' \n')

# Accept handover via chaincode
peer chaincode invoke -o orderer.example.com:7050 \
    --tls --cafile /crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    -C supplychain-channel -n supplychain_cc \
    --peerAddresses peer0.manufacturer.example.com:7051 --tlsRootCertFiles /crypto/peerOrganizations/manufacturer.example.com/peers/peer0.manufacturer.example.com/tls/ca.crt \
    --peerAddresses peer0.shipper.example.com:8051 --tlsRootCertFiles /crypto/peerOrganizations/shipper.example.com/peers/peer0.shipper.example.com/tls/ca.crt \
    --peerAddresses peer0.warehouse.example.com:9051 --tlsRootCertFiles /crypto/peerOrganizations/warehouse.example.com/peers/peer0.warehouse.example.com/tls/ca.crt \
    -c "{\"function\":\"AcceptHandover\",\"Args\":[\"$HANDOVER_ID\",\"$RECEIVER_ID\",\"$SIGNATURE\"]}"
```

## Helper Scripts

### PowerShell (Windows)
```powershell
.\scripts\generate-signature-docker.ps1 -Org "shipper" -Message "handoverID:nonce:receiverID"
```

### Bash (Linux/Mac)
```bash
./scripts/generate-ecdsa-signature.sh shipper "handoverID:nonce:receiverID"
```

## Troubleshooting

### Error: "signature validation failed: invalid signature or replay attack detected"

**Possible causes:**

1. **Wrong nonce**: Handover nonce changed (get fresh nonce from API)
2. **Wrong organization**: Signature must be from correct org's private key
   - Manufacturer → Shipper: Use shipper's key
   - Shipper → Warehouse: Use warehouse's key
3. **Message format**: Must be exactly `{handoverID}:{nonce}:{receiverID}` (no spaces)
4. **Expired handover**: Handovers expire after 7 days
5. **Already accepted**: Handover can only be accepted once

**Debug steps:**

```powershell
# 1. Verify handover exists and is PENDING
GET /api/v2/handovers/{handoverId}

# 2. Check nonce matches
$handover.data.nonce

# 3. Regenerate signature with exact message format
$message = "${handoverId}:${nonce}:${receiverId}"
echo $message  # Verify no extra characters

# 4. Check signature length (should be ~140-144 chars for ECDSA P-256)
$signature.Length
```

## Integration with Applications

### Node.js Example

```javascript
const crypto = require('crypto');
const fs = require('fs');

// Load organization's private key
const privateKeyPem = fs.readFileSync('/crypto/.../keystore/priv_sk', 'utf8');
const privateKey = crypto.createPrivateKey(privateKeyPem);

// Create signature
const message = `${handoverId}:${nonce}:${receiverId}`;
const signature = crypto.sign('sha256', Buffer.from(message), privateKey);
const signatureHex = signature.toString('hex');

// Send to API
await fetch('/api/v2/handovers/{handoverId}/accept', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-User-Identity': 'shipper:user1'
    },
    body: JSON.stringify({
        receiverId: 'RECEIVER-001',
        signature: signatureHex
    })
});
```

### Python Example

```python
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

# Load private key
with open('/crypto/.../keystore/priv_sk', 'rb') as f:
    private_key = serialization.load_pem_private_key(
        f.read(), password=None, backend=default_backend()
    )

# Generate signature
message = f"{handover_id}:{nonce}:{receiver_id}".encode()
signature = private_key.sign(message, ec.ECDSA(hashes.SHA256()))
signature_hex = signature.hex()

# POST to API
requests.post(
    f'/api/v2/handovers/{handover_id}/accept',
    headers={'X-User-Identity': 'shipper:user1'},
    json={'receiverId': 'RECEIVER-001', 'signature': signature_hex}
)
```

## Security Notes

### ✅ DO

- Generate signatures on-demand (don't reuse)
- Store private keys securely (MSP keystore, HSM, key vault)
- Validate nonce freshness before signing
- Log all signature generation attempts (audit trail)
- Use TLS for API communication

### ❌ DON'T

- Share private keys between organizations
- Use test signatures in production
- Bypass signature validation (security risk)
- Hardcode signatures in code
- Send signatures over unencrypted connections

## Architecture Decision

**Why ECDSA signatures?**

1. **Strong Authentication**: Proves only org with private key can approve
2. **Non-Repudiation**: Cannot deny approving a handover
3. **Audit Compliance**: Cryptographic proof for regulatory requirements
4. **Replay Protection**: Nonce prevents signature reuse
5. **Fabric Native**: Same algorithm as transaction signatures

**Why not simpler approaches?**

- ❌ **Password/API Key**: Can be shared, stolen, or phished
- ❌ **JWT Token**: Not cryptographically bound to blockchain identity
- ❌ **Plain MSP Check**: Only proves caller identity, not explicit approval

## Related Documentation

- `test-complete-workflow.sh` - Full workflow with signature generation
- `chaincode/go/supplychain.go` - Signature validation implementation (lines 1263-1267, 1690-1698)
- `DIGITAL_SIGNATURE_ANALYSIS.md` - Security analysis of signature layers

## Support

For issues with signature generation:
1. Check Docker containers are running: `docker ps`
2. Verify crypto-config exists: `ls network/crypto-config/peerOrganizations/*/users/Admin@*/msp/keystore`
3. Test signature script: `.\test-handover-signature.ps1`
4. Review chaincode logs: `docker logs dev-peer0.shipper.example.com-supplychain_cc_2.6-*`
