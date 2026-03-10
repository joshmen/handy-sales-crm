import { NextRequest, NextResponse } from 'next/server';
import { exchangeTempToken } from '@/lib/temp-token-store';

/**
 * POST /api/auth/exchange-2fa-ref
 * Exchanges a short reference code for the actual 2FA temp token.
 * One-time use, 60-second TTL.
 */
export async function POST(request: NextRequest) {
  const { ref } = await request.json();

  if (!ref || typeof ref !== 'string') {
    return NextResponse.json({ error: 'Missing ref' }, { status: 400 });
  }

  const tempToken = exchangeTempToken(ref);
  if (!tempToken) {
    return NextResponse.json({ error: 'Invalid or expired reference' }, { status: 404 });
  }

  return NextResponse.json({ tempToken });
}
