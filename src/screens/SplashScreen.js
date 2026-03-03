import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Design tokens from reference
const colors = {
  bgStart: '#fdfbff',
  bgEnd: '#f5f0ff',
  textPrimary: '#5b21b6',
  textSecondary: '#7c3aed',
  tagline: '#6b7280',
  tagBg: '#ffffff',
  tagText: '#e11d48',
  tagTextAlt: '#9333ea',
  progressTrack: '#e5e7eb',
  progressFillStart: '#8b5cf6',
  progressFillEnd: '#ec4899',
  decorative: 'rgba(139, 92, 246, 0.15)',
};

export default function SplashScreen({ navigation }) {
  const { isAuthenticated, loading } = useAuth();
  const loadingRef = useRef(loading);
  const authRef = useRef(isAuthenticated);
  const splashMinRef = useRef(false);
  loadingRef.current = loading;
  authRef.current = isAuthenticated;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar fill over ~2s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Subtle float for decorative icons
    const createFloat = (anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      );
    createFloat(float1).start();
    setTimeout(() => createFloat(float2).start(), 400);
    setTimeout(() => createFloat(float3).start(), 800);

    // Navigate based on auth after splash minimum
    const navTimer = setTimeout(() => {
      splashMinRef.current = true;
      if (!loadingRef.current) {
        navigation.replace(authRef.current ? 'Home' : 'Login');
      }
    }, 2500);

    return () => clearTimeout(navTimer);
  }, [fadeAnim, scaleAnim, progressAnim, float1, float2, float3, navigation]);

  useEffect(() => {
    if (!loading && splashMinRef.current) {
      navigation.replace(isAuthenticated ? 'Home' : 'Login');
    }
  }, [loading, isAuthenticated, navigation]);

  const PROGRESS_BAR_WIDTH = Math.min(280, width - 64);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_BAR_WIDTH],
  });

  const translateY1 = float1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const translateY2 = float2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const translateY3 = float3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[colors.bgStart, colors.bgEnd]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Floating decorative icons */}
        <Animated.View
          style={[styles.decorIcon, styles.decorTopLeft, { transform: [{ translateY: translateY1 }] }]}
        >
          <Ionicons name="book-outline" size={40} color={colors.decorative} />
        </Animated.View>
        <Animated.View
          style={[styles.decorIcon, styles.decorTopRight, { transform: [{ translateY: translateY2 }] }]}
        >
          <Ionicons name="sparkles-outline" size={32} color={colors.decorative} />
        </Animated.View>
        <Animated.View
          style={[styles.decorIcon, styles.decorBottomLeft, { transform: [{ translateY: translateY3 }] }]}
        >
          <Ionicons name="trophy-outline" size={36} color={colors.decorative} />
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Main logo - same as LoginScreen */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Remember every conversation. Search. Act. Succeed.
          </Text>

          {/* Feature tags */}
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: colors.tagText }]}>Transcripts</Text>
            </View>
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: colors.tagTextAlt }]}>Action Items</Text>
            </View>
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: colors.tagText }]}>AI Search</Text>
            </View>
          </View>

          {/* Loading section */}
          <View style={styles.loadingSection}>
            <View style={styles.loadingRow}>
              <Ionicons name="sparkles-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.loadingText}>Loading your experience ...</Text>
            </View>
            <View style={[styles.progressTrack, { width: PROGRESS_BAR_WIDTH }]}>
              <Animated.View style={[styles.progressFillWrap, { width: progressWidth }]}>
                <LinearGradient
                  colors={[colors.progressFillStart, colors.progressFillEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressFill}
                />
              </Animated.View>
            </View>
            <Text style={styles.percentText}>100%</Text>
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
  decorIcon: {
    position: 'absolute',
    opacity: 0.5,
  },
  decorTopLeft: {
    top: height * 0.1,
    left: width * 0.08,
  },
  decorTopRight: {
    top: height * 0.12,
    right: width * 0.1,
  },
  decorBottomLeft: {
    bottom: height * 0.2,
    left: width * 0.1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 640,
    height: 210,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  brandPart1: {
    color: colors.textPrimary,
  },
  brandPart2: {
    color: colors.textSecondary,
  },
  tagline: {
    fontSize: 15,
    color: colors.tagline,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 36,
  },
  tag: {
    backgroundColor: colors.tagBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingSection: {
    alignItems: 'center',
    width: '100%',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.tagline,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.progressTrack,
    borderRadius: 4,
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
    borderRadius: 4,
  },
  percentText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
