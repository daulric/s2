import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

/**
 * Thin proxy for Vercel cron — forwards to the NestJS backend.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';

  const res = await fetch(`${BACKEND_URL}/stocks/ingest`, {
    headers: { Authorization: authHeader },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
