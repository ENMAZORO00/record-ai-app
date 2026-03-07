import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { authColors } from '../theme/authColors';

export default function AuthLayout({
  title,
  subtitle,
  icon,
  showLogo,
  children,
  footer,
  showBack,
  onBack,
  showCardBack,
  onCardBack,
  showClose,
  onClose,
  compact = false,
}) {
  const Wrapper = compact ? View : ScrollView;
  const wrapperProps = compact
    ? { style: [styles.scroll, styles.scrollCompact] }
    : {
        contentContainerStyle: styles.scroll,
        keyboardShouldPersistTaps: 'handled',
        showsVerticalScrollIndicator: false,
      };

  return (
    <View style={[styles.container, styles.bg, compact && styles.containerNoScroll]}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboard}
        >
          <Wrapper {...wrapperProps}>
            {(showBack || showClose) && (
              <View style={styles.topBar}>
                {showBack ? (
                  <TouchableOpacity
                    onPress={onBack}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={22}
                      color={authColors.textSecondary}
                    />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.spacer} />
                )}
                {showClose ? (
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={authColors.textSecondary}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.spacer} />
                )}
              </View>
            )}

            <View style={[styles.card, compact && styles.cardCompact]}>
              {showCardBack && (
                <TouchableOpacity
                  onPress={onCardBack}
                  style={styles.cardBackBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={authColors.textSecondary}
                  />
                </TouchableOpacity>
              )}
              {showLogo ? (
                <View style={[styles.logoWrap, compact && styles.logoWrapCompact]}>
                  <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              ) :   icon ? (
                <View style={[styles.iconWrap, styles.iconBg]}>
                  <Ionicons name={icon} size={32} color={authColors.textPrimary} />
                </View>
              ) : null}
              <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
              ) : null}
              {children}
            </View>

            {footer}
          </Wrapper>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerNoScroll: { overflow: 'hidden' },
  bg: { backgroundColor: authColors.bg },
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: '100%',
  },
  scrollCompact: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 16,
    color: authColors.textSecondary,
  },
  spacer: { width: 44 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: authColors.cardBg,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.14)',
  },
  cardCompact: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 28,
  },
  logoWrapCompact: {
    marginBottom: 6,
  },
  logo: {
    width: 640,
    height: 210,
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: 20,
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBg: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cardBackBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: authColors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  titleCompact: {
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 16,
    color: authColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  subtitleCompact: {
    marginBottom: 10,
  },
});
