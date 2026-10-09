require('dotenv').config();
const path = require('path');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  dbFile: path.resolve(process.cwd(), process.env.DATABASE_FILE || './database.sqlite'),
  jwtSecret: process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_prod_1234567890',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
  maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS, 10) || 3,
  devDefaultOtp: process.env.DEV_DEFAULT_OTP || '123456',
  enableDevOtp: process.env.ENABLE_DEV_OTP !== 'false',
  smsEnabled: process.env.SMS_ENABLED !== 'false',
  smsProvider: process.env.SMS_PROVIDER || 'mock',
  smsApiKey: process.env.SMS_API_KEY || '',
  smsSenderId: process.env.SMS_SENDER_ID || 'REXSCH',
  smsWebhookUrl: process.env.SMS_WEBHOOK_URL || '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  schoolTimezone: process.env.SCHOOL_TIMEZONE || 'Asia/Kolkata',
  autoSendHour: parseInt(process.env.AUTO_SEND_HOUR, 10) || 17,
  autoSendMinute: parseInt(process.env.AUTO_SEND_MINUTE, 10) || 0,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  googleMapsWebApiKey: process.env.GOOGLE_MAPS_WEB_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  googleMapsAndroidApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || ''
};

module.exports = config;
