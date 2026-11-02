BEGIN;

ALTER TABLE public.service_reviews
  ADD COLUMN IF NOT EXISTS provider_response text,
  ADD COLUMN IF NOT EXISTS provider_disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_status public.service_worker_review_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS moderated_by_account_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

COMMIT;
