import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import {
  InvalidCampaignImage,
  normalizeCampaignImage,
  readCampaignImage,
} from "../src/modules/campaigns/images.js";

test("uploads reject fake, truncated, oversized and excessive-pixel images", async () => {
  for (const data of [
    Buffer.from("not an image"),
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
    ),
    Buffer.alloc(5 * 1024 * 1024 + 1),
  ]) {
    await assert.rejects(normalizeCampaignImage(data), InvalidCampaignImage);
  }
  const png = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    normalizeCampaignImage(png.subarray(0, 40)),
    InvalidCampaignImage,
  );
  const huge = await sharp({
    create: { width: 5100, height: 5000, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await assert.rejects(normalizeCampaignImage(huge), InvalidCampaignImage);
  assert.equal(await readCampaignImage("../../.env"), null);
});
test("uploads normalize supported formats and strip EXIF", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    const input = await sharp({
      create: { width: 20, height: 10, channels: 3, background: "red" },
    })
      .withMetadata()
      .toFormat(format)
      .toBuffer();
    const output = await normalizeCampaignImage(input);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.exif, undefined);
  }
});
