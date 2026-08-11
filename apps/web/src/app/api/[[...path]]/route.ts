import { NextRequest, NextResponse } from 'next/server';
import { handle } from '@/lib/server/router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function dispatch(method: Method, req: NextRequest): Promise<NextResponse> {
  return handle(method, req);
}

export async function GET(req: NextRequest) {
  return dispatch('GET', req);
}

export async function POST(req: NextRequest) {
  return dispatch('POST', req);
}

export async function PUT(req: NextRequest) {
  return dispatch('PUT', req);
}

export async function PATCH(req: NextRequest) {
  return dispatch('PATCH', req);
}

export async function DELETE(req: NextRequest) {
  return dispatch('DELETE', req);
}
