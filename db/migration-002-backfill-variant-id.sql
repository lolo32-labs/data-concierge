-- Migration 002: Backfill variant_id in shopify_order_line_items
-- Run date: 2026-03-22
-- Context: variant_id was never populated during sync, breaking all product profitability queries.
-- Fix: shopify-incremental-sync.ts now resolves variant GID → local UUID during sync.
-- This migration backfills existing data by matching product_title.

UPDATE shopify_order_line_items li
SET variant_id = sub.variant_id
FROM (
  SELECT DISTINCT ON (p.title) p.title, v.id as variant_id
  FROM shopify_products p
  JOIN shopify_product_variants v ON v.product_id = p.id
  ORDER BY p.title, v.created_at ASC
) sub
WHERE li.product_title = sub.title
  AND li.variant_id IS NULL;
