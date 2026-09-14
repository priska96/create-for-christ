import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  APPLICATION,
  LIMITS,
  applicationInputSchema,
  profileInputSchema,
  campaignInputSchema,
  type CampaignInput,
  type ProfileInput,
} from '@create-for-christ/contracts';

const creator: ProfileInput = {
  role: 'creator',
  displayName: 'Creator',
  bio: '',
  instagramHandle: 'creator.test',
  location: '',
  languages: ['Deutsch'],
  topics: [],
  dealPreferences: ['barter', 'paid'],
  portfolioUrls: [],
};
const brand: ProfileInput = {
  role: 'brand',
  displayName: 'Kontakt',
  brandName: 'Brand',
  description: '',
  website: '',
  industry: 'Food',
  location: '',
};
const campaign: CampaignInput = {
  title: 'Reel',
  productName: 'Produkt',
  description: 'Ein Reel veröffentlichen.',
  compensation: { type: 'barter', productValueMinor: 0 },
  currency: 'EUR',
  reelCount: 1,
  reelLengthSeconds: null,
  creatorSlots: 1,
  contentDeadline: null,
  shippingRequired: false,
  shippingNotes: '',
  requiredMentions: [],
  minPostingDurationDays: null,
  usageDurationDays: null,
  usageChannels: [],
  usagePaidAdsAllowed: false,
};

test('profiles preserve role-specific fields and reject injected ownership or foreign role fields', () => {
  assert.equal(profileInputSchema.safeParse(creator).success, true);
  assert.equal(profileInputSchema.safeParse(brand).success, true);
  for (const value of [
    { ...creator, userId: 'other-user' },
    { ...brand, dealPreferences: ['paid'] },
    { ...creator, brandName: 'Injected' },
  ])
    assert.equal(profileInputSchema.safeParse(value).success, false);
});
for (const [label, change] of Object.entries({
  noLanguage: { languages: [] },
  noDeal: { dealPreferences: [] },
  duplicateDeals: { dealPreferences: ['paid', 'paid'] },
  invalidHandle: { instagramHandle: 'invalid handle' },
  tooManyLinks: {
    portfolioUrls: Array.from(
      { length: LIMITS.portfolioLinks + 1 },
      () => 'https://www.instagram.com/reel/valid/'
    ),
  },
})) {
  test(`creator validation rejects ${label}`, () =>
    assert.equal(
      profileInputSchema.safeParse({ ...creator, ...change }).success,
      false
    ));
}
for (const url of [
  'https://www.instagram.com/p/photo/',
  'http://www.instagram.com/reel/video/',
  'https://instagram.com.evil.test/reel/video/',
  'https://user:password@instagram.com/reel/video/',
  'https://example.test/reel/video/',
]) {
  test(`portfolio rejects non-Reel or unsafe link ${url}`, () =>
    assert.equal(
      profileInputSchema.safeParse({ ...creator, portfolioUrls: [url] })
        .success,
      false
    ));
}
test('valid Reel portfolio URLs and optional website are accepted', () => {
  assert.equal(
    profileInputSchema.safeParse({
      ...creator,
      portfolioUrls: ['https://www.instagram.com/reel/example/'],
    }).success,
    true
  );
  assert.equal(
    profileInputSchema.safeParse({ ...brand, website: 'https://example.test' })
      .success,
    true
  );
});
for (const url of [
  'javascript:alert(1)',
  'ftp://example.test',
  'https://user:password@example.test',
]) {
  test(`brand rejects unsafe website ${url}`, () =>
    assert.equal(
      profileInputSchema.safeParse({ ...brand, website: url }).success,
      false
    ));
}
for (const [label, change] of Object.entries({
  zeroReels: { reelCount: 0 },
  fractionalReels: { reelCount: 1.5 },
  excessiveReels: { reelCount: LIMITS.reels + 1 },
  noSlots: { creatorSlots: 0 },
  excessiveSlots: { creatorSlots: LIMITS.creatorSlots + 1 },
  invalidDate: { contentDeadline: '2026-02-30T00:00:00Z' },
  missingBrief: { description: ' ' },
  currency: { currency: 'EU' },
  invalidMention: { requiredMentions: ['@brand'] },
  zeroUsage: { usageDurationDays: 0 },
  extraOwner: { brandId: 'other-brand' },
})) {
  test(`campaign validation rejects ${label}`, () =>
    assert.equal(
      campaignInputSchema.safeParse({ ...campaign, ...change }).success,
      false
    ));
}
test('money uses bounded integer minor units and paid compensation must be positive', () => {
  assert.equal(campaignInputSchema.safeParse(campaign).success, true);
  for (const amount of [-1, 0, 1.5, NaN, Infinity, LIMITS.moneyMinor + 1])
    assert.equal(
      campaignInputSchema.safeParse({
        ...campaign,
        compensation: { type: 'paid', amountPerReelMinor: amount },
      }).success,
      false
    );
  const result = campaignInputSchema.parse({
    ...campaign,
    currency: ' eur ',
    compensation: { type: 'paid', amountPerReelMinor: 1250 },
  });
  assert.equal(result.currency, 'EUR');
  assert.deepEqual(result.compensation, {
    type: 'paid',
    amountPerReelMinor: 1250,
  });
});
test('applications require a valid campaign version and enforce pitch limits without client-controlled status', () => {
  assert.deepEqual(
    applicationInputSchema.parse({ pitch: '  Hallo  ', campaignVersion: 1 }),
    { pitch: 'Hallo', campaignVersion: 1 }
  );
  assert.equal(
    applicationInputSchema.safeParse({
      pitch: 'x'.repeat(APPLICATION.pitchLength),
      campaignVersion: 1,
    }).success,
    true
  );
  for (const value of [
    { pitch: 'x'.repeat(APPLICATION.pitchLength + 1), campaignVersion: 1 },
    { pitch: '', campaignVersion: 0 },
    { pitch: '', campaignVersion: 1.5 },
    { pitch: '', campaignVersion: 1, status: 'accepted' },
  ])
    assert.equal(applicationInputSchema.safeParse(value).success, false);
});
