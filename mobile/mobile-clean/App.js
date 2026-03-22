import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider } from "@clerk/clerk-expo";
import { ClerkAuthProvider } from "./src/contexts/ClerkAuthWrapper";

import { ThemeProvider } from "./src/contexts/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";

const clerkPubKey = "pk_test_ZmFuY3ktYnVubnktOTAuY2xlcmsuYWNjb3VudHMuZGV2JA"; // 👈 replace this

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <SafeAreaProvider>
        <ThemeProvider>
            <ClerkAuthProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
          </ClerkAuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}