import { index, integer, numeric, pgSchema, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// The marketplace's own records, loaded once from a public dataset (see agent/load-data.ts).
// This schema is the only thing the SQL analyst can read. Its column names are the ones the model sees.

export const marketplace = pgSchema("marketplace");

const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
const time = (name: string) => timestamp(name);

export const customers = marketplace.table("customers", {
  customerId: text("customer_id").primaryKey(),
  customerUniqueId: text("customer_unique_id").notNull(),
  zipPrefix: text("zip_prefix"),
  city: text("city"),
  state: text("state"),
});

export const orders = marketplace.table(
  "orders",
  {
    orderId: text("order_id").primaryKey(),
    customerId: text("customer_id").notNull(),
    status: text("status").notNull(),
    purchasedAt: time("purchased_at").notNull(),
    approvedAt: time("approved_at"),
    shippedAt: time("shipped_at"),
    deliveredAt: time("delivered_at"),
    estimatedDeliveryAt: time("estimated_delivery_at"),
  },
  (t) => [index("orders_customer").on(t.customerId), index("orders_purchased").on(t.purchasedAt)],
);

export const orderItems = marketplace.table(
  "order_items",
  {
    orderId: text("order_id").notNull(),
    itemNumber: integer("item_number").notNull(),
    productId: text("product_id").notNull(),
    sellerId: text("seller_id").notNull(),
    shippingLimitAt: time("shipping_limit_at"),
    price: money("price").notNull(),
    freight: money("freight").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.itemNumber] }), index("order_items_product").on(t.productId)],
);

export const payments = marketplace.table(
  "payments",
  {
    orderId: text("order_id").notNull(),
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    installments: integer("installments").notNull(),
    value: money("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.sequence] })],
);

// One review id can cover more than one order in this dataset, so the key is the pair.
export const reviews = marketplace.table(
  "reviews",
  {
    reviewId: text("review_id").notNull(),
    orderId: text("order_id").notNull(),
    score: integer("score").notNull(),
    title: text("title"),
    message: text("message"),
    createdAt: time("created_at"),
    answeredAt: time("answered_at"),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.orderId] }), index("reviews_order").on(t.orderId)],
);

export const products = marketplace.table("products", {
  productId: text("product_id").primaryKey(),
  category: text("category"),
  nameLength: integer("name_length"),
  descriptionLength: integer("description_length"),
  photos: integer("photos"),
  weightG: integer("weight_g"),
  lengthCm: integer("length_cm"),
  heightCm: integer("height_cm"),
  widthCm: integer("width_cm"),
});

export const sellers = marketplace.table("sellers", {
  sellerId: text("seller_id").primaryKey(),
  zipPrefix: text("zip_prefix"),
  city: text("city"),
  state: text("state"),
});

export const DATA_TABLES = [customers, orders, orderItems, payments, reviews, products, sellers];
