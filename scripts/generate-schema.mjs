import fs from "node:fs/promises";
import ts from "typescript";
import {
  generateSQLiteDrizzleJson,
  generateSQLiteMigration,
} from "drizzle-kit/api";
await fs.mkdir("work", { recursive: true });
const code = ts.transpileModule(await fs.readFile("db/schema.ts", "utf8"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
await fs.writeFile("work/schema.mjs", code);
const schema = await import("../work/schema.mjs");
const before = await generateSQLiteDrizzleJson({});
const after = await generateSQLiteDrizzleJson(schema, before.id);
const statements = await generateSQLiteMigration(before, after);
await fs.mkdir("drizzle/meta", { recursive: true });
try {
  const journal = JSON.parse(
    await fs.readFile("drizzle/meta/_journal.json", "utf8"),
  );
  if (journal.entries.length)
    throw Error(
      "Existing migration found. Use drizzle-kit generate for subsequent changes.",
    );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
await fs.writeFile(
  "drizzle/0000_marketplace.sql",
  statements.join("\n--> statement-breakpoint\n") + "\n",
);
await fs.writeFile(
  "drizzle/meta/0000_snapshot.json",
  JSON.stringify(after, null, 2),
);
await fs.writeFile(
  "drizzle/meta/_journal.json",
  JSON.stringify(
    {
      version: "7",
      dialect: "sqlite",
      entries: [
        {
          idx: 0,
          version: "6",
          when: Date.now(),
          tag: "0000_marketplace",
          breakpoints: true,
        },
      ],
    },
    null,
    2,
  ),
);
console.log(
  "Generated marketplace migration:",
  statements.length,
  "statements",
);
