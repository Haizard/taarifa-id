import { NextRequest, NextResponse } from 'next/server';
import { ApiError, toErrorResponse } from './errors';
import { verifyAccessToken, type JwtUser } from './jwt';
import * as authService from './services/auth';
import * as accountsService from './services/accounts';
import * as profilesService from './services/profiles';
import * as paymentsService from './services/payments';
import * as smsService from './services/sms';
import * as qrcodeService from './services/qrcode';
import * as lookupsService from './services/lookups';
import * as printableService from './services/printable';
import * as systemAdminService from './services/system-admin';
import * as publicService from './services/public';
import * as marketplaceService from './services/marketplace';
import * as careerService from './services/career';
import * as jobsService from './services/jobs';
import * as jobSafetyService from './services/job-safety';
import * as providerVerificationService from './services/provider-verification';
import { createHash } from 'node:crypto';
import { enforceRateLimit, recordActivity, routeActivity } from './services/platform-controls';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type Segment = string | { param: string };

interface Route {
  method: Method;
  segments: Segment[];
  public?: boolean;
  roles?: string[];
  privateNoStore?: boolean;
  handler: (ctx: RouteContext) => unknown | Promise<unknown>;
}

export interface RouteContext {
  user: JwtUser | null;
  body: any;
  query: URLSearchParams;
  params: Record<string, string>;
  req: NextRequest;
}

const routes: Route[] = [
  // auth
  { method: 'POST', segments: ['auth', 'register'], public: true, handler: (c) => authService.register(c.body) },
  { method: 'POST', segments: ['auth', 'first-login'], public: true, handler: (c) => authService.firstLogin(c.body) },
  { method: 'POST', segments: ['auth', 'login'], public: true, handler: (c) => authService.login(c.body) },
  { method: 'POST', segments: ['auth', 'refresh'], public: true, handler: (c) => authService.refresh(c.body.refresh_token) },
  { method: 'POST', segments: ['auth', 'logout'], public: true, handler: (c) => authService.logout(c.body.refresh_token) },
  { method: 'POST', segments: ['auth', 'forgot-password'], public: true, handler: (c) => authService.forgotPassword(c.body) },
  { method: 'POST', segments: ['auth', 'reset-password'], public: true, handler: (c) => authService.resetPassword(c.body) },
  { method: 'POST', segments: ['auth', 'change-password'], handler: (c) => authService.changePassword(c.user!.sub, c.body) },
  { method: 'GET', segments: ['auth', 'me'], handler: (c) => c.user },

  // accounts
  { method: 'GET', segments: ['accounts', 'me'], handler: (c) => accountsService.getMe(c.user!.sub) },
  { method: 'GET', segments: ['accounts', 'sub-accounts'], roles: ['admin', 'system_admin'], handler: (c) => accountsService.getSubAccounts(c.user!.sub) },
  { method: 'POST', segments: ['accounts', 'sub-accounts'], roles: ['admin'], handler: (c) => accountsService.createSubAccount(c.user!.sub, c.body) },
  { method: 'POST', segments: ['accounts', 'reset-password'], roles: ['admin', 'system_admin'], handler: (c) => accountsService.resetSubPassword(c.body) },
  { method: 'POST', segments: ['accounts', 'move'], handler: (c) => accountsService.moveAccount(c.user!.sub, c.body) },
  { method: 'PATCH', segments: ['accounts', { param: 'id' }, 'lock'], roles: ['admin', 'system_admin'], handler: (c) => accountsService.setLock(c.params.id, true) },
  { method: 'PATCH', segments: ['accounts', { param: 'id' }, 'unlock'], roles: ['admin', 'system_admin'], handler: (c) => accountsService.setLock(c.params.id, false) },

  // profiles
  { method: 'GET', segments: ['profiles'], handler: (c) => profilesService.getMyProfiles(c.user!.sub) },
  { method: 'GET', segments: ['profiles', 'members'], handler: (c) => profilesService.getMembers(c.user!.sub) },
  { method: 'POST', segments: ['profiles', 'members'], handler: (c) => profilesService.createMember(c.user!.sub, c.body) },
  { method: 'GET', segments: ['profiles', 'entity'], handler: (c) => profilesService.getEntityDetails(c.user!.sub) },
  { method: 'PUT', segments: ['profiles', 'entity'], handler: (c) => profilesService.upsertEntityDetails(c.user!.sub, c.body) },
  { method: 'POST', segments: ['profiles', 'self-bootstrap'], handler: (c) => profilesService.bootstrapSelfProfile(c.user!.sub) },
  { method: 'GET', segments: ['profiles', { param: 'id' }], handler: (c) => profilesService.getProfile(c.user!.sub, c.params.id) },
  { method: 'PUT', segments: ['profiles', { param: 'id' }], handler: (c) => profilesService.updateProfile(c.user!.sub, c.params.id, c.body) },
  { method: 'PUT', segments: ['profiles', { param: 'id' }, 'sub-forms'], handler: (c) => profilesService.upsertSubForms(c.user!.sub, c.params.id, c.body) },

  // payments
  { method: 'POST', segments: ['payments'], handler: (c) => paymentsService.create(c.user!.sub, c.body) },
  { method: 'GET', segments: ['payments', 'history'], handler: (c) => paymentsService.getHistory(c.user!.sub) },
  { method: 'GET', segments: ['payments', 'status'], handler: (c) => paymentsService.getStatus(c.user!.sub) },

  // sms
  { method: 'GET', segments: ['sms', 'logs'], handler: (c) => smsService.getLogs(c.user!.sub) },

  // qrcode
  { method: 'GET', segments: ['qrcode', { param: 'profileId' }], public: true, handler: (c) => {
    const url = c.query.get('url') ?? undefined;
    const target = url ?? `${process.env.WEB_URL ?? 'http://localhost:3000'}/profile/${c.params.profileId}`;
    return qrcodeService.generate(target).then((qrDataUrl) => ({
      profile_id: c.params.profileId,
      url: target,
      qr_data_url: qrDataUrl,
    }));
  } },

  // printable card
  { method: 'GET', segments: ['printable', 'fields'], handler: (c) => printableService.getFields(c.user!.sub) },
  { method: 'PUT', segments: ['printable', 'fields'], handler: (c) => printableService.setFields(c.user!.sub, c.body) },

  // lookups
  { method: 'GET', segments: ['lookups'], public: true, handler: () => lookupsService.all() },

  // system-admin
  { method: 'GET', segments: ['admin', 'dashboard'], roles: ['system_admin'], handler: () => systemAdminService.dashboard() },
  { method: 'GET', segments: ['admin', 'accounts'], roles: ['system_admin'], handler: (c) => systemAdminService.listAccounts(c.query.get('filter') ?? undefined) },
  { method: 'GET', segments: ['admin', 'users'], roles: ['system_admin'], handler: () => systemAdminService.listUsers() },
  { method: 'GET', segments: ['admin', 'payments'], roles: ['system_admin'], handler: () => systemAdminService.listPayments() },
  { method: 'GET', segments: ['admin', 'reports', 'url-access'], roles: ['system_admin'], handler: () => systemAdminService.urlAccessReport() },
  { method: 'POST', segments: ['admin', 'activate'], roles: ['system_admin'], handler: (c) => systemAdminService.activateByProfileId({ ...c.body, actor_account_id: c.user!.sub }) },
  { method: 'POST', segments: ['admin', 'lookups'], roles: ['system_admin'], handler: (c) => systemAdminService.createLookup(c.body) },
  { method: 'GET', segments: ['admin', 'logs'], roles: ['system_admin'], handler: () => systemAdminService.listLogs() },

  // public
  { method: 'GET', segments: ['public', 'profiles', { param: 'profileId' }], public: true, handler: (c) => publicService.resolveByProfileId(c.params.profileId, publicRequestInfo(c.req)) },
  { method: 'GET', segments: ['public', 'profiles', 'by-code', { param: 'profileCode' }], public: true, handler: (c) => publicService.resolveByProfileCode(c.params.profileCode, publicRequestInfo(c.req)) },
  { method: 'GET', segments: ['public', 'stats'], public: true, handler: () => publicService.stats() },

  // Service marketplace
  { method: 'GET', segments: ['career', 'me'], handler: (c) => careerService.getMyCareer(c.user!.sub) },
  { method: 'PUT', segments: ['career', 'me'], handler: (c) => careerService.saveMyCareer(c.user!.sub, c.body) },
  { method: 'POST', segments: ['career', 'share'], handler: (c) => careerService.createCareerShare(c.user!.sub, c.body) },
  { method: 'DELETE', segments: ['career', 'share', { param: 'id' }], handler: (c) => careerService.revokeCareerShare(c.user!.sub, c.params.id) },
  { method: 'POST', segments: ['career', 'leave-organization'], handler: (c) => careerService.leaveOrganization(c.user!.sub) },
  { method: 'GET', segments: ['career', 'employer', 'records'], handler: (c) => careerService.listEmployerCareerRecords(c.user!.sub) },
  { method: 'POST', segments: ['career', 'employer', 'records'], handler: (c) => careerService.createEmployerCareerRecord(c.user!.sub, c.body) },
  { method: 'POST', segments: ['career', 'employer', 'records', { param: 'id' }, 'resolve'], handler: (c) => careerService.resolveEmployerCareerRecord(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['career', 'records', { param: 'id' }, 'respond'], handler: (c) => careerService.respondToCareerRecord(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['career', 'records', { param: 'id' }, 'correction'], handler: (c) => careerService.requestCareerCorrection(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['career', 'share', { param: 'token' }], public: true, handler: (c) => careerService.getSharedCareer(c.params.token) },
  { method: 'GET', segments: ['jobs', 'preferences'], handler: (c) => jobsService.getJobPreferences(c.user!.sub) },
  { method: 'GET', segments: ['jobs', 'employers'], handler: (c) => jobsService.listEligibleEmployers(c.user!.sub) },
  { method: 'PUT', segments: ['jobs', 'preferences'], handler: (c) => jobsService.saveJobPreferences(c.user!.sub, c.body) },
  { method: 'GET', segments: ['jobs'], handler: (c) => jobsService.listJobs(c.user!.sub) },
  { method: 'GET', segments: ['jobs', 'applications'], handler: (c) => jobsService.listMyApplications(c.user!.sub) },
  { method: 'POST', segments: ['jobs', { param: 'id' }, 'apply'], handler: (c) => jobsService.applyToJob(c.user!.sub, c.params.id, c.body) },
  { method: 'DELETE', segments: ['jobs', 'applications', { param: 'id' }], handler: (c) => jobsService.withdrawApplication(c.user!.sub, c.params.id) },
  { method: 'GET', segments: ['jobs', 'applications', { param: 'id' }, 'messages'], handler: (c) => jobsService.getApplicationMessages(c.user!.sub, c.params.id) },
  { method: 'POST', segments: ['jobs', 'applications', { param: 'id' }, 'messages'], handler: (c) => jobsService.sendApplicationMessage(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['jobs', 'applications', { param: 'id' }, 'hire-confirmation'], handler: (c) => jobsService.respondToHireConfirmation(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['jobs', 'invitations'], handler: (c) => jobsService.listWorkerInvitations(c.user!.sub) },
  { method: 'POST', segments: ['jobs', 'invitations', { param: 'id' }, 'respond'], handler: (c) => jobsService.respondToJobInvitation(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['jobs', { param: 'id' }, 'safety-actions'], handler: (c) => jobSafetyService.reportOrBlock(c.user!.sub, { ...c.body, job_id: c.params.id }) },
  { method: 'POST', segments: ['jobs', 'applications', { param: 'id' }, 'safety-actions'], handler: (c) => jobSafetyService.reportOrBlock(c.user!.sub, { ...c.body, application_id: c.params.id }) },
  { method: 'GET', segments: ['job-safety', 'blocks'], handler: (c) => jobSafetyService.listMyBlocks(c.user!.sub) },
  { method: 'DELETE', segments: ['job-safety', 'blocks', { param: 'id' }], handler: (c) => jobSafetyService.unblock(c.user!.sub, c.params.id) },
  { method: 'GET', segments: ['employer', 'jobs'], handler: (c) => jobsService.listEmployerJobs(c.user!.sub) },
  { method: 'POST', segments: ['employer', 'jobs'], handler: (c) => jobsService.createJob(c.user!.sub, c.body) },
  { method: 'POST', segments: ['employer', 'jobs', { param: 'id' }, 'invitations'], handler: (c) => jobsService.createJobInvitation(c.user!.sub, c.params.id, c.body) },
  { method: 'PATCH', segments: ['employer', 'jobs', { param: 'id' }], handler: (c) => jobsService.updateJob(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['employer', 'candidates'], handler: (c) => jobsService.searchCandidates(c.user!.sub, c.query) },
  { method: 'GET', segments: ['employer', 'jobs', { param: 'id' }, 'applications'], handler: (c) => jobsService.listJobApplications(c.user!.sub, c.params.id) },
  { method: 'PATCH', segments: ['employer', 'applications', { param: 'id' }], handler: (c) => jobsService.updateApplication(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['employer', 'applications', { param: 'id' }, 'messages'], handler: (c) => jobsService.getApplicationMessages(c.user!.sub, c.params.id) },
  { method: 'POST', segments: ['employer', 'applications', { param: 'id' }, 'messages'], handler: (c) => jobsService.sendApplicationMessage(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['employer', 'applications', { param: 'id' }, 'safety-actions'], handler: (c) => jobSafetyService.reportOrBlock(c.user!.sub, { ...c.body, application_id: c.params.id }) },
  { method: 'GET', segments: ['admin', 'job-safety', 'reports'], roles: ['system_admin'], handler: () => jobSafetyService.listOpenReports() },
  { method: 'PATCH', segments: ['admin', 'job-safety', 'reports', { param: 'id' }], roles: ['system_admin'], handler: (c) => jobSafetyService.resolveReport(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['marketplace', 'services'], public: true, handler: (c) => marketplaceService.listServices(c.query.get('category') ?? undefined, c.query.get('q') ?? undefined) },
  { method: 'GET', segments: ['marketplace', 'services', { param: 'id' }], public: true, handler: (c) => marketplaceService.getService(c.params.id) },
  { method: 'GET', segments: ['marketplace', 'provider'], handler: (c) => marketplaceService.getMyProvider(c.user!.sub) },
  { method: 'POST', segments: ['marketplace', 'provider'], handler: (c) => marketplaceService.saveProvider(c.user!.sub, c.body) },
  { method: 'GET', segments: ['marketplace', 'provider', 'verification'], handler: (c) => providerVerificationService.getOwnVerification(c.user!.sub) },
  { method: 'POST', segments: ['marketplace', 'provider', 'verification'], handler: (c) => providerVerificationService.submitVerification(c.user!.sub, c.body) },
  { method: 'GET', segments: ['admin', 'providers', 'verification-requests'], roles: ['system_admin'], handler: () => providerVerificationService.listPendingVerificationRequests() },
  { method: 'GET', segments: ['admin', 'providers', 'verification-requests', { param: 'id' }, 'evidence'], roles: ['system_admin'], privateNoStore: true, handler: (c) => providerVerificationService.getVerificationEvidence(c.user!.sub, c.params.id) },
  { method: 'PATCH', segments: ['admin', 'providers', 'verification-requests', { param: 'id' }], roles: ['system_admin'], handler: (c) => providerVerificationService.reviewVerificationRequest(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['marketplace', 'services'], handler: (c) => marketplaceService.createService(c.user!.sub, c.body) },
  { method: 'PATCH', segments: ['marketplace', 'services', { param: 'id' }], handler: (c) => marketplaceService.updateService(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['marketplace', 'requests'], handler: (c) => marketplaceService.listMyRequests(c.user!.sub) },
  { method: 'POST', segments: ['marketplace', 'requests'], handler: (c) => marketplaceService.createRequest(c.user!.sub, c.body) },
  { method: 'PATCH', segments: ['marketplace', 'requests', { param: 'id' }], handler: (c) => marketplaceService.updateRequestStatus(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['marketplace', 'provider', 'requests'], handler: (c) => marketplaceService.listProviderRequests(c.user!.sub) },
  { method: 'GET', segments: ['marketplace', 'worker', 'assignments'], handler: (c) => marketplaceService.listMyServiceAssignments(c.user!.sub) },
  { method: 'POST', segments: ['marketplace', 'worker', 'reviews', { param: 'id' }, 'response'], handler: (c) => marketplaceService.respondToWorkerReview(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['marketplace', 'provider', 'reviews', { param: 'id' }, 'response'], handler: (c) => marketplaceService.respondToProviderReview(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['marketplace', 'requests', { param: 'id' }, 'assignments'], handler: (c) => marketplaceService.updateServiceAssignment(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['marketplace', 'requests', { param: 'id' }, 'offers'], handler: (c) => marketplaceService.submitOffer(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['marketplace', 'offers', { param: 'id' }, 'accept'], handler: (c) => marketplaceService.acceptOffer(c.user!.sub, c.params.id) },
  { method: 'POST', segments: ['marketplace', 'requests', { param: 'id' }, 'review'], handler: (c) => marketplaceService.createReview(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['marketplace', 'requests', { param: 'id' }, 'worker-reviews'], handler: (c) => marketplaceService.createWorkerReview(c.user!.sub, c.params.id, c.body) },
  { method: 'POST', segments: ['marketplace', 'requests', { param: 'id' }, 'complaints'], handler: (c) => marketplaceService.createServiceComplaint(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['marketplace', 'complaints'], handler: (c) => marketplaceService.listMyServiceComplaints(c.user!.sub) },
  { method: 'POST', segments: ['marketplace', 'complaints', { param: 'id' }, 'response'], handler: (c) => marketplaceService.respondToServiceComplaint(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['admin', 'marketplace', 'complaints'], roles: ['system_admin'], handler: (c) => marketplaceService.listOpenServiceComplaints(c.user!.sub) },
  { method: 'PATCH', segments: ['admin', 'marketplace', 'complaints', { param: 'id' }], roles: ['system_admin'], handler: (c) => marketplaceService.resolveServiceComplaint(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['admin', 'marketplace', 'worker-review-disputes'], roles: ['system_admin'], handler: () => marketplaceService.listWorkerReviewDisputes() },
  { method: 'PATCH', segments: ['admin', 'marketplace', 'worker-reviews', { param: 'id' }, 'resolve'], roles: ['system_admin'], handler: (c) => marketplaceService.resolveWorkerReviewDispute(c.user!.sub, c.params.id, c.body) },
  { method: 'GET', segments: ['admin', 'marketplace', 'provider-review-disputes'], roles: ['system_admin'], handler: () => marketplaceService.listProviderReviewDisputes() },
  { method: 'PATCH', segments: ['admin', 'marketplace', 'provider-reviews', { param: 'id' }, 'resolve'], roles: ['system_admin'], handler: (c) => marketplaceService.resolveProviderReviewDispute(c.user!.sub, c.params.id, c.body) },
];

function publicRequestInfo(req: NextRequest) {
  const protocol = req.headers.get('x-forwarded-proto') ?? 'http';
  const host = req.headers.get('host') ?? 'localhost:3000';
  const forwarded = req.headers.get('x-forwarded-for');
  return {
    baseUrl: `${protocol}://${host}`,
    path: req.nextUrl.pathname,
    ip: forwarded?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null,
    userAgent: req.headers.get('user-agent'),
  };
}

function matchRoute(method: Method, segments: string[]): { route: Route; params: Record<string, string> } | null {
  let best: { route: Route; params: Record<string, string>; score: number } | null = null;
  for (const route of routes) {
    if (route.method !== method || route.segments.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let score = 0;
    let ok = true;
    for (let i = 0; i < segments.length; i++) {
      const seg = route.segments[i];
      if (typeof seg === 'string') {
        if (seg !== segments[i]) { ok = false; break; }
      } else {
        params[seg.param] = segments[i];
        score += 1;
      }
    }
    if (!ok) continue;
    // Prefer the most specific (most literal) match: a route with fewer
    // dynamic segments should beat one that matched via more params, so we
    // keep the candidate with the lower score.
    if (!best || score < best.score) best = { route, params, score };
  }
  return best ? { route: best.route, params: best.params } : null;
}

function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function handle(method: Method, req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;
  const rel = pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
  const segments = rel ? rel.split('/') : [];

  const match = matchRoute(method, segments);
  if (!match) return toErrorResponse(new ApiError(404, 'Not Found'));

  let user: JwtUser | null = null;
  if (!match.route.public) {
    const token = bearerToken(req);
    if (!token) return toErrorResponse(new ApiError(401, 'Missing token'));
    try {
      user = verifyAccessToken(token);
    } catch {
      return toErrorResponse(new ApiError(401, 'Invalid or expired token'));
    }
  }
  if (match.route.roles?.length && (!user || !match.route.roles.includes(user.role))) {
    return toErrorResponse(new ApiError(403, 'You do not have permission to access this resource'));
  }

  const activity = routeActivity(method, segments);
  if (activity) {
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const subjectKey = user?.sub ?? `ip:${createHash('sha256').update(forwardedFor).digest('hex')}`;
    try {
      await enforceRateLimit(subjectKey, activity.action, activity.limit, activity.windowMs);
      await recordActivity(user?.sub ?? null, activity.action, activity.resourceId);
    } catch (err) {
      return toErrorResponse(err);
    }
  }

  let body: any = {};
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  try {
    const data = await match.route.handler({ user, body, query: req.nextUrl.searchParams, params: match.params, req });
    return NextResponse.json(data, match.route.privateNoStore ? { headers: { 'Cache-Control': 'private, no-store' } } : undefined);
  } catch (err) {
    return toErrorResponse(err);
  }
}
