import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1050';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sharedSecret =
      process.env.SOCIAL_LOGIN_SECRET ||
      process.env.JWT_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      '';

    const response = await fetch(`${API_URL}/auth/social-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Social-Login-Secret': sharedSecret,
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
