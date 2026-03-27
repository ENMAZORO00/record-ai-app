import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AuthLayout from '../components/AuthLayout';
import AuthButton from '../components/AuthButton';
import { useAuth } from '../context/AuthContext';
import { getAuthMe } from '../services/api';
import { authColors } from '../theme/authColors';
import { isCompanyPendingVerification } from '../utils/companyVerification';

export default function CompanyPendingVerificationScreen({ navigation }) {
  const { token, user, updateUser, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const refreshStatus = useCallback(async () => {
    if (!token) return;
    setError('');
    setChecking(true);
    try {
      const { user: fresh } = await getAuthMe(token);
      if (fresh) {
        await updateUser(fresh);
        if (!isCompanyPendingVerification(fresh)) {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
      }
    } catch (e) {
      setError(e?.message || 'Could not refresh status');
    } finally {
      setChecking(false);
    }
  }, [token, updateUser, navigation]);

  useFocusEffect(
    useCallback(() => {
      refreshStatus();
    }, [refreshStatus])
  );

  const companyLabel = user?.companyName || 'your company';

  return (
    <AuthLayout
      title="Verification pending"
      subtitle={`${companyLabel} is registered but not yet approved. You can use the app after an administrator verifies your company.`}
      titleFontWeight="400"
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <AuthButton
        title={checking ? 'Checking…' : 'Check approval status'}
        onPress={refreshStatus}
        loading={checking}
        icon="refresh-outline"
      />
      <TouchableOpacity style={styles.signOut} onPress={() => signOut()} disabled={checking}>
        <Text style={styles.signOutText}>Sign out</Text>
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
  signOut: {
    marginTop: 24,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 16,
    color: authColors.textSecondary,
  },
});
