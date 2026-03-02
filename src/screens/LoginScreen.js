import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import FeatureBar from '../components/FeatureBar';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { authColors } from '../theme/authColors';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    const tEmail = email.trim().toLowerCase();
    if (!tEmail) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login(tEmail, password);
      await signIn(data.user, data.token);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
          <Text style={styles.link}>Sign Up</Text>
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
      title="Welcome Back"
      subtitle="Sign in to continue your journey"
      icon="log-in-outline"
      footer={footer}
    >
      <FeatureBar text="Sign in to access transcript search, action items & AI insights" />

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

      <TouchableOpacity
        style={styles.forgotLink}
        onPress={() => navigation.navigate('ForgotPassword')}
        disabled={loading}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AuthButton
        title="Sign In"
        onPress={handleLogin}
        loading={loading}
        icon="log-in-outline"
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotLink: { alignSelf: 'flex-end', marginBottom: 16 },
  forgotText: { fontSize: 14, color: authColors.link, fontWeight: '600' },
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
