// Direct test of signature helper
const { generateHandoverAcceptSignature } = require('./src/utils/signatureHelper');

const testData = {
    org: 'shipper',
    userId: 'user1',
    handoverId: 'HANDOVER-PROD-AUTO-135426-SHIPPER-e3b89aaf4322550b',
    nonce: '524002f2cf01620c44425cbedbc42febff3e7004f3aa7feb9df76a3bf6eb6a22',
    receiverId: 'DRIVER-AUTO-001'
};

console.log('Testing signature generation...');
console.log('Input:', JSON.stringify(testData, null, 2));

generateHandoverAcceptSignature(
    testData.org,
    testData.userId,
    testData.handoverId,
    testData.nonce,
    testData.receiverId
)
    .then(signature => {
        console.log('\nSUCCESS!');
        console.log(`Signature: ${signature}`);
        console.log(`Length: ${signature.length}`);
        console.log(`Valid format: ${/^[0-9a-f]{140,144}$/i.test(signature)}`);
    })
    .catch(error => {
        console.error('\nFAILURE!');
        console.error(error.message);
        console.error(error.stack);
    });
