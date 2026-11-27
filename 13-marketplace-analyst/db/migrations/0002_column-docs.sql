COMMENT ON SCHEMA marketplace IS 'A Brazilian online marketplace. Orders run from September 2016 to October 2018; the complete months are January 2017 to August 2018. Money is in Brazilian reais (R$).';
--> statement-breakpoint
COMMENT ON TABLE marketplace.customers IS 'One row per customer record. Each order has its own customer record.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.customers.customer_id IS 'Key of this customer record. Joins orders.customer_id.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.customers.customer_unique_id IS 'The person. Count people with count(DISTINCT customer_unique_id).';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.customers.zip_prefix IS 'First digits of the postal code.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.customers.city IS 'City in lower case without accents, such as sao paulo.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.customers.state IS 'Two-letter state code, such as SP, RJ or MG.';
--> statement-breakpoint
COMMENT ON TABLE marketplace.orders IS 'One row per order.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.order_id IS 'Key of the order.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.customer_id IS 'The customer record of this order, a new one every order. Never count it to count people: join customers and count distinct customer_unique_id.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.status IS 'One of delivered, shipped, canceled, unavailable, invoiced, processing, created, approved.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.purchased_at IS 'When the order was placed.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.approved_at IS 'When payment was approved.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.shipped_at IS 'When the order was handed to the carrier.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.delivered_at IS 'When the customer received it. Empty if not delivered. Late means delivered_at is after estimated_delivery_at.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.orders.estimated_delivery_at IS 'The delivery date promised to the customer.';
--> statement-breakpoint
COMMENT ON TABLE marketplace.order_items IS 'One row per item in an order. Sales or revenue is sum(price).';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.order_items.order_id IS 'Joins orders.order_id.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.order_items.item_number IS 'Position of the item in its order.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.order_items.product_id IS 'Joins products.product_id.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.order_items.seller_id IS 'Joins sellers.seller_id.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.order_items.shipping_limit_at IS 'Latest time for the seller to ship.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.order_items.price IS 'Item price in Brazilian reais (R$).';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.order_items.freight IS 'Delivery charge for this item in R$.';
--> statement-breakpoint
COMMENT ON TABLE marketplace.payments IS 'One row per payment. An order can have several.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.payments.order_id IS 'Joins orders.order_id.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.payments.sequence IS 'Number of the payment within its order.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.payments.type IS 'One of credit_card, boleto, voucher, debit_card, not_defined.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.payments.installments IS 'Number of installments.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.payments.value IS 'Amount paid in R$.';
--> statement-breakpoint
COMMENT ON TABLE marketplace.reviews IS 'Customer reviews of orders.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.reviews.review_id IS 'Key of the review. One id can cover more than one order.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.reviews.order_id IS 'Joins orders.order_id.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.reviews.score IS 'Stars from 1 to 5.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.reviews.title IS 'Title written by the customer, in Portuguese, often empty.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.reviews.message IS 'Text written by the customer, in Portuguese, often empty.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.reviews.created_at IS 'When the review form was sent.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.reviews.answered_at IS 'When the customer answered.';
--> statement-breakpoint
COMMENT ON TABLE marketplace.products IS 'One row per product.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.product_id IS 'Key of the product.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.category IS 'Category in English with underscores, such as bed_bath_table, health_beauty or furniture_decor.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.name_length IS 'Characters in the product name.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.description_length IS 'Characters in the description.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.photos IS 'Number of photos.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.weight_g IS 'Weight in grams.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.length_cm IS 'Length in centimetres.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.height_cm IS 'Height in centimetres.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.products.width_cm IS 'Width in centimetres.';
--> statement-breakpoint
COMMENT ON TABLE marketplace.sellers IS 'One row per seller.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.sellers.seller_id IS 'Key of the seller.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.sellers.zip_prefix IS 'First digits of the postal code.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.sellers.city IS 'City in lower case without accents.';
--> statement-breakpoint
COMMENT ON COLUMN marketplace.sellers.state IS 'Two-letter state code.';
