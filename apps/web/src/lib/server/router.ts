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
import * as systemAdminService from './services/system-admin';
import * as publicService from './services/public';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type Segment = string | { param: string };

interface Route {
  method: Method;
  segments: Segment[];
  public?: boolean;
  roles?: string[];
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
  { method: 'GET', segments: ['public', 'stats'], public: true, handler: () => publicService.stats() },
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
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
