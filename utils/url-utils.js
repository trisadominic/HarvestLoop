// url-utils.js - Utility functions for working with URLs

const os = require('os');

/**
 * Get the best base URL for email links that will be accessible from any network
 * @returns {string} A base URL that should be accessible externally
 */
function getPublicBaseUrl() {
    // First check for explicitly configured PUBLIC_DOMAIN
    if (process.env.PUBLIC_DOMAIN) {
        return process.env.PUBLIC_DOMAIN;
    }
    
    // Then check for BASE_URL as fallback
    if (process.env.BASE_URL) {
        return process.env.BASE_URL;
    }
    
    // Otherwise, try to find a public IP address
    const networkInterfaces = os.networkInterfaces();
    let publicIp = null;
    
    // Try to find a public IP address
    for (const iface of Object.values(networkInterfaces).flat()) {
        if (!iface.internal && iface.family === 'IPv4') {
            publicIp = iface.address;
            break;
        }
    }
    
    // Use the IP if found, otherwise fall back to localhost
    return publicIp ? `http://${publicIp}:3000` : 'http://localhost:3000';
}

module.exports = {
    getPublicBaseUrl
};