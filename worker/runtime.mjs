import { AsyncLocalStorage } from "node:async_hooks";
export const context = new AsyncLocalStorage();
export const env = new Proxy(
  {},
  { get: (_, key) => context.getStore()?.bindings[key] },
);
export async function getChatGPTUser() {
  const headers = context.getStore().request.headers;
  const userId = headers.get("oai-authenticated-user-id");
  const email = headers.get("oai-authenticated-user-email");
  if (!userId || !email) return null;
  let fullName = null;
  if (
    headers.get("oai-authenticated-user-full-name-encoding") ===
    "percent-encoded-utf-8"
  ) {
    try {
      fullName =
        decodeURIComponent(
          headers.get("oai-authenticated-user-full-name") || "",
        ) || null;
    } catch {}
  }
  return { userId, email, fullName, displayName: fullName || email };
}
