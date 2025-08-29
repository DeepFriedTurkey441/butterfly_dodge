# 🔒 Butterfly Dodge Security Documentation

## Security Improvements Implemented

This document outlines all security improvements made to the Butterfly Dodge server to protect against common web vulnerabilities and attacks.

### ✅ Security Features Implemented

#### 1. **Rate Limiting** 🚦
- **General Rate Limit**: 100 requests per 15 minutes per IP
- **Leaderboard Rate Limit**: 10 submissions per minute per IP
- **Protection Against**: DoS attacks, spam submissions, API abuse

#### 2. **Input Validation & Sanitization** 🛡️
- **Name Validation**: Required, non-empty string, max 40 characters
- **Level Validation**: Integer between 1 and 1000
- **Character Sanitization**: Removes potentially harmful characters `<>"'`
- **Protection Against**: Injection attacks, data corruption, XSS

#### 3. **CORS Security** 🌐
- **Restricted Origins**: Only allows requests from configured domains
- **Environment Variable**: `ALLOWED_ORIGIN` for easy configuration
- **Default**: `http://localhost:8080` (change for production)
- **Protection Against**: Cross-site request forgery, unauthorized API access

#### 4. **Security Headers** 🛡️
- **Helmet.js Integration**: Comprehensive security headers
- **Content Security Policy**: Prevents code injection
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Protection Against**: XSS, clickjacking, code injection

#### 5. **File System Security** 📁
- **File Locking**: Prevents concurrent write corruption
- **Path Validation**: Secure file path handling
- **Error Handling**: Graceful file operation failures
- **Protection Against**: Race conditions, path traversal, data corruption

#### 6. **Request Security** 📡
- **Body Size Limits**: 10MB maximum request size
- **JSON Strict Parsing**: Only accepts valid JSON objects/arrays
- **404 Handling**: Proper not-found responses
- **Protection Against**: Memory exhaustion, malformed requests

#### 7. **Enhanced Error Handling** ⚠️
- **Generic Error Messages**: No sensitive information exposure
- **Server-side Logging**: Detailed logs for debugging
- **Graceful Shutdown**: Proper process termination
- **Protection Against**: Information disclosure, unexpected crashes

#### 8. **Additional Security Features** 🔧
- **Health Check Endpoint**: `/health` for monitoring
- **Response Limiting**: Leaderboard limited to top 100 entries
- **Timestamp Tracking**: Last updated tracking
- **Environment Configuration**: Secure configuration management

## 🚀 Running the Secure Server

### Basic Usage
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

### Security Commands
```bash
# Run security audit
npm run security-audit

# Fix security vulnerabilities
npm run security-fix

# Test server health
npm run test-server

# Create backup
npm run backup
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key configuration options:
- `PORT`: Server port (default: 3000)
- `ALLOWED_ORIGIN`: Allowed CORS origin (default: http://localhost:8080)
- `MAX_LEVEL`: Maximum allowed level (default: 1000)
- `MAX_NAME_LENGTH`: Maximum name length (default: 40)

### Production Configuration

For production deployment:

1. **Set Proper CORS Origin**:
   ```
   ALLOWED_ORIGIN=https://yourdomain.com
   ```

2. **Use HTTPS**: Deploy behind a reverse proxy with SSL
3. **Set Secure Environment**: Ensure `.env` file is not publicly accessible
4. **Monitor Logs**: Set up proper logging and monitoring

## 🔍 Security Testing

### Manual Testing

Test rate limiting:
```bash
# This should eventually be rate limited
for i in {1..15}; do curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"test","level":1}'; done
```

Test input validation:
```bash
# Invalid name (empty)
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"","level":5}'

# Invalid level (too high)
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"test","level":1001}'
```

### Security Headers Verification

Check security headers:
```bash
curl -I http://localhost:3000/health
```

## 📋 Security Checklist

- [x] Rate limiting implemented
- [x] Input validation and sanitization
- [x] CORS properly configured
- [x] Security headers added
- [x] File system security
- [x] Request size limiting
- [x] Error handling improved
- [x] Dependencies audited (0 vulnerabilities)
- [x] Environment configuration
- [x] Documentation updated

## 🚨 Security Monitoring

### What to Monitor

1. **High Rate Limit Hits**: Potential DoS attempts
2. **Invalid Input Attempts**: Potential injection attacks
3. **Unusual Request Patterns**: Automated attacks
4. **File System Errors**: Potential security issues
5. **Large Request Sizes**: Resource exhaustion attempts

### Log Analysis

The server logs important security events:
- Rate limit violations
- Invalid input attempts
- File system operations
- New high scores
- Server startup/shutdown

## 🔄 Regular Security Maintenance

### Weekly Tasks
- [ ] Run `npm audit` to check for new vulnerabilities
- [ ] Review server logs for suspicious activity
- [ ] Monitor rate limiting effectiveness

### Monthly Tasks
- [ ] Update dependencies with `npm update`
- [ ] Review and update CORS policies
- [ ] Backup leaderboard data

### Quarterly Tasks
- [ ] Security penetration testing
- [ ] Review and update security policies
- [ ] Update security documentation

## 🆘 Security Incident Response

If you suspect a security breach:

1. **Immediate Actions**:
   - Stop the server: `pkill -f "node server.js"`
   - Backup current data: `npm run backup`
   - Check logs for suspicious activity

2. **Investigation**:
   - Review server logs
   - Check leaderboard data integrity
   - Analyze request patterns

3. **Recovery**:
   - Update any compromised configurations
   - Restart server with clean environment
   - Monitor for continued suspicious activity

## 📞 Support

For security-related questions or to report vulnerabilities:
- Review this documentation
- Check GitHub Issues
- Contact the maintainer

---

*This security documentation was created as part of the Butterfly Dodge security audit and improvements.*
