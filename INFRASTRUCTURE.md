# SonicBoost ProLite Infrastructure

## Domain Structure

### Production Subdomains
```
one-clickmaster.com (main domain)
├── sonicboost.one-clickmaster.com       → Backend API (App Runner)
└── sonicboost-app.one-clickmaster.com   → Frontend Pages (CloudFront + S3)
```

### Backend API
- **URL**: `https://sonicboost.one-clickmaster.com`
- **Platform**: AWS App Runner
- **Repository**: Connected to GitHub `manngobeh2006/sonicboost-ProLite/backend`
- **Purpose**: Handles all API requests (payments, subscriptions, user management)

### Frontend Pages
- **URL**: `https://sonicboost-app.one-clickmaster.com`
- **Infrastructure**: 
  - S3 Bucket: `sonicboost-frontend`
  - CloudFront Distribution: `E3143GKCTCLL3M`
  - CloudFront Domain: `d1mk7ln3cmh0pw.cloudfront.net`
- **Purpose**: Hosts SonicBoost-specific pages:
  - `/payment-success` - Post-checkout success page with deep link
  - `/reset-password` - Password reset page for email links
- **Deployment**: Use `/Users/KingNobze/AWS_PROJECT_2025/oneclick-master/deploy-sonicboost-frontend.sh`

## Environment Variables

### Backend (Render)
Update these in your Render dashboard:

```bash
APP_URL=https://sonicboost-app.one-clickmaster.com
```

This ensures Stripe redirects to the correct success/cancel URLs after checkout.

### Mobile App (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://ceqcxgquubemnsueqsrv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-key>
EXPO_PUBLIC_VIBECODE_BACKEND_URL=https://sonicboost.one-clickmaster.com/api
```

## DNS Configuration (Route 53)

### sonicboost.one-clickmaster.com (Backend)
- **Type**: CNAME
- **Value**: `nsxcmbqyqb.us-east-1.awsapprunner.com`
- **Purpose**: Points to App Runner backend

### sonicboost-app.one-clickmaster.com (Frontend)
- **Type**: CNAME
- **Value**: `d1mk7ln3cmh0pw.cloudfront.net`
- **Purpose**: Points to CloudFront distribution

## SSL/TLS Certificates

### ACM Certificate (us-east-1)
- **ARN**: `arn:aws:acm:us-east-1:457859284407:certificate/4d6ec9cd-c53d-4689-bbfe-0f8ae54b8d6c`
- **Covers**: `*.one-clickmaster.com` (wildcard)
- **Used by**: CloudFront distribution

## Deployment Guide

### 1. Deploy Frontend Pages
```bash
cd /Users/KingNobze/AWS_PROJECT_2025/oneclick-master
npm run build  # in frontend directory
./deploy-sonicboost-frontend.sh
```

This will:
- Upload built files to S3
- Invalidate CloudFront cache
- Make new pages immediately available

### 2. Deploy Backend API
Backend auto-deploys via App Runner when you push to GitHub:
```bash
cd /Users/KingNobze/AWS_PROJECT_2025/sonicboost-ProLite
git push origin main
```

App Runner will:
- Build the Docker container
- Deploy to production
- Update the running service

### 3. Update Mobile App
```bash
cd /Users/KingNobze/AWS_PROJECT_2025/sonicboost-ProLite
git push origin main
npx expo start  # For development testing
```

For production:
- Build with EAS: `eas build --platform ios`
- Submit to App Store: `eas submit --platform ios`

## Testing Checklist

### Password Reset Flow
1. In mobile app, tap "Forgot Password"
2. Enter email and submit
3. Check email for reset link
4. Click link → Opens `https://sonicboost-app.one-clickmaster.com/reset-password`
5. Enter new password
6. Redirects back to app (or shows success message)

### Payment Flow
1. In mobile app, tap "Subscribe" or "One-Time Payment"
2. Opens Stripe Checkout in browser
3. Complete payment
4. Redirects to `https://sonicboost-app.one-clickmaster.com/payment-success`
5. Auto-opens app via deep link `sonicboost-prolite://payment-success`
6. App navigates to Home screen

### Portal Management
1. In mobile app Profile screen, tap "Manage Subscription"
2. Opens Stripe Customer Portal
3. User can update payment method, cancel subscription, etc.
4. Changes reflect immediately in backend

## Architecture Benefits

### Clean Separation
- ✅ OneClickMaster project completely untouched
- ✅ SonicBoost has dedicated frontend infrastructure
- ✅ Backend and frontend are properly separated

### Security
- ✅ S3 bucket is private (no public access)
- ✅ CloudFront OAC (Origin Access Control) for secure S3 access
- ✅ HTTPS everywhere via ACM certificates
- ✅ Modern security practices

### Scalability
- ✅ CloudFront provides global CDN
- ✅ S3 handles unlimited traffic
- ✅ App Runner auto-scales backend
- ✅ Easy to add more pages in the future

### Cost Optimization
- ✅ S3 + CloudFront very affordable for static pages
- ✅ App Runner only charges for actual usage
- ✅ No unnecessary resources

## Troubleshooting

### Password Reset Link Not Working
1. Check DNS propagation: `dig sonicboost-app.one-clickmaster.com`
2. Wait for CloudFront deployment (5-10 minutes)
3. Verify mobile app has correct URL in `authStore.ts`

### Payment Success Not Redirecting
1. Check `APP_URL` in Render environment variables
2. Verify deep link handler in mobile `App.tsx`
3. Test deep link: `xcrun simctl openurl booted sonicboost-prolite://payment-success`

### CloudFront 403 Errors
1. Check S3 bucket policy allows CloudFront OAC
2. Verify distribution status is "Deployed"
3. Try cache invalidation: `aws cloudfront create-invalidation --distribution-id E3143GKCTCLL3M --paths "/*"`

## Monitoring

### CloudFront
- Logs: CloudWatch Logs (if enabled)
- Metrics: CloudWatch → CloudFront

### App Runner
- Logs: CloudWatch Logs (auto-enabled)
- Metrics: App Runner console

### S3
- CloudTrail for access logs
- S3 metrics in CloudWatch

## Next Steps

1. ✅ Monitor CloudFront distribution deployment (5-10 minutes)
2. ✅ Test password reset flow end-to-end
3. ✅ Update Render `APP_URL` environment variable
4. ✅ Test payment flow with real Stripe checkout
5. ✅ Verify deep linking works on physical device
6. ⏳ Beta testing with real users
7. ⏳ Production release to App Store

---

**Last Updated**: 2025-11-02
**Maintainer**: Emmanuel Ngobeh (manngobeh2006@gmail.com)
