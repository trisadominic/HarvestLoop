require('dotenv').config();
const { google } = require('googleapis');
const express = require('express');
const app = express();

// Validate environment variables
if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    console.error('❌ Environment variables missing');
    console.log('Required variables:');
    console.log('- GMAIL_CLIENT_ID');
    console.log('- GMAIL_CLIENT_SECRET');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://mail.google.com/'],
    prompt: 'consent',
    include_granted_scopes: true
});

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>HarvestLoop Gmail Authorization</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 40px auto;
                        padding: 20px;
                        text-align: center;
                    }
                    .btn {
                        display: inline-block;
                        background: #4285f4;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    .error {
                        color: #d93025;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <h1>HarvestLoop Gmail Authorization</h1>
                <p>Click below to authorize Gmail access for HarvestLoop:</p>
                <a href="${authUrl}" class="btn">Authorize Gmail Access</a>
            </body>
        </html>
    `);
});

app.get('/oauth2callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.error('❌ Authorization error:', error);
        return res.send(`
            <html>
                <body style="text-align: center; padding: 40px;">
                    <h1>Authorization Failed</h1>
                    <p class="error">Error: ${error}</p>
                    <p>Please make sure your email is added as a test user.</p>
                    <a href="/" class="btn">Try Again</a>
                </body>
            </html>
        `);
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ Refresh Token obtained successfully!');
        console.log('\n📋 Your refresh token (copy this to Railway):\n');
        console.log(tokens.refresh_token);
        console.log('\n');
        
        res.send(`
            <html>
                <body style="text-align: center; padding: 40px;">
                    <h1>Success! ✅</h1>
                    <p>Authorization successful. Check your terminal for the refresh token.</p>
                    <p>Add this token to Railway as GMAIL_REFRESH_TOKEN</p>
                </body>
            </html>
        `);
        
        // Exit after 5 seconds
        setTimeout(() => process.exit(0), 5000);
    } catch (error) {
        console.error('❌ Token error:', error);
        res.status(500).send('Error getting token. Check console for details.');
    }
});

const port = 3000;
app.listen(port, () => {
    console.log('\n🚀 Token generator is running!');
    console.log('\n1. Open this URL in your browser:');
    console.log(`http://localhost:${port}`);
    console.log('\n2. Login with your Gmail account');
    console.log('3. Grant permissions to HarvestLoop');
    console.log('4. Copy the refresh token from the console\n');
});