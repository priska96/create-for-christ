import { IMAGE } from '@create-for-christ/contracts';
import sharp from 'sharp';
import { test, expect } from '../fixtures.js';
import { login } from '../helpers.js';

test('image picker uploads, replaces and preserves a campaign image through publication', async ({
  page,
  environment,
}) => {
  const { brand, campaigns, input, password } = environment;
  const draft = await campaigns.create(brand.id, {
    ...input,
    title: 'Upload-Test',
  });
  await login(page, brand.email, password);
  await page.waitForURL('**/BrandCampaigns');
  await page.goto(`http://localhost:3100/BrandCampaignForm?id=${draft.id}`);
  async function upload(label: string, color: string) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: label, exact: true }).click();
    await (
      await chooser
    ).setFiles({
      name: 'product.png',
      mimeType: 'image/png',
      buffer: await sharp({
        create: { width: 100, height: 100, channels: 3, background: color },
      })
        .png()
        .toBuffer(),
    });
    await expect(
      page.getByRole('button', { name: 'Produktbild ändern', exact: true })
    ).toBeEnabled();
  }
  await upload('Produktbild hochladen', 'green');
  const first = (await campaigns.listOwn(brand.id)).find(
    (item) => item.id === draft.id
  )?.productImageUrl;
  expect(first).toBeTruthy();
  await upload('Produktbild ändern', 'blue');
  await expect
    .poll(
      async () =>
        (await campaigns.listOwn(brand.id)).find((item) => item.id === draft.id)
          ?.productImageUrl
    )
    .not.toBe(first);
  const updated = (await campaigns.listOwn(brand.id)).find(
    (item) => item.id === draft.id
  )!;
  const response = await page.request.get(
    `http://localhost:3101${updated.productImageUrl}`
  );
  expect(response.ok()).toBe(true);
  expect((await sharp(await response.body()).metadata()).format).toBe(
    IMAGE.outputExtension
  );
  await page
    .getByRole('button', { name: 'Zurück zur Übersicht', exact: true })
    .click();
  await page.getByText('Veröffentlichen', { exact: true }).click();
  await expect
    .poll(
      async () =>
        (await campaigns.listOwn(brand.id)).find((item) => item.id === draft.id)
          ?.status
    )
    .toBe('published');
  expect(
    (await campaigns.listOwn(brand.id)).find((item) => item.id === draft.id)
      ?.productImageUrl
  ).toBe(updated.productImageUrl);
});
