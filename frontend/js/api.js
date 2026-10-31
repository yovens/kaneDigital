// Kliyan HTTP pou API Laravel la. Token Sanctum lan sere nan localStorage.

const TOKEN_KEY = 'kane.token';
const API_BASE = (window.KANE_API_BASE ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, errors = {}, code = null, offline = false } = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.code = code;
    this.offline = offline;
  }

  /** Premye mesaj erè pou yon chan, oswa null. */
  field(name) {
    return this.errors?.[name]?.[0] ?? null;
  }
}

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* navigatè prive: token an rete an memwa sèlman */ }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Pa gen koneksyon entènèt.', { offline: true });
  }

  let data = null;
  try { data = await res.json(); } catch { /* repons vid */ }

  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('kane:unauthorized'));
    const message = data?.message || (res.status >= 500
      ? 'Sèvè a gen yon pwoblèm. Eseye ankò nan kèk minit.'
      : 'Demann lan pa pase.');
    throw new ApiError(message, { status: res.status, errors: data?.errors, code: data?.code });
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
};
