import { firebaseApp } from './firebaseClient';

type AppCheckMode = 'off' | 'monitor' | 'enforce';
type AppCheckInstance = unknown;

type FirebaseAppCheckModule = {
  getToken: (appCheck: AppCheckInstance, forceRefresh?: boolean) => Promise<{ token: string }>;
  initializeAppCheck: (
    app: typeof firebaseApp,
    options: {
      provider: unknown;
      isTokenAutoRefreshEnabled: boolean;
    },
  ) => AppCheckInstance;
  ReCaptchaEnterpriseProvider: new (siteKey: string) => unknown;
};

let appCheckInstance: AppCheckInstance | null = null;
let appCheckModulePromise: Promise<FirebaseAppCheckModule> | null = null;
let appCheckWarningShown = false;

function getSiteKey() {
  return import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function getAppCheckModule() {
  if (!appCheckModulePromise) {
    appCheckModulePromise = import('firebase/app-check') as unknown as Promise<FirebaseAppCheckModule>;
  }

  return appCheckModulePromise;
}

export function getAppCheckMode(): AppCheckMode {
  return (import.meta.env.VITE_APPCHECK_MODE || 'monitor') as AppCheckMode;
}

export function isAppCheckConfigured() {
  return Boolean(getSiteKey());
}

export async function getClientAppCheck() {
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

  const appCheck = await getAppCheckModule();
  appCheckInstance = appCheck.initializeAppCheck(firebaseApp, {
    provider: new appCheck.ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheckInstance;
}

export async function getClientAppCheckToken() {
  const appCheckInstance = await getClientAppCheck();
  if (!appCheckInstance) return null;

  try {
    const appCheck = await getAppCheckModule();
    const tokenResult = await appCheck.getToken(appCheckInstance, false);
    return tokenResult.token;
  } catch (error) {
    console.warn('Unable to get Firebase App Check token:', error);

    if (getAppCheckMode() === 'enforce') {
      throw error;
    }

    return null;
  }
}
