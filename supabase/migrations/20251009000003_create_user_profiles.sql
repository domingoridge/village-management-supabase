-- Create user_profile table (links to auth.users)
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  preferences JSONB NOT NULL DEFAULT '{"language": "en", "timezone": "Asia/Manila", "email_notifications": true, "sms_notifications": false, "theme": "auto"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX idx_user_profile_auth_user ON user_profile(auth_user_id);

-- Enable RLS
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE user_profile IS 'Core user information shared across all tenants';
