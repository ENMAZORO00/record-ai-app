import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
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

  return (
    <AuthLayout
      title="Welcome Back"
      titleFontWeight="400"
      titleBottomMargin={32}
    >
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
      />

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
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotLink: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 15, color: authColors.textPrimary, fontWeight: '500' },
  errorText: {
    fontSize: 14,
    color: authColors.textSecondary,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 12,
  },
  footerText: { fontSize: 15, color: authColors.textSecondary },
  link: { fontSize: 15, fontWeight: '600', color: authColors.textPrimary },
  legal: {
    fontSize: 13,
    color: authColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  legalLink: {
    color: authColors.textPrimary,
    fontWeight: '500',
  },
});
