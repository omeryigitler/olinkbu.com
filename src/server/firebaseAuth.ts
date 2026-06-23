import crypto from 'crypto';

const DEFAULT_FIREBASE_PROJECT_ID = 'omeryigitler-5abfb';
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

type FirebaseCertCache = {
  certs: Record<string, string>;
  expiresAt: number;
};

export type VerifiedFirebaseUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

let certCache: FirebaseCertCache | null = null;

function getFirebaseProjectId() {
  return process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64');
}

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(decodeBase64Url(part).toString('utf8')) as T;
}

async function fetchFirebaseCerts() {
  const currentTime = Date.now();
  if (certCache && certCache.expiresAt > currentTime) {
    return certCache.certs;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Unable to fetch Firebase Auth certificates.');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  const certs = (await response.json()) as Record<string, string>;
  certCache = {
    certs,
    expiresAt: currentTime + maxAgeSeconds * 1000,
  };

  return certs;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart<{ alg?: string; kid?: string }>(encodedHeader);
  const payload = decodeJwtPart<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    name?: string;
    picture?: string;
  }>(encodedPayload);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid Firebase ID token header.');
  }

  const certs = await fetchFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unknown Firebase ID token key id.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const signature = decodeBase64Url(encodedSignature);
  if (!verifier.verify(cert, signature)) {
    throw new Error('Invalid Firebase ID token signature.');
  }

  const projectId = getFirebaseProjectId();
  const currentSeconds = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new Error('Firebase ID token has invalid audience.');
  }

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase ID token has invalid issuer.');
  }

  if (!payload.sub || payload.sub.length > 128) {
    throw new Error('Firebase ID token has invalid subject.');
  }

  if (!payload.exp || payload.exp <= currentSeconds) {
    throw new Error('Firebase ID token has expired.');
  }

  if (!payload.iat || payload.iat > currentSeconds + 300) {
    throw new Error('Firebase ID token has invalid issue time.');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

export async function verifyFirebaseIdTokenFromRequest(req: any) {
  const authorization = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    throw new Error('Missing Firebase ID token.');
  }

  return verifyFirebaseIdToken(authorization.slice('Bearer '.length));
}
