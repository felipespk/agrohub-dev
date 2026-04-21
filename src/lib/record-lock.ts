/**
 * 48-hour record lock utility.
 * Uses the `created_at` timestamp from the database (never the document date).
 */

const LOCK_THRESHOLD_HOURS = 48;

export function isRecordLocked(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > LOCK_THRESHOLD_HOURS;
}

export function getRecordAgeHours(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60);
}
