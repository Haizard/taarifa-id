BEGIN;

DO $$ BEGIN CREATE TYPE public.service_category AS ENUM ('hospital', 'school', 'garage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_delivery AS ENUM ('appointment', 'on_demand', 'delivery', 'enrollment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_price_type AS ENUM ('fixed', 'quote_required', 'free');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_sharing AS ENUM ('selected_provider', 'matching_providers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_request_status AS ENUM ('open', 'offered', 'accepted', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_offer_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES public.accounts(id),
  category public.service_category NOT NULL,
  display_name varchar(200) NOT NULL,
  description text,
  contact_number varchar(20),
  region varchar(100),
  district varchar(100),
  ward varchar(100),
  accepting_requests boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_providers_category_idx ON public.service_providers(category);

CREATE TABLE IF NOT EXISTS public.provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  title varchar(200) NOT NULL,
  description text,
  delivery_mode public.service_delivery NOT NULL,
  price_type public.service_price_type NOT NULL DEFAULT 'quote_required',
  price_amount numeric(12,2),
  currency varchar(8) NOT NULL DEFAULT 'TZS',
  estimated_minutes integer,
  form_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_services_provider_idx ON public.provider_services(provider_id);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_account_id uuid NOT NULL REFERENCES public.accounts(id),
  requester_profile_id uuid REFERENCES public.person_profiles(id),
  provider_service_id uuid NOT NULL REFERENCES public.provider_services(id),
  sharing_scope public.service_sharing NOT NULL DEFAULT 'selected_provider',
  status public.service_request_status NOT NULL DEFAULT 'open',
  summary varchar(240),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  region varchar(100),
  district varchar(100),
  ward varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_requester_idx ON public.service_requests(requester_account_id);
CREATE INDEX IF NOT EXISTS service_requests_service_idx ON public.service_requests(provider_service_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests(status);

CREATE TABLE IF NOT EXISTS public.service_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  provider_id uuid NOT NULL REFERENCES public.service_providers(id),
  provider_service_id uuid NOT NULL REFERENCES public.provider_services(id),
  price_amount numeric(12,2),
  currency varchar(8) NOT NULL DEFAULT 'TZS',
  message text,
  estimated_minutes integer,
  status public.service_offer_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_offers_request_idx ON public.service_offers(request_id);
CREATE INDEX IF NOT EXISTS service_offers_provider_idx ON public.service_offers(provider_id);

COMMIT;
