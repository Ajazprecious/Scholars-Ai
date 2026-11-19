const API_URL = import.meta.env.VITE_API_URL || '';
let refreshPromise = null;

async function performRequest(path, options) {
  return fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    body: options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body,
  });
}

export async function apiRequest(path, options = {}) {
  let response = await performRequest(path, options);
  if (response.status === 401 && !path.startsWith('/auth/refresh') && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    refreshPromise ||= fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' }).finally(() => { refreshPromise = null; });
    const refreshed = await refreshPromise;
    if (refreshed.ok) response = await performRequest(path, options);
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

export const authApi = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  verifyEmail: (token) => apiRequest('/auth/verify-email', { method: 'POST', body: { token } }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  google: (credential) => apiRequest('/auth/google', { method: 'POST', body: { credential } }),
  me: () => apiRequest('/auth/me'),
  refresh: () => apiRequest('/auth/refresh', { method: 'POST' }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

export const learningApi = {
  documents: () => apiRequest('/learning/documents'),
  document: (id) => apiRequest(`/learning/documents/${id}`),
  upload: (formData) => apiRequest('/learning/documents', { method: 'POST', body: formData }),
  deleteDocument: (id) => apiRequest(`/learning/documents/${id}`, { method: 'DELETE' }),
  section: (id) => apiRequest(`/learning/sections/${id}`),
  generateLesson: (id) => apiRequest(`/learning/sections/${id}/generate`, { method: 'POST', body: {} }),
  saveProgress: (id, position = {}) => apiRequest(`/learning/progress/${id}`, { method: 'POST', body: { position } }),
  dashboard: () => apiRequest('/learning/dashboard'),
  history: () => apiRequest('/learning/history'),
  conversation: (sectionId) => apiRequest(`/learning/tutor/conversations/${sectionId}`),
  chat: (payload) => apiRequest('/learning/tutor/chat', { method: 'POST', body: payload }),
  generateQuiz: (sectionId, difficulty) => apiRequest(`/learning/quizzes/${sectionId}/${difficulty}/generate`, { method: 'POST', body: {} }),
  quiz: (sectionId, difficulty) => apiRequest(`/learning/quizzes/${sectionId}/${difficulty}`),
  submitQuiz: (quizId, answers) => apiRequest(`/learning/quizzes/${quizId}/submit`, { method: 'POST', body: { answers } }),
  attempts: (documentId) => apiRequest(`/learning/attempts/${documentId}`),
  speech: async (text, voice = 'nova', speed = 1) => {
    const response = await fetch(`${API_URL}/api/learning/tutor/speech`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice, speed }) });
    if (response.status === 401) { await apiRequest('/auth/me'); const retry = await fetch(`${API_URL}/api/learning/tutor/speech`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice, speed }) }); if (!retry.ok) { const data = await retry.json().catch(() => ({})); throw new Error(data.error || 'Speech generation failed'); } return URL.createObjectURL(await retry.blob()); }
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Speech generation failed'); }
    return URL.createObjectURL(await response.blob());
  },
  realtimeSession: (sectionId, voice = 'alloy') => apiRequest('/learning/tutor/realtime-session', { method: 'POST', body: { sectionId, voice } }),
};
