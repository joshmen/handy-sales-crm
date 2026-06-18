import axios from 'axios';
import { signIn } from 'next-auth/react';
import { API_CONFIG } from '@/lib/constants';

/**
 * Helpers de autenticación reutilizables por la página /login, /register y el
 * modal de auth de la landing. Replican el contrato del backend .NET
 * (POST `${API_CONFIG.BASE_URL}/auth/login` y `/auth/register`) sin acoplarse a la UI.
 */

const TIMEOUT = (API_CONFIG as { TIMEOUT?: number }).TIMEOUT ?? 30000;

export interface LoginUser {
  id: string | number;
  email: string;
  name?: string;
  role?: string;
  onboardingCompleted?: boolean;
}

export interface LoginApiResponse {
  user?: LoginUser;
  token?: string;
  refreshToken?: string;
  requiresVerification?: boolean;
  requires2FA?: boolean;
  tempToken?: string;
  sessionConflict?: boolean;
  email?: string;
  code?: string;
  error?: string;
}

export interface LoginApiResult {
  status: number;
  data: LoginApiResponse;
}

/** POST /auth/login. No lanza en errores HTTP (validateStatus siempre true). */
export async function callLoginApi(
  email: string,
  password: string,
  recaptchaToken?: string,
): Promise<LoginApiResult> {
  const response = await axios.post(
    `${API_CONFIG.BASE_URL}/auth/login`,
    { email, password, recaptchaToken },
    { timeout: TIMEOUT, validateStatus: () => true },
  );
  return { status: response.status, data: response.data as LoginApiResponse };
}

/** Establece la sesión NextAuth con la respuesta ya autenticada del backend. */
export async function establishSession(
  loginResponse: LoginApiResponse,
  rememberMe = false,
): Promise<{ ok: boolean }> {
  const result = await signIn('credentials', {
    loginResponse: JSON.stringify({ ...loginResponse, rememberMe }),
    redirect: false,
  });
  return { ok: !!result?.ok };
}

export interface RegisterPayload {
  email: string;
  password: string;
  nombre: string;
  nombreEmpresa: string;
  identificadorFiscal?: string;
  contacto?: string;
}

export interface RegisterApiResult {
  status: number;
  data: { requiresVerification?: boolean; email?: string; error?: string };
}

/** POST /auth/register. No lanza en errores HTTP. */
export async function callRegisterApi(
  payload: RegisterPayload,
  recaptchaToken?: string,
): Promise<RegisterApiResult> {
  const response = await axios.post(
    `${API_CONFIG.BASE_URL}/auth/register`,
    {
      email: payload.email,
      password: payload.password,
      nombre: payload.nombre,
      nombreEmpresa: payload.nombreEmpresa,
      identificadorFiscal: payload.identificadorFiscal || undefined,
      contacto: payload.contacto || undefined,
      recaptchaToken,
    },
    { timeout: TIMEOUT, validateStatus: () => true },
  );
  return { status: response.status, data: response.data };
}
