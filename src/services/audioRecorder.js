/**
 * Native audio recording via expo-av (iOS/Android)
 */
import { Audio } from 'expo-av';

export const isRecordingSupported = true;

export const requestPermissionsAsync = Audio.requestPermissionsAsync;
export const setAudioModeAsync = Audio.setAudioModeAsync;
export const Recording = Audio.Recording;
export const RecordingOptionsPresets = Audio.RecordingOptionsPresets;
