import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  radius: integer("radius").notNull(),
  delivery: integer("delivery").notNull(),
  extra: integer("extra").notNull(),
  description: text("description").notNull(),
  created: text("created").notNull(),
});
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  shop: text("shop")
    .notNull()
    .references(() => shops.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  unit: text("unit").notNull(),
  active: integer("active").notNull().default(1),
});
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  buyer: text("buyer").notNull(),
  shop: text("shop")
    .notNull()
    .references(() => shops.id),
  recipient: text("recipient").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  note: text("note").notNull(),
  subtotal: integer("subtotal").notNull(),
  delivery: integer("delivery").notNull(),
  extra: integer("extra").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull(),
  created: text("created").notNull(),
});
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  order: text("order_id")
    .notNull()
    .references(() => orders.id),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
});
