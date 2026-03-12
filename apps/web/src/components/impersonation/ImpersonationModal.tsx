'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { impersonationService } from '@/services/api/impersonation';
import { tenantService } from '@/services/api/tenants';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { toast } from '@/hooks/useToast';
import { CurrentImpersonationState } from '@/types/impersonation';
import {
  Eye,
  Edit,
  Loader2,
  FileText,
  Clock,
  XCircle,
  Search,
  ChevronRight,
} from 'lucide-react';
import { SbAlert, SbSecurity, SbBuildings } from '@/components/layout/DashboardIcons';

interface Tenant {
  id: number;
  nombre: string;
  logoUrl?: string;
}

interface ImpersonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

/**
 * Modal para iniciar una sesión de impersonación.
 * Requiere justificación obligatoria y muestra advertencias de auditoría.
 */
export function ImpersonationModal({ isOpen, onClose, tenant: initialTenant }: ImpersonationModalProps) {
  const [reason, setReason] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [accessLevel, setAccessLevel] = useState<'READ_ONLY' | 'READ_WRITE'>('READ_ONLY');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [existingSession, setExistingSession] = useState<CurrentImpersonationState | null>(null);

  // Tenant selection state (when opened without a pre-selected tenant)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(initialTenant);
  const [allTenants, setAllTenants] = useState<{ id: number; nombre: string; activo: boolean }[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');

  const tenant = initialTenant ?? selectedTenant;
  const needsTenantSelection = !initialTenant;

  const { startImpersonation } = useImpersonationStore();
  const { update: updateSession } = useSession();

  // Fetch tenants when modal opens without a pre-selected tenant
  useEffect(() => {
    if (isOpen && needsTenantSelection && allTenants.length === 0) {
      setTenantsLoading(true);
      tenantService.getAll()
        .then((tenants) => setAllTenants(tenants.map(t => ({ id: t.id, nombre: t.nombreEmpresa, activo: t.activo }))))
        .catch(() => toast({ title: 'Error', description: 'No se pudieron cargar las empresas', variant: 'destructive' }))
        .finally(() => setTenantsLoading(false));
    }
  }, [isOpen, needsTenantSelection, allTenants.length]);

  // Reset selected tenant when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTenant(initialTenant);
      setTenantSearch('');
    }
  }, [isOpen, initialTenant]);

  const filteredTenants = useMemo(() => {
    const active = allTenants.filter(t => t.activo);
    if (!tenantSearch.trim()) return active;
    const q = tenantSearch.toLowerCase();
    return active.filter(t => t.nombre.toLowerCase().includes(q));
  }, [allTenants, tenantSearch]);

  const executeStart = async () => {
    if (!tenant) return;

    const response = await impersonationService.startSession({
      targetTenantId: tenant.id,
      reason: reason.trim(),
      ticketNumber: ticketNumber.trim() || undefined,
      accessLevel,
    });

    // Guardar en el store
    startImpersonation(
      response.sessionId,
      { id: tenant.id, name: tenant.nombre, logoUrl: tenant.logoUrl },
      accessLevel,
      new Date(response.expiresAt),
      response.impersonationToken,
      '' // El token original se guardará desde el contexto de auth
    );

    // Update NextAuth JWT token (signed, tamper-proof) so middleware allows tenant routes
    // Pass impersonation token so API calls use it instead of the original token
    await updateSession({
      isImpersonating: true,
      impersonationToken: response.impersonationToken,
    });

    toast({
      title: 'Sesión iniciada',
      description: `Ahora estás viendo la cuenta de ${tenant.nombre}`,
    });

    onClose();

    // Recargar para aplicar el nuevo contexto
    window.location.href = '/dashboard';
  };

  const handleStart = async () => {
    if (!tenant) return;

    // H5: Justificación obligatoria solo para READ_WRITE
    const isWriteAccess = accessLevel === 'READ_WRITE';
    if (isWriteAccess && !reason.trim()) {
      toast({
        title: 'Error',
        description: 'La justificación es obligatoria para acceso de lectura/escritura',
        variant: 'destructive',
      });
      return;
    }

    if (isWriteAccess && reason.trim().length < 20) {
      toast({
        title: 'Error',
        description: 'La justificación debe tener al menos 20 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (!agreedToPolicy) {
      toast({
        title: 'Error',
        description: 'Debes aceptar la política de impersonación',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      await executeStart();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '';

      // Detectar error de sesión activa existente
      if (errorMsg.includes('sesión de impersonación activa')) {
        try {
          const state = await impersonationService.getCurrentState();
          if (state.isImpersonating && state.sessionId) {
            setExistingSession(state);
            return;
          }
        } catch {
          // Si no se puede obtener el estado, mostrar error genérico
        }
      }

      toast({
        title: 'Error',
        description: errorMsg || 'No se pudo iniciar la sesión',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndExistingAndRetry = async () => {
    if (!existingSession?.sessionId) return;

    try {
      setIsLoading(true);

      // Finalizar sesión anterior
      await impersonationService.endSession(existingSession.sessionId);
      setExistingSession(null);

      toast({
        title: 'Sesión anterior finalizada',
        description: 'Iniciando nueva sesión...',
      });

      // Iniciar nueva sesión
      await executeStart();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo finalizar la sesión anterior',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setTicketNumber('');
    setAccessLevel('READ_ONLY');
    setAgreedToPolicy(false);
    setExistingSession(null);
    setSelectedTenant(initialTenant);
    setTenantSearch('');
    onClose();
  };

  // Vista: Selección de tenant (cuando se abre desde el Header sin tenant pre-seleccionado)
  if (needsTenantSelection && !tenant) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SbBuildings size={20} />
              Seleccionar Empresa
            </DialogTitle>
            <DialogDescription>
              Elige la empresa a la que deseas acceder como soporte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="Buscar empresa..."
                className="pl-9"
              />
            </div>

            {/* Lista de tenants */}
            <div className="max-h-72 overflow-y-auto space-y-1 border rounded-lg p-1">
              {tenantsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  {tenantSearch ? 'No se encontraron empresas' : 'No hay empresas disponibles'}
                </div>
              ) : (
                filteredTenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    onClick={() => setSelectedTenant({ id: t.id, nombre: t.nombre })}
                  >
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0">
                      <SbBuildings size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{t.nombre}</p>
                      <p className="text-xs text-gray-500">ID: {t.id}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Vista: Sesión activa existente detectada
  if (existingSession) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SbAlert size={20} />
              Sesión Activa Existente
            </DialogTitle>
            <DialogDescription>
              Ya tienes una sesión de impersonación activa. Debes finalizarla antes de iniciar una nueva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info de la sesión existente */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
              {existingSession.tenant && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center">
                    <SbBuildings size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{existingSession.tenant.name}</p>
                    <p className="text-sm text-gray-500">Tenant ID: {existingSession.tenant.id}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {existingSession.minutesRemaining != null && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{existingSession.minutesRemaining} min restantes</span>
                  </div>
                )}
                {existingSession.accessLevel && (
                  <div className="flex items-center gap-1.5">
                    {existingSession.accessLevel === 'READ_ONLY' ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                    <span>
                      {existingSession.accessLevel === 'READ_ONLY' ? 'Solo lectura' : 'Lectura/Escritura'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Mensaje */}
            <p className="text-sm text-gray-600">
              Puedes finalizar la sesión anterior e iniciar una nueva, o cancelar y mantener la sesión actual.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleEndExistingAndRetry}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Finalizar anterior e iniciar nueva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Vista principal: Formulario de inicio de sesión
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SbSecurity size={20} />
            Iniciar Sesión de Soporte
          </DialogTitle>
          <DialogDescription>
            Accederás temporalmente a la cuenta del cliente para brindar soporte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Advertencia */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex gap-3">
              <SbAlert size={20} className="flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1 text-foreground">Importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Todas las acciones serán registradas</li>
                  <li>El cliente será notificado de este acceso</li>
                  <li>La sesión expira en 60 minutos</li>
                  <li>Solo accede a la información necesaria</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Info del tenant */}
          {tenant && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center">
                <SbBuildings size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{tenant.nombre}</p>
                <p className="text-sm text-gray-500">ID: {tenant.id}</p>
              </div>
              {needsTenantSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600"
                  onClick={() => setSelectedTenant(null)}
                >
                  Cambiar
                </Button>
              )}
            </div>
          )}

          {/* Nivel de acceso */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nivel de acceso</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccessLevel('READ_ONLY')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  accessLevel === 'READ_ONLY'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Eye className="h-4 w-4" />
                <div className="text-left">
                  <p className="font-medium text-sm">Solo lectura</p>
                  <p className="text-xs text-gray-500">Recomendado</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAccessLevel('READ_WRITE')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  accessLevel === 'READ_WRITE'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Edit className="h-4 w-4" />
                <div className="text-left">
                  <p className="font-medium text-sm">Lectura/Escritura</p>
                  <p className="text-xs text-gray-500">Requiere justificación</p>
                </div>
              </button>
            </div>
          </div>

          {/* H5: Justificación — obligatoria solo para READ_WRITE */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Justificación {accessLevel === 'READ_WRITE' ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-gray-400 font-normal">(opcional)</span>
              )}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={accessLevel === 'READ_WRITE'
                ? 'Describe el motivo del acceso (mínimo 20 caracteres)...'
                : 'Opcional — describe brevemente el motivo del acceso...'
              }
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            {accessLevel === 'READ_WRITE' && (
              <p className="text-xs text-gray-500">{reason.length}/20 caracteres mínimos</p>
            )}
          </div>

          {/* H6: Número de ticket — referencia a sistema externo */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Referencia de ticket <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <Input
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              placeholder="Ej: JIRA-123, Zendesk #456, Freshdesk 789"
            />
            <p className="text-xs text-gray-400">Número de ticket en tu sistema de soporte externo</p>
          </div>

          {/* Aceptar política */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToPolicy}
              onChange={(e) => setAgreedToPolicy(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Confirmo que este acceso cumple con la{' '}
              <a
                href="/docs/impersonation-policy"
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                Política de Impersonación
              </a>{' '}
              y que entiendo que todas mis acciones serán auditadas.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleStart}
            disabled={isLoading || !agreedToPolicy || (accessLevel === 'READ_WRITE' && reason.trim().length < 20)}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Iniciar Sesión de Soporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
