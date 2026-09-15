import { test, expect } from '../fixtures.js';
import { login } from '../helpers.js';
import { createApplicationStore } from '../../api/src/modules/applications/store.js';
test('matched accounts exchange text, retry without duplication and clear unread status', async ({
  browser,
  environment,
  browserErrors,
}) => {
  const { brand, creator, pool, password } = environment;
  const store = createApplicationStore(pool);
  const campaign = (await store.feed(creator.id, {})).campaigns[0];
  const application = await store.apply(creator.id, campaign.id, {
    pitch: 'Chat',
    campaignVersion: campaign.version,
  });
  const match = await store.decide(brand.id, application.id, 'accepted');
  const creatorContext = await browser.newContext(),
    brandContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage(),
    brandPage = await brandContext.newPage();
  for (const page of [creatorPage, brandPage])
    page.on('pageerror', (error) => browserErrors.push(error.message));
  await login(creatorPage, creator.email, password);
  await creatorPage.waitForURL('**/CreatorFeed');
  await creatorPage
    .getByRole('tab', { name: 'Nachrichten', exact: true })
    .click();
  await creatorPage
    .getByRole('button', {
      name: `Gespräch öffnen: Grace Coffee · ${campaign.title}`,
      exact: true,
    })
    .click();
  await creatorPage
    .getByRole('button', { name: 'Vereinbarte Bedingungen', exact: true })
    .click();
  await expect(
    creatorPage.getByText('Online-Dauer: 30 Tage', { exact: true })
  ).toBeVisible();
  await creatorPage
    .getByRole('button', { name: 'Schließen', exact: true })
    .click();
  await creatorPage.getByRole('dialog').waitFor({ state: 'hidden' });
  await creatorPage
    .getByRole('button', { name: 'Nachricht senden', exact: true })
    .click();
  await expect(
    creatorPage.getByRole('textbox', { name: 'Nachricht', exact: true })
  ).toHaveAttribute('aria-invalid', 'true');
  await creatorPage
    .getByRole('textbox', { name: 'Nachricht', exact: true })
    .fill('Hallo Brand!');
  let dropResponse = true;
  await creatorPage.route(
    `**/v1/conversations/${match.collaborationId}/messages`,
    async (route) => {
      if (route.request().method() === 'POST' && dropResponse) {
        dropResponse = false;
        await route.fetch();
        await route.abort();
      } else await route.continue();
    }
  );
  await creatorPage
    .getByRole('button', { name: 'Nachricht senden', exact: true })
    .click();
  await expect(
    creatorPage.getByText('Keine Verbindung. Bitte versuche es erneut.', {
      exact: true,
    })
  ).toBeVisible();
  await creatorPage
    .getByRole('button', { name: 'Nachricht senden', exact: true })
    .click();
  await expect(
    creatorPage.getByRole('textbox', { name: 'Nachricht', exact: true })
  ).toHaveValue('');
  const composer = creatorPage.getByRole('textbox', {
    name: 'Nachricht',
    exact: true,
  });
  await expect(composer).toHaveAttribute('aria-invalid', 'false');
  await composer.focus();
  await composer.blur();
  await expect(composer).toHaveAttribute('aria-invalid', 'false');
  await creatorPage
    .getByRole('button', { name: 'Nachricht senden', exact: true })
    .click();
  await expect(composer).toHaveAttribute('aria-invalid', 'true');
  await expect(
    creatorPage
      .getByText('Hallo Brand!', { exact: true })
      .filter({ visible: true })
  ).toHaveCount(1);
  expect(
    (
      await pool.query(
        'SELECT count(*)::int AS count FROM messages WHERE collaboration_id=$1',
        [match.collaborationId]
      )
    ).rows[0].count
  ).toBe(1);
  await login(brandPage, brand.email, password);
  await brandPage.waitForURL('**/BrandCampaigns');
  await brandPage
    .getByRole('tab', { name: 'Nachrichten', exact: true })
    .click();
  await expect(
    brandPage.getByLabel('1 ungelesene Nachrichten', { exact: true })
  ).toBeVisible();
  await brandPage
    .getByRole('button', {
      name: `Gespräch öffnen: Anna Creator · ${campaign.title}`,
      exact: true,
    })
    .click();
  await expect(
    brandPage
      .getByText('Hallo Brand!', { exact: true })
      .filter({ visible: true })
  ).toBeVisible();
  await brandPage
    .getByRole('textbox', { name: 'Nachricht', exact: true })
    .fill('Hallo Creator!');
  await brandPage
    .getByRole('button', { name: 'Nachricht senden', exact: true })
    .click();
  await expect(
    creatorPage
      .getByText('Hallo Creator!', { exact: true })
      .filter({ visible: true })
  ).toBeVisible({ timeout: 15000 });
  await brandPage.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(
    brandPage.getByLabel('1 ungelesene Nachrichten', { exact: true })
  ).toHaveCount(0);
  await creatorContext.close();
  await brandContext.close();
});
