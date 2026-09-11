export const APPLICATION_STATUS = {
  pending: 'pending',
  accepted: 'accepted',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
} as const;
export const APPLICATION = {
  pitchLength: 1000,
  pageSize: 20,
  cursorLength: 512,
  requestsPerMinute: 30,
} as const;
export const APPLICATION_PATH = {
  feed: '/v1/creator/feed',
  brandInbox: '/v1/brand/applications',
  apply: '/v1/creator/campaigns/:id/applications',
  dismiss: '/v1/creator/campaigns/:id/dismiss',
  own: '/v1/creator/applications',
  brand: '/v1/brand/campaigns/:id/applications',
  accept: '/v1/brand/applications/:id/accept',
  reject: '/v1/brand/applications/:id/reject',
} as const;
export function creatorCampaignActionPath(
  id: string,
  action: 'applications' | 'dismiss'
) {
  return (
    action === 'applications'
      ? APPLICATION_PATH.apply
      : APPLICATION_PATH.dismiss
  ).replace(':id', encodeURIComponent(id));
}
export function brandApplicationsPath(id: string) {
  return APPLICATION_PATH.brand.replace(':id', encodeURIComponent(id));
}
export function applicationDecisionPath(
  id: string,
  action: 'accept' | 'reject'
) {
  return (
    action === 'accept' ? APPLICATION_PATH.accept : APPLICATION_PATH.reject
  ).replace(':id', encodeURIComponent(id));
}
export const APPLICATION_MESSAGE = {
  creatorOnly: 'Bitte richte zuerst ein Creator-Profil ein.',
  brandOnly: 'Nur die zuständige Brand kann diese Bewerbung verwalten.',
  notFound: 'Bewerbung nicht gefunden.',
  campaignNotFound: 'Kampagne nicht gefunden.',
  unavailable: 'Diese Kampagne nimmt keine Bewerbungen mehr an.',
  full: 'Alle Creator-Plätze sind bereits vergeben.',
  changed:
    'Die Kampagne wurde geändert. Bitte lade sie neu und prüfe die Bedingungen.',
  decided: 'Diese Bewerbung wurde bereits abschließend bearbeitet.',
  dismissed: 'Diese Kampagne hast du bereits als nicht interessiert markiert.',
  applied: 'Für diese Kampagne liegt bereits eine Bewerbung vor.',
  invalid: 'Bitte prüfe deine Bewerbung.',
  invalidCursor: 'Ungültige Seitennavigation.',
  invalidQuery: 'Ungültiger Filter.',
  capacity:
    'Die Anzahl der Plätze darf nicht unter den bereits angenommenen Bewerbungen liegen.',
} as const;
