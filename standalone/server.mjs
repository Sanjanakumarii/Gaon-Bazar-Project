import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  randomUUID,
} from "node:crypto";
import { env, identity, adaptDatabase } from "./runtime.mjs";
import { GET, POST } from "./generated/market.mjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  data = process.env.GB_DATA_DIR || path.join(root, "data");
fs.mkdirSync(data, { recursive: true });
const db = new DatabaseSync(path.join(data, "gaon-bazaar.sqlite"));
db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
db.exec("CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)");
const migrations = path.join(root, "../drizzle");
for (const name of fs
  .readdirSync(migrations)
  .filter((n) => n.endsWith(".sql"))
  .sort())
  if (!db.prepare("SELECT name FROM migrations WHERE name=?").get(name)) {
    db.exec("BEGIN");
    try {
      db.exec(fs.readFileSync(path.join(migrations, name), "utf8"));
      db.prepare("INSERT INTO migrations VALUES (?)").run(name);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
db.exec(
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);",
);
env.DB = adaptDatabase(db);
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1",
  origin = process.env.APP_ORIGIN || `http://localhost:${port}`;
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const hash = (s) => createHash("sha256").update(s).digest("hex");
function authPage(mode = "login", error = "") {
  const signup = mode === "signup";
  return `<!doctype html><html lang="hi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${signup ? "Sign up" : "Login"} · Gaon Bazaar</title><link rel="stylesheet" href="/style.css"></head><body><main style="max-width:480px;padding-top:60px"><a class="brand" href="/">⌂ gaonbazaar</a><section class="seller-shop" style="margin-top:30px"><span class="eyebrow">APNE GAON KA APNA ACCOUNT</span><h1 style="margin-top:16px">${signup ? "Naya account banayein" : "Wapas swagat hai"}</h1><p class="muted">Ek account. Customer bhi, dukandaar bhi.</p>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ""}<form method="post" action="/auth/${signup ? "signup" : "login"}">${signup ? '<label>Aapka naam<input name="name" autocomplete="name" minlength="2" maxlength="80" required></label>' : ""}<label>Email<input name="email" type="email" autocomplete="email" maxlength="200" required></label><label>Password<input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" maxlength="128" required></label><button class="primary full">${signup ? "Account banayein" : "Login karein"} →</button></form><p style="margin-top:20px" class="small">${signup ? 'Pehle se account hai? <a href="/signin-with-chatgpt">Login karein</a>' : 'Naye hain? <a href="/signup">Apna account banayein</a>'}</p><p class="muted small">Password kam se kam 8 characters ka rakhein.</p></section></main></body></html>`;
}
function send(
  res,
  status,
  body,
  type = "text/html; charset=utf-8",
  extra = {},
) {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
    ...extra,
  });
  res.end(body);
}
async function readBody(req) {
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > 25000) throw Error("Request too large");
    parts.push(part);
  }
  return Buffer.concat(parts).toString();
}
const attempts = new Map();
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin),
      allowedOrigins = new Set([
        origin,
        `http://127.0.0.1:${port}`,
        `http://localhost:${port}`,
      ]);
    const token = (req.headers.cookie || "").match(
      /(?:^|;\s*)gb_session=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    const user = token
      ? db
          .prepare(
            "SELECT u.id AS userId,u.name AS displayName,u.email FROM sessions s JOIN users u ON u.id=s.user WHERE s.token=? AND s.expires>?",
          )
          .get(hash(token), Date.now())
      : null;
    if (req.method === "POST" && !allowedOrigins.has(req.headers.origin)) {
      send(res, 403, "Invalid request origin");
      return;
    }
    if (url.pathname === "/signin-with-chatgpt" || url.pathname === "/signup") {
      send(res, 200, authPage(url.pathname === "/signup" ? "signup" : "login"));
      return;
    }
    if (url.pathname === "/signout-with-chatgpt") {
      if (token)
        db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
      send(res, 303, "", "text/plain", {
        Location: "/",
        "Set-Cookie": "gb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
      return;
    }
    if (url.pathname.startsWith("/auth/") && req.method === "POST") {
      const mode = url.pathname === "/auth/signup" ? "signup" : "login",
        key = req.socket.remoteAddress;
      const attempt = attempts.get(key) || {
        count: 0,
        until: Date.now() + 900000,
      };
      if (Date.now() > attempt.until) {
        attempt.count = 0;
        attempt.until = Date.now() + 900000;
      }
      attempt.count++;
      attempts.set(key, attempt);
      if (attempt.count > 40) {
        send(
          res,
          429,
          authPage(mode, "Bahut attempts hue. 15 minute baad try karein."),
        );
        return;
      }
      const f = new URLSearchParams(await readBody(req)),
        email = (f.get("email") || "").trim().toLowerCase(),
        password = f.get("password") || "",
        name = (f.get("name") || "").trim();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 200 ||
        password.length < 8 ||
        password.length > 128
      ) {
        send(
          res,
          400,
          authPage(mode, "Sahi email aur 8–128 character password dein."),
        );
        return;
      }
      let found = db.prepare("SELECT * FROM users WHERE email=?").get(email);
      if (mode === "signup") {
        if (found || name.length < 2 || name.length > 80) {
          send(
            res,
            400,
            authPage(
              mode,
              "Email pehle se registered hai, ya naam sahi nahi hai.",
            ),
          );
          return;
        }
        const salt = randomBytes(16).toString("hex"),
          id = randomUUID();
        db.prepare("INSERT INTO users VALUES (?,?,?,?,?)").run(
          id,
          name,
          email,
          salt,
          scryptSync(password, salt, 64).toString("hex"),
        );
        found = { id };
      } else {
        const digest = scryptSync(
          password,
          found?.salt || "nonexistent-user-timing-salt",
          64,
        );
        if (
          !found ||
          !timingSafeEqual(digest, Buffer.from(found.password, "hex"))
        ) {
          send(res, 401, authPage(mode, "Email ya password sahi nahi hai."));
          return;
        }
      }
      db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
      const fresh = randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
        hash(fresh),
        found.id,
        Date.now() + 7 * 86400000,
      );
      attempts.delete(key);
      send(res, 303, "", "text/plain", {
        Location: "/",
        "Set-Cookie": `gb_session=${fresh}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${origin.startsWith("https:") ? "; Secure" : ""}`,
      });
      return;
    }
    if (url.pathname === "/api/market") {
      if (!["GET", "POST"].includes(req.method)) {
        send(res, 405, "Method not allowed");
        return;
      }
      const body = req.method === "POST" ? await readBody(req) : undefined;
      const headers = new Headers({ "Content-Type": "application/json" });
      if (req.headers.origin) headers.set("Origin", origin);
      const request = new Request(url, { method: req.method, headers, body });
      const response = await identity.run(user, () =>
        req.method === "POST" ? POST(request) : GET(request),
      );
      send(res, response.status, await response.text(), "application/json");
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Method not allowed");
      return;
    }
    const publicRoot = path.join(root, "public"),
      file = path.resolve(
        publicRoot,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
    if (!file.startsWith(publicRoot + path.sep)) {
      send(res, 403, "Forbidden");
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      send(res, 404, "Page not found");
      return;
    }
    const mime = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
    };
    send(
      res,
      200,
      req.method === "HEAD" ? "" : fs.readFileSync(file),
      mime[path.extname(file)] || "application/octet-stream",
    );
  } catch (e) {
    console.error(e);
    send(
      res,
      500,
      JSON.stringify({ error: "Server error. Please retry." }),
      "application/json",
    );
  }
});
server.listen(port, host, () =>
  console.log(
    `Gaon Bazaar running at ${origin}\nDatabase: ${path.join(data, "gaon-bazaar.sqlite")}`,
  ),
);
export { server, db };
