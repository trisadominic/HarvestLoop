/**
 * Public Tunnel for HarvestLoop
 * This script creates a public URL for your locally running server.
 */

const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    console.log('\n🔄 Creating tunnel to make your server publicly accessible...');
    
    // Create a tunnel to port 3000
    const tunnel = await localtunnel({ port: 3000, subdomain: 'harvestloop-' + Math.floor(Math.random() * 10000) });
    
    console.log('\n✅ Tunnel created successfully!');
    console.log('\n📱 Your server is now accessible from anywhere at:');
    console.log(`🌐 ${tunnel.url}`);
    console.log('\nShare this URL with anyone who needs to access your application.');
    console.log('They do NOT need to be on the same network as you.\n');
    console.log('⚠️ Note: This URL will only work while this script is running.');
    console.log('⚠️ The server must be started separately with:');
    console.log('   node ultra-simple-server.js\n');
    console.log('👉 Press Ctrl+C to stop the tunnel');
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Error creating tunnel:', error.message);
    console.log('\nPlease make sure:');
    console.log('1. Your server is running on port 3000');
    console.log('2. You have internet access');
    process.exit(1);
  }
}

startTunnel();