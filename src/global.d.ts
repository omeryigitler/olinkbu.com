/// <reference types="vite/client" />

import type { ComponentType, SVGProps } from 'react';

declare global {
  const Lock: ComponentType<SVGProps<SVGSVGElement>>;
}

interface ImportMetaEnv {
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string;
  readonly VITE_APPCHECK_MODE?: 'off' | 'monitor' | 'enforce';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
