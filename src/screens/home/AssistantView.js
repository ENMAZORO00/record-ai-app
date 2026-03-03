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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  requestPermissionsAsync,
  setAudioModeAsync,
  Recording,
  RecordingOptionsPresets,
  isRecordingSupported,
} from '../../services/audioRecorder';
import { homeColors } from '../../theme/homeColors';
import AssistantButton from '../../components/AssistantButton';

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
          <Text style={styles.greeting}>Record a conversation</Text>
          <Text style={styles.hint}>
            Type a prompt or start recording to capture audio
          </Text>

          {/* ChatGPT-style search bar */}
          <View style={styles.searchWrapper}>
            <BlurView intensity={50} tint="light" style={styles.searchBar}>
              <Ionicons
                name="search"
                size={20}
                color={homeColors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Ask anything or start recording..."
                placeholderTextColor={homeColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                editable={recordingState === RecordingState.IDLE}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={homeColors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </BlurView>
          </View>

          {/* Recording duration indicator */}
          {(recordingState === RecordingState.RECORDING ||
            recordingState === RecordingState.PAUSED) && (
            <View style={styles.durationRow}>
              <View
                style={[
                  styles.recIndicator,
                  recordingState === RecordingState.PAUSED && styles.recPaused,
                ]}
              />
              <Text style={styles.durationText}>
                {formatDuration(recordingDuration)}
              </Text>
              {recordingState === RecordingState.PAUSED && (
                <Text style={styles.pausedLabel}>Paused</Text>
              )}
            </View>
          )}

          {/* Web: recording not supported */}
          {!isRecordingSupported && (
            <Text style={styles.webHint}>
              Audio recording is available on iOS and Android. Open the app on your phone to record conversations.
            </Text>
          )}

          {/* Recording control buttons */}
          <View style={styles.controlsRow}>
            {recordingState === RecordingState.IDLE && (
              <AssistantButton
                variant="start"
                onPress={startRecording}
                loading={permissionLoading}
                label="Start Recording"
                size="large"
                disabled={!isRecordingSupported}
              />
            )}

            {recordingState === RecordingState.RECORDING && (
              <>
                <AssistantButton
                  variant="pause"
                  onPress={pauseRecording}
                  label="Pause"
                />
                <AssistantButton
                  variant="stop"
                  onPress={stopRecording}
                  label="End"
                  active
                />
              </>
            )}

            {recordingState === RecordingState.PAUSED && (
              <>
                <AssistantButton
                  variant="start"
                  onPress={resumeRecording}
                  label="Resume"
                />
                <AssistantButton
                  variant="stop"
                  onPress={stopRecording}
                  label="End Recording"
                  active
                />
              </>
            )}
          </View>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 15,
    color: homeColors.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
  },
  searchWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: homeColors.textPrimary,
    padding: 0,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  recIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
    opacity: 1,
  },
  recPaused: {
    opacity: 0.5,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '600',
    color: homeColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  pausedLabel: {
    fontSize: 14,
    color: homeColors.textMuted,
    fontStyle: 'italic',
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  webHint: {
    fontSize: 14,
    color: homeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
});
