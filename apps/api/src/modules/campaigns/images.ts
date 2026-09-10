import { HTTP, IMAGE } from '@create-for-christ/contracts';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const uploadsRoot = path.join(process.cwd(), 'uploads', 'campaigns');
const filenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
export class InvalidCampaignImage extends Error {
  statusCode = HTTP.badRequest;
  constructor() {
    super(
      'Bitte ein gültiges JPEG-, PNG- oder WebP-Bild mit höchstens 25 Megapixeln auswählen.'
    );
  }
}
export async function normalizeCampaignImage(buffer: Buffer): Promise<Buffer> {
  if (!buffer.length || buffer.length > IMAGE.maxBytes)
    throw new InvalidCampaignImage();
  try {
    const image = sharp(buffer, {
      limitInputPixels: IMAGE.maxPixels,
      failOn: 'warning',
    });
    const metadata = await image.metadata();
    if (
      !(IMAGE.formats as readonly string[]).includes(metadata.format ?? '') ||
      (metadata.pages ?? 1) > 1
    )
      throw new InvalidCampaignImage();
    // Decode actual pixels, strip metadata and normalize orientation and dimensions.
    return await image
      .rotate()
      .resize({
        width: IMAGE.maxDimension,
        height: IMAGE.maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE.outputQuality })
      .toBuffer();
  } catch {
    throw new InvalidCampaignImage();
  }
}
export async function saveCampaignImage(buffer: Buffer): Promise<string> {
  const normalized = await normalizeCampaignImage(buffer);
  await mkdir(uploadsRoot, { recursive: true });
  const filename = `${randomUUID()}.${IMAGE.outputExtension}`;
  await writeFile(path.join(uploadsRoot, filename), normalized, {
    flag: 'wx',
    mode: 0o600,
  });
  return `${IMAGE.urlPrefix}${filename}`;
}
export async function deleteCampaignImage(url: string): Promise<void> {
  const filename = url.replace(IMAGE.urlPrefix, '');
  if (!filenamePattern.test(filename)) return;
  try {
    await unlink(path.join(uploadsRoot, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
export async function readCampaignImage(
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!filenamePattern.test(filename)) return null;
  try {
    // Also sanitize legacy uploads, which were previously stored without validation.
    const buffer = await normalizeCampaignImage(
      await readFile(path.join(uploadsRoot, filename))
    );
    return { buffer, mimeType: IMAGE.outputMimeType };
  } catch (error) {
    if (
      error instanceof InvalidCampaignImage ||
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    )
      return null;
    throw error;
  }
}
