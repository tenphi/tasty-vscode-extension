import { defineConfig } from 'vite';
import { resolve } from 'path';

// Test configuration for vitest
const testConfig = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});

const nodeExternals = [
  'vscode',
  'path',
  'fs',
  'os',
  'util',
  'events',
  'stream',
  'net',
  'child_process',
  'crypto',
  'http',
  'https',
  'url',
  'zlib',
  'assert',
  'tty',
  'vm',
  'module',
  'buffer',
  'string_decoder',
  'perf_hooks',
  'inspector',
  'async_hooks',
  'worker_threads',
  'diagnostics_channel',
];

// Get the target from command line args
const target = process.env.BUILD_TARGET;

const clientConfig = defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'client/src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    outDir: 'dist/client',
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: nodeExternals,
    },
    target: 'node18',
    emptyOutDir: true,
    ssr: true,
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
  },
  ssr: {
    target: 'node',
    // Bundle all npm dependencies (except Node.js builtins which are in nodeExternals)
    noExternal: true,
    external: nodeExternals,
  },
});

const serverConfig = defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'server/src/server.ts'),
      formats: ['cjs'],
      fileName: () => 'server.js',
    },
    outDir: 'dist/server',
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: nodeExternals,
    },
    target: 'node18',
    emptyOutDir: true,
    ssr: true,
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
  },
  ssr: {
    target: 'node',
    noExternal: true,
    external: nodeExternals,
  },
});

// Export test config when running vitest, otherwise export build config
export default process.env.VITEST
  ? testConfig
  : target === 'server'
    ? serverConfig
    : clientConfig;
