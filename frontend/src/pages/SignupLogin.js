import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Phone, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SignupLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { colors } = useTheme();
  
  const [mode, setMode] = useState('signup');
  const [authMethod, setAuthMethod] = useState('phone');
  const [step, setStep] = useState(1);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState(null);

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const endpoint = authMethod === 'phone' ? '/auth/signup/phone' : '/auth/signup/email';
      const payload = authMethod === 'phone' 
        ? { phone: phoneNumber, name }
        : { email, name };
      
      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      
      if (response.data.demo_otp) {
        setDemoOtp(response.data.demo_otp);
        toast.success(`OTP sent! Demo OTP: ${response.data.demo_otp}`);
      } else {
        toast.success('OTP sent successfully!');
      }
      
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/verify/otp`, {
        phone_or_email: authMethod === 'phone' ? phoneNumber : email,
        otp
      });
      
      login(response.data.session_token, response.data.user);
      toast.success('Welcome to TradeTrack Pro!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />
      
      <Card className="w-full max-w-md glass-strong relative z-10" data-testid="auth-card">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs value={authMethod} onValueChange={setAuthMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="phone" data-testid="phone-tab">
                <Phone className="w-4 h-4 mr-2" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="email" data-testid="email-tab">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="google" data-testid="google-tab">
                Google
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-4">
              {step === 1 ? (
                <>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="phone-input-wrapper">
                      <PhoneInput
                        international
                        defaultCountry="IN"
                        value={phoneNumber}
                        onChange={setPhoneNumber}
                        className="phone-input-custom"
                        data-testid="phone-input"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      International format supported (e.g., +91 for India)
                    </p>
                  </div>
                  <Button 
                    onClick={handleSendOTP} 
                    disabled={!phoneNumber || !name || loading}
                    className="w-full"
                    data-testid="send-otp-button"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">OTP Sent!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Check your phone for the 6-digit code
                    </p>
                    {demoOtp && (
                      <p className="text-sm font-mono font-bold mt-2 text-primary">
                        Demo OTP: {demoOtp}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-widest"
                      data-testid="otp-input"
                    />
                  </div>
                  <Button 
                    onClick={handleVerifyOTP} 
                    disabled={otp.length !== 6 || loading}
                    className="w-full"
                    data-testid="verify-otp-button"
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="w-full"
                  >
                    Change Number
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              {step === 1 ? (
                <>
                  <div>
                    <Label htmlFor="email-name">Full Name</Label>
                    <Input
                      id="email-name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="email-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="email-input"
                    />
                  </div>
                  <Button 
                    onClick={handleSendOTP} 
                    disabled={!email || !name || loading}
                    className="w-full"
                    data-testid="send-email-otp-button"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">OTP Sent!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Check your email for the 6-digit code
                    </p>
                    {demoOtp && (
                      <p className="text-sm font-mono font-bold mt-2 text-primary">
                        Demo OTP: {demoOtp}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email-otp">Enter OTP</Label>
                    <Input
                      id="email-otp"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-widest"
                      data-testid="email-otp-input"
                    />
                  </div>
                  <Button 
                    onClick={handleVerifyOTP} 
                    disabled={otp.length !== 6 || loading}
                    className="w-full"
                    data-testid="verify-email-otp-button"
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="w-full"
                  >
                    Change Email
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="google" className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-6">
                  Sign in quickly with your Google account
                </p>
                <Button 
                  onClick={handleGoogleLogin}
                  size="lg"
                  className="w-full"
                  data-testid="google-login-button"
                >
                  Continue with Google
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupLogin;
