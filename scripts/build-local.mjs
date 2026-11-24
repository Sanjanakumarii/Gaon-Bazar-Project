import fs from "node:fs/promises";
import { rolldown } from "rolldown";
import ts from "typescript";
await fs.mkdir("standalone/public", { recursive: true });
await fs.mkdir("standalone/generated", { recursive: true });
const bundle = await rolldown({
  input: "app/local-entry.tsx",
  platform: "browser",
  transform: {
    jsx: "react-jsx",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_STANDALONE": '"true"',
    },
  },
});
await bundle.write({
  file: "standalone/public/app.js",
  format: "esm",
  minify: true,
});
await bundle.close();
await fs.copyFile("app/globals.css", "standalone/public/style.css");
await fs.cp("public/vendor", "standalone/public/vendor", { recursive: true });
for (const [source, target] of [
  ["lib/domain.ts", "domain.mjs"],
  ["app/api/market/route.ts", "market.mjs"],
]) {
  let code = ts.transpileModule(await fs.readFile(source, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  code = code
    .replace('"cloudflare:workers"', '"../runtime.mjs"')
    .replace("'cloudflare:workers'", "'../runtime.mjs'")
    .replace("../../chatgpt-auth", "../runtime.mjs")
    .replace("../../../lib/domain", "./domain.mjs");
  await fs.writeFile("standalone/generated/" + target, code);
}
await fs.writeFile(
  "standalone/public/index.html",
  '<!doctype html><html lang="hi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Gaon Bazaar — Apne gaon ki dukaan</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
);
console.log(
  "Standalone client and API built successfully. Start: node standalone/server.mjs",
);
