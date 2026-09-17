export const STATUS_LABEL = {
  pending: 'Offen',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  withdrawn: 'Zurückgezogen',
} as const;
export const DECISION = { accept: 'accept', reject: 'reject' } as const;
export type Decision = (typeof DECISION)[keyof typeof DECISION];

export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/';
