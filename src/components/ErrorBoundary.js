import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

/**
 * Catches JavaScript errors in child components to prevent full app crash.
 * In development, consider logging the error to a service.
 */
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In production you could log to a service:
    // console.error('App crash:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || String(this.state.error || 'Unknown error');
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an error. Try closing and reopening, or reinstalling.
          </Text>
          <Text style={styles.errorDetail} selectable>
            {errMsg}
          </Text>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0a0a0a',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#525252',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  errorDetail: {
    fontSize: 12,
    color: '#737373',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
