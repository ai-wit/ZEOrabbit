import crypto from "crypto";

const RESET_TOKEN_TTL_MINUTES = 60 * 24;

function sha256Base64Url(input: string): string {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

export function createPasswordResetToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export function hashPasswordResetToken(token: string): string {
  return sha256Base64Url(token);
}

