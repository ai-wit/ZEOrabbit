import crypto from 'crypto';

type TossApiError = {
  code?: string;
  message?: string;
};

type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  method?: string;
  // We intentionally keep it open for future use.
  [key: string]: unknown;
};

type TossBillingKeyIssueResponse = {
  billingKey: string;
  customerKey: string;
  authenticatedAt?: string;
  // We intentionally keep it open for future use.
  [key: string]: unknown;
};

type TossBillingChargeResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  // We intentionally keep it open for future use.
  [key: string]: unknown;
};

const TOSS_API_BASE = 'https://api.tosspayments.com';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBasicAuthHeader(secretKey: string): string {
  // TossPayments uses Basic auth with "secretKey:" as the username/password pair.
  const token = Buffer.from(`${secretKey}:`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

async function tossFetch<T>(
  path: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const secretKey = requireEnv('TOSS_PAYMENTS_SECRET_KEY');

  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: getBasicAuthHeader(secretKey),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = (json as TossApiError) || {};
    const msg = err.message || `TossPayments API error (${res.status})`;
    const code = err.code ? ` (${err.code})` : '';
    throw new Error(`${msg}${code}`);
  }

  return json as T;
}

export function getPublicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  );
}

export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResponse> {
  return await tossFetch<TossConfirmResponse>('/v1/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getTossPayment(paymentKey: string): Promise<TossConfirmResponse> {
  return await tossFetch<TossConfirmResponse>(`/v1/payments/${encodeURIComponent(paymentKey)}`, {
    method: 'GET',
  });
}

export async function issueTossBillingKey(params: {
  authKey: string;
  customerKey: string;
}): Promise<TossBillingKeyIssueResponse> {
  return await tossFetch<TossBillingKeyIssueResponse>('/v1/billing/authorizations/issue', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function chargeTossBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<TossBillingChargeResponse> {
  const { billingKey, ...body } = params;

  return await tossFetch<TossBillingChargeResponse>(`/v1/billing/${encodeURIComponent(billingKey)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function verifyTossWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
}): boolean {
  const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return true; // If not configured, we can't verify. Caller should add alternative checks.
  if (!params.signatureHeader) return false;

  // Expected format (v1 style): "t=timestamp,v1=hexsignature"
  const parts = params.signatureHeader.split(',').map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Part = parts.find((p) => p.startsWith('v1='));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const received = v1Part.slice(3);
  if (!timestamp || !received) return false;

  const payload = `${timestamp}.${params.rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(received, 'utf8'));
  } catch {
    return false;
  }
}
