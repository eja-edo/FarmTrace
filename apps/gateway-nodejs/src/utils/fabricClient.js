const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class FabricClient {
    constructor() {
        this.gateway = null;
        this.wallet = null;
        this.connectionProfile = null;
        this.currentUserId = null;
    }

    async initialize() {
        try {
            // Load connection profile - check Docker path first, then local path
            let ccpPath = '/app/connection-profile.json'; // Docker path
            if (!fs.existsSync(ccpPath)) {
                // Fallback to local development path
                const projectRoot = path.join(__dirname, '..', '..', '..', '..');
                // Use full connection profile with all 4 peers for MAJORITY endorsement
                ccpPath = path.join(projectRoot, 'network', 'connection-full.json');
            }

            logger.info(`Looking for connection profile at: ${ccpPath}`);

            if (!fs.existsSync(ccpPath)) {
                throw new Error(`Connection profile not found at ${ccpPath}`);
            }

            this.connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            // Create wallet - use absolute path
            const walletPath = path.join(process.cwd(), process.env.WALLET_PATH || 'wallet');
            logger.info(`Wallet path: ${walletPath}`);
            this.wallet = await Wallets.newFileSystemWallet(walletPath);

            logger.info('Fabric client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Fabric client:', error);
            throw error;
        }
    }

    async connect(userId = 'appUser') {
        try {
            if (!this.wallet) {
                await this.initialize();
            }

            // Check if user exists in wallet
            const identity = await this.wallet.get(userId);
            if (!identity) {
                throw new Error(`Identity ${userId} not found in wallet. Please enroll first.`);
            }

            // Create gateway instance
            this.gateway = new Gateway();

            // Detect if running in Docker (check /.dockerenv or DOCKER_ENV variable)
            const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_ENV === 'true';

            // DISABLE discovery - use static endpoints from connection profile
            // Discovery service causes "failed constructing descriptor" errors
            const discoveryEnabled = false;
            logger.info(`Docker Environment: ${isDocker}, Discovery: ${discoveryEnabled} (DISABLED), asLocalhost: ${!isDocker}`);

            await this.gateway.connect(this.connectionProfile, {
                wallet: this.wallet,
                identity: userId,
                discovery: {
                    enabled: discoveryEnabled,
                    asLocalhost: !isDocker  // false in Docker, true in local
                }
            });

            this.currentUserId = userId;
            logger.info(`Connected to Fabric network as ${userId} (${identity.mspId})`);
            return this.gateway;
        } catch (error) {
            logger.error('Failed to connect to Fabric network:', error);
            throw error;
        }
    }

    /**
     * Get current user's MSP ID from connected gateway
     */
    async getCurrentMSP() {
        if (!this.gateway || !this.currentUserId) {
            throw new Error('Gateway not connected. Call connect() first.');
        }

        try {
            // Get identity from wallet using current userId
            const identity = await this.wallet.get(this.currentUserId);
            if (!identity) {
                throw new Error(`Identity ${this.currentUserId} not found in wallet`);
            }
            return identity.mspId;
        } catch (error) {
            logger.error('Failed to get current MSP:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.gateway) {
            await this.gateway.disconnect();
            logger.info('Disconnected from Fabric network');
        }
    }

    async getContract(channelName, chaincodeName) {
        if (!this.gateway) {
            await this.connect();
        }

        const network = await this.gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        return contract;
    }

    async submitTransaction(channelName, chaincodeName, functionName, ...args) {
        try {
            // Check if specific userId provided via {_userId: 'userId'} in last arg
            const lastArg = args[args.length - 1];
            const userId = (lastArg && typeof lastArg === 'object' && lastArg._userId) ? args.pop()._userId : null;

            // Reconnect if userId specified and different from current
            if (userId && userId !== this.currentUserId) {
                await this.connect(userId);
            }

            const contract = await this.getContract(channelName, chaincodeName);
            const result = await contract.submitTransaction(functionName, ...args);

            logger.info(`Transaction ${functionName} submitted successfully`);
            return result.toString();
        } catch (error) {
            logger.error(`Failed to submit transaction ${functionName}:`, error);
            throw error;
        }
    }

    async evaluateTransaction(channelName, chaincodeName, functionName, ...args) {
        try {
            logger.info(`[evaluateTransaction] Function: ${functionName}, Channel: ${channelName}, Chaincode: ${chaincodeName}`);
            logger.info(`[evaluateTransaction] Current user: ${this.currentUserId}`);
            logger.info(`[evaluateTransaction] Gateway connected: ${!!this.gateway}`);

            // Check if specific userId provided via {_userId: 'userId'} in last arg
            const lastArg = args[args.length - 1];
            const userId = (lastArg && typeof lastArg === 'object' && lastArg._userId) ? args.pop()._userId : null;

            // Reconnect if userId specified and different from current
            if (userId && userId !== this.currentUserId) {
                logger.info(`[evaluateTransaction] Reconnecting as ${userId}`);
                await this.connect(userId);
            }

            logger.info(`[evaluateTransaction] Getting contract...`);
            const contract = await this.getContract(channelName, chaincodeName);

            logger.info(`[evaluateTransaction] Executing ${functionName} with ${args.length} args...`);
            const result = await contract.evaluateTransaction(functionName, ...args);

            logger.info(`[evaluateTransaction] ${functionName} evaluated successfully, result length: ${result ? result.length : 0}`);
            return result.toString();
        } catch (error) {
            logger.error(`[evaluateTransaction] Failed to evaluate ${functionName}:`, error);
            logger.error(`[evaluateTransaction] Error details:`, {
                message: error.message,
                stack: error.stack,
                endorsements: error.endorsements,
                errors: error.errors
            });
            throw error;
        }
    }

    async enrollAdmin(orgMspId, caClient, adminUserId = 'admin', adminSecret = 'adminpw') {
        try {
            // Check if admin already enrolled
            const identity = await this.wallet.get(adminUserId);
            if (identity) {
                logger.info(`Admin ${adminUserId} already exists in wallet`);
                return;
            }

            // Enroll admin
            const enrollment = await caClient.enroll({
                enrollmentID: adminUserId,
                enrollmentSecret: adminSecret
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: orgMspId,
                type: 'X.509',
            };

            await this.wallet.put(adminUserId, x509Identity);
            logger.info(`Admin ${adminUserId} enrolled successfully`);
        } catch (error) {
            logger.error('Failed to enroll admin:', error);
            throw error;
        }
    }

    async registerUser(caClient, adminUserId, userId, orgMspId) {
        try {
            // Check if user already exists
            const userIdentity = await this.wallet.get(userId);
            if (userIdentity) {
                logger.info(`User ${userId} already exists in wallet`);
                return;
            }

            // Get admin identity
            const adminIdentity = await this.wallet.get(adminUserId);
            if (!adminIdentity) {
                throw new Error(`Admin ${adminUserId} not found in wallet`);
            }

            // Build user object for authenticating with CA
            const provider = this.wallet.getProviderRegistry().getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

            // Register user
            const secret = await caClient.register({
                affiliation: '',
                enrollmentID: userId,
                role: 'client'
            }, adminUser);

            // Enroll user
            const enrollment = await caClient.enroll({
                enrollmentID: userId,
                enrollmentSecret: secret
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: orgMspId,
                type: 'X.509',
            };

            await this.wallet.put(userId, x509Identity);
            logger.info(`User ${userId} registered and enrolled successfully`);
        } catch (error) {
            logger.error('Failed to register user:', error);
            throw error;
        }
    }
}

module.exports = new FabricClient();
