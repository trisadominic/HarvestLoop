const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

class EmailService {
    constructor() {
        this.oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'https://harvestloop-production.up.railway.app/auth/google/callback'
        );

        this.oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
    }

    async createTransport() {
        try {
            const accessToken = await this.oauth2Client.getAccessToken();

            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.EMAIL_USER,
                    clientId: process.env.GMAIL_CLIENT_ID,
                    clientSecret: process.env.GMAIL_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                    accessToken: accessToken.token
                }
            });
        } catch (error) {
            console.error('Failed to create transport:', error);
            throw error;
        }
    }

    async sendEmail(to, subject, html) {
        try {
            const transporter = await this.createTransport();
            
            const mailOptions = {
                from: `HarvestLoop <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            return false;
        }
    }
}

module.exports = new EmailService();