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
                <motion.section key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-6 sm:pb-10">
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

function replaceOnce(code: string, search: string, replacement: string) {
  return code.includes(search) ? code.replace(search, replacement) : code;
}

function patchCreateStudioMobileLayout(code: string) {
  let nextCode = code;

  nextCode = replaceOnce(
    nextCode,
    'className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white p-4 shadow-[0_30px_120px_-70px_rgba(15,23,42,0.75)] lg:h-[calc(100vh-8.5rem)] lg:min-h-[680px] lg:p-6"',
    'className="relative mx-auto w-full max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_30px_120px_-70px_rgba(15,23,42,0.75)] sm:p-4 lg:h-[calc(100vh-8.5rem)] lg:min-h-[680px] lg:p-6"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="relative z-10 grid h-full gap-5 lg:grid-cols-[0.82fr_1.18fr] xl:grid-cols-[0.78fr_1.22fr]"',
    'className="relative z-10 grid h-full min-w-0 gap-3 sm:gap-4 lg:gap-5 lg:grid-cols-[0.82fr_1.18fr] xl:grid-cols-[0.78fr_1.22fr]"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="flex min-h-0 flex-col rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 lg:p-6"',
    'className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50/80 p-4 lg:rounded-[1.75rem] lg:p-6"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="text-4xl font-black italic uppercase leading-[0.9] tracking-[-0.06em] text-slate-950 xl:text-5xl"',
    'className="text-[2.25rem] font-black italic uppercase leading-[0.9] tracking-[-0.06em] text-slate-950 sm:text-4xl xl:text-5xl"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-red-500/30"',
    'className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-red-500/30 sm:flex-row sm:items-center sm:px-4 sm:py-4"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"',
    'className="w-full min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="rounded-xl bg-red-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50"',
    'className="w-full rounded-xl bg-red-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50 sm:w-auto"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="min-h-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_22px_80px_rgba(15,23,42,0.08)] lg:p-5"',
    'className="min-h-0 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_22px_80px_rgba(15,23,42,0.08)] sm:p-4 lg:rounded-[1.75rem] lg:p-5"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="h-[calc(100%-4.25rem)] min-h-[520px] overflow-y-auto pr-1"',
    'className="min-h-0 overflow-visible pr-0 lg:h-[calc(100%-4.25rem)] lg:min-h-[520px] lg:overflow-y-auto lg:pr-1"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl"',
    'className="fixed inset-0 z-[140] overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-xl sm:p-4"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="grid w-full max-w-5xl gap-6 rounded-[2rem] bg-white p-5 shadow-2xl lg:grid-cols-[0.85fr_1.15fr]"',
    'className="mx-auto my-3 grid w-full max-w-5xl gap-4 rounded-3xl bg-white p-3 shadow-2xl sm:p-5 lg:grid-cols-[0.85fr_1.15fr]"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="flex flex-col justify-center p-3"',
    'className="flex flex-col justify-center p-2 sm:p-3"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="text-5xl font-black italic uppercase leading-none tracking-[-0.06em] text-slate-950"',
    'className="text-3xl font-black italic uppercase leading-none tracking-[-0.06em] text-slate-950 sm:text-5xl"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="mt-5 text-base font-semibold leading-7 text-slate-600"',
    'className="mt-3 text-sm font-semibold leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="mt-6 grid gap-3 sm:grid-cols-2"',
    'className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="grid place-items-center rounded-[1.5rem] bg-slate-100 p-4"',
    'className="grid place-items-center rounded-3xl bg-slate-100 p-2 sm:p-4"',
  );

  nextCode = replaceOnce(
    nextCode,
    'className="max-h-[78vh] w-auto rounded-[1.5rem] bg-white shadow-2xl"',
    'className="h-auto max-h-[46vh] w-full max-w-[240px] rounded-2xl bg-white shadow-2xl sm:max-h-[58vh] sm:max-w-[320px] lg:max-h-[78vh] lg:w-auto lg:max-w-none lg:rounded-[1.5rem]"',
  );

  return nextCode;
}

export function landingHeroPatch(): Plugin {
  return {
    name: 'landing-hero-patch',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');

      if (normalizedId.endsWith('/src/components/create/CreateStudio.tsx')) {
        return {
          code: patchCreateStudioMobileLayout(code),
          map: null,
        };
      }

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
