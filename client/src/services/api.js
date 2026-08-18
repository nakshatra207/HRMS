const BASE_URL = '/api/applications';

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function getApplications({ search = '', status = 'All' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status && status !== 'All') params.set('status', status);

  const query = params.toString();
  const res = await fetch(`${BASE_URL}${query ? `?${query}` : ''}`);
  return handleResponse(res);
}

export async function createApplication(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateApplication(id, data) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteApplication(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function getStats() {
  const res = await fetch('/api/stats');
  return handleResponse(res);
}
