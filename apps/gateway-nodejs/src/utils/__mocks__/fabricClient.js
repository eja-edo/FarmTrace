/**
 * Mock implementation of fabricClient for unit testing
 * This mock provides test doubles for Fabric SDK operations
 */

const mockSubmitTransaction = jest.fn();
const mockEvaluateTransaction = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

// Default successful responses
const defaultProductResponse = JSON.stringify({
    id: 'PROD001',
    name: 'Test Product',
    batch: 'BATCH001',
    origin: 'Vietnam',
    status: 'Manufactured',
    owner: 'Manufacturer'
});

const defaultHistoryResponse = JSON.stringify([
    {
        txId: 'tx1',
        timestamp: '2025-11-03T00:00:00Z',
        action: 'CreateProduct',
        data: { status: 'Manufactured' }
    }
]);

const defaultAllProductsResponse = JSON.stringify([
    { id: 'PROD001', name: 'Product 1', status: 'Manufactured' },
    { id: 'PROD002', name: 'Product 2', status: 'Sold' }
]);

// Configure default mock behaviors
mockSubmitTransaction.mockResolvedValue(Buffer.from('{"success": true}'));

mockEvaluateTransaction.mockImplementation((channel, chaincode, func, ...args) => {
    // Return appropriate response based on function name
    if (func === 'GetProduct') {
        return Promise.resolve(Buffer.from(defaultProductResponse));
    } else if (func === 'GetProductHistory') {
        return Promise.resolve(Buffer.from(defaultHistoryResponse));
    } else if (func === 'GetAllProducts') {
        return Promise.resolve(Buffer.from(defaultAllProductsResponse));
    }
    return Promise.resolve(Buffer.from('{}'));
});

mockConnect.mockResolvedValue(true);
mockDisconnect.mockResolvedValue(true);

module.exports = {
    submitTransaction: mockSubmitTransaction,
    evaluateTransaction: mockEvaluateTransaction,
    connect: mockConnect,
    disconnect: mockDisconnect,

    // Helper methods for tests to configure responses
    __setMockSubmitResponse: (response) => {
        const buffer = Buffer.from(typeof response === 'string' ? response : JSON.stringify(response));
        mockSubmitTransaction.mockResolvedValue(buffer);
    },

    __setMockEvaluateResponse: (response) => {
        const buffer = Buffer.from(typeof response === 'string' ? response : JSON.stringify(response));
        mockEvaluateTransaction.mockResolvedValue(buffer);
    },

    __setMockSubmitError: (error) => {
        mockSubmitTransaction.mockRejectedValue(error);
    },

    __setMockEvaluateError: (error) => {
        mockEvaluateTransaction.mockRejectedValue(error);
    },

    __resetMocks: () => {
        mockSubmitTransaction.mockClear();
        mockEvaluateTransaction.mockClear();
        mockConnect.mockClear();
        mockDisconnect.mockClear();

        // Reset to default behaviors
        mockSubmitTransaction.mockResolvedValue(Buffer.from('{"success": true}'));
        mockEvaluateTransaction.mockImplementation((channel, chaincode, func, ...args) => {
            if (func === 'GetProduct') {
                return Promise.resolve(Buffer.from(defaultProductResponse));
            } else if (func === 'GetProductHistory') {
                return Promise.resolve(Buffer.from(defaultHistoryResponse));
            } else if (func === 'GetAllProducts') {
                return Promise.resolve(Buffer.from(defaultAllProductsResponse));
            }
            return Promise.resolve(Buffer.from('{}'));
        });
    }
};
