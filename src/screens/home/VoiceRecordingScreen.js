import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  requestPermissionsAsync,
  setAudioModeAsync,
  Recording,
  RecordingOptionsPresets,
} from '../../services/audioRecorder';
import { uploadRecording } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { homeColors } from '../../theme/homeColors';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Build SVG path for a wavy circle: radius = R + amplitude * sin(waveCount * theta + phase)
function wavyCirclePath(cx, cy, baseRadius, amplitude, waveCount, phase) {
  const steps = 64;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = baseRadius + amplitude * Math.sin(waveCount * theta + phase);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return points.join(' ');
}

const RecordingState = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PAUSED: 'paused',
};

export default function VoiceRecordingScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const meetingId = route?.params?.meetingId ?? null;
  const [recording, setRecording] = useState(null);
  const [recordingState, setRecordingState] = useState(RecordingState.IDLE);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const durationRef = useRef(null);
  const recordingRef = useRef(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Orb animation values
  const orbScale1 = useRef(new Animated.Value(1)).current;
  const orbScale2 = useRef(new Animated.Value(1)).current;
  const orbScaleCenter = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.85)).current;
  const orbAnimRef = useRef(null);

  // Wave circumference animation (runs in JS so path can update)
  const wavePhase = useRef(new Animated.Value(0)).current;
  const [wavePhaseState, setWavePhaseState] = useState(0);
  const waveAnimRef = useRef(null);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const requestPermissions = useCallback(async () => {
    try {
      const { status } = await requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Access',
          'Please grant microphone permission to record conversations.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
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
      Alert.alert('Error', 'Could not access microphone.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      return false;
    }
  }, [navigation]);

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
      Alert.alert('Error', 'Could not start recording.', [{ text: 'OK' }]);
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

  const stopAndSave = useCallback(async () => {
    if (!recording) return;
    const rec = recording;
    try {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI?.();
      const blob = rec.getBlob?.();
      setRecording(null);
      setRecordingState(RecordingState.IDLE);

      const hasData = uri || blob;
      if (hasData && token) {
        setUploading(true);
        try {
          const filePayload = blob
            ? { blob, type: rec.getMimeType?.() || 'audio/webm', name: `recording-${Date.now()}.webm` }
            : { uri, type: 'audio/m4a', name: `recording-${Date.now()}.m4a` };
          await uploadRecording(token, filePayload, meetingId || undefined);
          navigation.navigate('Home', { switchToTranscript: true });
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
      } else if (hasData && !token) {
        Alert.alert('Not signed in', 'Sign in to save and transcribe recordings.');
        navigation.goBack();
      } else {
        navigation.goBack();
      }
    } catch (err) {
      console.warn('Stop recording error:', err);
      setUploading(false);
      navigation.goBack();
    }
  }, [recording, token, navigation]);

  const cancelRecording = useCallback(async () => {
    if (recording) {
      try {
        if (durationRef.current) {
          clearInterval(durationRef.current);
          durationRef.current = null;
        }
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.warn('Cancel recording error:', e);
      }
      setRecording(null);
      setRecordingState(RecordingState.IDLE);
    }
    navigation.goBack();
  }, [recording, navigation]);

  // Central orb animation: breathing pulse that responds to recording state
  useEffect(() => {
    if (orbAnimRef.current) orbAnimRef.current.stop();
    orbScale1.setValue(1);
    orbScale2.setValue(1);
    orbScaleCenter.setValue(1);
    orbOpacity.setValue(0.85);

    const isRecording = recordingState === RecordingState.RECORDING;
    const isPaused = recordingState === RecordingState.PAUSED;
    const duration = isRecording ? 400 : isPaused ? 550 : 450;
    const scaleTo = isRecording ? 1.14 : 1.08;
    const scaleMid = isRecording ? 1.08 : 1.04;
    const opacityTo = isRecording ? 1 : 0.88;

    orbAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale1, { toValue: scaleMid, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(orbScale2, { toValue: scaleTo, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(orbScaleCenter, { toValue: scaleMid, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(orbOpacity, { toValue: opacityTo, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale1, { toValue: scaleTo, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
          Animated.timing(orbScale2, { toValue: scaleMid, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
          Animated.timing(orbScaleCenter, { toValue: scaleTo, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
          Animated.timing(orbOpacity, { toValue: 0.9, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale1, { toValue: scaleMid, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(orbScale2, { toValue: 1.02, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(orbScaleCenter, { toValue: scaleMid, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(orbOpacity, { toValue: 0.88, duration: duration / 2, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale1, { toValue: 1, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
          Animated.timing(orbScale2, { toValue: 1, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
          Animated.timing(orbScaleCenter, { toValue: 1, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
          Animated.timing(orbOpacity, { toValue: 0.85, duration: duration / 2, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
        ]),
      ])
    );
    orbAnimRef.current.start();
    return () => {
      if (orbAnimRef.current) orbAnimRef.current.stop();
    };
  }, [recordingState]);

  // Wave circumference: loop phase 0 -> 2*PI and update state so path re-renders
  useEffect(() => {
    const listenerId = wavePhase.addListener(({ value }) => setWavePhaseState(value));
    const runWave = () => {
      waveAnimRef.current = Animated.timing(wavePhase, {
        toValue: Math.PI * 2,
        duration: 2400,
        useNativeDriver: false,
        easing: Easing.linear,
      });
      waveAnimRef.current.start(({ finished }) => {
        if (finished) {
          wavePhase.setValue(0);
          runWave();
        }
      });
    };
    runWave();
    return () => {
      wavePhase.removeListener(listenerId);
      if (waveAnimRef.current) waveAnimRef.current.stop();
    };
  }, []);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const isIdle = recordingState === RecordingState.IDLE;
  const isRecording = recordingState === RecordingState.RECORDING;
  const isPaused = recordingState === RecordingState.PAUSED;
  const hasRecording = !!recording;

  const handleMicPress = useCallback(() => {
    if (uploading) return;
    if (isIdle) startRecording();
    else if (isRecording) pauseRecording();
    else if (isPaused) resumeRecording();
  }, [uploading, isIdle, isRecording, isPaused, startRecording, pauseRecording, resumeRecording]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const instructionText =
    isIdle ? "Tap the mic to start recording" : isRecording ? "Go ahead I'm listening" : "Paused — tap mic to resume";
  const statusTitle =
    uploading ? 'Saving & transcribing…' : isIdle ? "Ready to record" : isRecording ? "I'm listening..." : "Paused";
  const statusSubtitle =
    uploading
      ? 'Please wait'
      : isIdle
        ? 'Tap the center button to start. Use the stop button to end and save.'
        : isRecording
          ? "I'm capturing your conversation, organizing key notes, and saving the transcript live."
          : 'Tap the mic again to continue recording.';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={cancelRecording}
          activeOpacity={0.7}
          disabled={uploading}
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Voice Recording</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main content */}
      <View style={styles.mainSection}>
        <Text style={styles.instruction}>{instructionText}</Text>

        {/* Central orb / glowing area — animated */}
        <View style={styles.orbContainer}>
          {/* Wavy circumference rings (SVG) */}
          <View style={styles.waveRingsWrap} pointerEvents="none">
            <Svg width={280} height={280} viewBox="0 0 280 280">
              <Path
                d={wavyCirclePath(140, 140, 90, 10, 5, wavePhaseState)}
                fill="none"
                stroke="rgba(112, 202, 255, 0.7)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <Path
                d={wavyCirclePath(170, 130, 90, 10, 5, wavePhaseState + Math.PI * 0.4)}
                fill="none"
                stroke="rgba(174, 108, 255, 0.7)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <Animated.View
            style={[
              styles.orbBlur1,
              {
                transform: [{ scale: orbScale1 }],
                opacity: orbOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orbBlur2,
              {
                transform: [{ scale: orbScale2 }],
                opacity: orbOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orbCenter,
              {
                transform: [{ scale: orbScaleCenter }],
                opacity: orbOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(174, 108, 255, 0.45)', 'rgba(112, 202, 255, 0.45)', 'rgba(255, 200, 230, 0.35)']}
              style={styles.orbGradient}
            />
          </Animated.View>
          {hasRecording && (
            <View style={styles.orbTimerOverlay} pointerEvents="none">
              <Text style={styles.orbTimerText}>{formatDuration(recordingDuration)}</Text>
            </View>
          )}
        </View>

        {/* Status text */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>{statusTitle}</Text>
          <Text style={styles.statusSubtitle}>{statusSubtitle}</Text>
        </View>

        {/* Bottom controls — recording style */}
        <View style={[styles.controls, { bottom: insets.bottom + 100 }]}>
          <TouchableOpacity
            style={[styles.micBtnWrap, (isRecording || isPaused) && styles.micBtnWrapActive]}
            onPress={handleMicPress}
            activeOpacity={0.85}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.micBtn}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <>
                {(isRecording || isPaused) && (
                  <>
                    <View style={styles.micRing3} />
                    <View style={styles.micRing2} />
                    <View style={styles.micRing1} />
                  </>
                )}
                <LinearGradient
                  colors={isRecording ? ['#E53935', '#EF5350'] : ['#035BFA', '#4084FF', '#658FDB']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.micBtn}
                >
                  {isRecording ? (
                    <Ionicons name="pause" size={32} color="#FFFFFF" />
                  ) : isPaused ? (
                    <Ionicons name="play" size={32} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="mic" size={34} color="#FFFFFF" />
                  )}
                </LinearGradient>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stopBtn, !hasRecording && styles.stopBtnDisabled]}
            onPress={hasRecording ? stopAndSave : undefined}
            activeOpacity={0.8}
            disabled={uploading || !hasRecording}
          >
            <View style={[styles.stopBtnInner, hasRecording && styles.stopBtnInnerActive]}>
              <Ionicons name="stop" size={28} color={hasRecording ? '#FFFFFF' : '#9E9E9E'} />
            </View>
            {hasRecording && <Text style={styles.stopBtnLabel}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAFBFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center',
  },
  orbTimerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbTimerText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    fontSize: 48,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSpacer: {
    width: 24,
  },
  mainSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  instruction: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    color: '#2B7FFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  orbContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  waveRingsWrap: {
    position: 'absolute',
    width: 280,
    height: 280,
    left: 0,
    top: 0,
  },
  orbBlur1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(112, 202, 255, 0.28)',
    left: 50,
    top: 50,
    ...Platform.select({
      ios: { shadowColor: 'rgba(112, 202, 255, 0.5)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 44 },
      android: { elevation: 20 },
    }),
  },
  orbBlur2: {
    position: 'absolute',
    width: 180,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(174, 108, 255, 0.28)',
    right: 20,
    top: 30,
    ...Platform.select({
      ios: { shadowColor: 'rgba(174, 108, 255, 0.5)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 44 },
      android: { elevation: 20 },
    }),
  },
  orbCenter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
  },
  orbGradient: {
    flex: 1,
    borderRadius: 100,
  },
  statusSection: {
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  statusTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  micBtnWrap: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnWrapActive: {
    opacity: 1,
  },
  stopBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnDisabled: {
    opacity: 0.6,
  },
  stopBtnInner: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  stopBtnInnerActive: {
    backgroundColor: '#E53935',
    ...Platform.select({
      ios: { shadowColor: '#E53935', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
  },
  stopBtnLabel: {
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 13,
    color: '#E53935',
  },
  micRing1: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1,
    borderColor: 'rgba(152, 16, 250, 0.1)',
  },
  micRing2: {
    position: 'absolute',
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 1,
    borderColor: 'rgba(152, 16, 250, 0.25)',
  },
  micRing3: {
    position: 'absolute',
    width: 93,
    height: 93,
    borderRadius: 46.5,
    borderWidth: 1,
    borderColor: '#E9E8FF',
  },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
