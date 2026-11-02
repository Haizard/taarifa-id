BEGIN;

ALTER TABLE public.career_profiles
  ADD COLUMN IF NOT EXISTS qualifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS availability varchar(80),
  ADD COLUMN IF NOT EXISTS preferred_employment_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS professional_references jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.career_share_grants
  ADD COLUMN IF NOT EXISTS include_extended_profile boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.career_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_record_id uuid NOT NULL REFERENCES public.career_history(id),
  actor_account_id uuid NOT NULL REFERENCES public.accounts(id),
  event_type varchar(40) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS career_history_events_record_idx ON public.career_history_events(career_record_id, created_at);

COMMIT;
