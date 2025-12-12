export function maskAccountNumber(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length <= 4) return "****";
  const last4 = digits.slice(-4);
  return `****-****-${last4}`;
}


