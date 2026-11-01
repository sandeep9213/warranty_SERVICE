-- Initial dropdown values. Admin portal (phase 2) will edit these.
INSERT INTO dropdown_options (list_key, value, sort_order, is_default, active) VALUES
  ('product_category', 'Dashcamera',        1, 1, 1),
  ('product_category', 'Smartwatch',        2, 0, 1),
  ('product_category', 'Earbuds',           3, 0, 1),
  ('product_category', 'Other Accessories', 4, 0, 1),
  ('place_of_purchase', 'Flipkart',         1, 0, 1),
  ('place_of_purchase', 'Myntra',           2, 0, 1),
  ('place_of_purchase', 'Bleat website',    3, 0, 1),
  ('place_of_purchase', 'Amazon',           4, 0, 1),
  ('place_of_purchase', 'Firstcry',         5, 0, 1),
  ('place_of_purchase', 'ZOP',              6, 0, 1),
  ('place_of_purchase', 'Offline Dealer',   7, 0, 1);
