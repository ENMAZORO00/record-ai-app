import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import FeatureBar from '../components/FeatureBar';
import { authApi } from '../services/api';
import { authColors } from '../theme/authColors';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError('');
    const tName = name.trim();
    const tEmail = email.trim().toLowerCase();
    if (!tName) {
      setError('Please enter your name');
      return;
    }
    if (!tEmail) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.signup(tName, tEmail, password);
      navigation.replace('VerifyOTP', {
        email: data.email,
        name: data.tempData.name,
        password: data.tempData.password,
      });
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.link}>Sign In</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.legal}>
        By continuing, you agree to our <Text style={styles.legalLink}>Terms</Text>
        {' '}and <Text style={styles.legalLink}>Privacy Policy</Text>.
      </Text>
    </>
  );

  return (
    <AuthLayout
      title="Join Record AI"
      subtitle="Create your account to start remembering your daily conversations"
      showLogo
      showClose
      onClose={() => navigation.replace('Login')}
      footer={footer}
    >
      <FeatureBar text="Unlock transcripts, action items & AI-powered insights" />

      <AuthInput
        label="Full Name"
        value={name}
        onChangeText={(t) => { setName(t); setError(''); }}
        placeholder="Full Name"
        autoCapitalize="words"
        leftIcon="person-outline"
      />
      <AuthInput
        label="Email Address"
        value={email}
        onChangeText={(t) => { setEmail(t); setError(''); }}
        placeholder="Email Address"
        keyboardType="email-address"
        leftIcon="mail-outline"
      />
      <AuthInput
        label="Password"
        value={password}
        onChangeText={(t) => { setPassword(t); setError(''); }}
        placeholder="Password"
        secureTextEntry
        leftIcon="lock-closed-outline"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AuthButton
        title="Create Account"
        onPress={handleSignUp}
        loading={loading}
        icon="person-add-outline"
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  footerText: { fontSize: 15, color: authColors.textSecondary },
  link: { fontSize: 15, fontWeight: '600', color: authColors.link },
  legal: {
    fontSize: 13,
    color: authColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  legalLink: {
    color: authColors.link,
    fontWeight: '600',
  },
});
