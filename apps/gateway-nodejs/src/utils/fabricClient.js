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
    }

    async initialize() {
        try {
            // Load connection profile - use absolute path or process.cwd()
            const ccpPath = path.join(process.cwd(), '..', '..', 'network', 'connection-manufacturer.json');
            logger.info(`Looking for connection profile at: ${ccpPath}`);
            logger.info(`process.cwd() is: ${process.cwd()}`);

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

            await this.gateway.connect(this.connectionProfile, {
                wallet: this.wallet,
                identity: userId,
                discovery: { enabled: false, asLocalhost: true }
            });

            logger.info(`Connected to Fabric network as ${userId}`);
            return this.gateway;
        } catch (error) {
            logger.error('Failed to connect to Fabric network:', error);
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
            const contract = await this.getContract(channelName, chaincodeName);
            const result = await contract.evaluateTransaction(functionName, ...args);

            logger.info(`Transaction ${functionName} evaluated successfully`);
            return result.toString();
        } catch (error) {
            logger.error(`Failed to evaluate transaction ${functionName}:`, error);
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
