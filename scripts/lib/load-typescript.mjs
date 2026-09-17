import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
/** Execute repository modules for behavior tests without changing the production bundler. */
export function typescriptLoader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    const path = resolve(root, filename);
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const source = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: path,
    }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
      if (id.startsWith(".")) return load(resolve(dirname(path), id.endsWith(".ts") ? id : `${id}.ts`));
      return require(id);
    };
    new Function("require", "module", "exports", source)(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}
