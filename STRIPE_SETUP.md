# Stripe Pricing Setup Guide

## 🎯 New Pricing Structure

Your SonicBoost app now has this pricing:

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Preview audio, pay-per-download |
| **Pro** | $11.99/month | 50 enhancements/month |
| **Unlimited** | $29/month | Unlimited enhancements |
| **One-Time** | $4.99 | Single download (no subscription) |

## 📝 Steps to Update Stripe

### 1. Update Pro Tier Price

**Current:** $4.99/month  
**New:** $11.99/month

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Find your **Pro** product
3. Click on the existing price `price_1SLCDtRWPNzpeJiuh09ZNfrp`
4. Click **"⋮ More"** → **"Archive this price"** (don't delete, just archive)
5. Click **"Add another price"**
6. Set:
   - **Price:** $11.99 USD
   - **Billing period:** Monthly
   - **Usage type:** Licensed
7. Click **"Add price"**
8. Copy the new price ID (starts with `price_`)
9. Update in `src/screens/SubscriptionsScreen.tsx`:
   ```typescript
   const STRIPE_PRICE_ID_PRO = 'price_YOUR_NEW_PRICE_ID';
   ```

### 2. Create Unlimited Tier

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Fill in:
   - **Name:** SonicBoost Unlimited
   - **Description:** Unlimited audio enhancements per month
   - **Price:** $29.00 USD
   - **Billing period:** Monthly
   - **Usage type:** Licensed
4. Click **"Save product"**
5. Copy the price ID
6. Update in `src/screens/SubscriptionsScreen.tsx`:
   ```typescript
   const STRIPE_PRICE_ID_UNLIMITED = 'price_YOUR_UNLIMITED_PRICE_ID';
   ```

### 3. Keep One-Time Payment (No Changes)

✅ Your existing one-time $4.99 payment stays as is:
```typescript
const STRIPE_PRICE_ID_SINGLE = 'price_1SLC6tRWPNzpeJiuYVKtG87S';
```

## 🔧 Update Backend Environment Variables

Add to your Render environment variables:

```env
STRIPE_PRO_PRICE_ID=price_YOUR_NEW_PRO_PRICE_ID
STRIPE_UNLIMITED_PRICE_ID=price_YOUR_UNLIMITED_PRICE_ID
```

This is used in the webhook handler to determine which tier the user subscribed to.

## 🧪 Testing

### Test the Pricing Flow

1. **Free Tier Test:**
   - Sign up as new user
   - Process an audio file
   - Preview the result
   - Try to download → should prompt for payment

2. **Pro Tier Test:**
   - Subscribe to Pro ($11.99/month)
   - Process 50 files → should work
   - Try 51st file → should show limit reached

3. **Unlimited Tier Test:**
   - Subscribe to Unlimited ($29/month)
   - Process unlimited files → should always work

4. **One-Time Test:**
   - As free user, process a file
   - Pay $4.99 one-time
   - Download that specific file → should work
   - Try to download another file → should prompt for payment again

### Use Stripe Test Mode

Before going live:
1. Use test price IDs
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date, any CVC

## 📊 Analytics to Track

Monitor these metrics in Stripe:
- Conversion rate (free → paid)
- Most popular tier (Pro vs Unlimited)
- Churn rate by tier
- Average revenue per user (ARPU)

## 💡 Promotional Pricing Ideas

Once live, you can add:
- **50% off first month** (coupon code)
- **Annual plans** (10% discount)
- **Student discount** (30% off)
- **Referral credits** ($5 credit per referral)

## ⚠️ Important Notes

- Don't delete old prices, archive them (keeps history)
- Test in Stripe test mode first
- Update webhook to handle 3 tiers (free, pro, unlimited)
- Monitor usage patterns before adjusting limits
- Consider adding a "usage warning" at 80% of Pro limit

## 🚀 When Ready to Deploy

1. Update Stripe prices (create Unlimited, update Pro)
2. Update price IDs in `SubscriptionsScreen.tsx`
3. Update backend `usage.ts` (already done ✓)
4. Test in Stripe test mode
5. Update environment variables in Render
6. Deploy to production
7. Switch to Stripe live mode
8. Announce new pricing to existing users (grandfather old price if needed)
