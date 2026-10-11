CREATE TABLE app_migrations (
  name text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(60) NOT NULL,
  english_name varchar(80) NOT NULL DEFAULT '',
  nickname varchar(60) NOT NULL DEFAULT '',
  slug varchar(80) NOT NULL UNIQUE,
  number varchar(3) NOT NULL,
  role varchar(80) NOT NULL,
  category varchar(40) NOT NULL,
  summary text NOT NULL,
  biography text NOT NULL DEFAULT '',
  quote text NOT NULL DEFAULT '',
  location varchar(80) NOT NULL DEFAULT '',
  birthday varchar(10) NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT '',
  portrait text NOT NULL,
  background text NOT NULL DEFAULT '',
  accent_color varchar(7) NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]',
  timeline jsonb NOT NULL DEFAULT '[]',
  gallery jsonb NOT NULL DEFAULT '[]',
  socials jsonb NOT NULL DEFAULT '[]',
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  status varchar(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX people_public_order_idx ON people (status, sort_order);
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash varchar(64) PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX session_expiry_idx ON sessions (expires_at);
CREATE TABLE login_attempts (
  key varchar(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);
