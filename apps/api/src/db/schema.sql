CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE user_role         AS ENUM ('buyer', 'seller', 'both');
CREATE TYPE venue_style       AS ENUM ('modern', 'rustic', 'garden', 'vintage', 'boho', 'ballroom', 'other');
CREATE TYPE listing_status    AS ENUM ('active', 'reserved', 'sold', 'inactive');
CREATE TYPE listing_condition AS ENUM ('like_new', 'excellent', 'good', 'fair');
CREATE TYPE listing_category  AS ENUM ('centerpieces','table_runners','candles','signage','arch_arbor','linens','lighting','floral','other');
CREATE TYPE offer_status      AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE order_status      AS ENUM ('pending', 'completed', 'cancelled');

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid         TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  email                TEXT NOT NULL UNIQUE,
  role                 user_role NOT NULL DEFAULT 'buyer',
  onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  wedding_date         DATE,
  venue_style          venue_style,
  color_palette        TEXT[],
  guest_count          INTEGER,
  decor_budget_min     NUMERIC(10,2),
  decor_budget_max     NUMERIC(10,2),
  zip_code             TEXT,
  pickup_radius_miles  INTEGER,
  seller_bio           TEXT,
  is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Listings ──────────────────────────────────────────────────────────────────

CREATE TABLE listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  price                 NUMERIC(10,2) NOT NULL,
  original_retail_price NUMERIC(10,2),
  status                listing_status NOT NULL DEFAULT 'active',
  condition             listing_condition NOT NULL,
  category              listing_category NOT NULL,
  venue_style           venue_style,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listing_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_seller_id       ON listings(seller_id);
CREATE INDEX idx_listings_status          ON listings(status);
CREATE INDEX idx_listing_images_listing   ON listing_images(listing_id);

-- ── Offers ────────────────────────────────────────────────────────────────────

CREATE TABLE offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price       NUMERIC(10,2) NOT NULL,
  status      offer_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one accepted offer per listing at a time
CREATE UNIQUE INDEX idx_offers_one_accepted
  ON offers(listing_id) WHERE status = 'accepted';

CREATE INDEX idx_offers_listing  ON offers(listing_id);
CREATE INDEX idx_offers_buyer    ON offers(buyer_id);
CREATE INDEX idx_offers_seller   ON offers(seller_id);

-- ── Orders ────────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  offer_id         UUID NOT NULL UNIQUE REFERENCES offers(id) ON DELETE RESTRICT,
  buyer_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  agreed_price     NUMERIC(10,2) NOT NULL,
  status           order_status NOT NULL DEFAULT 'pending',
  buyer_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  seller_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one pending order per listing at a time
CREATE UNIQUE INDEX idx_orders_one_pending
  ON orders(listing_id) WHERE status = 'pending';

CREATE INDEX idx_orders_buyer  ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);

-- ── Messages ──────────────────────────────────────────────────────────────────

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_order   ON messages(order_id);
CREATE INDEX idx_messages_listing ON messages(listing_id);
CREATE INDEX idx_messages_sender  ON messages(sender_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
