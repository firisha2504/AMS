# Ethio Telecom SMS API Setup Guide

## Overview

This guide will help you set up SMS notifications using **Ethio Telecom SMS API** for the Afosha Management System.

## What You Need

To use Ethio Telecom SMS API, you need:

1. **API Key** - Provided by Ethio Telecom
2. **Username** - Your Ethio Telecom API account username
3. **Password** - Your Ethio Telecom API account password
4. **Sender ID** - The name that appears as the sender (e.g., "AFOSHA")
5. **API URL** - The endpoint URL (usually provided by Ethio Telecom)

## How to Get Ethio Telecom SMS API Credentials

### Option 1: Contact Ethio Telecom Directly

1. Visit Ethio Telecom office or call their business support
2. Ask for **"SMS API Service"** or **"Bulk SMS API"**
3. They will provide:
   - API Key
   - Username
   - Password
   - API Documentation
   - Sender ID registration process

### Option 2: Through Ethio Telecom Partner

1. Contact an authorized Ethio Telecom SMS aggregator
2. Register for SMS API service
3. Receive credentials and documentation

## Configuration Steps

### Step 1: Update Environment Variables

Edit your `backend/.env` file and add:

```env
# Enable SMS
SMS_ENABLED=true

# Ethio Telecom Configuration
ETHIO_TELECOM_API_KEY=your_api_key_from_ethiotelecom
ETHIO_TELECOM_API_URL=https://api.ethiotelecom.et/sms/send
ETHIO_TELECOM_SENDER_ID=AFOSHA
ETHIO_TELECOM_USERNAME=your_username
ETHIO_TELECOM_PASSWORD=your_password
```

**Important Notes:**
- Replace `your_api_key_from_ethiotelecom` with your actual API key
- Replace `your_username` and `your_password` with actual credentials
- The API URL might be different - use the URL provided by Ethio Telecom
- Sender ID must be registered with Ethio Telecom first

### Step 2: Update System Settings

1. Login as **Admin**
2. Go to **Settings** page
3. Find **SMS_ENABLED** setting
4. Change value from `false` to `true`
5. Click **Save**

### Step 3: Restart Backend Server

```cmd
cd backend
npm start
```

Or if using PM2:
```cmd
pm2 restart afosha-backend
```

### Step 4: Test SMS Sending

Try sending a test SMS from the system:
- Create a test notification
- Or trigger a payment reminder
- Check the SMS logs in the database

## Phone Number Format

The system automatically formats phone numbers for Ethio Telecom:

**Input formats accepted:**
- `0911234567` → Converted to `251911234567`
- `+251911234567` → Converted to `251911234567`
- `251911234567` → Used as-is

**Important**: All Ethiopian numbers are automatically prefixed with `251` (country code).

## SMS API Request Format

The system sends requests to Ethio Telecom in this format:

```json
{
  "username": "your_username",
  "password": "your_password",
  "to": "251911234567",
  "message": "Your message here",
  "sender": "AFOSHA"
}
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer your_api_key
```

## SMS Types Sent by System

### 1. OTP Verification
```
Your AMS verification code is: 123456. Valid for 10 minutes.
```

### 2. Payment Reminder (English)
```
Reminder: Your weekly contribution of Birr 50 is unpaid. Please pay before [date].
```

### 3. Payment Reminder (Oromiffa)
```
Yaadachiisa: Gumaata tiyya Birr 50 kaffalamuu qaba. Guyyaa [date] dura kaffali.
```

### 4. Meeting Reminder (English)
```
Reminder: A meeting is scheduled on [date]. Your attendance is required.
```

### 5. Meeting Reminder (Oromiffa)
```
Yaadachiisa: Walgahiin guyyaa [date] qophaa'eera. Hirmaachuu siif barbaachisa.
```

### 6. Payment Confirmation
```
Payment received: Birr 50 for Week 28. Thank you! Receipt: RCP-20260710-001
```

## Monitoring SMS Delivery

### Check SMS Logs

The system logs all SMS attempts in the `SmsLog` table:

```sql
SELECT * FROM "SmsLog" ORDER BY "createdAt" DESC LIMIT 10;
```

**Log Fields:**
- `phone`: Recipient phone number
- `message`: SMS text
- `status`: `sent`, `failed`, or `logged`
- `provider`: `ethiotelecom`, `africastalking`, `twilio`, or `console`
- `error`: Error message if failed
- `createdAt`: Timestamp

### Via Admin Panel

1. Go to **Reports** → **SMS Logs** (if implemented)
2. View all sent/failed SMS messages
3. Filter by date, status, or member

## Troubleshooting

### SMS Not Sending

**Check 1: Credentials**
```
Error: "Authentication failed"
Solution: Verify API key, username, and password are correct
```

**Check 2: API URL**
```
Error: "Connection timeout" or "404 Not Found"
Solution: Verify the API URL is correct (check Ethio Telecom documentation)
```

**Check 3: Sender ID**
```
Error: "Invalid sender ID"
Solution: Ensure sender ID is registered with Ethio Telecom
```

**Check 4: Phone Number Format**
```
Error: "Invalid recipient"
Solution: Check phone number format (should be 251XXXXXXXXX)
```

**Check 5: SMS Enabled**
```
SMS not being sent at all
Solution: Check SMS_ENABLED=true in system settings
```

### View Detailed Logs

Check backend console:
```cmd
# Backend logs will show:
[Ethio Telecom] Sending SMS to 0911234567
[Ethio Telecom] SMS sent successfully to 0911234567
```

Or if failed:
```cmd
[SMS ERROR to 0911234567]: Ethio Telecom API error: {"error":"Invalid credentials"}
```

## Cost Considerations

### SMS Pricing
- Check with Ethio Telecom for current pricing
- Usually charged per SMS
- Bulk discounts may be available

### Estimating Monthly Costs

**Example calculation:**
- 50 members
- 4 weeks/month
- 2 reminders per week per member
- = 50 × 4 × 2 = 400 SMS/month

If SMS costs 0.50 Birr each:
- Monthly cost = 400 × 0.50 = 200 Birr

### Cost Optimization Tips

1. **Reduce Frequency**: Send fewer reminders
2. **Target Only Unpaid**: Only send to members who haven't paid
3. **Batch Messages**: Combine multiple notifications into one SMS
4. **Use Push Notifications**: For mobile app users (free)

## Security Best Practices

### 1. Protect Credentials

**Never commit to Git:**
```gitignore
# Already in .gitignore
.env
.env.local
.env.production
```

**Use environment variables:**
- Store credentials in `.env` file only
- Never hardcode in source code

### 2. Restrict Access

- Only admin users can enable/disable SMS
- API credentials stored server-side only
- Not exposed to client/browser

### 3. Rate Limiting

The system includes automatic rate limiting:
- Prevents SMS spam
- Protects against API abuse
- Reduces costs

## Alternative Providers

If Ethio Telecom is unavailable, the system will automatically fall back to:

1. **Africa's Talking** (if configured)
2. **Twilio** (if configured)
3. **Console logging** (development only)

To use alternatives, configure their credentials in `.env`:

```env
# Africa's Talking
AT_API_KEY=your_at_key
AT_USERNAME=your_at_username
AT_SENDER_ID=AFOSHA

# OR Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing Without Real SMS

For development/testing without spending money:

### Option 1: Console Logging (Default)
```env
# Don't configure any SMS provider
# SMS will be logged to console only
```

Backend will show:
```
[SMS to 0911234567]: Your message here
```

### Option 2: SMS Log Database
All SMS attempts are saved to database regardless of send status:
```sql
SELECT * FROM "SmsLog" WHERE status = 'logged';
```

## Production Checklist

Before going live:

- [ ] Obtained Ethio Telecom SMS API credentials
- [ ] Registered Sender ID with Ethio Telecom
- [ ] Added credentials to `.env` file
- [ ] Set `SMS_ENABLED=true` in system settings
- [ ] Tested SMS sending with test phone number
- [ ] Verified SMS logs are being recorded
- [ ] Confirmed SMS delivery to members
- [ ] Set up SMS credit monitoring/alerts with Ethio Telecom
- [ ] Documented SMS costs and budget
- [ ] Trained admins on SMS management

## Support

### Ethio Telecom Support
- Customer Service: 994
- Business Support: Visit nearest Ethio Telecom office
- Website: www.ethiotelecom.et

### System Support
- Check SMS logs in database
- Review backend console logs
- Contact system administrator

## FAQs

**Q: How long does it take to get Ethio Telecom API access?**
A: Usually 3-5 business days after application. May vary.

**Q: Can I use any name as Sender ID?**
A: No, Sender ID must be registered and approved by Ethio Telecom first.

**Q: What if SMS fails to send?**
A: The system logs the error. You can retry manually or check with Ethio Telecom support.

**Q: Can I send to international numbers?**
A: Depends on your Ethio Telecom API plan. Usually domestic only by default.

**Q: How do I know if SMS was delivered?**
A: Check SMS logs status. `sent` means accepted by Ethio Telecom. Delivery reports may need additional configuration.

**Q: Can I disable SMS temporarily?**
A: Yes, set `SMS_ENABLED=false` in system settings.

**Q: What happens if I run out of SMS credit?**
A: SMS will fail with error logged. System continues working, just without SMS notifications.

---

**Need Help?** Contact Ethio Telecom business support or your system administrator.
