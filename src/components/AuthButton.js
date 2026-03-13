import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { authColors } from '../theme/authColors';

export default function AuthButton({
  title,
  onPress,
  variant = 'primary',
  primaryStyle = 'glass',
  loading = false,
  disabled = false,
  icon,
}) {
  const isPrimary = variant === 'primary';
  const isSolid = isPrimary && primaryStyle === 'solid';

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          color={isSolid ? '#fff' : isPrimary ? authColors.textPrimary : authColors.primary}
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={isSolid ? '#fff' : isPrimary ? authColors.textPrimary : authColors.primary}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[
              styles.text,
              isSolid ? styles.textSolid : isPrimary ? styles.textPrimary : styles.textSecondary,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (isPrimary) {
    if (isSolid) {
      return (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.85}
          style={[
            styles.button,
            styles.solid,
            (disabled || loading) && styles.disabled,
          ]}
        >
          {content}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.button,
          styles.glass,
          (disabled || loading) && styles.disabled,
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 80}
          tint="light"
          style={styles.blur}
        >
          {content}
        </BlurView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles.secondary,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  solid: {
    backgroundColor: '#E53935',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glass: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  blur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: authColors.cardBg,
    borderWidth: 1,
    borderColor: authColors.inputBorder,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  disabled: { opacity: 0.6 },
  text: { fontSize: 16, fontWeight: '600' },
  textPrimary: { color: authColors.textPrimary },
  textSolid: { color: '#ffffff' },
  textSecondary: { color: authColors.primary },
  icon: { marginRight: 8 },
});
