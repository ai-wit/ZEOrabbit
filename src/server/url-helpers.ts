/**
 * Get the correct base URL from request, respecting reverse proxy headers
 */
export function getBaseUrl(req: Request): string {
  const headers = req.headers;
  
  // Check for reverse proxy headers (Nginx, etc.)
  const forwardedProto = headers.get('x-forwarded-proto');
  const forwardedHost = headers.get('x-forwarded-host');
  
  if (forwardedHost) {
    const protocol = forwardedProto || 'https';
    return `${protocol}://${forwardedHost}`;
  }
  
  // Fallback to request URL
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

