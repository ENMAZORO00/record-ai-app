import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, getAuthMe } from '../services/api';

const TOKEN_KEY = '@notes_token';
const USER_KEY = '@notes_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        let parsedUser = null;
        try {
          parsedUser = JSON.parse(storedUser);
          if (parsedUser && typeof parsedUser === 'object') setUser(parsedUser);
        } catch (_) {
          await AsyncStorage.removeItem(USER_KEY);
        }
        if (parsedUser) {
          try {
            const { user: fresh } = await getAuthMe(storedToken);
            if (fresh) {
              setUser(fresh);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
            }
          } catch (_) {
            // keep stored user on refresh failure
          }
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (userData, authToken) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, authToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
    ]);
    setToken(authToken);
    setUser(userData);
  };

  const updateUser = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const signOut = async () => {
    try {
      if (token) {
        await authApi.logout(token);
      }
    } catch (e) {
      // Still sign out locally if API fails (expired token, network error)
    }
    if (Platform.OS !== 'web') {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      } catch (_) {
        // ignore — e.g. never used Google on this device
      }
    }
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
