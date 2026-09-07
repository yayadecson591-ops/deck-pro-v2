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
  account_label TEXT,
  status TEXT NOT NULL DEFAULT 'configured',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bookmaker_slug)
);
CREATE INDEX IF NOT EXISTS bookmaker_connections_user_idx ON bookmaker_connections(user_id);

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
