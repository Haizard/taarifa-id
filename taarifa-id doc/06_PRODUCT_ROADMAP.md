# TAARIFA_ID Product Roadmap

TAARIFA_ID connects people requesting services with hospitals, schools, garages, and other providers. It also gives organizations tools to coordinate staff and lets workers carry verified experience between jobs.

## Product roles and safeguards

- **Client:** requests a service and decides what information to share with a provider.
- **Provider organization:** lists services, responds to requests, and manages its workforce.
- **Worker:** performs assigned work, controls career sharing, and may opt into job discovery.
- Marketplace requests share only their submitted answers and location. Saved profile, health, and identity data are not attached automatically.

## Implemented foundation

### Service marketplace and workforce

- Providers publish services with custom request forms. Clients can send requests to a provider or matching providers, compare offers, accept one, and track delivery.
- Organizations can create managed employee accounts, assign eligible employees to accepted requests, record assignment/release history, and require an assignment before starting work.
- Clients see assigned workers, and workers see their assigned work. Managed employees can leave an organization after active assignments are resolved while keeping their account and career records.

### Feedback, complaints, and safety

- Clients can review completed services and assigned workers; workers and organizations can respond or dispute reviews. Admin moderation decisions are audited, and disputed or removed reviews do not affect scores.
- Clients can open service complaint cases about an accepted provider or assigned worker. Subjects can respond; system administrators can resolve or dismiss cases. Case creation, viewing, responses, and decisions are recorded.
- Job discovery includes reporting, block controls, audited safety review, and private organization verification evidence.
- Rate limits cover candidate searches, career views, applications, invitations, messages, service requests/offers, complaints, provider verification submissions, and public career-share access. Platform activity events are retained for 180 days.

### Portable career history and job discovery

- Workers maintain private career profiles and export profile/history data. Organizations submit dated work records; workers acknowledge or dispute them, request corrections, and see a correction history.
- Workers create purpose-limited, expiring, revocable share links for selected verified work records and optional profile fields. Qualifications, availability, preferences, and references are private unless the worker opts to include extended fields in a share.
- Adults can opt into job discovery, apply, choose what to share, receive invitations, message employers, and accept or decline a two-sided hire offer. Current employers are excluded from passive discovery; verified employer blocks and other safety controls are supported.
- Only approved provider organizations can use employer hiring features. Admin review supports uploaded registration evidence and reasoned approval or rejection.

## Remaining roadmap

These items are not complete and should be planned before broad rollout. The current build does not claim to have finished every future capability.

### 1. Organization membership and worker identity

- Add invitations that let an existing individual account accept an organization membership instead of creating a duplicate login.
- Replace the single-parent organization link with a membership model that supports multiple current and past employers, scoped roles, worker acceptance, suspension, and termination without losing account ownership.
- Add organization operational dashboards for assignment coverage, response/completion times, cancellations, and appropriately aggregated feedback.

### 2. Fairer service feedback

- Add structured, non-discriminatory rating dimensions and a short edit window with visible edit timestamps.
- Keep individual feedback and complaint details private; publish only moderated summaries that meet minimum sample thresholds.
- Refine service-case workflow with investigation notes, notifications, evidence handling, and an explicit appeal path. Do not treat a complaint by itself as a finding of fault.

### 3. Provider verification lifecycle

- Add renewal reminders and recurring verification review. Existing requests can be resubmitted after rejection, but there is no formal reconsideration workflow or verification expiry policy yet.
- Add official registry checks where supported and record their source and date. Current review is manual and depends on submitted documents.

### 4. Minor-safe service policies

- Job discovery, employee ratings, and public career links already have adult-only safeguards. Before assigning minors in school or other services, define guardian consent, age-appropriate roles, visibility, and escalation rules with local policy owners.
- Keep minor profiles out of worker reputation and public job discovery unless a reviewed policy explicitly permits a narrowly scoped experience.

## Release gates

1. Test authorization and privacy boundaries for each role: client, provider admin, managed worker, independent worker, and system admin.
2. Pilot hospitals, schools, and emergency garages with safe service forms, clear assignment records, complaint handling, and human provider verification.
3. Complete membership linking and minor safeguards before enabling broader organization workforce use.
4. Review local consent, employment, health-data, and child-safety requirements before expanding into regulated services.

## Measures

- Service response and completion times; assignment coverage; cancellations.
- Feedback rate, complaint resolution time, appeal outcomes, and repeat-service rate.
- Worker membership acceptance and verified-record acknowledgement rates.
- Worker-controlled career-share and job-application conversion rates.
- Privacy incidents, access denials, unwanted contact reports, and rate-limit events.
