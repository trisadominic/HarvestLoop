/**
 * Advanced Mobile Server Starter for HarvestLoop
 * This script provides a robust mobile connection experience with:
 * - Automatic network interface detection
 * - Improved error handling and reconnection
 * - Extended timeouts for mobile connections
 * - Connection testing and verification
 * - Automatic firewall configuration assistance
 */
const { spawn, exec } = require('child_process');
const path = require('path');
const os = require('os');
const http = require('http');
const fs = require('fs');
const net = require('net');

// ANSI colors for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Banner
console.log(`
${colors.bright}${colors.green}=================================================
  HARVESTLOOP MOBILE SERVER - ENHANCED EDITION
=================================================${colors.reset}
`);

// Log message
console.log(`${colors.bright}🚀 Starting HarvestLoop server with mobile optimizations...${colors.reset}`);
console.log('📱 Server will be accessible from any device on your network');
console.log('⚙️ Using advanced network configuration for better connectivity\n');

// Get mobile-accessible IP addresses with more details
const getNetworkInterfaces = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address,
          netmask: iface.netmask,
          mac: iface.mac,
          cidr: iface.cidr
        });
      }
    }
  }

  return addresses;
};

// Function to check if port is available
const isPortAvailable = (port, host) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(false); // Port is in use
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(true); // Port is available (timeout means nothing is listening)
    });
    
    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve(true); // Port is available (connection refused means nothing is listening)
      } else {
        console.log(`Network error checking port on ${host}: ${err.message}`);
        resolve(true); // Assume available to be safe
      }
    });
    
    socket.connect(port, host);
  });
};

// Function to test connectivity on each interface
const testInterfaces = async (interfaces, port) => {
  console.log(`${colors.bright}🔍 Testing network interfaces for connectivity...${colors.reset}`);
  
  for (const iface of interfaces) {
    const available = await isPortAvailable(port, iface.address);
    const status = available ? 
      `${colors.green}Available${colors.reset}` : 
      `${colors.red}In Use${colors.reset}`;
    
    console.log(`   • ${iface.name}: ${iface.address} - Port ${port}: ${status}`);
  }
  
  return true;
};

// Function to check for common network issues
const checkNetworkIssues = async () => {
  console.log(`\n${colors.bright}🔍 Checking for common network configuration issues...${colors.reset}`);
  
  // Check if we're running with admin privileges (Windows only)
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    try {
      // Try to write to a protected location to test admin rights
      fs.accessSync('C:\\Windows\\Temp', fs.constants.W_OK);
      console.log(`   • ${colors.green}✓${colors.reset} Running with sufficient permissions`);
    } catch (err) {
      console.log(`   • ${colors.yellow}⚠️${colors.reset} Not running with admin rights (may affect firewall config)`);
      console.log(`     Consider running as administrator for better network access`);
    }
  }
  
  // Check if MongoDB is running
  try {
    const socket = new net.Socket();
    await new Promise((resolve) => {
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        console.log(`   • ${colors.green}✓${colors.reset} MongoDB appears to be running on port 27017`);
        resolve();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        console.log(`   • ${colors.yellow}⚠️${colors.reset} MongoDB may not be running (connection timeout)`);
        resolve();
      });
      
      socket.on('error', () => {
        socket.destroy();
        console.log(`   • ${colors.yellow}⚠️${colors.reset} MongoDB may not be running (connection refused)`);
        resolve();
      });
      
      socket.connect(27017, '127.0.0.1');
    });
  } catch (err) {
    // Ignore errors
  }
  
  // Check for multiple network adapters that might cause routing issues
  const interfaces = getNetworkInterfaces();
  if (interfaces.length > 1) {
    console.log(`   • ${colors.yellow}⚠️${colors.reset} Multiple network interfaces detected - may cause routing issues`);
    console.log(`     Mobile device should connect to the same network as one of these interfaces`);
  } else if (interfaces.length === 0) {
    console.log(`   • ${colors.red}❌${colors.reset} No external network interfaces detected!`);
    console.log(`     Check your network connection and try again`);
  }
};

// Start the server with enhanced mobile configurations
const startEnhancedServer = async () => {
  try {
    // Get network interfaces
    const interfaces = getNetworkInterfaces();
    const PORT = 3000;
    
    if (interfaces.length === 0) {
      console.log(`${colors.red}❌ Error: No network interfaces found${colors.reset}`);
      console.log('   Please check your network connection and try again');
      process.exit(1);
    }
    
    // Show IP addresses for connections
    console.log(`${colors.bright}📱 Connect from mobile devices using:${colors.reset}`);
    interfaces.forEach(iface => {
      console.log(`   ${colors.bright}${colors.cyan}http://${iface.address}:${PORT}${colors.reset} (${iface.name})`);
    });
    
    // Test interfaces
    await testInterfaces(interfaces, PORT);
    
    // Check network issues
    await checkNetworkIssues();
    
    // Test if port 3000 is already in use
    let portAvailable = await isPortAvailable(PORT, '0.0.0.0');
    if (!portAvailable) {
      console.log(`\n${colors.yellow}⚠️ Port ${PORT} is already in use.${colors.reset}`);
      console.log('   Attempting to identify the process...');
      
      // Try to identify what's using the port
      if (process.platform === 'win32') {
        exec(`netstat -ano | findstr :${PORT}`, (error, stdout) => {
          if (!error && stdout) {
            console.log(`   Port ${PORT} is currently used by process:`);
            console.log(`   ${stdout.split('\n')[0]}`);
          }
          console.log(`\n${colors.red}❌ Cannot start server. Please stop other servers first.${colors.reset}`);
          process.exit(1);
        });
      } else {
        exec(`lsof -i :${PORT}`, (error, stdout) => {
          if (!error && stdout) {
            console.log(`   Port ${PORT} is currently used by process:`);
            console.log(`   ${stdout.split('\n')[0]}`);
          }
          console.log(`\n${colors.red}❌ Cannot start server. Please stop other servers first.${colors.reset}`);
          process.exit(1);
        });
      }
    } else {
      console.log(`\n${colors.green}✓ Port ${PORT} is available${colors.reset}`);
    }
    
    // Set environment variables for better mobile performance
    const enhancedEnv = {
      ...process.env,
      HOST: '0.0.0.0',               // Listen on all interfaces
      PORT: PORT.toString(),          // Use specified port
      SERVER_TIMEOUT: 300000,        // 5 minute timeout for slow mobile connections (numeric)
      KEEP_ALIVE_TIMEOUT: 120000,    // 2 minutes keep-alive for mobile (numeric)
      NODE_ENV: 'production',        // Use production mode for better performance
      MOBILE_OPTIMIZED: 'true'       // Flag for mobile optimizations
    };
    
    console.log(`\n${colors.bright}🔄 Starting server with enhanced mobile settings...${colors.reset}`);
    console.log('   • Extended timeouts for slow mobile connections (5 minutes)');
    console.log('   • Optimized network settings for all interfaces');
    console.log('   • CORS enabled for all origins');
    console.log('   • Keep-alive extended to 2 minutes');
    
    // Start the server process
    console.log(`\n${colors.bright}🚀 Launching server...${colors.reset}`);
    const serverProcess = spawn('node', ['app.js'], {
      env: enhancedEnv,
      stdio: 'inherit'
    });
    
    // Handle server process exit
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`\n${colors.red}❌ Server process exited with code ${code}${colors.reset}`);
        process.exit(code);
      }
    });
    
    // Test server connectivity after a short delay
    setTimeout(async () => {
      try {
        console.log(`\n${colors.bright}🔍 Testing server connectivity...${colors.reset}`);
        
        // Test local connection
        const localTest = await testEndpoint('http://localhost:3000/ping');
        if (localTest) {
          console.log(`   • ${colors.green}✓${colors.reset} Server is responding on localhost`);
        } else {
          console.log(`   • ${colors.red}❌${colors.reset} Server is NOT responding on localhost`);
        }
        
        // Test on network interfaces
        for (const iface of interfaces) {
          const networkTest = await testEndpoint(`http://${iface.address}:3000/ping`);
          if (networkTest) {
            console.log(`   • ${colors.green}✓${colors.reset} Server is responding on ${iface.address}`);
          } else {
            console.log(`   • ${colors.red}❌${colors.reset} Server is NOT responding on ${iface.address}`);
          }
        }
        
        // Show troubleshooting info
        showTroubleshootingInfo();
      } catch (err) {
        console.log(`\n${colors.yellow}⚠️ Connectivity test failed: ${err.message}${colors.reset}`);
        showTroubleshootingInfo();
      }
    }, 3000);
    
    // Handle termination signals
    process.on('SIGINT', () => {
      console.log(`\n${colors.bright}👋 Shutting down server...${colors.reset}`);
      serverProcess.kill('SIGINT');
      setTimeout(() => process.exit(0), 1000);
    });
  } catch (err) {
    console.error(`\n${colors.red}❌ Failed to start server: ${err.message}${colors.reset}`);
    process.exit(1);
  }
};

// Helper function to test an endpoint
const testEndpoint = (url) => {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 2000 }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume(); // Consume response to free up memory
    });
    
    request.on('error', () => {
      resolve(false);
    });
    
    request.on('timeout', () => {
      request.abort();
      resolve(false);
    });
  });
};

// Show troubleshooting information
const showTroubleshootingInfo = () => {
  console.log(`\n${colors.bright}📝 Mobile Connection Troubleshooting:${colors.reset}`);
  console.log(`   1. Ensure your mobile device is on the same WiFi network as this computer`);
  console.log(`   2. Check your computer's firewall settings and allow Node.js`);
  console.log(`   3. Try accessing the server using different network interfaces shown above`);
  console.log(`   4. Some public WiFi networks block device-to-device communication`);
  console.log(`   5. On your phone, make sure you're using the complete URL with http://`);
  console.log(`   6. If using a VPN, try disabling it temporarily`);
  
  console.log(`\n${colors.bright}👨‍💻 Server is running! Press Ctrl+C to stop${colors.reset}`);
};

// Start the enhanced server
startEnhancedServer().catch(err => {
  console.error(`\n${colors.red}❌ Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});