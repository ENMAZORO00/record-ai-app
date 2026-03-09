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
 * Chat with the assistant: search transcripts and get an answer. Supports follow-up questions.
 * @param {string} token - Auth token
 * @param {Array<{ role: 'user'|'assistant', text?: string, content?: string }>} messages - Chat history
 * @returns {Promise<{ content: string }>}
 */
const ASSISTANT_TIMEOUT_MS = 45000

export async function assistantChat(token, messages) {
  const formatted = (messages || []).map((m) => ({
    role: m.role,
    content: (m.text ?? m.content ?? '').toString().trim(),
  })).filter((m) => m.role && m.content)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS)
  try {
    const res = await fetch(`${getBaseUrl()}/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: formatted }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Assistant failed')
    return data
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.')
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get list of chats for the current user.
 * @param {string} token - Auth token
 * @param {string} search - Optional search query
 * @returns {Promise<{ chats: Array<{ id, title, updatedAt }> }>}
 */
export async function getChats(token, search = '') {
  const params = new URLSearchParams();
  if (search && search.trim()) params.set('search', search.trim());
  const qs = params.toString();
  const url = `${getBaseUrl()}/chats${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load chats');
  return data;
}

/**
 * Get a single chat with messages.
 * @param {string} token - Auth token
 * @param {string} id - Chat ID
 * @returns {Promise<{ chat: { id, title, messages, updatedAt } }>}
 */
export async function getChat(token, id) {
  const res = await fetch(`${getBaseUrl()}/chats/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load chat');
  return data;
}

/**
 * Create a new chat with first user message.
 * @param {string} token - Auth token
 * @param {object} body - { title, content }
 * @returns {Promise<{ chat: { id, title, messages, updatedAt } }>}
 */
const CHAT_TIMEOUT_MS = 45000;

export async function createChat(token, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  try {
    const res = await fetch(`${getBaseUrl()}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to create chat');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Add message to existing chat.
 * @param {string} token - Auth token
 * @param {string} chatId - Chat ID
 * @param {object} body - { content }
 * @returns {Promise<{ content: string }>}
 */
export async function addChatMessage(token, chatId, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  try {
    const res = await fetch(`${getBaseUrl()}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to send message');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Delete a chat.
 * @param {string} token - Auth token
 * @param {string} id - Chat ID
 */
export async function deleteChat(token, id) {
  const res = await fetch(`${getBaseUrl()}/chats/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to delete chat');
  return data;
}

/**
 * Delete a transcript (and its audio from Azure).
 * @param {string} token - Auth token
 * @param {string} id - Transcript ID
 */
export async function deleteTranscript(token, id) {
  const res = await fetch(`${getBaseUrl()}/transcripts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to delete transcript')
  }
  return
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
