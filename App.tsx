import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef } from "react";
import { Audio } from "expo-av";
import * as Linking from "expo-linking";

import ErrorBoundary from "./src/components/ErrorBoundary";

import { useAuthStore } from "./src/state/authStore";
import { RootStackParamList } from "./src/navigation/types";

// Screens
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import MasteringScreen from "./src/screens/MasteringScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SubscriptionsScreen from "./src/screens/SubscriptionsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Configure audio mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Handle deep links (payment success)
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      if (url.includes('payment-success')) {
        // Navigate to Home screen after payment
        if (navigationRef.current && isAuthenticated) {
          navigationRef.current.navigate('Home');
        }
      }
    };

    // Listen for deep link events
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="light" />
            {!isAuthenticated ? (
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
              </Stack.Navigator>
            ) : (
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  animation: "default",
                }}
              >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Mastering" component={MasteringScreen} />
                <Stack.Screen name="Results" component={ResultsScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
              </Stack.Navigator>
            )}
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
