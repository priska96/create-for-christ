-- Better Auth's provider-specific tables stay separate from application profiles.
CREATE TABLE auth_users (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 "emailVerified" boolean NOT NULL DEFAULT false, image text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_sessions (
 id text PRIMARY KEY, token text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE
);
CREATE INDEX auth_sessions_user ON auth_sessions("userId");
CREATE TABLE auth_accounts (
 id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
 "userId" text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 "accessToken" text, "refreshToken" text, "idToken" text,
 "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
 scope text, password text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 UNIQUE ("providerId", "accountId")
);
CREATE INDEX auth_accounts_user ON auth_accounts("userId");
CREATE TABLE auth_verifications (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
 "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_verifications_identifier ON auth_verifications(identifier);
ALTER TABLE profiles ADD COLUMN role text CHECK (role IN ('creator', 'brand'));
ALTER TABLE profiles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE creator_profiles ADD COLUMN location text NOT NULL DEFAULT '';
ALTER TABLE creator_profiles ADD COLUMN deal_preferences text[] NOT NULL DEFAULT ARRAY['barter','paid'];
ALTER TABLE creator_profiles ADD COLUMN portfolio_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE brands ADD COLUMN website text NOT NULL DEFAULT '';
ALTER TABLE brands ADD COLUMN industry text NOT NULL DEFAULT '';
ALTER TABLE brands ADD COLUMN location text NOT NULL DEFAULT '';
-- Outgoing auth links are sensitive: never expose this table through public APIs.
CREATE TABLE auth_mail_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient text NOT NULL,
 subject text NOT NULL, body text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_mail_pending ON auth_mail_outbox(available_at);
