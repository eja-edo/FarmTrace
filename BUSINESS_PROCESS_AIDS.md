# FarmTrace Supply Chain Traceability System - Business Process Specification

**Document Version**: 1.0  
**Date**: November 25, 2025  
**Format**: AIDS (Actor-Interaction-Data-State)

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Actors](#actors)
3. [Business Objects](#business-objects)
4. [State Machines](#state-machines)
5. [Business Processes](#business-processes)
6. [Security Rules](#security-rules)
7. [Data Validation Rules](#data-validation-rules)

---

## System Overview

**Domain**: Agricultural Supply Chain Management  
**Purpose**: Provide end-to-end traceability of agricultural products from manufacturer to end consumer  
**Architecture**: Permissioned blockchain (Hyperledger Fabric 2.5) with 4-organization network

### Network Topology
```
Manufacturer → Shipper → Warehouse → Retailer → Consumer
     ↓           ↓           ↓           ↓
  (Create)   (Transport)  (Store)    (Sell)
```

---

## Actors

### A1. Manufacturer (Nhà sản xuất)
**MSP ID**: `OrgManufacturerMSP`  
**Responsibilities**:
- Create new products with traceability information
- Initiate handover to shipper
- Maintain production records
- Sign handover requests with digital signature

**Capabilities**:
- CreateProduct
- RequestHandoverToShipper
- CreateOrder (as seller)
- Query own products

**Access Level**: Write (create), Read (query)

---

### A2. Shipper (Đơn vị vận chuyển)
**MSP ID**: `OrgShipperMSP`  
**Responsibilities**:
- Accept/reject handover from manufacturer
- Transport products with temperature monitoring
- Update shipment location data
- Initiate handover to warehouse
- Sign handover acceptance/rejection

**Capabilities**:
- AcceptHandover (from Manufacturer)
- RejectHandover (from Manufacturer)
- ShipProduct (create shipment record)
- UpdateShipment (GPS + temperature)
- RequestHandoverToWarehouse
- Query shipment details (private data access)

**Access Level**: Read/Write (shipments, handovers)

---

### A3. Warehouse (Kho hàng)
**MSP ID**: `OrgWarehouseMSP`  
**Responsibilities**:
- Accept/reject handover from shipper
- Store products with quality control
- Manage inventory
- Initiate delivery to retailer
- Sign handover acceptance/rejection

**Capabilities**:
- AcceptHandover (from Shipper)
- RejectHandover (from Shipper)
- ReceiveAtWarehouse
- DeliverToRetailer
- Query inventory
- Query shipment details (private data access)

**Access Level**: Read/Write (inventory, handovers)

---

### A4. Retailer (Nhà bán lẻ)
**MSP ID**: `OrgRetailerMSP`  
**Responsibilities**:
- Accept/reject handover from warehouse
- Display products to consumers
- Record final sale transactions
- Provide traceability to end customers
- Sign handover acceptance/rejection

**Capabilities**:
- AcceptHandover (from Warehouse)
- RejectHandover (from Warehouse)
- MarkAsSold
- CreateOrder (as buyer)
- Query product history for consumers
- Query order prices (private data access)

**Access Level**: Read/Write (sales, handovers)

---

## Business Objects

### BO1. Product (Sản phẩm)

**Purpose**: Core entity representing traceable agricultural product

**Attributes**:
```typescript
{
  id: string              // Format: [A-Z0-9-]{1,64}
  name: string            // Product name
  batch: string           // Batch/lot number
  origin: string          // Production location
  manufactureDate: string // Format: YYYY-MM-DD
  status: ProductStatus   // State machine value
  owner: Organization     // Current legal owner
  currentHolder: string   // Current physical holder
  pendingHandover: string // ID of pending handover (if any)
  metaHash: string        // Hash of external metadata
  approvals: Approval[]   // Array of approval records
  version: number         // For optimistic locking (race condition prevention)
  createdAt: string       // RFC3339 timestamp
  updatedAt: string       // RFC3339 timestamp
}
```

**Lifecycle**: See State Machine SM1

**Constraints**:
- Only one pending handover allowed at a time
- Version increments on every modification
- Owner changes only through handover process
- Cannot be deleted (blockchain immutability)

---

### BO2. Handover (Bàn giao sản phẩm)

**Purpose**: Represents transfer of ownership between organizations with two-step approval

**Attributes**:
```typescript
{
  id: string              // Format: HANDOVER-{productID}-{targetOrg}-{txID[:16]}
  productID: string       // Reference to Product
  fromOrg: string         // Sender organization
  toOrg: string           // Receiver organization
  status: HandoverStatus  // PENDING | ACCEPTED | REJECTED | EXPIRED
  nonce: string           // SHA256(TxID + productID + timestamp) for replay prevention
  expiresAt: string       // Expiration time (7 days from request)
  requestedAt: string     // Request timestamp
  requestedBy: string     // Requester identity (CN from certificate)
  fromSignature: string   // Requester's digital signature
  acceptedAt: string      // Acceptance timestamp (if accepted)
  acceptedBy: string      // Acceptor identity
  toSignature: string     // Acceptor's digital signature
  rejectedAt: string      // Rejection timestamp (if rejected)
  rejectionReason: string // Reason for rejection
  metadata: object        // Additional data (shipperID, waybill, etc.)
}
```

**Lifecycle**: See State Machine SM2

**Constraints**:
- Nonce must be unique and deterministic (prevents replay attacks)
- Signature verification required (ECDSA with X.509 certificates)
- Expires after 7 days if not acted upon
- Cannot be modified after ACCEPTED/REJECTED/EXPIRED

---

### BO3. Shipment (Lô hàng vận chuyển)

**Purpose**: Track physical movement of products with environmental conditions

**Attributes**:
```typescript
{
  id: string              // Waybill number
  productID: string       // Reference to Product
  shipperID: string       // Shipper organization ID
  waybill: string         // Tracking number
  origin: string          // Departure location
  destination: string     // Arrival location
  status: string          // InTransit | Delivered
  temperature: number     // Current temperature (°C)
  locations: string[]     // GPS location history
  createdAt: string
  updatedAt: string
}
```

**Private Data** (Collection: `shipmentDetails`):
```typescript
{
  waybill: string
  actualCost: number      // Shipping cost (sensitive)
  routeDetails: string    // Detailed route (sensitive)
}
```

**Access Control**:
- Public data: All organizations
- Private data: Shipper + Warehouse only

---

### BO4. Order (Đơn hàng)

**Purpose**: Commercial transaction between buyer and seller

**Attributes**:
```typescript
{
  id: string
  productIDs: string[]    // List of products in order
  buyerID: string
  sellerID: string
  status: string          // Created | Confirmed | Fulfilled | Cancelled
  createdAt: string
  updatedAt: string
}
```

**Private Data** (Collection: `priceData`):
```typescript
{
  orderID: string
  totalPrice: number      // Total cost (sensitive)
  discount: number        // Applied discount (sensitive)
}
```

**Access Control**:
- Public data: All organizations
- Private data: Manufacturer + Retailer only

---

### BO5. Approval (Phê duyệt)

**Purpose**: Immutable audit trail of approval actions

**Attributes**:
```typescript
{
  actor: string           // CN from X.509 certificate
  actorMSP: string        // Organization MSP ID
  action: string          // AcceptedHandover | RejectedHandover
  timestamp: string       // RFC3339
  signature: string       // ECDSA signature
  metadata: object        // Additional context
}
```

**Usage**: Appended to Product.approvals array on handover actions

---

## State Machines

### SM1. Product Status State Machine

**States**:
1. `Manufactured` - Initial state after creation
2. `HandoverRequested` - Handover initiated, awaiting acceptance
3. `InTransit` - Accepted by Shipper, in transport
4. `Shipped` - Shipment record created with tracking
5. `InWarehouse` - Received and stored at warehouse
6. `DeliveredToRetailer` - Delivered to retail location
7. `Sold` - Final sale to consumer
8. `HandoverFailed` - Handover rejected by receiver
9. `HandoverExpired` - Handover timed out (7 days)

**Transitions**:
```
Manufactured
  → [Manufacturer] HandoverRequested

HandoverRequested
  → [Shipper] InTransit (accept)
  → [Any] HandoverFailed (reject)
  → [System] HandoverExpired (timeout)

InTransit
  → [Shipper] Shipped
  → [Shipper] HandoverRequested (to warehouse)

Shipped
  → [Warehouse] InWarehouse
  → [Shipper] HandoverRequested (to warehouse)

InWarehouse
  → [Warehouse] DeliveredToRetailer
  → [Warehouse] HandoverRequested (to retailer)

DeliveredToRetailer
  → [Retailer] Sold
  → [Retailer] HandoverRequested (return)

HandoverFailed
  → [FromOrg] HandoverRequested (retry)

HandoverExpired
  → [FromOrg] HandoverRequested (retry)
```

**Validation Logic**:
```go
func isValidStateTransition(current, next, mspID) bool {
  validTransitions := {
    "Manufactured": {
      "HandoverRequested": [ManufacturerMSP]
    },
    "InTransit": {
      "Shipped": [ShipperMSP],
      "HandoverRequested": [ShipperMSP]
    },
    // ... (see supplychain.go for complete mapping)
  }
  
  allowedMSPs := validTransitions[current][next]
  return contains(allowedMSPs, mspID)
}
```

---

### SM2. Handover Status State Machine

**States**:
1. `PENDING` - Awaiting receiver action
2. `ACCEPTED` - Approved by receiver, ownership transferred
3. `REJECTED` - Declined by receiver, ownership reverted
4. `EXPIRED` - Timeout occurred, ownership reverted

**Transitions**:
```
PENDING
  → [ToOrg] ACCEPTED (within 7 days, valid signature)
  → [ToOrg] REJECTED (within 7 days, valid signature)
  → [System] EXPIRED (after 7 days)

ACCEPTED (terminal state)
REJECTED (terminal state)
EXPIRED (terminal state)
```

**Side Effects on Product**:
- `ACCEPTED` → Transfer ownership, update status, append approval, increment version
- `REJECTED` → Revert to fromOrg, set HandoverFailed status, append approval
- `EXPIRED` → Revert to fromOrg, set HandoverExpired status

---

## Business Processes

### BP1. Product Creation and Registration

**Actors**: Manufacturer  
**Trigger**: New batch produced  
**Preconditions**: 
- Caller MSP = OrgManufacturerMSP
- Product ID unique
- Valid manufacture date (YYYY-MM-DD format)

**Flow**:
```
1. Manufacturer invokes CreateProduct(id, name, batch, origin, mfgDate, metaHash)
   
2. System validates:
   - Product ID format: [A-Z0-9-]{1,64}
   - All required fields non-empty
   - Manufacture date format
   - Product ID doesn't exist
   - Caller is Manufacturer
   
3. System creates Product:
   - status = "Manufactured"
   - owner = "Manufacturer"
   - currentHolder = "Manufacturer"
   - version = 1
   - approvals = []
   - timestamp = transaction timestamp (deterministic)
   
4. System writes to ledger:
   - Key: productID
   - Value: Product JSON
   
5. Return success
```

**Outputs**: Product registered on blockchain

**Error Cases**:
- E1: Invalid product ID format → Error
- E2: Product already exists → Error
- E3: Invalid date format → Error
- E4: Caller not Manufacturer → Unauthorized error
- E5: Empty required fields → Validation error

---

### BP2. Two-Step Handover Process (Manufacturer → Shipper)

**Actors**: Manufacturer (initiator), Shipper (acceptor)  
**Trigger**: Product ready for shipment  
**Preconditions**:
- Product exists
- Product.status = "Manufactured"
- Product.owner = "Manufacturer"
- Product.pendingHandover = "" (no pending handover)

**Flow - Step 1: Request Handover**
```
1. Manufacturer invokes RequestHandoverToShipper(productID, shipperID, waybill, signature)

2. System validates:
   - Caller MSP = OrgManufacturerMSP
   - Product exists and in correct state
   - No pending handover
   - All parameters non-empty
   
3. System generates deterministic nonce:
   - txID = GetTxID()
   - nonce = SHA256(txID + productID + timestamp)
   
4. System creates deterministic handover ID:
   - handoverID = "HANDOVER-{productID}-SHIPPER-{txID[:16]}"
   
5. System creates Handover:
   - fromOrg = "Manufacturer"
   - toOrg = "Shipper"
   - status = PENDING
   - expiresAt = currentTime + 7 days
   - fromSignature = signature (stored but not verified at this stage)
   - metadata = {shipperID, waybill}
   
6. System updates Product:
   - status = "HandoverRequested"
   - pendingHandover = handoverID
   - version++ (optimistic locking)
   
7. System emits event: "HandoverRequested"

8. Return success
```

**Flow - Step 2a: Accept Handover**
```
1. Shipper invokes AcceptHandover(handoverID, receiverID, signature)

2. System validates:
   - Caller MSP = OrgShipperMSP (must match handover.toOrg)
   - Handover exists and status = PENDING
   - Not expired (currentTime < expiresAt)
   - Signature valid (ECDSA verification with nonce)
   
3. System performs signature verification:
   message = handoverID + ":" + nonce + ":" + receiverID
   cert = GetX509Certificate(caller)
   pubKey = extract ECDSA public key from cert
   valid = ecdsa.Verify(pubKey, SHA256(message), signature)
   
   If invalid → Return error "signature validation failed: invalid signature or replay attack detected"
   
4. System updates Handover:
   - status = ACCEPTED
   - acceptedAt = timestamp
   - acceptedBy = caller CN
   - toSignature = signature
   
5. System transfers Product ownership:
   originalVersion = product.version
   - status = "InTransit"
   - owner = "Shipper"
   - currentHolder = "Shipper"
   - pendingHandover = ""
   - version = originalVersion + 1 (optimistic locking)
   
6. System appends Approval to product:
   - actor = caller CN
   - actorMSP = OrgShipperMSP
   - action = "AcceptedHandover"
   - timestamp = current
   - signature = signature
   - metadata = {handoverID, receiverID}
   
7. System emits event: "HandoverCompleted"

8. Return success
```

**Flow - Step 2b: Reject Handover**
```
1. Shipper invokes RejectHandover(handoverID, reason, signature)

2. System validates:
   - Caller MSP = OrgShipperMSP
   - Handover exists and status = PENDING
   
3. System updates Handover:
   - status = REJECTED
   - rejectedAt = timestamp
   - rejectionReason = reason
   
4. System reverts Product:
   - status = "HandoverFailed"
   - owner = "Manufacturer" (revert)
   - currentHolder = "Manufacturer"
   - pendingHandover = ""
   - version++ (optimistic locking)
   
5. System appends Approval:
   - action = "RejectedHandover"
   - metadata = {handoverID, reason}
   
6. System emits event: "HandoverRejected"

7. Return success
```

**Outputs**:
- Handover record created
- Product ownership transferred (if accepted)
- Immutable approval trail

**Error Cases**:
- E1: Product not in correct state → State error
- E2: Pending handover exists → Conflict error
- E3: Handover expired → Timeout error
- E4: Invalid signature → Authentication error
- E5: Wrong MSP accepting → Authorization error
- E6: Concurrent modification (version mismatch) → Optimistic lock error

**Special Case - Handover Expiration**:
```
Background Job: ExpireHandover(handoverID)
- Trigger: currentTime > expiresAt
- Action: 
  - handover.status = EXPIRED
  - product.status = "HandoverExpired"
  - product.owner = fromOrg (revert)
  - product.pendingHandover = ""
  - product.version++
- Event: "HandoverExpired"
```

---

### BP3. Shipment Creation with Private Data

**Actors**: Shipper  
**Trigger**: Physical shipment begins  
**Preconditions**:
- Product.owner = "Shipper"
- Product.status = "InTransit"
- Caller MSP = OrgShipperMSP

**Flow**:
```
1. Shipper invokes ShipProduct(productID, shipperID, waybill, destination)
   WITH transient data: {
     "shipmentDetails": {
       "waybill": "...",
       "actualCost": 1500.50,
       "routeDetails": "..."
     }
   }

2. System validates:
   - Caller MSP = OrgShipperMSP
   - Product exists
   - Product.owner = "Shipper" (CRITICAL: prevent shipping unowned products)
   - Product.status = "InTransit" (CRITICAL: prevent invalid state)
   
3. System validates transient data:
   - Exists in transient map
   - Valid JSON format
   - Size < 10KB
   - Required fields present (waybill, actualCost)
   - actualCost >= 0
   
4. System creates public Shipment:
   - id = waybill
   - productID, shipperID, destination
   - status = "InTransit"
   - locations = [product.origin]
   - temperature = 0
   
5. System stores Shipment to public ledger

6. System stores private data to "shipmentDetails" collection:
   - Key: "SHIPMENT_{waybill}"
   - Value: ShipmentPrivateDetails JSON
   - Access: Only OrgShipperMSP and OrgWarehouseMSP can read
   
7. System updates Product:
   - status = "Shipped"
   - updatedAt = timestamp
   - version++ (optimistic locking)
   
8. Return success
```

**Outputs**:
- Public shipment record
- Private cost/route data (encrypted)
- Product state updated

**Data Isolation**:
- Public: All orgs see tracking number, locations, temperature
- Private: Only Shipper + Warehouse see costs, detailed routes
- Retailer/Manufacturer: Cannot access private data

---

### BP4. Order Creation with Private Pricing

**Actors**: Manufacturer (seller) or Retailer (buyer)  
**Trigger**: Commercial agreement  
**Preconditions**:
- Caller MSP = OrgManufacturerMSP OR OrgRetailerMSP

**Flow**:
```
1. Actor invokes CreateOrder(orderID, productIDs[], buyerID, sellerID)
   WITH transient data: {
     "price": {
       "orderID": "...",
       "totalPrice": 50000.00,
       "discount": 2500.00
     }
   }

2. System validates:
   - Caller MSP in [OrgManufacturerMSP, OrgRetailerMSP]
   - orderID non-empty, unique
   - productIDs non-empty array
   - buyerID, sellerID non-empty
   
3. System validates transient price data:
   - Valid JSON
   - Size < 5KB
   - totalPrice >= 0
   - discount >= 0
   - discount <= totalPrice
   
4. System creates public Order:
   - NO price information
   - status = "Created"
   
5. System stores Order to public ledger

6. System stores private data to "priceData" collection:
   - Key: "ORDER_{orderID}"
   - Value: OrderPrivateDetails JSON
   - Access: Only OrgManufacturerMSP and OrgRetailerMSP can read
   
7. Return success
```

**Outputs**:
- Public order record (no pricing)
- Private pricing data (encrypted)

**Privacy Model**:
- Shipper/Warehouse: See order exists, product list, status
- Shipper/Warehouse: CANNOT see prices, discounts
- Only Manufacturer + Retailer: Full commercial terms

---

### BP5. Product History Query (Traceability)

**Actors**: Any organization, Consumer (via Retailer)  
**Trigger**: Need to verify product journey  
**Preconditions**: Product exists

**Flow**:
```
1. Actor invokes GetProductHistory(productID)

2. System retrieves all historical states:
   - Uses Fabric's GetHistoryForKey()
   - Returns array of {txId, timestamp, record, isDelete}
   
3. System constructs timeline:
   - Created at Manufacturer X on date Y
   - Handed over to Shipper Z on date A
   - Shipped with waybill W on date B
   - Received at Warehouse Q on date C
   - Delivered to Retailer R on date D
   - Sold on date E
   
4. Return history array (immutable audit trail)
```

**Outputs**: Complete lifecycle with timestamps and actors

**Use Cases**:
- Consumer scans QR code → See full journey
- Quality issue → Trace back to production batch
- Compliance audit → Verify cold chain maintenance
- Recall → Identify all affected products by batch

---

### BP6. Pagination Query (Large Datasets)

**Actors**: Any organization  
**Trigger**: Need to list many products  
**Preconditions**: None

**Flow**:
```
1. Actor invokes GetProductsPaginated(pageSize, bookmark)
   - pageSize: 1-1000 (validated)
   - bookmark: "" for first page, or from previous response

2. System builds CouchDB query:
   {
     "selector": {
       "name": {"$exists": true},
       "batch": {"$exists": true}
     },
     "sort": [{"createdAt": "desc"}]
   }
   
3. System executes GetQueryResultWithPagination(query, pageSize, bookmark)

4. System processes results:
   - Deserialize each product
   - Initialize empty approvals arrays (prevent null)
   - Collect into array
   
5. System returns:
   {
     "products": [...],
     "bookmark": "g1AAAABweJzLY...",  // Next page token
     "count": 25                       // Items in this page
   }
   
6. Client uses bookmark for next page:
   GetProductsPaginated(25, "g1AAAABweJzLY...")
```

**Outputs**: Paginated results with continuation token

**Performance**: Handles millions of products without memory overflow

---

## Security Rules

### SR1. Access Control Matrix

| Function | Manufacturer | Shipper | Warehouse | Retailer |
|----------|--------------|---------|-----------|----------|
| CreateProduct | ✅ Write | ❌ | ❌ | ❌ |
| RequestHandoverToShipper | ✅ Write | ❌ | ❌ | ❌ |
| RequestHandoverToWarehouse | ❌ | ✅ Write | ❌ | ❌ |
| AcceptHandover (from Mfr) | ❌ | ✅ Write | ❌ | ❌ |
| AcceptHandover (from Ship) | ❌ | ❌ | ✅ Write | ❌ |
| AcceptHandover (from Whse) | ❌ | ❌ | ❌ | ✅ Write |
| RejectHandover | ❌ | ✅ Write | ✅ Write | ✅ Write |
| ShipProduct | ❌ | ✅ Write | ❌ | ❌ |
| UpdateShipment | ❌ | ✅ Write | ❌ | ❌ |
| ReceiveAtWarehouse | ❌ | ❌ | ✅ Write | ❌ |
| DeliverToRetailer | ❌ | ❌ | ✅ Write | ❌ |
| MarkAsSold | ❌ | ❌ | ❌ | ✅ Write |
| CreateOrder | ✅ Write | ❌ | ❌ | ✅ Write |
| GetProduct | ✅ Read | ✅ Read | ✅ Read | ✅ Read |
| GetProductHistory | ✅ Read | ✅ Read | ✅ Read | ✅ Read |
| GetShipmentDetails | ❌ | ✅ Read | ✅ Read | ❌ |
| GetOrderPrice | ✅ Read | ❌ | ❌ | ✅ Read |

**Enforcement**: MSP ID extracted from caller's X.509 certificate (cannot be forged)

---

### SR2. Signature Verification Rules

**Algorithm**: ECDSA with P-256 curve  
**Hash Function**: SHA-256  
**Key Source**: X.509 certificate public key

**Verification Process**:
```
1. Extract certificate from transaction context
2. Decode hex signature
3. Unmarshal ASN.1 DER format → (R, S)
4. Compute SHA-256 hash of message
5. Extract ECDSA public key from certificate
6. Verify: ecdsa.Verify(pubKey, hash, R, S)
7. Return true/false
```

**Messages to Sign**:
- Handover request: `{handoverID}:{nonce}:{actorID}`
- Handover accept: `{handoverID}:{nonce}:{receiverID}`
- Handover reject: `{handoverID}:{nonce}:{rejecterID}`

**Replay Attack Prevention**:
- Nonce = SHA256(TxID + productID + timestamp)
- Deterministic across all peers (no endorsement mismatch)
- Unique per transaction
- Signature must include nonce

---

### SR3. Private Data Collections

**Collection 1: priceData**
```yaml
name: priceData
policy: OrgManufacturerMSP OR OrgRetailerMSP
requiredPeerCount: 1
maxPeerCount: 2
blockToLive: 0  # Persist forever
memberOnlyRead: true
memberOnlyWrite: true
```

**Collection 2: shipmentDetails**
```yaml
name: shipmentDetails
policy: OrgShipperMSP OR OrgWarehouseMSP
requiredPeerCount: 1
maxPeerCount: 2
blockToLive: 0
memberOnlyRead: true
memberOnlyWrite: true
```

**Collection 3: handoverSignatures**
```yaml
name: handoverSignatures
policy: ALL organizations
requiredPeerCount: 3
maxPeerCount: 4
blockToLive: 0
memberOnlyRead: false
memberOnlyWrite: true
```

**Data Isolation**:
- Private data physically stored on authorized peers only
- Hash of private data on public ledger (for verification)
- Unauthorized peers cannot decrypt private data

---

### SR4. State Validation Rules

**Rule**: Every state transition MUST be validated against state machine

**Implementation**:
```go
func UpdateProductStatus(..., newStatus, ...) error {
  // Get current state
  product := GetProduct(productID)
  currentStatus := product.status
  
  // Get caller MSP
  callerMSP := GetMSPID()
  
  // Validate transition
  if !isValidStateTransition(currentStatus, newStatus, callerMSP) {
    return Error("invalid state transition: %s -> %s not allowed for %s",
                 currentStatus, newStatus, callerMSP)
  }
  
  // Proceed with update
  product.status = newStatus
  product.version++
  Save(product)
}
```

**Examples**:
- ✅ Manufacturer: Manufactured → HandoverRequested
- ❌ Manufacturer: Manufactured → Sold (invalid)
- ✅ Shipper: InTransit → Shipped
- ❌ Retailer: InTransit → Shipped (wrong MSP)

---

### SR5. Optimistic Locking (Concurrency Control)

**Purpose**: Prevent lost updates in concurrent transactions

**Mechanism**:
```go
func AcceptHandover(...) error {
  product := GetProduct(productID)
  originalVersion := product.version  // Capture version
  
  // Modify product
  product.status = "InTransit"
  product.owner = "Shipper"
  product.version = originalVersion + 1  // Increment
  
  // Save (Fabric's endorsement will detect if version changed)
  // If another transaction modified product between read and write,
  // endorsement will fail due to different read-write sets
  Save(product)
}
```

**How It Works**:
1. Transaction T1 reads product (version=5)
2. Transaction T2 reads product (version=5)
3. T1 writes product (version=6) → Committed
4. T2 writes product (version=6) → Endorsement FAILS (read-write set conflict)

**Benefit**: Ensures ACID properties without traditional database locks

---

## Data Validation Rules

### VR1. Product ID Validation
```
Pattern: ^[A-Z0-9-]+$
Length: 1-64 characters
Examples:
  ✅ PROD-001
  ✅ BATCH-2025-ABC
  ✅ SKU123456
  ❌ prod-001 (lowercase)
  ❌ PROD_001 (underscore)
  ❌ (empty)
```

### VR2. Date Validation
```
Format: YYYY-MM-DD (ISO 8601)
Range: 1900-01-01 to 2100-12-31
Examples:
  ✅ 2025-11-25
  ✅ 2024-01-01
  ❌ 25-11-2025 (wrong order)
  ❌ 2025/11/25 (wrong separator)
  ❌ 2025-13-01 (invalid month)
```

### VR3. Transient Data Validation
```
priceData:
  - Must be valid JSON
  - Size < 5KB
  - totalPrice >= 0
  - discount >= 0
  - discount <= totalPrice

shipmentDetails:
  - Must be valid JSON
  - Size < 10KB
  - waybill non-empty
  - actualCost >= 0
  - routeDetails max 1000 chars
```

### VR4. String Field Validation
```
Non-empty fields: name, batch, origin, metaHash
Max lengths:
  - name: 256 chars
  - batch: 64 chars
  - origin: 256 chars
  - metaHash: 128 chars
  - rejectionReason: 500 chars
```

---

## Endorsement Policy

**Policy**: MAJORITY (3 out of 4 organizations)

**Definition**:
```yaml
AND(
  OR('OrgManufacturerMSP.peer', 'OrgShipperMSP.peer'),
  OR('OrgWarehouseMSP.peer', 'OrgRetailerMSP.peer'),
  OR('OrgManufacturerMSP.peer', 'OrgShipperMSP.peer', 'OrgWarehouseMSP.peer', 'OrgRetailerMSP.peer')
)
```

**In Practice**:
- Every invoke MUST call 3 peers
- Example: Manufacturer + Shipper + Warehouse
- All 3 must return identical results
- If mismatch → Transaction rejected

**Invocation Pattern**:
```bash
peer chaincode invoke \
  --peerAddresses peer0.manufacturer.example.com:7051 \
  --tlsRootCertFiles /path/to/manufacturer/ca.crt \
  --peerAddresses peer0.shipper.example.com:8051 \
  --tlsRootCertFiles /path/to/shipper/ca.crt \
  --peerAddresses peer0.warehouse.example.com:9051 \
  --tlsRootCertFiles /path/to/warehouse/ca.crt \
  -c '{"function":"CreateProduct","Args":[...]}'
```

---

## Event Model

### Event 1: HandoverRequested
```json
{
  "event": "HandoverRequested",
  "handoverID": "HANDOVER-PROD001-SHIPPER-57b8cdf9534e",
  "productID": "PROD001",
  "fromOrg": "Manufacturer",
  "toOrg": "Shipper",
  "timestamp": "2025-11-25T10:50:58Z"
}
```

### Event 2: HandoverCompleted
```json
{
  "event": "HandoverCompleted",
  "productID": "PROD001",
  "fromOrg": "Manufacturer",
  "toOrg": "Shipper",
  "acceptedBy": "Admin@shipper.example.com",
  "timestamp": "2025-11-25T11:30:22Z"
}
```

### Event 3: HandoverRejected
```json
{
  "event": "HandoverRejected",
  "productID": "PROD001",
  "fromOrg": "Manufacturer",
  "toOrg": "Shipper",
  "reason": "Product damaged upon inspection",
  "timestamp": "2025-11-25T11:30:22Z"
}
```

### Event 4: HandoverExpired
```json
{
  "event": "HandoverExpired",
  "handoverID": "HANDOVER-PROD001-SHIPPER-abc123",
  "productID": "PROD001",
  "timestamp": "2025-12-02T10:50:58Z"
}
```

**Event Listener** (Off-chain):
```javascript
// apps/gateway-nodejs/src/eventListener.js
contract.addContractListener('handover-listener', 'HandoverRequested', 
  async (error, event) => {
    // Send notification to receiver
    // Update PostgreSQL for quick queries
    // Trigger email/SMS alerts
  }
);
```

---

## Off-Chain Integration (PostgreSQL)

**Purpose**: Enable fast queries without blockchain traversal

**Tables**:
```sql
-- Mirror of blockchain state for quick access
CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(256),
  batch VARCHAR(64),
  status VARCHAR(32),
  owner VARCHAR(32),
  version INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_owner (owner)
);

-- Notification queue
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  recipient_msp VARCHAR(32),
  type VARCHAR(32),  -- HANDOVER_REQUEST, HANDOVER_ACCEPTED, etc.
  reference_id VARCHAR(128),  -- handoverID or productID
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Handover tracking
CREATE TABLE handovers (
  id VARCHAR(128) PRIMARY KEY,
  product_id VARCHAR(64),
  from_org VARCHAR(32),
  to_org VARCHAR(32),
  status VARCHAR(32),
  requested_at TIMESTAMP,
  expires_at TIMESTAMP,
  acted_at TIMESTAMP,
  INDEX idx_to_org_status (to_org, status),
  INDEX idx_expires (expires_at)
);
```

**Sync Strategy**:
- Event listener writes to PostgreSQL on every blockchain event
- PostgreSQL is cache (blockchain is source of truth)
- If discrepancy → Blockchain wins, rebuild PostgreSQL from ledger

---

## Error Codes

| Code | Category | Message | Resolution |
|------|----------|---------|------------|
| E1001 | Validation | Invalid product ID format | Use [A-Z0-9-] only, 1-64 chars |
| E1002 | Validation | Product already exists | Choose unique product ID |
| E1003 | Validation | Invalid date format | Use YYYY-MM-DD |
| E1004 | Validation | Empty required field | Provide all mandatory fields |
| E2001 | Authorization | Only manufacturer can create products | Switch to manufacturer identity |
| E2002 | Authorization | Unauthorized: only {org} can accept this handover | Use correct organization MSP |
| E2003 | Authorization | Product not owned by {org} | Verify product ownership |
| E3001 | State | Product must be in {state} state | Check current product status |
| E3002 | State | Invalid state transition | See state machine diagram |
| E3003 | State | Product already has pending handover | Complete or reject existing handover first |
| E4001 | Signature | Signature validation failed | Use valid ECDSA signature with nonce |
| E4002 | Signature | Invalid signature or replay attack detected | Regenerate signature with current nonce |
| E5001 | Expiration | Handover has expired | Create new handover request |
| E5002 | Expiration | Handover not yet expired | Wait for expiration or receiver action |
| E6001 | Concurrency | Concurrent modification detected | Retry transaction |

---

## Glossary

**Blockchain**: Distributed ledger with immutable transaction log  
**Chaincode**: Smart contract code running on Hyperledger Fabric  
**Channel**: Private subnet of communication between organizations  
**Endorsement**: Validation of transaction by peer nodes  
**MSP**: Membership Service Provider (identity management)  
**Nonce**: Number used once (prevents replay attacks)  
**Optimistic Locking**: Concurrency control without locks  
**PDC**: Private Data Collection (encrypted data subset)  
**TxID**: Transaction ID (unique, deterministic identifier)  
**X.509**: Certificate standard for public key infrastructure

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-25 | System | Initial AIDS specification |

---

**Document Owner**: FarmTrace Development Team  
**Review Cycle**: Quarterly  
**Next Review**: 2026-02-25
