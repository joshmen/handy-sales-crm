import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1050';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // SECURITY (WEB-HIGH-1 fix): NUNCA caer a NEXTAUTH_SECRET — esa firma
    // las cookies de sesión y los logs backend la retendrían. Solo aceptamos
    // SOCIAL_LOGIN_SECRET o JWT_SECRET. Si ninguno está set en prod, bloquear.
    const sharedSecret = process.env.SOCIAL_LOGIN_SECRET || process.env.JWT_SECRET;
    if (!sharedSecret) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Servicio temporalmente no disponible.' },
          { status: 503 }
        );
      }
    }

    const response = await fetch(`${API_URL}/auth/social-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Social-Login-Secret': sharedSecret || 'dev-only-placeholder',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Error al registrarse.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'No se pudo conectar con el servidor.' },
      { status: 502 }
    );
  }
}
