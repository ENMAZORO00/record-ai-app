import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthButton from '../components/AuthButton';
import { getInviteByToken, joinCompany } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AcceptInviteScreen({ navigation, route }) {
  const inviteToken = route?.params?.inviteToken ?? '';
  const { token, user, updateUser, signIn } = useAuth();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setError('No invite token');
      return;
    }
    setLoading(true);
    getInviteByToken(inviteToken)
      .then(setInvite)
      .catch((err) => setError(err?.message || 'Invalid invite'))
      .finally(() => setLoading(false));
  }, [inviteToken]);

  const handleJoin = async () => {
    if (!token) {
      navigation.navigate('Login', { inviteToken });
      return;
    }
    setError('');
    setJoining(true);
    try {
      const data = await joinCompany(token, inviteToken);
      if (data.user) {
        updateUser(data.user);
        signIn(data.user, token);
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      setError(err?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login', { inviteToken });
  };

  const goToSignUp = () => {
    navigation.navigate('SignUp', { inviteToken });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5810fa" />
        <Text style={styles.loadingText}>Loading invite…</Text>
      </View>
    );
  }

  if (error && !invite) {
    return (
      <AuthLayout title="Invite invalid">
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </AuthLayout>
    );
  }

  if (!invite) return null;

  const isLoggedIn = !!token;
  const emailMatch = isLoggedIn && user?.email && invite.email?.toLowerCase() === user.email?.toLowerCase();

  return (
    <AuthLayout title="You're invited" titleFontWeight="400">
      <View style={styles.card}>
        <Text style={styles.companyName}>{invite.companyName}</Text>
        <Text style={styles.invitedBy}>Invited by {invite.invitedBy}</Text>
        <Text style={styles.emailFor}>Invite sent to: {invite.email}</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoggedIn ? (
        emailMatch ? (
          <AuthButton
            title="Join company"
            onPress={handleJoin}
            loading={joining}
            style={styles.submitBtn}
          />
        ) : (
          <Text style={styles.mismatchText}>
            Sign in with {invite.email} to accept this invite.
          </Text>
        )
      ) : (
        <>
          <AuthButton title="Sign in to accept" onPress={goToLogin} style={styles.submitBtn} />
          <TouchableOpacity onPress={goToSignUp} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Create an account</Text>
          </TouchableOpacity>
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  card: {
    backgroundColor: 'rgba(88, 16, 250, 0.08)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  companyName: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 4 },
  invitedBy: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  emailFor: { fontSize: 13, color: '#9ca3af' },
  errorText: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
  submitBtn: { marginTop: 8 },
  secondaryBtn: { marginTop: 16, alignSelf: 'center' },
  secondaryText: { color: '#5810fa', fontSize: 14 },
  mismatchText: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  backBtn: { marginTop: 16 },
  backBtnText: { color: '#5810fa', fontSize: 14 },
});
