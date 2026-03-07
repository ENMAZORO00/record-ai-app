import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import OTPInput from '../components/OTPInput';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { authApi } from '../services/api';
import { authColors } from '../theme/authColors';

export default function ResetPasswordScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email?.trim()) {
      navigation.replace('ForgotPassword');
    }
  }, [email, navigation]);

  const handleReset = async () => {
    setError('');
    const code = otp.trim();
    if (!code || code.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (!newPassword) {
      setError('Enter your new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email, code, newPassword, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Could not reset password. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setOtp('');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  if (!email?.trim()) {
    return null;
  }

  if (success) {
    return (
      <AuthLayout
        title="Password Reset!"
        subtitle="Your password has been successfully changed."
        showLogo
      >
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successMessage}>
            Your password has been successfully changed.
          </Text>
          <View style={styles.redirectRow}>
            <ActivityIndicator size="small" color={authColors.success} />
            <Text style={styles.redirectText}>Redirecting to login...</Text>
          </View>
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a strong new password"
      showLogo
      showCardBack
      onCardBack={() => navigation.replace('ForgotPassword')}
    >
      <OTPInput
        value={otp}
        onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        label="Enter 6-Digit OTP"
        hint="Sent to your email"
        showPasteHint={false}
      />

      <AuthInput
        label="New Password"
        value={newPassword}
        onChangeText={(t) => { setNewPassword(t); setError(''); }}
        placeholder="••••••••"
        secureTextEntry
        leftIcon="lock-closed-outline"
      />
      <AuthInput
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
        placeholder="••••••••"
        secureTextEntry
        leftIcon="lock-closed-outline"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AuthButton
        title="Reset Password"
        onPress={handleReset}
        loading={loading}
        icon="key-outline"
      />

      <TouchableOpacity
        style={styles.resend}
        onPress={handleResend}
        disabled={loading}
      >
        <Text style={styles.resendLink}>Resend OTP</Text>
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
    alignSelf: 'center',
    marginTop: 20,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: authColors.link,
  },
  successCard: {
    backgroundColor: 'rgba(245, 240, 255, 0.8)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: authColors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: authColors.textPrimary,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: authColors.textSecondary,
    marginBottom: 20,
  },
  redirectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  redirectText: {
    fontSize: 14,
    color: authColors.success,
    fontWeight: '500',
  },
});
