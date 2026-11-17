const MAX_GUARD_MS = 15 * 24 * 60 * 60 * 1000;

export function validateGuardInterval(startsAt, endsAt) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end))
    return { valid: false, reason: "invalid-date" };
  if (end <= start) return { valid: false, reason: "non-positive-window" };
  if (end - start > MAX_GUARD_MS)
    return { valid: false, reason: "over-15-days" };
  return { valid: true, reason: null };
}
