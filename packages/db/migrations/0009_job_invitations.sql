BEGIN;

CREATE TABLE IF NOT EXISTS public.job_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id),
  worker_account_id uuid NOT NULL REFERENCES public.accounts(id),
  message text,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_invitations_job_worker_unique UNIQUE (job_id, worker_account_id)
);
CREATE INDEX IF NOT EXISTS job_invitations_worker_idx ON public.job_invitations(worker_account_id);

COMMIT;
