# FarmTrace Web UI - User Guide

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [Organization Roles](#organization-roles)
3. [Features by Role](#features-by-role)
4. [Handover Workflow](#handover-workflow)
5. [Product Tracking](#product-tracking)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Accessing the Application

1. Open your browser and navigate to `http://localhost:3001`
2. You will see the organization selection screen
3. Choose your role: Manufacturer, Shipper, Warehouse, or Retailer
4. You will be redirected to your role-specific dashboard

### User Interface Overview

**Main Components:**
- **Sidebar** (left): Navigation menu with organization branding
- **Header** (top): Page title, notifications, and user profile
- **Main Content** (center): Dynamic content based on selected page
- **Mobile Menu**: Tap hamburger icon on mobile devices

## 👥 Organization Roles

### 1. 🏭 Manufacturer (Green)
**Responsibilities:**
- Create new products in the system
- Initiate handovers to shippers
- Monitor product status
- Track handover approvals

**Access Rights:**
- Full CRUD on own products
- Can request handovers
- View all products created
- Cannot accept handovers

### 2. 🚚 Shipper (Blue)
**Responsibilities:**
- Accept or reject handover requests
- Manage products in transit
- Update shipment information
- Deliver to warehouses

**Access Rights:**
- View pending handover requests
- Accept/reject handovers with signature
- Update shipment status
- View products in transit

### 3. 🏬 Warehouse (Orange)
**Responsibilities:**
- Receive products from shippers
- Manage inventory storage
- Prepare for retailer delivery
- Track warehouse operations

**Access Rights:**
- View pending receipts
- Accept products with signature
- View warehouse inventory
- Initiate handovers to retailers

### 4. 🏪 Retailer (Purple)
**Responsibilities:**
- Receive products from warehouse
- Sell to end customers
- Mark products as sold
- Maintain sales records

**Access Rights:**
- View pending receipts
- Accept products with signature
- Mark products as sold
- View sales history

## 🎯 Features by Role

### Manufacturer Features

#### Create Product
1. Click "Create Product" button on dashboard
2. Fill in product details:
   - Product ID (unique identifier)
   - Product Name
   - Description (optional)
   - Quantity
3. Click "Create Product"
4. Product is recorded on blockchain

#### Initiate Handover
1. Go to product detail page
2. Click "Request Handover"
3. Enter:
   - Shipper ID
   - Waybill number
   - Your digital signature
4. Click "Submit"
5. Shipper receives notification

### Shipper Features

#### Review Handover Request
1. Dashboard shows pending handovers count
2. Click "Review & Approve" on handover card
3. View handover details:
   - Product information
   - From/To organizations
   - Waybill number
   - Initiator signature

#### Accept Handover
1. On handover detail page
2. Click "Accept Handover"
3. Enter:
   - Receiver ID
   - Your digital signature
4. Click "Accept"
5. Product ownership transfers
6. Status changes to "In Transit"

#### Reject Handover
1. On handover detail page
2. Click "Reject Handover"
3. Enter:
   - Rejection reason
   - Your digital signature
4. Click "Reject"
5. Product returns to manufacturer
6. Rejection recorded on blockchain

### Warehouse Features

#### Confirm Receipt
1. View pending receipts on dashboard
2. Click "Confirm Receipt" on incoming product
3. Enter:
   - Receiver ID
   - Digital signature
4. Click "Confirm"
5. Product added to inventory

#### Manage Inventory
1. Navigate to "Inventory" page
2. View all products in warehouse
3. Search and filter products
4. View product details and history

### Retailer Features

#### Receive Products
1. View pending handovers
2. Click "Confirm Receipt"
3. Enter receiver information
4. Accept delivery

#### Mark as Sold
1. Go to product detail page
2. Click "Mark as Sold"
3. Enter sale information
4. Product status updates to "Sold"

## 🔄 Handover Workflow

### Complete Workflow Example

**Step 1: Manufacturer Creates Product**
```
PROD001 → Status: Created, Owner: Manufacturer
```

**Step 2: Manufacturer Requests Handover**
```
Creates Handover HOV001
Status: PENDING
From: Manufacturer → To: Shipper
Product Status: HandoverRequested
```

**Step 3a: Shipper Accepts**
```
Handover Status: ACCEPTED
Product Owner: Shipper
Product Status: InTransit
Approval recorded with signature
```

**Step 3b: Shipper Rejects (Alternative)**
```
Handover Status: REJECTED
Product Owner: Manufacturer (reverted)
Product Status: HandoverFailed
Rejection reason recorded
```

**Step 4: Shipper to Warehouse**
```
Shipper requests handover to Warehouse
Warehouse accepts
Product Owner: Warehouse
Product Status: Received
```

**Step 5: Warehouse to Retailer**
```
Warehouse requests handover to Retailer
Retailer accepts
Product Owner: Retailer
Product Status: Received
```

**Step 6: Sale to Customer**
```
Retailer marks as Sold
Product Status: Sold
End of lifecycle
```

## 📦 Product Tracking

### Product Detail Page Features

**Information Displayed:**
- Product ID and name
- Current owner and status
- Quantity and manufacturer
- Creation timestamp
- Description
- QR code for mobile scanning

**Approval History:**
- List of all approvals
- Actor (who approved)
- Timestamp
- Digital signature

**Blockchain History:**
- Complete transaction log
- Ownership transfers
- Status changes
- Timestamps

### Product Status Values
- `Created` - Initial state after creation
- `HandoverRequested` - Pending handover approval
- `InTransit` - Accepted by shipper, in delivery
- `Received` - Received by warehouse/retailer
- `Sold` - Purchased by end customer
- `HandoverFailed` - Handover rejected

## 📋 Common Tasks

### Search for Product
1. Go to Products page
2. Type product ID or name in search box
3. Results filter in real-time

### Filter by Status
1. Go to Products or Handovers page
2. Select status from dropdown
3. Click "Reset" to clear filters

### View Notifications
1. Click bell icon in header
2. See unread notification count
3. Click notification to view details

### Switch Organization
1. Click "Logout" in sidebar
2. Select different organization
3. Dashboard updates to new role

### Generate QR Code
1. Go to any product detail page
2. QR code displayed in sidebar
3. Scan with mobile device
4. Opens product details

### View Handover Details
1. Click on any handover card
2. View complete information
3. See approval history
4. Check status and timestamps

## 🔧 Troubleshooting

### Cannot Connect to API
**Symptom:** Error messages about network connection

**Solutions:**
1. Check API Gateway is running: `docker ps`
2. Verify API at: `http://localhost:3000/api/health`
3. Restart API Gateway if needed
4. Check firewall settings

### Handover Stuck in PENDING
**Symptom:** Handover not completing

**Check:**
1. Correct organization selected
2. Receiver organization logged in
3. Network connectivity
4. Blockchain network status

### Products Not Loading
**Symptom:** Empty product list or loading forever

**Solutions:**
1. Clear browser cache
2. Check browser console for errors
3. Verify API connectivity
4. Check blockchain chaincode status

### Cannot Create Product
**Symptom:** Create product fails

**Check:**
1. Logged in as Manufacturer
2. Product ID is unique
3. All required fields filled
4. Network connection active

### Page Not Found Error
**Symptom:** 404 error on navigation

**Solutions:**
1. Refresh browser
2. Clear browser cache
3. Check URL is correct
4. Restart development server

### Styling Issues
**Symptom:** UI looks broken or unstyled

**Solutions:**
1. Run `npm install` to ensure dependencies
2. Clear browser cache
3. Check Tailwind CSS is compiling
4. Restart dev server

## 🎨 UI Tips

### Keyboard Shortcuts
- `Ctrl/Cmd + K` - Focus search (when available)
- `Esc` - Close modals
- `Enter` - Submit forms

### Mobile Usage
- Swipe left/right on tables to scroll
- Tap hamburger icon to open menu
- Pull to refresh (in supported browsers)

### Best Practices
1. Always provide signatures for handovers
2. Review details before accepting/rejecting
3. Use QR codes for quick product lookup
4. Check notifications regularly
5. Filter and search for better navigation

## 📞 Getting Help

**If you encounter issues:**

1. Check this guide first
2. Review browser console for errors
3. Check API Gateway logs
4. Verify blockchain network status
5. Consult system administrator

**Log Locations:**
- Browser Console: F12 → Console tab
- API Logs: `docker logs <gateway-container-id>`
- Network Status: `docker ps`

---

**Version:** 1.0.0  
**Last Updated:** November 23, 2025  
**For FarmTrace Supply Chain Blockchain System**
