export const OtpPurpose = {
  LOGIN: 'LOGIN',
  PASSWORD_RESET: 'PASSWORD_RESET',
  ACCOUNT_VERIFICATION: 'ACCOUNT_VERIFICATION',
} as const;

export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

export const OtpChannel = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
} as const;

export type OtpChannel = (typeof OtpChannel)[keyof typeof OtpChannel];
