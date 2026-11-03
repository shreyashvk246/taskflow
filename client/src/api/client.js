const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskflow_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Please check your connection.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw new ApiError(res.status, data.error || 'Something went wrong', data.details);
  }
  return data;
}

const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
};

export const api = {
  login: (body) => request('POST', '/auth/login', body),
  register: (body) => request('POST', '/auth/register', body),
  me: () => request('GET', '/auth/me'),
  updateProfile: (body) => request('PUT', '/auth/me', body),
  changePassword: (body) => request('PUT', '/auth/me/password', body),

  dashboard: () => request('GET', '/dashboard'),

  users: (params) => request('GET', `/users${qs(params)}`),
  createUser: (body) => request('POST', '/users', body),
  updateUser: (id, body) => request('PUT', `/users/${id}`, body),
  deleteUser: (id) => request('DELETE', `/users/${id}`),

  projects: (params) => request('GET', `/projects${qs(params)}`),
  project: (id) => request('GET', `/projects/${id}`),
  createProject: (body) => request('POST', '/projects', body),
  updateProject: (id, body) => request('PUT', `/projects/${id}`, body),
  deleteProject: (id) => request('DELETE', `/projects/${id}`),

  tasks: (params) => request('GET', `/tasks${qs(params)}`),
  task: (id) => request('GET', `/tasks/${id}`),
  createTask: (body) => request('POST', '/tasks', body),
  updateTask: (id, body) => request('PUT', `/tasks/${id}`, body),
  updateTaskStatus: (id, status) => request('PATCH', `/tasks/${id}/status`, { status }),
  deleteTask: (id) => request('DELETE', `/tasks/${id}`),
  comments: (taskId) => request('GET', `/tasks/${taskId}/comments`),
  addComment: (taskId, body) => request('POST', `/tasks/${taskId}/comments`, { body }),
  deleteComment: (taskId, id) => request('DELETE', `/tasks/${taskId}/comments/${id}`),

  activity: (params) => request('GET', `/activity${qs(params)}`),
};
