import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeBaseUrl(rawUrl) {
  if (!rawUrl) return '';
  const withProtocol = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  return withProtocol.replace(/\/$/, '');
}

async function checkUrl(url, options = {}) {
  const response = await fetch(url, options);
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    text: await response.text(),
  };
}

function checkBuildOutput() {
  assert(fs.existsSync('dist/index.html'), 'dist/index.html is missing. Run npm run build before smoke.');

  const html = fs.readFileSync('dist/index.html', 'utf8');
  assert(html.includes('<!doctype html') || html.includes('<!DOCTYPE html'), 'dist/index.html does not look like an HTML document.');
  assert(html.includes('/assets/') || html.includes('src='), 'dist/index.html does not reference built assets.');
}

function checkVercelConfig() {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const headers = JSON.stringify(config.headers || []);
  const rewrites = JSON.stringify(config.rewrites || []);

  assert(config.framework === 'vite', 'vercel.json framework must remain vite.');
  assert(config.outputDirectory === 'dist', 'vercel.json outputDirectory must remain dist.');
  assert(headers.includes('Content-Security-Policy-Report-Only'), 'CSP report-only header is missing.');
  assert(headers.includes('X-Content-Type-Options'), 'X-Content-Type-Options header is missing.');
  assert(headers.includes('Cache-Control'), 'API no-store cache header is missing.');
  assert(rewrites.includes('index.html'), 'SPA fallback rewrite is missing.');
}

async function checkRemoteDeployment() {
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_TEST_BASE_URL || process.env.VERCEL_URL || '');
  if (!baseUrl) {
    console.log('[smoke] No SMOKE_TEST_BASE_URL or VERCEL_URL provided. Skipping remote checks.');
    return;
  }

  const home = await checkUrl(`${baseUrl}/`);
  assert(home.status >= 200 && home.status < 400, `Home route returned ${home.status}.`);
  assert(home.text.includes('<html') || home.text.includes('<!doctype html') || home.text.includes('<!DOCTYPE html'), 'Home route does not return HTML.');

  const thumbnail = await checkUrl(`${baseUrl}/api/thumbnail?url=${encodeURIComponent('https://example.com/not-supported')}`);
  assert(thumbnail.status === 404 || thumbnail.status === 400, `Unsupported thumbnail provider should return 400/404, got ${thumbnail.status}.`);

  const ai = await checkUrl(`${baseUrl}/api/analyze-snippet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: 'smoke test' }),
  });
  assert(ai.status === 401 || ai.status === 429 || ai.status === 503, `Unauthenticated AI endpoint should not be public; got ${ai.status}.`);
}

async function main() {
  checkBuildOutput();
  checkVercelConfig();
  await checkRemoteDeployment();
  console.log('[smoke] ok');
}

main().catch((error) => {
  console.error('[smoke] failed:', error.message);
  process.exit(1);
});
