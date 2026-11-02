import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  otp: {
    expiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  },
  lockout: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    durationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10),
  },
  defaults: {
    weeklyContribution: parseFloat(process.env.DEFAULT_WEEKLY_CONTRIBUTION || '50'),
    weeklyPenalty: parseFloat(process.env.DEFAULT_WEEKLY_PENALTY || '50'),
    monthlyPenalty: parseFloat(process.env.DEFAULT_MONTHLY_PENALTY || '100'),
    meetingDay: parseInt(process.env.DEFAULT_MEETING_DAY || '6', 10),
    graduationContribution: parseFloat(process.env.DEFAULT_GRADUATION_CONTRIBUTION || '100'),
    bereavementContribution: parseFloat(process.env.DEFAULT_BEREAVEMENT_CONTRIBUTION || '100'),
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },
  backup: {
    dir: process.env.BACKUP_DIR || 'backups',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'om',
  africastalking: {
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME || 'sandbox',
    senderId: process.env.AT_SENDER_ID || 'AMS',
  },
  ethiotelecom: {
    apiKey: process.env.ETHIO_TELECOM_API_KEY,
    apiUrl: process.env.ETHIO_TELECOM_API_URL || 'https://api.ethiotelecom.et/sms/send',
    senderId: process.env.ETHIO_TELECOM_SENDER_ID || 'AFOSHA',
    username: process.env.ETHIO_TELECOM_USERNAME,
    password: process.env.ETHIO_TELECOM_PASSWORD,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'AMS <noreply@afosha.org>',
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
  },
} as const;
