import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authColors } from '../theme/authColors';

export default function FeatureBar({ text }) {
  return (
    <View style={styles.bar}>
      <Ionicons name="flash-outline" size={18} color={authColors.gradientStart} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.featureBarBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 24,
  },
  text: {
    fontSize: 14,
    color: authColors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
});
