BEGIN;

ALTER TABLE public.career_history
  ADD COLUMN IF NOT EXISTS source_job_application_id uuid REFERENCES public.job_applications(id);

CREATE UNIQUE INDEX IF NOT EXISTS career_history_source_job_application_unique
  ON public.career_history(source_job_application_id);

COMMIT;
