import { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import RootStack from './src/navigation/RootStack';

function getInviteTokenFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = Linking.parse(url);
    const token = parsed?.queryParams?.invite ?? null;
    return token ? decodeURIComponent(String(token)) : null;
  } catch {
    const match = url.match(/[?&]invite=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

export default function App() {
  const navigationRef = useRef(null);
  const [navReady, setNavReady] = useState(false);
  const initialUrlRef = useRef(null);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      initialUrlRef.current = url || null;
    });
  }, []);

  useEffect(() => {
    if (!navReady || !navigationRef.current) return;

    const url = initialUrlRef.current;
    if (url) {
      initialUrlRef.current = null;
      const inviteToken = getInviteTokenFromUrl(url);
      if (inviteToken) {
        navigationRef.current.navigate('AcceptInvite', { inviteToken });
      }
    }
  }, [navReady]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const inviteToken = getInviteTokenFromUrl(url);
      if (inviteToken && navigationRef.current?.getRootState()) {
        navigationRef.current.navigate('AcceptInvite', { inviteToken });
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
            <StatusBar style="light" />
            <RootStack />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
