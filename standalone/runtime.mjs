import { AsyncLocalStorage } from "node:async_hooks";
export const identity = new AsyncLocalStorage();
export const getChatGPTUser = async () => identity.getStore() ?? null;
export const env = { DB: null };
export function adaptDatabase(sqlite) {
  const prepare = (sql) => {
    const stmt = sqlite.prepare(sql);
    let values = [];
    return {
      bind(...args) {
        values = args;
        return this;
      },
      async first() {
        return stmt.get(...values) || null;
      },
      async all() {
        return { results: stmt.all(...values) };
      },
      execute() {
        const r = stmt.run(...values);
        return { meta: { changes: r.changes } };
      },
      async run() {
        return this.execute();
      },
    };
  };
  return {
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map((s) => s.execute());
        sqlite.exec("COMMIT");
        return results;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
