import { randomBytes } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
for (const directory of ['', 'apps/api/', 'apps/mobile/']) {
  const target = new URL(`${directory}.env`, root);
  let existing = true;
  try { await access(target); } catch { existing = false; }
  let content = await readFile(existing ? target : new URL(`${directory}.env.example`, root), 'utf8');
  let changed = !existing;
  if (directory === 'apps/api/') {
    const secret = content.match(/^BETTER_AUTH_SECRET=(.*)$/m)?.[1]?.trim();
    if (!secret || secret.startsWith('replace-with-')) {
      const line = `BETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}`;
      content = secret !== undefined ? content.replace(/^BETTER_AUTH_SECRET=.*$/m, line) : `${content}\n${line}\n`;
      changed = true;
    }
  }
  if (changed) {
    await writeFile(target, content, { mode: 0o600 });
    console.info(`Prepared ${directory}.env (secrets are not printed).`);
  } else console.info(`Kept existing ${directory}.env.`);
}
