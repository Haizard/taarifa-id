BEGIN;

DO $$ BEGIN CREATE TYPE public.service_assignment_status AS ENUM ('active', 'released');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_assignment_event_type AS ENUM ('assigned', 'released');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.service_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  worker_account_id uuid NOT NULL REFERENCES public.accounts(id),
  assigned_by_account_id uuid NOT NULL REFERENCES public.accounts(id),
  status public.service_assignment_status NOT NULL DEFAULT 'active',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_assignments_request_idx ON public.service_assignments(request_id);
CREATE INDEX IF NOT EXISTS service_assignments_provider_idx ON public.service_assignments(provider_id);
CREATE INDEX IF NOT EXISTS service_assignments_worker_idx ON public.service_assignments(worker_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS service_assignments_active_unique
  ON public.service_assignments(request_id, worker_account_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.service_assignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.service_assignments(id),
  actor_account_id uuid NOT NULL REFERENCES public.accounts(id),
  event_type public.service_assignment_event_type NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_assignment_events_assignment_idx
  ON public.service_assignment_events(assignment_id);

COMMIT;
