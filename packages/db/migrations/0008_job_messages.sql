BEGIN;

CREATE TABLE IF NOT EXISTS public.job_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.job_applications(id),
  sender_account_id uuid NOT NULL REFERENCES public.accounts(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_messages_application_idx ON public.job_messages(application_id, created_at);

COMMIT;
