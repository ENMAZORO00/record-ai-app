/**
 * Web audio recording via MediaRecorder API.
 * Supports start, pause, resume, stop. Outputs webm.
 */
let mediaStream = null;

export const isRecordingSupported = true;

export async function requestPermissionsAsync() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { status: 'denied', granted: false };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { status: 'granted', granted: true };
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { status: 'denied', granted: false };
    }
    return { status: 'undetermined', granted: false };
  }
}

export async function setAudioModeAsync() {
  // No-op on web
}

export const RecordingOptionsPresets = { HIGH_QUALITY: {} };

const supportsPause =
  typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.prototype?.pause === 'function';

// Audio constraints that avoid over-processing; some browsers strip audio with aggressive echo/noise settings
const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
};

export const Recording = {
  createAsync: async () => {
    const stream = await navigator.mediaDevices.getUserMedia(
      typeof navigator.mediaDevices.getSupportedConstraints?.()?.echoCancellation === 'boolean'
        ? AUDIO_CONSTRAINTS
        : { audio: true }
    );
    mediaStream = stream;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';
    const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    let state = 'recording';

    await new Promise((resolve, reject) => {
      mediaRecorder.onstart = () => resolve();
      mediaRecorder.onerror = (e) => reject(e.error || new Error('Recording failed'));
      // Use 1000ms timeslice for reliability (100ms can cause empty chunks in some browsers)
      mediaRecorder.start(1000);
    });

    const recording = {
      async pauseAsync() {
        if (state !== 'recording') return;
        if (supportsPause && mediaRecorder.state === 'recording') {
          mediaRecorder.pause();
          state = 'paused';
        }
      },

      async startAsync() {
        if (state !== 'paused') return;
        if (supportsPause && mediaRecorder.state === 'paused') {
          mediaRecorder.resume();
          state = 'recording';
        }
      },

      async stopAndUnloadAsync() {
        if (state === 'stopped') return;
        state = 'stopped';
        return new Promise((resolve) => {
          mediaRecorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            mediaStream = null;
            resolve();
          };
          // Force flush of buffered data before stop (helps Safari/Chrome with final chunk)
          if (mediaRecorder.state === 'recording' && typeof mediaRecorder.requestData === 'function') {
            mediaRecorder.requestData();
          }
          mediaRecorder.stop();
        });
      },

      getURI() {
        if (chunks.length === 0) return null;
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        return URL.createObjectURL(blob);
      },

      getBlob() {
        if (chunks.length === 0) return null;
        return new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      },

      getMimeType() {
        return mediaRecorder.mimeType || 'audio/webm';
      },
    };

    return { recording };
  },
};
