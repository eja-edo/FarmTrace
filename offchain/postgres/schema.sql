-- Supply Chain Off-chain Database Schema

-- Product Metadata Table
CREATE TABLE IF NOT EXISTS product_metadata (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(128) UNIQUE NOT NULL,
    tx_hash VARCHAR(128),
    meta_url TEXT,
    ipfs_hash VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_id ON product_metadata(product_id);
CREATE INDEX idx_tx_hash ON product_metadata(tx_hash);

-- Shipment Tracking Table (off-chain details)
CREATE TABLE IF NOT EXISTS shipment_details (
    id SERIAL PRIMARY KEY,
    waybill VARCHAR(128) UNIQUE NOT NULL,
    product_id VARCHAR(128) NOT NULL,
    shipper_id VARCHAR(128),
    carrier VARCHAR(255),
    tracking_url TEXT,
    estimated_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_waybill ON shipment_details(waybill);
CREATE INDEX idx_shipment_product ON shipment_details(product_id);

-- Pending Handovers Table (critical for approval workflow)
CREATE TABLE IF NOT EXISTS pending_handovers (
    id SERIAL PRIMARY KEY,
    handover_id VARCHAR(128) UNIQUE NOT NULL,
    product_id VARCHAR(128) NOT NULL,
    from_org VARCHAR(128) NOT NULL,
    to_org VARCHAR(128) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    waybill VARCHAR(128),
    requester_id VARCHAR(128),
    requester_signature TEXT,
    receiver_id VARCHAR(128),
    receiver_signature TEXT,
    rejection_reason TEXT,
    request_timestamp TIMESTAMP,
    response_timestamp TIMESTAMP,
    metadata JSONB,
    tx_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_handover_id ON pending_handovers(handover_id);
CREATE INDEX idx_handover_product ON pending_handovers(product_id);
CREATE INDEX idx_handover_to_org ON pending_handovers(to_org);
CREATE INDEX idx_handover_status ON pending_handovers(status);
CREATE INDEX idx_handover_created ON pending_handovers(created_at);

-- Handover Approvals Table (audit trail for human confirmations)
CREATE TABLE IF NOT EXISTS handover_approvals (
    id SERIAL PRIMARY KEY,
    handover_id VARCHAR(128) NOT NULL,
    actor VARCHAR(128) NOT NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    signature TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_approval_handover ON handover_approvals(handover_id);
CREATE INDEX idx_approval_actor ON handover_approvals(actor);
CREATE INDEX idx_approval_timestamp ON handover_approvals(timestamp);

-- Notifications Table (for alerting users about pending handovers)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    organization VARCHAR(128) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(128),
    priority VARCHAR(20) DEFAULT 'NORMAL',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_user ON notifications(user_id);
CREATE INDEX idx_notification_org ON notifications(organization);
CREATE INDEX idx_notification_read ON notifications(is_read);
CREATE INDEX idx_notification_created ON notifications(created_at);

-- Order Details Table (off-chain)
CREATE TABLE IF NOT EXISTS order_details (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(128) UNIQUE NOT NULL,
    buyer_name VARCHAR(255),
    buyer_email VARCHAR(255),
    buyer_phone VARCHAR(50),
    shipping_address TEXT,
    billing_address TEXT,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_id ON order_details(order_id);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id VARCHAR(128),
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- Transaction Mapping Table
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id SERIAL PRIMARY KEY,
    tx_id VARCHAR(128) UNIQUE NOT NULL,
    channel_name VARCHAR(128),
    chaincode_name VARCHAR(128),
    function_name VARCHAR(128),
    args JSONB,
    response JSONB,
    status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tx_id ON blockchain_transactions(tx_id);
CREATE INDEX idx_tx_timestamp ON blockchain_transactions(timestamp);

-- Event Log Table
CREATE TABLE IF NOT EXISTS event_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(128) NOT NULL,
    event_name VARCHAR(128),
    payload JSONB,
    block_number BIGINT,
    tx_id VARCHAR(128),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_type ON event_log(event_type);
CREATE INDEX idx_event_processed ON event_log(processed);
CREATE INDEX idx_event_created ON event_log(created_at);

-- Users Table (for application-level authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    organization VARCHAR(128),
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_user_org ON users(organization);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables
CREATE TRIGGER update_product_metadata_updated_at BEFORE UPDATE ON product_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipment_details_updated_at BEFORE UPDATE ON shipment_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_details_updated_at BEFORE UPDATE ON order_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO users (user_id, username, email, organization, role) VALUES
('admin', 'admin', 'admin@manufacturer.com', 'OrgManufacturerMSP', 'admin'),
('shipper1', 'shipper1', 'shipper@shipper.com', 'OrgShipperMSP', 'shipper'),
('warehouse1', 'warehouse1', 'warehouse@warehouse.com', 'OrgWarehouseMSP', 'warehouse'),
('retailer1', 'retailer1', 'retailer@retailer.com', 'OrgRetailerMSP', 'retailer')
ON CONFLICT (user_id) DO NOTHING;
