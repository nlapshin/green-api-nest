/**
 * Redacts high-entropy secrets for logs and error surfaces.
 * Never log full apiTokenInstance.
 */
export function maskApiToken(token: string): string {
  const t = token.trim();
  if (t.length <= 8) {
    return '***';
  }
  const head = t.slice(0, 4);
  const tail = t.slice(-2);
  return `${head}…${tail}`;
}

export function maskUrlSensitive(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length > 8) {
      parts[parts.length - 1] = maskApiToken(last);
      u.pathname = '/' + parts.join('/');
    }
    return u.toString();
  } catch {
    return '[invalid-url]';
  }
}
