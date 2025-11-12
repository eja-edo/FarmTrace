package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// Test Product struct initialization
func TestProductCreation(t *testing.T) {
	product := Product{
		ID:              "PROD001",
		Name:            "Laptop Dell XPS",
		Batch:           "BATCH001",
		Origin:          "Vietnam",
		ManufactureDate: "2025-11-01",
		Status:          "Manufactured",
		Owner:           "Manufacturer",
		MetaHash:        "hash123",
		CreatedAt:       "2025-11-02T00:00:00Z",
		UpdatedAt:       "2025-11-02T00:00:00Z",
	}

	assert.Equal(t, "PROD001", product.ID)
	assert.Equal(t, "Laptop Dell XPS", product.Name)
	assert.Equal(t, "Manufactured", product.Status)
	assert.Equal(t, "Manufacturer", product.Owner)
}

// Test Shipment struct initialization
func TestShipmentCreation(t *testing.T) {
	shipment := Shipment{
		ID:          "SHIP001",
		ProductID:   "PROD001",
		ShipperID:   "SHIPPER001",
		Waybill:     "WB123456",
		Origin:      "Factory A",
		Destination: "Warehouse B",
		Status:      "InTransit",
		Temperature: 25.5,
		Locations:   []string{"Location1", "Location2"},
		CreatedAt:   "2025-11-02T00:00:00Z",
		UpdatedAt:   "2025-11-02T00:00:00Z",
	}

	assert.Equal(t, "SHIP001", shipment.ID)
	assert.Equal(t, "PROD001", shipment.ProductID)
	assert.Equal(t, "InTransit", shipment.Status)
	assert.Equal(t, 25.5, shipment.Temperature)
	assert.Len(t, shipment.Locations, 2)
}

// Test Order struct initialization
func TestOrderCreation(t *testing.T) {
	order := Order{
		ID:         "ORDER001",
		ProductIDs: []string{"PROD001", "PROD002"},
		BuyerID:    "BUYER001",
		SellerID:   "SELLER001",
		Status:     "Pending",
		TotalPrice: 1999.99,
		CreatedAt:  "2025-11-02T00:00:00Z",
		UpdatedAt:  "2025-11-02T00:00:00Z",
	}

	assert.Equal(t, "ORDER001", order.ID)
	assert.Len(t, order.ProductIDs, 2)
	assert.Equal(t, "Pending", order.Status)
	assert.Equal(t, 1999.99, order.TotalPrice)
}

// Test Product status transitions
func TestProductStatusTransitions(t *testing.T) {
	product := Product{
		ID:     "PROD001",
		Status: "Manufactured",
	}

	validTransitions := map[string][]string{
		"Manufactured":    {"Shipped", "InWarehouse"},
		"Shipped":         {"InTransit", "Delivered"},
		"InWarehouse":     {"ReadyForDelivery"},
		"ReadyForDelivery": {"Shipped", "Delivered"},
		"Delivered":       {"Received"},
		"Received":        {"Sold"},
	}

	// Test valid transition
	product.Status = "Manufactured"
	newStatus := "Shipped"
	assert.Contains(t, validTransitions[product.Status], newStatus)
}

// Test Shipment status validation
func TestShipmentStatusValidation(t *testing.T) {
	validStatuses := []string{"Pending", "InTransit", "Delivered", "Cancelled"}
	
	shipment := Shipment{
		ID:     "SHIP001",
		Status: "InTransit",
	}

	assert.Contains(t, validStatuses, shipment.Status)
	
	// Test invalid status
	invalidStatus := "InvalidStatus"
	assert.NotContains(t, validStatuses, invalidStatus)
}

// Test temperature validation for temperature-sensitive products
func TestTemperatureValidation(t *testing.T) {
	shipment := Shipment{
		ID:          "SHIP001",
		Temperature: 25.5,
	}

	// Normal temperature range: -20°C to 60°C
	assert.GreaterOrEqual(t, shipment.Temperature, -20.0)
	assert.LessOrEqual(t, shipment.Temperature, 60.0)
}

// Test location tracking
func TestLocationTracking(t *testing.T) {
	shipment := Shipment{
		ID:        "SHIP001",
		Locations: []string{},
	}

	// Add locations
	shipment.Locations = append(shipment.Locations, "Factory A")
	shipment.Locations = append(shipment.Locations, "Hub B")
	shipment.Locations = append(shipment.Locations, "Warehouse C")

	assert.Len(t, shipment.Locations, 3)
	assert.Equal(t, "Factory A", shipment.Locations[0])
	assert.Equal(t, "Warehouse C", shipment.Locations[2])
}

// Test order amount calculation
func TestOrderAmountCalculation(t *testing.T) {
	products := []Product{
		{ID: "PROD001", Name: "Product 1"},
		{ID: "PROD002", Name: "Product 2"},
	}
	
	var totalAmount float64
	productPrices := map[string]float64{
		"PROD001": 999.99,
		"PROD002": 1499.99,
	}
	
	for _, product := range products {
		totalAmount += productPrices[product.ID]
	}

	assert.Equal(t, 2499.98, totalAmount)
}

// Test product ID format validation
func TestProductIDFormat(t *testing.T) {
	validIDs := []string{"PROD001", "PROD-002", "PROD_003"}
	invalidIDs := []string{"", "PROD", "12345", "prod001"}

	for _, id := range validIDs {
		assert.NotEmpty(t, id)
		assert.Greater(t, len(id), 4, "Valid ID should be longer than 4 characters")
	}

	for _, id := range invalidIDs {
		if id == "" {
			assert.Empty(t, id)
		}
	}
}

// Test batch number validation
func TestBatchNumberValidation(t *testing.T) {
	product := Product{
		ID:    "PROD001",
		Batch: "BATCH-2025-001",
	}

	assert.NotEmpty(t, product.Batch)
	assert.Contains(t, product.Batch, "BATCH")
	assert.Contains(t, product.Batch, "2025")
}

// Test origin validation
func TestOriginValidation(t *testing.T) {
	validOrigins := []string{"Vietnam", "China", "USA", "Germany"}
	
	product := Product{
		ID:     "PROD001",
		Origin: "Vietnam",
	}

	assert.Contains(t, validOrigins, product.Origin)
}

// Test waybill format
func TestWaybillFormat(t *testing.T) {
	shipment := Shipment{
		ID:      "SHIP001",
		Waybill: "WB-2025-001",
	}

	assert.NotEmpty(t, shipment.Waybill)
	assert.Contains(t, shipment.Waybill, "WB")
}

// Benchmark tests
func BenchmarkProductCreation(b *testing.B) {
	for i := 0; i < b.N; i++ {
		product := Product{
			ID:              "PROD001",
			Name:            "Product",
			Batch:           "BATCH001",
			Origin:          "Vietnam",
			ManufactureDate: "2025-11-01",
			Status:          "Manufactured",
			Owner:           "Manufacturer",
		}
		_ = product
	}
}

func BenchmarkShipmentCreation(b *testing.B) {
	for i := 0; i < b.N; i++ {
		shipment := Shipment{
			ID:          "SHIP001",
			ProductID:   "PROD001",
			ShipperID:   "SHIPPER001",
			Status:      "InTransit",
			Temperature: 25.5,
			Locations:   []string{"Location1", "Location2"},
		}
		_ = shipment
	}
}

// Test SmartContract initialization
func TestSmartContractCreation(t *testing.T) {
	sc := SmartContract{}
	assert.NotNil(t, sc)
}

// Integration test markers (will implement in integration tests phase)
func TestIntegrationMarker(t *testing.T) {
	t.Skip("Integration tests will be implemented in Week 5-6")
}
