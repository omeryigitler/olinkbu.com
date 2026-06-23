import crypto from 'crypto';

const FIREBASE_APPCHECK_JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1/jwks';
const DEFAULT_PROJECT_NUMBER = '1082547983896';

type AppCheckHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type AppCheckPayload = {
  aud?: string | string[];
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
};

type JwksCache = {
  keys: Map<string, JsonWebKey>;
  expiresAt: number;
};

export type AppCheckMode = 'off' | 'monitor' | 'enforce';

export type AppCheckVerificationResult = {
  ok: boolean;
  mode: AppCheckMode;
  appId?: string;
  reason?: string;
};

let jwksCache: JwksCache | null = null;

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64');
}

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(decodeBase64Url(part).toString('utf8')) as T;
}

function getAppCheckMode(): AppCheckMode {
  const rawMode = (process.env.APPCHECK_ENFORCEMENT_MODE || 'monitor').toLowerCase();
  if (rawMode === 'off' || rawMode === 'enforce') return rawMode;
  return 'monitor';
}

function getProjectNumber() {
  return process.env.FIREBASE_PROJECT_NUMBER || DEFAULT_PROJECT_NUMBER;
}

function getAllowedAppIds() {
  return (process.env.FIREBASE_APPCHECK_APP_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getHeaderValue(req: any, name: string) {
  const direct = req.headers?.[name];
  if (typeof direct === 'string') return direct;

  const lower = req.headers?.[name.toLowerCase()];
  if (typeof lower === 'string') return lower;

  return '';
}

async function fetchAppCheckJwks() {
  const currentTime = Date.now();
  if (jwksCache && jwksCache.expiresAt > currentTime) {
    return jwksCache.keys;
  }

  const response = await fetch(FIREBASE_APPCHECK_JWKS_URL);
  if (!response.ok) {
    throw new Error('Unable to fetch Firebase App Check JWKS.');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const payload = await response.json() as { keys?: JsonWebKey[] };
  const keys = new Map<string, JsonWebKey>();

  for (const key of payload.keys || []) {
    if (key.kid) keys.set(key.kid, key);
  }

  jwksCache = {
    keys,
    expiresAt: currentTime + maxAgeSeconds * 1000,
  };

  return keys;
}

function hasExpectedAudience(audience: AppCheckPayload['aud'], projectNumber: string) {
  const expectedAudience = `projects/${projectNumber}`;
  return Array.isArray(audience)
    ? audience.includes(expectedAudience)
    : audience === expectedAudience;
}

function hasAllowedAppId(appId: string | undefined) {
  if (!appId) return false;

  const allowedAppIds = getAllowedAppIds();
  if (allowedAppIds.length === 0) return true;

  return allowedAppIds.includes(appId);
}

export async function verifyFirebaseAppCheckToken(appCheckToken: string) {
  const parts = appCheckToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase App Check token.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart<AppCheckHeader>(encodedHeader);
  const payload = decodeJwtPart<AppCheckPayload>(encodedPayload);

  if (header.alg !== 'RS256' || header.typ !== 'JWT' || !header.kid) {
    throw new Error('Invalid Firebase App Check token header.');
  }

  const jwks = await fetchAppCheckJwks();
  const jwk = jwks.get(header.kid);
  if (!jwk) {
    throw new Error('Unknown Firebase App Check key id.');
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  if (!verifier.verify(publicKey, decodeBase64Url(encodedSignature))) {
    throw new Error('Invalid Firebase App Check token signature.');
  }

  const projectNumber = getProjectNumber();
  const currentSeconds = Math.floor(Date.now() / 1000);

  if (payload.iss !== `https://firebaseappcheck.googleapis.com/${projectNumber}`) {
    throw new Error('Firebase App Check token has invalid issuer.');
  }

  if (!hasExpectedAudience(payload.aud, projectNumber)) {
    throw new Error('Firebase App Check token has invalid audience.');
  }

  if (!payload.exp || payload.exp <= currentSeconds) {
    throw new Error('Firebase App Check token has expired.');
  }

  if (!payload.iat || payload.iat > currentSeconds + 300) {
    throw new Error('Firebase App Check token has invalid issue time.');
  }

  if (!hasAllowedAppId(payload.sub)) {
    throw new Error('Firebase App Check token subject is not allowed.');
  }

  return {
    appId: payload.sub,
    audience: payload.aud,
    issuer: payload.iss,
  };
}

export async function verifyAppCheckFromRequest(req: any): Promise<AppCheckVerificationResult> {
  const mode = getAppCheckMode();
  if (mode === 'off') {
    return { ok: true, mode };
  }

  const token = getHeaderValue(req, 'X-Firebase-AppCheck');
  if (!token) {
    const reason = 'Missing Firebase App Check token.';
    if (mode === 'monitor') console.warn(reason);
    return { ok: mode === 'monitor', mode, reason };
  }

  try {
    const result = await verifyFirebaseAppCheckToken(token);
    return { ok: true, mode, appId: result.appId };
  } catch (error: any) {
    const reason = error?.message || 'Invalid Firebase App Check token.';
    if (mode === 'monitor') console.warn(reason);
    return { ok: mode === 'monitor', mode, reason };
  }
}

export async function requireAppCheck(req: any, res: any) {
  const result = await verifyAppCheckFromRequest(req);
  res.setHeader('X-App-Check-Mode', result.mode);
  res.setHeader('X-App-Check-Verified', result.ok ? 'true' : 'false');

  if (!result.ok) {
    res.status(401).json({ error: 'App Check verification failed.' });
    return false;
  }

  return true;
}
