const request = require('supertest');
const express = require('express');

// Mock fabricClient before requiring routes
jest.mock('../../src/utils/fabricClient');
jest.mock('../../src/utils/database');
jest.mock('../../src/utils/logger');

const fabricClient = require('../../src/utils/fabricClient');
const productsRouter = require('../../src/routes/products');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/products', productsRouter);

describe('Products API - Unit Tests', () => {

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        fabricClient.__resetMocks();
    });

    describe('POST /api/products - Create Product', () => {

        it('should create a new product successfully', async () => {
            const productData = {
                id: 'PROD001',
                name: 'Laptop Dell XPS 15',
                batch: 'BATCH001',
                origin: 'Vietnam',
                manufactureDate: '2025-11-01',
                metaHash: 'hash123'
            };

            fabricClient.__setMockSubmitResponse({ success: true });

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(fabricClient.submitTransaction).toHaveBeenCalledWith(
                'supplychain-channel',
                'supplychain_cc',
                'CreateProduct',
                productData.id,
                productData.name,
                productData.batch,
                productData.origin,
                productData.manufactureDate,
                productData.metaHash
            );
        });

        it('should return 400 for missing required fields', async () => {
            const invalidData = {
                id: 'PROD002',
                // Missing name, batch, etc.
            };

            const response = await request(app)
                .post('/api/products')
                .send(invalidData)
                .expect(400);

            expect(response.body.errors).toBeDefined();
        });

        it('should return 500 for duplicate product ID', async () => {
            const productData = {
                id: 'PROD001',
                name: 'Product',
                batch: 'BATCH001',
                origin: 'Vietnam',
                manufactureDate: '2025-11-01'
            };

            fabricClient.__setMockSubmitError(
                new Error('Product PROD001 already exists')
            );

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(500);

            expect(response.body.error).toBeDefined();
        });

        it('should handle blockchain errors gracefully', async () => {
            const productData = {
                productId: 'PROD003',
                name: 'Product',
                category: 'Category',
                description: 'Description',
                manufacturer: 'Manufacturer',
                price: '99.99'
            };

            fabricClient.invokeTransaction = jest.fn().mockRejectedValue(
                new Error('Blockchain network error')
            );

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('GET /api/products/:id - Get Product', () => {

        it('should retrieve existing product successfully', async () => {
            const mockProduct = {
                id: 'PROD001',
                name: 'Laptop Dell XPS',
                category: 'Electronics',
                status: 'Manufactured',
                currentOwner: 'Manufacturer',
                price: '1699.99',
                createdAt: new Date().toISOString()
            };

            fabricClient.queryTransaction = jest.fn().mockResolvedValue(mockProduct);

            const response = await request(app)
                .get('/api/products/PROD001')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockProduct);
            expect(fabricClient.queryTransaction).toHaveBeenCalledWith(
                'GetProduct',
                ['PROD001']
            );
        });

        it('should return 404 for non-existent product', async () => {
            fabricClient.queryTransaction = jest.fn().mockRejectedValue(
                new Error('Product PROD999 does not exist')
            );

            const response = await request(app)
                .get('/api/products/PROD999')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('does not exist');
        });
    });

    describe('GET /api/products/:id/history - Get Product History', () => {

        it('should retrieve product history successfully', async () => {
            const mockHistory = [
                {
                    txId: 'tx1',
                    timestamp: new Date().toISOString(),
                    action: 'CreateProduct',
                    data: { status: 'Manufactured' }
                },
                {
                    txId: 'tx2',
                    timestamp: new Date().toISOString(),
                    action: 'ShipProduct',
                    data: { status: 'InTransitToWarehouse' }
                }
            ];

            fabricClient.queryTransaction = jest.fn().mockResolvedValue(mockHistory);

            const response = await request(app)
                .get('/api/products/PROD001/history')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveArray(2);
            expect(response.body.data[0].action).toBe('CreateProduct');
            expect(fabricClient.queryTransaction).toHaveBeenCalledWith(
                'GetProductHistory',
                ['PROD001']
            );
        });

        it('should handle empty history', async () => {
            fabricClient.queryTransaction = jest.fn().mockResolvedValue([]);

            const response = await request(app)
                .get('/api/products/PROD001/history')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('POST /api/products/:id/ship - Ship Product', () => {

        it('should ship product successfully', async () => {
            const shipmentData = {
                shipmentId: 'SHIP001',
                carrier: 'FedEx',
                destination: 'Warehouse Ho Chi Minh'
            };

            fabricClient.invokeTransaction = jest.fn().mockResolvedValue({
                success: true,
                message: 'Product shipped successfully'
            });

            const response = await request(app)
                .post('/api/products/PROD001/ship')
                .send(shipmentData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(fabricClient.invokeTransaction).toHaveBeenCalledWith(
                'ShipProduct',
                expect.arrayContaining([
                    'PROD001',
                    shipmentData.shipmentId,
                    shipmentData.carrier,
                    shipmentData.destination
                ])
            );
        });

        it('should return 400 for missing shipment details', async () => {
            const invalidData = {
                shipmentId: 'SHIP001'
                // Missing carrier and destination
            };

            const response = await request(app)
                .post('/api/products/PROD001/ship')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 403 for unauthorized shipping attempt', async () => {
            const shipmentData = {
                shipmentId: 'SHIP001',
                carrier: 'FedEx',
                destination: 'Warehouse'
            };

            fabricClient.invokeTransaction = jest.fn().mockRejectedValue(
                new Error('Only manufacturer can ship products')
            );

            const response = await request(app)
                .post('/api/products/PROD001/ship')
                .send(shipmentData)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('manufacturer');
        });
    });

    describe('POST /api/products/:id/receive-warehouse - Receive at Warehouse', () => {

        it('should receive product at warehouse successfully', async () => {
            const receiveData = {
                shipmentId: 'SHIP001'
            };

            fabricClient.invokeTransaction = jest.fn().mockResolvedValue({
                success: true,
                message: 'Product received at warehouse'
            });

            const response = await request(app)
                .post('/api/products/PROD001/receive-warehouse')
                .send(receiveData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(fabricClient.invokeTransaction).toHaveBeenCalledWith(
                'ReceiveAtWarehouse',
                ['PROD001', receiveData.shipmentId]
            );
        });

        it('should return 403 for unauthorized warehouse receive', async () => {
            const receiveData = { shipmentId: 'SHIP001' };

            fabricClient.invokeTransaction = jest.fn().mockRejectedValue(
                new Error('Only warehouse can receive products')
            );

            const response = await request(app)
                .post('/api/products/PROD001/receive-warehouse')
                .send(receiveData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/products/:id/deliver-retailer - Deliver to Retailer', () => {

        it('should deliver product to retailer successfully', async () => {
            const deliveryData = {
                shipmentId: 'SHIP002',
                carrier: 'DHL',
                destination: 'Retailer Store'
            };

            fabricClient.invokeTransaction = jest.fn().mockResolvedValue({
                success: true,
                message: 'Product delivered to retailer'
            });

            const response = await request(app)
                .post('/api/products/PROD001/deliver-retailer')
                .send(deliveryData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(fabricClient.invokeTransaction).toHaveBeenCalledWith(
                'DeliverToRetailer',
                expect.arrayContaining([
                    'PROD001',
                    deliveryData.shipmentId,
                    deliveryData.carrier,
                    deliveryData.destination
                ])
            );
        });
    });

    describe('POST /api/products/:id/sold - Mark as Sold', () => {

        it('should mark product as sold successfully', async () => {
            const saleData = {
                customerId: 'CUST001',
                customerName: 'Nguyen Van A'
            };

            fabricClient.invokeTransaction = jest.fn().mockResolvedValue({
                success: true,
                message: 'Product marked as sold'
            });

            const response = await request(app)
                .post('/api/products/PROD001/sold')
                .send(saleData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(fabricClient.invokeTransaction).toHaveBeenCalledWith(
                'MarkAsSold',
                ['PROD001', saleData.customerId, saleData.customerName]
            );
        });

        it('should return 403 for unauthorized sold marking', async () => {
            const saleData = {
                customerId: 'CUST001',
                customerName: 'Customer'
            };

            fabricClient.invokeTransaction = jest.fn().mockRejectedValue(
                new Error('Only retailer can mark products as sold')
            );

            const response = await request(app)
                .post('/api/products/PROD001/sold')
                .send(saleData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/products - Get All Products', () => {

        it('should retrieve all products successfully', async () => {
            const mockProducts = [
                { id: 'PROD001', name: 'Product 1', status: 'Manufactured' },
                { id: 'PROD002', name: 'Product 2', status: 'Sold' }
            ];

            fabricClient.queryTransaction = jest.fn().mockResolvedValue(mockProducts);

            const response = await request(app)
                .get('/api/products')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(fabricClient.queryTransaction).toHaveBeenCalledWith(
                'GetAllProducts',
                []
            );
        });

        it('should handle empty product list', async () => {
            fabricClient.queryTransaction = jest.fn().mockResolvedValue([]);

            const response = await request(app)
                .get('/api/products')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
    });

    // Performance & Load Tests
    describe('Performance Tests', () => {

        it('should handle multiple concurrent requests', async () => {
            fabricClient.queryTransaction = jest.fn().mockResolvedValue({
                id: 'PROD001',
                name: 'Product'
            });

            const requests = Array.from({ length: 10 }, () =>
                request(app).get('/api/products/PROD001')
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            expect(fabricClient.queryTransaction).toHaveBeenCalledTimes(10);
        });

        it('should respond within acceptable time limit', async () => {
            fabricClient.queryTransaction = jest.fn().mockResolvedValue({
                id: 'PROD001'
            });

            const startTime = Date.now();

            await request(app)
                .get('/api/products/PROD001')
                .expect(200);

            const responseTime = Date.now() - startTime;

            // Response should be under 1000ms
            expect(responseTime).toBeLessThan(1000);
        });
    });

    // Edge Cases
    describe('Edge Cases', () => {

        it('should handle very long product IDs', async () => {
            const longId = 'PROD' + 'X'.repeat(100);

            fabricClient.queryTransaction = jest.fn().mockRejectedValue(
                new Error('Product ID too long')
            );

            const response = await request(app)
                .get(`/api/products/${longId}`)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should handle special characters in product data', async () => {
            const productData = {
                productId: 'PROD-001',
                name: 'Product with "quotes" & <html>',
                category: 'Category',
                description: 'Description with \n newlines',
                manufacturer: "Manufacturer's Name",
                price: '99.99'
            };

            fabricClient.invokeTransaction = jest.fn().mockResolvedValue({
                success: true
            });

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(201);

            expect(response.body.success).toBe(true);
        });

        it('should reject invalid price formats', async () => {
            const productData = {
                productId: 'PROD001',
                name: 'Product',
                category: 'Category',
                description: 'Description',
                manufacturer: 'Manufacturer',
                price: 'invalid-price'
            };

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});
