// Small helper for talking to the PHP API on the same site.
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-PHOMI': '1', Accept: 'application/json' };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('Could not reach the website server. Check your connection and try again.', 0);
  }
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok || !type.includes('json')) {
    throw new ApiError(data.error || (res.status === 404 ? 'The website server is not set up yet.' : 'Something went wrong. Please try again.'), res.status, data);
  }
  return data;
}
