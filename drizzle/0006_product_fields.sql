-- 0006: Structured product fields on sale facts (CEO plan 2026-06-11,
-- data-contract-tab-matrix). Previously "iPhone X × 2" lived as free text in
-- description, making product analytics impossible. All three are optional
-- enrichments — additive and null-safe. Run after 0005.
ALTER TABLE "facts" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "facts" ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE "facts" ADD COLUMN IF NOT EXISTS "unit_price_mmk" integer;
