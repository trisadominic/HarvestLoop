# HarvestLoop Email Link Fix Documentation

## Problem Overview

The HarvestLoop application was experiencing an issue with email links in the negotiation system. When consumers sent offers to farmers, the farmers would receive emails with "accept offer" links. However, these links only worked when accessed from the same network as the server (e.g., only from PG wifi) and would show "This site can't be reached" when accessed from other networks.

## Root Cause

The root cause of the issue was that the email links were using local network addresses or localhost URLs, which are only accessible from the same network. This happened because:

1. The code was not properly detecting or using public-accessible URLs for emails
2. There was no centralized URL generation utility
3. Environment variables for URL configuration were not being properly used

## Solution Implemented

We have implemented a comprehensive solution to fix the email link issues:

1. Created a new utility file (`utils/url-utils.js`) for centralized URL generation
2. Modified the email sending functions in `routes/deals.js` to use the new utility
3. Added proper error handling with try/catch blocks
4. Created various testing and setup scripts to ensure everything works correctly

## Files Modified

### 1. utils/url-utils.js (New file)

This new utility file provides functions to generate publicly accessible URLs for email links:

```javascript
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
```

### 2. routes/deals.js

Modified to use the new URL utility for generating public-accessible links in emails:

- Added proper imports for the URL utility
- Updated email generation functions to use the utility
- Added try/catch blocks for better error handling
- Fixed syntax errors in the sendFarmerDealEmail and sendConsumerDealEmail functions

## Setup and Usage

We've created several scripts to help with setting up and testing the application:

### 1. setup-environment.bat

This script sets up the entire environment for proper email functionality:
- Creates or updates the .env file with proper configuration
- Detects the best public IP for your server
- Creates utility scripts for testing and monitoring

Run it with:

```
setup-environment.bat
```

### 2. start-server-fixed.bat

This script starts the server with the proper environment variables for email links:
- Detects your public IP address
- Sets the PUBLIC_DOMAIN environment variable
- Starts the server with proper configuration

Run it with:

```
start-server-fixed.bat
```

### 3. test-url.js

This script tests URL accessibility to verify email links work from any network:
- Tests the base URL from the utility
- Tests common paths
- Tests URLs from environment variables

Run it with:

```
node test-url.js
```

### 4. check-deal.js

This script checks the status of a deal in the database:
- Shows detailed information about a deal
- Displays farmer and consumer information
- Shows product and price details

Run it with:

```
node check-deal.js [dealId]
```

### 5. run-all-tests.bat

This script runs all tests to verify everything is working correctly:
- Tests URL accessibility
- Checks environment variables

Run it with:

```
run-all-tests.bat
```

## Best Practices for Production

For production deployment, consider the following best practices:

1. **Set Environment Variables**: Always set `PUBLIC_DOMAIN` to your public domain name:

```
set PUBLIC_DOMAIN=https://yourdomain.com
```

2. **Use HTTPS**: For production, always use HTTPS URLs for better security.

3. **Use a Reverse Proxy**: Consider using a reverse proxy like Nginx or a service like Ngrok for better URL handling.

4. **Monitor Email Delivery**: Regularly check that emails are being delivered and links are working.

## Troubleshooting

If email links still don't work:

1. Run `node test-url.js` to check URL accessibility
2. Verify that your server is accessible from the internet (may require port forwarding)
3. Check that the `PUBLIC_DOMAIN` environment variable is set correctly
4. Make sure your email service is configured correctly
5. Check server logs for any errors

## Need Further Help?

If you continue to experience issues, please provide the following information:

1. Server logs from the `logs` directory
2. Output from `node test-url.js`
3. Network configuration details (are you behind a NAT, using a VPN, etc.)
4. Details about the email provider you're using