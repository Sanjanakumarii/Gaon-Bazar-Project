# Project overview: Gaon Bazaar

## Problem
Rural residents, especially elderly people whose children live elsewhere, often need to travel for daily essentials. Small shops may have no online ordering system or platform partnership.

## Objective
Allow any local shopkeeper to register a shop, list products and receive orders from homes within a configurable 5–10 km service area. Family members can order for a remote home by selecting its delivery coordinates.

## Architecture
React UI → HTTP JSON API → validation/authorization → SQLite database.

Authentication uses local email/password accounts. A session cookie identifies the user; AsyncLocalStorage scopes identity to the HTTP request. Marketplace handlers never trust a buyer or seller ID supplied by the browser.

## Entities and relations
- users: account identity and salted password hash.
- sessions: hashed token, account foreign key and expiry.
- shops: owner, category, address, coordinates, service radius, delivery and extra fees.
- products: shop foreign key, name, unit, price in paise, availability.
- orders: buyer, shop foreign key, recipient and delivery snapshot, monetary totals, status and creation time.
- order_items: order foreign key and immutable product name/unit/price/quantity snapshot.

One user owns many shops; a shop has many products and orders; an order has many order items. Prices are stored as integer paise to avoid floating-point currency errors.

## Main algorithms
1. Haversine distance: compute geographic distance between the selected delivery home and each shop; include only shops within both the chosen search radius and the shop's service radius.
2. Checkout: validate authenticated user, recipient data, coordinates and item quantities; load current active products and authoritative prices; compute subtotal + delivery + extra; reject stale or altered client totals; write order and line items atomically.
3. Idempotency: an order UUID remains unchanged when a request is retried; an existing order is returned only to its buyer.
4. Order state machine: Placed → Accepted → Out for delivery → Delivered. Seller can cancel Placed/Accepted orders; buyer can cancel only Placed orders. SQL compares the prior state to prevent stale updates.
5. Authentication: generate random salt, derive scrypt password hash, compare using timingSafeEqual; issue random cookie token and store only its SHA-256 hash.

## Testing approach
The HTTP integration suite creates separate seller, buyer and unrelated-user accounts in an isolated SQLite database. It tests both valid workflows and invalid requests. Browser checks cover initial rendering, navigation, form interactions and map selection.

## Current boundaries
This is a functioning college project, not a logistics company. Cash on Delivery is the only payment option. Delivery is performed by the shopkeeper's own arrangement. Road routing, live driver tracking, OTP verification, password reset, SMS, exact inventory counts and refund processing are future enhancements.
