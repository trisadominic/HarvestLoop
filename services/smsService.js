const twilio = require('twilio');

class SmsService {
  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !twilioPhone) {
      console.warn('⚠️ Twilio not fully configured, SMS will not be sent');
      this.enabled = false;
    } else {
      this.client = twilio(accountSid, authToken);
      this.twilioPhone = twilioPhone;
      this.enabled = true;
      console.log('✅ Twilio SMS service initialized');
    }
  }
  
  async sendSms(to, message) {
    try {
      if (!this.enabled) {
        console.log(`📱 [MOCK SMS] To: ${to}, Message: ${message}`);
        return true;
      }
      
      console.log(`📱 Sending SMS to ${to}`);
      const result = await this.client.messages.create({
        body: message,
        from: this.twilioPhone,
        to: to
      });
      
      console.log(`✅ SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return false;
    }
  }
  
  // For testing/debugging - mock OTP
  mockOtp(phone) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 [MOCK OTP] Generated for ${phone}: ${otp}`);
    return otp;
  }
}

module.exports = new SmsService();