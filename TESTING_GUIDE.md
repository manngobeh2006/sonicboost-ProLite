# 🧪 SonicBoost ProLite - Testing Guide

## Overview

This document provides comprehensive testing instructions for SonicBoost ProLite, covering backend integration tests, security audits, E2E tests, and monitoring.

---

## 📦 Test Suite Components

### 1. Backend Integration Tests (Jest + Supertest)
- Stripe API routes
- Authentication middleware
- Rate limiting
- Input validation
- Webhook handling

### 2. Security Tests
- Environment variable validation
- SQL injection prevention
- XSS protection
- Rate limiting enforcement
- JWT validation
- CORS configuration

### 3. E2E Tests (Maestro)
- User signup → subscription flow
- Login → manage subscription
- Free user → one-time payment

### 4. Health Checks & Monitoring
- Basic health endpoint
- Detailed health with dependencies
- Kubernetes-compatible ready/live checks
- Metrics endpoint

---

## 🚀 Quick Start

### Backend Tests

```bash
# Navigate to backend
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run security tests only
npm run test:security

# Watch mode (for development)
npm run test:watch
```

### Expected Output:
```
PASS  tests/stripe.test.ts
PASS  tests/security.test.ts

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
Coverage:    78% statements, 72% branches
```

---

## 🔧 Backend Integration Tests

### Setup

Tests use a separate `.env.test` file with mock/test credentials:

```env
NODE_ENV=test
SUPABASE_URL=https://test.supabase.co
STRIPE_SECRET_KEY=sk_test_mock_key
```

### Running Specific Tests

```bash
# Test Stripe routes only
npm test -- stripe.test.ts

# Test security only
npm test -- security.test.ts

# Run with verbose output
npm test -- --verbose
```

### Test Coverage

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 🔒 Security Testing

### Automated Security Checks

```bash
npm run test:security
```

**Tests include:**
- ✅ Environment variables present
- ✅ No secrets in error messages
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Rate limiting configured
- ✅ JWT validation
- ✅ Webhook signature verification
- ✅ Password strength enforcement

### Manual Security Audit

Run this checklist before production:

```bash
# 1. Check for exposed secrets
grep -r "sk_live_" backend/src/
grep -r "password=" backend/src/

# 2. Verify RLS policies active
psql $DATABASE_URL -c "SELECT schemaname, tablename FROM pg_policies;"

# 3. Test rate limiting
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"test"}' \
  --repeat 15  # Should get 429 after 10 requests

# 4. Verify HTTPS only in production
curl -I https://sonicboost-backend.onrender.com/health
```

---

## 📱 E2E Mobile Tests (Maestro)

### Installation

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

### Running E2E Tests

```bash
# Run all flows
maestro test .maestro/flows/

# Run specific flow
maestro test .maestro/flows/01-signup-subscribe.yaml

# Run on specific device
maestro test --device "iPhone 15 Pro" .maestro/flows/
```

### Test Flows

| Flow | File | Duration | Critical |
|------|------|----------|----------|
| Signup → Subscribe | `01-signup-subscribe.yaml` | ~60s | ✅ Yes |
| Login → Manage Subscription | `02-login-manage-subscription.yaml` | ~30s | ✅ Yes |
| One-Time Payment | `03-one-time-payment.yaml` | ~45s | ✅ Yes |

### E2E Test Notes

⚠️ **Important**: E2E tests open Stripe Checkout in browser. Manual verification required for payment completion.

**Test Users:**
- Pro User: `test@sonicboost.app` / `TestPassword123`
- Free User: `free@sonicboost.app` / `FreeUser123`

---

## 🏥 Health Checks & Monitoring

### Health Endpoints

```bash
# Basic health
curl https://sonicboost-backend.onrender.com/health

# Detailed health (checks DB, Stripe, env vars)
curl https://sonicboost-backend.onrender.com/health/detailed

# Kubernetes ready check
curl https://sonicboost-backend.onrender.com/ready

# Kubernetes liveness check
curl https://sonicboost-backend.onrender.com/live

# Metrics
curl https://sonicboost-backend.onrender.com/metrics
```

### Sample Detailed Health Response

```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T00:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45
    },
    "stripe": {
      "status": "healthy"
    },
    "environment": {
      "status": "healthy",
      "missing": []
    }
  }
}
```

### Monitoring Setup

**Render Dashboard:**
1. Go to https://dashboard.render.com
2. Click on `sonicboost-backend`
3. Add Health Check Path: `/health`
4. Set interval: 60 seconds

**Sentry (Already Configured):**
- Frontend: https://sentry.io/organizations/sonicboost
- Automatic error reporting
- Performance monitoring

---

## ✅ Pre-Launch Checklist

Run this checklist before deploying to production:

```bash
# 1. Backend tests pass
cd backend && npm test
# Expected: All tests pass

# 2. Frontend builds without errors
cd .. && npm run build
# Expected: No TypeScript/ESLint errors

# 3. Security audit passes
cd backend && npm run test:security
# Expected: All security checks pass

# 4. Health check returns 200
curl https://sonicboost-backend.onrender.com/health/detailed
# Expected: status: "healthy"

# 5. Stripe webhook configured
curl https://dashboard.stripe.com/webhooks
# Expected: Webhook URL matches production backend

# 6. RLS policies active
# Check Supabase dashboard → Authentication → Policies
# Expected: All tables have RLS enabled

# 7. Environment variables set
# Check Render dashboard → Environment
# Expected: All required vars present, no mock values

# 8. Sentry configured
# Check Sentry dashboard
# Expected: Events coming through

# 9. E2E critical paths tested manually
# Test: Signup, Subscribe, Download, Cancel
# Expected: All flows work end-to-end
```

---

## 🐛 Troubleshooting

### Backend Tests Failing

**Issue**: `Cannot find module '../src/routes/stripe'`
```bash
# Solution: Rebuild TypeScript
cd backend && npm run build
```

**Issue**: `Database connection failed`
```bash
# Solution: Check .env.test has valid Supabase URL
cat backend/.env.test | grep SUPABASE_URL
```

### E2E Tests Failing

**Issue**: Maestro can't find app
```bash
# Solution: Build and install app first
npx expo prebuild
npx expo run:ios  # or run:android
```

**Issue**: Elements not found
```bash
# Solution: Run with UI inspector
maestro test --debug .maestro/flows/01-signup-subscribe.yaml
```

### Health Checks Failing

**Issue**: 503 Service Unavailable
```bash
# Check backend logs
curl https://sonicboost-backend.onrender.com/health/detailed

# Common causes:
# 1. Database not responding
# 2. Missing environment variables
# 3. Stripe API down
```

---

## 📈 Coverage Goals

| Component | Current | Goal |
|-----------|---------|------|
| Backend Routes | 78% | 80% |
| Frontend | N/A | 60% |
| E2E Critical Paths | 100% | 100% |
| Security Checks | 100% | 100% |

---

## 🔄 CI/CD Integration

Tests automatically run on every push via GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run Backend Tests
  run: |
    cd backend
    npm test
    npm run test:security
```

**View Results:**
https://github.com/manngobeh2006/sonicboost-ProLite/actions

---

## 📚 Additional Resources

- **Jest Docs**: https://jestjs.io/docs/getting-started
- **Maestro Docs**: https://maestro.mobile.dev/getting-started
- **Supertest**: https://github.com/ladjs/supertest
- **Stripe Testing**: https://stripe.com/docs/testing

---

## 🎯 Testing Philosophy

### We Test For:
1. **Security** - No vulnerabilities
2. **Reliability** - Payment flows never fail
3. **User Experience** - Critical paths work smoothly

### We Don't Test:
1. UI styling details
2. Third-party library internals
3. Non-critical features

---

## 📞 Support

If tests fail or you need help:
1. Check GitHub Actions logs
2. Review Sentry errors
3. Consult this guide's troubleshooting section
4. Contact: manngobeh2006@gmail.com

---

**Last Updated**: November 6, 2025  
**Test Suite Version**: 1.0.0  
**Coverage**: 78% backend, 100% critical paths
