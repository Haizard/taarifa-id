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

## Implemented capabilities

### Organization membership and worker identity

- Existing individual accounts can be invited into an organization and accept membership without creating a duplicate login. A worker can belong to multiple organizations at once.
- Memberships have invited, active, suspended, and ended states. Workers can leave one organization while keeping their account, other memberships, and career records. Legacy employee accounts are backfilled into memberships.
- Organizations can view their active workforce, invite workers, manage membership status, and see a service operations summary with request volume, completion, response rate and time, feedback, and open complaints.
- School invitations for a linked minor require guardian acceptance. School staff can assign work to minors only when the guardian has given request-specific consent. Consent can be revoked before the work starts. Minor worker ratings are disabled.

### Fairer service feedback and complaints

- Service and worker reviews include communication, punctuality, care, and outcome dimensions. Reviewers can edit feedback for seven days; edit dates are visible, and edits close after a provider or worker responds or disputes the review.
- Complaint cases support private evidence attachments, provider/worker responses, administrator-only investigation notes, outcome notifications, and one client appeal within 14 days. A complaint alone does not establish fault.
- Case evidence is limited to the named participants and platform administrators. Administrative investigation notes are not returned to clients or providers. Notifications cover workforce invitations, verification, reviews, and service complaint events.

### Provider verification lifecycle

- Provider verification expires after one year. Organizations see renewal status and can submit updated registration evidence; hiring features remain gated until current approval.
- An organization may request reconsideration once for a rejected verification decision. Administrators record a reasoned decision and both parties receive notifications.
- Review remains manual against uploaded evidence. Official registry checks are not enabled because each jurisdiction requires an agreed authoritative source and, often, credentials or a commercial integration.

## Remaining release dependencies

- Configure official business, school, and health-provider registry integrations when the platform has jurisdiction-specific sources and credentials. Until then, administrators must record their human review based on submitted evidence.
- Have local policy owners approve age-appropriate school roles, guardian-consent language, escalation practices, and retention requirements before enabling minor assignments in production.
- Review local consent, employment, health-data, and child-safety requirements before expanding into regulated services.

## Release gates

1. Test authorization and privacy boundaries for each role: client, provider admin, managed worker, independent worker, and system admin.
2. Pilot hospitals, schools, and emergency garages with safe service forms, clear assignment records, complaint handling, and human provider verification.
3. Complete local policy review for minor assignments and registry review procedures before enabling broader organization workforce use.
4. Review local consent, employment, health-data, and child-safety requirements before expanding into regulated services.

## Measures

- Service response and completion times; assignment coverage; cancellations.
- Feedback rate, complaint resolution time, appeal outcomes, and repeat-service rate.
- Worker membership acceptance and verified-record acknowledgement rates.
- Worker-controlled career-share and job-application conversion rates.
- Privacy incidents, access denials, unwanted contact reports, and rate-limit events.
