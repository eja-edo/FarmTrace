# Supply Chain Blockchain - Design Document

## 1. Overview

This document describes the architecture and design of the Supply Chain Blockchain system built on Hyperledger Fabric.

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web Client  │  │ Mobile App   │  │   Admin UI   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                      Gateway API Layer                       │
│  ┌────────────────────────────────────────────────────┐     │
│  │  REST API (Node.js Express)                        │     │
│  │  - Authentication & Authorization                  │     │
│  │  - Request Validation                              │     │
│  │  - Fabric SDK Integration                          │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                  Hyperledger Fabric Network                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │                Orderer Cluster (RAFT)            │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │       │
│  │  │ Orderer1 │  │ Orderer2 │  │ Orderer3 │       │       │
│  │  └──────────┘  └──────────┘  └──────────┘       │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Channel: supplychain-channel           │    │
│  │                                                       │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │Manufacturer│  │  Shipper   │  │ Warehouse  │   │    │
│  │  │   Peer0    │  │   Peer0    │  │   Peer0    │   │    │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘   │    │
│  │        │               │               │           │    │
│  │  ┌─────┴──────┐  ┌────┴──────┐  ┌────┴──────┐   │    │
│  │  │  CouchDB   │  │  CouchDB  │  │  CouchDB  │   │    │
│  │  └────────────┘  └───────────┘  └───────────┘   │    │
│  │                                                       │    │
│  │  ┌────────────┐                                     │    │
│  │  │  Retailer  │                                     │    │
│  │  │   Peer0    │                                     │    │
│  │  └─────┬──────┘                                     │    │
│  │        │                                            │    │
│  │  ┌─────┴──────┐                                     │    │
│  │  │  CouchDB   │                                     │    │
│  │  └────────────┘                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │        Chaincode: supplychain_cc (Go)            │       │
│  │  - Product Management                             │       │
│  │  - Shipment Tracking                              │       │
│  │  - Order Processing                               │       │
│  └──────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                     Off-Chain Storage                        │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────┐      │
│  │   PostgreSQL   │  │     IPFS       │  │  Kafka   │      │
│  │   (Metadata)   │  │  (Documents)   │  │ (Events) │      │
│  └────────────────┘  └────────────────┘  └──────────┘      │
└───────────────────────────────────────────────────────────────┘
```

## 3. Network Components

### 3.1 Organizations

1. **OrgManufacturer** (Nhà sản xuất)
   - Responsible for creating products
   - Can initiate shipments
   - MSP ID: OrgManufacturerMSP

2. **OrgShipper** (Vận chuyển)
   - Updates shipment status
   - Tracks location and temperature
   - MSP ID: OrgShipperMSP

3. **OrgWarehouse** (Kho)
   - Receives products
   - Manages inventory
   - MSP ID: OrgWarehouseMSP

4. **OrgRetailer** (Cửa hàng)
   - Receives from warehouse
   - Sells to customers
   - MSP ID: OrgRetailerMSP

### 3.2 Orderer Cluster

- **Type**: Raft consensus
- **Nodes**: 3 orderers for high availability
- **Configuration**:
  - BatchTimeout: 2s
  - MaxMessageCount: 10
  - AbsoluteMaxBytes: 99 MB

### 3.3 Peers

- Each organization has at least 1 peer (peer0)
- State database: CouchDB
- Endorsement required from respective organization
- Anchor peers configured for gossip protocol

## 4. Chaincode Design

### 4.1 Data Models

#### Product
```go
type Product struct {
    ID              string
    Name            string
    Batch           string
    Origin          string
    ManufactureDate string
    Status          string
    Owner           string
    MetaHash        string
    CreatedAt       string
    UpdatedAt       string
}
```

**Status Flow**: 
Manufactured → Shipped → InTransit → InWarehouse → DeliveredToRetailer → Sold

#### Shipment
```go
type Shipment struct {
    ID          string
    ProductID   string
    ShipperID   string
    Waybill     string
    Origin      string
    Destination string
    Status      string
    Temperature float64
    Locations   []string
    CreatedAt   string
    UpdatedAt   string
}
```

#### Order
```go
type Order struct {
    ID         string
    ProductIDs []string
    BuyerID    string
    SellerID   string
    Status     string
    TotalPrice float64
    CreatedAt  string
    UpdatedAt  string
}
```

### 4.2 Access Control

| Function | Manufacturer | Shipper | Warehouse | Retailer |
|----------|--------------|---------|-----------|----------|
| CreateProduct | ✓ | ✗ | ✗ | ✗ |
| ShipProduct | ✓ | ✓ | ✗ | ✗ |
| UpdateShipment | ✗ | ✓ | ✗ | ✗ |
| ReceiveAtWarehouse | ✗ | ✗ | ✓ | ✗ |
| DeliverToRetailer | ✗ | ✗ | ✓ | ✓ |
| MarkAsSold | ✗ | ✗ | ✗ | ✓ |
| GetProduct | ✓ | ✓ | ✓ | ✓ |
| GetProductHistory | ✓ | ✓ | ✓ | ✓ |

## 5. Endorsement Policy

Default policy: `MAJORITY Endorsement`

For critical operations:
```
AND('OrgManufacturerMSP.peer', 'OrgShipperMSP.peer', 'OrgWarehouseMSP.peer', 'OrgRetailerMSP.peer')
```

## 6. Off-Chain Storage

### 6.1 PostgreSQL

Stores:
- Product metadata and IPFS hashes
- Transaction mappings (txHash → productId)
- User information
- Audit logs

### 6.2 IPFS (Optional)

Stores:
- Product images
- Certificates
- Documentation
- Large files

Only content hash is stored on blockchain.

## 7. API Gateway

### 7.1 Endpoints

#### Products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product
- `GET /api/products/:id/history` - Get product history
- `PUT /api/products/:id/ship` - Ship product
- `PUT /api/products/:id/warehouse` - Receive at warehouse
- `PUT /api/products/:id/retailer` - Deliver to retailer
- `PUT /api/products/:id/sold` - Mark as sold

#### Shipments
- `PUT /api/shipments/:waybill/update` - Update shipment

#### Orders
- `POST /api/orders` - Create order

### 7.2 Authentication

- Organization-based authentication
- Certificate-based identity verification
- JWT tokens for API access

## 8. Security

### 8.1 Network Level
- TLS 1.3 for all communications
- X.509 certificates for identities
- Mutual TLS authentication

### 8.2 Chaincode Level
- MSP ID validation
- Role-based access control
- State-based endorsement (if needed)

### 8.3 Application Level
- Input validation
- SQL injection prevention
- Rate limiting
- CORS configuration

## 9. Performance Considerations

### 9.1 Expected Load
- Target TPS: 50-100 transactions per second
- Block creation time: 2 seconds
- Expected block size: ~10 transactions per block

### 9.2 Optimization
- CouchDB indexes for frequent queries
- Connection pooling for database
- Caching layer (Redis) if needed

## 10. Monitoring & Observability

### 10.1 Metrics
- Transaction throughput
- Block height per peer
- Endorsement failures
- API response times

### 10.2 Tools
- Prometheus for metrics collection
- Grafana for visualization
- ELK/EFK stack for log aggregation

## 11. Backup & Recovery

### 11.1 Backup Strategy
- Daily snapshots of peer ledgers
- PostgreSQL backups (hourly)
- Crypto material backup (encrypted)

### 11.2 Recovery Procedures
- Peer recovery from snapshot
- Channel configuration backup
- Disaster recovery runbook

## 12. Future Enhancements

1. **Smart Contract Upgrades**
   - Version management
   - Backward compatibility

2. **Private Data Collections**
   - Confidential pricing information
   - Private shipment details

3. **Event-Driven Architecture**
   - Kafka integration
   - Real-time notifications

4. **Analytics**
   - Supply chain analytics dashboard
   - Predictive maintenance

5. **Integration**
   - ERP system integration
   - IoT device integration for real-time tracking
