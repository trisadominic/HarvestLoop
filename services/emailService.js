const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY environment variable not set');
    } else {
      sgMail.setApiKey(apiKey);
    }
  }

  async sendEmail(to, subject, html) {
    try {
      console.log('📧 Sending email via SendGrid to:', to);
      
      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'dominictrisa@gmail.com', // Use your verified sender
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
}

module.exports = new EmailService();