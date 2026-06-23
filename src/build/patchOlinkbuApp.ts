import type { Plugin } from 'vite';

const LEGACY_SAVE_HANDLER = `  const handleToggleSave = (snippetId: string) => {\n    if (!user) return handleLogin();\n    setSavedSnippets(prev => {\n      const next = prev.includes(snippetId) ? prev.filter(id => id !== snippetId) : [...prev, snippetId];\n      localStorage.setItem('olinkbu_saved', JSON.stringify(next));\n      return next;\n    });\n  };`;

const CLOUD_SAVE_HANDLER = `  const handleToggleSave = async (snippetId: string) => {\n    if (!user) return handleLogin();\n    const snippet = snippets.find((item) => item.id === snippetId);\n    if (!snippet) return;\n    const wasSaved = savedSnippets.includes(snippetId);\n\n    setSavedSnippets((prev) => wasSaved ? prev.filter((id) => id !== snippetId) : [...prev, snippetId]);\n\n    try {\n      await toggleSnippetSave(db, user, snippet, wasSaved);\n    } catch (error) {\n      handleFirestoreError(error, OperationType.WRITE, 'users/saves');\n      setSavedSnippets((prev) => wasSaved ? [...prev, snippetId] : prev.filter((id) => id !== snippetId));\n    }\n  };\n\n  useEffect(() => {\n    if (!user) {\n      setSavedSnippets([]);\n      return;\n    }\n\n    return subscribeSavedSnippetIds(\n      db,\n      user.uid,\n      (snippetIds) => {\n        setSavedSnippets(snippetIds);\n        localStorage.setItem('olinkbu_saved', JSON.stringify(snippetIds));\n      },\n      (error) => handleFirestoreError(error, OperationType.LIST, 'users/saves'),\n    );\n  }, [user]);`;

const LEGACY_LIKE_HANDLER = `  const handleLike = async (id: string, count: number) => {\n    if (!user) return handleLogin();\n    try { await setDoc(doc(db, 'snippets', id), { likesCount: count + 1 }, { merge: true }); } catch (e) { console.error(e); }\n  };`;

const CLOUD_REACTION_HANDLER = `  const handleLike = async (id: string, _count?: number) => {\n    if (!user) return handleLogin();\n    const snippet = snippets.find((item) => item.id === id);\n    if (!snippet) return;\n\n    try {\n      await setSnippetReaction(db, user, snippet, 'lightbulb');\n    } catch (error) {\n      handleFirestoreError(error, OperationType.WRITE, 'snippets/reactions');\n    }\n  };`;

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
      nextCode = replaceOrThrow(nextCode, LEGACY_LIKE_HANDLER, CLOUD_REACTION_HANDLER, 'legacy like handler');

      return nextCode === code ? null : { code: nextCode, map: null };
    },
  };
}
