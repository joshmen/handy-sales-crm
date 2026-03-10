'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Shield,
  Lock,
  WifiHigh,
  Monitor,
  Info,
} from '@phosphor-icons/react';
import { api, handleApiError } from '@/lib/api';

// ---------- Types ----------

interface RateLimitPolicy {
  policyName: string;
  limit: number;
  windowSeconds: number;
  description: string;
  api: string;
}

interface AuthenticationConfig {
  jwtExpirationMinutes: number;
  refreshTokenExpirationDays: number;
  passwordMinLength: number;
  twoFactorEnabled: boolean;
  hashingAlgorithm: string;
}

interface SessionConfig {
  deviceBinding: boolean;
  sessionVersionValidation: boolean;
  singleSessionPerDevice: boolean;
}

interface SecurityConfig {
  rateLimiting: RateLimitPolicy[];
  authentication: AuthenticationConfig;
  sessions: SessionConfig;
}

// ---------- Helpers ----------

function EnabledBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Habilitado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
      Deshabilitado
    </span>
  );
}

function formatWindow(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${hours}h`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes}min`;
  }
  return `${seconds}s`;
}

// ---------- Loading Skeleton ----------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Skeleton */}
      <div className="h-6 w-64 bg-gray-200 rounded-md animate-pulse" />

      {/* Header Skeleton */}
      <div>
        <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse mb-2" />
        <div className="h-5 w-96 bg-gray-200 rounded-md animate-pulse" />
      </div>

      {/* Cards Skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="h-6 w-48 bg-gray-200 rounded-md animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-5 w-full bg-gray-100 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Main Page ----------

export default function SecurityConfigPage() {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const response = await api.get<SecurityConfig>('/api/admin/security-config');
        setConfig(response.data);
      } catch (err) {
        const apiErr = handleApiError(err);
        setError(apiErr.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !config) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Administracion</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Seguridad</span>
        </nav>
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
          <Shield size={48} weight="duotone" className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">{error || 'No se pudo cargar la configuracion de seguridad'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <span>Administracion</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Seguridad</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={28} weight="duotone" className="text-blue-500" />
          Configuracion de Seguridad
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Vista general de las politicas de seguridad del sistema
        </p>
      </div>

      {/* Rate Limiting Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-cyan-100">
            <WifiHigh size={18} weight="duotone" className="text-cyan-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Rate Limiting</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Politica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripcion
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {config.rateLimiting.map((policy, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                      {policy.api}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {policy.policyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {policy.limit.toLocaleString()} req
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatWindow(policy.windowSeconds)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {policy.description}
                  </td>
                </tr>
              ))}
              {config.rateLimiting.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                    No hay politicas de rate limiting configuradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authentication Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100">
            <Lock size={18} weight="duotone" className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Autenticacion</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Expiracion JWT</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.jwtExpirationMinutes} minutos
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Expiracion Refresh Token</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.refreshTokenExpirationDays} dias
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Longitud minima de contrasena</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.passwordMinLength} caracteres
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Autenticacion de dos factores (2FA)</p>
              <EnabledBadge enabled={config.authentication.twoFactorEnabled} />
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Algoritmo de hashing</p>
              <p className="text-sm font-semibold text-gray-900">
                {config.authentication.hashingAlgorithm}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-100">
            <Monitor size={18} weight="duotone" className="text-violet-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Sesiones</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Vinculacion de dispositivo</p>
              <EnabledBadge enabled={config.sessions.deviceBinding} />
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Validacion de version de sesion</p>
              <EnabledBadge enabled={config.sessions.sessionVersionValidation} />
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Sesion unica por dispositivo</p>
              <EnabledBadge enabled={config.sessions.singleSessionPerDevice} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-5 py-4">
        <Info size={20} weight="fill" className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Estos valores estan configurados en el servidor. Para modificarlos, contacta al equipo de desarrollo.
        </p>
      </div>
    </div>
  );
}
