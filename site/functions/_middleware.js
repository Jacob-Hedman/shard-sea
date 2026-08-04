// Edge authentication gate for the whole site (Cloudflare Pages Functions).
//
// Every request — pages, JSON indexes, assets — must carry a valid HMAC-signed
// session cookie, or it receives the login screen instead of content. The
// password check happens HERE, at Cloudflare's edge, before any file is served,
// so nothing in the repo or the served bundle contains the secret.
//
// Secrets (set in the Cloudflare dashboard or `wrangler pages secret put`):
//   SITE_PASSWORD  — the site password (never committed)
//   SESSION_SECRET — random hex used to sign session cookies
// Local testing: `wrangler pages dev` reads both from .dev.vars (gitignored).
// Note: `astro dev` / `astro preview` bypass Functions — local dev stays open.

const COOKIE = 'shardsea_session';
const SESSION_DAYS = 30;

const enc = new TextEncoder();
const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

const sha256Hex = async (s) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

// Constant-time string comparison (both sides are fixed-length hex digests).
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1);
  }
  return null;
}

async function hasValidSession(request, secret) {
  const raw = getCookie(request, COOKIE);
  if (!raw) return false;
  const dot = raw.indexOf('.');
  if (dot <= 0) return false;
  const exp = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 < Date.now()) return false;
  return safeEqual(await hmacHex(secret, 'session:' + exp), sig);
}

const clearCookie = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

// Only ever redirect to a local path (no open redirect via ?next=).
const safePath = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : '/');

const escAttr = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function loginPage(nextPath, failed) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Shard-sea Codex — sign in</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh; display: grid; place-items: center;
    background: #0b0c0e; color: #f3f4f6;
    font: 15px/1.6 Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif;
    background-image: radial-gradient(64rem 26rem at 50% -10rem, rgba(217,165,94,.08), transparent 70%);
  }
  .card {
    width: min(92vw, 24rem); padding: 2.25rem 2rem 2rem;
    background: #141619; border: 1px solid #21242a; border-radius: 12px;
    box-shadow: 0 24px 60px -30px rgba(0,0,0,.8);
  }
  h1 {
    font-size: 1.5rem; letter-spacing: -.02em; text-align: center;
    background: linear-gradient(135deg, #f3f4f6, #d9a55e);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  p.sub { margin-top: .4rem; text-align: center; font-size: .8rem; color: #646b75; }
  form { margin-top: 1.5rem; display: grid; gap: .6rem; }
  input[type=password] {
    width: 100%; padding: .65rem .8rem; font: inherit; color: #f3f4f6;
    background: #0b0c0e; border: 1px solid #2e323a; border-radius: 8px; outline: none;
  }
  input[type=password]:focus { border-color: #d9a55e; }
  button {
    padding: .65rem .8rem; font: inherit; font-weight: 600; cursor: pointer;
    color: #0b0c0e; background: #d9a55e; border: 0; border-radius: 8px;
  }
  button:hover { background: #ecc488; }
  .err { text-align: center; font-size: .8rem; color: #c98a4a; min-height: 1.2em; }
</style>
</head>
<body>
  <main class="card">
    <h1>Shard-sea Codex</h1>
    <p class="sub">Private playtest archive — enter the password to continue.</p>
    <form method="post" action="/__login">
      <input type="hidden" name="next" value="${escAttr(nextPath)}" />
      <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" required />
      <button type="submit">Open the codex</button>
      <div class="err">${failed ? 'Wrong password — nothing stirs.' : ''}</div>
    </form>
  </main>
</body>
</html>`;
}

const loginResponse = (nextPath, failed) =>
  new Response(loginPage(nextPath, failed), {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);

  // Fail CLOSED if the deployment is missing its secrets — never serve content.
  if (!env.SITE_PASSWORD || !env.SESSION_SECRET) {
    return new Response('Authentication is not configured for this deployment.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (url.pathname === '/__logout') {
    return new Response(null, {
      status: 303,
      headers: { Location: '/', 'Set-Cookie': clearCookie, 'Cache-Control': 'no-store' },
    });
  }

  if (await hasValidSession(request, env.SESSION_SECRET)) return next();

  if (request.method === 'POST' && url.pathname === '/__login') {
    let password = '';
    let nextPath = '/';
    try {
      const form = await request.formData();
      password = String(form.get('password') ?? '');
      nextPath = safePath(String(form.get('next') ?? '/'));
    } catch {
      // malformed body -> treated as a failed attempt below
    }
    // Compare fixed-length digests so length/content never leak via timing.
    const [got, want] = await Promise.all([sha256Hex(password), sha256Hex(env.SITE_PASSWORD)]);
    if (password && safeEqual(got, want)) {
      const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
      const sig = await hmacHex(env.SESSION_SECRET, 'session:' + exp);
      return new Response(null, {
        status: 303,
        headers: {
          Location: nextPath,
          'Set-Cookie': `${COOKIE}=${exp}.${sig}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      });
    }
    await new Promise((r) => setTimeout(r, 400)); // damp brute-force attempts
    return loginResponse(nextPath, true);
  }

  // Any other unauthenticated request gets the login screen — never content.
  return loginResponse(safePath(url.pathname + url.search), false);
}
