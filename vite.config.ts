import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

function injectMissingLucideImports(): Plugin {
  return {
    name: 'inject-missing-lucide-imports',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');
      if (!normalizedId.endsWith('/src/App.tsx')) return null;

      const lucideImport = code.match(/import\s*\{[\s\S]*?\}\s*from ['"]lucide-react['"];?/);
      const alreadyImportsLock = lucideImport?.[0]?.includes('Lock') ?? false;
      const usesLockIcon = code.includes('<Lock ');

      if (!usesLockIcon || alreadyImportsLock) return null;

      return {
        code: `import { Lock } from 'lucide-react';\n${code}`,
        map: null,
      };
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [injectMissingLucideImports(), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
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
