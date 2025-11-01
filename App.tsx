import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { Audio } from "expo-av";

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

  useEffect(() => {
    // Configure audio mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
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
