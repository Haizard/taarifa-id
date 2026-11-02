BEGIN;

ALTER TABLE public.career_profiles
  ADD COLUMN IF NOT EXISTS job_seeking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS job_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded_employer_account_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_account_id uuid NOT NULL REFERENCES public.accounts(id),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  title varchar(180) NOT NULL,
  category varchar(80) NOT NULL,
  location varchar(180) NOT NULL,
  employment_type varchar(40) NOT NULL,
  description text NOT NULL,
  requirements text,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_postings_org_idx ON public.job_postings(organization_account_id);
CREATE INDEX IF NOT EXISTS job_postings_status_idx ON public.job_postings(status);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id),
  worker_account_id uuid NOT NULL REFERENCES public.accounts(id),
  status varchar(24) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'interview', 'offered', 'rejected', 'withdrawn', 'hired')),
  cover_note text,
  employer_note text,
  shared_profile boolean NOT NULL DEFAULT false,
  shared_history_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_applications_job_worker_unique UNIQUE (job_id, worker_account_id)
);
CREATE INDEX IF NOT EXISTS job_applications_worker_idx ON public.job_applications(worker_account_id);

COMMIT;
