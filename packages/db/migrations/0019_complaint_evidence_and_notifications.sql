BEGIN;

ALTER TABLE public.service_complaint_cases
  ADD COLUMN IF NOT EXISTS investigation_note text,
  ADD COLUMN IF NOT EXISTS appeal_note text,
  ADD COLUMN IF NOT EXISTS appealed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.service_complaint_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_case_id uuid NOT NULL REFERENCES public.service_complaint_cases(id),
  uploader_account_id uuid NOT NULL REFERENCES public.accounts(id),
  file_name varchar(255) NOT NULL,
  mime_type varchar(40) NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 2097152),
  document bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_complaint_evidence_case_idx ON public.service_complaint_evidence(complaint_case_id, created_at);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_account_id uuid NOT NULL REFERENCES public.accounts(id),
  dedupe_key varchar(180) NOT NULL UNIQUE,
  category varchar(40) NOT NULL,
  title varchar(180) NOT NULL,
  body text NOT NULL,
  resource_path varchar(300),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_notifications_recipient_idx ON public.user_notifications(recipient_account_id, created_at);

COMMIT;
