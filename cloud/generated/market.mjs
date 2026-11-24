import { categories, coordinates, distance, money, phone, string, transitions, } from "./domain.mjs";
export const dynamic = "force-dynamic";
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req, env, authUser) {
    try {
        const user = authUser, db = env.DB;
        const p = new URL(req.url).searchParams, action = p.get("action");
        if (action === "me")
            return json({
                user: user ? { id: user.userId, name: user.displayName } : null,
            });
        if (action === "shops") {
            const lat = Number(p.get("lat")), lng = Number(p.get("lng"));
            if (!p.has("lat") || !p.has("lng"))
                return json({ shops: [] });
            coordinates(lat, lng);
            const radius = p.get("radius") === "5" ? 5 : 10;
            const { results } = await db
                .prepare("SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.shop=s.id AND p.active=1) AS product_count FROM shops s")
                .all();
            return json({
                shops: results
                    .map((s) => ({ ...s, distance: distance(lat, lng, s.lat, s.lng) }))
                    .filter((s) => s.distance <= Math.min(radius, s.radius))
                    .sort((a, b) => a.distance - b.distance),
            });
        }
        if (action === "products")
            return json({
                products: (await db
                    .prepare("SELECT * FROM products WHERE shop=? AND active=1")
                    .bind(p.get("shop"))
                    .all()).results,
            });
        if (!user)
            return json({ error: "Pehle login karein." }, 401);
        if (action === "seller") {
            const shops = (await db
                .prepare("SELECT * FROM shops WHERE owner=?")
                .bind(user.userId)
                .all()).results;
            const products = (await db
                .prepare("SELECT p.* FROM products p JOIN shops s ON s.id=p.shop WHERE s.owner=?")
                .bind(user.userId)
                .all()).results;
            return json({ shops, products });
        }
        if (action === "orders") {
            const seller = p.get("seller") === "1";
            const orders = (await db
                .prepare(`SELECT o.*,s.name AS shop_name,s.phone AS shop_phone FROM orders o JOIN shops s ON s.id=o.shop WHERE ${seller ? "s.owner" : "o.buyer"}=? ORDER BY o.created DESC LIMIT 200`)
                .bind(user.userId)
                .all()).results;
            const items = (await db
                .prepare(`SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id JOIN shops s ON s.id=o.shop WHERE ${seller ? "s.owner" : "o.buyer"}=?`)
                .bind(user.userId)
                .all()).results;
            return json({
                orders: orders.map((o) => ({
                    ...o,
                    items: items.filter((i) => i.order_id === o.id),
                })),
            });
        }
        return json({ error: "Unknown request" }, 400);
    }
    catch (e) {
        console.error(e);
        return json({ error: "Data load nahi hua. Thodi der mein phir try karein." }, 500);
    }
}
export async function POST(req, env, authUser) {
    try {
        if (req.headers.get("origin") !== new URL(req.url).origin)
            return json({ error: "Invalid request origin" }, 403);
        const user = authUser;
        if (!user)
            return json({ error: "Pehle login karein." }, 401);
        if (Number(req.headers.get("content-length") || 0) > 25000)
            return json({ error: "Request too large" }, 413);
        const b = (await req.json()), db = env.DB, action = b.action;
        if (action === "shop") {
            const point = coordinates(b.lat, b.lng);
            if (!categories.slice(1).includes(b.category))
                throw Error("Dukaan ki category chunein.");
            const id = crypto.randomUUID();
            await db
                .prepare("INSERT INTO shops (id,owner,name,category,address,phone,lat,lng,radius,delivery,extra,description,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
                .bind(id, user.userId, string(b.name, "Dukaan ka naam", 2, 80), b.category, string(b.address, "Address", 8, 500), phone(b.phone), point.lat, point.lng, b.radius === 5 ? 5 : 10, money(b.delivery), money(b.extra), string(b.description || "Apne gaon ki apni dukaan", "Description", 1, 300), new Date().toISOString())
                .run();
            return json({ id });
        }
        if (action === "product" || action === "toggle") {
            const shop = await db
                .prepare("SELECT id FROM shops WHERE id=? AND owner=?")
                .bind(b.shop, user.userId)
                .first();
            if (!shop)
                return json({ error: "Yeh dukaan aapki nahi hai." }, 403);
            if (action === "toggle") {
                await db
                    .prepare("UPDATE products SET active=? WHERE id=? AND shop=?")
                    .bind(b.active ? 1 : 0, b.id, b.shop)
                    .run();
                return json({ ok: true });
            }
            const price = money(b.price);
            if (price < 1)
                throw Error("Price zero se zyada hona chahiye.");
            await db
                .prepare("INSERT INTO products (id,shop,name,price,unit,active) VALUES (?,?,?,?,?,1)")
                .bind(crypto.randomUUID(), b.shop, string(b.name, "Product", 2, 100), price, string(b.unit, "Unit", 1, 30))
                .run();
            return json({ ok: true });
        }
        if (action === "order") {
            const id = string(b.id, "Order ID", 36, 36);
            if (!/^[0-9a-f-]{36}$/.test(id))
                throw Error("Invalid order ID");
            const existing = await db
                .prepare("SELECT id,buyer FROM orders WHERE id=?")
                .bind(id)
                .first();
            if (existing) {
                if (existing.buyer !== user.userId)
                    return json({ error: "Invalid order" }, 403);
                return json({ id });
            }
            const point = coordinates(b.lat, b.lng), shop = await db
                .prepare("SELECT * FROM shops WHERE id=?")
                .bind(b.shop)
                .first();
            if (!shop)
                throw Error("Dukaan available nahi hai.");
            if (distance(point.lat, point.lng, shop.lat, shop.lng) > shop.radius)
                throw Error("Yeh address dukaan ki delivery range ke bahar hai.");
            if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50)
                throw Error("Cart mein 1–50 products rakhein.");
            const products = (await db
                .prepare("SELECT * FROM products WHERE shop=? AND active=1")
                .bind(shop.id)
                .all()).results;
            const seen = new Set();
            const items = b.items.map((i) => {
                if (seen.has(i.id))
                    throw Error("Duplicate item");
                seen.add(i.id);
                const p = products.find((p) => p.id === i.id);
                if (!p ||
                    !Number.isInteger(i.quantity) ||
                    i.quantity < 1 ||
                    i.quantity > 99)
                    throw Error("Koi product unavailable hai. Cart dobara check karein.");
                return { ...p, quantity: i.quantity };
            });
            const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0);
            if (subtotal + shop.delivery + shop.extra !== b.expectedTotal)
                return json({
                    error: "Price badal gaya hai. Dukaan dobara khol kar latest price check karein.",
                }, 409);
            const statements = [
                db
                    .prepare("INSERT INTO orders (id,buyer,shop,recipient,phone,address,lat,lng,note,subtotal,delivery,extra,total,status,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                    .bind(id, user.userId, shop.id, string(b.recipient, "Naam", 2, 80), phone(b.phone), string(b.address, "Poora address", 8, 500), point.lat, point.lng, string(b.note || "—", "Note", 1, 500), subtotal, shop.delivery, shop.extra, subtotal + shop.delivery + shop.extra, "Placed", new Date().toISOString()),
                ...items.map((p) => db
                    .prepare("INSERT INTO order_items (id,order_id,name,unit,price,quantity) VALUES (?,?,?,?,?,?)")
                    .bind(crypto.randomUUID(), id, p.name, p.unit, p.price, p.quantity)),
            ];
            await db.batch(statements);
            return json({ id });
        }
        if (action === "status") {
            const o = await db
                .prepare("SELECT o.*,s.owner FROM orders o JOIN shops s ON s.id=o.shop WHERE o.id=?")
                .bind(b.id)
                .first();
            if (!o)
                return json({ error: "Order nahi mila." }, 404);
            const allowed = o.owner === user.userId
                ? transitions[o.status]
                : o.buyer === user.userId && o.status === "Placed"
                    ? ["Cancelled"]
                    : [];
            if (!allowed?.includes(b.status))
                return json({ error: "Yeh status change allowed nahi hai. Refresh karein." }, 403);
            const r = await db
                .prepare("UPDATE orders SET status=? WHERE id=? AND status=?")
                .bind(b.status, o.id, o.status)
                .run();
            if (!r.meta.changes)
                return json({ error: "Order update ho chuka hai. Refresh karein." }, 409);
            return json({ ok: true });
        }
        return json({ error: "Unknown request" }, 400);
    }
    catch (e) {
        const message = e instanceof Error ? e.message : "Request failed";
        console.error(e);
        return json({
            error: /D1|SQL|constraint/i.test(message)
                ? "Save nahi hua. Refresh karke phir try karein."
                : message,
        }, 400);
    }
}
