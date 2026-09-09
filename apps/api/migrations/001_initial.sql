CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Provider identity is separate from the stable application profile ID.
-- No password storage or login API is implemented in this scaffold.
CREATE TABLE auth_identities (
  provider text NOT NULL,
  subject text NOT NULL,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, subject)
);
CREATE TABLE creator_profiles (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio text NOT NULL DEFAULT '',
  instagram_handle text,
  languages text[] NOT NULL DEFAULT '{}',
  topics text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE brand_members (
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  PRIMARY KEY (brand_id, profile_id)
);
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id),
  title text NOT NULL,
  product_name text NOT NULL,
  description text NOT NULL,
  deal_type text NOT NULL CHECK (deal_type IN ('barter', 'paid')),
  amount_per_reel_minor integer,
  product_value_minor integer,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  reel_count integer NOT NULL CHECK (reel_count > 0),
  creator_slots integer NOT NULL DEFAULT 1 CHECK (creator_slots > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  application_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (deal_type = 'barter' AND product_value_minor IS NOT NULL AND product_value_minor >= 0 AND amount_per_reel_minor IS NULL)
    OR
    (deal_type = 'paid' AND amount_per_reel_minor IS NOT NULL AND amount_per_reel_minor > 0 AND product_value_minor IS NULL)
  )
);
CREATE INDEX campaigns_discovery ON campaigns (created_at DESC, id DESC) WHERE status = 'published';
CREATE INDEX campaigns_deal_discovery ON campaigns (deal_type, created_at DESC, id DESC) WHERE status = 'published';
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  creator_id uuid NOT NULL REFERENCES creator_profiles(profile_id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  pitch text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
CREATE TABLE collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES applications(id),
  status text NOT NULL DEFAULT 'negotiating' CHECK (status IN ('negotiating', 'active', 'submitted', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reel_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES collaborations(id),
  instagram_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES collaborations(id),
  sender_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation ON messages (collaboration_id, created_at, id);
-- Authorization, agreement versions and transactional acceptance are implemented
-- with their respective features, not exposed as unfinished write endpoints.
