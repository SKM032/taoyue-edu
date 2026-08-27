import { build } from 'vite';
const res = await build({
  configFile: 'vite.config.ts',
  build: { outDir: '.vite-verify', emptyOutDir: true, minify: false, reportCompressedSize: false },
});
const names = res && Array.isArray(res) ? res.map(r => r.fileName || '').filter(Boolean) : [];
console.log('VITE_BUILD_OK chunks:', names.length);
