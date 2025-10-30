# SonicBoost Backend - Render Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Database Setup (Supabase)
Run the SQL schema in your Supabase SQL Editor:
```bash
# Navigate to Supabase Dashboard > SQL Editor
# Copy and paste contents of: backend/supabase_schema.sql
```

### 2. Stripe Setup
1. Create products and prices in Stripe Dashboard
2. Copy the Price IDs (e.g., `price_xxx`)
3. Set up webhook endpoint: `https://your-app.onrender.com/api/stripe/webhook`
4. Copy the webhook secret (starts with `whsec_`)

### 3. Install Dependencies Locally
```bash
cd backend
npm install
```

## 🚀 Render Deployment

### Step 1: Create Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `sonicboost-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or Starter

### Step 2: Environment Variables
Add these in the "Environment" tab:

#### Required Variables
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx (or sk_test_xxxxx for testing)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_UNLIMITED_PRICE_ID=price_xxxxx

# App Configuration
APP_URL=myapp://
CORS_ORIGINS=https://yourdomain.com,exp://192.168.1.x
NODE_ENV=production
PORT=3000
```

### Step 3: Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Note your service URL: `https://your-app.onrender.com`

### Step 4: Update Stripe Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.onrender.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### Step 5: Test Health Check
```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "SonicBoost Payment API is running"
}
```

## 🔒 Security Features Implemented

✅ **Environment validation** - Server won't start without required vars  
✅ **CORS protection** - Only allowed origins can access API  
✅ **Rate limiting** - 10 checkout requests per 15 minutes per IP  
✅ **Input validation** - Zod schemas validate all inputs  
✅ **Webhook idempotency** - Duplicate webhooks are ignored  
✅ **Error sanitization** - Internal errors hidden in production  
✅ **Supabase Auth** - Tokens verified server-side  

## 🧪 Testing Locally

1. Create `.env` file:
```bash
cp .env.example .env
# Fill in your credentials
```

2. Run development server:
```bash
npm run dev
```

3. Test endpoints:
```bash
# Health check
curl http://localhost:3000/health

# Test auth (requires valid Supabase token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/subscription/status
```

## 📱 Mobile App Configuration

Update your mobile app to point to Render URL:

```typescript
// src/api/backend.ts
const API_URL = __DEV__ 
  ? 'http://localhost:3000'
  : 'https://your-app.onrender.com';
```

## 🐛 Troubleshooting

### Server won't start
- Check logs in Render Dashboard
- Verify all required environment variables are set
- Ensure Supabase credentials are correct

### Webhook not working
- Check Stripe webhook secret matches environment variable
- Verify webhook URL in Stripe Dashboard is correct
- Check Render logs for webhook errors

### CORS errors
- Add your frontend domain to `CORS_ORIGINS`
- Separate multiple origins with commas
- Include protocol (http:// or https://)

## 📊 Monitoring

- **Logs**: Render Dashboard → Your Service → Logs
- **Metrics**: Render Dashboard → Your Service → Metrics
- **Stripe Events**: Stripe Dashboard → Developers → Events

## 🔄 Updates

To deploy updates:
1. Push changes to GitHub
2. Render automatically redeploys
3. Monitor logs for any issues

## ⚠️ Important Notes

- Keep `SUPABASE_SERVICE_KEY` secret - never commit to git
- Use Stripe test keys for development
- Switch to live keys only in production
- Render free tier sleeps after inactivity (30s cold start)
- Consider Starter tier for production ($7/month, no sleep)
