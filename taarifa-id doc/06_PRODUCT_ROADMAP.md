# TAARIFA_ID Product Roadmap

This roadmap extends TAARIFA_ID from digital identity and service requests into a trusted network where clients can find services, organizations can coordinate their workforce, and workers can carry their verified work history between jobs.

## Product direction

TAARIFA_ID should connect three distinct parties without confusing their roles:

- **Client:** a person or organization requesting a service.
- **Provider organization:** a hospital, school, garage, or other business that lists services and employs or assigns workers.
- **Worker:** a person with an individual identity and profile who may belong to an organization, perform assigned work, receive private feedback, and optionally seek work.

An organization may create or invite a worker account as a managed member. That account is a worker's identity, not a company-owned identity. A client who only requests a service remains a client; they do not automatically become an employee or expose their profile to a company.

## Current foundation

The current implementation provides the first service-marketplace milestone:

- Hospital, school, and garage providers can publish services with custom request forms.
- Clients can send a request to one provider or share it with matching providers in their area.
- Providers can make offers; clients can accept one, follow the request through completion, and review the provider organization.
- Business and school accounts can manage provider profiles and service listings.
- Business and school accounts already support managed member accounts and employee profiles.
- Organization admins can create employee member logins, assign an employee to an accepted request, and review assignment/release history. Employees can see jobs assigned to their account, and clients can see the current service team.
- A marketplace request shares its submitted answers and location; it does not attach saved profile or health data automatically.

This is a foundation, not a full employment marketplace. The remaining hiring and governance capabilities are described in the roadmap below.

## Roadmap

### Phase 1 — Organization workforce and service assignment (foundation implemented)

**Goal:** Let a provider organization name the worker or team responsible for a service and keep a traceable service record.

Implemented foundation:

- Organization-managed member accounts can be created with an employee role and are linked to the parent business, school, or institution.
- The accepted provider can assign active employee accounts to a request; assignment and release actions are recorded.
- Clients see currently assigned workers; workers see their assigned job details through **My assigned work**.
- A provider must assign an active employee before starting the service.

Remaining work:

- Organization admins invite or create worker accounts, assign roles, and link workers to an organization. Invitations should be preferred where a person already has an account, to avoid duplicate identities.
- Workers accept an organization link and can see which organization manages that relationship. Organization admins can suspend or end the link without deleting the worker's personal account or history.
- After accepting a client's service request, an organization assigns one or more eligible workers to the job, appointment, delivery, or enrollment.
- The client sees the assigned worker's approved display name and role, and receives updates if the assignment changes.
- The job record tracks assignment, timestamps, status changes, and relevant client/provider communications so complaints can be investigated against a specific service and team.
- Organization dashboards show operational measures such as response time, completion rate, cancellations, and verified client feedback, with access limited to staff who need those measures.

Initial entities to consider: `organization_memberships`, `service_assignments`, `assignment_events`, and scoped worker roles. Reuse the current account/member relationships when they fit; do not duplicate a person's profile for each employer.

**Acceptance criteria:**

1. An authorized organization admin can invite/link, assign, suspend, and remove a worker from the organization's active roster.
2. A worker must accept a new account link, or complete an auditable assisted-creation flow, before it becomes active.
3. Only authorized organization staff can assign workers; only the client and authorized participants can see assignment details.
4. Ending employment removes current organizational access but leaves the worker account and previously verified work records intact.
5. A completed service has an auditable organization, assignment, and outcome record.

### Phase 2 — Verified client feedback and service recovery (foundation implemented)

**Goal:** Make feedback useful for service improvement and fair to both clients and workers.

Implemented foundation:

- After a completed request, clients can review the provider organization and each assigned employee separately.
- Worker feedback is visible to the worker and their organization, not to the public directory. Organization admins can compare private average ratings from verified completed jobs.
- Workers and organizations can respond and dispute reviews. System admins have a review queue; uphold/remove decisions are written to the audit log.
- Disputed and removed feedback is excluded from score aggregation. Public organization ratings require at least three eligible reviews.

Remaining work:

- After a completed service, the client can separately rate the **organization** and the **assigned worker(s)**, and optionally leave structured comments.
- Only verified participants in a completed service can submit a rating; one feedback record per eligible client/service/subject, with an edit window and clear timestamps.
- Collect actionable dimensions (for example communication, punctuality, care/professionalism, and outcome) while avoiding sensitive or discriminatory rating prompts.
- Feedback is private to the rated party and authorized service-quality staff until moderation and aggregation rules allow a limited public summary.
- Workers and organizations can respond to feedback, request a review for abuse or factual error, and see a transparent resolution state.
- A service complaint opens a case linked to the request and assignment, with acknowledgement, investigation, response, and resolution steps. Ratings alone do not establish fault.
- Keep a record of who accessed or changed complaint and feedback records.
- Add rating edit windows, more structured service dimensions, and full complaint case management before expanding feedback beyond the current pilot flow.

**Acceptance criteria:**

1. A client cannot rate a service they did not request or one that was not completed.
2. A worker rating can only apply to a worker recorded on that service assignment.
3. Client feedback cannot be used to expose the client's private profile or medical information.
4. Both sides have a correction/appeal route; platform staff actions are recorded.
5. Public summaries use minimum sample thresholds and moderation, and never reveal an individual client's identity.

### Phase 3 — Portable work history and employment verification (foundation implemented)

**Goal:** Help workers carry credible experience with them when they leave an organization.

Implemented foundation:

- Workers maintain a private career profile with a headline, summary, and skills.
- Organization admins create dated employment records for their active employee accounts. Each record includes an organization-name snapshot and starts pending worker acknowledgement.
- Workers acknowledge a record as verified or dispute it with a note; the organization can return a disputed record for worker confirmation or reject it with a reason.
- Workers create purpose-limited share links for selected verified records and optionally their career profile. Links expire after 7, 14, or 30 days and can be revoked; public views omit contact details and client/service data.
- Managed employee accounts can transition to independent accounts after active assigned work is resolved. Their account and verified work history remain available.

Remaining work:

- Add worker-controlled export/download of career records and a fuller correction history.
- Add qualifications, availability, work preferences, and references with the same consent and verification controls.
- Build structured complaint/review summaries only after appeal and moderation policies are complete.
- Harden organization membership transitions for multiple concurrent employers and invitations/claimed identities.

- Workers can maintain a career profile with skills, roles, qualifications, availability, and work preferences.
- Organization employment dates, role, and eligible service experience can be marked as verified by the organization and acknowledged by the worker.
- The worker can request a correction or dispute an employment record; a former organization cannot silently rewrite an already verified history.
- Worker-controlled sharing lets a person select which verified work records, qualifications, and references a prospective employer can see, for what purpose, and for how long.
- Service feedback is summarized with context and verification rules; private complaint details, client identities, health data, and unmoderated allegations are never included in a career profile.
- Support a worker who joined through a company-managed account in transitioning to an independent login when the employment relationship ends.

**Acceptance criteria:**

1. Workers can access their records; export/download remains to be implemented.
2. A former employer cannot lock a person out of their identity or erase verified work history.
3. Prospective employers see no career information until the worker grants access.
4. Verification state and source are visible, and disputed items are labelled rather than presented as settled facts.

### Phase 4 — Opt-in job discovery and hiring (foundation implemented)

**Goal:** Let people actively seeking work connect with organizations looking for staff.

Implemented foundation:

- Job-seeking visibility is off by default. Adult individual and employee accounts can opt in and choose job categories and locations; their current organization is excluded from candidate search.
- Organizations submit a legal name and registration/licence reference for platform review. System admins approve or reject submissions with an audit note; only approved providers can post jobs, invite candidates, or view applicant career details.
- Workers can browse open jobs, apply, choose which career profile fields and verified work records to share with each application, review application status, and withdraw.
- Employers can search consenting adult candidates by category/location without seeing contact details or work history, and manage applicants through review, interview, offer, rejection, and hire states.
- Applicants and the hiring organization can exchange application-scoped in-platform messages. Only those two participants can read or send; withdrawing an application closes the thread for new messages.
- Employers can invite matching, opted-in adults to an open role. The invitation itself shares no career data; the worker may accept or decline, and chooses any career details to share when accepting. Invites expire after 14 days and pending invites are withdrawn when job-seeking visibility is turned off.
- Workers can report a listing or block an organization; applicants and employers can report or block each other. Blocks hide the other party from discovery and invitations, revoke shared application career details, and stop messages. Workers and employers can review and undo their own blocks.
- System admins can review job-safety reports, see the reported message when applicable, and resolve or dismiss each report with an audit-logged decision.
- Minors cannot opt into job discovery, receive employee reputation ratings, or create externally shareable career links. Previously issued minor career links are revoked by migration.

Remaining work:

- Add document uploads, organization identity checks, verification renewal, and a complete reconsideration process for rejected provider requests.
- Add age and guardian-consent safeguards to future minor-safe school or service assignment categories.
- Add explicit selected-employer visibility controls and independent profile export.
- Add hiring outcome confirmation from both sides before creating verified employment history.
- Add anti-spam limits and audit logs for searches, views, applications, and contact attempts.

- Workers can turn job-seeking visibility on or off, choose categories and locations, and decide whether they are discoverable to all eligible employers or only selected organizations.
- Employers can post jobs, specify requirements, review only consenting candidates, and contact candidates through a controlled channel.
- Workers can apply directly, manage applications, and revoke future profile sharing.
- Employers can invite candidates to interview and record a hiring outcome without changing a worker's employment history until both parties confirm the employment link.
- Provide reporting and controls to detect spam, discriminatory job criteria, scraping, and unwanted contact.

**Acceptance criteria:**

1. Job-seeking mode is off by default and can be paused or revoked immediately.
2. A worker's current employer is not told they are job-seeking unless the worker explicitly chooses to share that information.
3. Employers only see fields needed for the stated job purpose and only for candidates who opted in or applied.
4. Applications and contact attempts have rate limits, reporting, and block controls.

## Cross-cutting safeguards and policy decisions

- **Identity and consent:** Keep worker identity separate from an organization's membership. Let workers inspect, correct, export, and control sharing of personal career data.
- **Least privilege:** Organization admins need workforce and operational records, not unrestricted access to personal, health, residence, or emergency-contact data. Any exceptional access must be purpose-limited and auditable.
- **Client confidentiality:** Do not expose client identity, service details, or health-related information to workers or employers beyond what is necessary to fulfil a service and what the client knowingly shared.
- **Minors:** A minor's managed account may support school or guardian-approved organizational services, but minors must not be discoverable in public job search or receive worker reputation scores. Add age-aware eligibility and guardian controls before workforce features are enabled for minor accounts.
- **Fair ratings:** Treat ratings as one signal, not a definitive measure of competence or misconduct. Prevent retaliation, fake feedback, discriminatory scoring, and permanent harm from a single complaint. Provide appeal and context.
- **Employment records:** Distinguish self-reported from employer-verified records; preserve provenance, corrections, and disputes.
- **Organization boundaries:** A person can have multiple current or past organizational links. Removing one link must not delete their account or records belonging to other organizations.
- **Sensitive work:** Healthcare, education, and emergency-response assignments may require stricter role checks and additional local policy review before launch.

## Suggested success measures

- Percentage of completed services with an assigned worker/team and complete status history.
- Client response and service completion times by category and region.
- Feedback submission rate, complaint resolution time, appeal outcomes, and repeat-service rate.
- Worker account claim/acceptance rate and percentage of verified work records acknowledged by workers.
- Worker-controlled profile share and job application conversion rates.
- Privacy incidents, unauthorized access attempts, and unwanted employer contact reports.

## Dependencies and sequencing

1. Stabilize the current provider request/offer/completion flow and its authorization rules.
2. Build organization membership and assignment records before ratings workers, so reviews are tied to verified work.
3. Build feedback, complaint, appeal, and moderation controls before showing public worker reputations.
4. Build portable verified history and worker account transition before job discovery.
5. Launch job discovery only after worker consent controls, employer verification, reporting, and abuse prevention are ready.

This roadmap is a product direction, not a commitment that every phase is already implemented. Prioritize phases with provider and client pilots, especially in hospitals, schools, and emergency garages.
