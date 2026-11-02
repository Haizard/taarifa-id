BEGIN;

DO $$ BEGIN CREATE TYPE public.service_worker_review_status AS ENUM ('active', 'disputed', 'upheld', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.service_worker_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  assignment_id uuid NOT NULL REFERENCES public.service_assignments(id),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  worker_account_id uuid NOT NULL REFERENCES public.accounts(id),
  reviewer_account_id uuid NOT NULL REFERENCES public.accounts(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  worker_response text,
  worker_disputed_at timestamptz,
  moderation_status public.service_worker_review_status NOT NULL DEFAULT 'active',
  moderation_note text,
  moderated_by_account_id uuid REFERENCES public.accounts(id),
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_worker_reviews_assignment_unique UNIQUE (assignment_id),
  CONSTRAINT service_worker_reviews_request_worker_unique UNIQUE (request_id, worker_account_id)
);
ALTER TABLE public.service_worker_reviews
  ADD COLUMN IF NOT EXISTS moderation_status public.service_worker_review_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS moderated_by_account_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
CREATE INDEX IF NOT EXISTS service_worker_reviews_worker_idx ON public.service_worker_reviews(worker_account_id);
CREATE INDEX IF NOT EXISTS service_worker_reviews_provider_idx ON public.service_worker_reviews(provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS service_worker_reviews_assignment_unique ON public.service_worker_reviews(assignment_id);
CREATE UNIQUE INDEX IF NOT EXISTS service_worker_reviews_request_worker_unique ON public.service_worker_reviews(request_id, worker_account_id);

COMMIT;
