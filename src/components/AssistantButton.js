import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { homeColors } from '../theme/homeColors';

/**
 * AssistantButton - Professional recording control button
 * Variants: 'start' | 'pause' | 'stop' | 'primary' | 'secondary'
 */
export default function AssistantButton({
  variant = 'primary',
  onPress,
  disabled = false,
  loading = false,
  label,
  icon,
  size = 'medium',
  active = false,
}) {
  const getIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case 'start':
        return 'mic';
      case 'pause':
        return 'pause';
      case 'stop':
        return 'stop';
      case 'primary':
        return 'sparkles';
      default:
        return null;
    }
  };

  const iconName = getIcon();
  const isRecordingAction = ['start', 'pause', 'stop'].includes(variant);
  const isLarge = size === 'large';
  const iconSize = isLarge ? 28 : 22;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : homeColors.accent}
        />
      ) : (
        <>
          {iconName ? (
            <Ionicons
              name={iconName}
              size={iconSize}
              color={
                variant === 'primary' || active
                  ? '#fff'
                  : isRecordingAction && active
                  ? '#fff'
                  : homeColors.accent
              }
              style={label ? styles.iconWithLabel : null}
            />
          ) : null}
          {label ? (
            <Text
              style={[
                styles.label,
                isLarge && styles.labelLarge,
                (variant === 'primary' || active) && styles.labelLight,
              ]}
            >
              {label}
            </Text>
          ) : null}
        </>
      )}
    </>
  );

  const buttonStyles = [
    styles.button,
    isLarge && styles.buttonLarge,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    (variant === 'start' || variant === 'stop') && active && styles.recording,
    disabled && styles.disabled,
  ];

  if (variant === 'primary' || (isRecordingAction && active)) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          buttonStyles,
          variant === 'stop' && active ? styles.recording : styles.primaryTouch,
        ]}
      >
        <View style={[styles.inner, styles.primaryInner]}>{content}</View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={buttonStyles}
    >
      <BlurView intensity={60} tint="light" style={styles.blur}>
        <View style={styles.inner}>{content}</View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonLarge: {
    borderRadius: 32,
    minWidth: 64,
    minHeight: 64,
  },
  primary: {
    backgroundColor: homeColors.accent,
    borderColor: 'transparent',
  },
  primaryTouch: {
    backgroundColor: homeColors.accent,
  },
  primaryInner: {
    backgroundColor: 'transparent',
  },
  secondary: {
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  recording: {
    backgroundColor: '#dc2626',
    borderColor: 'transparent',
  },
  blur: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  iconWithLabel: {
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: homeColors.textPrimary,
  },
  labelLarge: {
    fontSize: 16,
  },
  labelLight: {
    color: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
});
