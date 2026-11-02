BEGIN;

CREATE TABLE IF NOT EXISTS public.job_safety_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type varchar(12) NOT NULL CHECK (action_type IN ('report', 'block')),
  reporter_account_id uuid NOT NULL REFERENCES public.accounts(id),
  subject_account_id uuid REFERENCES public.accounts(id),
  job_id uuid REFERENCES public.job_postings(id),
  application_id uuid REFERENCES public.job_applications(id),
  message_id uuid REFERENCES public.job_messages(id),
  reason varchar(80) NOT NULL,
  details text,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by_account_id uuid REFERENCES public.accounts(id),
  resolved_at timestamptz,
  unblocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((action_type = 'report' AND subject_account_id IS NOT NULL) OR (action_type = 'block' AND subject_account_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS job_safety_actions_reporter_idx ON public.job_safety_actions(reporter_account_id);
CREATE INDEX IF NOT EXISTS job_safety_actions_subject_idx ON public.job_safety_actions(subject_account_id);
CREATE INDEX IF NOT EXISTS job_safety_actions_open_idx ON public.job_safety_actions(created_at) WHERE action_type = 'report' AND status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS job_safety_actions_active_block_unique
  ON public.job_safety_actions(reporter_account_id, subject_account_id)
  WHERE action_type = 'block' AND unblocked_at IS NULL;

COMMIT;
