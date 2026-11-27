// The public dataset: where it comes from, which file fills which table, and how many rows each must hold.
// The counts are the published ones, so a half download or a changed file stops the load.

export const DATASET_URL = "https://www.kaggle.com/api/v1/datasets/download/olistbr/brazilian-ecommerce";

export type Source = { table: string; file: string; columns: string; rows: number };

// Columns are in the file's own order.
export const SOURCES: Source[] = [
  {
    table: "customers",
    file: "olist_customers_dataset.csv",
    columns: "customer_id, customer_unique_id, zip_prefix, city, state",
    rows: 99441,
  },
  {
    table: "orders",
    file: "olist_orders_dataset.csv",
    columns:
      "order_id, customer_id, status, purchased_at, approved_at, shipped_at, delivered_at, estimated_delivery_at",
    rows: 99441,
  },
  {
    table: "order_items",
    file: "olist_order_items_dataset.csv",
    columns: "order_id, item_number, product_id, seller_id, shipping_limit_at, price, freight",
    rows: 112650,
  },
  {
    table: "payments",
    file: "olist_order_payments_dataset.csv",
    columns: "order_id, sequence, type, installments, value",
    rows: 103886,
  },
  {
    table: "reviews",
    file: "olist_order_reviews_dataset.csv",
    columns: "review_id, order_id, score, title, message, created_at, answered_at",
    rows: 99224,
  },
  {
    table: "products",
    file: "olist_products_dataset.csv",
    columns:
      "product_id, category, name_length, description_length, photos, weight_g, length_cm, height_cm, width_cm",
    rows: 32951,
  },
  {
    table: "sellers",
    file: "olist_sellers_dataset.csv",
    columns: "seller_id, zip_prefix, city, state",
    rows: 3095,
  },
];

// Product categories are written in Portuguese. This file gives their English names.
export const CATEGORY_FILE = "product_category_name_translation.csv";
