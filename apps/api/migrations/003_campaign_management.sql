-- Campaign management: drafts, product images, performance and conditions fields.
ALTER TABLE campaigns ADD COLUMN product_image_url text;
ALTER TABLE campaigns ADD COLUMN reel_length_seconds integer CHECK (reel_length_seconds IS NULL OR reel_length_seconds > 0);
ALTER TABLE campaigns ADD COLUMN content_deadline timestamptz;
ALTER TABLE campaigns ADD COLUMN shipping_required boolean NOT NULL DEFAULT false;
ALTER TABLE campaigns ADD COLUMN shipping_notes text NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN required_mentions text[] NOT NULL DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN min_posting_duration_days integer CHECK (min_posting_duration_days IS NULL OR min_posting_duration_days > 0);
ALTER TABLE campaigns ADD COLUMN usage_duration_days integer CHECK (usage_duration_days IS NULL OR usage_duration_days > 0);
ALTER TABLE campaigns ADD COLUMN usage_channels text[] NOT NULL DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN usage_paid_ads_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE campaigns ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
-- Brands list and manage their own campaigns regardless of status.
CREATE INDEX campaigns_brand_management ON campaigns (brand_id, created_at DESC, id DESC);
