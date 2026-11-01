-- Run once on existing databases: adds order number for online purchases.
ALTER TABLE products ADD COLUMN order_no TEXT;
