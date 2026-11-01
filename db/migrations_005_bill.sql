-- Copy of the bill photo for each registered product. Stored compressed, as base64 text.
CREATE TABLE IF NOT EXISTS product_bills (
  product_id INTEGER PRIMARY KEY REFERENCES products(id),
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
