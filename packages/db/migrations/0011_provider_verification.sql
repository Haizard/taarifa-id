BEGIN;

DO $$ BEGIN CREATE TYPE public.provider_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS verification_status public.provider_verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_by_account_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.provider_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  submitted_by_account_id uuid NOT NULL REFERENCES public.accounts(id),
  legal_name varchar(200) NOT NULL,
  registration_reference varchar(120) NOT NULL,
  evidence_notes text,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by_account_id uuid REFERENCES public.accounts(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_verification_requests_provider_idx ON public.provider_verification_requests(provider_id);
CREATE INDEX IF NOT EXISTS provider_verification_requests_status_idx ON public.provider_verification_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS provider_verification_requests_pending_unique ON public.provider_verification_requests(provider_id) WHERE status = 'pending';

COMMIT;
