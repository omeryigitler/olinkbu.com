import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { firebaseApp } from './firebaseClient';

let appCheckInstance: AppCheck | null = null;
let appCheckWarningShown = false;

function getSiteKey() {
  return import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getAppCheckMode() {
  return (import.meta.env.VITE_APPCHECK_MODE || 'monitor') as 'off' | 'monitor' | 'enforce';
}

export function isAppCheckConfigured() {
  return Boolean(getSiteKey());
}

export function getClientAppCheck() {
  if (!isBrowser()) return null;
  if (appCheckInstance) return appCheckInstance;

  const siteKey = getSiteKey();
  if (!siteKey) {
    if (!appCheckWarningShown) {
      console.warn('Firebase App Check site key is not configured. Protected API calls will run without App Check in monitor mode only.');
      appCheckWarningShown = true;
    }
    return null;
  }

  appCheckInstance = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheckInstance;
}

export async function getClientAppCheckToken() {
  const appCheck = getClientAppCheck();
  if (!appCheck) return null;

  try {
    const tokenResult = await getToken(appCheck, false);
    return tokenResult.token;
  } catch (error) {
    console.warn('Unable to get Firebase App Check token:', error);

    if (getAppCheckMode() === 'enforce') {
      throw error;
    }

    return null;
  }
}
