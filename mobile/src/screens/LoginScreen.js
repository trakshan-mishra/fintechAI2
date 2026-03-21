import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { API_URL } from '../utils/config';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState('main'); // main, phone, email
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = 'https://crypto-tracker-172.preview.emergentagent.com/dashboard';
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success') {
        const url = new URL(result.url);
        const sessionId = url.hash.split('session_id=')[1];
        
        if (sessionId) {
          const response = await fetch(`${API_URL}/auth/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          });
          
          const data = await response.json();
          await login(data.session_token);
        }
      }
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async () => {
    if (!phone || !name) {
      Alert.alert('Error', 'Please enter your name and phone number');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/signup/phone`, {
        phone: formattedPhone,
        name
      });

      if (response.data.success) {
        setShowOtpInput(true);
        if (response.data.demo_otp) {
          setDemoOtp(response.data.demo_otp);
        }
        Alert.alert('OTP Sent', 'Please check your phone for the OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSendOtp = async () => {
    if (!email || !name) {
      Alert.alert('Error', 'Please enter your name and email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/signup/email`, {
        email,
        name
      });

      if (response.data.success) {
        setShowOtpInput(true);
        if (response.data.demo_otp) {
          setDemoOtp(response.data.demo_otp);
        }
        Alert.alert('OTP Sent', 'Please check your email for the OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const phoneOrEmail = authMethod === 'phone' 
        ? (phone.startsWith('+') ? phone : `+91${phone}`)
        : email;

      const response = await axios.post(`${API_URL}/auth/verify/otp`, {
        phone_or_email: phoneOrEmail,
        otp
      });

      if (response.data.success) {
        await login(response.data.session_token);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Not Supported', 'Biometric authentication is not available on this device');
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Not Enrolled', 'Please set up biometric authentication in your device settings');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access TradeTrack Pro',
        fallbackLabel: 'Use Passcode'
      });

      if (result.success) {
        Alert.alert('Info', 'Please sign in first to enable biometric login for future sessions');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderMainAuth = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.outlineButton, { borderColor: colors.border }]}
        onPress={() => setAuthMethod('phone')}
      >
        <Ionicons name="phone-portrait" size={20} color={colors.text} style={{ marginRight: 8 }} />
        <Text style={[styles.outlineButtonText, { color: colors.text }]}>Continue with Phone</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.outlineButton, { borderColor: colors.border }]}
        onPress={() => setAuthMethod('email')}
      >
        <Ionicons name="mail" size={20} color={colors.text} style={{ marginRight: 8 }} />
        <Text style={[styles.outlineButtonText, { color: colors.text }]}>Continue with Email</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.biometricButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleBiometricLogin}
      >
        <Ionicons name="finger-print" size={24} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.biometricButtonText, { color: colors.text }]}>Use Biometric</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhoneAuth = () => (
    <View style={styles.authForm}>
      <TouchableOpacity style={styles.backButton} onPress={() => { setAuthMethod('main'); setShowOtpInput(false); setDemoOtp(''); }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.formTitle, { color: colors.text }]}>Phone Sign Up</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
        Enter your details to receive OTP
      </Text>

      {!showOtpInput ? (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor={colors.textSecondary}
          />
          <View style={[styles.phoneInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.countryCode, { color: colors.text }]}>+91</Text>
            <TextInput
              style={[styles.phoneInput, { color: colors.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handlePhoneSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          {demoOtp && (
            <View style={[styles.demoOtpBanner, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <Ionicons name="information-circle" size={20} color={colors.success} />
              <Text style={[styles.demoOtpText, { color: colors.success }]}>
                Demo OTP: {demoOtp}
              </Text>
            </View>
          )}
          <TextInput
            style={[styles.input, styles.otpInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderEmailAuth = () => (
    <View style={styles.authForm}>
      <TouchableOpacity style={styles.backButton} onPress={() => { setAuthMethod('main'); setShowOtpInput(false); setDemoOtp(''); }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.formTitle, { color: colors.text }]}>Email Sign Up</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
        Enter your details to receive OTP
      </Text>

      {!showOtpInput ? (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Email Address"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleEmailSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          {demoOtp && (
            <View style={[styles.demoOtpBanner, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <Ionicons name="information-circle" size={20} color={colors.success} />
              <Text style={[styles.demoOtpText, { color: colors.success }]}>
                Demo OTP: {demoOtp}
              </Text>
            </View>
          )}
          <TextInput
            style={[styles.input, styles.otpInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>T</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>TradeTrack Pro</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your All-in-One Financial Command Center
            </Text>
          </View>

          {authMethod === 'main' && renderMainAuth()}
          {authMethod === 'phone' && renderPhoneAuth()}
          {authMethod === 'email' && renderEmailAuth()}

          <Text style={[styles.footer, { color: colors.textSecondary }]}>
            Made for Indian users with ❤️
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  outlineButton: {
    borderWidth: 1,
  },
  biometricButton: {
    borderWidth: 1,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  footer: {
    marginTop: 40,
    fontSize: 14,
  },
  authForm: {
    width: '100%',
    gap: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  demoOtpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  demoOtpText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
