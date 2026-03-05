import React, { useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authColors } from '../theme/authColors';

const DIGIT_COUNT = 6;

export default function OTPInput({ value, onChangeText, digitCount = DIGIT_COUNT, label = 'Enter Verification Code', hint, showPasteHint = true }) {
  const refs = useRef([]);

  const digits = value.split('').concat(Array(digitCount - value.length).fill(''));

  const handleChange = (index, char) => {
    const num = char.replace(/\D/g, '');
    if (num.length > 1) {
      // Paste: distribute across boxes
      const paste = num.slice(0, digitCount).split('');
      let newVal = '';
      for (let i = 0; i < digitCount; i++) {
        newVal += paste[i] || '';
      }
      onChangeText(newVal);
      const nextIdx = Math.min(paste.length, digitCount - 1);
      refs.current[nextIdx]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[index] = num;
    const newVal = arr.join('');
    onChangeText(newVal);
    if (num && index < digitCount - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hintTop}>{hint}</Text> : null}
      <View style={styles.boxRow}>
        {Array.from({ length: digitCount }).map((_, i) => (
          <TextInput
            key={i}
            ref={(r) => (refs.current[i] = r)}
            style={[
              styles.box,
              digits[i] && styles.boxFilled,
            ]}
            value={digits[i]}
            onChangeText={(t) => handleChange(i, t)}
            onKeyPress={(e) => handleKeyPress(i, e)}
            keyboardType="number-pad"
            maxLength={digitCount}
            selectTextOnFocus
            {...(Platform.OS === 'web' && { outlineStyle: 'none' })}
          />
        ))}
      </View>
      {showPasteHint && (
        <View style={styles.hint}>
          <Ionicons name="bulb-outline" size={14} color={authColors.textMuted} />
          <Text style={styles.hintText}>Paste code at once</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24, width: '100%', maxWidth: '100%' },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: authColors.textSecondary,
    marginBottom: 4,
  },
  hintTop: {
    fontSize: 13,
    color: authColors.textMuted,
    marginBottom: 12,
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    width: '100%',
    maxWidth: '100%',
  },
  box: {
    flex: 1,
    minWidth: 0,
    height: 52,
    backgroundColor: authColors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.inputBorder,
    fontSize: 20,
    fontWeight: '600',
    color: authColors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  boxFilled: {
    borderColor: authColors.gradientStart,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  hintText: {
    fontSize: 13,
    color: authColors.textMuted,
  },
});
