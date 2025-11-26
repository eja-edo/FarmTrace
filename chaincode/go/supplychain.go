package main

import (
	"crypto/ecdsa"
	"crypto/sha256"
	"encoding/asn1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// MSP constants to avoid magic strings
const (
	ManufacturerMSP = "OrgManufacturerMSP"
	ShipperMSP      = "OrgShipperMSP"
	WarehouseMSP    = "OrgWarehouseMSP"
	RetailerMSP     = "OrgRetailerMSP"
)

// Product status constants
const (
	StatusManufactured       = "Manufactured"
	StatusHandoverRequested  = "HandoverRequested"
	StatusInTransit          = "InTransit"
	StatusShipped            = "Shipped"
	StatusInWarehouse        = "InWarehouse"
	StatusDeliveredToRetailer = "DeliveredToRetailer"
	StatusSold               = "Sold"
	StatusHandoverFailed     = "HandoverFailed"
	StatusHandoverExpired    = "HandoverExpired"
)

// SmartContract provides functions for managing supply chain
type SmartContract struct {
	contractapi.Contract
}

// Product represents a product in the supply chain
type Product struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Batch           string     `json:"batch"`
	Origin          string     `json:"origin"`
	ManufactureDate string     `json:"manufactureDate"`
	Status          string     `json:"status"`
	Owner           string     `json:"owner"`
	CurrentHolder   string     `json:"currentHolder"`
	PendingHandover string     `json:"pendingHandover"`
	MetaHash        string     `json:"metaHash"`
	Approvals       []Approval `json:"approvals"`
	Version         int        `json:"version"`
	CreatedAt       string     `json:"createdAt"`
	UpdatedAt       string     `json:"updatedAt"`
}

// Shipment represents a shipment record
type Shipment struct {
	ID          string   `json:"id"`
	ProductID   string   `json:"productId"`
	ShipperID   string   `json:"shipperId"`
	Waybill     string   `json:"waybill"`
	Origin      string   `json:"origin"`
	Destination string   `json:"destination"`
	Status      string   `json:"status"`
	Temperature float64  `json:"temperature"`
	Locations   []string `json:"locations"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

// Order represents an order (public data only)
type Order struct {
	ID         string   `json:"id"`
	ProductIDs []string `json:"productIds"`
	BuyerID    string   `json:"buyerId"`
	SellerID   string   `json:"sellerId"`
	Status     string   `json:"status"`
	// TotalPrice moved to private data
	CreatedAt  string   `json:"createdAt"`
	UpdatedAt  string   `json:"updatedAt"`
}

// OrderPrivateDetails stores sensitive price information
type OrderPrivateDetails struct {
	OrderID    string  `json:"orderId"`
	TotalPrice float64 `json:"totalPrice"`
	Discount   float64 `json:"discount"`
}

// ShipmentPrivateDetails stores sensitive shipment information
type ShipmentPrivateDetails struct {
	Waybill      string  `json:"waybill"`
	ActualCost   float64 `json:"actualCost"`
	RouteDetails string  `json:"routeDetails"`
}

// HandoverStatus represents the status of a handover
type HandoverStatus string

const (
	HandoverPending  HandoverStatus = "PENDING"
	HandoverAccepted HandoverStatus = "ACCEPTED"
	HandoverRejected HandoverStatus = "REJECTED"
	HandoverExpired  HandoverStatus = "EXPIRED"
)

// Handover represents a pending transfer between organizations
type Handover struct {
	ID                    string                 `json:"id"`
	ProductID             string                 `json:"productId"`
	FromOrg               string                 `json:"fromOrg"`
	ToOrg                 string                 `json:"toOrg"`
	Status                HandoverStatus         `json:"status"`
	Nonce                 string                 `json:"nonce"`           // For replay attack prevention
	ExpiresAt             string                 `json:"expiresAt"`       // Handover expiration time
	RequestedAt           string                 `json:"requestedAt"`
	RequestedBy           string                 `json:"requestedBy"`
	FromSignature         string                 `json:"fromSignature"`
	AcceptedAt            string                 `json:"acceptedAt"`
	AcceptedBy            string                 `json:"acceptedBy"`
	ToSignature           string                 `json:"toSignature"`
	RejectedAt            string                 `json:"rejectedAt"`
	RejectionReason       string                 `json:"rejectionReason"`
	Metadata              map[string]interface{} `json:"metadata,omitempty"`
}

// Approval represents an approval action in the supply chain
type Approval struct {
	Actor     string                 `json:"actor"`
	ActorMSP  string                 `json:"actorMsp"`
	Action    string                 `json:"action"`
	Timestamp string                 `json:"timestamp"`
	Signature string                 `json:"signature"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// HistoryQueryResult structure for history query
type HistoryQueryResult struct {
	TxId      string    `json:"txId"`
	Timestamp time.Time `json:"timestamp"`
	Record    *Product  `json:"record"`
	IsDelete  bool      `json:"isDelete"`
}

// PaginatedProducts structure for paginated query results
type PaginatedProducts struct {
	Products []*Product `json:"products"`
	Bookmark string     `json:"bookmark"`
	Count    int32      `json:"count"`
}

// Validation helper functions
func validateProductID(id string) error {
	if len(id) == 0 || len(id) > 64 {
		return fmt.Errorf("invalid product ID length (must be 1-64 chars)")
	}
	if !regexp.MustCompile(`^[A-Z0-9-]+$`).MatchString(id) {
		return fmt.Errorf("invalid product ID format (must be uppercase alphanumeric with hyphens)")
	}
	return nil
}

// isValidStateTransition validates if a state transition is allowed for given MSP
func isValidStateTransition(currentStatus string, newStatus string, mspID string) bool {
	// Define valid state transitions: currentStatus -> newStatus -> []allowedMSPs
	validTransitions := map[string]map[string][]string{
		StatusManufactured: {
			StatusHandoverRequested: {ManufacturerMSP},
		},
		StatusHandoverRequested: {
			StatusInTransit:       {ShipperMSP},
			StatusHandoverFailed:  {ManufacturerMSP, ShipperMSP, WarehouseMSP, RetailerMSP},
			StatusHandoverExpired: {ManufacturerMSP, ShipperMSP, WarehouseMSP, RetailerMSP},
		},
		StatusInTransit: {
			StatusShipped:           {ShipperMSP},
			StatusHandoverRequested: {ShipperMSP},
		},
		StatusShipped: {
			StatusInWarehouse:       {WarehouseMSP},
			StatusHandoverRequested: {ShipperMSP},
		},
		StatusInWarehouse: {
			StatusDeliveredToRetailer: {WarehouseMSP},
			StatusHandoverRequested:   {WarehouseMSP},
		},
		StatusDeliveredToRetailer: {
			StatusSold:               {RetailerMSP},
			StatusHandoverRequested: {RetailerMSP},
		},
		StatusHandoverFailed: {
			StatusHandoverRequested: {ManufacturerMSP, ShipperMSP, WarehouseMSP},
		},
		StatusHandoverExpired: {
			StatusHandoverRequested: {ManufacturerMSP, ShipperMSP, WarehouseMSP},
		},
	}
	
	allowedMSPs, transitionExists := validTransitions[currentStatus][newStatus]
	if !transitionExists {
		return false
	}
	
	for _, allowedMSP := range allowedMSPs {
		if allowedMSP == mspID {
		return true
		}
	}
	return false
}

func validateNotEmpty(value string, fieldName string) error {
	if len(value) == 0 {
		return fmt.Errorf("%s cannot be empty", fieldName)
	}
	return nil
}

func validateDate(dateStr string) error {
	_, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return fmt.Errorf("invalid date format (expected YYYY-MM-DD): %v", err)
	}
	return nil
}

// validateTransientData validates transient map data structure and content
func validateTransientData(transientMap map[string][]byte, key string, maxSize int) ([]byte, error) {
	data, ok := transientMap[key]
	if !ok {
		return nil, fmt.Errorf("%s not found in transient map", key)
	}
	
	if len(data) == 0 {
		return nil, fmt.Errorf("%s is empty in transient map", key)
	}
	
	if maxSize > 0 && len(data) > maxSize {
		return nil, fmt.Errorf("%s exceeds maximum size of %d bytes", key, maxSize)
	}
	
	// Validate it's valid JSON
	var jsonTest interface{}
	err := json.Unmarshal(data, &jsonTest)
	if err != nil {
		return nil, fmt.Errorf("%s contains invalid JSON: %v", key, err)
	}
	
	return data, nil
}

// getTxTimestamp returns deterministic timestamp from transaction (same across all peers)
func getTxTimestamp(ctx contractapi.TransactionContextInterface) (string, error) {
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	return time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339), nil
}

// InitLedger initializes the ledger with sample data
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	products := []Product{
		{
			ID:              "PROD001",
			Name:            "Sample Product",
			Batch:           "BATCH001",
			Origin:          "Factory A",
			ManufactureDate: "2025-11-01",
			Status:          StatusManufactured,
			Owner:           "Manufacturer",
			CurrentHolder:   "Manufacturer",
			MetaHash:        "hash123",
			Approvals:       []Approval{},
			Version:         1,
			CreatedAt:       timestamp,
			UpdatedAt:       timestamp,
		},
	}

	for _, product := range products {
		productJSON, err := json.Marshal(product)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutState(product.ID, productJSON)
		if err != nil {
			return fmt.Errorf("failed to put product to world state: %v", err)
		}
	}

	return nil
}

// CreateProduct creates a new product
func (s *SmartContract) CreateProduct(ctx contractapi.TransactionContextInterface, id string, name string, batch string, origin string, mfgDate string, metaHash string) error {
	// Input validation
	if err := validateProductID(id); err != nil {
		return fmt.Errorf("invalid product ID: %w", err)
	}
	if err := validateNotEmpty(name, "name"); err != nil {
		return err
	}
	if err := validateNotEmpty(batch, "batch"); err != nil {
		return err
	}
	if err := validateNotEmpty(origin, "origin"); err != nil {
		return err
	}
	if err := validateDate(mfgDate); err != nil {
		return err
	}
	
	exists, err := s.ProductExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("product %s already exists", id)
	}

	// Get client identity
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Only manufacturer can create products
	if clientMSPID != ManufacturerMSP {
		return fmt.Errorf("unauthorized: only manufacturer can create products (caller: %s)", clientMSPID)
	}

	// Get transaction timestamp (deterministic across all peers)
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	product := Product{
		ID:              id,
		Name:            name,
		Batch:           batch,
		Origin:          origin,
		ManufactureDate: mfgDate,
		Status:          StatusManufactured,
		Owner:           "Manufacturer",
		CurrentHolder:   "Manufacturer",
		PendingHandover: "",
		MetaHash:        metaHash,
		Approvals:       []Approval{},
		Version:         1,
		CreatedAt:       timestamp,
		UpdatedAt:       timestamp,
	}

	productJSON, err := json.Marshal(product)
	if err != nil {
		return fmt.Errorf("failed to marshal product %s: %w", id, err)
	}

	err = ctx.GetStub().PutState(id, productJSON)
	if err != nil {
		return fmt.Errorf("failed to create product %s: %w", id, err)
	}
	
	return nil
}

// ProductExists checks if a product exists
func (s *SmartContract) ProductExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	productJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return productJSON != nil, nil
}

// GetProduct returns a product by ID
func (s *SmartContract) GetProduct(ctx contractapi.TransactionContextInterface, id string) (*Product, error) {
	productJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if productJSON == nil {
		return nil, fmt.Errorf("product %s does not exist", id)
	}

	var product Product
	err = json.Unmarshal(productJSON, &product)
	if err != nil {
		return nil, err
	}

	return &product, nil
}

// UpdateProductStatus updates the status of a product
func (s *SmartContract) UpdateProductStatus(ctx contractapi.TransactionContextInterface, id string, newStatus string, actor string) error {
	product, err := s.GetProduct(ctx, id)
	if err != nil {
		return err
	}

	// Get client identity
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Validate state transition using state machine
	if !isValidStateTransition(product.Status, newStatus, clientMSPID) {
		return fmt.Errorf("invalid state transition: %s -> %s not allowed for organization %s", product.Status, newStatus, clientMSPID)
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	// Optimistic locking: increment version to detect concurrent modifications
	oldVersion := product.Version
	product.Status = newStatus
	product.Owner = actor
	product.UpdatedAt = timestamp
	product.Version = oldVersion + 1

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}

	// Note: In concurrent scenario, Fabric's endorsement policy will reject
	// if two transactions try to modify same key simultaneously
	return ctx.GetStub().PutState(id, productJSON)
}

// ShipProduct creates a shipment for a product with sensitive data in private collection
func (s *SmartContract) ShipProduct(ctx contractapi.TransactionContextInterface, productID string, shipperID string, waybill string, destination string) error {
	// Validate caller is shipper
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	if clientMSPID != ShipperMSP {
		return fmt.Errorf("unauthorized: only shipper can create shipment (caller: %s)", clientMSPID)
	}
	
	// CRITICAL: Validate product ownership and status BEFORE shipping
	product, err := s.GetProduct(ctx, productID)
	if err != nil {
		return err
	}
	
	if product.Owner != "Shipper" {
		return fmt.Errorf("unauthorized: product not owned by shipper, current owner: %s", product.Owner)
	}
	
	if product.Status != StatusInTransit {
		return fmt.Errorf("invalid state: product must be in InTransit state to ship, current: %s", product.Status)
	}

	// Get and validate sensitive shipment data from transient map
	transientMap, err := ctx.GetStub().GetTransient()
	if err != nil {
		return fmt.Errorf("error getting transient data: %v", err)
	}

	// Validate transient data (max 10KB)
	shipmentPrivateJSON, err := validateTransientData(transientMap, "shipmentDetails", 10240)
	if err != nil {
		return fmt.Errorf("invalid shipment details: %v", err)
	}

	var shipmentPrivate ShipmentPrivateDetails
	err = json.Unmarshal(shipmentPrivateJSON, &shipmentPrivate)
	if err != nil {
		return fmt.Errorf("failed to unmarshal shipment details: %v", err)
	}
	
	// Validate shipment private data fields
	if err := validateNotEmpty(shipmentPrivate.Waybill, "waybill"); err != nil {
		return err
	}
	if shipmentPrivate.ActualCost < 0 {
		return fmt.Errorf("actual cost cannot be negative")
	}

	// Update product status
	err = s.UpdateProductStatus(ctx, productID, "Shipped", shipperID)
	if err != nil {
		return err
	}

	// Create shipment record
	product, err = s.GetProduct(ctx, productID)
	if err != nil {
		return err
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	// Store public shipment data (without sensitive cost/route)
	shipment := Shipment{
		ID:          waybill,
		ProductID:   productID,
		ShipperID:   shipperID,
		Waybill:     waybill,
		Origin:      product.Origin,
		Destination: destination,
		Status:      "InTransit",
		Temperature: 0,
		Locations:   []string{product.Origin},
		CreatedAt:   timestamp,
		UpdatedAt:   timestamp,
	}

	shipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	shipmentKey := fmt.Sprintf("SHIPMENT_%s", waybill)
	err = ctx.GetStub().PutState(shipmentKey, shipmentJSON)
	if err != nil {
		return err
	}

	// Store private shipment details (cost, route) in private collection
	shipmentPrivate.Waybill = waybill
	shipmentPrivateBytes, err := json.Marshal(shipmentPrivate)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutPrivateData("shipmentDetails", shipmentKey, shipmentPrivateBytes)
	if err != nil {
		return fmt.Errorf("failed to store private shipment details: %v", err)
	}

	// Update product status to Shipped and keep owner as Shipper
	product.Status = "Shipped"
	product.UpdatedAt = timestamp
	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(productID, productJSON)
}

// GetShipment returns a shipment by waybill
func (s *SmartContract) GetShipment(ctx contractapi.TransactionContextInterface, waybill string) (*Shipment, error) {
	shipmentKey := fmt.Sprintf("SHIPMENT_%s", waybill)
	shipmentJSON, err := ctx.GetStub().GetState(shipmentKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read shipment: %v", err)
	}
	if shipmentJSON == nil {
		return nil, fmt.Errorf("shipment %s does not exist", waybill)
	}

	var shipment Shipment
	err = json.Unmarshal(shipmentJSON, &shipment)
	if err != nil {
		return nil, err
	}

	return &shipment, nil
}

// GetShipmentDetails retrieves private shipment data (only accessible by shipper and warehouse)
func (s *SmartContract) GetShipmentDetails(ctx contractapi.TransactionContextInterface, waybill string) (*ShipmentPrivateDetails, error) {
	// Access control - only shipper and warehouse can view shipment details
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}

	if clientMSPID != "OrgShipperMSP" && clientMSPID != "OrgWarehouseMSP" {
		return nil, fmt.Errorf("only shipper and warehouse can view shipment details")
	}

	shipmentKey := fmt.Sprintf("SHIPMENT_%s", waybill)
	shipmentJSON, err := ctx.GetStub().GetPrivateData("shipmentDetails", shipmentKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read private shipment details: %v", err)
	}
	if shipmentJSON == nil {
		return nil, fmt.Errorf("shipment details not found for waybill %s", waybill)
	}

	var shipmentDetails ShipmentPrivateDetails
	err = json.Unmarshal(shipmentJSON, &shipmentDetails)
	if err != nil {
		return nil, err
	}

	return &shipmentDetails, nil
}

// GetOrderPrice retrieves private price data (only accessible by manufacturer and retailer)
func (s *SmartContract) GetOrderPrice(ctx contractapi.TransactionContextInterface, orderID string) (*OrderPrivateDetails, error) {
	// Access control - only manufacturer and retailer can view prices
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}

	if clientMSPID != "OrgManufacturerMSP" && clientMSPID != "OrgRetailerMSP" {
		return nil, fmt.Errorf("only manufacturer and retailer can view order prices")
	}

	orderKey := fmt.Sprintf("ORDER_%s", orderID)
	priceJSON, err := ctx.GetStub().GetPrivateData("priceData", orderKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read private price data: %v", err)
	}
	if priceJSON == nil {
		return nil, fmt.Errorf("price data not found for order %s", orderID)
	}

	var priceData OrderPrivateDetails
	err = json.Unmarshal(priceJSON, &priceData)
	if err != nil {
		return nil, err
	}

	return &priceData, nil
}

// UpdateShipment updates shipment information
func (s *SmartContract) UpdateShipment(ctx contractapi.TransactionContextInterface, waybill string, location string, temperature float64) error {
	// Get client identity
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Only shipper can update shipment
	if clientMSPID != "OrgShipperMSP" {
		return fmt.Errorf("only shipper can update shipment")
	}

	shipmentKey := fmt.Sprintf("SHIPMENT_%s", waybill)
	shipmentJSON, err := ctx.GetStub().GetState(shipmentKey)
	if err != nil {
		return fmt.Errorf("failed to read shipment: %v", err)
	}
	if shipmentJSON == nil {
		return fmt.Errorf("shipment %s does not exist", waybill)
	}

	var shipment Shipment
	err = json.Unmarshal(shipmentJSON, &shipment)
	if err != nil {
		return err
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	shipment.Locations = append(shipment.Locations, location)
	shipment.Temperature = temperature
	shipment.UpdatedAt = timestamp

	updatedShipmentJSON, err := json.Marshal(shipment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(shipmentKey, updatedShipmentJSON)
}

// ReceiveAtWarehouse marks product as received at warehouse
func (s *SmartContract) ReceiveAtWarehouse(ctx contractapi.TransactionContextInterface, productID string, warehouseID string) error {
	// Get client identity
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Only warehouse can receive
	if clientMSPID != "OrgWarehouseMSP" {
		return fmt.Errorf("only warehouse can receive products")
	}

	return s.UpdateProductStatus(ctx, productID, "InWarehouse", warehouseID)
}

// DeliverToRetailer marks product as delivered to retailer
func (s *SmartContract) DeliverToRetailer(ctx contractapi.TransactionContextInterface, productID string, retailerID string) error {
	// Get client identity
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Only warehouse or retailer can confirm delivery
	if clientMSPID != "OrgWarehouseMSP" && clientMSPID != "OrgRetailerMSP" {
		return fmt.Errorf("only warehouse or retailer can confirm delivery")
	}

	return s.UpdateProductStatus(ctx, productID, "DeliveredToRetailer", retailerID)
}

// MarkAsSold marks product as sold
func (s *SmartContract) MarkAsSold(ctx contractapi.TransactionContextInterface, productID string, invoiceRef string) error {
	// Get client identity
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Only retailer can mark as sold
	if clientMSPID != "OrgRetailerMSP" {
		return fmt.Errorf("only retailer can mark products as sold")
	}

	product, err := s.GetProduct(ctx, productID)
	if err != nil {
		return err
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	product.Status = "Sold"
	product.Owner = invoiceRef
	product.UpdatedAt = timestamp

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(productID, productJSON)
}

// GetProductHistory returns the history of a product
func (s *SmartContract) GetProductHistory(ctx contractapi.TransactionContextInterface, productID string) ([]HistoryQueryResult, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(productID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var results []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var product Product
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &product)
			if err != nil {
				return nil, err
			}
		}

		timestamp := time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos))

		result := HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: timestamp,
			Record:    &product,
			IsDelete:  response.IsDelete,
		}
		results = append(results, result)
	}

	return results, nil
}

// GetAllProducts returns all products (deprecated - use GetProductsPaginated instead)
func (s *SmartContract) GetAllProducts(ctx contractapi.TransactionContextInterface) ([]*Product, error) {
	// For backward compatibility, return first 100 products
	result, err := s.GetProductsPaginated(ctx, 100, "")
	if err != nil {
		return nil, err
	}
	return result.Products, nil
}

// GetProductsPaginated returns products with pagination support
func (s *SmartContract) GetProductsPaginated(ctx contractapi.TransactionContextInterface, pageSize int32, bookmark string) (*PaginatedProducts, error) {
	// Validate page size
	if pageSize <= 0 || pageSize > 1000 {
		return nil, fmt.Errorf("page size must be between 1 and 1000")
	}
	
	// Get client MSP for access control
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}
	
	// Build CouchDB query - only show products relevant to caller's organization
	// For now, show all products (can be restricted per org in future)
	queryString := fmt.Sprintf(`{
		"selector": {
			"name": {"$exists": true},
			"batch": {"$exists": true}
		},
		"sort": [{"createdAt": "desc"}]
	}`)
	
	_ = clientMSPID // Use variable to avoid unused error
	
	// Execute paginated query
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to execute paginated query: %v", err)
	}
	defer resultsIterator.Close()
	
	var products []*Product
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		
		var product Product
		err = json.Unmarshal(queryResponse.Value, &product)
		if err != nil {
			continue
		}
		
		// Initialize Approvals if nil to prevent null in JSON
		if product.Approvals == nil {
			product.Approvals = []Approval{}
		}
		
		products = append(products, &product)
	}
	
	return &PaginatedProducts{
		Products: products,
		Bookmark: responseMetadata.Bookmark,
		Count:    responseMetadata.FetchedRecordsCount,
	}, nil
}

// GetProductsByOrg returns products filtered by organization with pagination
func (s *SmartContract) GetProductsByOrg(ctx contractapi.TransactionContextInterface, orgName string, pageSize int32, bookmark string) (*PaginatedProducts, error) {
	// Validate page size
	if pageSize <= 0 || pageSize > 1000 {
		return nil, fmt.Errorf("page size must be between 1 and 1000")
	}
	
	// Access control - verify caller has permission to view this org's products
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}
	
	// Validate orgName matches caller or is authorized
	var expectedOrg string
	switch clientMSPID {
	case ManufacturerMSP:
		expectedOrg = "Manufacturer"
	case ShipperMSP:
		expectedOrg = "Shipper"
	case WarehouseMSP:
		expectedOrg = "Warehouse"
	case RetailerMSP:
		expectedOrg = "Retailer"
	default:
		return nil, fmt.Errorf("unknown MSP ID: %s", clientMSPID)
	}
	
	if orgName != expectedOrg {
		return nil, fmt.Errorf("unauthorized: can only query products for your own organization")
	}
	
	// Build CouchDB query filtered by owner
	queryString := fmt.Sprintf(`{
		"selector": {
			"owner": "%s",
			"name": {"$exists": true},
			"batch": {"$exists": true}
		},
		"sort": [{"createdAt": "desc"}]
	}`, orgName)
	
	// Execute paginated query
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to execute paginated query: %v", err)
	}
	defer resultsIterator.Close()
	
	var products []*Product
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		
		var product Product
		err = json.Unmarshal(queryResponse.Value, &product)
		if err != nil {
			continue
		}
		
		// Initialize Approvals if nil
		if product.Approvals == nil {
			product.Approvals = []Approval{}
		}
		
		products = append(products, &product)
	}
	
	return &PaginatedProducts{
		Products: products,
		Bookmark: responseMetadata.Bookmark,
		Count:    responseMetadata.FetchedRecordsCount,
	}, nil
}

// CreateOrder creates a new order with price data in private collection
func (s *SmartContract) CreateOrder(ctx contractapi.TransactionContextInterface, orderID string, productIDs []string, buyerID string, sellerID string) error {
	// CRITICAL: Access control - only manufacturer and retailer can create orders
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	
	if clientMSPID != ManufacturerMSP && clientMSPID != RetailerMSP {
		return fmt.Errorf("unauthorized: only manufacturer or retailer can create orders (caller: %s)", clientMSPID)
	}
	
	// Input validation
	if err := validateNotEmpty(orderID, "orderID"); err != nil {
		return err
	}
	if len(productIDs) == 0 {
		return fmt.Errorf("productIDs cannot be empty")
	}
	if err := validateNotEmpty(buyerID, "buyerID"); err != nil {
		return err
	}
	if err := validateNotEmpty(sellerID, "sellerID"); err != nil {
		return err
	}
	
	// Get and validate price data from transient map (not stored on public ledger)
	transientMap, err := ctx.GetStub().GetTransient()
	if err != nil {
		return fmt.Errorf("error getting transient data: %v", err)
	}

	// Validate transient data (max 5KB for price data)
	priceJSON, err := validateTransientData(transientMap, "price", 5120)
	if err != nil {
		return fmt.Errorf("invalid price data: %v", err)
	}

	var priceData OrderPrivateDetails
	err = json.Unmarshal(priceJSON, &priceData)
	if err != nil {
		return fmt.Errorf("failed to unmarshal price data: %v", err)
	}
	
	// Validate price data fields
	if priceData.TotalPrice < 0 {
		return fmt.Errorf("total price cannot be negative")
	}
	if priceData.Discount < 0 {
		return fmt.Errorf("discount cannot be negative")
	}
	if priceData.Discount > priceData.TotalPrice {
		return fmt.Errorf("discount cannot exceed total price")
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	// Store public order data (without price)
	order := Order{
		ID:         orderID,
		ProductIDs: productIDs,
		BuyerID:    buyerID,
		SellerID:   sellerID,
		Status:     "Created",
		CreatedAt:  timestamp,
		UpdatedAt:  timestamp,
	}

	orderJSON, err := json.Marshal(order)
	if err != nil {
		return err
	}

	orderKey := fmt.Sprintf("ORDER_%s", orderID)
	err = ctx.GetStub().PutState(orderKey, orderJSON)
	if err != nil {
		return err
	}

	// Store private price data in private collection
	priceData.OrderID = orderID
	priceDataJSON, err := json.Marshal(priceData)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutPrivateData("priceData", orderKey, priceDataJSON)
	if err != nil {
		return fmt.Errorf("failed to store private price data: %v", err)
	}

	return nil
}

// Duplicate GetOrderPrice removed (was line 724-750)

// ========== HANDOVER WORKFLOW FUNCTIONS ==========

// RequestHandoverToShipper - Manufacturer requests handover to shipper
func (s *SmartContract) RequestHandoverToShipper(ctx contractapi.TransactionContextInterface, productID string, shipperID string, waybill string, signature string) error {
	// Access control - only manufacturer
	if !s.isManufacturer(ctx) {
		return fmt.Errorf("unauthorized: only manufacturer can request handover to shipper")
	}

	// Validate product state
	product, err := s.GetProduct(ctx, productID)
	if err != nil {
		return err
	}
	// Allow retry after rejection: Manufactured OR HandoverFailed states
	if product.Status != "Manufactured" && product.Status != "HandoverFailed" {
		return fmt.Errorf("product must be in Manufactured or HandoverFailed state, current: %s", product.Status)
	}
	if product.Owner != "Manufacturer" {
		return fmt.Errorf("product not owned by manufacturer")
	}
	if product.PendingHandover != "" {
		return fmt.Errorf("product already has pending handover: %s", product.PendingHandover)
	}

	// Get transaction timestamp
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	// Generate deterministic nonce for replay attack prevention (avoids endorsement mismatch)
	txID := ctx.GetStub().GetTxID()
	hasher := sha256.New()
	hasher.Write([]byte(txID + productID + timestamp))
	nonce := hex.EncodeToString(hasher.Sum(nil))

	// Set expiration time (7 days from now)
	txTime, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return fmt.Errorf("failed to parse timestamp: %v", err)
	}
	expirationTime := txTime.Add(7 * 24 * time.Hour)
	expiresAt := expirationTime.Format(time.RFC3339)

	// Create handover record (use TxID for deterministic ID across all peers)
	handoverID := fmt.Sprintf("HANDOVER-%s-SHIPPER-%s", productID, txID[:16])
	handover := Handover{
		ID:              handoverID,
		ProductID:       productID,
		FromOrg:         "Manufacturer",
		ToOrg:           "Shipper",
		Status:          HandoverPending,
		Nonce:           nonce,
		ExpiresAt:       expiresAt,
		RequestedAt:     timestamp,
		RequestedBy:     s.getClientIdentity(ctx),
		FromSignature:   signature,
		AcceptedAt:      "",
		AcceptedBy:      "",
		ToSignature:     "",
		RejectedAt:      "",
		RejectionReason: "",
		Metadata: map[string]interface{}{
			"shipperID": shipperID,
			"waybill":   waybill,
		},
	}

	handoverJSON, err := json.Marshal(handover)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(handoverID, handoverJSON)
	if err != nil {
		return err
	}

	// Update product state
	product.Status = "HandoverRequested"
	product.PendingHandover = handoverID
	product.UpdatedAt = timestamp
	product.Version++  // Optimistic locking

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(productID, productJSON)
	if err != nil {
		return err
	}

	// Emit event for notification
	ctx.GetStub().SetEvent("HandoverRequested", []byte(handoverID))

	return nil
}

// RequestHandoverToWarehouse - Shipper requests handover to warehouse
func (s *SmartContract) RequestHandoverToWarehouse(ctx contractapi.TransactionContextInterface, productID string, warehouseID string, signature string) error {
	// Access control - only shipper
	if !s.isShipper(ctx) {
		return fmt.Errorf("unauthorized: only shipper can request handover to warehouse")
	}

	// Validate product state
	product, err := s.GetProduct(ctx, productID)
	if err != nil {
		return err
	}
	if product.Status != "InTransit" && product.Status != "Shipped" {
		return fmt.Errorf("product must be in InTransit or Shipped state, current: %s", product.Status)
	}
	if product.Owner != "Shipper" {
		return fmt.Errorf("product not owned by shipper")
	}
	if product.PendingHandover != "" {
		return fmt.Errorf("product already has pending handover: %s", product.PendingHandover)
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	// Generate deterministic nonce for replay attack prevention (avoids endorsement mismatch)
	txID := ctx.GetStub().GetTxID()
	hasher := sha256.New()
	hasher.Write([]byte(txID + productID + timestamp))
	nonce := hex.EncodeToString(hasher.Sum(nil))

	// Set expiration time (7 days from now)
	txTime, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return fmt.Errorf("failed to parse timestamp: %v", err)
	}
	expirationTime := txTime.Add(7 * 24 * time.Hour)
	expiresAt := expirationTime.Format(time.RFC3339)

	// Create handover record (use TxID for deterministic ID across all peers)
	handoverID := fmt.Sprintf("HANDOVER-%s-WAREHOUSE-%s", productID, txID[:16])
	handover := Handover{
		ID:            handoverID,
		ProductID:     productID,
		FromOrg:       "Shipper",
		ToOrg:         "Warehouse",
		Status:        HandoverPending,
		Nonce:         nonce,
		ExpiresAt:     expiresAt,
		RequestedAt:   timestamp,
		RequestedBy:   s.getClientIdentity(ctx),
		FromSignature: signature,
		AcceptedAt:    "",
		AcceptedBy:    "",
		ToSignature:   "",
		RejectedAt:    "",
		RejectionReason: "",
		Metadata: map[string]interface{}{
			"warehouseID": warehouseID,
		},
	}

	handoverJSON, err := json.Marshal(handover)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(handoverID, handoverJSON)
	if err != nil {
		return err
	}

	// Update product state
	product.Status = "HandoverRequested"
	product.PendingHandover = handoverID
	product.UpdatedAt = timestamp
	product.Version++  // Optimistic locking

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(productID, productJSON)
	if err != nil {
		return err
	}

	ctx.GetStub().SetEvent("HandoverRequested", []byte(handoverID))
	return nil
}

// AcceptHandover - Shipper/Warehouse/Retailer accepts handover
func (s *SmartContract) AcceptHandover(ctx contractapi.TransactionContextInterface, handoverID string, receiverID string, signature string) error {
	// Get handover
	handover, err := s.GetHandover(ctx, handoverID)
	if err != nil {
		return err
	}

	// Validate status
	if handover.Status != HandoverPending {
		return fmt.Errorf("handover not in pending state: %s", handover.Status)
	}

	// Check if handover has expired
	expiresAt, err := time.Parse(time.RFC3339, handover.ExpiresAt)
	if err != nil {
		return fmt.Errorf("failed to parse expiration time: %v", err)
	}
	
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}
	currentTime, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return fmt.Errorf("failed to parse current time: %v", err)
	}
	
	if currentTime.After(expiresAt) {
		return fmt.Errorf("handover has expired at %s", handover.ExpiresAt)
	}

	// Verify signature with nonce to prevent replay attacks
	// PRODUCTION: Validates ECDSA signature from client certificate private key
	// Signature must be: openssl dgst -sha256 -sign <private_key> <<< "handoverID:nonce:receiverID"
	err = s.validateSignatureWithNonce(ctx, handoverID, handover.Nonce, receiverID, signature)
	if err != nil {
		return fmt.Errorf("signature validation failed: %v", err)
	}

	// Access control - check if caller is intended receiver
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	expectedMSP := ""
	switch handover.ToOrg {
	case "Shipper":
		expectedMSP = "OrgShipperMSP"
	case "Warehouse":
		expectedMSP = "OrgWarehouseMSP"
	case "Retailer":
		expectedMSP = "OrgRetailerMSP"
	default:
		return fmt.Errorf("unknown target organization: %s", handover.ToOrg)
	}

	if clientMSPID != expectedMSP {
		return fmt.Errorf("unauthorized: only %s can accept this handover", handover.ToOrg)
	}

	timestamp, err = getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	// Update handover
	handover.Status = HandoverAccepted
	handover.AcceptedAt = timestamp
	handover.AcceptedBy = s.getClientIdentity(ctx)
	handover.ToSignature = signature

	handoverJSON, err := json.Marshal(handover)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(handoverID, handoverJSON)
	if err != nil {
		return err
	}

	// Transfer ownership with optimistic locking
	product, err := s.GetProduct(ctx, handover.ProductID)
	if err != nil {
		return err
	}
	
	// Store original version for race condition detection
	originalVersion := product.Version

	// Update product state based on target org
	var newStatus string
	switch handover.ToOrg {
	case "Shipper":
		newStatus = "InTransit"
	case "Warehouse":
		newStatus = "InWarehouse"
	case "Retailer":
		newStatus = "DeliveredToRetailer"
	}

	product.Status = newStatus
	product.Owner = handover.ToOrg
	product.CurrentHolder = handover.ToOrg
	product.PendingHandover = ""
	product.UpdatedAt = timestamp
	product.Version = originalVersion + 1  // Optimistic locking

	// Add approval record
	approval := Approval{
		Actor:     s.getClientIdentity(ctx),
		ActorMSP:  clientMSPID,
		Action:    "AcceptedHandover",
		Timestamp: timestamp,
		Signature: signature,
		Metadata: map[string]interface{}{
			"handoverID": handoverID,
			"receiverID": receiverID,
		},
	}
	product.Approvals = append(product.Approvals, approval)

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(product.ID, productJSON)
	if err != nil {
		return err
	}

	// Emit event
	ctx.GetStub().SetEvent("HandoverCompleted", []byte(handover.ProductID))

	return nil
}

// RejectHandover - Shipper/Warehouse/Retailer rejects handover
func (s *SmartContract) RejectHandover(ctx contractapi.TransactionContextInterface, handoverID string, reason string, signature string) error {
	// Get handover
	handover, err := s.GetHandover(ctx, handoverID)
	if err != nil {
		return err
	}

	// Validate status
	if handover.Status != HandoverPending {
		return fmt.Errorf("handover not in pending state: %s", handover.Status)
	}

	// Access control
	clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	expectedMSP := ""
	switch handover.ToOrg {
	case "Shipper":
		expectedMSP = "OrgShipperMSP"
	case "Warehouse":
		expectedMSP = "OrgWarehouseMSP"
	case "Retailer":
		expectedMSP = "OrgRetailerMSP"
	}

	if clientMSPID != expectedMSP {
		return fmt.Errorf("unauthorized: only %s can reject this handover", handover.ToOrg)
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	// Update handover
	handover.Status = HandoverRejected
	handover.RejectedAt = timestamp
	handover.RejectionReason = reason

	handoverJSON, err := json.Marshal(handover)
	if err != nil {
		return err
	}
	ctx.GetStub().PutState(handoverID, handoverJSON)

	// Revert product state
	product, err := s.GetProduct(ctx, handover.ProductID)
	if err != nil {
		return err
	}

	product.Status = StatusHandoverFailed
	product.Owner = handover.FromOrg
	product.CurrentHolder = handover.FromOrg
	product.PendingHandover = ""
	product.UpdatedAt = timestamp
	product.Version++  // Optimistic locking

	// Add approval record
	approval := Approval{
		Actor:     s.getClientIdentity(ctx),
		ActorMSP:  clientMSPID,
		Action:    "RejectedHandover",
		Timestamp: timestamp,
		Signature: signature,
		Metadata: map[string]interface{}{
			"handoverID": handoverID,
			"reason":     reason,
		},
	}
	product.Approvals = append(product.Approvals, approval)

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}
	ctx.GetStub().PutState(product.ID, productJSON)

	// Emit event
	ctx.GetStub().SetEvent("HandoverRejected", []byte(handover.ProductID))

	return nil
}

// GetHandover returns a handover by ID
func (s *SmartContract) GetHandover(ctx contractapi.TransactionContextInterface, id string) (*Handover, error) {
	handoverJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read handover: %v", err)
	}
	if handoverJSON == nil {
		return nil, fmt.Errorf("handover %s does not exist", id)
	}

	var handover Handover
	err = json.Unmarshal(handoverJSON, &handover)
	if err != nil {
		return nil, err
	}

	return &handover, nil
}

// ExpireHandover marks an expired handover and reverts product state
func (s *SmartContract) ExpireHandover(ctx contractapi.TransactionContextInterface, handoverID string) error {
	handover, err := s.GetHandover(ctx, handoverID)
	if err != nil {
		return err
	}

	// Validate status
	if handover.Status != HandoverPending {
		return fmt.Errorf("handover not in pending state: %s", handover.Status)
	}

	// Check if expired
	expiresAt, err := time.Parse(time.RFC3339, handover.ExpiresAt)
	if err != nil {
		return fmt.Errorf("failed to parse expiration time: %v", err)
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}
	currentTime, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return fmt.Errorf("failed to parse current time: %v", err)
	}

	if currentTime.Before(expiresAt) {
		return fmt.Errorf("handover not yet expired (expires at %s)", handover.ExpiresAt)
	}

	// Mark as expired
	handover.Status = HandoverExpired
	handoverJSON, err := json.Marshal(handover)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(handoverID, handoverJSON)
	if err != nil {
		return err
	}

	// Revert product state
	product, err := s.GetProduct(ctx, handover.ProductID)
	if err != nil {
		return err
	}

	product.PendingHandover = ""
	product.Status = StatusHandoverExpired
	product.Owner = handover.FromOrg
	product.CurrentHolder = handover.FromOrg
	product.UpdatedAt = timestamp
	product.Version++  // Optimistic locking

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(product.ID, productJSON)
	if err != nil {
		return err
	}

	// Emit event
	ctx.GetStub().SetEvent("HandoverExpired", []byte(handoverID))

	return nil
}

// GetPendingHandoversForOrg returns pending handovers for current organization
func (s *SmartContract) GetPendingHandoversForOrg(ctx contractapi.TransactionContextInterface) ([]*Handover, error) {
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get MSP ID: %v", err)
	}

	var orgName string
	switch mspID {
	case "OrgManufacturerMSP":
		orgName = "Manufacturer"
	case "OrgShipperMSP":
		orgName = "Shipper"
	case "OrgWarehouseMSP":
		orgName = "Warehouse"
	case "OrgRetailerMSP":
		orgName = "Retailer"
	default:
		return nil, fmt.Errorf("unknown MSP ID: %s", mspID)
	}

	// Use GetStateByRange to find all handovers
	resultsIterator, err := ctx.GetStub().GetStateByRange("HANDOVER-", "HANDOVER-~")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var handovers []*Handover
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var handover Handover
		err = json.Unmarshal(queryResponse.Value, &handover)
		if err != nil {
			continue
		}

		// Filter by toOrg and pending status
		if handover.ToOrg == orgName && handover.Status == HandoverPending {
			handovers = append(handovers, &handover)
		}
	}

	return handovers, nil
}

// ========== HELPER FUNCTIONS ==========

func (s *SmartContract) isManufacturer(ctx contractapi.TransactionContextInterface) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == ManufacturerMSP
}

func (s *SmartContract) isShipper(ctx contractapi.TransactionContextInterface) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == ShipperMSP
}

func (s *SmartContract) isWarehouse(ctx contractapi.TransactionContextInterface) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == WarehouseMSP
}

func (s *SmartContract) isRetailer(ctx contractapi.TransactionContextInterface) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == RetailerMSP
}

// hasRole checks if caller has specific MSP role
func (s *SmartContract) hasRole(ctx contractapi.TransactionContextInterface, role string) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == role
}

func (s *SmartContract) getClientIdentity(ctx contractapi.TransactionContextInterface) string {
	cert, err := ctx.GetClientIdentity().GetX509Certificate()
	if err != nil || cert == nil {
		return "unknown"
	}
	return cert.Subject.CommonName
}

// generateNonce creates a cryptographically secure random nonce
// generateNonce is deprecated - nonce is now generated deterministically from TxID
// to avoid endorsement policy mismatch across peers (crypto/rand produces different values)
// Kept here for reference - use ctx.GetStub().GetTxID() + hash instead

// createSignatureMessage creates the message to be signed for handover operations
func createSignatureMessage(handoverID string, nonce string, actorID string) string {
	return fmt.Sprintf("%s:%s:%s", handoverID, nonce, actorID)
}

// ECDSASignature represents an ECDSA signature with R and S values
type ECDSASignature struct {
	R, S *big.Int
}

// verifySignature verifies that the signature is valid for the message using ECDSA
func (s *SmartContract) verifySignature(ctx contractapi.TransactionContextInterface, message string, signature string) bool {
	// Get caller's certificate
	cert, err := ctx.GetClientIdentity().GetX509Certificate()
	if err != nil || cert == nil {
		return false
	}
	
	// Validate signature format
	if len(signature) < 64 {
		return false
	}
	
	// Decode signature from hex
	sigBytes, err := hex.DecodeString(signature)
	if err != nil {
		return false
	}
	
	// Try to unmarshal ASN.1 DER format (Fabric standard)
	var ecdsaSig ECDSASignature
	_, err = asn1.Unmarshal(sigBytes, &ecdsaSig)
	if err != nil {
		// If not ASN.1, try raw R||S format (64 bytes for P-256)
		if len(sigBytes) == 64 {
			ecdsaSig.R = new(big.Int).SetBytes(sigBytes[:32])
			ecdsaSig.S = new(big.Int).SetBytes(sigBytes[32:])
		} else {
			return false
		}
	}
	
	// Hash message using SHA-256
	hash := sha256.Sum256([]byte(message))
	
	// Extract public key from certificate
	pubKey, ok := cert.PublicKey.(*ecdsa.PublicKey)
	if !ok {
		return false
	}
	
	// Verify ECDSA signature
	return ecdsa.Verify(pubKey, hash[:], ecdsaSig.R, ecdsaSig.S)
}

// validateSignatureWithNonce checks signature includes nonce to prevent replay attacks
func (s *SmartContract) validateSignatureWithNonce(ctx contractapi.TransactionContextInterface, handoverID string, nonce string, actorID string, signature string) error {
	expectedMessage := createSignatureMessage(handoverID, nonce, actorID)
	
	if !s.verifySignature(ctx, expectedMessage, signature) {
		return fmt.Errorf("invalid signature or replay attack detected")
	}
	
	return nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating supplychain chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting supplychain chaincode: %v\n", err)
	}
}
