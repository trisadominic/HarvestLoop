/**
 * Simple Mobile Server Starter for HarvestLoop
 * A straightforward version without advanced diagnostics to avoid timeout issues
 */
const { spawn } = require('child_process');
const os = require('os');

console.log('🚀 Starting HarvestLoop mobile server...');

// Get network interfaces
const interfaces = os.networkInterfaces();
const addresses = [];

for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
            addresses.push({
                name: name,
                address: iface.address
            });
        }
    }
}

// Show connection information
console.log('\n📱 Connect from mobile devices using:');
addresses.forEach(addr => {
    console.log(`   http://${addr.address}:3000 (${addr.name})`);
});

// Start the server
console.log('\n🔄 Starting server with mobile optimizations...');

// Use numeric values for timeouts to avoid errors
const serverProcess = spawn('node', ['app.js'], {
    env: {
        ...process.env,
        HOST: '0.0.0.0',
        PORT: '3000',
        // Using numeric strings that will be properly parsed by the app.js
        SERVER_TIMEOUT: '300000',
        KEEP_ALIVE_TIMEOUT: '120000',
        NODE_ENV: 'production'
    },
    stdio: 'inherit'
});

// Handle server exit
serverProcess.on('exit', (code) => {
    if (code !== 0) {
        console.error(`\n❌ Server process exited with code ${code}`);
    }
});

// Handle termination
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    serverProcess.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
});