import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import OTPInput from '../components/OTPInput';
import AuthButton from '../components/AuthButton';
import { authApi, registerCompany } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { authColors } from '../theme/authColors';
import { isCompanyPendingVerification } from '../utils/companyVerification';

export default function VerifyOTPScreen({ navigation, route }) {
  const { signIn, updateUser } = useAuth();
  const { email, name, password, inviteToken, companyName } = route.params || {};
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !name || !password) {
      navigation.replace('SignUp');
    }
  }, [email, name, password, navigation]);

  const handleVerify = async () => {
    setError('');
    const code = otp.trim();
    if (!code || code.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(email, code, name, password);
      await signIn(data.user, data.token);
      if (inviteToken) {
        navigation.reset({ index: 0, routes: [{ name: 'AcceptInvite', params: { inviteToken } }] });
        return;
      }
      if (companyName && data.token) {
        try {
          const companyData = await registerCompany(data.token, companyName.trim());
          if (companyData.user) {
            updateUser(companyData.user);
            await signIn(companyData.user, data.token);
          }
          navigation.reset({
            index: 0,
            routes: [
              {
                name: isCompanyPendingVerification(companyData.user)
                  ? 'CompanyPendingVerification'
                  : 'Home',
              },
            ],
          });
          return;
        } catch (e) {
          setError(e?.message || 'Could not register company');
          return;
        }
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.signup(name, email, password);
      setOtp('');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <TouchableOpacity
      style={styles.back}
      onPress={() => navigation.goBack()}
      disabled={loading}
    >
      <Text style={styles.backText}>{companyName ? '← Back' : '← Back to sign up'}</Text>
    </TouchableOpacity>
  );

  if (!email || !name || !password) {
    return null;
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle={`Code sent to ${email}`}
      showLogo
      showBack
      onBack={() => navigation.goBack()}
      footer={footer}
    >
      <OTPInput value={otp} onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setError(''); }} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AuthButton
        title="Verify Email"
        onPress={handleVerify}
        loading={loading}
        icon="checkmark-circle-outline"
      />

      <TouchableOpacity
        style={styles.resend}
        onPress={handleResend}
        disabled={loading}
      >
        <Text style={styles.resendLabel}>Didn't receive the code? </Text>
        <Text style={styles.resendLink}>Resend code</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: 14,
    color: authColors.error,
    marginBottom: 16,
  },
  resend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendLabel: { fontSize: 14, color: authColors.textSecondary },
  resendLink: { fontSize: 14, fontWeight: '600', color: authColors.link },
  back: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 16,
  },
  backText: {
    fontSize: 16,
    color: authColors.textSecondary,
  },
});
