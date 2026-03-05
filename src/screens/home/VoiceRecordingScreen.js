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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VoiceRecordingScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [recording, setRecording] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const durationRef = useRef(null);
  const recordingRef = useRef(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

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
    try {
      const { recording: newRecording } = await Recording.createAsync(
        RecordingOptionsPresets?.HIGH_QUALITY ?? {}
      );
      setRecording(newRecording);
      setRecordingDuration(0);
      durationRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Start recording error:', err);
      Alert.alert('Error', 'Could not start recording.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  }, [navigation]);

  const stopAndSave = useCallback(async () => {
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

      if (uri && token) {
        setUploading(true);
        try {
          const result = await uploadRecording(token, {
            uri,
            type: 'audio/m4a',
            name: `recording-${Date.now()}.m4a`,
          });
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
      } else if (uri && !token) {
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
    }
    navigation.goBack();
  }, [recording, navigation]);

  useEffect(() => {
    if (!permissionGranted) {
      requestPermissions().then((ok) => ok && startRecording());
    } else {
      startRecording();
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

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
          <Text style={styles.headerTitle}>Voice Recording..</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main content */}
        <View style={styles.mainSection}>
          <Text style={styles.instruction}>Go ahead I'm Listening</Text>

          {/* Central orb / glowing area */}
          <View style={styles.orbContainer}>
            <View style={styles.orbBlur1} />
            <View style={styles.orbBlur2} />
            <View style={styles.orbCenter}>
              <LinearGradient
                colors={['rgba(174, 108, 255, 0.4)', 'rgba(112, 202, 255, 0.4)', 'rgba(255, 200, 230, 0.3)']}
                style={styles.orbGradient}
              />
            </View>
          </View>

          {/* Status text */}
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>
              {uploading ? 'Saving & transcribing…' : "I'm listening..."}
            </Text>
            <Text style={styles.statusSubtitle}>
              {uploading
                ? 'Please wait'
                : "I'm capturing your conversation, organizing key notes, and saving the transcript live."}
            </Text>
          </View>

          {/* Bottom controls */}
          <View style={[styles.controls, { bottom: insets.bottom + 100 }]}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => {}}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.controlBtnInner}>
                <Ionicons name="keypad-outline" size={24} color="#2B7FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.micBtnWrap}
              onPress={stopAndSave}
              activeOpacity={0.85}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.micBtn}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <>
                  <View style={styles.micRing3} />
                  <View style={styles.micRing2} />
                  <View style={styles.micRing1} />
                  <LinearGradient
                    colors={['#035BFA', '#4084FF', '#658FDB']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.micBtn}
                  >
                    <Ionicons name="mic" size={30} color="#FFFFFF" />
                  </LinearGradient>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={cancelRecording}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.controlBtnInner}>
                <Ionicons name="close" size={28} color="#2B7FFF" />
              </View>
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
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 22,
    color: '#000000',
    textAlign: 'center',
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
    justifyContent: 'space-between',
  },
  controlBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 6.6 },
      android: { elevation: 6 },
    }),
  },
  controlBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnWrap: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
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
