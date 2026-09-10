export const TIMEOUT = {
  authMs: 10000,
  requestMs: 12000,
  discoveryMs: 8000,
} as const;
export const ROUTE = {
  home: '/',
  profile: '/profile',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  brandCampaigns: '/brand-campaigns',
  campaignForm: '/brand-campaign-form',
} as const;
export const FILTER_ALL = 'all';
export const MONEY = {
  minorPerUnit: 100,
  defaultCurrency: 'EUR',
  locale: 'de-DE',
} as const;
export const CAMPAIGN_STATUS_LABEL = {
  draft: 'Entwurf',
  published: 'Veröffentlicht',
  closed: 'Geschlossen',
} as const;
export const DEAL_LABEL = {
  barter: 'Barter · Produkt',
  paid: 'Paid · Honorar',
} as const;
