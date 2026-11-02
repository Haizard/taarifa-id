BEGIN;

CREATE TABLE IF NOT EXISTS public.api_rate_limit_buckets (
  subject_key varchar(255) NOT NULL,
  action varchar(80) NOT NULL,
  window_started_at timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY(subject_key, action)
);

CREATE TABLE IF NOT EXISTS public.platform_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_id uuid REFERENCES public.accounts(id),
  action varchar(80) NOT NULL,
  resource_id varchar(100),
  outcome varchar(20) NOT NULL DEFAULT 'attempted',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_activity_events_actor_idx ON public.platform_activity_events(actor_account_id, created_at);
CREATE INDEX IF NOT EXISTS platform_activity_events_action_idx ON public.platform_activity_events(action, created_at);

COMMIT;
