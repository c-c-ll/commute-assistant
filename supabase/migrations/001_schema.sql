-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User commute settings
CREATE TABLE IF NOT EXISTS commute_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin_coords TEXT,
  dest_coords TEXT,
  remind_time TIME NOT NULL DEFAULT '08:00',
  days_of_week SMALLINT[] DEFAULT ARRAY[1,2,3,4,5],
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VAPID keys table for Web Push
CREATE TABLE IF NOT EXISTS vapid_keys (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily commute reminder check (every minute between 6:00-23:00 BJT)
SELECT cron.schedule(
  'commute-reminder',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := CONCAT(current_setting('app.supabase_project_url'), '/functions/v1/send-reminder'),
      headers := '{"Authorization": "Bearer ' || current_setting('app.supabase_anon_key') || '"}'::jsonb,
      body := '{}'::jsonb
    )
  WHERE EXISTS (
    SELECT 1 FROM commute_settings WHERE enabled = true
  );
  $$
);