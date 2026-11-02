BEGIN;

DO $$ BEGIN CREATE TYPE public.organization_membership_status AS ENUM ('invited', 'active', 'suspended', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_account_id uuid NOT NULL REFERENCES public.accounts(id),
  worker_account_id uuid NOT NULL REFERENCES public.accounts(id),
  invited_by_account_id uuid NOT NULL REFERENCES public.accounts(id),
  status public.organization_membership_status NOT NULL DEFAULT 'invited',
  role varchar(40) NOT NULL DEFAULT 'employee',
  responded_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_account_id, worker_account_id)
);
CREATE INDEX IF NOT EXISTS organization_memberships_worker_idx ON public.organization_memberships(worker_account_id, status);
CREATE INDEX IF NOT EXISTS organization_memberships_organization_idx ON public.organization_memberships(organization_account_id, status);
INSERT INTO public.organization_memberships(organization_account_id, worker_account_id, invited_by_account_id, status, responded_at)
SELECT a.parent_account_id, a.id, a.parent_account_id, 'active', now()
FROM public.accounts a
JOIN public.person_profiles pp ON pp.owner_account_id = a.id AND pp.member_type = 'employee' AND pp.deleted_at IS NULL
WHERE a.parent_account_id IS NOT NULL AND a.role = 'user' AND a.deleted_at IS NULL
ON CONFLICT (organization_account_id, worker_account_id) DO NOTHING;

ALTER TABLE public.service_reviews
  ADD COLUMN IF NOT EXISTS rating_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS edit_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.service_worker_reviews
  ADD COLUMN IF NOT EXISTS rating_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS edit_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;
UPDATE public.service_reviews SET edit_deadline = created_at + interval '7 days' WHERE edit_deadline IS NULL;
UPDATE public.service_worker_reviews SET edit_deadline = created_at + interval '7 days' WHERE edit_deadline IS NULL;

CREATE TABLE IF NOT EXISTS public.provider_verification_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.provider_verification_requests(id),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  submitted_by_account_id uuid NOT NULL REFERENCES public.accounts(id),
  appeal_note text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decision_note text,
  reviewed_by_account_id uuid REFERENCES public.accounts(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_verification_appeals_status_idx ON public.provider_verification_appeals(status);

CREATE TABLE IF NOT EXISTS public.service_guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  minor_account_id uuid NOT NULL REFERENCES public.accounts(id),
  guardian_account_id uuid NOT NULL REFERENCES public.accounts(id),
  consent_scope varchar(40) NOT NULL DEFAULT 'service_assignment',
  consented_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(request_id, minor_account_id)
);
CREATE INDEX IF NOT EXISTS service_guardian_consents_guardian_idx ON public.service_guardian_consents(guardian_account_id);

COMMIT;
