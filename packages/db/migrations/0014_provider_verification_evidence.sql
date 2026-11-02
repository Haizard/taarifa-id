BEGIN;

ALTER TABLE public.provider_verification_requests
  ADD COLUMN IF NOT EXISTS evidence_file_name varchar(255),
  ADD COLUMN IF NOT EXISTS evidence_mime_type varchar(40),
  ADD COLUMN IF NOT EXISTS evidence_size_bytes integer,
  ADD COLUMN IF NOT EXISTS evidence_document bytea;

DO $$ BEGIN
  ALTER TABLE public.provider_verification_requests
    ADD CONSTRAINT provider_verification_evidence_metadata_check
    CHECK (
      (evidence_document IS NULL AND evidence_file_name IS NULL AND evidence_mime_type IS NULL AND evidence_size_bytes IS NULL)
      OR
      (evidence_document IS NOT NULL AND evidence_file_name IS NOT NULL AND evidence_mime_type IS NOT NULL
        AND evidence_mime_type IN ('application/pdf', 'image/jpeg', 'image/png')
        AND evidence_size_bytes IS NOT NULL AND evidence_size_bytes BETWEEN 1 AND 2097152
        AND octet_length(evidence_document) = evidence_size_bytes)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
