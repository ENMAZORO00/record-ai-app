import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Catches errors from Google auth and shows the error so we can debug.
 */
class GoogleAuthErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log for debugging
    if (__DEV__) {
      console.error('Google auth error:', error?.message || error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Google Sign-In unavailable</Text>
          <Text style={styles.errorText} selectable>
            {msg}
          </Text>
        </View>
      );
    }
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b91c1c',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    fontFamily: 'monospace',
  },
});

export default function GoogleAuthSafe({ children }) {
  return <GoogleAuthErrorBoundary>{children}</GoogleAuthErrorBoundary>;
}
