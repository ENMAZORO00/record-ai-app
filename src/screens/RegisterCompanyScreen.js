import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
    <AuthLayout title="Register your company" titleFontWeight="400" titleBottomMargin={24}>
      <AuthInput
        label="Company name"
        value={companyName}
        onChangeText={(t) => { setCompanyName(t); setError(''); }}
        placeholder="e.g. Acme Inc"
        leftIcon="business-outline"
      />
      {isFromLoginFlow && (
        <>
          <AuthInput
            label="Admin email"
            value={adminEmail}
            onChangeText={(t) => { setAdminEmail(t); setError(''); }}
            placeholder="you@company.com"
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
            placeholder="At least 6 characters"
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
        style={styles.submitBtn}
      />
      {isFromLoginFlow ? (
        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={styles.secondaryText}>Already have an account? Log in</Text>
        </TouchableOpacity>
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
    color: authColors.error,
    fontSize: 14,
    marginBottom: 12,
  },
  submitBtn: { marginTop: 8 },
  skipLink: { marginTop: 24, alignSelf: 'center' },
  skipText: { color: authColors.primary, fontSize: 14 },
  secondaryLink: { marginTop: 24, alignSelf: 'center' },
  secondaryText: { color: authColors.primary, fontSize: 14 },
});
