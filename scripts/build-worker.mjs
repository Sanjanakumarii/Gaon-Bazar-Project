import fs from "node:fs/promises";
import { rolldown } from "rolldown";
import ts from "typescript";
await fs.mkdir("worker/generated", { recursive: true });
await fs.mkdir("dist/server", { recursive: true });
const client = await rolldown({
  input: "app/local-entry.tsx",
  platform: "browser",
  transform: {
    jsx: "react-jsx",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_STANDALONE": '"false"',
    },
  },
});
const output = await client.generate({ format: "esm", minify: true });
await client.close();
const assets = {
  "/index.html": {
    type: "text/html; charset=utf-8",
    body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gaon Bazaar — Local shops, every doorstep</title><meta name="description" content="Order essentials from shops near your village. Shopkeepers arrange delivery to your family at home."><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
  },
  "/app.js": {
    type: "text/javascript; charset=utf-8",
    body: output.output.find((x) => x.type === "chunk").code,
  },
  "/style.css": {
    type: "text/css; charset=utf-8",
    body: await fs.readFile("app/globals.css", "utf8"),
  },
};
for (const file of ["leaflet.js", "leaflet.css", "LEAFLET-LICENSE.txt"])
  assets["/vendor/" + file] = {
    type: file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : "text/plain",
    body: await fs.readFile("public/vendor/" + file, "utf8"),
  };
await fs.writeFile("worker/generated/assets.json", JSON.stringify(assets));
for (const [source, target] of [
  ["app/api/market/route.ts", "market.mjs"],
  ["lib/domain.ts", "domain.mjs"],
]) {
  const code = ts
    .transpileModule(await fs.readFile(source, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replaceAll("cloudflare:workers", "../runtime.mjs")
    .replaceAll("../../chatgpt-auth", "../runtime.mjs")
    .replaceAll("../../../lib/domain", "./domain.mjs");
  await fs.writeFile("worker/generated/" + target, code);
}
const worker = await rolldown({
  input: "worker/index.mjs",
  platform: "neutral",
  external: ["node:async_hooks"],
});
await worker.write({
  file: "dist/server/index.js",
  format: "esm",
  minify: true,
});
await worker.close();
console.log("Worker and embedded frontend built. D1 binding: DB.");
