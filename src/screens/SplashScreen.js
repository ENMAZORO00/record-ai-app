import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import GradientText from '../components/GradientText';

const { width } = Dimensions.get('window');

// Premium monochrome palette
const colors = {
  bg: '#fafafa',
  textPrimary: '#0a0a0a',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',
  border: '#e5e5e5',
  progressTrack: '#ebebeb',
  progressFill: '#171717',
};

export default function SplashScreen({ navigation }) {
  const { isAuthenticated, loading } = useAuth();
  const loadingRef = useRef(loading);
  const authRef = useRef(isAuthenticated);
  const splashMinRef = useRef(false);
  loadingRef.current = loading;
  authRef.current = isAuthenticated;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar fill over ~2s
    const listenerId = progressAnim.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Navigate based on auth after splash minimum
    const navTimer = setTimeout(() => {
      splashMinRef.current = true;
      if (!loadingRef.current) {
        navigation.replace(authRef.current ? 'Home' : 'Login');
      }
    }, 2500);

    return () => {
      clearTimeout(navTimer);
      progressAnim.removeListener(listenerId);
    };
  }, [fadeAnim, scaleAnim, progressAnim, navigation]);

  useEffect(() => {
    if (!loading && splashMinRef.current) {
      navigation.replace(isAuthenticated ? 'Home' : 'Login');
    }
  }, [loading, isAuthenticated, navigation]);

  const PROGRESS_BAR_WIDTH = Math.min(240, width - 80);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_BAR_WIDTH],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
          {/* Company name branding */}
          <View style={styles.logoWrap}>
            <GradientText style={styles.logoText}>Shoten AI</GradientText>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Remember every conversation. Search. Act. Succeed.
          </Text>

          {/* Feature tags - monochrome */}
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

          {/* Loading section */}
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
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 28,
  },
  logoText: {
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
