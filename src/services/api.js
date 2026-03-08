import { API_BASE_URL } from '../constants/config';

const getBaseUrl = () => API_BASE_URL;

const getHeaders = async (includeAuth = false, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const createApi = (token) => ({
  get: (path) =>
    fetch(`${getBaseUrl()}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(handleResponse),
  post: (path, body, auth = false) =>
    fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }).then(handleResponse),
  put: (path, body) =>
    fetch(`${getBaseUrl()}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(handleResponse),
  delete: (path) =>
    fetch(`${getBaseUrl()}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(handleResponse),
});

/**
 * Get list of transcripts for the current user.
 */
export async function getTranscripts(token) {
  const res = await fetch(`${getBaseUrl()}/transcripts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load transcripts');
  return data;
}

/**
 * Semantic search over transcripts using Groq embeddings.
 * @param {string} token - Auth token
 * @param {string} query - User's search description
 * @returns {Promise<Array>} Sorted transcripts by relevance
 */
export async function searchTranscripts(token, query) {
  const res = await fetch(`${getBaseUrl()}/transcripts/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: (query || '').trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Search failed');
  return data;
}

/**
 * Get a single transcript with conversations.
 */
export async function getTranscript(token, id) {
  const res = await fetch(`${getBaseUrl()}/transcripts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load transcript');
  return data;
}

/**
 * Upload recording file to backend. FormData with field "recording".
 * @param {string} token - Auth token
 * @param {object} file - { uri, type?, name? } (native) or { blob, type?, name? } (web)
 * @returns {Promise<{ id, recordingUrl, status }>}
 */
export async function uploadRecording(token, file) {
  const formData = new FormData();
  if (file.blob) {
    formData.append('recording', file.blob, file.name || 'recording.webm');
  } else {
    formData.append('recording', {
      uri: file.uri,
      type: file.type || 'audio/m4a',
      name: file.name || 'recording.m4a',
    });
  }
  const res = await fetch(`${getBaseUrl()}/transcripts/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do not set Content-Type; let the client set multipart boundary
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Upload failed');
  return data;
}

export const authApi = {
  signup: (name, email, password) =>
    fetch(`${getBaseUrl()}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }).then(handleResponse),
  verifyOtp: (email, otp, name, password) =>
    fetch(`${getBaseUrl()}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, name, password }),
    }).then(handleResponse),
  login: (email, password) =>
    fetch(`${getBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),
  forgotPassword: (email) =>
    fetch(`${getBaseUrl()}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handleResponse),
  resetPassword: (email, otp, newPassword, confirmPassword) =>
    fetch(`${getBaseUrl()}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
    }).then(handleResponse),
};
