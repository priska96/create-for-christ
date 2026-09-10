// Shared protocol and business rules. Keep API and app validation in sync.
export const APP = {
  name: 'Create For Christ',
  scheme: 'create-for-christ',
  origin: 'create-for-christ://',
  defaultApiUrl: 'http://localhost:3001',
  service: 'create-for-christ-api',
} as const;
export const ROLE = { creator: 'creator', brand: 'brand' } as const;
export const DEAL = { barter: 'barter', paid: 'paid' } as const;
export const CAMPAIGN_STATUS = {
  draft: 'draft',
  published: 'published',
  closed: 'closed',
} as const;
export const AUTH = {
  provider: 'better-auth',
  minPasswordLength: 10,
  maxPasswordLength: 128,
  tokenLifetimeSeconds: 3600,
  sessionLifetimeSeconds: 604800,
  clientIpHeader: 'x-cfc-client-ip',
} as const;
export const LIMITS = {
  shortText: 100,
  optionalText: 200,
  creatorBio: 1000,
  brandDescription: 1500,
  campaignDescription: 2000,
  shippingNotes: 500,
  languages: 10,
  topics: 10,
  portfolioLinks: 5,
  reelUrl: 500,
  website: 300,
  instagramHandle: 30,
  reels: 20,
  reelSeconds: 600,
  creatorSlots: 100,
  mentions: 5,
  usageChannels: 5,
  durationDays: 3650,
  moneyMinor: 2147483647,
  discoveryPage: 20,
} as const;
const MEBIBYTE = 1024 * 1024;
const IMAGE_MAX_BYTES = 5 * MEBIBYTE;
export const IMAGE = {
  maxBytes: IMAGE_MAX_BYTES,
  maxBase64Length: 4 * Math.ceil(IMAGE_MAX_BYTES / 3),
  jsonBodyLimit: 7 * MEBIBYTE,
  maxPixels: 25_000_000,
  maxDimension: 1600,
  outputQuality: 82,
  pickerQuality: 0.8,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  formats: ['jpeg', 'png', 'webp'] as const,
  outputMimeType: 'image/webp',
  outputExtension: 'webp',
  urlPrefix: '/v1/uploads/campaigns/',
} as const;
export const API_PATH = {
  health: '/health',
  ready: '/ready',
  campaigns: '/v1/campaigns',
  brandCampaigns: '/v1/brand/campaigns',
  campaign: '/v1/brand/campaigns/:id',
  publishCampaign: '/v1/brand/campaigns/:id/publish',
  closeCampaign: '/v1/brand/campaigns/:id/close',
  campaignImage: '/v1/brand/campaigns/:id/image',
  image: '/v1/uploads/campaigns/:file',
  me: '/v1/me',
  profile: '/v1/me/profile',
  authPrefix: '/api/auth/',
  auth: '/api/auth/*',
  verified: '/auth/verified',
  resetPassword: '/auth/reset-password',
  resetScript: '/auth/reset.js',
} as const;
export function campaignPath(
  id: string,
  action?: 'publish' | 'close' | 'image'
) {
  return `${API_PATH.brandCampaigns}/${encodeURIComponent(id)}${action ? `/${action}` : ''}`;
}
export const HTTP = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  payloadTooLarge: 413,
  internalError: 500,
  unavailable: 503,
} as const;
export const MESSAGES = {
  signIn: 'Bitte melde dich an.',
  verifyEmail: 'Bitte bestätige deine E-Mail-Adresse.',
  untrustedOrigin: 'Unzulässiger Ursprung.',
  brandOnly: 'Nur Brands können Kampagnen verwalten.',
  invalidCampaign: 'Ungültige Kampagne.',
  campaignInput: 'Bitte prüfe deine Kampagnenangaben.',
  profileInput: 'Bitte prüfe deine Profilangaben.',
  selectImage: 'Bitte ein Bild auswählen.',
  imageTooLarge: 'Das Bild darf höchstens 5 MB groß sein.',
  requestFailed: 'Die Anfrage konnte nicht verarbeitet werden.',
  connection: 'Keine Verbindung. Bitte versuche es erneut.',
  invalidFields: 'Bitte prüfe die markierten Angaben.',
  logoutFailed: 'Abmelden fehlgeschlagen. Bitte erneut versuchen.',
} as const;
