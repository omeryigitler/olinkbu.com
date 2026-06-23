import type { Plugin } from 'vite';

const LANDING_HERO_IMPORT = "import { LandingHero } from './components/landing/LandingHero';\n";
const CREATE_STUDIO_IMPORT = "import { CreateStudio } from './components/create/CreateStudio';\n";
const HOME_HERO_SIGNATURE = 'function HomeHero({ inputUrl, setInputUrl, onStart }: { inputUrl: string; setInputUrl: (value: string) => void; onStart: () => void }) {';
const HOME_HERO_END_MARKER = '\nfunction Toast';
const MAIN_WIDTH_PATTERN = "${activeTab === 'home' ? 'max-w-screen-xl mx-auto' : 'max-w-4xl mx-auto'}";
const MAIN_WIDTH_REPLACEMENT = "${activeTab === 'home' ? 'max-w-screen-xl mx-auto' : activeTab === 'create' ? 'max-w-7xl mx-auto' : 'max-w-4xl mx-auto'}";
const CREATE_SECTION_START = "              {activeTab === 'create' && (";
const SAVED_SECTION_START = "\n\n              {activeTab === 'saved' && (";

function addImport(code: string, importLine: string, matcher: string) {
  return code.includes(matcher) ? code : `${importLine}${code}`;
}

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

function widenCreateLayout(code: string) {
  if (!code.includes(MAIN_WIDTH_PATTERN)) {
    return code;
  }

  return code.replace(MAIN_WIDTH_PATTERN, MAIN_WIDTH_REPLACEMENT);
}

function replaceCreateSection(code: string) {
  const startIndex = code.indexOf(CREATE_SECTION_START);
  if (startIndex === -1) {
    throw new Error('landingHeroPatch failed: create section start was not found.');
  }

  const endIndex = code.indexOf(SAVED_SECTION_START, startIndex);
  if (endIndex === -1) {
    throw new Error('landingHeroPatch failed: saved section marker after create section was not found.');
  }

  const replacement = `              {activeTab === 'create' && (
                <motion.section key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-10">
                  <CreateStudio
                    inputUrl={inputUrl}
                    setInputUrl={setInputUrl}
                    parsedMedia={parsedMedia}
                    generatedLinks={generatedLinks}
                    copiedLink={copiedLink}
                    startSec={startSec}
                    endSec={endSec}
                    userComment={userComment}
                    setUserComment={setUserComment}
                    snippetCategory={snippetCategory}
                    setSnippetCategory={setSnippetCategory}
                    isLoggedIn={Boolean(user)}
                    onStart={handleStartFromHero}
                    onCopy={handleCopy}
                    onCreate={handleCreateSnippet}
                    onLogin={handleLogin}
                    renderClipper={() => parsedMedia?.platform === 'youtube' ? (
                      <YouTubeClipper videoId={parsedMedia.id} onMarkStart={setStartSec} onMarkEnd={setEndSec} start={startSec} end={endSec} />
                    ) : null}
                  />
                </motion.section>
              )}`;

  return `${code.slice(0, startIndex)}${replacement}${code.slice(endIndex)}`;
}

export function landingHeroPatch(): Plugin {
  return {
    name: 'landing-hero-patch',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');
      if (!normalizedId.endsWith('/src/App.tsx')) return null;

      let nextCode = addImport(code, LANDING_HERO_IMPORT, "from './components/landing/LandingHero'");
      nextCode = addImport(nextCode, CREATE_STUDIO_IMPORT, "from './components/create/CreateStudio'");
      nextCode = replaceHomeHero(nextCode);
      nextCode = widenCreateLayout(nextCode);
      nextCode = replaceCreateSection(nextCode);

      return {
        code: nextCode,
        map: null,
      };
    },
  };
}
