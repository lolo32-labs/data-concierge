-- db/schema.sql
-- Multi-tenant schema for ProfitSight MVP
-- Safe to run multiple times (idempotent via IF NOT EXISTS)
-- Does NOT touch client_shopify_demo or client_example schemas

-- ============================================================
-- AUTH TABLES (Auth.js v5 compatible)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        UNIQUE NOT NULL,
  email_verified    TIMESTAMPTZ,
  password_hash     TEXT,
  name              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id                    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID  NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type                  TEXT  NOT NULL,
  provider              TEXT  NOT NULL,
  provider_account_id   TEXT  NOT NULL,
  refresh_token         TEXT,
  access_token          TEXT,
  expires_at            BIGINT,
  token_type            TEXT,
  scope                 TEXT,
  id_token              TEXT,
  session_state         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT        UNIQUE NOT NULL,
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_tokens (
  identifier  TEXT        NOT NULL,
  token       TEXT        UNIQUE NOT NULL,
  expires     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ============================================================
-- STORE MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stores (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shopify_domain              TEXT          UNIQUE NOT NULL,
  store_name                  TEXT,
  currency                    TEXT          NOT NULL DEFAULT 'USD',
  timezone                    TEXT          NOT NULL DEFAULT 'UTC',
  plan                        TEXT          NOT NULL DEFAULT 'trial',
  trial_ends_at               TIMESTAMPTZ,
  stripe_customer_id          TEXT,
  stripe_subscription_id      TEXT,
  payment_processor_fee_pct   NUMERIC(5,4)  NOT NULL DEFAULT 0.029,
  payment_processor_fee_flat  NUMERIC(10,2) NOT NULL DEFAULT 0.30,
  shopify_plan                TEXT,
  last_sync_at                TIMESTAMPTZ,
  sync_status                 TEXT          NOT NULL DEFAULT 'pending',
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID        UNIQUE NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  access_token  TEXT        NOT NULL,
  scopes        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SHOPIFY PRODUCT DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shopify_products (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopify_gid   TEXT        NOT NULL,
  title         TEXT,
  product_type  TEXT,
  vendor        TEXT,
  status        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, shopify_gid)
);

CREATE TABLE IF NOT EXISTS public.shopify_product_variants (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID          NOT NULL REFERENCES public.shopify_products(id) ON DELETE CASCADE,
  store_id            UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopify_gid         TEXT          NOT NULL,
  title               TEXT,
  sku                 TEXT,
  price               NUMERIC(12,2),
  compare_at_price    NUMERIC(12,2),
  inventory_quantity  INTEGER,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(store_id, shopify_gid)
);

CREATE TABLE IF NOT EXISTS public.cogs_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  variant_id      UUID          NOT NULL REFERENCES public.shopify_product_variants(id) ON DELETE CASCADE,
  cost_per_unit   NUMERIC(12,2) NOT NULL,
  effective_from  DATE          NOT NULL,
  effective_to    DATE,
  source          TEXT          NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(variant_id, effective_from)
);

-- ============================================================
-- SHOPIFY ORDER DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shopify_orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopify_gid         TEXT          NOT NULL,
  order_number        TEXT          NOT NULL,
  created_at_shopify  TIMESTAMPTZ   NOT NULL,
  financial_status    TEXT          NOT NULL,
  fulfillment_status  TEXT,
  currency            TEXT          NOT NULL DEFAULT 'USD',
  subtotal_price      NUMERIC(12,2) NOT NULL,
  total_shipping      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_discounts     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_refunded      NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_total_price NUMERIC(12,2) NOT NULL,
  channel_name        TEXT,
  source_name         TEXT,
  customer_email      TEXT,
  customer_name       TEXT,
  tags                TEXT,
  cancelled_at        TIMESTAMPTZ,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(store_id, shopify_gid)
);

CREATE TABLE IF NOT EXISTS public.shopify_order_line_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID          NOT NULL REFERENCES public.shopify_orders(id) ON DELETE CASCADE,
  store_id        UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopify_gid     TEXT          NOT NULL,
  variant_id      UUID,
  product_title   TEXT,
  variant_title   TEXT,
  sku             TEXT,
  quantity        INTEGER       NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  total_discount  NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(store_id, shopify_gid)
);

CREATE TABLE IF NOT EXISTS public.shopify_refunds (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID          NOT NULL REFERENCES public.shopify_orders(id) ON DELETE CASCADE,
  store_id            UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopify_gid         TEXT          NOT NULL,
  created_at_shopify  TIMESTAMPTZ,
  total_refunded      NUMERIC(12,2),
  note                TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_refund_line_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id     UUID          NOT NULL REFERENCES public.shopify_refunds(id) ON DELETE CASCADE,
  line_item_id  UUID          REFERENCES public.shopify_order_line_items(id),
  quantity      INTEGER       NOT NULL,
  subtotal      NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- CHAT HISTORY
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

-- ============================================================
-- MERCHANT INPUT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ad_spend_entries (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  month       DATE          NOT NULL,
  platform    TEXT          NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(store_id, month, platform)
);

-- ============================================================
-- CACHED METRICS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_metrics_cache (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period_type   TEXT        NOT NULL,
  period_start  DATE        NOT NULL,
  metric_type   TEXT        NOT NULL,
  value         JSONB       NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, period_type, period_start, metric_type)
);

-- ============================================================
-- INDEXES — foreign keys and high-cardinality lookup columns
-- ============================================================

-- accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- stores
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);

-- shopify_products
CREATE INDEX IF NOT EXISTS idx_shopify_products_store_id ON public.shopify_products(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_shopify_gid ON public.shopify_products(shopify_gid);

-- shopify_product_variants
CREATE INDEX IF NOT EXISTS idx_shopify_product_variants_store_id ON public.shopify_product_variants(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_variants_product_id ON public.shopify_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_variants_shopify_gid ON public.shopify_product_variants(shopify_gid);

-- cogs_entries
CREATE INDEX IF NOT EXISTS idx_cogs_entries_store_id ON public.cogs_entries(store_id);
CREATE INDEX IF NOT EXISTS idx_cogs_entries_variant_id ON public.cogs_entries(variant_id);

-- shopify_orders
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_id ON public.shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_gid ON public.shopify_orders(shopify_gid);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at_shopify ON public.shopify_orders(store_id, created_at_shopify);

-- shopify_order_line_items
CREATE INDEX IF NOT EXISTS idx_shopify_order_line_items_store_id ON public.shopify_order_line_items(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_order_line_items_order_id ON public.shopify_order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_order_line_items_shopify_gid ON public.shopify_order_line_items(shopify_gid);

-- shopify_refunds
CREATE INDEX IF NOT EXISTS idx_shopify_refunds_store_id ON public.shopify_refunds(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_refunds_order_id ON public.shopify_refunds(order_id);

-- shopify_refund_line_items
CREATE INDEX IF NOT EXISTS idx_refund_line_items_refund_id ON public.shopify_refund_line_items(refund_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_store_date ON public.chat_messages(store_id, created_at DESC);

-- shopify_orders (financial_status for profit calculations)
CREATE INDEX IF NOT EXISTS idx_shopify_orders_financial_status ON public.shopify_orders(store_id, financial_status);

-- ad_spend_entries
CREATE INDEX IF NOT EXISTS idx_ad_spend_entries_store_id ON public.ad_spend_entries(store_id);

-- store_metrics_cache
CREATE INDEX IF NOT EXISTS idx_store_metrics_cache_store_id ON public.store_metrics_cache(store_id);
