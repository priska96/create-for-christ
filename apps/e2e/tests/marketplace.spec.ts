import assert from 'node:assert/strict';
import { test } from '../fixtures.js';
import { invalid, valid, login, drag } from '../helpers.js';
import { createApplicationStore } from '../../api/src/modules/applications/store.js';

test('creator and brand journeys, cache invalidation, pagination and account isolation', async ({
  browser,
  environment,
  browserErrors: errors,
}) => {
  const { pool, brand, creator, campaigns, input, password } = environment;
  const creatorContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    brandContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
  const creatorPage = await creatorContext.newPage(),
    brandPage = await brandContext.newPage();
  for (const page of [creatorPage, brandPage])
    page.on('pageerror', (error) => errors.push(error.message));
  await login(creatorPage, creator.email, password);
  await creatorPage.waitForURL('**/CreatorFeed');
  await creatorPage.getByText('Kaffee am Morgen', { exact: true }).waitFor();
  assert.equal(await creatorPage.getByRole('tab').count(), 4);
  const navBefore = await creatorPage
    .getByRole('tablist', { name: 'Hauptnavigation' })
    .boundingBox();
  assert.ok(navBefore && navBefore.y > 700);

  await creatorPage
    .getByRole('button', { name: 'Kampagnendetails', exact: true })
    .click();
  await creatorPage
    .getByText('Online-Dauer: 30 Tage', { exact: true })
    .waitFor();
  await creatorPage
    .getByRole('button', { name: 'Schließen', exact: true })
    .click();
  await creatorPage.getByRole('dialog').waitFor({ state: 'hidden' });
  await drag(creatorPage, 1);
  await creatorPage
    .getByRole('textbox', { name: 'Dein Pitch (optional)', exact: true })
    .fill('Ich liebe Kaffee und erzähle eure Geschichte.');

  let failedApplications = 0;
  await creatorPage.route(
    '**/v1/creator/campaigns/*/applications',
    async (route) => {
      failedApplications++;
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Testkonflikt: Bitte erneut prüfen.' }),
      });
    },
    { times: 1 }
  );
  await creatorPage
    .getByRole('button', { name: 'Bewerbung senden', exact: true })
    .click();
  await creatorPage
    .getByText('Testkonflikt: Bitte erneut prüfen.', { exact: true })
    .waitFor();
  assert.equal(failedApplications, 1);
  assert.equal(
    await creatorPage
      .getByRole('textbox', { name: 'Dein Pitch (optional)', exact: true })
      .inputValue(),
    'Ich liebe Kaffee und erzähle eure Geschichte.'
  );
  await creatorPage
    .getByRole('button', { name: 'Bewerbung senden', exact: true })
    .click();
  await creatorPage.getByRole('dialog').waitFor({ state: 'hidden' });
  await creatorPage.getByText('Kaffee unterwegs', { exact: true }).waitFor();
  await drag(creatorPage, -1);
  await creatorPage.getByText('Für später', { exact: true }).waitFor();
  await creatorPage
    .getByRole('button', { name: 'Bewerben', exact: true })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Bewerbung senden', exact: true })
    .click();
  await creatorPage.getByRole('dialog').waitFor({ state: 'hidden' });
  await creatorPage
    .getByRole('tab', { name: 'Bewerbungen', exact: true })
    .click();
  await creatorPage
    .getByRole('button', {
      name: 'Bewerbung ansehen: Grace Coffee · Kaffee am Morgen',
      exact: true,
    })
    .click();
  await creatorPage
    .getByText('Pitch: Ich liebe Kaffee und erzähle eure Geschichte.', {
      exact: true,
    })
    .waitFor();
  await creatorPage
    .getByRole('button', { name: 'Schließen', exact: true })
    .click();
  await creatorPage.getByRole('dialog').waitFor({ state: 'hidden' });
  await creatorPage
    .getByRole('tab', { name: 'Nachrichten', exact: true })
    .click();
  await creatorPage
    .getByText('Raum für Verbindung.', { exact: true })
    .waitFor();
  await creatorPage.getByRole('tab', { name: 'Profil', exact: true }).click();
  await creatorPage
    .getByRole('textbox', { name: 'Instagram-Nutzername', exact: true })
    .waitFor();

  const instagram = creatorPage.getByRole('textbox', {
    name: 'Instagram-Nutzername',
    exact: true,
  });
  await instagram.fill('invalid handle');
  await creatorPage
    .getByRole('button', { name: 'Änderungen speichern', exact: true })
    .click();
  await invalid(instagram);
  await instagram.fill('@anna.test');
  await valid(instagram);
  await creatorPage.route(
    '**/v1/me/profile',
    async (route) => {
      if (route.request().method() === 'PUT')
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Bitte prüfen.',
            issues: [
              {
                path: 'instagramHandle',
                message: 'Bitte einen anderen Instagram-Namen wählen.',
              },
            ],
          }),
        });
      else await route.continue();
    },
    { times: 1 }
  );
  await creatorPage
    .getByRole('button', { name: 'Änderungen speichern', exact: true })
    .click();
  await creatorPage
    .getByText('Bitte einen anderen Instagram-Namen wählen.', { exact: true })
    .waitFor();
  await invalid(instagram);
  await instagram.fill('anna.test');
  await valid(instagram);
  await creatorPage
    .getByRole('button', { name: 'Änderungen speichern', exact: true })
    .click();
  await creatorPage.waitForURL('**/CreatorFeed');
  await creatorPage.getByRole('tab', { name: 'Profil', exact: true }).click();

  await creatorPage
    .getByRole('textbox', { name: 'Standort (optional)', exact: true })
    .scrollIntoViewIfNeeded();
  const navAfter = await creatorPage
    .getByRole('tablist', { name: 'Hauptnavigation' })
    .boundingBox();
  assert.ok(
    navAfter && navAfter.y > 700 && navAfter.y + navAfter.height <= 844
  );
  await creatorPage.getByRole('tab', { name: 'Home', exact: true }).click();
  await creatorPage
    .getByText(
      'Aktuell gibt es keine weiteren passenden Kampagnen. Schau später wieder vorbei oder passe deine Deal-Präferenzen an.',
      { exact: true }
    )
    .waitFor();

  await login(brandPage, brand.email, password);
  await brandPage.waitForURL('**/BrandCampaigns');
  await brandPage.getByText('Kaffee am Morgen', { exact: true }).waitFor();

  await brandPage
    .getByRole('tab', { name: 'Bewerbungen', exact: true })
    .click();
  await brandPage
    .getByRole('button', {
      name: 'Bewerbung ansehen: Anna Creator · Kaffee am Morgen',
      exact: true,
    })
    .waitFor();

  await brandPage
    .getByRole('button', {
      name: 'Bewerbung ansehen: Anna Creator · Kaffee am Morgen',
      exact: true,
    })
    .click();
  await brandPage
    .getByRole('button', { name: 'Portfolio-Reel 1', exact: true })
    .waitFor();

  await brandPage
    .getByRole('button', { name: 'Annehmen', exact: true })
    .click();
  await brandPage
    .getByRole('button', { name: 'Zusage bestätigen', exact: true })
    .click();
  await brandPage.getByRole('dialog').waitFor({ state: 'hidden' });
  await brandPage
    .getByRole('button', { name: 'Ablehnen: Anna Creator', exact: true })
    .click();
  await brandPage
    .getByRole('button', { name: 'Absage bestätigen', exact: true })
    .click();
  await brandPage.getByRole('dialog').waitFor({ state: 'hidden' });
  await brandPage.getByRole('tab', { name: 'Profil', exact: true }).click();
  await brandPage
    .getByRole('textbox', { name: 'Name deiner Brand', exact: true })
    .waitFor();

  await brandPage
    .getByRole('tab', { name: 'Nachrichten', exact: true })
    .click();
  await brandPage
    .getByRole('button', {
      name: 'Gespräch öffnen: Anna Creator · Kaffee am Morgen',
      exact: true,
    })
    .waitFor();
  await brandPage.getByRole('tab', { name: 'Home', exact: true }).click();
  await brandPage
    .getByRole('button', { name: 'Neue Kampagne', exact: true })
    .click();
  await brandPage
    .getByRole('textbox', { name: 'Titel', exact: true })
    .waitFor();

  await brandPage
    .getByRole('button', { name: 'Als Entwurf speichern', exact: true })
    .click();
  await invalid(brandPage.getByRole('textbox', { name: 'Titel', exact: true }));
  await invalid(
    brandPage.getByRole('textbox', {
      name: 'Produktwert (in Hauptwährungseinheit)',
      exact: true,
    })
  );
  await brandPage
    .getByRole('textbox', { name: 'Titel', exact: true })
    .fill('Form Campaign');
  await brandPage
    .getByRole('textbox', { name: 'Produktname', exact: true })
    .fill('Testprodukt');
  await brandPage
    .getByRole('textbox', { name: 'Reel-Briefing', exact: true })
    .fill('Erstelle ein Reel.');
  await brandPage
    .getByRole('radio', { name: 'Paid · Honorar', exact: true })
    .click();
  const price = brandPage.getByRole('textbox', {
    name: 'Honorar pro Reel (in Hauptwährungseinheit)',
    exact: true,
  });
  await price.fill('0');
  const count = brandPage.getByRole('textbox', {
    name: 'Anzahl Reels',
    exact: true,
  });
  await count.fill('1.5');
  const date = brandPage.getByRole('textbox', {
    name: 'Veröffentlichungstermin (JJJJ-MM-TT, optional)',
    exact: true,
  });
  await date.fill('2026-02-30');
  await brandPage
    .getByRole('button', { name: 'Als Entwurf speichern', exact: true })
    .click();
  await invalid(price);
  await invalid(count);
  await invalid(date);
  await price.fill('12,50');
  await count.fill('2');
  await date.fill('2026-10-01');
  await valid(price);
  await valid(count);
  await valid(date);
  await brandPage
    .getByRole('button', { name: 'Als Entwurf speichern', exact: true })
    .click();
  await brandPage.waitForURL('**/BrandCampaignForm?id=*');
  await brandPage
    .getByRole('button', { name: 'Produktbild hochladen', exact: true })
    .waitFor();
  const saved = await campaigns.listOwn(brand.id);
  const formCampaign = saved.find((item) => item.title === 'Form Campaign');
  assert.ok(formCampaign);
  assert.equal(formCampaign.compensation.type, 'paid');
  if (formCampaign.compensation.type === 'paid')
    assert.equal(formCampaign.compensation.amountPerReelMinor, 1250);
  assert.equal(formCampaign.reelCount, 2);

  await creatorPage
    .getByRole('tab', { name: 'Bewerbungen', exact: true })
    .click();
  await creatorPage
    .getByRole('radio', { name: 'Angenommen', exact: true })
    .click();
  await creatorPage
    .getByRole('button', {
      name: 'Bewerbung ansehen: Grace Coffee · Kaffee am Morgen',
      exact: true,
    })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Match ansehen', exact: true })
    .click();
  await creatorPage.getByText('It’s a Match!', { exact: true }).waitFor();

  await creatorPage
    .getByRole('button', { name: 'Zurück zur Bewerbung', exact: true })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Schließen', exact: true })
    .click();
  await creatorPage.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(
    (await pool.query('SELECT count(*)::int AS total FROM collaborations'))
      .rows[0].total,
    1
  );

  // Exercise true second-page fetching, separate filter caches and focus refresh.
  const applicationStore = createApplicationStore(pool);
  for (let index = 0; index < 21; index++) {
    const campaign = await campaigns.create(brand.id, {
      ...input,
      title: `Query Campaign ${index}`,
    });
    await campaigns.publish(brand.id, campaign.id);
    const feed = await applicationStore.feed(creator.id, {});
    const item = feed.campaigns.find((item) => item.id === campaign.id);
    assert.ok(item);
    await applicationStore.apply(creator.id, campaign.id, {
      pitch: 'Pagination test',
      campaignVersion: item.version,
    });
  }
  await creatorPage
    .getByRole('button', { name: 'Aktualisieren', exact: true })
    .click();
  await creatorPage.getByRole('radio', { name: 'Alle', exact: true }).click();
  await creatorPage
    .getByRole('button', { name: 'Aktualisieren', exact: true })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Weitere Bewerbungen laden', exact: true })
    .waitFor();
  assert.equal(
    await creatorPage
      .getByRole('button', { name: /^Bewerbung ansehen:/ })
      .count(),
    20
  );
  await creatorPage
    .getByRole('button', { name: 'Weitere Bewerbungen laden', exact: true })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Weitere Bewerbungen laden', exact: true })
    .waitFor({ state: 'hidden' });
  assert.equal(
    await creatorPage
      .getByRole('button', { name: /^Bewerbung ansehen:/ })
      .count(),
    23
  );
  await creatorPage
    .getByRole('radio', { name: 'Angenommen', exact: true })
    .click();
  await creatorPage
    .getByRole('button', {
      name: 'Bewerbung ansehen: Grace Coffee · Query Campaign 20',
      exact: true,
    })
    .waitFor({ state: 'hidden' });
  assert.equal(
    await creatorPage
      .getByRole('button', { name: /^Bewerbung ansehen:/ })
      .count(),
    1
  );
  await creatorPage.getByRole('radio', { name: 'Alle', exact: true }).click();
  await creatorPage
    .getByRole('button', {
      name: 'Bewerbung ansehen: Grace Coffee · Query Campaign 20',
      exact: true,
    })
    .waitFor();
  // Background refresh must not reset a dirty profile form.
  await creatorPage.getByRole('tab', { name: 'Profil', exact: true }).click();
  const location = creatorPage.getByRole('textbox', {
    name: 'Standort (optional)',
    exact: true,
  });
  await location.fill('Ungespeicherter Entwurf');
  const response = creatorPage.waitForResponse(
    (response) => response.url().endsWith('/v1/me') && response.status() === 200
  );
  await creatorPage.evaluate(() => {
    const original = Date.now;
    Date.now = () => original() + 60000;
    window.dispatchEvent(new Event('visibilitychange'));
    setTimeout(() => {
      Date.now = original;
    }, 100);
  });
  await response;
  assert.equal(await location.inputValue(), 'Ungespeicherter Entwurf');
  // Account changes happen within the SPA, without a browser reload clearing the cache for us.
  await creatorPage
    .getByRole('button', { name: 'Abmelden', exact: true })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Anmelden', exact: true })
    .waitFor();
  await creatorPage
    .getByRole('button', { name: 'Anmelden', exact: true })
    .click();
  await creatorPage
    .getByRole('textbox', { name: 'E-Mail-Adresse', exact: true })
    .fill(brand.email);
  await creatorPage
    .locator('input[aria-label="Passwort"]:visible')
    .fill(password);
  await creatorPage
    .getByRole('button', { name: 'Anmelden', exact: true })
    .click();
  await creatorPage.waitForURL('**/BrandCampaigns');
  await creatorPage.getByRole('tab', { name: 'Profil', exact: true }).click();
  assert.equal(
    await creatorPage
      .getByRole('textbox', { name: 'Name deiner Brand', exact: true })
      .inputValue(),
    'Grace Coffee'
  );
  assert.equal(
    await creatorPage
      .getByRole('textbox', { name: 'Instagram-Nutzername', exact: true })
      .count(),
    0
  );
  await creatorPage
    .getByRole('button', { name: 'Abmelden', exact: true })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Anmelden', exact: true })
    .waitFor();
  await creatorPage
    .getByRole('button', { name: 'Anmelden', exact: true })
    .click();
  await creatorPage
    .getByRole('textbox', { name: 'E-Mail-Adresse', exact: true })
    .fill(creator.email);
  await creatorPage
    .locator('input[aria-label="Passwort"]:visible')
    .fill(password);
  await creatorPage
    .getByRole('button', { name: 'Anmelden', exact: true })
    .click();
  await creatorPage.waitForURL('**/CreatorFeed');
  await creatorPage.getByRole('tab', { name: 'Profil', exact: true }).click();
  assert.equal(
    await creatorPage
      .getByRole('textbox', { name: 'Standort (optional)', exact: true })
      .inputValue(),
    'Berlin'
  );

  assert.deepEqual(errors, []);

  await creatorContext.close();
  await brandContext.close();
});
