-- migration-001-schema-alignment.sql
-- Aligns deployed schema with tech architecture spec.
-- Safe to run: tables are empty, uses ALTER TABLE for constraint changes.

-- ============================================================
-- 1. Tighten NOT NULL constraints on shopify_orders
-- ============================================================
ALTER TABLE public.shopify_orders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN created_at_shopify SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN financial_status SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN currency SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN subtotal_price SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN total_shipping SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN total_tax SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN total_discounts SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN total_refunded SET NOT NULL;
ALTER TABLE public.shopify_orders ALTER COLUMN current_total_price SET NOT NULL;

-- Add defaults for money columns
ALTER TABLE public.shopify_orders ALTER COLUMN total_shipping SET DEFAULT 0;
ALTER TABLE public.shopify_orders ALTER COLUMN total_tax SET DEFAULT 0;
ALTER TABLE public.shopify_orders ALTER COLUMN total_discounts SET DEFAULT 0;
ALTER TABLE public.shopify_orders ALTER COLUMN total_refunded SET DEFAULT 0;
ALTER TABLE public.shopify_orders ALTER COLUMN currency SET DEFAULT 'USD';

-- ============================================================
-- 2. Tighten NOT NULL on shopify_order_line_items
-- ============================================================
ALTER TABLE public.shopify_order_line_items ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE public.shopify_order_line_items ALTER COLUMN unit_price SET NOT NULL;
ALTER TABLE public.shopify_order_line_items ALTER COLUMN total_discount SET DEFAULT 0;

-- ============================================================
-- 3. Add missing shopify_refund_line_items table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shopify_refund_line_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id     UUID          NOT NULL REFERENCES public.shopify_refunds(id) ON DELETE CASCADE,
  line_item_id  UUID          REFERENCES public.shopify_order_line_items(id),
  quantity      INTEGER       NOT NULL,
  subtotal      NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_line_items_refund_id
  ON public.shopify_refund_line_items(refund_id);

-- ============================================================
-- 4. Add missing chat_messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  query_template  TEXT,
  sql_executed    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_store_date
  ON public.chat_messages(store_id, created_at DESC);

-- ============================================================
-- 5. Add UNIQUE constraint on shopify_refunds (if missing)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shopify_refunds_store_id_shopify_gid_key'
  ) THEN
    ALTER TABLE public.shopify_refunds
      ADD CONSTRAINT shopify_refunds_store_id_shopify_gid_key
      UNIQUE(store_id, shopify_gid);
  END IF;
END $$;

-- ============================================================
-- 6. Add financial_status index for profit calculations
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_shopify_orders_financial_status
  ON public.shopify_orders(store_id, financial_status);
