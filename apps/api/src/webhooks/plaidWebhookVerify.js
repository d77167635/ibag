// Requires: jose ^6 on Node >=20.19.0/22.12.0/23+ (native require(esm) support -- see Section 0.2 #8).
// On an older Node runtime, replace this require with: const jose = await import('jose');
// inside an async context, or pin jose@^4 instead.
const { importJWK, jwtVerify, decodeProtectedHeader } = require('jose');
const crypto = require('crypto');

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_IAT_AGE_SECONDS = 5 * 60;

const jwkCache = new Map();

function plaidHost(env) {
  // Re-verify against your Plaid dashboard before relying on this -- environment
  // naming is one of the facts most likely to have moved since spec time.
  return env === 'production' ? 'production.plaid.com' : 'sandbox.plaid.com';
}

async function fetchVerificationJwk(keyId) {
  const now = Date.now();
  const cached = jwkCache.get(keyId);
  if (cached && cached.expiresAt > now) return cached.jwk;

  const res = await fetch(`https://${plaidHost(PLAID_ENV)}/webhook_verification_key/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, key_id: keyId }),
  });
  if (!res.ok) throw new Error(`Plaid JWK fetch failed: ${res.status}`);
  const json = await res.json();
  const jwk = json.key;
  if (!jwk) throw new Error('Plaid response missing key field');
  jwkCache.set(keyId, { jwk, expiresAt: now + CACHE_TTL_MS });
  return jwk;
}

/**
 * Verifies a Plaid webhook. rawBody MUST be the exact raw request body buffer,
 * captured before any JSON parsing middleware touches it.
 */
async function verifyPlaidWebhook(rawBody, verificationHeader) {
  if (!verificationHeader) return { verified: false, reason: 'MISSING_HEADER' };

  let header;
  try {
    header = decodeProtectedHeader(verificationHeader);
  } catch {
    return { verified: false, reason: 'MALFORMED_JWT' };
  }

  if (header.alg !== 'ES256') return { verified: false, reason: 'WRONG_ALG' };
  if (!header.kid) return { verified: false, reason: 'MISSING_KID' };

  let jwk, payload;
  try {
    jwk = await fetchVerificationJwk(header.kid);
    const key = await importJWK(jwk, 'ES256');
    const result = await jwtVerify(verificationHeader, key, { algorithms: ['ES256'] });
    payload = result.payload;
  } catch (err) {
    return { verified: false, reason: 'BAD_SIGNATURE' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  // v4.2 fix: `nowSeconds - payload.iat > MAX_IAT_AGE_SECONDS` only rejects an
  // iat that is too far in the PAST. If iat is in the FUTURE (clock skew, or a
  // forged future timestamp used to replay an old signed payload), the
  // subtraction goes negative and this check silently passes. Math.abs()
  // rejects both directions, per Section 13.1.6.
  if (!payload.iat || Math.abs(nowSeconds - payload.iat) > MAX_IAT_AGE_SECONDS) {
    return { verified: false, reason: 'STALE_IAT' };
  }

  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const expectedHash = payload.request_body_sha256;
  if (!expectedHash) return { verified: false, reason: 'MISSING_BODY_HASH' };

  const bodyHashBuf = Buffer.from(bodyHash, 'hex');
  const expectedHashBuf = Buffer.from(expectedHash, 'hex');
  if (
    bodyHashBuf.length !== expectedHashBuf.length ||
    !crypto.timingSafeEqual(bodyHashBuf, expectedHashBuf)
  ) {
    return { verified: false, reason: 'BODY_HASH_MISMATCH' };
  }

  return { verified: true, payload };
}

module.exports = { verifyPlaidWebhook };
