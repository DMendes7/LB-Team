export function startOfWeekUtc(d: Date): Date {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
