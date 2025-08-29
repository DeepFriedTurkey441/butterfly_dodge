# 📧 Email Notification Setup Guide

Your Butterfly Dodge server is now configured to send email notifications to **eric.gates247@gmail.com** whenever someone plays the game!

## 🚀 Quick Setup

### Step 1: Create a Gmail App Password

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Click "Security"** in the left sidebar
3. **Enable 2-Step Verification** (if not already enabled)
4. **Click "App passwords"** (under 2-Step Verification)
5. **Select "Mail"** and **"Other (custom name)"**
6. **Enter "Butterfly Dodge"** as the app name
7. **Copy the generated 16-character password**

### Step 2: Create Your Environment File

```bash
# Create your .env file
cp .env.example .env
```

### Step 3: Configure Your .env File

Edit the `.env` file and add your Gmail credentials:

```env
# Email Notifications
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_TO=eric.gates247@gmail.com
EMAIL_FROM=noreply@butterflydodge.com

# Gmail SMTP Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
```

**Replace:**
- `your-gmail@gmail.com` with your actual Gmail address
- `your-16-character-app-password` with the app password from Step 1

### Step 4: Test the Setup

```bash
# Start the server
npm start

# Test with a score submission
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"TestPlayer","level":5}'
```

## 📨 What You'll Receive

### For Regular Gameplay:
**Subject**: 🦋 Someone played Butterfly Dodge!
- Player name
- Level reached
- Timestamp

### For New High Scores:
**Subject**: 🦋 New High Score in Butterfly Dodge! Level X
- Player name
- New record level
- Special celebration message

## ⚙️ Email Features

### 🚦 **Rate Limiting**
- Maximum 1 email per 30 seconds to prevent spam
- Protects against malicious flooding

### 🎯 **Smart Notifications**
- Emails for all score submissions
- Special highlighting for new records
- HTML formatted for easy reading

### 🔒 **Security**
- Uses secure Gmail SMTP
- App passwords (not your main password)
- Non-blocking email sending (doesn't slow down game)

## 🛠️ Troubleshooting

### "Email notifications disabled (missing credentials)"
- Check your `.env` file exists
- Verify `EMAIL_USER` and `EMAIL_PASS` are set
- Ensure no extra spaces in credentials

### "Email notification failed"
- Verify Gmail app password is correct
- Check 2-Step Verification is enabled
- Try regenerating the app password

### No emails received
- Check spam/junk folder
- Verify email address is correct
- Check server console for error messages

## 🎮 Testing Email Notifications

### Method 1: Direct Server Test
```bash
# Start server
npm start

# Submit a test score
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"Eric","level":10}'
```

### Method 2: Through Your Game
1. Play Butterfly Dodge normally
2. Submit a score through the game interface
3. Check your email within a few minutes

### Method 3: Multiple Submissions
```bash
# Test rate limiting
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"Player1","level":5}'

# Wait 30+ seconds, then:
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"Player2","level":15}'
```

## 📱 Alternative Email Providers

If you prefer not to use Gmail, you can configure other SMTP providers:

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

## 🎉 You're All Set!

Once configured, you'll receive beautiful HTML emails whenever someone plays your Butterfly Dodge game. The notifications include:

- 🦋 Player name and level achieved
- 🏆 Special celebration for new records
- ⏰ Timestamp of when they played
- 🎮 Professional game-themed styling

Enjoy staying connected with your players!

---

*Need help? Check the server console logs for detailed error messages.*
