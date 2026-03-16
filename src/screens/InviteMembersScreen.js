import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import { inviteEmployee } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function InviteMembersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setError('');
    setSuccess('');
    const e = email.trim().toLowerCase();
    if (!e) {
      setError('Please enter an email address');
      return;
    }
    if (e === user?.email?.toLowerCase()) {
      setError('You cannot invite yourself');
      return;
    }
    setLoading(true);
    try {
      await inviteEmployee(token, e);
      setSuccess(`Added. Login details sent to ${e}`);
      setEmail('');
    } catch (err) {
      setError(err?.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to team</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={styles.hint}>Enter their email. They'll receive an email with their login (email + default password) to sign in.</Text>
        <AuthInput
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); setSuccess(''); }}
          placeholder="colleague@company.com"
          keyboardType="email-address"
          leftIcon="mail-outline"
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}
        <AuthButton
          title="Add employee"
          onPress={handleInvite}
          loading={loading}
          style={styles.submitBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#000' },
  headerSpacer: { width: 32 },
  content: { padding: 24 },
  hint: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  errorText: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
  successText: { color: '#059669', fontSize: 14, marginBottom: 12 },
  submitBtn: { marginTop: 8 },
});
