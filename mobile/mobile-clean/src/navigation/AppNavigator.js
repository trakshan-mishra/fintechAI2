import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/ClerkAuthWrapper';
import LoginScreen from '../screens/LoginScreen';
import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import MarketsScreen from '../screens/MarketsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ScannerScreen from '../screens/ScannerScreen';
import AIQnAScreen from '../screens/AIQnAScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import TaxSummaryScreen from '../screens/TaxSummaryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen 
        name="DashboardHome" 
        component={DashboardScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TaxSummary" 
        component={TaxSummaryScreen}
        options={{ title: 'Tax Summary', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function MoreStack() {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen 
        name="SettingsHome" 
        component={SettingsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Invoices" 
        component={InvoicesScreen}
        options={{ title: 'Invoices' }}
      />
      <Stack.Screen 
        name="TaxSummaryMore" 
        component={TaxSummaryScreen}
        options={{ title: 'Tax Summary', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Transactions') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'Scanner') iconName = focused ? 'scan' : 'scan-outline';
          else if (route.name === 'Markets') iconName = focused ? 'trending-up' : 'trending-up-outline';
          else if (route.name === 'AI Q&A') iconName = focused ? 'sparkles' : 'sparkles-outline';
          else if (route.name === 'More') iconName = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen} 
      />
      <Tab.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'scan' : 'scan-outline'} 
              size={28} 
              color={focused ? colors.primary : colors.textSecondary} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Markets" 
        component={MarketsScreen} 
      />
      <Tab.Screen 
        name="AI Q&A" 
        component={AIQnAScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();
  if (loading) return null;
  if (!isAuthenticated) {
  return <LoginScreen />;
}

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background }
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
