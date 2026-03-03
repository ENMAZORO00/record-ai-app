import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { authApi } from '../services/api';
import { authColors } from '../theme/authColors';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    const tEmail = email.trim().toLowerCase();
    if (!tEmail) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(tEmail);
      navigation.replace('ResetPassword', { email: data.email });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <TouchableOpacity
      onPress={() => navigation.replace('Login')}
      style={styles.backButton}
      disabled={loading}
    >
      <Text style={styles.backText}>← Back to sign in</Text>
    </TouchableOpacity>
  );

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter the email linked to your account. We'll send you a verification code to reset your password."
      showLogo
      showBack
      onBack={() => navigation.replace('Login')}
      footer={footer}
    >
      <AuthInput
        label="Email Address"
        value={email}
        onChangeText={(t) => { setEmail(t); setError(''); }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail-outline"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AuthButton
        title="Send Reset Code"
        onPress={handleSubmit}
        loading={loading}
        icon="send-outline"
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: 14,
    color: authColors.error,
    marginBottom: 16,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 16,
  },
  backText: {
    fontSize: 16,
    color: authColors.textSecondary,
  },
});
