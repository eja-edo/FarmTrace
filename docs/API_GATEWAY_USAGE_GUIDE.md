# API Gateway Usage Guide for UI Developers

## 🎯 Overview

Gateway tự động xử lý **ECDSA signature generation** - UI chỉ cần gửi business data đơn giản!

**Base URL**: `http://localhost:3000`

**Authentication**: Tất cả endpoints yêu cầu header `X-User-Identity` với format: `{organization}:{userId}`

```javascript
// Example
headers: {
    'X-User-Identity': 'manufacturer:user1',
    'Content-Type': 'application/json'
}
```

---

## 📋 Organization Names

| Organization | Value |
|--------------|-------|
| Manufacturer | `manufacturer` |
| Shipper | `shipper` |
| Warehouse | `warehouse` |
| Retailer | `retailer` |

---

## 🔥 Product APIs

### 1. Create Product (Manufacturer Only)

**Endpoint**: `POST /api/v2/products`

**Headers**:
```javascript
{
    'X-User-Identity': 'manufacturer:user1',
    'Content-Type': 'application/json'
}
```

**Request Body**:
```json
{
    "id": "PROD-001",
    "name": "Premium Jasmine Rice",
    "batch": "BATCH-2025-11",
    "origin": "An Giang Province",
    "manufactureDate": "2025-11-26",
    "metaHash": "ipfs://QmHash123..."
}
```

**Response (201 Created)**:
```json
{
    "success": true,
    "message": "Product created successfully",
    "data": {
        "id": "PROD-001",
        "name": "Premium Jasmine Rice",
        "status": "Manufactured",
        "owner": "Manufacturer",
        "createdAt": "2025-11-26T07:00:00Z",
        "version": 1
    }
}
```

**Errors**:
- `403`: Unauthorized (only Manufacturer can create)
- `409`: Product ID already exists

---

### 2. Get Product by ID

**Endpoint**: `GET /api/v2/products/:id`

**Headers**:
```javascript
{
    'X-User-Identity': 'manufacturer:user1'  // Any organization
}
```

**Response (200 OK)**:
```json
{
    "success": true,
    "data": {
        "id": "PROD-001",
        "name": "Premium Jasmine Rice",
        "status": "Manufactured",
        "owner": "Manufacturer",
        "currentHolder": "Manufacturer",
        "pendingHandover": "",
        "approvals": [],
        "createdAt": "2025-11-26T07:00:00Z",
        "updatedAt": "2025-11-26T07:00:00Z",
        "version": 1
    }
}
```

**Product Status Flow**:
- `Manufactured` → `HandoverRequested` → `InTransit` → `Shipped` → `InWarehouse` → `DeliveredToRetailer` → `Sold`

---

### 3. Get All Products

**Endpoint**: `GET /api/v2/products`

**Query Parameters** (Optional):
- `status`: Filter by status (e.g., `?status=Manufactured`)
- `owner`: Filter by owner (e.g., `?owner=Manufacturer`)

**Response (200 OK)**:
```json
{
    "success": true,
    "count": 2,
    "data": [
        {
            "id": "PROD-001",
            "name": "Premium Jasmine Rice",
            "status": "Manufactured",
            "owner": "Manufacturer"
        },
        {
            "id": "PROD-002",
            "name": "Organic Brown Rice",
            "status": "InTransit",
            "owner": "Shipper"
        }
    ]
}
```

---

### 4. Get Product History (Audit Trail)

**Endpoint**: `GET /api/v2/products/:id/history`

**Response (200 OK)**:
```json
{
    "success": true,
    "count": 3,
    "data": [
        {
            "txId": "abc123...",
            "timestamp": "2025-11-26T07:00:00Z",
            "record": {
                "id": "PROD-001",
                "status": "Manufactured",
                "owner": "Manufacturer",
                "version": 1
            },
            "isDelete": false
        },
        {
            "txId": "def456...",
            "timestamp": "2025-11-26T08:30:00Z",
            "record": {
                "id": "PROD-001",
                "status": "InTransit",
                "owner": "Shipper",
                "version": 2
            },
            "isDelete": false
        }
    ]
}
```

---

## 🚚 Handover APIs (Auto-Signature)

### 5. Request Handover: Manufacturer → Shipper

**Endpoint**: `POST /api/v2/handovers/manufacturer-shipper`

**Headers**:
```javascript
{
    'X-User-Identity': 'manufacturer:user1',
    'Content-Type': 'application/json'
}
```

**Request Body** (NO SIGNATURE NEEDED!):
```json
{
    "productId": "PROD-001",
    "shipperId": "SHIPPER-001",
    "waybill": "WB-20251126-001"
}
```

**Response (201 Created)**:
```json
{
    "success": true,
    "message": "Handover request created successfully",
    "data": {
        "handoverId": "HANDOVER-PROD-001-SHIPPER-abc123",
        "productId": "PROD-001",
        "fromOrg": "Manufacturer",
        "toOrg": "Shipper",
        "status": "PENDING",
        "metadata": {
            "shipperId": "SHIPPER-001",
            "waybill": "WB-20251126-001"
        }
    }
}
```

**Gateway automatically**:
1. Generates signature from Manufacturer's private key
2. Submits transaction to blockchain
3. Returns handover ID

**Errors**:
- `403`: Unauthorized (only Manufacturer)
- `409`: Product already has pending handover
- `400`: Product must be in Manufactured state

---

### 6. Request Handover: Shipper → Warehouse

**Endpoint**: `POST /api/v2/handovers/shipper-warehouse`

**Headers**:
```javascript
{
    'X-User-Identity': 'shipper:user1',
    'Content-Type': 'application/json'
}
```

**Request Body**:
```json
{
    "productId": "PROD-001",
    "warehouseId": "WAREHOUSE-001"
}
```

**Response**: Similar to manufacturer-shipper

---

### 7. Get Handover Details

**Endpoint**: `GET /api/v2/handovers/:id`

**Headers**:
```javascript
{
    'X-User-Identity': 'shipper:user1'  // Any organization
}
```

**Response (200 OK)**:
```json
{
    "success": true,
    "data": {
        "handoverID": "HANDOVER-PROD-001-SHIPPER-abc123",
        "productID": "PROD-001",
        "fromOrg": "Manufacturer",
        "toOrg": "Shipper",
        "status": "PENDING",
        "nonce": "e1447e515625a507164397726bfbdde095facdf0...",
        "waybill": "WB-20251126-001",
        "shipperId": "SHIPPER-001",
        "createdAt": "2025-11-26T08:00:00Z",
        "expiresAt": "2025-11-26T20:00:00Z"
    }
}
```

**Use Case**: Get nonce for signature generation (but gateway handles this automatically!)

---

### 8. Accept Handover (Auto-Signature with Nonce!)

**Endpoint**: `POST /api/v2/handovers/:id/accept`

**Headers**:
```javascript
{
    'X-User-Identity': 'shipper:user1',  // Must be recipient organization
    'Content-Type': 'application/json'
}
```

**Request Body** (NO SIGNATURE NEEDED!):
```json
{
    "receiverId": "DRIVER-001"
}
```

**Response (200 OK)**:
```json
{
    "success": true,
    "message": "Handover accepted successfully",
    "data": {
        "handoverId": "HANDOVER-PROD-001-SHIPPER-abc123",
        "status": "ACCEPTED",
        "acceptedAt": "2025-11-26T09:00:00Z"
    }
}
```

**Gateway automatically**:
1. Queries handover to get **nonce**
2. Generates message: `{handoverId}:{nonce}:{receiverId}`
3. Signs with Shipper's private key
4. Submits transaction to blockchain

**Product State After Accept**:
- Status: `InTransit`
- Owner: `Shipper`
- PendingHandover: `""` (cleared)
- Approval added to trail

**Errors**:
- `403`: Unauthorized (only recipient can accept)
- `409`: Handover not in pending state
- `404`: Handover not found

---

### 9. Reject Handover (Auto-Signature)

**Endpoint**: `POST /api/v2/handovers/:id/reject`

**Headers**:
```javascript
{
    'X-User-Identity': 'shipper:user1',
    'Content-Type': 'application/json'
}
```

**Request Body**:
```json
{
    "reason": "Damaged packaging"
}
```

**Response (200 OK)**:
```json
{
    "success": true,
    "message": "Handover rejected successfully",
    "data": {
        "handoverId": "HANDOVER-PROD-001-SHIPPER-abc123",
        "status": "REJECTED",
        "rejectedAt": "2025-11-26T09:00:00Z",
        "reason": "Damaged packaging"
    }
}
```

**Product State After Reject**:
- Status: `HandoverFailed`
- Owner: Reverted to `Manufacturer`
- PendingHandover: `""` (cleared)
- Can retry with new handover request

---

### 10. Get Pending Handovers

**Endpoint**: `GET /api/v2/handovers/pending`

**Headers**:
```javascript
{
    'X-User-Identity': 'shipper:user1'
}
```

**Response (200 OK)**:
```json
{
    "success": true,
    "count": 2,
    "data": [
        {
            "handoverID": "HANDOVER-PROD-001-SHIPPER-abc123",
            "productID": "PROD-001",
            "fromOrg": "Manufacturer",
            "toOrg": "Shipper",
            "status": "PENDING",
            "createdAt": "2025-11-26T08:00:00Z",
            "expiresAt": "2025-11-26T20:00:00Z"
        }
    ]
}
```

**Use Case**: Dashboard showing handovers awaiting your approval

---

##  Security & Signatures

### How Auto-Signature Works

**Behind the scenes** (UI không cần làm gì!):

```javascript
// When you call: POST /api/v2/handovers/manufacturer-shipper
// Gateway automatically:

// 1. Extract organization from header
const [org, userId] = 'manufacturer:user1'.split(':');

// 2. Generate message
const message = `handover-request-${productId}-shipper`;

// 3. Sign with organization's private key (in Docker)
const signature = await generateSignature(org, userId, message);
// signature = "3045022100f025b56b9a2d7114aa1e905123de4d7bf0bc79..."

// 4. Submit to blockchain
await fabricClient.submitTransaction('RequestHandoverToShipper', 
    productId, shipperId, waybill, signature);
```

### Signature Verification in Chaincode

```go
// Chaincode automatically validates:
func AcceptHandover(handoverID, receiverID, signature string) error {
    // 1. Extract nonce from handover
    handover := GetHandover(handoverID)
    
    // 2. Reconstruct expected message
    expectedMessage := handoverID + ":" + handover.Nonce + ":" + receiverID
    
    // 3. Extract public key from caller's X.509 certificate
    publicKey := getPublicKeyFromCertificate(ctx)
    
    // 4. Verify ECDSA signature
    if !verifyECDSA(publicKey, expectedMessage, signature) {
        return error("invalid signature or replay attack")
    }
    
    // 5. Transfer ownership
    product.Owner = "Shipper"
    product.Status = "InTransit"
}
```

### Why Every Approval Needs New Signature

✅ **Security Requirements**:
- **Nonce is unique** per handover (prevents replay attacks)
- **Message changes** every time (includes handoverId + nonce + receiverId)
- **Different actors** use different private keys (Manufacturer ≠ Shipper)
- **Cryptographic proof** that specific person approved at specific time

❌ **Cannot reuse signatures** because:
- Chaincode validates nonce matches current handover
- Public key must match caller's certificate
- Message hash would be different

---

## 📊 Complete Workflow Example

### Scenario: Ship rice from Manufacturer to Shipper

```javascript
// 1. MANUFACTURER: Create Product
POST /api/v2/products
Headers: { 'X-User-Identity': 'manufacturer:user1' }
Body: { id: 'RICE-001', name: 'Jasmine Rice', ... }
→ Response: { success: true, data: { status: 'Manufactured' } }

// 2. MANUFACTURER: Request Handover
POST /api/v2/handovers/manufacturer-shipper
Headers: { 'X-User-Identity': 'manufacturer:user1' }
Body: { productId: 'RICE-001', shipperId: 'SHIP-001', waybill: 'WB-001' }
→ Response: { 
    success: true, 
    data: { handoverId: 'HANDOVER-RICE-001-SHIPPER-abc123' } 
}
→ Gateway auto-signs with Manufacturer key ✅

// 3. SHIPPER: View Pending Handovers
GET /api/v2/handovers/pending
Headers: { 'X-User-Identity': 'shipper:user1' }
→ Response: { count: 1, data: [...pending handovers] }

// 4. SHIPPER: Get Handover Details
GET /api/v2/handovers/HANDOVER-RICE-001-SHIPPER-abc123
Headers: { 'X-User-Identity': 'shipper:user1' }
→ Response: { 
    success: true, 
    data: { 
        handoverID: '...', 
        nonce: 'e1447e51...',  // UI không cần dùng - gateway tự lấy
        status: 'PENDING' 
    } 
}

// 5. SHIPPER: Accept Handover
POST /api/v2/handovers/HANDOVER-RICE-001-SHIPPER-abc123/accept
Headers: { 'X-User-Identity': 'shipper:user1' }
Body: { receiverId: 'DRIVER-001' }
→ Response: { success: true, data: { status: 'ACCEPTED' } }
→ Gateway auto-signs with Shipper key + nonce ✅

// 6. Verify Product Transferred
GET /api/v2/products/RICE-001
Headers: { 'X-User-Identity': 'shipper:user1' }
→ Response: { 
    success: true, 
    data: { 
        owner: 'Shipper',          // Changed! ✅
        status: 'InTransit',       // Changed! ✅
        pendingHandover: '',       // Cleared! ✅
        approvals: [               // Added! ✅
            {
                action: 'AcceptedHandover',
                actorMSP: 'OrgShipperMSP',
                timestamp: '2025-11-26T09:00:00Z'
            }
        ]
    } 
}
```

---

## 🎨 UI Implementation Examples

### React/Vue/Angular Example

```javascript
// services/api.js
const API_BASE = 'http://localhost:3000';

// Get current user's organization from context/auth
const getCurrentOrg = () => {
    // From login state: 'manufacturer', 'shipper', etc.
    return localStorage.getItem('organization');
};

const getCurrentUserId = () => {
    return localStorage.getItem('userId') || 'user1';
};

// Helper to add auth header
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User-Identity': `${getCurrentOrg()}:${getCurrentUserId()}`
});

// === Product APIs ===

export const createProduct = async (productData) => {
    const response = await fetch(`${API_BASE}/api/v2/products`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(productData)
    });
    return response.json();
};

export const getProduct = async (productId) => {
    const response = await fetch(`${API_BASE}/api/v2/products/${productId}`, {
        headers: getHeaders()
    });
    return response.json();
};

export const getAllProducts = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = `${API_BASE}/api/v2/products${queryParams ? '?' + queryParams : ''}`;
    const response = await fetch(url, { headers: getHeaders() });
    return response.json();
};

// === Handover APIs ===

export const requestHandoverToShipper = async (productId, shipperId, waybill) => {
    // NO SIGNATURE NEEDED - Gateway handles it!
    const response = await fetch(`${API_BASE}/api/v2/handovers/manufacturer-shipper`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, shipperId, waybill })
    });
    return response.json();
};

export const getPendingHandovers = async () => {
    const response = await fetch(`${API_BASE}/api/v2/handovers/pending`, {
        headers: getHeaders()
    });
    return response.json();
};

export const acceptHandover = async (handoverId, receiverId) => {
    // NO SIGNATURE NEEDED - Gateway auto-generates with nonce!
    const response = await fetch(`${API_BASE}/api/v2/handovers/${handoverId}/accept`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ receiverId })
    });
    return response.json();
};

export const rejectHandover = async (handoverId, reason) => {
    const response = await fetch(`${API_BASE}/api/v2/handovers/${handoverId}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason })
    });
    return response.json();
};
```

### UI Component Example (React)

```jsx
// components/HandoverApprovalCard.jsx
import React, { useState } from 'react';
import { acceptHandover, rejectHandover } from '../services/api';

const HandoverApprovalCard = ({ handover, onUpdate }) => {
    const [receiverId, setReceiverId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        setLoading(true);
        try {
            // Chỉ cần gửi receiverId - Gateway tự động:
            // 1. Query nonce từ blockchain
            // 2. Generate ECDSA signature
            // 3. Submit transaction
            const result = await acceptHandover(handover.handoverID, receiverId);
            
            if (result.success) {
                alert('Handover accepted successfully!');
                onUpdate();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            alert(`Failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt('Rejection reason:');
        if (!reason) return;

        setLoading(true);
        try {
            const result = await rejectHandover(handover.handoverID, reason);
            if (result.success) {
                alert('Handover rejected');
                onUpdate();
            }
        } catch (error) {
            alert(`Failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="handover-card">
            <h3>Handover: {handover.handoverID}</h3>
            <p>Product: {handover.productID}</p>
            <p>From: {handover.fromOrg} → To: {handover.toOrg}</p>
            <p>Expires: {new Date(handover.expiresAt).toLocaleString()}</p>
            
            <input 
                type="text" 
                placeholder="Receiver ID (e.g., DRIVER-001)"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                disabled={loading}
            />
            
            <div className="actions">
                <button 
                    onClick={handleAccept} 
                    disabled={loading || !receiverId}
                    className="btn-accept"
                >
                    {loading ? 'Processing...' : 'Accept Handover'}
                </button>
                <button 
                    onClick={handleReject} 
                    disabled={loading}
                    className="btn-reject"
                >
                    Reject
                </button>
            </div>
        </div>
    );
};

export default HandoverApprovalCard;
```

---

## ⚠️ Error Handling

### Common Error Responses

```javascript
// 401 Unauthorized - Missing X-User-Identity header
{
    "success": false,
    "error": "Missing X-User-Identity header"
}

// 403 Forbidden - Wrong organization
{
    "success": false,
    "error": "Unauthorized: Only manufacturer can request this handover"
}

// 404 Not Found
{
    "success": false,
    "error": "Product not found"
}

// 409 Conflict
{
    "success": false,
    "error": "Product already has a pending handover"
}

// 500 Internal Server Error
{
    "success": false,
    "error": "No valid responses from any peers. Errors: ..."
}
```

### Error Handling Best Practices

```javascript
const handleApiCall = async (apiFunction) => {
    try {
        const result = await apiFunction();
        
        if (result.success) {
            return result.data;
        } else {
            // Gateway returned error
            throw new Error(result.error);
        }
    } catch (error) {
        // Network error or exception
        console.error('API Error:', error);
        
        if (error.message.includes('403')) {
            alert('You do not have permission for this action');
        } else if (error.message.includes('409')) {
            alert('Conflict: Resource already exists or in use');
        } else {
            alert(`Error: ${error.message}`);
        }
    }
};
```

---

## 🚀 Quick Start Checklist

### For UI Developers:

- [ ] **Set up organization context** - User login determines organization (manufacturer/shipper/warehouse/retailer)
- [ ] **Add X-User-Identity header** to all API calls
- [ ] **NO cryptography needed** - Gateway auto-generates signatures
- [ ] **Handle async operations** - Blockchain transactions take 2-5 seconds
- [ ] **Implement error handling** for 401/403/404/409/500 responses
- [ ] **Show loading states** during API calls
- [ ] **Refresh data** after successful operations

### Testing Your Integration:

```javascript
// 1. Test health check
fetch('http://localhost:3000/health')
    .then(r => r.json())
    .then(data => console.log('Gateway status:', data.status)); // "OK"

// 2. Test authentication
fetch('http://localhost:3000/api/v2/products', {
    headers: { 'X-User-Identity': 'manufacturer:user1' }
})
    .then(r => r.json())
    .then(data => console.log('Products:', data));

// 3. Test full workflow (see Complete Workflow Example above)
```

---

## 📚 Additional Resources

- **Gateway Source**: `apps/gateway-nodejs/src/routes/`
- **Test Scripts**: `apps/gateway-nodejs/test-workflow-auto-signature.ps1`
- **Chaincode**: `chaincode/go/supplychain.go`
- **Documentation**: `docs/ECDSA_SIGNATURE_GUIDE.md`

---

## 💡 Key Takeaways

✅ **Gateway handles ALL cryptography** - UI chỉ cần gửi business data  
✅ **Every approval generates NEW signature** - Secure, non-replayable  
✅ **Simple REST API** - JSON in/out, no blockchain complexity  
✅ **Audit trail automatic** - Every transaction recorded immutably  
✅ **Real-time validation** - Chaincode validates signatures on-chain  

**Questions?** Check test scripts hoặc gateway logs khi develop! 🎯
