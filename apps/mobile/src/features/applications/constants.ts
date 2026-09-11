export const STATUS_LABEL = {
  pending: 'Offen',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  withdrawn: 'Zurückgezogen',
} as const;
export const DECISION = { accept: 'accept', reject: 'reject' } as const;
export type Decision = (typeof DECISION)[keyof typeof DECISION];
export const SWIPE = {
  startDistance: 12,
  threshold: 90,
  horizontalRatio: 1.5,
  resetDurationMs: 180,
  rotationDegrees: 8,
} as const;
export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/';
