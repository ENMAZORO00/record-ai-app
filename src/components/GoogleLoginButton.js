import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { authApi } from '../services/api';
import { authColors } from '../theme/authColors';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/config';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleLoginButton({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      const idToken = response.params.id_token;
      setLoading(true);
      authApi
        .googleLogin(idToken)
        .then((data) => onSuccess(data.user, data.token))
        .catch((err) => onError(err.message || 'Google sign in failed'))
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      onError(response.error?.message || 'Google sign in failed');
      setLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  const handlePress = () => {
    if (!request) return;
    setLoading(true);
    promptAsync();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={!request || loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.icon} />
        <Text style={styles.text}>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    marginTop: 16,
    borderRadius: 26,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    marginRight: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3c4043',
  },
});
