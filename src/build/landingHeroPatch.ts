import type { Plugin } from 'vite';

const LANDING_HERO_IMPORT = "import { LandingHero } from './components/landing/LandingHero';\n";
const HOME_HERO_SIGNATURE = 'function HomeHero({ inputUrl, setInputUrl, onStart }: { inputUrl: string; setInputUrl: (value: string) => void; onStart: () => void }) {';
const HOME_HERO_END_MARKER = '\nfunction Toast';

function replaceHomeHero(code: string) {
  const startIndex = code.indexOf(HOME_HERO_SIGNATURE);
  if (startIndex === -1) {
    throw new Error('landingHeroPatch failed: HomeHero function signature was not found.');
  }

  const endIndex = code.indexOf(HOME_HERO_END_MARKER, startIndex);
  if (endIndex === -1) {
    throw new Error('landingHeroPatch failed: Toast marker after HomeHero was not found.');
  }

  const replacement = `function HomeHero({ inputUrl, setInputUrl, onStart }: { inputUrl: string; setInputUrl: (value: string) => void; onStart: () => void }) {
  return <LandingHero inputUrl={inputUrl} setInputUrl={setInputUrl} onStart={onStart} />;
}
`;

  return `${code.slice(0, startIndex)}${replacement}${code.slice(endIndex)}`;
}

export function landingHeroPatch(): Plugin {
  return {
    name: 'landing-hero-patch',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');
      if (!normalizedId.endsWith('/src/App.tsx')) return null;

      const withImport = code.includes("from './components/landing/LandingHero'")
        ? code
        : `${LANDING_HERO_IMPORT}${code}`;

      return {
        code: replaceHomeHero(withImport),
        map: null,
      };
    },
  };
}
