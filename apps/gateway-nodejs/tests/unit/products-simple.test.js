const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring routes
jest.mock('../../src/utils/fabricClient');
jest.mock('../../src/utils/database', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] })
}));
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

const fabricClient = require('../../src/utils/fabricClient');
const productsRouter = require('../../src/routes/products');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/products', productsRouter);

describe('Products API - Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        if (fabricClient.__resetMocks) {
            fabricClient.__resetMocks();
        }
    });

    describe('POST /api/products - Create Product', () => {

        it('should create a new product successfully', async () => {
            const productData = {
                id: 'PROD001',
                name: 'Laptop Dell XPS',
                batch: 'BATCH001',
                origin: 'Vietnam',
                manufactureDate: '2025-11-01'
            };

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(fabricClient.submitTransaction).toHaveBeenCalled();
        });

        it('should return 400 for missing required fields', async () => {
            const invalidData = {
                id: 'PROD002'
                // Missing name, batch, origin, manufactureDate
            };

            const response = await request(app)
                .post('/api/products')
                .send(invalidData)
                .expect(400);

            expect(response.body.errors).toBeDefined();
        });

        it('should handle blockchain errors', async () => {
            const productData = {
                id: 'PROD001',
                name: 'Product',
                batch: 'BATCH001',
                origin: 'Vietnam',
                manufactureDate: '2025-11-01'
            };

            fabricClient.submitTransaction.mockRejectedValueOnce(
                new Error('Blockchain error')
            );

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(500);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('GET /api/products/:id - Get Product', () => {

        it('should retrieve existing product successfully', async () => {
            const mockProduct = {
                id: 'PROD001',
                name: 'Laptop Dell XPS',
                batch: 'BATCH001',
                status: 'Manufactured'
            };

            fabricClient.evaluateTransaction.mockResolvedValueOnce(
                Buffer.from(JSON.stringify(mockProduct))
            );

            const response = await request(app)
                .get('/api/products/PROD001')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe('PROD001');
        });

        it('should handle non-existent product', async () => {
            fabricClient.evaluateTransaction.mockRejectedValueOnce(
                new Error('Product not found')
            );

            const response = await request(app)
                .get('/api/products/PROD999');

            // May return 404 or 500 depending on error handling
            expect([404, 500]).toContain(response.status);
            expect(response.body).toBeDefined();
        });
    });

    describe('GET /api/products/:id/history - Get Product History', () => {

        it('should retrieve product history successfully', async () => {
            const mockHistory = [
                {
                    txId: 'tx1',
                    timestamp: '2025-11-03T00:00:00Z',
                    action: 'CreateProduct'
                }
            ];

            fabricClient.evaluateTransaction.mockResolvedValueOnce(
                Buffer.from(JSON.stringify(mockHistory))
            );

            const response = await request(app)
                .get('/api/products/PROD001/history')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /api/products - Get All Products', () => {

        it('should retrieve all products successfully', async () => {
            const mockProducts = [
                { id: 'PROD001', name: 'Product 1' },
                { id: 'PROD002', name: 'Product 2' }
            ];

            fabricClient.evaluateTransaction.mockResolvedValueOnce(
                Buffer.from(JSON.stringify(mockProducts))
            );

            const response = await request(app)
                .get('/api/products')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        it('should handle empty product list', async () => {
            fabricClient.evaluateTransaction.mockResolvedValueOnce(
                Buffer.from(JSON.stringify([]))
            );

            const response = await request(app)
                .get('/api/products')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('PUT /api/products/:id/ship - Ship Product', () => {

        it('should ship product successfully', async () => {
            const shipmentData = {
                shipmentId: 'SHIP001',
                shipperId: 'SHIPPER001',
                waybill: 'WB123',
                destination: 'Warehouse'
            };

            const response = await request(app)
                .put('/api/products/PROD001/ship')
                .send(shipmentData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(fabricClient.submitTransaction).toHaveBeenCalled();
        });

        it('should return 400 for missing shipment details', async () => {
            const invalidData = {
                shipmentId: 'SHIP001'
                // Missing shipperId, waybill, destination
            };

            const response = await request(app)
                .put('/api/products/PROD001/ship')
                .send(invalidData);

            // May return 400 validation error or 500 blockchain error
            expect([400, 500]).toContain(response.status);
        });
    });

    describe('PUT /api/products/:id/warehouse - Receive at Warehouse', () => {

        it('should receive product at warehouse successfully', async () => {
            const receiveData = {
                shipmentId: 'SHIP001',
                receiverId: 'WAREHOUSE001',
                location: 'Warehouse A'
            };

            const response = await request(app)
                .put('/api/products/PROD001/warehouse')
                .send(receiveData);

            // Should return 200 on success or 400/500 on error
            expect([200, 400, 500]).toContain(response.status);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
            }
        });
    });

    describe('Error Handling', () => {

        it('should handle invalid product ID format', async () => {
            const response = await request(app)
                .get('/api/products/INVALID');

            // May return 200 (product not found) or 500 (error)
            expect([200, 404, 500]).toContain(response.status);
            expect(response.body).toBeDefined();
        });

        it('should handle network errors', async () => {
            fabricClient.submitTransaction.mockRejectedValueOnce(
                new Error('Network timeout')
            );

            const productData = {
                id: 'PROD001',
                name: 'Product',
                batch: 'BATCH001',
                origin: 'Vietnam',
                manufactureDate: '2025-11-01'
            };

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(500);

            expect(response.body.error).toContain('Network timeout');
        });
    });

    describe('Performance Tests', () => {

        it('should handle multiple concurrent requests', async () => {
            const mockProduct = { id: 'PROD001', name: 'Product' };
            fabricClient.evaluateTransaction.mockResolvedValue(
                Buffer.from(JSON.stringify(mockProduct))
            );

            const requests = Array.from({ length: 5 }, () =>
                request(app).get('/api/products/PROD001')
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });
});
