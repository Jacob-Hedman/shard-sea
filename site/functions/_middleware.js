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
  /* Codex 1.0, inverted: black paper, hard white rules, red marks. System fonts only,
     since the site's own font files sit behind this gate. */
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh; display: grid; place-items: center; padding: 16px;
    background: #000; color: #fff;
    font: 15px/1.55 "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
  }
  .card {
    width: min(100%, 26rem); padding: 1.75rem 1.75rem 1.5rem;
    background: #000; border: 2px solid #fff; box-shadow: 5px 5px 0 #fff;
  }
  .code { font: 12px/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: .08em; color: #a3a3a3; text-transform: uppercase; }
  .code b { color: #ff5a4a; font-weight: 600; }
  h1 { margin-top: .9rem; font-size: 2rem; line-height: 1.05; letter-spacing: -.03em; font-weight: 800; }
  h1 span { display: inline-block; width: .5em; height: .5em; margin-left: .12em; background: #ff2a1a; }
  p.sub { margin-top: .6rem; padding-top: .6rem; border-top: 1px solid #fff; font-size: .85rem; color: #d4d4d4; }
  form { margin-top: 1.25rem; display: grid; gap: .6rem; }
  input[type=password] {
    width: 100%; padding: .7rem .8rem; font: inherit; color: #fff;
    background: #000; border: 2px solid #fff; border-radius: 0; outline: none;
  }
  input[type=password]:focus { border-color: #ff2a1a; box-shadow: 3px 3px 0 #ff2a1a; }
  button {
    padding: .7rem .8rem; font: inherit; font-weight: 700; cursor: pointer; text-align: left;
    color: #000; background: #fff; border: 2px solid #fff; border-radius: 0;
  }
  button:hover, button:focus-visible { background: #ff2a1a; border-color: #ff2a1a; color: #000; outline: none; }
  .err { font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #ff5a4a; min-height: 1.4em; }
</style>
</head>
<body>
  <main class="card">
    <div class="code"><b>SSC</b> · Codex 1.0 · Private</div>
    <h1>Shard-sea Codex<span aria-hidden="true"></span></h1>
    <p class="sub">Private playtest archive. Enter the password to continue.</p>
    <form method="post" action="/__login">
      <input type="hidden" name="next" value="${escAttr(nextPath)}" />
      <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" required />
      <button type="submit">Open the codex →</button>
      <div class="err">${failed ? 'Wrong password. Nothing stirs.' : ''}</div>
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
