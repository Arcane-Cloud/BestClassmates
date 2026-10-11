CREATE TABLE media_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expected_bytes integer NOT NULL CHECK (expected_bytes > 0 AND expected_bytes <= 5242880),
  mime_type varchar(32) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  completed_at timestamptz
);
CREATE INDEX media_uploads_expiry_idx ON media_uploads (expires_at);
