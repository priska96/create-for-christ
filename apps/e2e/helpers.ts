import assert from 'node:assert/strict';
import { expect, type Page, type Locator } from '@playwright/test';
import type { AuthMail } from '../api/src/infrastructure/mail.js';

export async function login(page: Page, email: string, password: string) {
  await page.goto('http://localhost:3100/');
  await page
    .getByRole('button', { name: 'Konto erstellen', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Dein Name', exact: true }).waitFor();
  await page.goto('http://localhost:3100/');
  await page
    .getByRole('button', { name: 'Zum Creator-Feed', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'E-Mail-Adresse', exact: true })
    .fill(email);
  await page.locator('input[aria-label="Passwort"]:visible').fill(password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
}
export async function drag(page: Page, direction: number) {
  const hint = page.getByText('← Nicht interessiert · Bewerben →', {
    exact: true,
  });
  await hint.scrollIntoViewIfNeeded();
  const box = await hint.boundingBox();
  assert.ok(box);
  const startX = direction > 0 ? box.x + 50 : box.x + box.width - 50;
  await page.mouse.move(startX, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(startX + direction * 140, box.y + box.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

export async function invalid(field: Locator) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveCSS('border-top-color', 'rgb(235, 100, 114)');
  const id = await field.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  await expect(field.page().locator(`[id="${id}"]`)).not.toBeEmpty();
}
export async function valid(field: Locator) {
  await expect(field).toHaveAttribute('aria-invalid', 'false');
}
export function mailLink(mail: AuthMail[], email: string) {
  const link = mail
    .findLast((item) => item.to === email)
    ?.text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!link)
    throw new Error('Expected an authentication email for the test account.');
  return link;
}
