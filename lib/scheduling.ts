export function computeNextReviewAt(now: Date, streak: number): Date {
  const next = new Date(now);
  if (streak <= 1) {
    next.setHours(next.getHours() + 1);
    return next;
  }
  if (streak === 2) {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (streak === 3) {
    next.setDate(next.getDate() + 7);
    return next;
  }
  next.setDate(next.getDate() + 30);
  return next;
}
