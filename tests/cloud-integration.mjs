import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {DatabaseSync} from 'node:sqlite';
import {adaptDatabase} from '../standalone/runtime.mjs';
import worker from '../cloud/entry.mjs';
const db=new DatabaseSync(':memory:');
db.exec(await (await import('node:fs/promises')).readFile('cloud/setup.sql','utf8'));
const base='https://market.example.test';
const env={DB:adaptDatabase(db),ASSETS:{fetch:()=>new Response('app')}};
const fetch=(url,options)=>worker.fetch(new Request(url,options),env);
const server={listening:true,close:r=>r()};
let passed = 0;
function check(value, expected, label) {
  assert.deepEqual(value, expected, label);
  passed++;
  console.log("PASS", label);
}
async function request(url, body, cookie = "", origin = base) {
  const r = await fetch(base + url, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
async function account(name, email) {
  const r = await fetch(base + "/auth/signup", {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: base,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ name, email, password: "Testing-only-123!" }),
  });
  check(r.status, 303, "signup " + name);
  return r.headers.get("set-cookie").split(";")[0];
}
try {
  await new Promise((r) =>
    server.listening ? r() : server.once("listening", r),
  );
  check((await fetch(base)).status, 200, "homepage serves");
  check(
    (await request("/api/market?action=me")).data.user,
    null,
    "anonymous session",
  );
  check(
    (await request("/api/market", { action: "shop" })).status,
    401,
    "unauthenticated write rejected",
  );
  const owner = await account("Seller", "seller@example.test"),
    buyer = await account("Buyer", "buyer@example.test"),
    other = await account("Other Seller", "other@example.test");
  check(
    (await request("/api/market?action=me", null, owner)).data.user.name,
    "Seller",
    "cookie authenticates user",
  );
  const shopBody = {
    action: "shop",
    name: "Integration Test Kirana",
    category: "Kirana",
    address: "Test street, test village",
    phone: "9000000000",
    lat: 25.5941,
    lng: 85.1376,
    radius: 5,
    delivery: 20,
    extra: 5,
    description: "Test only",
  };
  const shop = await request("/api/market", shopBody, owner);
  check(shop.status, 200, "shop creation");
  check(
    (
      await request(
        "/api/market",
        {
          action: "product",
          shop: shop.data.id,
          name: "Rice",
          unit: "1 kg",
          price: 50,
        },
        other,
      )
    ).status,
    403,
    "other seller cannot edit shop",
  );
  check(
    (
      await request(
        "/api/market",
        {
          action: "product",
          shop: shop.data.id,
          name: "Rice",
          unit: "1 kg",
          price: 50,
        },
        owner,
      )
    ).status,
    200,
    "product creation",
  );
  const product = (
    await request("/api/market?action=products&shop=" + shop.data.id)
  ).data.products[0];
  check(
    (await request("/api/market?action=shops&lat=25.595&lng=85.138&radius=5"))
      .data.shops.length,
    1,
    "nearby shop included",
  );
  check(
    (await request("/api/market?action=shops&lat=28.61&lng=77.2&radius=10"))
      .data.shops.length,
    0,
    "faraway shop excluded",
  );
  const order = {
    action: "order",
    id: crypto.randomUUID(),
    shop: shop.data.id,
    recipient: "Test Parent",
    phone: "9000000001",
    address: "House 1, test street, test village",
    lat: 25.595,
    lng: 85.138,
    note: "Test only",
    items: [{ id: product.id, quantity: 2 }],
    expectedTotal: 12500,
  };
  check(
    (await request("/api/market", { ...order, expectedTotal: 1 }, buyer))
      .status,
    409,
    "tampered total rejected",
  );
  check(
    (await request("/api/market", { ...order, lat: 28.61, lng: 77.2 }, buyer))
      .status,
    400,
    "out-of-range order rejected",
  );
  check(
    (
      await request(
        "/api/market",
        { ...order, items: [{ id: product.id, quantity: -1 }] },
        buyer,
      )
    ).status,
    400,
    "negative quantity rejected",
  );
  check(
    (await request("/api/market", order, buyer)).status,
    200,
    "valid order placed",
  );
  check(
    (await request("/api/market", order, buyer)).data.id,
    order.id,
    "retry returns existing order",
  );
  const mine = (await request("/api/market?action=orders", null, buyer)).data
    .orders;
  check(mine.length, 1, "retry does not duplicate order");
  check(mine[0].total, 12500, "correct item delivery extra total");
  check(mine[0].items[0].quantity, 2, "line items persist");
  check(
    (await request("/api/market?action=orders", null, other)).data.orders
      .length,
    0,
    "other user cannot see order",
  );
  check(
    (await request("/api/market?action=orders&seller=1", null, owner)).data
      .orders.length,
    1,
    "seller sees own order",
  );
  check(
    (
      await request(
        "/api/market",
        { action: "status", id: order.id, status: "Accepted" },
        other,
      )
    ).status,
    403,
    "other user cannot update status",
  );
  check(
    (
      await request(
        "/api/market",
        { action: "status", id: order.id, status: "Delivered" },
        owner,
      )
    ).status,
    403,
    "invalid status jump rejected",
  );
  for (const status of ["Accepted", "Out for delivery", "Delivered"])
    check(
      (
        await request(
          "/api/market",
          { action: "status", id: order.id, status },
          owner,
        )
      ).status,
      200,
      "status " + status,
    );
  check(
    (
      await request(
        "/api/market",
        { action: "status", id: order.id, status: "Cancelled" },
        buyer,
      )
    ).status,
    403,
    "delivered order cannot be cancelled",
  );
  check(
    (
      await request(
        "/api/market",
        { action: "toggle", shop: shop.data.id, id: product.id, active: false },
        owner,
      )
    ).status,
    200,
    "product availability updated",
  );
  check(
    (await request("/api/market?action=products&shop=" + shop.data.id)).data
      .products.length,
    0,
    "unavailable item hidden",
  );
  check(
    (await request("/api/market", { ...order, id: crypto.randomUUID() }, buyer))
      .status,
    400,
    "unavailable item cannot be ordered",
  );
  const csrf = await fetch(base + "/api/market", {
    method: "POST",
    headers: {
      Origin: "https://evil.test",
      Cookie: owner,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shopBody),
  });
  check(csrf.status, 403, "cross-origin write rejected");
  const stored = db
    .prepare("SELECT password FROM cloud_users WHERE email=?")
    .get("seller@example.test").password;
  check(stored === "Testing-only-123!", false, "password is hashed");
  const logout = await fetch(base + "/signout-with-chatgpt", {
    headers: { Cookie: buyer },
    redirect: "manual",
  });
  check(logout.status, 303, "logout works");
  check(
    (await request("/api/market?action=me", null, buyer)).data.user,
    null,
    "logged out session revoked",
  );
  console.log(`\n${passed} integration checks passed.`);
} finally {
  await new Promise((r) => server.close(r));
  db.close();
}
