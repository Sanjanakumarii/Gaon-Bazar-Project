# Gaon Bazaar

A working village marketplace built as a final-year college project. Customers can order from shops near the **delivery home**, including when ordering for parents from another city. Shopkeepers register their own shop and arrange local delivery.

## Run locally

Install **Node.js 24 LTS or newer**. In this folder:

```sh
npm ci
npm run build:local
npm run start:local
```

Open **http://localhost:3000**. The server listens only on your computer by default. Keep the terminal running. You can also use `START-WINDOWS.cmd` on Windows after installing dependencies and building.

The included ready-to-run release also runs with `node standalone/server.mjs` without installing packages. The source build is included for further development.

## Try the complete flow

1. Click Login → **Apna account banayein**. Register a seller account with email and password.
2. Open **Meri dukaan** → **Nayi dukaan**. Set the shop category, address, phone, exact map location, 5/10 km delivery range, delivery fee and extra charge.
3. Add products with prices and units. Toggle availability when a product is unavailable.
4. Use another browser/incognito window and register a customer account.
5. Select the delivery address and exact home location on the map (or enter latitude/longitude). Choose a home within the shop's service radius.
6. Open the shop, add products, and place an order with the recipient's name and phone. The server verifies prices and delivery distance.
7. In the seller account, accept the order, mark **Out for delivery**, then **Delivered**. The buyer sees status updates; orders refresh every 20 seconds.
8. Stop and restart the server: accounts, shops, products and orders remain in SQLite.

There are no fake shops or preloaded accounts. Create your own. Payment is **Cash on Delivery**; no payment gateway or real money transaction is performed by the website.

## Features

- Real email/password signup and login in the standalone app.
- Passwords hashed with salted scrypt; random session tokens stored as hashes; HttpOnly, SameSite cookies.
- One account can buy and operate shops.
- Shop categories: vegetables/fruits, grocery, food, dairy, clothes, beauty and other shops.
- GPS or map-selected locations, including a different person's home.
- Haversine distance filtering with 5/10 km limits enforced again on the server at checkout.
- Product availability, cart quantities, persisted cart across login, transparent item + delivery + extra totals.
- Order history, seller dashboard, controlled status transitions and pending-order cancellation.
- Server-side ownership checks, input validation, CSRF origin checks, duplicate-order protection and atomic order/line-item writes.
- English, Hindi and Hinglish interface with a saved side-panel language selector, larger-text mode, mobile cart shortcut and keyboard-accessible forms/dialogs. Other scheduled languages are listed as translation pending; they are not implemented yet.

## Code structure

```text
app/
  page.tsx                 Customer and seller UI
  location-picker.tsx      GPS + Leaflet map picker
  local-entry.tsx          Standalone React entry
  globals.css              Responsive design
  api/market/route.ts       Shared marketplace API handlers
lib/domain.ts              Validation, distance and status rules
db/schema.ts               Drizzle database schema
drizzle/                   Versioned SQL migrations and metadata
standalone/
  server.mjs               HTTP server, auth, static files, migrations
  runtime.mjs              SQLite adapter and per-request identity
  generated/               Built shared API (generated)
  public/                  Built frontend + Leaflet (generated)
  data/                    Private runtime database (never commit)
scripts/build-local.mjs    Build React and shared API
tests/integration.mjs      Real HTTP/SQLite integration tests
```

The cloud/ directory contains the Cloudflare Pages + D1 version with email/password authentication. The standalone Node/SQLite version runs independently on another laptop. See SETUP-HINDI.md for portable setup instructions.

## Verification

```sh
npm run build:local
npm run typecheck
npm test
```

The test suite uses an isolated database under `work/` and port 3001. It checks authentication, shop ownership, distance filtering, tampered totals, quantities, order persistence, idempotency, privacy, status transitions, unavailable products, CSRF and logout. It does not modify your normal application database.

## Data and configuration

- Default database: `standalone/data/gaon-bazaar.sqlite`.
- `PORT` (default `3000`), `HOST` (default `127.0.0.1`), `APP_ORIGIN` (default `http://localhost:3000`), `GB_DATA_DIR` (optional data folder).
- Back up the data folder while the app is stopped. Database files, sessions, secrets and dependency folders are excluded from Git.
- If deploying publicly, use HTTPS and set `APP_ORIGIN` to the real HTTPS origin; the session cookie then receives `Secure`. Add verified contact details, password recovery, abuse controls, backups and operational monitoring before a public commercial launch.
- Map tiles require internet and are provided by OpenStreetMap. If tiles fail, GPS/manual coordinates still work. Google Maps delivery directions open only when the seller clicks the link. Fonts have a system-font fallback.
- Distances are straight-line geographic distances, not road distances. Delivery fees are flat amounts set by each seller, not automatically calculated road fares.
- Shopkeepers arrange their own delivery and confirm timing by phone. No courier service, OTP, SMS notifications, stock-count reservation or payment gateway is integrated.

## Third-party assets

Leaflet 1.9.4 is vendored under `public/vendor/` (BSD-2-Clause). OpenStreetMap attribution is displayed in the map. React, Lucide and other dependencies retain their respective licenses.

## Current publication status

Organization: https://github.com/gaon-bazaar. Cloudflare deployment: https://gaon-bazaar.pages.dev. The deployed homepage and anonymous API response were verified. Local data is separate from the cloud database. This source package includes both deployment variants.


