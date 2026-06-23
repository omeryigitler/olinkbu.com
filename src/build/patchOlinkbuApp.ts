import type { Plugin } from 'vite';

const LEGACY_SAVE_HANDLER = `  const handleToggleSave = (snippetId: string) => {\n    if (!user) return handleLogin();\n    setSavedSnippets(prev => {\n      const next = prev.includes(snippetId) ? prev.filter(id => id !== snippetId) : [...prev, snippetId];\n      localStorage.setItem('olinkbu_saved', JSON.stringify(next));\n      return next;\n    });\n  };`;

const CLOUD_SAVE_HANDLER = `  const handleToggleSave = async (snippetId: string) => {\n    if (!user) return handleLogin();\n    const snippet = snippets.find((item) => item.id === snippetId);\n    if (!snippet) return;\n    const wasSaved = savedSnippets.includes(snippetId);\n\n    setSavedSnippets((prev) => wasSaved ? prev.filter((id) => id !== snippetId) : [...prev, snippetId]);\n\n    try {\n      await toggleSnippetSave(db, user, snippet, wasSaved);\n    } catch (error) {\n      handleFirestoreError(error, OperationType.WRITE, 'users/saves');\n      setSavedSnippets((prev) => wasSaved ? [...prev, snippetId] : prev.filter((id) => id !== snippetId));\n    }\n  };`;

const USER_STATE_BLOCK = `  const [user, setUser] = useState<FirebaseUser | null>(null);\n  const [isAdmin, setIsAdmin] = useState(false);`;

const SAVED_SNIPPETS_SUBSCRIPTION_EFFECT = `  const [user, setUser] = useState<FirebaseUser | null>(null);\n  const [isAdmin, setIsAdmin] = useState(false);\n\n  useEffect(() => {\n    if (!user) {\n      setSavedSnippets([]);\n      return;\n    }\n\n    return subscribeSavedSnippetIds(\n      db,\n      user.uid,\n      (snippetIds) => {\n        setSavedSnippets(snippetIds);\n        localStorage.setItem('olinkbu_saved', JSON.stringify(snippetIds));\n      },\n      (error) => handleFirestoreError(error, OperationType.LIST, 'users/saves'),\n    );\n  }, [user]);`;

const LEGACY_LIKE_HANDLER = `  const handleLike = async (id: string, count: number) => {\n    if (!user) return handleLogin();\n    try { await setDoc(doc(db, 'snippets', id), { likesCount: count + 1 }, { merge: true }); } catch (e) { console.error(e); }\n  };`;

const CLOUD_REACTION_HANDLER = `  const handleLike = async (id: string, _count?: number) => {\n    if (!user) return handleLogin();\n    const snippet = snippets.find((item) => item.id === id);\n    if (!snippet) return;\n\n    try {\n      await setSnippetReaction(db, user, snippet, 'lightbulb');\n    } catch (error) {\n      handleFirestoreError(error, OperationType.WRITE, 'snippets/reactions');\n    }\n  };`;

const LEGACY_HOME_HERO = `                  {/* Hero Section at the top of Home */}
                  <div className="w-full max-w-3xl mb-12">
                    <div className="relative overflow-hidden bg-gradient-to-br dark:from-gray-900 dark:to-black from-gray-100 to-white border dark:border-white/5 border-black/5 rounded-[2.5rem] p-6 md:p-10 shadow-[0_0_100px_-20px_rgba(29,185,84,0.1)] flex flex-col transition-colors">
                       <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                       </div>

                       <div className="relative z-10 space-y-6 w-full mx-auto">
                          <div className="space-y-3 text-center">
                             <h2 className="text-3xl md:text-4xl font-strong italic leading-[0.9] uppercase tracking-tighter dark:text-white text-black">
                                HİSSİYATI <br /> <span className="text-brand">SANİYESİNDE</span> YAKALA.
                             </h2>
                             <p className="dark:text-gray-400 text-gray-500 font-medium text-sm">Favori anını sticker veya kesit olarak paylaş.</p>
                          </div>

                          <div className="flex flex-col md:flex-row dark:bg-black/60 bg-white/60 border dark:border-white/10 border-black/10 rounded-2xl p-2 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10 transition-all shadow-2xl items-stretch">
                             <div className="flex-1 flex items-center px-4 py-3">
                                <LinkIcon className="w-6 h-6 text-brand mr-4" />
                                <input 
                                  type="text" 
                                  placeholder="YouTube veya Spotify linkini yapıştır..." 
                                  className="flex-1 bg-transparent outline-none font-bold text-base dark:placeholder:text-gray-700 placeholder:text-gray-400 dark:text-white text-black" 
                                  value={inputUrl} 
                                  onChange={(e) => setInputUrl(e.target.value)} 
                                />
                             </div>
                             <button 
                               onClick={() => {
                                 if (inputUrl) setActiveTab('create');
                               }}
                               disabled={!inputUrl}
                               className="bg-brand text-black px-8 py-3 rounded-xl font-strong uppercase tracking-[0.1em] shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                             >
                               KESİT AL
                             </button>
                          </div>
                       </div>
                    </div>
                  </div>`;

const WHITE_RED_HOME_HERO = `                  {/* Hero Section at the top of Home */}
                  <div className="w-full max-w-5xl mb-12">
                    <div className="relative overflow-hidden rounded-[2.5rem] border border-red-100 bg-white p-5 md:p-8 shadow-[0_35px_110px_-55px_rgba(0,0,0,0.45)]">
                      <div className="absolute left-0 top-0 h-1.5 w-full bg-[#E10600]" />
                      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#E10600]/10 blur-3xl" />
                      <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-black/5 blur-3xl" />

                      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <div className="space-y-6">
                          <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[10px] font-strong uppercase tracking-[0.24em] text-[#E10600]">
                            <Sparkles className="h-3.5 w-3.5" />
                            Olinkbu Moment Network
                          </div>

                          <div className="space-y-4">
                            <h1 className="max-w-2xl text-5xl font-strong italic uppercase leading-[0.84] tracking-[-0.05em] text-black md:text-7xl lg:text-8xl">
                              HİSSİYATI <span className="text-[#E10600]">ANINDA</span> YAKALA
                            </h1>
                            <p className="max-w-xl text-base font-medium leading-7 text-gray-600 md:text-lg">
                              YouTube veya Spotify’daki en güçlü saniyeyi seç, notunu ekle ve paylaşılabilir bir ana dönüştür.
                            </p>
                          </div>

                          <div className="rounded-[1.75rem] border border-gray-200 bg-white p-2 shadow-2xl shadow-black/10">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <div className="flex flex-1 items-center rounded-2xl bg-gray-50 px-4 py-4 ring-1 ring-gray-100 focus-within:ring-2 focus-within:ring-[#E10600]/30">
                                <LinkIcon className="mr-3 h-5 w-5 text-[#E10600]" />
                                <input
                                  type="text"
                                  placeholder="YouTube veya Spotify linkini yapıştır..."
                                  className="w-full bg-transparent text-base font-bold text-black outline-none placeholder:text-gray-400"
                                  value={inputUrl}
                                  onChange={(e) => setInputUrl(e.target.value)}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  if (inputUrl) setActiveTab('create');
                                }}
                                disabled={!inputUrl}
                                className="rounded-2xl bg-[#E10600] px-8 py-4 font-strong text-lg uppercase tracking-[0.14em] text-white shadow-xl shadow-red-600/25 transition-all hover:scale-[1.02] hover:bg-[#c90500] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                              >
                                Hemen Paylaş
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2">Kesit Linki</span>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2">Küratör Notu</span>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2">Story Card</span>
                          </div>
                        </div>

                        <div className="relative min-h-[330px] overflow-hidden rounded-[2.25rem] bg-[#09090B] p-5 shadow-2xl shadow-black/25">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(225,6,0,0.36),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%)]" />
                          <div className="absolute right-[-18%] top-1/2 h-40 w-[72%] -translate-y-1/2 bg-[#E10600] shadow-[0_0_80px_rgba(225,6,0,0.55)]" style={{ clipPath: 'polygon(0 0, 74% 0, 100% 50%, 74% 100%, 0 100%, 18% 50%)' }} />
                          <div className="absolute right-[10%] top-1/2 h-20 w-[42%] -translate-y-1/2 bg-white/95" style={{ clipPath: 'polygon(0 0, 70% 0, 100% 50%, 70% 100%, 0 100%, 20% 50%)' }} />

                          <div className="relative z-10 flex h-full min-h-[290px] flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <div className="rounded-2xl bg-white px-4 py-3 text-black shadow-xl">
                                <p className="text-[10px] font-strong uppercase tracking-[0.2em] text-[#E10600]">Live Moment</p>
                                <p className="text-xl font-strong italic leading-none">00:42</p>
                              </div>
                              <div className="flex gap-2 text-white">
                                <div className="rounded-full bg-white/10 p-3 backdrop-blur"><Youtube className="h-5 w-5 text-[#E10600]" /></div>
                                <div className="rounded-full bg-white/10 p-3 backdrop-blur"><Music className="h-5 w-5" /></div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="max-w-[240px] rounded-3xl bg-white/10 p-4 text-white backdrop-blur-md ring-1 ring-white/10">
                                <p className="text-[10px] font-strong uppercase tracking-[0.22em] text-white/50">Slogan</p>
                                <p className="mt-2 text-2xl font-strong italic uppercase leading-none">Hissiyatı anında yakala.</p>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl bg-white p-3 text-black shadow-2xl">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E10600] text-white">
                                  <PlayCircle className="h-6 w-6 fill-current" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black">Favori anını paylaş</p>
                                  <p className="text-xs font-medium text-gray-500">Link → Kesit → Sosyal kart</p>
                                </div>
                                <Share2 className="h-5 w-5 text-[#E10600]" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>`;

function addMissingRuntimeImports(code: string) {
  let nextCode = code;
  const lucideImport = nextCode.match(/import\s*\{[\s\S]*?\}\s*from ['"]lucide-react['"];?/);
  const alreadyImportsLock = lucideImport?.[0]?.includes('Lock') ?? false;
  const usesLockIcon = nextCode.includes('<Lock ');

  if (usesLockIcon && !alreadyImportsLock) {
    nextCode = `import { Lock } from 'lucide-react';\n${nextCode}`;
  }

  if (!nextCode.includes("from './lib/cloudSync'")) {
    nextCode = `import { setSnippetReaction, subscribeSavedSnippetIds, toggleSnippetSave } from './lib/cloudSync';\n${nextCode}`;
  }

  return nextCode;
}

function replaceOrThrow(code: string, search: string, replacement: string, label: string) {
  if (!code.includes(search)) {
    throw new Error(`patchOlinkbuApp failed: ${label} target was not found.`);
  }

  return code.replace(search, replacement);
}

export function patchOlinkbuApp(): Plugin {
  return {
    name: 'patch-olinkbu-app',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');
      if (!normalizedId.endsWith('/src/App.tsx')) return null;

      let nextCode = addMissingRuntimeImports(code);
      nextCode = replaceOrThrow(nextCode, LEGACY_SAVE_HANDLER, CLOUD_SAVE_HANDLER, 'legacy save handler');
      nextCode = replaceOrThrow(nextCode, USER_STATE_BLOCK, SAVED_SNIPPETS_SUBSCRIPTION_EFFECT, 'user state block');
      nextCode = replaceOrThrow(nextCode, LEGACY_LIKE_HANDLER, CLOUD_REACTION_HANDLER, 'legacy like handler');
      nextCode = replaceOrThrow(nextCode, LEGACY_HOME_HERO, WHITE_RED_HOME_HERO, 'white red home hero');

      return nextCode === code ? null : { code: nextCode, map: null };
    },
  };
}
