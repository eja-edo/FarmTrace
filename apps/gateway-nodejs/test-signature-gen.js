// Test signature generation directly
const { spawn } = require('child_process');

const message = "HANDOVER-PROD-AUTO-134838-SHIPPER-58101f46d4466b58:ff83408afa6dc5f4cf702496ff4958e9578b0459f45959f94e74c7b5db8ad6c6:DRIVER-AUTO-001";
const orgPath = "shipper.example.com";
const userPath = "Admin@shipper.example.com";

const dockerCmd = `echo '${message}' | openssl dgst -sha256 -sign /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${orgPath}/users/${userPath}/msp/keystore/*_sk | od -A n -t x1 | tr -d ' ' | tr -d '\\n'`;

console.log("Docker command:", dockerCmd);
console.log("\nExecuting...\n");

const docker = spawn('docker', ['exec', 'fabric-tools', 'bash', '-c', dockerCmd]);

let stdout = '';
let stderr = '';

docker.stdout.on('data', (data) => {
    stdout += data.toString();
});

docker.stderr.on('data', (data) => {
    stderr += data.toString();
});

docker.on('close', (code) => {
    console.log(`Exit code: ${code}`);
    console.log(`\nStdout:\n${stdout}`);
    console.log(`\nStderr:\n${stderr}`);

    const signature = stdout.trim();
    console.log(`\nSignature length: ${signature.length}`);
    console.log(`Valid format: ${/^[0-9a-f]{140,144}$/i.test(signature)}`);
});
