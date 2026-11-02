BEGIN;

CREATE TABLE IF NOT EXISTS public.service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.service_requests(id),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  reviewer_account_id uuid NOT NULL REFERENCES public.accounts(id),
  rating integer NOT NULL CHECK (rating between 1 and 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_reviews_provider_idx ON public.service_reviews(provider_id);

COMMIT;
