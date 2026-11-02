BEGIN;

DO $$ BEGIN CREATE TYPE public.career_verification_status AS ENUM ('pending', 'verified', 'disputed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES public.accounts(id),
  headline varchar(200),
  summary text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.career_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_account_id uuid NOT NULL REFERENCES public.accounts(id),
  organization_account_id uuid NOT NULL REFERENCES public.accounts(id),
  organization_name varchar(200) NOT NULL,
  provider_id uuid REFERENCES public.service_providers(id),
  position varchar(150) NOT NULL,
  started_on date NOT NULL,
  ended_on date,
  verification_status public.career_verification_status NOT NULL DEFAULT 'pending',
  verified_by_account_id uuid REFERENCES public.accounts(id),
  worker_acknowledged_at timestamptz,
  worker_note text,
  moderation_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.career_history ADD COLUMN IF NOT EXISTS organization_name varchar(200);
UPDATE public.career_history h SET organization_name = p.display_name
  FROM public.service_providers p WHERE h.provider_id = p.id AND h.organization_name IS NULL;
UPDATE public.career_history SET organization_name = 'Organization' WHERE organization_name IS NULL;
ALTER TABLE public.career_history ALTER COLUMN organization_name SET NOT NULL;
CREATE INDEX IF NOT EXISTS career_history_worker_idx ON public.career_history(worker_account_id);
CREATE INDEX IF NOT EXISTS career_history_organization_idx ON public.career_history(organization_account_id);

CREATE TABLE IF NOT EXISTS public.career_share_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  worker_account_id uuid NOT NULL REFERENCES public.accounts(id),
  include_profile boolean NOT NULL DEFAULT true,
  history_record_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  purpose varchar(240) NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS career_share_grants_worker_idx ON public.career_share_grants(worker_account_id);

COMMIT;
