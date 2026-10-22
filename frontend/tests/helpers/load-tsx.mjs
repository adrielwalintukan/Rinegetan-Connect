import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname, extname } from 'node:path';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../..');
export function tsxLoader(boundaries = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} }; cache.set(filename, mod);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), { fileName: filename.replace(/\.mjs$/, ".js"), compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'module', 'exports', code)((id) => {
      if (id in boundaries) return boundaries[id];
      if (id.startsWith('@/') || id.startsWith('.')) {
        const target = id.startsWith('@/') ? resolve(root, 'src', id.slice(2)) : resolve(dirname(filename), id);
        if (extname(target) === '.mjs') return load(target);
        for (const ext of ['.tsx', '.ts', '.js', '.jsx', '.mjs', '/index.ts']) {
          try { readFileSync(target + ext); } catch { continue; }
          return load(target + ext);
        }
      }
      return require(id);
    }, mod, mod.exports);
    return mod.exports;
  }
  return load;
}
