import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../services/api';
import { authColors } from '../theme/authColors';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/config';

// Native (Android/iOS): @react-native-google-signin - no redirect URI, uses Android OAuth client
// Web: expo-auth-session with auth.expo.io proxy (http/https redirect)
const isWeb = Platform.OS === 'web';

let GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes;
if (!isWeb) {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  isSuccessResponse = mod.isSuccessResponse;
  isErrorWithCode = mod.isErrorWithCode;
  statusCodes = mod.statusCodes;
}

if (isWeb) {
  require('expo-web-browser').maybeCompleteAuthSession();
}

export default function GoogleLoginButton({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    }
  }, []);

  const handleNativeSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResponse = await GoogleSignin.signIn();

      if (isSuccessResponse(signInResponse)) {
        const { idToken } = await GoogleSignin.getTokens();
        if (!idToken) {
          onError('Could not get Google ID token');
          return;
        }
        const data = await authApi.googleLogin(idToken);
        onSuccess(data.user, data.token);
      }
      // User cancelled – no error
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          // User cancelled
        } else if (error.code === statusCodes.IN_PROGRESS) {
          onError('Sign in already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError('Google Play Services not available');
        } else {
          onError(error.message || 'Google sign in failed');
        }
      } else {
        onError(error?.message || 'Google sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    return <GoogleLoginButtonWeb onSuccess={onSuccess} onError={onError} />;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleNativeSignIn}
      disabled={loading}
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

// Web: expo-auth-session with auth.expo.io proxy (http/https redirect)
function GoogleLoginButtonWeb({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const { useIdTokenAuthRequest } = require('expo-auth-session/providers/google');

  const [request, response, promptAsync] = useIdTokenAuthRequest(
    {
      webClientId: GOOGLE_WEB_CLIENT_ID,
    },
    { useProxy: true }
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      setLoading(true);
      authApi
        .googleLogin(response.params.id_token)
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
