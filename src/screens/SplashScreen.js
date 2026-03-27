import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { isCompanyPendingVerification } from '../utils/companyVerification';
import LogoIcon from '../components/LogoIcon';
import GradientText from '../components/GradientText';

const { width } = Dimensions.get('window');

const colors = {
  bg: '#ffffff',
  bgOriginal: '#fafafa',
  textPrimary: '#0a0a0a',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',
  border: '#e5e5e5',
  progressTrack: '#ebebeb',
  progressFill: '#171717',
};

const PROGRESS_BAR_WIDTH = Math.min(240, width - 80);

function nextRouteName(isAuthenticated, user) {
  if (!isAuthenticated) return 'Login';
  if (isCompanyPendingVerification(user)) return 'CompanyPendingVerification';
  return 'Home';
}

export default function SplashScreen({ navigation }) {
  const { isAuthenticated, loading, user } = useAuth();
  const loadingRef = useRef(loading);
  const authRef = useRef(isAuthenticated);
  const userRef = useRef(user);
  const splashMinRef = useRef(false);
  loadingRef.current = loading;
  authRef.current = isAuthenticated;
  userRef.current = user;

  const [phase, setPhase] = useState(1); // 1 = new splash, 2 = original splash
  const [percent, setPercent] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  // Switch to original splash after ~1.5s
  useEffect(() => {
    const t = setTimeout(() => setPhase(2), 1500);
    return () => clearTimeout(t);
  }, []);

  // Phase 2: run progress bar and set splashMinRef
  useEffect(() => {
    if (phase !== 2) return;

    const listenerId = progressAnim.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const navTimer = setTimeout(() => {
      splashMinRef.current = true;
      if (!loadingRef.current) {
        navigation.replace(nextRouteName(authRef.current, userRef.current));
      }
    }, 2500);

    return () => {
      clearTimeout(navTimer);
      progressAnim.removeListener(listenerId);
    };
  }, [phase, progressAnim, navigation]);

  useEffect(() => {
    if (!loading && splashMinRef.current) {
      navigation.replace(nextRouteName(isAuthenticated, user));
    }
  }, [loading, isAuthenticated, user, navigation]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_BAR_WIDTH],
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: phase === 1 ? colors.bg : colors.bgOriginal },
      ]}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {phase === 1 ? (
            <>
              <LogoIcon size={Math.min(128, width * 0.35)} />
              <Text style={styles.logoText}>Shoten AI</Text>
              <Text style={styles.subtitle}>Voice Intelligence Platform</Text>
            </>
          ) : (
            <>
              <View style={styles.logoWrap}>
                <GradientText style={styles.gradientLogo}>Shoten AI</GradientText>
              </View>
              <Text style={styles.tagline}>
                Remember every conversation. Search. Act. Succeed.
              </Text>
              <View style={styles.tags}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Transcripts</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Action Items</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>AI Search</Text>
                </View>
              </View>
              <View style={styles.loadingSection}>
                <View style={styles.loadingRow}>
                  <Ionicons name="sparkles-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.loadingText}>Loading your experience</Text>
                </View>
                <View style={[styles.progressTrack, { width: PROGRESS_BAR_WIDTH }]}>
                  <Animated.View style={[styles.progressFillWrap, { width: progressWidth }]}>
                    <View style={[styles.progressFill, { backgroundColor: colors.progressFill }]} />
                  </Animated.View>
                </View>
                <Text style={styles.percentText}>{percent}%</Text>
              </View>
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 28,
  },
  gradientLogo: {
    fontSize: 42,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    letterSpacing: 0.2,
    color: colors.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 26,
    maxWidth: 300,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 44,
  },
  tag: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  loadingSection: {
    alignItems: 'center',
    width: '100%',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 18,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.progressTrack,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFillWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  progressFill: {
    flex: 1,
    height: '100%',
    width: '100%',
    borderRadius: 3,
  },
  percentText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
