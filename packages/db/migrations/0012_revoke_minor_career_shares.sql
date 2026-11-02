BEGIN;

UPDATE public.career_share_grants cs
SET revoked_at = COALESCE(cs.revoked_at, now())
FROM public.person_profiles person
WHERE person.owner_account_id = cs.worker_account_id
  AND person.member_type IN ('self', 'employee')
  AND person.birthdate > now() - interval '18 years'
  AND cs.revoked_at IS NULL;

COMMIT;
