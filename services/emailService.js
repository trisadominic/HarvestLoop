const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY environment variable not set');
    } else {
      sgMail.setApiKey(apiKey);
      console.log('✅ SendGrid initialized successfully');
    }
  }

  async sendEmail(to, subject, html) {
    try {
      console.log('📧 Sending email via SendGrid to:', to);
      
      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'dominictrisa@gmail.com', // Your verified sender
        subject,
        html,
      };
      
      const response = await sgMail.send(msg);
      console.log('✅ Email sent successfully via SendGrid:', response[0].statusCode);
      return true;
    } catch (error) {
      console.error('❌ SendGrid email sending failed:', error.message);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return false;
    }
  }

  async verifyConnection() {
    try {
      console.log('🔄 Verifying SendGrid connection...');
      // SendGrid doesn't have a verify method like nodemailer
      // We'll just log the API key status (partial for security)
      const apiKey = process.env.SENDGRID_API_KEY || '';
      if (!apiKey) {
        console.error('❌ SendGrid API key not configured');
        return false;
      }
      
      const lastFour = apiKey.slice(-4);
      console.log(`✅ SendGrid configured with API key ending in ${lastFour}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();