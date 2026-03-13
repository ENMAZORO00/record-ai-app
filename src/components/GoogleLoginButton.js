import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    >
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.g}>G</Text>
        </View>
        <Text style={styles.text}>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: authColors.inputBorder,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  g: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285f4',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: authColors.textPrimary,
  },
});
