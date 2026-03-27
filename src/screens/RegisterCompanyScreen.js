import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { registerCompany, authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { authColors } from '../theme/authColors';
import { isCompanyPendingVerification } from '../utils/companyVerification';

export default function RegisterCompanyScreen({ navigation, route }) {
  const fromLogin = route?.params?.fromLogin === true;
  const { token, updateUser } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterFromLogin = async () => {
    setError('');
    const cName = companyName.trim();
    const email = adminEmail.trim().toLowerCase();
    const name = adminName.trim();
    if (!cName) {
      setError('Please enter your company name');
      return;
    }
    if (!email) {
      setError('Please enter admin email');
      return;
    }
    if (!name) {
      setError('Please enter your name');
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
      await authApi.signup(name, email, password);
      navigation.replace('VerifyOTP', {
        email,
        name,
        password,
        companyName: cName,
      });
    } catch (err) {
      setError(err?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterExistingUser = async () => {
    setError('');
    const name = companyName.trim();
    if (!name) {
      setError('Please enter your company name');
      return;
    }
    setLoading(true);
    try {
      const data = await registerCompany(token, name);
      if (data.user) {
        updateUser(data.user);
      }
      navigation.reset({
        index: 0,
        routes: [
          {
            name: isCompanyPendingVerification(data.user)
              ? 'CompanyPendingVerification'
              : 'Home',
          },
        ],
      });
    } catch (err) {
      setError(err?.message || 'Failed to register company');
    } finally {
      setLoading(false);
    }
  };

  const isFromLoginFlow = fromLogin || !token;

  return (
    <AuthLayout
      title="Register your company"
      titleFontWeight="700"
      titleBottomMargin={32}
    >
      <AuthInput
        label="Company name"
        value={companyName}
        onChangeText={(t) => { setCompanyName(t); setError(''); }}
        placeholder="Company name"
        leftIcon="business-outline"
      />
      {isFromLoginFlow && (
        <>
          <AuthInput
            label="Admin email"
            value={adminEmail}
            onChangeText={(t) => { setAdminEmail(t); setError(''); }}
            placeholder="Admin email"
            keyboardType="email-address"
            leftIcon="mail-outline"
          />
          <AuthInput
            label="Your name"
            value={adminName}
            onChangeText={(t) => { setAdminName(t); setError(''); }}
            placeholder="Your name"
            leftIcon="person-outline"
          />
          <AuthInput
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            placeholder="Password"
            secureTextEntry
            leftIcon="lock-closed-outline"
          />
        </>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <AuthButton
        title={isFromLoginFlow ? 'Continue' : 'Create company'}
        onPress={isFromLoginFlow ? handleRegisterFromLogin : handleRegisterExistingUser}
        loading={loading}
        primaryStyle="solid"
      />
      {isFromLoginFlow ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.link}>Log in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
  skipLink: {
    marginTop: 28,
    alignSelf: 'center',
    paddingVertical: 12,
  },
  skipText: { fontSize: 15, fontWeight: '600', color: authColors.textPrimary },
});
