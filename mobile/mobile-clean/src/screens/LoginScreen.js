import React, { useState } from 'react';
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSSO } from '@clerk/clerk-expo';
import { useAuth } from '../contexts/ClerkAuthWrapper';
export default function LoginScreen() {
  const { colors } = useTheme();
  const { startSSOFlow } = useSSO({ strategy: "oauth_google" });

  const [screen, setScreen] = useState('main');
  const [loading, setLoading] = useState(false);

  // 🔥 GOOGLE LOGIN
  const handleGoogleLogin = async () => {
  try {
    setLoading(true);

    const redirectUrl = Linking.createURL("oauth-native-callback");

    const { createdSessionId, setActive } = await startSSOFlow({
      strategy: "oauth_google",
      redirectUrl,
    });

    if (createdSessionId) {
      await setActive({ session: createdSessionId });
    }
  } catch (err) {
    console.log("Login error:", err);
    Alert.alert("Error", "Google login failed");
  } finally {
    setLoading(false);
  }
};

  const reset = () => {
    setScreen('main');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>T</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>TradeTrack Pro</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your All-in-One Financial Command Center
          </Text>
        </View>

        {/* ── MAIN SCREEN ── */}
        {screen === 'main' && (
          <View style={styles.buttonContainer}>

            {/* 🔥 GOOGLE LOGIN */}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color="#fff" style={styles.btnIcon} />
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Continue with Google</Text>
              }
            </TouchableOpacity>

            {/* OPTIONAL: keep old buttons (UI only) */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.outlineButton, { borderColor: colors.border }]}
              onPress={() => Alert.alert("Disabled", "Use Google login")}
            >
              <Ionicons name="phone-portrait" size={20} color={colors.text} style={styles.btnIcon} />
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>
                Continue with Phone
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.outlineButton, { borderColor: colors.border }]}
              onPress={() => Alert.alert("Disabled", "Use Google login")}
            >
              <Ionicons name="mail" size={20} color={colors.text} style={styles.btnIcon} />
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>
                Continue with Email
              </Text>
            </TouchableOpacity>

            <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Secure login with Google. No OTP or password needed.
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          Made for Indian users with ❤️
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center' },
  buttonContainer: { width: '100%', gap: 12 },
  button: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { elevation: 3 },
  outlineButton: { borderWidth: 1 },
  btnIcon: { marginRight: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineButtonText: { fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  infoBox: { flexDirection: 'row', padding: 14, borderRadius: 10, borderWidth: 1, gap: 10 },
  infoText: { flex: 1, fontSize: 13 },
  footer: { textAlign: 'center', marginTop: 40, fontSize: 13 },
});