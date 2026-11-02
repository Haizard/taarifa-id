BEGIN;

DO $$ BEGIN CREATE TYPE public.complaint_status AS ENUM ('open', 'in_review', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.service_complaint_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  reporter_account_id uuid NOT NULL REFERENCES public.accounts(id),
  subject_type varchar(16) NOT NULL CHECK (subject_type IN ('provider', 'worker')),
  subject_account_id uuid NOT NULL REFERENCES public.accounts(id),
  assignment_id uuid REFERENCES public.service_assignments(id),
  category varchar(40) NOT NULL,
  description text NOT NULL,
  status public.complaint_status NOT NULL DEFAULT 'open',
  subject_response text,
  resolution_note text,
  resolved_by_account_id uuid REFERENCES public.accounts(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_complaint_cases_request_idx ON public.service_complaint_cases(request_id);
CREATE INDEX IF NOT EXISTS service_complaint_cases_reporter_idx ON public.service_complaint_cases(reporter_account_id);
CREATE INDEX IF NOT EXISTS service_complaint_cases_subject_idx ON public.service_complaint_cases(subject_account_id);
CREATE INDEX IF NOT EXISTS service_complaint_cases_status_idx ON public.service_complaint_cases(status);

CREATE TABLE IF NOT EXISTS public.service_complaint_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_case_id uuid NOT NULL REFERENCES public.service_complaint_cases(id),
  actor_account_id uuid NOT NULL REFERENCES public.accounts(id),
  event_type varchar(40) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_complaint_case_events_case_idx ON public.service_complaint_case_events(complaint_case_id, created_at);

COMMIT;
