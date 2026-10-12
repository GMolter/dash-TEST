const { buildSync } = require('esbuild');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const root = resolve(__dirname, '..');
// Vercel's loader can reject require(ESM) even on Node 24. Bundle the current
// sanitizer and its parser into CommonJS instead of downgrading security fixes.
buildSync({
  absWorkingDir: root,
  stdin: { contents: "module.exports = require('sanitize-html');", resolveDir: root },
  outfile: resolve(root, 'api/_utils/emailSanitizer.generated.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
});
execFileSync(process.execPath, ['--no-experimental-require-module', resolve(__dirname, 'check-email-runtime.cjs')], { stdio: 'inherit' });
