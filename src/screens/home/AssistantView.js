import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  requestPermissionsAsync,
  setAudioModeAsync,
  Recording,
  RecordingOptionsPresets,
  isRecordingSupported,
} from '../../services/audioRecorder';
import { homeColors } from '../../theme/homeColors';

const RecordingState = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PAUSED: 'paused',
};

export default function AssistantView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recording, setRecording] = useState(null);
  const [recordingState, setRecordingState] = useState(RecordingState.IDLE);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const durationRef = React.useRef(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const requestPermissions = useCallback(async () => {
    setPermissionLoading(true);
    try {
      const { status } = await requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Access',
          'Please grant microphone permission to record conversations.',
          [{ text: 'OK' }]
        );
        return false;
      }
      await setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      setPermissionGranted(true);
      return true;
    } catch (err) {
      console.warn('Permission error:', err);
      Alert.alert('Error', 'Could not access microphone.');
      return false;
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!permissionGranted) {
      const ok = await requestPermissions();
      if (!ok) return;
    }

    try {
      const { recording: newRecording } = await Recording.createAsync(
        RecordingOptionsPresets?.HIGH_QUALITY ?? {}
      );
      setRecording(newRecording);
      setRecordingState(RecordingState.RECORDING);
      setRecordingDuration(0);

      durationRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Start recording error:', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  }, [permissionGranted, requestPermissions]);

  const pauseRecording = useCallback(async () => {
    if (!recording || recordingState !== RecordingState.RECORDING) return;
    try {
      await recording.pauseAsync();
      setRecordingState(RecordingState.PAUSED);
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    } catch (err) {
      console.warn('Pause recording error:', err);
    }
  }, [recording, recordingState]);

  const resumeRecording = useCallback(async () => {
    if (!recording || recordingState !== RecordingState.PAUSED) return;
    try {
      await recording.startAsync();
      setRecordingState(RecordingState.RECORDING);
      durationRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Resume recording error:', err);
    }
  }, [recording, recordingState]);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    try {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingState(RecordingState.IDLE);
      setRecordingDuration(0);
      // TODO: Send uri to backend / process transcript
      if (uri) {
        console.log('Recording saved:', uri);
      }
    } catch (err) {
      console.warn('Stop recording error:', err);
    }
  }, [recording]);

  useEffect(() => {
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (recordingState !== RecordingState.RECORDING) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [recordingState]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerSection}>
          <Text style={styles.greeting}>Ask Memory Assistant</Text>

          {/* ChatGPT-style input bar */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for information..."
                placeholderTextColor={homeColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="send"
                multiline
                maxLength={4000}
                editable={recordingState === RecordingState.IDLE}
                underlineColorAndroid="transparent"
              />
              <View style={styles.searchActions}>
                <TouchableOpacity
                  style={[styles.sendBtn, (searchQuery.trim().length > 0) && styles.sendBtnActive]}
                  disabled={searchQuery.trim().length === 0}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={searchQuery.trim().length > 0 ? '#fff' : homeColors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Recording controls */}
          {recordingState === RecordingState.IDLE ? (
            <TouchableOpacity
              style={[styles.startRecordingBtn, !isRecordingSupported && styles.startRecordingDisabled]}
              onPress={startRecording}
              disabled={!isRecordingSupported || permissionLoading}
              activeOpacity={0.85}
            >
              <View style={styles.startRecordingInner}>
                {permissionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="mic" size={32} color="#fff" />
                )}
                <Text style={styles.startRecordingLabel}>Start Recording</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordingCard}>
              <View style={styles.recordingHeader}>
                <Animated.View
                  style={[
                    styles.recIndicatorOuter,
                    recordingState === RecordingState.PAUSED && styles.recPaused,
                    recordingState === RecordingState.RECORDING ? { transform: [{ scale: pulseAnim }] } : null,
                  ]}
                >
                  <View style={styles.recIndicator} />
                </Animated.View>
                <Text style={styles.recordingDuration}>{formatDuration(recordingDuration)}</Text>
                {recordingState === RecordingState.PAUSED && (
                  <View style={styles.pausedBadge}>
                    <Text style={styles.pausedBadgeText}>Paused</Text>
                  </View>
                )}
              </View>
              <View style={styles.recordingActions}>
                {recordingState === RecordingState.RECORDING ? (
                  <TouchableOpacity
                    style={styles.recordingActionBtn}
                    onPress={pauseRecording}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pause" size={24} color={homeColors.textPrimary} />
                    <Text style={styles.recordingActionLabel}>Pause</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.recordingActionBtn}
                    onPress={resumeRecording}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play" size={24} color={homeColors.textPrimary} />
                    <Text style={styles.recordingActionLabel}>Resume</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.recordingActionBtn, styles.stopBtn]}
                  onPress={stopRecording}
                  activeOpacity={0.7}
                >
                  <View style={styles.stopIcon} />
                  <Text style={[styles.recordingActionLabel, styles.stopLabel]}>Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  centerSection: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 28,
    textAlign: 'center',
  },
  searchWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 8,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: homeColors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 120,
    textAlignVertical: 'center',
    borderWidth: 0,
    ...Platform.select({
      web: { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' },
      default: {},
    }),
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: homeColors.accent,
  },
  startRecordingBtn: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    backgroundColor: homeColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: homeColors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  startRecordingDisabled: {
    opacity: 0.6,
  },
  startRecordingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startRecordingLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  recordingCard: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  recIndicatorOuter: {
    padding: 4,
  },
  recIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
  },
  recPaused: {
    opacity: 0.6,
  },
  recordingDuration: {
    fontSize: 28,
    fontWeight: '700',
    color: homeColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  pausedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  pausedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: homeColors.accent,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  recordingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    minWidth: 120,
    justifyContent: 'center',
  },
  recordingActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: homeColors.textPrimary,
  },
  stopBtn: {
    backgroundColor: '#dc2626',
  },
  stopLabel: {
    color: '#fff',
  },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});
