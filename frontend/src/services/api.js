const normalizeBaseUrl = (base) => {
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

const guessLocalBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8080';
  }

  const { protocol, hostname, port } = window.location;
  if (port) {
    return `${protocol}//${hostname}:${port}`;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8080`;
  }

  return `${protocol}//${hostname}`;
};

const API_BASE_URL = normalizeBaseUrl(
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
    guessLocalBaseUrl()
);

const jsonRequest = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
    mode: 'cors',
    credentials: 'omit',
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
};

export const startDeploymentSession = async (metadata = {}) =>
  jsonRequest('/api/deployment/start', {
    method: 'POST',
    body: JSON.stringify(metadata),
  });

export default {
  startDeploymentSession,
};
