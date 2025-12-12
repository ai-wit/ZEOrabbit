export function toDateOnlyUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function* eachDateUtcInclusive(start: Date, end: Date): Generator<Date> {
  const s = toDateOnlyUtc(start);
  const e = toDateOnlyUtc(end);
  for (let d = s; d.getTime() <= e.getTime(); ) {
    yield new Date(d.getTime());
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
}


