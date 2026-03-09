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
import { uploadRecording } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { homeColors } from '../../theme/homeColors';

const RecordingState = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PAUSED: 'paused',
};

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

export default function AssistantView({
  onUploadSuccess,
  onSwitchToTranscript,
  onStartRecording,
  onMainViewChange,
  startInChatView = false,
  onConsumedNewChat,
  messages: messagesProp,
  onSendMessage: onSendMessageProp,
  sending = false,
}) {
  const { token, user } = useAuth();
  const userName = user?.name?.split?.(' ')?.[0] || 'there';
  const [searchQuery, setSearchQuery] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const [forceShowChat, setForceShowChat] = useState(false);
  const chatScrollRef = React.useRef(null);

  const isControlled = onSendMessageProp != null;
  const messages = isControlled ? (messagesProp ?? []) : localMessages;
  const [recording, setRecording] = useState(null);
  const [recordingState, setRecordingState] = useState(RecordingState.IDLE);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const rec = recording;
    try {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);
      setRecordingState(RecordingState.IDLE);
      setRecordingDuration(0);

      if (uri && token) {
        setUploading(true);
        try {
          const result = await uploadRecording(token, {
            uri,
            type: 'audio/m4a',
            name: `recording-${Date.now()}.m4a`,
          });
          onUploadSuccess?.(result);
          if (onSwitchToTranscript) onSwitchToTranscript();
          Alert.alert(
            'Recording saved',
            'Your conversation is being transcribed. View it in the Transcript tab when ready.'
          );
        } catch (err) {
          console.warn('Upload error:', err);
          Alert.alert('Upload failed', err?.message || 'Could not upload recording. Please try again.');
        } finally {
          setUploading(false);
        }
      } else if (uri && !token) {
        Alert.alert('Not signed in', 'Sign in to save and transcribe recordings.');
      }
    } catch (err) {
      console.warn('Stop recording error:', err);
      setUploading(false);
    }
  }, [recording, token, onUploadSuccess, onSwitchToTranscript]);

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

  const handleSendMessage = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || recordingState !== RecordingState.IDLE || sending) return;
    if (isControlled && onSendMessageProp) {
      onSendMessageProp(trimmed);
      setSearchQuery('');
      setTimeout(() => chatScrollRef.current?.scrollToEnd?.({ animated: true }), 100);
      return;
    }
    setLocalMessages((prev) => [
      ...prev,
      { role: 'user', text: trimmed },
      { role: 'assistant', text: 'Searching precise transcri...', isLoading: true },
    ]);
    setSearchQuery('');
    setTimeout(() => chatScrollRef.current?.scrollToEnd?.({ animated: true }), 100);
  };

  const showChat = messages.length > 0 || forceShowChat;

  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => chatScrollRef.current?.scrollToEnd?.({ animated: true }), 150);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  useEffect(() => {
    if (startInChatView) {
      setForceShowChat(true);
      onConsumedNewChat?.();
    }
  }, [startInChatView, onConsumedNewChat]);

  useEffect(() => {
    onMainViewChange?.(!showChat);
  }, [showChat, onMainViewChange]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        ref={chatScrollRef}
        contentContainerStyle={[styles.scrollContent, showChat && styles.chatScrollContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerSection}>
          {showChat ? (
            /* Chat UI - ChatGPT style */
            <View style={styles.chatArea}>
              {messages.map((msg, idx) =>
                msg.role === 'user' ? (
                  <View key={idx} style={styles.userBubbleRow}>
                    <View style={styles.userBubble}>
                      <Text style={styles.bubbleText} numberOfLines={10}>
                        {msg.text}
                      </Text>
                    </View>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{getInitials(user?.name)}</Text>
                    </View>
                  </View>
                ) : (
                  <View key={idx} style={styles.assistantBubbleRow}>
                    <View style={styles.assistantAvatar}>
                      <Ionicons name="sparkles" size={20} color={homeColors.accent} />
                    </View>
                    <View style={[styles.assistantBubble, msg.isError && styles.assistantBubbleError]}>
                      {msg.isLoading ? (
                        <ActivityIndicator size="small" color={homeColors.accent} />
                      ) : (
                        <Text style={[styles.bubbleTextAssistant, msg.isError && styles.bubbleTextError]} numberOfLines={undefined}>
                          {msg.text}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              )}
            </View>
          ) : (
            <>
              {/* Greeting section - design spec */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>Hi, {userName}!{'\n'}How can I help you ?</Text>
                <Text style={styles.greetingHint}>Ready to record, transcribe ?</Text>
              </View>

              {/* Start Recording button - rgba(165, 100, 255, 0.13), #9810FA */}
              {uploading ? (
            <View style={styles.uploadingCard}>
              <ActivityIndicator size="large" color={homeColors.accent} />
              <Text style={styles.uploadingText}>Saving & transcribing…</Text>
            </View>
          ) : recordingState === RecordingState.IDLE ? (
            <TouchableOpacity
              style={[
                styles.startRecordingBtn,
                !onStartRecording && !isRecordingSupported && styles.startRecordingDisabled,
              ]}
              onPress={() => {
                if (onStartRecording) {
                  onStartRecording();
                } else {
                  startRecording();
                }
              }}
              disabled={(!onStartRecording && !isRecordingSupported) || permissionLoading}
              activeOpacity={0.7}
            >
              {permissionLoading ? (
                <ActivityIndicator size="small" color={homeColors.accent} />
              ) : (
                <Ionicons name="mic" size={24} color={homeColors.accent} />
              )}
              <Text style={styles.startRecordingLabel}>Start Recording</Text>
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
            </>
          )}

          {/* Message input bar - design spec */}
          <View style={styles.messageWrapper}>
            <View style={styles.messageBar}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message"
                placeholderTextColor={homeColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                multiline
                maxLength={4000}
                editable={recordingState === RecordingState.IDLE}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                style={[styles.sendBtn, searchQuery.trim().length > 0 && !sending && styles.sendBtnActive]}
                disabled={searchQuery.trim().length === 0 || sending}
                onPress={handleSendMessage}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={24}
                  color={searchQuery.trim().length > 0 ? '#fff' : '#000000'}
                />
              </TouchableOpacity>
            </View>
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
  chatScrollContent: {
    justifyContent: 'flex-start',
    paddingBottom: 24,
  },
  chatArea: {
    width: '100%',
    gap: 20,
  },
  userBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 8,
  },
  userBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 217, 217, 0.2)',
  },
  bubbleText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 17,
    color: '#6A7282',
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: homeColors.accent,
  },
  assistantBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  assistantAvatar: {
    width: 38,
    height: 38,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 217, 217, 0.2)',
  },
  bubbleTextAssistant: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#6A7282',
  },
  bubbleTextError: {
    color: '#dc2626',
  },
  assistantBubbleError: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  centerSection: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  greetingSection: {
    marginBottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center',
  },
  greetingHint: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center',
  },
  messageWrapper: {
    width: '100%',
    marginTop: 24,
  },
  messageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 8,
    gap: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.004)',
    borderWidth: 1,
    borderColor: 'rgba(153, 161, 175, 0.29)',
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
  messageInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: '#000000',
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
  sendBtn: {
    width: 58,
    height: 54,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.004)',
    borderWidth: 1,
    borderColor: '#E0E3E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: homeColors.accent,
    borderColor: homeColors.accent,
  },
  startRecordingBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
    paddingRight: 36,
    gap: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(165, 100, 255, 0.13)',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  startRecordingDisabled: {
    opacity: 0.6,
  },
  startRecordingLabel: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: '#9810FA',
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
  uploadingCard: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: homeColors.textSecondary,
  },
});
