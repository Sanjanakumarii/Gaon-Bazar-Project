import { context } from "./runtime.mjs";
import { GET, POST } from "./generated/market.mjs";
import assets from "./generated/assets.json";
export default {
  async fetch(request, bindings) {
    const url = new URL(request.url);
    if (url.pathname === "/api/market") {
      if (!["GET", "POST"].includes(request.method))
        return new Response("Method not allowed", { status: 405 });
      return context.run({ request, bindings }, () =>
        request.method === "POST" ? POST(request) : GET(request),
      );
    }
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", { status: 405 });
    const asset = assets[url.pathname === "/" ? "/index.html" : url.pathname];
    if (!asset) return new Response("Not found", { status: 404 });
    return new Response(request.method === "HEAD" ? null : asset.body, {
      headers: {
        "Content-Type": asset.type,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Cache-Control": "no-cache",
      },
    });
  },
};
