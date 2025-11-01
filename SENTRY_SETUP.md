# Sentry Setup Guide

## What is Sentry?
Sentry provides real-time crash reporting and performance monitoring for production apps.

## Features Added
✅ **Crash Reporting** - Automatically catch and report app crashes  
✅ **Error Boundary** - Graceful error recovery with user-friendly UI  
✅ **Retry Logic** - Auto-retry failed network requests (3x with exponential backoff)  
✅ **Structured Logging** - Breadcrumbs for debugging production issues  
✅ **Performance Tracking** - Monitor slow API calls and operations  

---

## Setup Instructions

### 1. Create Sentry Account (Free)
1. Go to https://sentry.io and sign up
2. Create a new project
3. Select **React Native** as platform
4. Copy your **DSN** (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 2. Add DSN to Environment Variables
Add to your `.env` file:
```bash
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 3. Test in Development
```bash
npx expo start --clear
```

**Note:** Sentry is disabled in development mode (`__DEV__ = true`). You'll only see console logs.

### 4. Test in Production Build
To test Sentry in a production build:

**iOS:**
```bash
npx expo run:ios --configuration Release
```

**Android:**
```bash
npx expo run:android --variant release
```

---

## How It Works

### Error Boundary
Wraps your entire app - catches React component errors:
```typescript
// Automatically applied in App.tsx
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

### Automatic Retry
API calls automatically retry on network failures:
```typescript
// Already integrated in src/api/backend.ts
// Retries 3 times with exponential backoff
apiClient.createCheckoutSession(priceId)
```

### Manual Error Logging
Log errors manually when needed:
```typescript
import { logError } from '@/utils/logger';

try {
  // risky operation
} catch (error) {
  logError('Operation failed', error, { userId: '123' });
}
```

### Track Operations
Measure operation performance:
```typescript
import { measureOperation } from '@/utils/logger';

const result = await measureOperation(
  'Process Audio',
  async () => {
    return await processAudio(file);
  },
  { fileSize: file.size }
);
```

---

## What Gets Reported to Sentry?

### ✅ Reported:
- Unhandled JavaScript errors
- React component crashes
- Failed API calls after retries
- Network timeouts
- Manually logged errors

### ❌ NOT Reported:
- Development errors (`__DEV__ = true`)
- Expected validation errors (4xx)
- Errors caught and handled gracefully

---

## Viewing Errors in Sentry

1. **Dashboard**: https://sentry.io/organizations/[your-org]/issues/
2. **Each error shows:**
   - Stack trace
   - User context (if logged in)
   - Breadcrumbs (logs leading to error)
   - Device info
   - App version

---

## Best Practices

### Set User Context on Login
```typescript
import { setUserContext, clearUserContext } from '@/utils/sentry';

// After login
setUserContext(user.id, user.email);

// On logout
clearUserContext();
```

### Add Breadcrumbs for Important Actions
```typescript
import { logBreadcrumb } from '@/utils/sentry';

logBreadcrumb('User started audio processing', 'user_action', {
  filename: 'track.mp3',
  genre: 'electronic'
});
```

---

## Cost & Limits

**Sentry Free Tier:**
- 5,000 errors/month
- 10,000 performance transactions/month
- 30-day retention

Perfect for early-stage apps!

---

## Troubleshooting

### "Sentry not capturing errors"
- Check that `EXPO_PUBLIC_SENTRY_DSN` is set
- Ensure you're testing in production mode (not `__DEV__`)
- Look in Sentry dashboard (errors may take 1-2 minutes to appear)

### "Too many errors reported"
Adjust sampling rate in `src/utils/sentry.ts`:
```typescript
tracesSampleRate: 0.5, // 50% of transactions
```

---

## Files Modified

- `src/components/ErrorBoundary.tsx` - Error UI
- `src/utils/sentry.ts` - Sentry initialization
- `src/utils/retry.ts` - Network retry logic
- `src/utils/logger.ts` - Structured logging
- `src/api/backend.ts` - Retry integration
- `App.tsx` - ErrorBoundary wrapper
- `index.ts` - Sentry initialization

---

## Next Steps

1. Create Sentry account
2. Add DSN to `.env`
3. Test error reporting in production build
4. Monitor dashboard before launch
5. Review errors weekly after launch
