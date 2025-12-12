export function getClientIp(headers: Headers): string | null {
  const xf = headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const xr = headers.get("x-real-ip");
  if (xr) return xr.trim();
  return null;
}


