/**
 * Web stub for audio recording - expo-av Recording is not supported on web.
 * Use this to avoid bundling expo-av on web (fixes "Unable to resolve Recording.types").
 */
export const isRecordingSupported = false;

export async function requestPermissionsAsync() {
  return { status: 'undetermined', granted: false };
}

export async function setAudioModeAsync() {
  // No-op on web
}

export const RecordingOptionsPresets = { HIGH_QUALITY: {} };

export const Recording = {
  createAsync: async () => {
    throw new Error('Audio recording is not supported on web. Please use the iOS or Android app.');
  },
};
