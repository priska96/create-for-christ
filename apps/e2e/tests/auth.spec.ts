import assert from 'node:assert/strict';
import { test } from '../fixtures.js';
import { invalid, valid, login, mailLink } from '../helpers.js';

test('registration, inline errors, role onboarding and password reset', async ({
  browser,
  environment,
  browserErrors: errors,
}) => {
  const { app, mail, creator, password } = environment;
  const anonContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const anon = await anonContext.newPage();
  anon.setDefaultTimeout(15000);
  anon.on('pageerror', (error) => errors.push(error.message));
  await anon.goto('http://localhost:3100/SignUp');
  await anon
    .getByRole('button', { name: 'Konto erstellen', exact: true })
    .click();
  await invalid(anon.getByRole('textbox', { name: 'Dein Name', exact: true }));
  await invalid(
    anon.getByRole('textbox', { name: 'E-Mail-Adresse', exact: true })
  );
  await anon
    .getByRole('textbox', { name: 'Dein Name', exact: true })
    .fill('Form Brand');
  await anon
    .getByRole('textbox', { name: 'E-Mail-Adresse', exact: true })
    .fill('form-brand@example.test');
  await anon
    .locator('input[aria-label="Passwort (mindestens 10 Zeichen)"]')
    .fill(password);
  await anon
    .locator('input[aria-label="Passwort wiederholen"]')
    .fill('different-password');
  await anon
    .getByRole('button', { name: 'Konto erstellen', exact: true })
    .click();
  await invalid(anon.locator('input[aria-label="Passwort wiederholen"]'));
  await anon.locator('input[aria-label="Passwort wiederholen"]').fill(password);
  await valid(anon.locator('input[aria-label="Passwort wiederholen"]'));
  await anon
    .getByRole('button', { name: 'Konto erstellen', exact: true })
    .click();
  await anon.getByText('Schau in dein Postfach.', { exact: true }).waitFor();
  const verification = new URL(mailLink(mail, 'form-brand@example.test'));
  await app.inject(verification.pathname + verification.search);
  await login(anon, 'form-brand@example.test', password);
  await anon.waitForURL('**/profile_tmp');
  await anon
    .getByRole('button', { name: 'Profil erstellen', exact: true })
    .click();
  await invalid(
    anon.getByRole('textbox', { name: 'Instagram-Nutzername', exact: true })
  );
  await anon
    .getByRole('radio', { name: 'Ich bin eine Brand', exact: true })
    .click();
  await anon
    .getByRole('button', { name: 'Profil erstellen', exact: true })
    .click();
  await invalid(
    anon.getByRole('textbox', { name: 'Name deiner Brand', exact: true })
  );
  await anon
    .getByRole('textbox', { name: 'Name deiner Brand', exact: true })
    .fill('Form Brand');
  await anon
    .getByRole('textbox', { name: 'Branche', exact: true })
    .fill('Food');
  await anon
    .getByRole('button', { name: 'Profil erstellen', exact: true })
    .click();
  await anon.waitForURL('**/BrandCampaigns');
  await anonContext.close();
  const resetContext = await browser.newContext();
  const resetPage = await resetContext.newPage();
  resetPage.on('pageerror', (error) => errors.push(error.message));
  await resetPage.goto('http://localhost:3100/ForgotPassword');
  await resetPage
    .getByRole('button', { name: 'Link anfordern', exact: true })
    .click();
  await invalid(
    resetPage.getByRole('textbox', { name: 'E-Mail-Adresse', exact: true })
  );
  await resetPage
    .getByRole('textbox', { name: 'E-Mail-Adresse', exact: true })
    .fill(creator.email);
  await resetPage
    .getByRole('button', { name: 'Link anfordern', exact: true })
    .click();
  await resetPage
    .getByText(
      'Falls ein Konto mit dieser E-Mail-Adresse existiert, erhältst du einen Link. Er ist eine Stunde gültig.',
      { exact: true }
    )
    .waitFor();
  const resetLink = mailLink(mail, creator.email);
  await resetPage.goto(resetLink);
  await resetPage
    .getByRole('button', { name: 'Passwort speichern', exact: true })
    .click();
  await invalid(resetPage.locator('#password'));
  await resetPage.locator('#password').fill(password);
  await resetPage.locator('#confirm').fill('wrong-confirm');
  await resetPage
    .getByRole('button', { name: 'Passwort speichern', exact: true })
    .click();
  await invalid(resetPage.locator('#confirm'));
  await resetPage.locator('#confirm').fill(password);
  await resetPage
    .getByRole('button', { name: 'Passwort speichern', exact: true })
    .click();
  await resetPage
    .getByText(
      'Passwort gespeichert. Du kannst dich jetzt in der App anmelden.',
      { exact: true }
    )
    .waitFor();
  assert.equal(new URL(resetPage.url()).search, '');
  await resetContext.close();
});
