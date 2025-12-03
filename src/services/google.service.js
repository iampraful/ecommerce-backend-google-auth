const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { clientId, clientSecret, redirectUri, scopes } = require('../config/googleAuth');

let cachedCerts = null;
let certsExpiry = 0;
const RETRY_MS = 500;
const MAX_RETRIES = 1; // single retry

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',   // ask for refresh token (may be returned only on first consent)
    prompt: 'consent',       // force consent to try to obtain refresh token
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Google token exchange failed: ' + txt);
  }
  return res.json(); // contains id_token, access_token, refresh_token?
}

async function fetchGoogleCerts() {
  const now = Date.now();
  if (cachedCerts && certsExpiry > now) return cachedCerts;

  const url = 'https://www.googleapis.com/oauth2/v3/certs';
  let attempt = 0;
  let lastErr = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const res = await fetch(url);
      // Log status for debugging
      console.info(`[fetchGoogleCerts] attempt ${attempt + 1}, status ${res.status}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '<no body>');
        throw new Error(`Non-OK response ${res.status}: ${txt}`);
      }

      const jwks = await res.json();
      if (!jwks || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
        throw new Error('JWKS keys missing or empty in response');
      }

      const certs = {};
      for (const k of jwks.keys) {
        if (k.kid && Array.isArray(k.x5c) && k.x5c.length) {
          const cert = k.x5c[0];
          const pem = `-----BEGIN CERTIFICATE-----\n${cert.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;
          certs[k.kid] = pem;
        }
      }

      // cache-control header might give max-age
      const cacheControl = res.headers.get('cache-control') || '';
      const m = cacheControl.match(/max-age=(\d+)/);
      const maxAge = m ? parseInt(m[1], 10) * 1000 : 3600 * 1000;
      certsExpiry = Date.now() + maxAge;
      cachedCerts = certs;

      console.info('[fetchGoogleCerts] fetched certs kids:', Object.keys(certs));
      return certs;
    } catch (err) {
      lastErr = err;
      console.warn(`[fetchGoogleCerts] attempt ${attempt + 1} failed: ${err.message || err}`);
      attempt++;
      if (attempt <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_MS));
      }
    }
  }

  // After retries, throw a clear error so calling code knows fetch failed.
  throw new Error(`Failed to fetch Google certs after ${attempt} attempts: ${lastErr && lastErr.message}`);
}

async function verifyIdToken(idToken) {
  if (!idToken) throw new Error('No id_token supplied');

  // decode header to get kid
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || !decoded.header) throw new Error('Invalid id_token (no header)');
  const kid = decoded.header.kid;
  console.info('[verifyIdToken] token kid:', kid);

  // Try cert-based verification
  try {
    const certs = await fetchGoogleCerts();
    const pub = certs[kid];

    if (!pub) {
      console.warn('[verifyIdToken] no matching cert for kid. Available kids:', Object.keys(certs));
      throw new Error('No matching cert for kid');
    }

    // verify signature & claims
    const payload = jwt.verify(idToken, pub, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId
    });

    if (!payload.email) throw new Error('No email in id_token payload');
    console.info('[verifyIdToken] cert verification succeeded for sub:', payload.sub);
    return payload;
  } catch (err) {
    console.warn('[verifyIdToken] cert verification failed or certs unavailable:', err.message || err);
    // fall through to tokeninfo fallback
  }

  // Fallback: validate using Google's tokeninfo endpoint
  try {
    console.info('[verifyIdToken] attempting tokeninfo fallback');
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => '<no body>');
      throw new Error(`tokeninfo returned ${res.status}: ${txt}`);
    }
    const payload = await res.json();

    // Validate audience
    if (!payload.aud || payload.aud !== clientId) {
      throw new Error('Invalid audience in tokeninfo payload');
    }
    // Optional: check issuer if present
    if (payload.iss && !['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)) {
      throw new Error('Invalid issuer in tokeninfo payload');
    }
    // expiry check
    if (payload.exp) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec > Number(payload.exp)) throw new Error('id_token expired (tokeninfo)');
    }
    if (!payload.email) throw new Error('No email in tokeninfo payload');

    console.info('[verifyIdToken] tokeninfo fallback succeeded for sub:', payload.sub);
    return payload;
  } catch (err) {
    console.error('[verifyIdToken] tokeninfo fallback failed:', err.message || err);
    throw new Error('Failed to verify id_token using both certs and tokeninfo: ' + (err.message || err));
  }
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  verifyIdToken
};
