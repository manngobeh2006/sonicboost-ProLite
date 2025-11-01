import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Initialize Sentry only in production
export const initSentry = () => {
  if (__DEV__) {
    console.log('📊 Sentry disabled in development');
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    enableInExpoDevelopment: false,
    debug: false,
    tracesSampleRate: 1.0, // Capture 100% of transactions in production
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', 'sonicboost-backend.onrender.com', /^\//],
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
      }),
    ],
    beforeSend(event) {
      // Filter out specific errors if needed
      if (event.exception) {
        const message = event.exception.values?.[0]?.value || '';
        
        // Don't report network errors in development
        if (__DEV__ && message.includes('Network request failed')) {
          return null;
        }
      }
      return event;
    },
  });

  // Set release version
  if (Constants.expoConfig?.version) {
    Sentry.setTag('app_version', Constants.expoConfig.version);
  }

  console.log('✅ Sentry initialized');
};

// Helper to manually log errors
export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('Error:', error);
  
  if (!__DEV__) {
    Sentry.captureException(error, {
      contexts: { custom: context },
    });
  }
};

// Helper to log breadcrumbs
export const logBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

// Set user context
export const setUserContext = (userId: string, email?: string) => {
  Sentry.setUser({
    id: userId,
    email,
  });
};

// Clear user context on logout
export const clearUserContext = () => {
  Sentry.setUser(null);
};
