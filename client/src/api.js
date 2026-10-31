export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* порожня відповідь */ }
  if (!res.ok) {
    const err = new Error(data?.error || 'Помилка запиту');
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}
