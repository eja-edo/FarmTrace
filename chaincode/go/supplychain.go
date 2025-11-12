package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
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
	PendingHandover string     `json:"pendingHandover,omitempty"`
	MetaHash        string     `json:"metaHash"`
	Approvals       []Approval `json:"approvals"`
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

// Order represents an order
type Order struct {
	ID         string   `json:"id"`
	ProductIDs []string `json:"productIds"`
	BuyerID    string   `json:"buyerId"`
	SellerID   string   `json:"sellerId"`
	Status     string   `json:"status"`
	TotalPrice float64  `json:"totalPrice"`
	CreatedAt  string   `json:"createdAt"`
	UpdatedAt  string   `json:"updatedAt"`
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
	RequestedAt           string                 `json:"requestedAt"`
	RequestedBy           string                 `json:"requestedBy"`
	FromSignature         string                 `json:"fromSignature,omitempty"`
	AcceptedAt            string                 `json:"acceptedAt,omitempty"`
	AcceptedBy            string                 `json:"acceptedBy,omitempty"`
	ToSignature           string                 `json:"toSignature,omitempty"`
	RejectedAt            string                 `json:"rejectedAt,omitempty"`
	RejectionReason       string                 `json:"rejectionReason,omitempty"`
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
			Status:          "Manufactured",
			Owner:           "Manufacturer",
			MetaHash:        "hash123",
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
	if clientMSPID != "OrgManufacturerMSP" {
		return fmt.Errorf("only manufacturer can create products")
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
		Status:          "Manufactured",
		Owner:           "Manufacturer",
		CurrentHolder:   "Manufacturer",
		PendingHandover: "",
		MetaHash:        metaHash,
		Approvals:       []Approval{},
		CreatedAt:       timestamp,
		UpdatedAt:       timestamp,
	}

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, productJSON)
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

	// Validate status transitions based on organization
	validTransition := false
	switch newStatus {
	case "Shipped":
		validTransition = clientMSPID == "OrgManufacturerMSP" || clientMSPID == "OrgShipperMSP"
	case "InTransit":
		validTransition = clientMSPID == "OrgShipperMSP"
	case "InWarehouse":
		validTransition = clientMSPID == "OrgWarehouseMSP"
	case "DeliveredToRetailer":
		validTransition = clientMSPID == "OrgWarehouseMSP" || clientMSPID == "OrgRetailerMSP"
	case "Sold":
		validTransition = clientMSPID == "OrgRetailerMSP"
	default:
		validTransition = false
	}

	if !validTransition {
		return fmt.Errorf("organization %s cannot transition product to status %s", clientMSPID, newStatus)
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	product.Status = newStatus
	product.Owner = actor
	product.UpdatedAt = timestamp

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, productJSON)
}

// ShipProduct creates a shipment for a product
func (s *SmartContract) ShipProduct(ctx contractapi.TransactionContextInterface, productID string, shipperID string, waybill string, destination string) error {
	// Update product status
	err := s.UpdateProductStatus(ctx, productID, "Shipped", shipperID)
	if err != nil {
		return err
	}

	// Create shipment record
	product, err := s.GetProduct(ctx, productID)
	if err != nil {
		return err
	}

	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

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
	return ctx.GetStub().PutState(shipmentKey, shipmentJSON)
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

// GetAllProducts returns all products
func (s *SmartContract) GetAllProducts(ctx contractapi.TransactionContextInterface) ([]*Product, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
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
		products = append(products, &product)
	}

	return products, nil
}

// CreateOrder creates a new order
func (s *SmartContract) CreateOrder(ctx contractapi.TransactionContextInterface, orderID string, productIDs []string, buyerID string, sellerID string, totalPrice float64) error {
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return err
	}

	order := Order{
		ID:         orderID,
		ProductIDs: productIDs,
		BuyerID:    buyerID,
		SellerID:   sellerID,
		Status:     "Created",
		TotalPrice: totalPrice,
		CreatedAt:  timestamp,
		UpdatedAt:  timestamp,
	}

	orderJSON, err := json.Marshal(order)
	if err != nil {
		return err
	}

	orderKey := fmt.Sprintf("ORDER_%s", orderID)
	return ctx.GetStub().PutState(orderKey, orderJSON)
}

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
	if product.Status != "Manufactured" {
		return fmt.Errorf("product must be in Manufactured state, current: %s", product.Status)
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

	// Create handover record
	handoverID := fmt.Sprintf("HANDOVER-%s-SHIPPER", productID)
	handover := Handover{
		ID:            handoverID,
		ProductID:     productID,
		FromOrg:       "Manufacturer",
		ToOrg:         "Shipper",
		Status:        HandoverPending,
		RequestedAt:   timestamp,
		RequestedBy:   s.getClientIdentity(ctx),
		FromSignature: signature,
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

	timestamp, err := getTxTimestamp(ctx)
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

	// Transfer ownership
	product, err := s.GetProduct(ctx, handover.ProductID)
	if err != nil {
		return err
	}

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

	product.Status = "HandoverFailed"
	product.Owner = handover.FromOrg
	product.CurrentHolder = handover.FromOrg
	product.PendingHandover = ""
	product.UpdatedAt = timestamp

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
	return mspID == "OrgManufacturerMSP"
}

func (s *SmartContract) isShipper(ctx contractapi.TransactionContextInterface) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == "OrgShipperMSP"
}

func (s *SmartContract) isWarehouse(ctx contractapi.TransactionContextInterface) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == "OrgWarehouseMSP"
}

func (s *SmartContract) isRetailer(ctx contractapi.TransactionContextInterface) bool {
	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	return mspID == "OrgRetailerMSP"
}

func (s *SmartContract) getClientIdentity(ctx contractapi.TransactionContextInterface) string {
	cert, err := ctx.GetClientIdentity().GetX509Certificate()
	if err != nil || cert == nil {
		return "unknown"
	}
	return cert.Subject.CommonName
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
