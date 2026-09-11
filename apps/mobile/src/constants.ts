export const TIMEOUT = {
  authMs: 10000,
  requestMs: 12000,
  discoveryMs: 8000,
} as const;
export const ROUTE = {
  home: '/',
  brandInbox: '/BrandInbox',
  messages: '/Messages',
  creatorFeed: '/CreatorFeed',
  myApplications: '/MyApplications',
  brandApplications: '/BrandApplications',
  profile: '/profile_tmp',
  signIn: '/SignIn',
  signUp: '/SignUp',
  forgotPassword: '/ForgotPassword',
  brandCampaigns: '/BrandCampaigns',
  campaignForm: '/BrandCampaignForm',
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
