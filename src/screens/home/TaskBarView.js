import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { homeColors } from '../../theme/homeColors';

export default function TaskBarView() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkbox-outline" size={48} color={homeColors.accent} />
      </View>
      <Text style={styles.title}>Task Bar</Text>
      <Text style={styles.subtitle}>
        Track action items and tasks from your recordings. Stay organized and on top of things.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: homeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
