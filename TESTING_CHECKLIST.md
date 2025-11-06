# SonicBoost ProLite - Payment Testing Checklist

## 🧪 Test Card Information
Use these Stripe test cards:

**Success:**
- Card: `4242 4242 4242 4242`
- Expiry: `12/25`
- CVC: `123`
- ZIP: `12345`

**Declined:**
- Card: `4000 0000 0000 0002`

---

## ✅ Test Flow 1: One-Time Payment ($4.99)

### Steps:
1. Open app on your phone
2. Go to Home → Upload audio file
3. Process the audio (wait for completion)
4. Click **"Download"** button
5. Should see upgrade modal
6. Click **"Pay Once - $4.99"**
7. Stripe checkout should open in browser
8. Complete payment with test card
9. Should redirect back to app
10. Download should now work

### Expected Results:
- ✅ Checkout opens successfully
- ✅ Payment completes
- ✅ User redirected back
- ✅ Download button works
- ✅ Database shows order as "paid"

---

## ✅ Test Flow 2: Pro Subscription ($11.99/mo)

### Steps:
1. Go to **Subscriptions** screen
2. Select **Pro Plan** ($11.99/month)
3. Click **"Subscribe"**
4. Stripe checkout should open
5. Complete payment with test card
6. Should redirect back to app
7. Profile should show "PRO" badge
8. Try downloading an enhanced file
9. Should work without payment

### Expected Results:
- ✅ Checkout opens successfully
- ✅ Payment completes
- ✅ User redirected back
- ✅ Profile shows "PRO" status
- ✅ Purple badge appears
- ✅ Downloads work freely
- ✅ Reference track upload unlocked

---

## ✅ Test Flow 3: Unlimited Subscription ($29/mo)

### Steps:
1. Go to **Subscriptions** screen
2. Select **Unlimited Plan** ($29/month)
3. Click **"Subscribe"**
4. Stripe checkout should open
5. Complete payment with test card
6. Should redirect back to app
7. Profile should show "UNLIMITED" badge
8. Try downloading an enhanced file
9. Should work without payment
10. AI Revision button should appear

### Expected Results:
- ✅ Checkout opens successfully
- ✅ Payment completes
- ✅ User redirected back
- ✅ Profile shows "UNLIMITED" status
- ✅ Blue badge appears
- ✅ Downloads work freely
- ✅ Reference track upload unlocked
- ✅ AI Revision feature visible

---

## ✅ Test Flow 4: Manage Subscription (Portal)

### Steps:
1. After subscribing (Pro or Unlimited)
2. Go to **Profile** screen
3. Click **"Manage Subscription"**
4. Stripe Customer Portal should open
5. Should see subscription details
6. Test canceling subscription
7. Test updating payment method

### Expected Results:
- ✅ Portal opens successfully
- ✅ Shows current plan
- ✅ Shows billing history
- ✅ Can cancel subscription
- ✅ Can update payment method
- ✅ Can switch between Pro/Unlimited

---

## ✅ Test Flow 5: Plan Switching

### Steps:
1. Subscribe to **Pro** first
2. Go to **Manage Subscription**
3. In Stripe portal, click **"Update plan"**
4. Switch to **Unlimited**
5. Confirm upgrade
6. Go back to app
7. Reload profile
8. Should show "UNLIMITED" status

### Expected Results:
- ✅ Can upgrade Pro → Unlimited
- ✅ Prorated immediately
- ✅ App reflects new tier
- ✅ AI Revision now available

---

## 🐛 Common Issues to Watch For

### Issue 1: Checkout doesn't open
- Check backend logs on Render
- Verify Stripe price IDs are correct
- Check network connectivity

### Issue 2: Payment succeeds but app doesn't update
- Wait 10 seconds (webhook delay)
- Pull down to refresh profile
- Check Supabase users table

### Issue 3: Portal shows "No subscription"
- Verify subscription_id in database
- Check Stripe webhook fired
- Ensure backend received webhook

### Issue 4: Downloads still blocked after payment
- Check one_time_orders table status
- Verify webhook updated order status
- Check backend logs

---

## 🎯 Testing Priority

**Test in this order:**

1. **Pro Subscription** (most common) ⭐️⭐️⭐️
2. **Manage Subscription Portal** ⭐️⭐️⭐️
3. **One-Time Payment** ⭐️⭐️
4. **Unlimited Subscription** ⭐️⭐️
5. **Plan Switching** ⭐️

---

## 📊 What to Check in Database After Each Test

### After One-Time Payment:
```sql
SELECT * FROM one_time_orders 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC LIMIT 1;
```
Status should be: `paid`

### After Subscription:
```sql
SELECT 
  id, email, subscription_tier, 
  subscription_status, subscription_id
FROM users 
WHERE id = 'YOUR_USER_ID';
```
- subscription_tier: `pro` or `unlimited`
- subscription_status: `active`
- subscription_id: starts with `sub_`

---

## ✅ Success Criteria

All tests pass when:
- ✅ All checkouts open successfully
- ✅ All payments process
- ✅ App updates subscription status
- ✅ Features unlock correctly
- ✅ Portal works for all users
- ✅ No console errors
- ✅ Database reflects all changes

---

**Ready to launch when all boxes are checked!** 🚀
