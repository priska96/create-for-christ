ALTER TABLE campaigns ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);
CREATE FUNCTION increment_campaign_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END;
$$;
CREATE TRIGGER campaign_revision BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION increment_campaign_revision();
CREATE TABLE campaign_dismissals (
  creator_id uuid NOT NULL REFERENCES creator_profiles(profile_id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (creator_id,campaign_id)
);
ALTER TABLE applications ADD COLUMN decided_at timestamptz;
ALTER TABLE applications ADD COLUMN campaign_snapshot jsonb;
-- Backfill scaffold data without removing any existing applications.
UPDATE applications a SET campaign_snapshot = snapshots.data FROM (
 SELECT snapshot.id, to_jsonb(snapshot) AS data FROM (
 SELECT 
  c.id, c.status, c.title, c.product_name AS "productName", c.description,
  c.product_image_url AS "productImageUrl", c.currency,
  c.reel_count AS "reelCount", c.reel_length_seconds AS "reelLengthSeconds",
  c.creator_slots AS "creatorSlots", c.content_deadline AS "contentDeadline",
  c.shipping_required AS "shippingRequired", c.shipping_notes AS "shippingNotes",
  c.required_mentions AS "requiredMentions", c.min_posting_duration_days AS "minPostingDurationDays",
  c.usage_duration_days AS "usageDurationDays", c.usage_channels AS "usageChannels",
  c.usage_paid_ads_allowed AS "usagePaidAdsAllowed",
  c.created_at AS "createdAt", c.updated_at AS "updatedAt",
  CASE WHEN c.deal_type = 'barter'
    THEN json_build_object('type', 'barter', 'productValueMinor', c.product_value_minor)
    ELSE json_build_object('type', 'paid', 'amountPerReelMinor', c.amount_per_reel_minor)
  END AS compensation
, c.revision AS version, b.name AS "brandName", c.application_deadline AS "applicationDeadline"
 FROM campaigns c JOIN brands b ON b.id=c.brand_id
 ) snapshot
) snapshots WHERE a.campaign_id=snapshots.id;
ALTER TABLE applications ALTER COLUMN campaign_snapshot SET NOT NULL;
ALTER TABLE collaborations ADD COLUMN terms_snapshot jsonb;
UPDATE collaborations co SET terms_snapshot=a.campaign_snapshot FROM applications a WHERE a.id=co.application_id;
ALTER TABLE collaborations ALTER COLUMN terms_snapshot SET NOT NULL;
CREATE INDEX applications_creator_page ON applications(creator_id,created_at DESC,id DESC);
CREATE INDEX applications_campaign_page ON applications(campaign_id,created_at DESC,id DESC);
CREATE INDEX applications_campaign_status ON applications(campaign_id,status);
