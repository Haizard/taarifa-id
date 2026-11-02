BEGIN;

ALTER TABLE public.desperate_conditions
  ADD COLUMN IF NOT EXISTS condition_status varchar(100),
  ADD COLUMN IF NOT EXISTS stage varchar(100),
  ADD COLUMN IF NOT EXISTS diagnosed_on varchar(40),
  ADD COLUMN IF NOT EXISTS treatment_details text;

CREATE TABLE IF NOT EXISTS public.profile_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_profile_id uuid NOT NULL REFERENCES public.person_profiles(id),
  asset_type varchar(40) NOT NULL,
  label varchar(160) NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_assets_profile_idx ON public.profile_assets(person_profile_id);

COMMIT;
