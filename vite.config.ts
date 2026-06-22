import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

function patchOlinkbuApp(): Plugin {
  return {
    name: 'patch-olinkbu-app',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');
      if (!normalizedId.endsWith('/src/App.tsx')) return null;

      let nextCode = code;
      const lucideImport = nextCode.match(/import\s*\{[\s\S]*?\}\s*from ['"]lucide-react['"];?/);
      const alreadyImportsLock = lucideImport?.[0]?.includes('Lock') ?? false;
      const usesLockIcon = nextCode.includes('<Lock ');

      if (usesLockIcon && !alreadyImportsLock) {
        nextCode = `import { Lock } from 'lucide-react';\n${nextCode}`;
      }

      if (!nextCode.includes("from './lib/cloudSync'")) {
        nextCode = `import { ensureUserProfile, setSnippetReaction, subscribeSavedSnippetIds, toggleSnippetSave } from './lib/cloudSync';\n${nextCode}`;
      }

      nextCode = nextCode.replace(
        `      setUser(currentUser);\n      setIsAdmin(currentUser?.email === 'yigitleromer@gmail.com');`,
        `      setUser(currentUser);\n      if (currentUser) {\n        ensureUserProfile(db, currentUser).catch((error) => handleFirestoreError(error, OperationType.WRITE, 'users'));\n      }\n      setIsAdmin(currentUser?.email === 'yigitleromer@gmail.com');`,
      );

      nextCode = nextCode.replace(
        `  const handleToggleSave = (snippetId: string) => {\n    if (!user) return handleLogin();\n    setSavedSnippets(prev => {\n      const next = prev.includes(snippetId) ? prev.filter(id => id !== snippetId) : [...prev, snippetId];\n      localStorage.setItem('olinkbu_saved', JSON.stringify(next));\n      return next;\n    });\n  };`,
        `  const handleToggleSave = async (snippetId: string) => {\n    if (!user) return handleLogin();\n    const snippet = snippets.find((item) => item.id === snippetId);\n    if (!snippet) return;\n    const wasSaved = savedSnippets.includes(snippetId);\n\n    setSavedSnippets((prev) => wasSaved ? prev.filter((id) => id !== snippetId) : [...prev, snippetId]);\n\n    try {\n      await toggleSnippetSave(db, user, snippet, wasSaved);\n    } catch (error) {\n      handleFirestoreError(error, OperationType.WRITE, 'users/saves');\n      setSavedSnippets((prev) => wasSaved ? [...prev, snippetId] : prev.filter((id) => id !== snippetId));\n    }\n  };\n\n  useEffect(() => {\n    if (!user) {\n      setSavedSnippets([]);\n      return;\n    }\n\n    return subscribeSavedSnippetIds(\n      db,\n      user.uid,\n      (snippetIds) => {\n        setSavedSnippets(snippetIds);\n        localStorage.setItem('olinkbu_saved', JSON.stringify(snippetIds));\n      },\n      (error) => handleFirestoreError(error, OperationType.LIST, 'users/saves'),\n    );\n  }, [user]);`,
      );

      nextCode = nextCode.replace(
        `  const handleLike = async (id: string, count: number) => {\n    if (!user) return handleLogin();\n    try { await setDoc(doc(db, 'snippets', id), { likesCount: count + 1 }, { merge: true }); } catch (e) { console.error(e); }\n  };`,
        `  const handleLike = async (id: string, _count?: number) => {\n    if (!user) return handleLogin();\n    const snippet = snippets.find((item) => item.id === id);\n    if (!snippet) return;\n\n    try {\n      await setSnippetReaction(db, user, snippet, 'lightbulb');\n    } catch (error) {\n      handleFirestoreError(error, OperationType.WRITE, 'snippets/reactions');\n    }\n  };`,
      );

      return nextCode === code ? null : { code: nextCode, map: null };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [patchOlinkbuApp(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify-file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
