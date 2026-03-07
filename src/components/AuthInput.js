import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authColors } from '../theme/authColors';

export default function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  leftIcon,
  error,
  editable = true,
  compact = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;
  const visible = isPassword ? showPassword : true;

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        {leftIcon ? (
          <View style={styles.iconLeft}>
            <Ionicons name={leftIcon} size={20} color={authColors.iconMuted} />
          </View>
        ) : null}
        <View style={styles.inputInner}>
          {label ? <Text style={styles.labelInside}>{label}</Text> : null}
          <TextInput
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (isPassword || leftIcon) && styles.inputWithRightIcon,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || label}
            placeholderTextColor={authColors.textMuted}
            secureTextEntry={isPassword && !showPassword}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            editable={editable}
          />
        </View>
        {isPassword ? (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={authColors.iconMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  wrapperCompact: { marginBottom: 10 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: authColors.textSecondary,
    marginBottom: 8,
  },
  inputInner: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  labelInside: {
    fontSize: 12,
    fontWeight: '500',
    color: authColors.textSecondary,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 52,
    backgroundColor: authColors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.inputBorder,
    overflow: 'hidden',
  },
  inputError: { borderColor: 'rgba(0,0,0,0.2)' },
  iconLeft: {
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 16,
  },
  iconRight: {
    paddingRight: 16,
    paddingLeft: 12,
    paddingTop: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: authColors.textPrimary,
    paddingVertical: 0,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 12,
  },
  error: {
    fontSize: 13,
    color: authColors.textSecondary,
    marginTop: 6,
  },
});
