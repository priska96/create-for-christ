import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
await build({
  entryPoints: [fileURLToPath(new URL('../src/browser/ResetPassword.tsx', import.meta.url))],
  outfile: fileURLToPath(new URL('../.generated/resetPassword.js', import.meta.url)),
  bundle: true, minify: true, platform: 'browser', target: 'es2022',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
});
