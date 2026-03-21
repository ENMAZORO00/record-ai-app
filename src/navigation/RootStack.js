import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Eager-load only auth/splash screens (no expo-av) so app can start without native audio init
import SplashScreen from '../screens/SplashScreen';
import SignUpScreen from '../screens/SignUpScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import RegisterCompanyScreen from '../screens/RegisterCompanyScreen';
import AcceptInviteScreen from '../screens/AcceptInviteScreen';
import TeamScreen from '../screens/TeamScreen';
import InviteMembersScreen from '../screens/InviteMembersScreen';

// Lazy-load screens that use expo-av (can crash on Android if loaded at startup)
const HomeScreen = lazy(() => import('../screens/HomeScreen'));
const VoiceRecordingScreen = lazy(() => import('../screens/home/VoiceRecordingScreen'));

function LoadingFallback() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="RegisterCompany" component={RegisterCompanyScreen} />
        <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} />
        <Stack.Screen name="Team" component={TeamScreen} />
        <Stack.Screen name="InviteMembers" component={InviteMembersScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="VoiceRecording" component={VoiceRecordingScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
