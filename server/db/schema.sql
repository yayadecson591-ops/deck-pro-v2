CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS deck_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deck_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES deck_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deck_sessions_user_idx ON deck_sessions(user_id);
CREATE INDEX IF NOT EXISTS deck_sessions_expiry_idx ON deck_sessions(expires_at);

CREATE TABLE IF NOT EXISTS bookmaker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES deck_users(id) ON DELETE CASCADE,
  bookmaker_slug TEXT NOT NULL,
  access_channel TEXT NOT NULL,
  token_ciphertext TEXT,
  token_iv TEXT,
  token_tag TEXT,
  credentials_ciphertext TEXT,
  credentials_iv TEXT,
  credentials_tag TEXT,
  sync_secret_hash TEXT,
  account_label TEXT NOT NULL DEFAULT '',
  auto_bet_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'configured',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bookmaker_slug, account_label)
);
CREATE INDEX IF NOT EXISTS bookmaker_connections_user_idx ON bookmaker_connections(user_id);
CREATE INDEX IF NOT EXISTS bookmaker_connections_slug_idx ON bookmaker_connections(user_id, bookmaker_slug);

DO $$ BEGIN
  ALTER TABLE bookmaker_connections ADD COLUMN IF NOT EXISTS credentials_ciphertext TEXT;
  ALTER TABLE bookmaker_connections ADD COLUMN IF NOT EXISTS credentials_iv TEXT;
  ALTER TABLE bookmaker_connections ADD COLUMN IF NOT EXISTS credentials_tag TEXT;
  ALTER TABLE bookmaker_connections ADD COLUMN IF NOT EXISTS sync_secret_hash TEXT;
  ALTER TABLE bookmaker_connections ADD COLUMN IF NOT EXISTS account_label TEXT NOT NULL DEFAULT '';
  ALTER TABLE bookmaker_connections ADD COLUMN IF NOT EXISTS auto_bet_enabled BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE bookmaker_connections ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bookmaker_connections DROP CONSTRAINT IF EXISTS bookmaker_connections_user_id_bookmaker_slug_key;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bookmaker_connections ADD CONSTRAINT bookmaker_connections_user_slug_label_key UNIQUE(user_id, bookmaker_slug, account_label);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS bookmaker_connection_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES deck_users(id) ON DELETE SET NULL,
  bookmaker_slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookmaker_events_user_idx ON bookmaker_connection_events(user_id, created_at DESC);
